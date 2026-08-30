import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors';
import { WORKFLOW_STATES, Role } from '../common/constants';

type Actor = { id: string; role: Role; organizationId: string };

export type BoardColumn = { state: string; label: string | null; visible: boolean };

/**
 * چیدمان بورد در «سطح نمایش». states و ماشین حالت هرگز عوض نمی‌شوند؛ فقط
 * ترتیب/نمایش/نامِ ستون‌ها. این‌طور بورد کاستوم می‌شود بدون شکستن موتور. (کاستومایز بورد)
 */
@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getBoardConfig(actor: Actor): Promise<{ columns: BoardColumn[] | null }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { boardConfig: true },
    });
    if (!org?.boardConfig) return { columns: null }; // null ⇒ فرانت از چیدمان پیش‌فرض استفاده می‌کند
    try {
      const parsed = JSON.parse(org.boardConfig);
      return { columns: Array.isArray(parsed?.columns) ? parsed.columns : null };
    } catch {
      return { columns: null };
    }
  }

  async setBoardConfig(actor: Actor, raw: unknown): Promise<{ columns: BoardColumn[] }> {
    const columns = (raw as { columns?: unknown })?.columns;
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new AppError(422, 'INVALID_BOARD', 'چیدمان بورد نامعتبر است.');
    }
    const seen = new Set<string>();
    const clean: BoardColumn[] = columns.map((col) => {
      const c = col as { state?: unknown; label?: unknown; visible?: unknown };
      const state = String(c?.state ?? '');
      if (!(WORKFLOW_STATES as readonly string[]).includes(state)) {
        throw new AppError(422, 'INVALID_STATE', `مرحله‌ی نامعتبر: ${state}`);
      }
      if (seen.has(state)) throw new AppError(422, 'DUP_STATE', 'هر مرحله فقط یک بار می‌تواند ستون باشد.');
      seen.add(state);
      const rawLabel = c?.label != null ? String(c.label).trim() : '';
      return { state, label: rawLabel ? rawLabel.slice(0, 40) : null, visible: c?.visible !== false };
    });
    if (!clean.some((c) => c.visible)) {
      throw new AppError(422, 'NO_VISIBLE_COLUMN', 'حداقل یک ستون باید نمایش داده شود.');
    }
    await this.prisma.organization.update({
      where: { id: actor.organizationId },
      data: { boardConfig: JSON.stringify({ columns: clean }) },
    });
    return { columns: clean };
  }
}
