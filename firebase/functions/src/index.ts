import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

// ── XP Helper ────────────────────────────────────────────────────────────────
async function awardXP(uid: string, amount: number) {
  const ref = db.doc(`users/${uid}`);
  await ref.update({
    xp: admin.firestore.FieldValue.increment(amount),
  });
  // Recompute level
  const snap = await ref.get();
  const xp = snap.data()?.xp || 0;
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  await ref.update({ level });
}

// ── Invites ───────────────────────────────────────────────────────────────────
export const createInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { projectId, role } = request.data as { projectId: string; role: string };

  const projectDoc = await db.doc(`projects/${projectId}`).get();
  if (!projectDoc.exists) throw new HttpsError('not-found', 'Project not found');
  if (projectDoc.data()!.ownerUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Only owner can invite');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const userDoc = await db.doc(`users/${request.auth.uid}`).get();

  await db.doc(`invites/${token}`).set({
    projectId,
    projectName: projectDoc.data()!.name,
    projectEmoji: projectDoc.data()!.emoji,
    role,
    createdBy: request.auth.uid,
    createdByName: userDoc.data()?.displayName || 'Someone',
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });

  return { token };
});

export const acceptInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { token } = request.data as { token: string };

  const inviteDoc = await db.doc(`invites/${token}`).get();
  if (!inviteDoc.exists) throw new HttpsError('not-found', 'Invite not found or expired');

  const invite = inviteDoc.data()!;
  if (invite.expiresAt.toDate() < new Date()) throw new HttpsError('deadline-exceeded', 'Invite expired');

  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  const user = userDoc.data()!;

  const projectDoc = await db.doc(`projects/${invite.projectId}`).get();
  const project = projectDoc.data()!;
  const already = project.members?.some((m: { uid: string }) => m.uid === request.auth!.uid);
  if (already || project.ownerUid === request.auth.uid) return { projectId: invite.projectId };

  await db.doc(`projects/${invite.projectId}`).update({
    members: admin.firestore.FieldValue.arrayUnion({
      uid: request.auth.uid,
      displayName: user.displayName,
      photoURL: user.photoURL || '',
      role: invite.role,
    }),
  });

  await awardXP(request.auth.uid, 20); // XP for joining a project

  return { projectId: invite.projectId };
});

// ── Project Limit ─────────────────────────────────────────────────────────────
export const checkProjectLimit = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  if (userDoc.data()?.plan === 'pro') return { allowed: true };

  const owned = await db.collection('projects')
    .where('ownerUid', '==', request.auth.uid)
    .where('isArchived', '==', false)
    .get();

  return { allowed: owned.size < 5, count: owned.size, limit: 5 };
});

// ── Note Created → Push Notification + XP ────────────────────────────────────
export const onNoteCreated = onDocumentCreated(
  'projects/{projectId}/pages/{pageId}/notes/{noteId}',
  async (event) => {
    const note = event.data?.data();
    if (!note) return;

    // XP for writing a note
    await awardXP(note.authorUid, 5);
    // Increment user noteCount
    await db.doc(`users/${note.authorUid}`).update({
      noteCount: admin.firestore.FieldValue.increment(1),
    });

    // Push to other members
    const projectDoc = await db.doc(`projects/${event.params.projectId}`).get();
    const project = projectDoc.data();
    if (!project) return;

    const uids = [project.ownerUid, ...project.members.map((m: { uid: string }) => m.uid)]
      .filter((uid: string) => uid !== note.authorUid);

    const tokenDocs = await Promise.all(uids.map((uid: string) => db.doc(`fcmTokens/${uid}`).get()));
    const tokens = tokenDocs.filter((d) => d.exists && d.data()?.token).map((d) => d.data()!.token as string);
    if (!tokens.length) return;

    const pageDoc = await db.doc(`projects/${event.params.projectId}/pages/${event.params.pageId}`).get();
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `${project.emoji} ${project.name}`,
        body: `${note.authorName}: ${note.content.slice(0, 80)}`,
      },
      data: { projectId: event.params.projectId, pageId: event.params.pageId },
    });
  }
);

// ── Task Completed → XP ───────────────────────────────────────────────────────
export const onNoteUpdated = onDocumentUpdated(
  'projects/{projectId}/pages/{pageId}/notes/{noteId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // If task status changed to 'done'
    if (before.taskStatus !== 'done' && after.taskStatus === 'done') {
      await awardXP(after.authorUid, 15);
      await db.doc(`users/${after.authorUid}`).update({
        taskCount: admin.firestore.FieldValue.increment(1),
      });
    }
  }
);

// ── Help Offer Created → XP ───────────────────────────────────────────────────
export const onHelpOfferCreated = onDocumentCreated('helpOffers/{id}', async (event) => {
  const offer = event.data?.data();
  if (!offer) return;

  await awardXP(offer.helperUid, 30);
  await db.doc(`users/${offer.helperUid}`).update({
    helpGivenCount: admin.firestore.FieldValue.increment(1),
  });
});

// ── Daily Login Streak ────────────────────────────────────────────────────────
export const recordLogin = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const ref = db.doc(`users/${request.auth.uid}`);
  const snap = await ref.get();
  const data = snap.data();
  if (!data) return;

  const now = new Date();
  const last = data.lastLoginAt?.toDate?.();
  const diffDays = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : 999;

  let newStreak = data.streak || 0;
  if (diffDays === 1) newStreak += 1;        // consecutive day
  else if (diffDays > 1) newStreak = 1;       // streak broken
  // diffDays === 0 → same day, no change

  const updates: Record<string, unknown> = {
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    streak: newStreak,
  };

  if (diffDays >= 1) {
    // Award XP only once per day
    await awardXP(request.auth.uid, 10);
  }

  await ref.update(updates);
  return { streak: newStreak };
});

// ── Share Project Globally ────────────────────────────────────────────────────
export const shareProjectGlobally = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { projectId, title, description, tags, helpTypes, lang } = request.data as {
    projectId: string; title: string; description: string;
    tags: string[]; helpTypes: string[]; lang: string;
  };

  const projectDoc = await db.doc(`projects/${projectId}`).get();
  if (!projectDoc.exists) throw new HttpsError('not-found', 'Project not found');
  if (projectDoc.data()!.ownerUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Only owner can share');
  }

  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  const user = userDoc.data()!;

  const ref = await db.collection('globalProjects').add({
    projectId,
    ownerUid: request.auth.uid,
    ownerName: user.displayName,
    ownerCharacter: user.character || 'pino',
    title,
    description,
    tags,
    helpTypes,
    lang,
    helpersCount: 0,
    viewsCount: 0,
    isOpen: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await awardXP(request.auth.uid, 25);

  return { id: ref.id };
});
