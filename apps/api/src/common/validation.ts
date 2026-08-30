import { z } from 'zod';
import { AppError } from './errors';
import {
  ROLES,
  USER_STATUS,
  WORKFLOW_STATES,
  DELIVERY_HEALTH,
  PRIORITIES,
  WORK_STREAMS,
  WORK_TYPES,
  ETA_CONFIDENCE,
  COMMITMENT_REASONS,
} from './constants';

/**
 * اعتبارسنجی متمرکز ورودی‌ها. (CLAUDE.md قانون ۷)
 * SQLite enum بومی ندارد، پس تنها سد جلوی مقدار بی‌معنا همین‌جاست.
 * بدون این لایه، مقدارهایی مثل priority="ABC" مستقیم در دیتابیس می‌نشستند
 * و خطاهای FK به‌جای ۴۲۲ به‌صورت ۵۰۰ به کلاینت می‌رسیدند.
 */

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: 'تاریخ نامعتبر است.' });
const nullableIsoDate = isoDate.nullable().optional();
const id = z.string().min(1).max(64);

export const CreateWorkItemSchema = z.object({
  title: trimmed(2000),
  description: z.string().max(20_000).nullish(),
  projectId: id.nullish(),
  parentId: id.nullish(),
  teamId: id.nullish(),
  workType: z.enum(WORK_TYPES),
  workStream: z.enum(WORK_STREAMS),
  priority: z.enum(PRIORITIES),
  ownerId: id,
  primaryAssigneeId: id.nullish(),
  reviewerId: id.nullish(),
  requiresReview: z.boolean().optional(),
  requiresQa: z.boolean().optional(),
  dueDate: nullableIsoDate,
  acceptanceCriteria: z.string().max(20_000).nullish(),
});

export const UpdateWorkItemSchema = z.object({
  title: trimmed(2000).optional(),
  description: z.string().max(20_000).nullish(),
  priority: z.enum(PRIORITIES).optional(),
  ownerId: id.optional(),
  primaryAssigneeId: id.nullish(),
  reviewerId: id.nullish(),
  teamId: id.nullish(),
  requiresReview: z.boolean().optional(),
  requiresQa: z.boolean().optional(),
  dueDate: nullableIsoDate,
  acceptanceCriteria: z.string().max(20_000).nullish(),
  reasonType: z.enum(COMMITMENT_REASONS).optional(),
  reasonText: z.string().max(4000).nullish(),
  displacedWorkItemId: id.nullish(),
});

export const ChangeStateSchema = z.object({
  state: z.enum(WORKFLOW_STATES),
  reasonType: z.enum(COMMITMENT_REASONS).optional(),
  reasonText: z.string().max(4000).nullish(),
});

export const ChangeHealthSchema = z.object({
  health: z.enum(DELIVERY_HEALTH),
  note: z.string().max(4000).nullish(),
});

export const ChangeCommitmentSchema = z.object({
  newEta: nullableIsoDate,
  newEstimateHours: z.number().min(0).max(10_000).nullish(),
  confidence: z.enum(ETA_CONFIDENCE).nullish(),
  assumptions: z.string().max(4000).nullish(),
  reasonType: z.enum(COMMITMENT_REASONS),
  reasonText: z.string().max(4000).nullish(),
});

export const ReBaselineSchema = z.object({
  newBaseline: isoDate,
  // خالی بودنش را خود سرویس با پیام دقیق‌تر رد می‌کند.
  reasonText: z.string().max(4000).nullish(),
});

export const CommentSchema = z.object({ body: trimmed(10_000) });

export const CreateProjectSchema = z.object({
  key: z.string().trim().min(2).max(6),
  name: trimmed(200),
  description: z.string().max(20_000).nullish(),
  ownerId: id.nullish(),
  targetDate: nullableIsoDate,
});

export const UpdateProjectSchema = z.object({
  name: trimmed(200).optional(),
  description: z.string().max(20_000).nullish(),
  ownerId: id.nullish(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'DONE', 'CANCELLED']).optional(),
  targetDate: nullableIsoDate,
});

export const CreateUserSchema = z.object({
  fullName: trimmed(150),
  // هویت ورود. بدون فاصله و بدون @؛ فارسی هم مجاز است.
  username: z
    .string()
    .trim()
    .min(3, { message: 'نام‌کاربری حداقل ۳ نویسه.' })
    .max(30)
    .regex(/^[^\s@]+$/, { message: 'نام‌کاربری نباید فاصله یا @ داشته باشد.' })
    .optional(),
  jobTitle: z.string().max(150).nullish(),
  role: z.enum(ROLES),
  primaryTeamId: id.nullish(),
  weeklyCapacityHours: z.number().int().min(0).max(80).optional(),
});

export const ChangeRoleSchema = z.object({ role: z.enum(ROLES) });
export const ChangeStatusSchema = z.object({ status: z.enum(USER_STATUS) });

export const CreateTeamSchema = z.object({
  name: trimmed(120),
  leadId: id.nullish(),
});

export const SetLeadSchema = z.object({ leadId: id });

export const LoginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

export const RegisterSchema = z.object({
  fullName: trimmed(150),
  username: z
    .string()
    .trim()
    .min(3, { message: 'نام‌کاربری حداقل ۳ نویسه.' })
    .max(30)
    .regex(/^[^\s@]+$/, { message: 'نام‌کاربری نباید فاصله یا @ داشته باشد.' }),
  password: z
    .string()
    .min(10, { message: 'رمز عبور باید حداقل ۱۰ کاراکتر باشد.' })
    .max(200)
    .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
      message: 'رمز عبور باید شامل حرف و عدد باشد.',
    }),
});

const FIELD_LABELS: Record<string, string> = {
  title: 'عنوان',
  workType: 'نوع کار',
  workStream: 'جریان کاری',
  priority: 'اولویت',
  ownerId: 'مالک',
  dueDate: 'مهلت',
  state: 'مرحله',
  health: 'سلامت تحویل',
  reasonType: 'علت',
  newEta: 'تاریخ تحویل',
  newEstimateHours: 'تخمین ساعت',
  confidence: 'سطح اطمینان',
  fullName: 'نام',
  role: 'نقش نرم‌افزاری',
  status: 'وضعیت',
  key: 'کلید پروژه',
  name: 'نام',
  body: 'متن',
};

/**
 * پیام خطا فارسی و قابل‌فهم می‌ماند و هیچ جزئیات داخلی Zod بیرون نمی‌رود.
 * (CLAUDE.md قانون ۱۰)
 */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data;

  const issues = result.error.issues.map((i) => {
    const path = i.path.join('.');
    return { field: path, label: FIELD_LABELS[path] ?? path };
  });
  const names = [...new Set(issues.map((i) => i.label))].join('، ');
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    `مقدار این فیلدها درست نیست: ${names}`,
    issues.map((i) => i.field),
  );
}
