import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

// Create an invite link for a project
export const createInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { projectId, role } = request.data as { projectId: string; role: string };

  const projectDoc = await db.doc(`projects/${projectId}`).get();
  if (!projectDoc.exists) throw new HttpsError('not-found', 'Project not found');

  const project = projectDoc.data()!;
  if (project.ownerUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Only owner can invite');
  }

  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  const userName = userDoc.data()?.displayName || 'Someone';

  await db.doc(`invites/${token}`).set({
    projectId,
    projectName: project.name,
    projectEmoji: project.emoji,
    role,
    createdBy: request.auth.uid,
    createdByName: userName,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });

  return { token };
});

// Accept an invite and join the project
export const acceptInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { token } = request.data as { token: string };

  const inviteDoc = await db.doc(`invites/${token}`).get();
  if (!inviteDoc.exists) throw new HttpsError('not-found', 'Invite not found or expired');

  const invite = inviteDoc.data()!;
  if (invite.expiresAt.toDate() < new Date()) {
    throw new HttpsError('deadline-exceeded', 'Invite has expired');
  }

  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  const user = userDoc.data()!;

  // Check if already a member
  const projectDoc = await db.doc(`projects/${invite.projectId}`).get();
  const project = projectDoc.data()!;
  const alreadyMember = project.members?.some((m: { uid: string }) => m.uid === request.auth!.uid);
  if (alreadyMember || project.ownerUid === request.auth.uid) {
    return { projectId: invite.projectId }; // already in, just redirect
  }

  // Add member to project
  await db.doc(`projects/${invite.projectId}`).update({
    members: admin.firestore.FieldValue.arrayUnion({
      uid: request.auth.uid,
      displayName: user.displayName,
      photoURL: user.photoURL || '',
      role: invite.role,
    }),
  });

  return { projectId: invite.projectId };
});

// Send push notification when a new note is created
export const onNoteCreated = onDocumentCreated(
  'projects/{projectId}/pages/{pageId}/notes/{noteId}',
  async (event) => {
    const note = event.data?.data();
    if (!note) return;

    const projectDoc = await db.doc(`projects/${event.params.projectId}`).get();
    const project = projectDoc.data();
    if (!project) return;

    // Get FCM tokens of all members except the author
    const memberUids = [
      project.ownerUid,
      ...project.members.map((m: { uid: string }) => m.uid),
    ].filter((uid: string) => uid !== note.authorUid);

    const tokenDocs = await Promise.all(
      memberUids.map((uid: string) => db.doc(`fcmTokens/${uid}`).get())
    );

    const tokens = tokenDocs
      .filter((d) => d.exists && d.data()?.token)
      .map((d) => d.data()!.token as string);

    if (tokens.length === 0) return;

    const pageDoc = await db.doc(`projects/${event.params.projectId}/pages/${event.params.pageId}`).get();
    const pageName = pageDoc.data()?.title || 'a page';

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `${project.emoji} ${project.name}`,
        body: `${note.authorName} added a note in "${pageName}"`,
      },
      data: {
        projectId: event.params.projectId,
        pageId: event.params.pageId,
      },
    });
  }
);

// Check if user can create a project (free plan: max 5)
export const checkProjectLimit = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  const plan = userDoc.data()?.plan || 'free';

  if (plan === 'pro') return { allowed: true };

  const ownedProjects = await db.collection('projects')
    .where('ownerUid', '==', request.auth.uid)
    .where('isArchived', '==', false)
    .get();

  return {
    allowed: ownedProjects.size < 5,
    count: ownedProjects.size,
    limit: 5,
  };
});
