import { Timestamp } from 'firebase/firestore';

// ── Enums & literals ──────────────────────────────────────────────────────────
export type UserRole    = 'user' | 'teacher' | 'admin';
export type MemberRole  = 'owner' | 'editor' | 'viewer';
export type Plan        = 'free' | 'pro';
export type TaskStatus  = 'todo' | 'doing' | 'done';
export type CharacterGender  = 'pino' | 'pina';
export type CharacterOutfit  = 'casual' | 'business' | 'student' | 'creative';
export type HelpType    = 'feedback' | 'collaboration' | 'mentorship' | 'code-review';
export type TeacherStatus = 'pending' | 'approved' | 'rejected';

// ── User ──────────────────────────────────────────────────────────────────────
export interface UserProfile {
  uid:          string;
  displayName:  string;
  email:        string;
  photoURL?:    string;
  plan:         Plan;
  role:         UserRole;           // 'user' | 'teacher' | 'admin'
  planExpiry?:  Timestamp;
  createdAt:    Timestamp;
  // Character
  character:    CharacterGender;
  characterOutfit: CharacterOutfit;
  // XP & Levels
  xp:           number;
  level:        number;
  streak:       number;
  lastLoginAt?: Timestamp;
  // Stats
  noteCount:    number;
  taskCount:    number;
  helpGivenCount: number;
  // Teacher
  teacherStatus?: TeacherStatus;
}

export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

// ── Teacher Application ────────────────────────────────────────────────────────
export interface TeacherApplication {
  id:           string;
  uid:          string;
  displayName:  string;
  email:        string;
  schoolName:   string;
  subject:      string;
  city:         string;
  studentIdUrl: string;   // Firebase Storage — student/staff ID photo
  documentUrl:  string;   // Teacher credential or school letter
  status:       TeacherStatus;
  createdAt:    Timestamp;
  reviewedAt?:  Timestamp;
  reviewNote?:  string;
}

// ── Project / Pages / Notes ───────────────────────────────────────────────────
export interface ProjectMember {
  uid:         string;
  displayName: string;
  photoURL?:   string;
  role:        MemberRole;
}

export interface Project {
  id:          string;
  name:        string;
  description?: string;
  emoji:       string;
  color:       string;
  ownerUid:    string;
  members:     ProjectMember[];
  createdAt:   Timestamp;
  isArchived:  boolean;
  // Classroom link
  classroomId?: string;   // set if this project belongs to a classroom
  groupId?:     string;   // set if this project belongs to a class group
}

export interface Page {
  id:        string;
  projectId: string;
  title:     string;
  icon?:     string;
  order:     number;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Note {
  id:           string;
  projectId:    string;
  pageId:       string;
  content:      string;
  authorUid:    string;
  authorName:   string;
  authorPhoto?: string;
  parentNoteId: string | null;
  isPinned:     boolean;
  isTask:       boolean;
  taskStatus?:  TaskStatus;
  assignedTo?:  string[];
  dueDate?:     Timestamp;
  replyCount?:  number;
  createdAt:    Timestamp;
  updatedAt:    Timestamp;
}

// ── Classroom ─────────────────────────────────────────────────────────────────
export interface ClassGroup {
  id:          string;
  name:        string;
  emoji:       string;
  studentUids: string[];
  projectId?:  string;   // group has its own project
}

export interface Classroom {
  id:          string;
  name:        string;
  description?: string;
  emoji:       string;
  color:       string;
  teacherUid:  string;
  teacherName: string;
  // Members
  studentUids: string[];   // all enrolled students
  groups:      ClassGroup[];
  // Linked content
  projectId?:  string;     // main class project (shared by all)
  // Meta
  inviteCode:  string;     // short code students type to join
  createdAt:   Timestamp;
  isArchived:  boolean;
}

// ── Invite / Community ────────────────────────────────────────────────────────
export interface Invite {
  id:           string;
  projectId:    string;
  projectName:  string;
  projectEmoji: string;
  role:         MemberRole;
  createdBy:    string;
  createdByName: string;
  expiresAt:    Timestamp;
}

export interface GlobalProject {
  id:             string;
  projectId:      string;
  ownerUid:       string;
  ownerName:      string;
  ownerCharacter: CharacterGender;
  title:          string;
  description:    string;
  tags:           string[];
  helpTypes:      HelpType[];
  lang:           string;
  helpersCount:   number;
  viewsCount:     number;
  isOpen:         boolean;
  createdAt:      Timestamp;
}

export interface HelpOffer {
  id:              string;
  globalProjectId: string;
  helperUid:       string;
  helperName:      string;
  helperCharacter: CharacterGender;
  message:         string;
  createdAt:       Timestamp;
}

// ── Constants ─────────────────────────────────────────────────────────────────
export const FREE_PROJECT_LIMIT = 5;
export const PROJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#64748b',
];
export const PROJECT_EMOJIS = ['📋','🚀','💡','🏗️','🎯','📱','💼','🛠️','🌟','🔥'];
export const HELP_TAGS = [
  'web','mobile','design','marketing','business','research',
  'writing','data','ai','hardware','student-project','startup',
];
export const XP_REWARDS = {
  NOTE_ADDED:            5,
  TASK_COMPLETED:       15,
  HELP_GIVEN:           30,
  DAILY_LOGIN:          10,
  INVITE_ACCEPTED:      20,
  PROJECT_SHARED:       25,
  CLASSROOM_CREATED:    50,
  STUDENT_JOINED:       10,
};
