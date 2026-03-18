import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

// ── XP Helper ────────────────────────────────────────────────────────────────
async function awardXP(uid: string, amount: number) {
  const ref = db.doc(`users/${uid}`);
  await ref.update({ xp: admin.firestore.FieldValue.increment(amount) });
  const snap = await ref.get();
  const xp   = snap.data()?.xp || 0;
  await ref.update({ level: Math.floor(Math.sqrt(xp / 50)) + 1 });
}

// ── Invites ───────────────────────────────────────────────────────────────────
export const createInvite = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { projectId, role } = req.data as { projectId: string; role: string };

  const projectSnap = await db.doc(`projects/${projectId}`).get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found');
  if (projectSnap.data()!.ownerUid !== req.auth.uid)
    throw new HttpsError('permission-denied', 'Only owner can invite');

  const userSnap = await db.doc(`users/${req.auth.uid}`).get();
  const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7);
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);

  await db.doc(`invites/${token}`).set({
    projectId,
    projectName: projectSnap.data()!.name,
    projectEmoji: projectSnap.data()!.emoji,
    role,
    createdBy: req.auth.uid,
    createdByName: userSnap.data()?.displayName || 'Someone',
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });
  return { token };
});

export const acceptInvite = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { token } = req.data as { token: string };

  const inviteSnap = await db.doc(`invites/${token}`).get();
  if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invite not found');
  const invite = inviteSnap.data()!;
  if (invite.expiresAt.toDate() < new Date()) throw new HttpsError('deadline-exceeded', 'Expired');

  const userSnap = await db.doc(`users/${req.auth.uid}`).get();
  const user     = userSnap.data()!;
  const projSnap = await db.doc(`projects/${invite.projectId}`).get();
  const proj     = projSnap.data()!;
  const already  = proj.members?.some((m: { uid: string }) => m.uid === req.auth!.uid);
  if (already || proj.ownerUid === req.auth.uid) return { projectId: invite.projectId };

  await db.doc(`projects/${invite.projectId}`).update({
    members: admin.firestore.FieldValue.arrayUnion({
      uid: req.auth.uid, displayName: user.displayName, photoURL: user.photoURL || '', role: invite.role,
    }),
  });
  await awardXP(req.auth.uid, 20);
  return { projectId: invite.projectId };
});

// ── Project limit check ───────────────────────────────────────────────────────
export const checkProjectLimit = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const userSnap = await db.doc(`users/${req.auth.uid}`).get();
  const data = userSnap.data()!;
  if (data?.plan === 'pro' || data?.role === 'teacher' || data?.role === 'admin')
    return { allowed: true };
  const owned = await db.collection('projects').where('ownerUid', '==', req.auth.uid).where('isArchived', '==', false).get();
  return { allowed: owned.size < 5, count: owned.size, limit: 5 };
});

// ── XP triggers ───────────────────────────────────────────────────────────────
export const onNoteCreated = onDocumentCreated(
  'projects/{projectId}/pages/{pageId}/notes/{noteId}', async (event) => {
    const note = event.data?.data();
    if (!note) return;

    await awardXP(note.authorUid, 5);
    await db.doc(`users/${note.authorUid}`).update({
      noteCount: admin.firestore.FieldValue.increment(1),
    });

    const projSnap = await db.doc(`projects/${event.params.projectId}`).get();
    const proj = projSnap.data();
    if (!proj) return;

    const uids = [proj.ownerUid, ...proj.members.map((m: { uid: string }) => m.uid)]
      .filter((u: string) => u !== note.authorUid);
    const tokenDocs = await Promise.all(uids.map((u: string) => db.doc(`fcmTokens/${u}`).get()));
    const tokens = tokenDocs.filter((d) => d.exists && d.data()?.token).map((d) => d.data()!.token as string);
    if (!tokens.length) return;

    const pageSnap = await db.doc(`projects/${event.params.projectId}/pages/${event.params.pageId}`).get();
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `${proj.emoji} ${proj.name}`,
        body: `${note.authorName}: ${note.content.slice(0, 80)}`,
      },
      data: { projectId: event.params.projectId, pageId: event.params.pageId },
    });
  }
);

