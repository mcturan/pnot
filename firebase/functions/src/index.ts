import * as admin from 'firebase-admin';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import fetch from 'node-fetch';

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
    // Deliver webhooks to project owner
    await deliverWebhooks(proj.ownerUid, 'note.created', {
      noteId:    event.params.noteId,
      projectId: event.params.projectId,
      pageId:    event.params.pageId,
      content:   note.content,
      authorName: note.authorName,
    });

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
      const projSnap = await db.doc(`projects/${event.params.projectId}`).get();
      if (projSnap.exists) {
        await deliverWebhooks(projSnap.data()!.ownerUid, 'task.done', {
          noteId:    event.params.noteId,
          projectId: event.params.projectId,
          content:   after.content,
          completedBy: after.authorName,
        });
      }
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

// ── Trial: set 7-day Pro on new user ─────────────────────────────────────────
export const onUserCreated = onDocumentCreated('users/{uid}', async (event) => {
  const uid = event.params.uid;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);
  await db.doc(`users/${uid}`).update({
    plan:          'pro',
    proGrantedBy:  'trial',
    trialEndsAt:   admin.firestore.Timestamp.fromDate(trialEndsAt),
  });
});

// ── Trial: daily expiry check ─────────────────────────────────────────────────
export const checkTrials = onSchedule('every 24 hours', async () => {
  const now     = admin.firestore.Timestamp.now();
  const expired = await db.collection('users')
    .where('proGrantedBy', '==', 'trial')
    .where('trialEndsAt',  '<',  now)
    .where('plan',         '==', 'pro')
    .get();
  await Promise.all(
    expired.docs.map((d) => d.ref.update({
      plan:         'free',
      proGrantedBy: admin.firestore.FieldValue.delete(),
      trialEndsAt:  admin.firestore.FieldValue.delete(),
    }))
  );
  console.log(`Trial expiry: downgraded ${expired.size} users`);
});

// ── Admin: set plan ───────────────────────────────────────────────────────────
export const adminSetPlan = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (callerSnap.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Admins only');

  const { targetUid, plan, durationDays } = req.data as {
    targetUid: string; plan: 'pro' | 'free'; durationDays?: number;
  };

  const update: Record<string, unknown> = {
    plan,
    proGrantedBy: plan === 'pro' ? 'admin' : admin.firestore.FieldValue.delete(),
  };
  if (plan === 'pro' && durationDays) {
    const exp = new Date();
    exp.setDate(exp.getDate() + durationDays);
    update.proExpiresAt = admin.firestore.Timestamp.fromDate(exp);
  } else if (plan === 'pro') {
    update.proExpiresAt = null; // indefinite
  }

  await db.doc(`users/${targetUid}`).update(update);
  return { success: true };
});

// ── Admin: search users ───────────────────────────────────────────────────────
export const adminSearchUsers = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (callerSnap.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Admins only');

  const { email } = req.data as { email: string };
  const snap = await db.collection('users')
    .where('email', '>=', email)
    .where('email', '<=', email + '\uf8ff')
    .limit(10)
    .get();
  return {
    users: snap.docs.map((d) => {
      const u = d.data();
      return { uid: d.id, displayName: u.displayName, email: u.email, plan: u.plan, role: u.role, proGrantedBy: u.proGrantedBy || null };
    }),
  };
});

// ── API key: generate ─────────────────────────────────────────────────────────
export const generateApiKey = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const chars   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const apiKey  = 'pnot_' + Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  await db.doc(`users/${req.auth.uid}`).update({ apiKey });
  await db.doc(`apiKeys/${apiKey}`).set({
    uid: req.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { apiKey };
});

// ── Webhooks: save config ─────────────────────────────────────────────────────
export const saveWebhook = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { url, events, label, webhookId } = req.data as {
    url: string; events: string[]; label?: string; webhookId?: string;
  };
  if (!url.startsWith('https://') && !url.startsWith('http://'))
    throw new HttpsError('invalid-argument', 'URL must start with http(s)://');

  const id = webhookId || Math.random().toString(36).slice(2, 10);
  const ref = db.doc(`users/${req.auth.uid}`);
  const snap = await ref.get();
  const existing: any[] = snap.data()?.webhooks || [];
  const updated = webhookId
    ? existing.map((w: any) => w.id === webhookId ? { ...w, url, events, label: label || '' } : w)
    : [...existing, {
        id, url, events, label: label || '', active: true,
        createdAt: admin.firestore.Timestamp.now(),
      }];
  await ref.update({ webhooks: updated });
  return { id };
});

