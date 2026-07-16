import { DurableObject } from "cloudflare:workers";

export interface SlugStats {
  count: number;
  lastClick: number | null;
}

// One global instance keeps every slug's click count in its SQLite storage.
export class ClickCounter extends DurableObject<unknown> {
  private sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS clicks (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, last_click INTEGER)",
    );
  }

  increment(slug: string): void {
    const now = Date.now();
    this.sql.exec(
      "INSERT INTO clicks (slug, count, last_click) VALUES (?, 1, ?) " +
        "ON CONFLICT(slug) DO UPDATE SET count = count + 1, last_click = ?",
      slug,
      now,
      now,
    );
  }

  counts(): Record<string, SlugStats> {
    const rows = this.sql
      .exec<{ slug: string; count: number; last_click: number | null }>(
        "SELECT slug, count, last_click FROM clicks",
      )
      .toArray();
    const out: Record<string, SlugStats> = {};
    for (const row of rows) {
      out[row.slug] = { count: row.count, lastClick: row.last_click };
    }
    return out;
  }

  remove(slug: string): void {
    this.sql.exec("DELETE FROM clicks WHERE slug = ?", slug);
  }
}
