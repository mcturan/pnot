import { Timestamp } from 'firebase/firestore';

export type UserRole = 'owner' | 'editor' | 'viewer';
export type Plan = 'free' | 'pro';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface ProjectMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  color: string;
  ownerUid: string;
  members: ProjectMember[];
  createdAt: Timestamp;
  isArchived: boolean;
}

export interface Page {
  id: string;
  projectId: string;
  title: string;
  icon?: string;
  order: number;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Note {
  id: string;
  projectId: string;
  pageId: string;
  content: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  parentNoteId: string | null; // null = root, string = thread reply
  isPinned: boolean;
  isTask: boolean;
  taskStatus?: TaskStatus;
  assignedTo?: string[];
  dueDate?: Timestamp;
  replyCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Invite {
  id: string;
  projectId: string;
  projectName: string;
  projectEmoji: string;
  role: UserRole;
  createdBy: string;
  createdByName: string;
  expiresAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  plan: Plan;
  planExpiry?: Timestamp;
  createdAt: Timestamp;
}

export const FREE_PROJECT_LIMIT = 5;
export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
];
export const PROJECT_EMOJIS = ['📋', '🚀', '💡', '🏗️', '🎯', '📱', '💼', '🛠️', '🌟', '🔥'];
