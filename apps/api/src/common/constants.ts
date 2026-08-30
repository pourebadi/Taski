// ثابت‌های مشترک. SQLite enum بومی ندارد؛ اعتبارسنجی اینجاست. (CLAUDE.md قانون ۷)

export const ROLES = ['ORG_OWNER','ADMIN','PROJECT_MANAGER','TEAM_LEAD','CONTRIBUTOR','REQUESTER','VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUS = ['ACTIVE','SUSPENDED','DISABLED'] as const;

export const WORKFLOW_STATES = ['INBOX','BACKLOG','READY','IN_PROGRESS','IN_REVIEW','IN_QA','DONE','CANCELLED'] as const;
export type WorkflowState = (typeof WORKFLOW_STATES)[number];

export const DELIVERY_HEALTH = ['ON_TRACK','AT_RISK','BLOCKED','UNKNOWN'] as const;
export const PRIORITIES = ['P0','P1','P2','P3'] as const;
export const WORK_STREAMS = ['PRODUCT','TECH_DEBT','SUPPORT','INFRASTRUCTURE'] as const;
export const WORK_TYPES = ['FEATURE','BUG','TASK','SUPPORT','TECH_DEBT','INFRA'] as const;
export const ETA_CONFIDENCE = ['HIGH','MEDIUM','LOW'] as const;

export const COMMITMENT_REASONS = [
  'SCOPE_CHANGE','BLOCKER','DEPENDENCY','PRIORITY_CHANGE','SUPPORT_INTERRUPT','RE_ESTIMATION','EXTERNAL',
] as const;
export type CommitmentReason = (typeof COMMITMENT_REASONS)[number];

/** فیلدهایی که تغییرشان بدون ثبت علت ممنوع است. (دفتر تغییرات) */
export const REASON_REQUIRED_FIELDS = ['PRIORITY', 'DUE_DATE', 'ASSIGNEE', 'OWNER', 'CANCEL'] as const;
export type TrackedField =
  | 'PRIORITY' | 'DUE_DATE' | 'ASSIGNEE' | 'OWNER' | 'REVIEWER' | 'STATE' | 'CANCEL' | 'SCOPE' | 'PROJECT';

/** ماشین حالت. گذار خارج از این جدول ممنوع است. (PM-C3) */
export const ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  INBOX:       ['BACKLOG','CANCELLED'],
  BACKLOG:     ['READY','IN_PROGRESS','CANCELLED'],
  READY:       ['IN_PROGRESS','BACKLOG','CANCELLED'],
  IN_PROGRESS: ['IN_REVIEW','IN_QA','DONE','BACKLOG','CANCELLED'],
  IN_REVIEW:   ['IN_PROGRESS','IN_QA','DONE','CANCELLED'],
  IN_QA:       ['IN_PROGRESS','DONE','CANCELLED'],
  DONE:        ['IN_PROGRESS'],
  CANCELLED:   ['BACKLOG'],
};

export const ACTIVE_STATES: WorkflowState[] = ['READY','IN_PROGRESS','IN_REVIEW','IN_QA'];

/** کار فعالی که این تعداد روز کاری بی‌حرکت بماند، خودکار UNKNOWN می‌شود. (D-007) */
export const STALE_AFTER_WORKING_DAYS = 7;
