import { Role } from '../common/constants';

/** ماتریس دسترسی متمرکز. بررسی پراکنده در کنترلرها ممنوع. (CLAUDE.md قانون ۱) */
export const PERMISSIONS = [
  'user.read','user.manage','user.delete','team.manage','org.settings',
  'project.read','project.create','project.manage',
  'workitem.read','workitem.create','workitem.update','workitem.delete','workitem.request_delete',
  'workitem.rebaseline','workitem.priority.set',
  'metrics.team.read','metrics.org.read','audit.read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const CONTRIBUTOR: Permission[] = [
  'user.read','project.read','workitem.read','workitem.create','workitem.update','workitem.request_delete',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ORG_OWNER: [...PERMISSIONS],
  ADMIN: [...PERMISSIONS],
  PROJECT_MANAGER: [
    ...CONTRIBUTOR,'project.create','project.manage','workitem.delete',
    'workitem.rebaseline','workitem.priority.set','metrics.team.read','metrics.org.read',
  ],
  TEAM_LEAD: [...CONTRIBUTOR,'project.manage','workitem.priority.set','metrics.team.read'],
  CONTRIBUTOR,
  REQUESTER: ['project.read','workitem.read','workitem.create'],
  VIEWER: ['project.read','workitem.read'],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
