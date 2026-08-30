/**
 * هارنس تست: پیاده‌سازی سبک از API پریسما روی node:sqlite.
 * دلیل وجودش: موتور پریسما در این محیط قابل دانلود نیست، اما می‌خواهیم
 * سرویس‌های واقعی روی دیتابیس واقعی و با ماندگاری روی دیسک اجرا شوند.
 * فیلترها در JS انجام می‌شوند؛ ماندگاری و ری‌استارت واقعی است.
 */
// vite نمی‌تواند ماژول‌های داخلی نود را resolve کند؛ با require دور می‌زنیم.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: any };
type DatabaseSync = any;

const MODELS = [
  'organization', 'holiday', 'user', 'team', 'teamMember', 'session',
  'project', 'projectMember', 'workItem', 'commitmentHistory',
  'comment', 'activity', 'auditEvent', 'keySequence', 'changeRecord',
];

type Row = Record<string, any>;

function matchValue(actual: any, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond === null) return actual === null || actual === undefined;

  if (cond instanceof Date) {
    return actual instanceof Date ? actual.getTime() === cond.getTime() : actual === cond;
  }

  if (typeof cond === 'object' && !Array.isArray(cond)) {
    for (const [op, v] of Object.entries(cond)) {
      switch (op) {
        case 'in':
          if (!(v as any[]).includes(actual)) return false;
          break;
        case 'notIn':
          if ((v as any[]).includes(actual)) return false;
          break;
        case 'not':
          if (matchValue(actual, v)) return false;
          break;
        case 'contains':
          if (!String(actual ?? '').includes(String(v))) return false;
          break;
        case 'lt':
          if (!(toTime(actual) < toTime(v))) return false;
          break;
        case 'lte':
          if (!(toTime(actual) <= toTime(v))) return false;
          break;
        case 'gt':
          if (!(toTime(actual) > toTime(v))) return false;
          break;
        case 'gte':
          if (!(toTime(actual) >= toTime(v))) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }
  return actual === cond;
}

const toTime = (v: any) => (v instanceof Date ? v.getTime() : typeof v === 'string' ? Date.parse(v) : v);

function matchWhere(row: Row, where: Row = {}): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(cond as Row[]).some((c) => matchWhere(row, c))) return false;
      continue;
    }
    if (key === 'AND') {
      if (!(cond as Row[]).every((c) => matchWhere(row, c))) return false;
      continue;
    }
    // کلیدهای مرکب مثل organizationId_prefix
    if (key.includes('_') && cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      const parts = Object.entries(cond);
      const isCompound = parts.every(([k]) => k in row);
      if (isCompound) {
        if (!parts.every(([k, v]) => matchValue(row[k], v))) return false;
        continue;
      }
    }
    if (!matchValue(row[key], cond)) return false;
  }
  return true;
}