export const deleteWebhook = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { webhookId } = req.data as { webhookId: string };
  const ref  = db.doc(`users/${req.auth.uid}`);
  const snap = await ref.get();
  const existing: any[] = snap.data()?.webhooks || [];
  await ref.update({ webhooks: existing.filter((w: any) => w.id !== webhookId) });
  return { success: true };
});

// ── Webhooks: deliver on note created ─────────────────────────────────────────
async function deliverWebhooks(ownerUid: string, event: string, payload: object) {
  const userSnap = await db.doc(`users/${ownerUid}`).get();
  const webhooks: any[] = userSnap.data()?.webhooks || [];
  const targets = webhooks.filter((w: any) => w.active && w.events.includes(event));
  await Promise.allSettled(
    targets.map((w: any) =>
      fetch(w.url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-PNOT-Event': event },
        body:    JSON.stringify({ event, ...payload, sentAt: new Date().toISOString() }),
      }).catch(() => null)
    )
  );
}

// ── REST API: add note via API key ────────────────────────────────────────────
export const restApi = onRequest({ cors: true }, async (req, res) => {
  const apiKey = (req.headers['x-api-key'] || req.query.apiKey) as string;
  if (!apiKey) { res.status(401).json({ error: 'Missing X-Api-Key header' }); return; }

  const keySnap = await db.doc(`apiKeys/${apiKey}`).get();
  if (!keySnap.exists) { res.status(403).json({ error: 'Invalid API key' }); return; }
  const uid = keySnap.data()!.uid as string;

  const path = req.path; // e.g. /notes or /stats/projectId

  // POST /notes — create a note
  if (req.method === 'POST' && path === '/notes') {
    const { projectId, pageId, content, isTask } = req.body as {
      projectId: string; pageId: string; content: string; isTask?: boolean;
    };
    if (!projectId || !pageId || !content) {
      res.status(400).json({ error: 'projectId, pageId, content required' });
      return;
    }
    const userSnap = await db.doc(`users/${uid}`).get();
    const user     = userSnap.data()!;
    const noteRef  = await db.collection(`projects/${projectId}/pages/${pageId}/notes`).add({
      projectId, pageId, content,
      authorUid:    uid,
      authorName:   user.displayName || 'API',
      authorPhoto:  user.photoURL || '',
      parentNoteId: null,
      isPinned:     false,
      isTask:       isTask || false,
      taskStatus:   isTask ? 'todo' : null,
      replyCount:   0,
      source:       'api',
      createdAt:    admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:    admin.firestore.FieldValue.serverTimestamp(),
    });
    await awardXP(uid, 5);
    await deliverWebhooks(uid, 'note.created', { noteId: noteRef.id, projectId, pageId, content });
    res.status(201).json({ noteId: noteRef.id });
    return;
  }

  // GET /stats/:projectId
  if (req.method === 'GET' && path.startsWith('/stats/')) {
    const projectId = path.split('/')[2];
    const pagesSnap = await db.collection(`projects/${projectId}/pages`).get();
    let totalNotes = 0; let totalTasks = 0; let doneTasks = 0;
    await Promise.all(pagesSnap.docs.map(async (pg) => {
      const notes = await db.collection(`projects/${projectId}/pages/${pg.id}/notes`).get();
      totalNotes += notes.size;
      notes.docs.forEach((n) => {
        const d = n.data();
        if (d.isTask) { totalTasks++; if (d.taskStatus === 'done') doneTasks++; }
      });
    }));
    res.json({ projectId, totalNotes, totalTasks, doneTasks, pages: pagesSnap.size });
    return;
  }

  // GET /tasks/:projectId — for Home Assistant sensor
  if (req.method === 'GET' && path.startsWith('/tasks/')) {
    const projectId = path.split('/')[2];
    const pagesSnap = await db.collection(`projects/${projectId}/pages`).get();
    const active: any[] = [];
    await Promise.all(pagesSnap.docs.map(async (pg) => {
      const snap = await db.collection(`projects/${projectId}/pages/${pg.id}/notes`)
        .where('isTask', '==', true)
        .where('taskStatus', 'in', ['todo', 'doing'])
        .get();
      snap.docs.forEach((n) => active.push({ id: n.id, content: n.data().content, status: n.data().taskStatus, pageId: pg.id }));
    }));
    res.json({ projectId, activeTasks: active.length, tasks: active });
    return;
  }

  res.status(404).json({ error: 'Unknown endpoint. Available: POST /notes, GET /stats/:projectId, GET /tasks/:projectId' });
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
