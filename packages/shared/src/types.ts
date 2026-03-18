import { Timestamp } from 'firebase/firestore';

export type UserRole = 'owner' | 'editor' | 'viewer';
export type Plan = 'free' | 'pro';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type CharacterGender = 'pino' | 'pina';
export type CharacterOutfit = 'casual' | 'business' | 'student' | 'creative';
export type HelpType = 'feedback' | 'collaboration' | 'mentorship' | 'code-review';

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
  parentNoteId: string | null;
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

// ── Gamification ──────────────────────────────────────────
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  plan: Plan;
  planExpiry?: Timestamp;
  createdAt: Timestamp;
  // Character
  character: CharacterGender;
  characterOutfit: CharacterOutfit;
  // XP & Levels
  xp: number;
  level: number;
  streak: number;           // consecutive daily logins
  lastLoginAt?: Timestamp;
  // Stats
  noteCount: number;
  taskCount: number;
  helpGivenCount: number;   // how many community helps given
}

// XP awards
export const XP_REWARDS = {
  NOTE_ADDED: 5,
  TASK_COMPLETED: 15,
  HELP_GIVEN: 30,
  DAILY_LOGIN: 10,
  INVITE_ACCEPTED: 20,
  PROJECT_SHARED_GLOBALLY: 25,
};

export function xpToLevel(xp: number): number {
  // Level 1: 0-99, Level 2: 100-249, Level 3: 250-499 ...
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

// ── Global Community ──────────────────────────────────────
export interface GlobalProject {
  id: string;
  projectId: string;
  ownerUid: string;
  ownerName: string;
  ownerCharacter: CharacterGender;
  title: string;
  description: string;
  tags: string[];
  helpTypes: HelpType[];
  lang: string;             // primary language of project
  helpersCount: number;
  viewsCount: number;
  isOpen: boolean;
  createdAt: Timestamp;
}

export interface HelpOffer {
  id: string;
  globalProjectId: string;
  helperUid: string;
  helperName: string;
  helperCharacter: CharacterGender;
  message: string;
  createdAt: Timestamp;
}

// ── Constants ─────────────────────────────────────────────
export const FREE_PROJECT_LIMIT = 5;
export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
];
export const PROJECT_EMOJIS = ['📋', '🚀', '💡', '🏗️', '🎯', '📱', '💼', '🛠️', '🌟', '🔥'];
export const HELP_TAGS = [
  'web', 'mobile', 'design', 'marketing', 'business', 'research',
  'writing', 'data', 'ai', 'hardware', 'student-project', 'startup',
];
