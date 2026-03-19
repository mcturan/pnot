import { signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function ensureUserProfile(user: User) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // plan starts as 'free'; onUserCreated Cloud Function upgrades to 7-day Pro trial
    await setDoc(ref, {
      uid:         user.uid,
      displayName: user.displayName || 'User',
      email:       user.email,
      photoURL:    user.photoURL || '',
      plan:        'free',
      role:        'user',
      xp:          0,
      level:       1,
      streak:      0,
      noteCount:   0,
      taskCount:   0,
      helpGivenCount: 0,
      createdAt:   serverTimestamp(),
    });
  }
}

export async function saveFcmToken(uid: string, token: string) {
  await setDoc(doc(db, 'fcmTokens', uid), { token, updatedAt: serverTimestamp() });
}
