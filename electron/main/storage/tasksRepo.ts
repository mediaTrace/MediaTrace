import type { RuntimeConfig } from "../runtime/types";
import { openSqlite, type SqliteDb } from "./db/sqlite";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "canceled" | "paused";

export interface CreateTaskInput {
  taskId: string;
  taskName: string;
  createdBy: string;
  parameters: Record<string, unknown>;
  priority?: number;
  maxRetries?: number;
  schedule_type?: string;
  schedule_enabled?: boolean;
  schedule_at?: number;
  schedule_interval_ms?: number;
}

export interface TaskRecord {
  task_id: string;
  task_name: string;
  status: TaskStatus;
  start_time: number | null;
  end_time: number | null;
  parameters: any;
  progress: number;
  created_by: string;
  created_at: number;
  priority: number;
  retry_count: number;
  max_retries: number;
  error?: string | null;
  new_videos?: number;
  updated_videos?: number;
  new_comments?: number;
  updated_comments?: number;
  schedule_type?: string | null;
  schedule_enabled?: number;
  schedule_at?: number | null;
  schedule_interval_ms?: number | null;
  schedule_next_run?: number | null;
  runs_count?: number;
}

export class TasksRepo {
  private readonly config: RuntimeConfig;
  private sqlitePromise: Promise<SqliteDb> | undefined;

  public constructor(config: RuntimeConfig) {
    this.config = config;
  }

  private async getSqlite(): Promise<SqliteDb> {
    if (!this.sqlitePromise) {
      this.sqlitePromise = openSqlite(this.config);
    }
    return this.sqlitePromise;
  }

  public async createTask(input: CreateTaskInput): Promise<void> {
    const now = Date.now();
    const priority = Number(input.priority ?? 0);
    const maxRetries = Number(input.maxRetries ?? 0);
    const db = await this.getSqlite();
    await db.run(
      "INSERT INTO task_table (task_id, task_name, status, start_time, end_time, parameters, progress, created_by, created_at, priority, retry_count, max_retries, error) VALUES (?, ?, 'pending', NULL, NULL, ?, 0, ?, ?, ?, 0, ?, NULL)",
      [input.taskId, input.taskName, JSON.stringify(input.parameters), input.createdBy, now, priority, maxRetries]
    );
    await this.updateTask(input.taskId, this.computeSchedulePatch(input));
  }

  public async getTask(taskId: string): Promise<TaskRecord | null> {
    const db = await this.getSqlite();
    const r = await db.get<any>("SELECT * FROM task_table WHERE task_id = ? LIMIT 1", [taskId]);
    return r ? this.normalizeRow(r) : null;
  }

  public async updateStatus(taskId: string, status: TaskStatus, fields: Partial<Pick<TaskRecord, "start_time" | "end_time" | "progress" | "error" | "retry_count">> = {}): Promise<void> {
    const sets: string[] = ["status = ?"];
    const values: any[] = [status];
    if (fields.start_time !== undefined) {
      sets.push("start_time = ?");
      values.push(fields.start_time);
    }
    if (fields.end_time !== undefined) {
      sets.push("end_time = ?");
      values.push(fields.end_time);
    }
    if (fields.progress !== undefined) {
      sets.push("progress = ?");
      values.push(fields.progress);
    }
    if (fields.error !== undefined) {
      sets.push("error = ?");
      values.push(fields.error);
    }
    if (fields.retry_count !== undefined) {
      sets.push("retry_count = ?");
      values.push(fields.retry_count);
    }
    values.push(taskId);
    const sql = `UPDATE task_table SET ${sets.join(", ")} WHERE task_id = ?`;
    const db = await this.getSqlite();
    await db.run(sql, values);
  }

  public async deleteTask(taskId: string): Promise<void> {
    const db = await this.getSqlite();
    await db.run("DELETE FROM task_table WHERE task_id = ?", [taskId]);
  }