export const onNoteUpdated = onDocumentUpdated(
  'projects/{projectId}/pages/{pageId}/notes/{noteId}', async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (!before || !after) return;
    if (before.taskStatus !== 'done' && after.taskStatus === 'done') {
      await awardXP(after.authorUid, 15);
      await db.doc(`users/${after.authorUid}`).update({ taskCount: admin.firestore.FieldValue.increment(1) });
    }
  }
);

export const onHelpOfferCreated = onDocumentCreated('helpOffers/{id}', async (event) => {
  const offer = event.data?.data();
  if (!offer) return;
  await awardXP(offer.helperUid, 30);
  await db.doc(`users/${offer.helperUid}`).update({ helpGivenCount: admin.firestore.FieldValue.increment(1) });
});

// ── Daily login / streak ──────────────────────────────────────────────────────
export const recordLogin = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const ref  = db.doc(`users/${req.auth.uid}`);
  const snap = await ref.get();
  const data = snap.data();
  if (!data) return;

  const now  = new Date();
  const last = data.lastLoginAt?.toDate?.();
  const diff = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : 999;
  const newStreak = diff === 1 ? (data.streak || 0) + 1 : diff > 1 ? 1 : data.streak || 0;

  await ref.update({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp(), streak: newStreak });
  if (diff >= 1) await awardXP(req.auth.uid, 10);
  return { streak: newStreak };
});

// ── Share project globally ────────────────────────────────────────────────────
export const shareProjectGlobally = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { projectId, title, description, tags, helpTypes, lang } = req.data as {
    projectId: string; title: string; description: string; tags: string[]; helpTypes: string[]; lang: string;
  };
  const projSnap = await db.doc(`projects/${projectId}`).get();
  if (!projSnap.exists) throw new HttpsError('not-found', 'Project not found');
  if (projSnap.data()!.ownerUid !== req.auth.uid) throw new HttpsError('permission-denied', 'Only owner');

  const userSnap = await db.doc(`users/${req.auth.uid}`).get();
  const user     = userSnap.data()!;

  const ref = await db.collection('globalProjects').add({
    projectId, ownerUid: req.auth.uid, ownerName: user.displayName,
    ownerCharacter: user.character || 'pino',
    title, description, tags, helpTypes, lang,
    helpersCount: 0, viewsCount: 0, isOpen: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await awardXP(req.auth.uid, 25);
  return { id: ref.id };
});

// ── Teacher: approve (admin only, called from admin panel directly via Firestore) ─
// Note: approval is done via direct Firestore writes in admin panel, guarded by Firestore rules.
// This function is provided as an optional server-side alternative.
export const approveTeacher = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (callerSnap.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Admins only');

  const { teacherUid } = req.data as { teacherUid: string };
  await db.doc(`teacherApplications/${teacherUid}`).update({
    status: 'approved', reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.doc(`users/${teacherUid}`).update({
    role: 'teacher', plan: 'pro', teacherStatus: 'approved',
  });

  // TODO: send email notification

  return { success: true };
});

// ── Classroom: join by invite code ────────────────────────────────────────────
export const joinClassroom = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { inviteCode } = req.data as { inviteCode: string };

  const q = await db.collection('classrooms')
    .where('inviteCode', '==', inviteCode.toUpperCase())
    .where('isArchived', '==', false)
    .limit(1)
    .get();

  if (q.empty) throw new HttpsError('not-found', 'Classroom not found. Check the code.');

  const classroomDoc = q.docs[0];
  const classroom    = classroomDoc.data();

  if (classroom.studentUids.includes(req.auth.uid)) {
    return { classroomId: classroomDoc.id }; // already joined
  }

  await classroomDoc.ref.update({
    studentUids: admin.firestore.FieldValue.arrayUnion(req.auth.uid),
  });

  await awardXP(classroom.teacherUid, 10); // teacher XP per student joined

  return { classroomId: classroomDoc.id };
});