function applyOrder(rows: Row[], orderBy: any): Row[] {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      const [field, dir] = Object.entries(spec)[0] as [string, string];
      const av = toTime(a[field]) ?? '';
      const bv = toTime(b[field]) ?? '';
      if (av === bv) continue;
      const cmp = av < bv ? -1 : 1;
      return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

export class HarnessPrisma {
  private db: any;
  private store = new Map<string, Row[]>();

  constructor(private readonly file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('CREATE TABLE IF NOT EXISTS rows (model TEXT, id TEXT, json TEXT, PRIMARY KEY (model, id))');
    this.load();
    for (const m of MODELS) this.attach(m);
  }

  private load() {
    for (const m of MODELS) this.store.set(m, []);
    const all = this.db.prepare('SELECT model, json FROM rows').all() as any[];
    for (const r of all) {
      const parsed = JSON.parse(r.json, (_k, v) =>
        typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(v) ? new Date(v) : v,
      );
      this.store.get(r.model)!.push(parsed);
    }
  }

  private persist(model: string, row: Row) {
    this.db
      .prepare('INSERT INTO rows (model, id, json) VALUES (?, ?, ?) ON CONFLICT(model, id) DO UPDATE SET json = excluded.json')
      .run(model, row.id, JSON.stringify(row));
  }

  private remove(model: string, id: string) {
    this.db.prepare('DELETE FROM rows WHERE model = ? AND id = ?').run(model, id);
  }

  private hydrate(model: string, row: Row, include?: Row, select?: Row): Row {
    if (!row) return row;
    let out: Row = { ...row };

    if (include) {
      for (const [rel, cfg] of Object.entries(include)) {
        if (!cfg) continue;
        const relSelect = typeof cfg === 'object' ? (cfg as any).select : undefined;
        const relInclude = typeof cfg === 'object' ? (cfg as any).include : undefined;
        out[rel] = this.resolveRelation(model, rel, row, relSelect, relInclude);
      }
    }
    if (select) {
      const picked: Row = {};
      for (const [k, v] of Object.entries(select)) {
        if (!v) continue;
        picked[k] = typeof v === 'object' ? this.resolveRelation(model, k, row, (v as any).select) : out[k];
      }
      return picked;
    }
    return out;
  }

  private resolveRelation(model: string, rel: string, row: Row, select?: Row, include?: Row): any {
    const one = (target: string, idField: string) => {
      const found = (this.store.get(target) ?? []).find((r) => r.id === row[idField]);
      return found ? this.hydrate(target, found, include, select) : null;
    };
    const many = (target: string, fk: string) =>
      (this.store.get(target) ?? [])
        .filter((r) => r[fk] === row.id)
        .map((r) => this.hydrate(target, r, include, select));

    const map: Record<string, () => any> = {
      changedBy: () => one('user', 'changedById'),
      actor: () => one('user', 'actorId'),
      author: () => one('user', 'authorId'),
      user: () => one('user', 'userId'),
      owner: () => one('user', 'ownerId'),
      assignee: () => one('user', 'primaryAssigneeId'),
      reviewer: () => one('user', 'reviewerId'),
      project: () => one('project', 'projectId'),
      team: () => one('team', 'teamId'),
      workItem: () => one('workItem', 'workItemId'),
      members: () => (model === 'team' ? many('teamMember', 'teamId') : many('projectMember', 'projectId')),
      children: () => many('workItem', 'parentId'),
    };
    return map[rel] ? map[rel]() : null;
  }

  private attach(model: string) {
    const rows = () => this.store.get(model)!;
    const self = this;

    (this as any)[model] = {
      async create({ data, include, select }: any) {
        const row = { ...data };
        rows().push(row);
        self.persist(model, row);
        return self.hydrate(model, row, include, select);
      },
      async findUnique({ where, include, select }: any) {
        const found = rows().find((r) => matchWhere(r, where));
        return found ? self.hydrate(model, found, include, select) : null;
      },
      async findFirst({ where, orderBy, include, select }: any = {}) {
        const list = applyOrder(rows().filter((r) => matchWhere(r, where)), orderBy);
        return list[0] ? self.hydrate(model, list[0], include, select) : null;
      },
      async findMany({ where, orderBy, take, include, select }: any = {}) {
        let list = applyOrder(rows().filter((r) => matchWhere(r, where)), orderBy);
        if (take) list = list.slice(0, take);
        return list.map((r) => self.hydrate(model, r, include, select));
      },
      async update({ where, data, include, select }: any) {
        const row = rows().find((r) => matchWhere(r, where));
        if (!row) throw new Error(`${model} not found`);
        for (const [k, v] of Object.entries(data)) {
          if (v === undefined) continue;
          if (v && typeof v === 'object' && 'increment' in (v as any)) {
            row[k] = (row[k] ?? 0) + (v as any).increment;
          } else {
            row[k] = v;
          }
        }
        row.updatedAt = new Date();
        self.persist(model, row);
        return self.hydrate(model, row, include, select);
      },
      async updateMany({ where, data }: any) {
        const list = rows().filter((r) => matchWhere(r, where));
        for (const row of list) {
          for (const [k, v] of Object.entries(data)) if (v !== undefined) row[k] = v;
          self.persist(model, row);
        }
        return { count: list.length };
      },
      async deleteMany({ where }: any = {}) {
        const list = rows().filter((r) => matchWhere(r, where));
        for (const row of list) {
          self.remove(model, row.id);
          rows().splice(rows().indexOf(row), 1);
        }
        return { count: list.length };
      },
      async count({ where }: any = {}) {
        return rows().filter((r) => matchWhere(r, where)).length;
      },
      async groupBy({ by, where }: any) {
        const list = rows().filter((r) => matchWhere(r, where));
        const groups = new Map<string, number>();
        for (const r of list) {
          const key = by.map((f: string) => r[f]).join('|');
          groups.set(key, (groups.get(key) ?? 0) + 1);
        }
        return [...groups.entries()].map(([key, count]) => {
          const out: Row = { _count: count };
          by.forEach((f: string, i: number) => (out[f] = key.split('|')[i]));
          return out;
        });
      },
    };
  }

  async $transaction(arg: any) {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(this);
  }

  async $executeRawUnsafe(sql: string) {
    if (sql.trim().toUpperCase().startsWith('PRAGMA')) {
      this.db.exec(sql);
      return 0;
    }
    if (sql.includes('VACUUM INTO')) return 0;
    return 0;
  }

  async $queryRawUnsafe() {
    return [{ 1: 1 }];
  }

  close() {
    this.db.close();
  }
}