  public async updateTask(taskId: string, patch: Partial<Pick<TaskRecord, "task_name" | "parameters" | "progress" | "start_time" | "end_time" | "status" | "retry_count" | "priority" | "max_retries" | "error" | "schedule_type" | "schedule_enabled" | "schedule_at" | "schedule_interval_ms" | "schedule_next_run" | "runs_count">>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];
    if (patch.task_name !== undefined) {
      sets.push("task_name = ?");
      values.push(patch.task_name);
    }
    if (patch.parameters !== undefined) {
      sets.push("parameters = ?");
      values.push(typeof patch.parameters === "string" ? patch.parameters : JSON.stringify(patch.parameters));
    }
    if (patch.progress !== undefined) {
      sets.push("progress = ?");
      values.push(patch.progress);
    }
    if (patch.start_time !== undefined) {
      sets.push("start_time = ?");
      values.push(patch.start_time);
    }
    if (patch.end_time !== undefined) {
      sets.push("end_time = ?");
      values.push(patch.end_time);
    }
    if (patch.status !== undefined) {
      sets.push("status = ?");
      values.push(patch.status);
    }
    if (patch.retry_count !== undefined) {
      sets.push("retry_count = ?");
      values.push(patch.retry_count);
    }
    if (patch.priority !== undefined) {
      sets.push("priority = ?");
      values.push(patch.priority);
    }
    if (patch.max_retries !== undefined) {
      sets.push("max_retries = ?");
      values.push(patch.max_retries);
    }
    if (patch.error !== undefined) {
      sets.push("error = ?");
      values.push(patch.error);
    }
    if ((patch as any).new_videos !== undefined) {
      sets.push("new_videos = ?");
      values.push((patch as any).new_videos);
    }
    if ((patch as any).updated_videos !== undefined) {
      sets.push("updated_videos = ?");
      values.push((patch as any).updated_videos);
    }
    if ((patch as any).new_comments !== undefined) {
      sets.push("new_comments = ?");
      values.push((patch as any).new_comments);
    }
    if ((patch as any).updated_comments !== undefined) {
      sets.push("updated_comments = ?");
      values.push((patch as any).updated_comments);
    }
    if ((patch as any).schedule_type !== undefined) {
      sets.push("schedule_type = ?");
      values.push((patch as any).schedule_type);
    }
    if ((patch as any).schedule_enabled !== undefined) {
      sets.push("schedule_enabled = ?");
      values.push((patch as any).schedule_enabled);
    }
    if ((patch as any).schedule_at !== undefined) {
      sets.push("schedule_at = ?");
      values.push((patch as any).schedule_at);
    }
    if ((patch as any).schedule_interval_ms !== undefined) {
      sets.push("schedule_interval_ms = ?");
      values.push((patch as any).schedule_interval_ms);
    }
    if ((patch as any).schedule_next_run !== undefined) {
      sets.push("schedule_next_run = ?");
      values.push((patch as any).schedule_next_run);
    }
    if ((patch as any).runs_count !== undefined) {
      sets.push("runs_count = ?");
      values.push((patch as any).runs_count);
    }
    if (!sets.length) return;
    values.push(taskId);
    const sql = `UPDATE task_table SET ${sets.join(", ")} WHERE task_id = ?`;
    const db = await this.getSqlite();
    await db.run(sql, values);
  }

  public async listTasks(params: { status?: TaskStatus; page?: number; pageSize?: number; createdBy?: string; name?: string }): Promise<{ items: TaskRecord[]; total: number }> {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.max(1, Math.min(200, Number(params.pageSize ?? 20)));
    const where: string[] = [];
    const values: any[] = [];
    if (params.status) {
      where.push("status = ?");
      values.push(params.status);
    }
    if (params.createdBy) {
      where.push("created_by = ?");
      values.push(params.createdBy);
    }
    if (params.name) {
      where.push("task_name LIKE ?");
      values.push(`%${params.name}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;
    const db = await this.getSqlite();
    const items = await db.all<any[]>(`SELECT * FROM task_table ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...values, pageSize, offset]);
    const cnt = await db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM task_table ${whereSql}`, values);
    const total = Number(cnt?.c ?? 0);
    return { items: items.map((r) => this.normalizeRow(r)), total };
  }

  public async addLog(taskId: string, level: string, message: string): Promise<void> {
    const now = Date.now();
    const db = await this.getSqlite();
    await db.run("INSERT INTO task_logs (task_id, log_time, level, message) VALUES (?, ?, ?, ?)", [taskId, now, level, message]);
  }

  public async getStats(): Promise<Record<string, number>> {
    const statuses: TaskStatus[] = ["pending", "running", "completed", "failed", "canceled", "paused"];
    const out: Record<string, number> = {};
    for (const s of statuses) out[s] = 0;
    const db = await this.getSqlite();
    const rows = await db.all<any[]>("SELECT status, COUNT(*) AS c FROM task_table GROUP BY status");
    for (const r of rows as any[]) {
      out[String(r.status)] = Number((r as any).c);
    }
    return out;
  }

  public async findDueSchedules(now: number): Promise<TaskRecord[]> {
    const cond = "schedule_enabled = 1 AND schedule_next_run IS NOT NULL AND schedule_next_run <= ?";
    const db = await this.getSqlite();
    const rows = await db.all<any[]>(`SELECT * FROM task_table WHERE ${cond}`, [now]);
    return Array.isArray(rows) ? rows.map((r) => this.normalizeRow(r)) : [];
  }

  private computeSchedulePatch(input: CreateTaskInput): Partial<TaskRecord> {
    const type = input.schedule_type;
    const enabled = Boolean(input.schedule_enabled);
    const at = input.schedule_at;
    const interval = input.schedule_interval_ms;
    const next =
      type === "once"
        ? (at && at > 0 ? at : null)
        : type === "interval"
        ? (at && at > 0 ? at : (interval && interval > 0 ? Date.now() + interval : null))
        : null;
    const patch: Partial<TaskRecord> = {};
    if (type) (patch as any).schedule_type = type;
    (patch as any).schedule_enabled = enabled ? 1 : 0;
    if (at !== undefined) (patch as any).schedule_at = at || null;
    if (interval !== undefined) (patch as any).schedule_interval_ms = interval || null;
    (patch as any).schedule_next_run = next ?? null;
    return patch;
  }

  private normalizeRow(r: any): TaskRecord {
    const paramsRaw = r.parameters;
    let params: any = null;
    try {
      params = typeof paramsRaw === "string" ? JSON.parse(paramsRaw) : paramsRaw;
    } catch {
      params = paramsRaw;
    }
    return {
      task_id: String(r.task_id),
      task_name: String(r.task_name ?? ""),
      status: String(r.status ?? "pending") as TaskStatus,
      start_time: r.start_time !== null && r.start_time !== undefined ? Number(r.start_time) : null,
      end_time: r.end_time !== null && r.end_time !== undefined ? Number(r.end_time) : null,
      parameters: params,
      progress: Number(r.progress ?? 0),
      created_by: String(r.created_by ?? ""),
      created_at: Number(r.created_at ?? 0),
      priority: Number(r.priority ?? 0),
      retry_count: Number(r.retry_count ?? 0),
      max_retries: Number(r.max_retries ?? 0),
      error: r.error === null || r.error === undefined ? null : String(r.error),
      new_videos: Number(r.new_videos ?? 0),
      updated_videos: Number(r.updated_videos ?? 0),
      new_comments: Number(r.new_comments ?? 0),
      updated_comments: Number(r.updated_comments ?? 0),
      schedule_type: r.schedule_type === null || r.schedule_type === undefined ? null : String(r.schedule_type),
      schedule_enabled: Number(r.schedule_enabled ?? 0),
      schedule_at: r.schedule_at === null || r.schedule_at === undefined ? null : Number(r.schedule_at),
      schedule_interval_ms: r.schedule_interval_ms === null || r.schedule_interval_ms === undefined ? null : Number(r.schedule_interval_ms),
      schedule_next_run: r.schedule_next_run === null || r.schedule_next_run === undefined ? null : Number(r.schedule_next_run),
      runs_count: Number(r.runs_count ?? 0),
    };
  }
}
