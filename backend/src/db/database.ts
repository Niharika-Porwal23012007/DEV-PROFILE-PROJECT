// MOCKED IN-MEMORY DATABASE — replaces native better-sqlite3 for container compatibility

type Row = Record<string, any>;

const TABLE_NAMES = [
  'users',
  'github_daily',
  'github_repos',
  'leetcode_snapshots',
  'leetcode_solved_problems',
  'coding_sessions',
  'coding_daily',
  'problem_times',
  'reviews',
  'goals',
  'daily_scores',
  'problem_notes',
  'generated_posts',
  'plans',
  'sync_logs'
] as const;

type TableName = typeof TABLE_NAMES[number];

const TABLE_DEFAULTS: Record<TableName, () => Row> = {
  users: () => ({ is_public: 1, timezone: 'Asia/Kolkata', created_at: new Date().toISOString() }),
  github_daily: () => ({ commits: 0, prs: 0, issues: 0, repos_touched: 0, created_at: new Date().toISOString() }),
  github_repos: () => ({ languages_json: '{}', stars: 0, created_at: new Date().toISOString() }),
  leetcode_snapshots: () => ({ easy: 0, medium: 0, hard: 0, topic_counts_json: '{}', calendar_json: '{}', sync_status: 'success', created_at: new Date().toISOString() }),
  leetcode_solved_problems: () => ({ topic_tags: '[]', struggled: 0, created_at: new Date().toISOString() }),
  coding_sessions: () => ({ created_at: new Date().toISOString() }),
  coding_daily: () => ({ total_sec: 0, by_language_json: '{}', by_project_json: '{}', created_at: new Date().toISOString() }),
  problem_times: () => ({ created_at: new Date().toISOString() }),
  reviews: () => ({ interval_days: 3, done_at: null, created_at: new Date().toISOString() }),
  goals: () => ({ created_at: new Date().toISOString() }),
  daily_scores: () => ({ created_at: new Date().toISOString() }),
  problem_notes: () => ({ updated_at: new Date().toISOString(), created_at: new Date().toISOString() }),
  generated_posts: () => ({ posted: 0, created_at: new Date().toISOString() }),
  plans: () => ({ followed_json: '[]', created_at: new Date().toISOString() }),
  sync_logs: () => ({ run_at: new Date().toISOString(), created_at: new Date().toISOString() })
};

const tables: Record<TableName, Row[]> = {
  users: [],
  github_daily: [],
  github_repos: [],
  leetcode_snapshots: [],
  leetcode_solved_problems: [],
  coding_sessions: [],
  coding_daily: [],
  problem_times: [],
  reviews: [],
  goals: [],
  daily_scores: [],
  problem_notes: [],
  generated_posts: [],
  plans: [],
  sync_logs: []
};

function splitTopLevel(str: string, delimiter = ','): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
    } else if (!inSingle && !inDouble) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === delimiter && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function splitWhereAnd(whereStr: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;

  for (let i = 0; i < whereStr.length; i++) {
    const ch = whereStr[i];
    if (ch === "'") inSingle = !inSingle;
    if (!inSingle) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0 && whereStr.slice(i, i + 5).toUpperCase() === ' AND ') {
        parts.push(current.trim());
        current = '';
        i += 4;
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function resolveDateExpr(expr: string): string {
  const m = expr.match(/^(datetime|date)\(\s*'now'\s*(?:,\s*'([+-]\d+)\s+days?'\s*)?\)$/i);
  if (!m) return new Date().toISOString();
  const d = new Date();
  if (m[2]) {
    d.setDate(d.getDate() + parseInt(m[2], 10));
  }
  return m[1].toLowerCase() === 'date' ? d.toISOString().split('T')[0] : d.toISOString();
}

function parseLiteralOrParam(token: string, params: any[], paramIdx: { i: number }): any {
  const t = token.trim();
  if (t === '?') return params[paramIdx.i++];
  if (/^null$/i.test(t)) return null;
  if (/^(datetime|date)\(/i.test(t)) return resolveDateExpr(t);
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function evalCondition(row: Row, cond: string, params: any[], paramIdx: { i: number }): boolean {
  let c = cond.trim();
  while (c.startsWith('(') && c.endsWith(')')) {
    // Only strip outer parens if they match each other
    let depth = 0;
    let wrapped = true;
    for (let i = 0; i < c.length; i++) {
      if (c[i] === '(') depth++;
      else if (c[i] === ')') depth--;
      if (depth === 0 && i < c.length - 1) {
        wrapped = false;
        break;
      }
    }
    if (wrapped) c = c.slice(1, -1).trim();
    else break;
  }

  // Handle OR at top level
  let depth = 0;
  let inSingle = false;
  for (let i = 0; i < c.length; i++) {
    if (c[i] === "'") inSingle = !inSingle;
    if (!inSingle) {
      if (c[i] === '(') depth++;
      else if (c[i] === ')') depth--;
      if (depth === 0 && c.slice(i, i + 4).toUpperCase() === ' OR ') {
        const left = c.slice(0, i);
        const right = c.slice(i + 4);
        const lRes = evalCondition(row, left, params, paramIdx);
        const rRes = evalCondition(row, right, params, paramIdx);
        return lRes || rRes;
      }
    }
  }

  // Handle AND inside parens
  const andParts = splitWhereAnd(c);
  if (andParts.length > 1) {
    let allOk = true;
    for (const part of andParts) {
      if (!evalCondition(row, part, params, paramIdx)) allOk = false;
    }
    return allOk;
  }

  // IS NULL / IS NOT NULL
  const isNullMatch = c.match(/^([a-zA-Z0-9_.]+)\s+IS\s+NULL$/i);
  if (isNullMatch) {
    const col = isNullMatch[1].split('.').pop()!;
    return row[col] === null || row[col] === undefined;
  }
  const isNotNullMatch = c.match(/^([a-zA-Z0-9_.]+)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNullMatch) {
    const col = isNotNullMatch[1].split('.').pop()!;
    return row[col] !== null && row[col] !== undefined;
  }

  // (easy + medium + hard) > 0
  const sumGtZero = c.match(/^easy\s*\+\s*medium\s*\+\s*hard\s*>\s*0$/i);
  if (sumGtZero) {
    return (Number(row.easy || 0) + Number(row.medium || 0) + Number(row.hard || 0)) > 0;
  }

  // length(col) > N
  const lenMatch = c.match(/^length\(\s*([a-zA-Z0-9_.]+)\s*\)\s*>\s*(\d+)$/i);
  if (lenMatch) {
    const col = lenMatch[1].split('.').pop()!;
    return String(row[col] ?? '').length > parseInt(lenMatch[2], 10);
  }

  // LOWER(col) = LOWER(?)
  const lowerEqMatch = c.match(/^LOWER\(\s*([a-zA-Z0-9_.]+)\s*\)\s*=\s*LOWER\(\s*(\?|'[^']*')\s*\)$/i);
  if (lowerEqMatch) {
    const col = lowerEqMatch[1].split('.').pop()!;
    const val = parseLiteralOrParam(lowerEqMatch[2], params, paramIdx);
    if (row[col] === null || row[col] === undefined || val === null || val === undefined) return false;
    return String(row[col]).toLowerCase() === String(val).toLowerCase();
  }

  // date(col) = ?
  const dateFnMatch = c.match(/^date\(\s*([a-zA-Z0-9_.]+)\s*\)\s*=\s*(\?|'[^']*')$/i);
  if (dateFnMatch) {
    const col = dateFnMatch[1].split('.').pop()!;
    const val = parseLiteralOrParam(dateFnMatch[2], params, paramIdx);
    return String(row[col] ?? '').split('T')[0] === String(val);
  }

  // Binary comparison: lhs op rhs
  const binMatch = c.match(/^([a-zA-Z0-9_.]+)\s*(<=|>=|!=|<>|=|<|>)\s*(.+)$/);
  if (binMatch) {
    const col = binMatch[1].split('.').pop()!;
    const op = binMatch[2];
    const rhs = parseLiteralOrParam(binMatch[3], params, paramIdx);
    const lhs = row[col];

    if (op === '=') return lhs === rhs || (lhs !== null && lhs !== undefined && String(lhs) === String(rhs));
    if (op === '!=' || op === '<>') return lhs !== rhs;
    if (lhs === null || lhs === undefined) return false;
    if (op === '>') return lhs > rhs;
    if (op === '<') return lhs < rhs;
    if (op === '>=') return lhs >= rhs;
    if (op === '<=') return lhs <= rhs;
  }

  return true;
}

function filterRows(rows: Row[], whereClause: string | undefined, params: any[], startParamIdx = 0): { matched: Row[]; nextParamIdx: number } {
  if (!whereClause) return { matched: [...rows], nextParamIdx: startParamIdx };
  const parts = splitWhereAnd(whereClause);
  let consumed = 0;
  const matched = rows.filter(row => {
    const pIdx = { i: startParamIdx };
    let ok = true;
    for (const part of parts) {
      if (!evalCondition(row, part, params, pIdx)) {
        ok = false;
      }
    }
    consumed = pIdx.i - startParamIdx;
    return ok;
  });
  if (rows.length === 0) {
    // Still count '?' consumed so LIMIT ? gets right index
    consumed = (whereClause.match(/\?/g) || []).length;
  }
  return { matched, nextParamIdx: startParamIdx + consumed };
}

function applyOrderAndLimit(rows: Row[], orderClause: string | undefined, limitClause: string | undefined, params: any[], paramIdx: number): Row[] {
  let result = [...rows];
  if (orderClause) {
    const orderItems = orderClause.split(',').map(s => s.trim());
    result.sort((a, b) => {
      for (const item of orderItems) {
        const [colRaw, dirRaw] = item.split(/\s+/);
        const col = colRaw.split('.').pop()!;
        const desc = (dirRaw || 'ASC').toUpperCase() === 'DESC';
        const va = a[col] ?? '';
        const vb = b[col] ?? '';
        if (va < vb) return desc ? 1 : -1;
        if (va > vb) return desc ? -1 : 1;
      }
      return 0;
    });
  }
  if (limitClause) {
    const limToken = limitClause.trim();
    const limit = limToken === '?' ? Number(params[paramIdx]) : parseInt(limToken, 10);
    if (!Number.isNaN(limit)) {
      result = result.slice(0, limit);
    }
  }
  return result;
}

function projectColumns(row: Row, selectExpr: string): Row {
  if (selectExpr.trim() === '*') return { ...row };
  const cols = splitTopLevel(selectExpr);
  const out: Row = {};
  for (const colExpr of cols) {
    const asMatch = colExpr.match(/^(.+?)\s+as\s+([a-zA-Z0-9_]+)$/i);
    if (asMatch) {
      const src = asMatch[1].trim().split('.').pop()!;
      const alias = asMatch[2].trim();
      out[alias] = row[src];
    } else {
      const col = colExpr.trim().split('.').pop()!;
      out[col] = row[col];
    }
  }
  return out;
}

function handleSpecialQuery(normSql: string, params: any[]): Row[] | null {
  // 1. Dashboard merged heatmap query
  if (normSql.includes('UNION') && normSql.includes('github_daily') && normSql.includes('coding_daily') && normSql.includes('daily_scores')) {
    const userId = params[0];
    const limit = Number(params[3] ?? 30);
    const dateSet = new Set<string>();
    for (const r of tables.github_daily) if (r.user_id === userId) dateSet.add(r.date);
    for (const r of tables.coding_daily) if (r.user_id === userId) dateSet.add(r.date);
    for (const r of tables.daily_scores) if (r.user_id === userId) dateSet.add(r.date);

    const dates = Array.from(dateSet).sort().slice(-limit);
    return dates.map(date => {
      const gh = tables.github_daily.find(r => r.user_id === userId && r.date === date);
      const cd = tables.coding_daily.find(r => r.user_id === userId && r.date === date);
      const ds = tables.daily_scores.find(r => r.user_id === userId && r.date === date);
      const solves = tables.leetcode_solved_problems.filter(
        sp => sp.user_id === userId && String(sp.solved_at || '').split('T')[0] === date
      ).length;
      return {
        date,
        commits: gh?.commits ?? 0,
        coding_sec: cd?.total_sec ?? 0,
        solves,
        score: ds?.consistency_score ?? 0
      };
    });
  }

  // 2. Insights activityHistory query
  if (normSql.includes('FROM github_daily gh') && normSql.includes('LEFT JOIN coding_daily cd')) {
    const userId = params[0];
    const ghRows = tables.github_daily
      .filter(r => r.user_id === userId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 42);
    return ghRows.map(gh => {
      const cd = tables.coding_daily.find(c => c.user_id === userId && c.date === gh.date);
      const solves = tables.leetcode_solved_problems.filter(
        sp => sp.user_id === userId && String(sp.solved_at || '').split('T')[0] === gh.date
      ).length;
      return {
        date: gh.date,
        commits: gh.commits,
        codingSec: cd?.total_sec ?? 0,
        leetcodeSolves: solves
      };
    });
  }

  // 3. Reviews dueToday / upcoming JOIN query
  if (normSql.includes('FROM reviews r') && normSql.includes('LEFT JOIN problem_notes pn')) {
    const userId = params[0];
    const today = params[1];
    const isDue = normSql.includes('r.due_date <=');
    let rows = tables.reviews.filter(r =>
      r.user_id === userId &&
      (r.done_at === null || r.done_at === undefined) &&
      (isDue ? r.due_date <= today : r.due_date > today)
    );
    rows.sort((a, b) => (a.due_date > b.due_date ? 1 : -1));
    if (!isDue) rows = rows.slice(0, 10);

    return rows.map(r => {
      const pn = tables.problem_notes.find(n => n.user_id === r.user_id && n.problem_slug === r.problem_slug);
      const sp = tables.leetcode_solved_problems.find(s => s.user_id === r.user_id && s.slug === r.problem_slug);
      return {
        id: r.id,
        problem_slug: r.problem_slug,
        due_date: r.due_date,
        interval_days: r.interval_days,
        note_text: pn?.note_text ?? null,
        pattern_tag: pn?.pattern_tag ?? null,
        title: sp?.title ?? null,
        difficulty: sp?.difficulty ?? null
      };
    });
  }

  return null;
}

function executeSelect(sql: string, params: any[]): Row[] {
  const normSql = sql.replace(/\s+/g, ' ').trim();
  const special = handleSpecialQuery(normSql, params);
  if (special !== null) return special;

  const selectMatch = normSql.match(
    /^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\?|\d+))?$/i
  );
  if (!selectMatch) return [];

  const [, selectExpr, tableRaw, whereClause, orderClause, limitClause] = selectMatch;
  const tableName = tableRaw as TableName;
  const tableRows = tables[tableName] || [];

  const { matched, nextParamIdx } = filterRows(tableRows, whereClause, params, 0);

  // Aggregate: COUNT(*)
  const countMatch = selectExpr.trim().match(/^COUNT\(\*\)(?:\s+as\s+([a-zA-Z0-9_]+))?$/i);
  if (countMatch) {
    const alias = countMatch[1] || 'count';
    return [{ [alias]: matched.length }];
  }

  // Aggregate: SUM(col)
  const sumMatch = selectExpr.trim().match(/^SUM\(\s*([a-zA-Z0-9_]+)\s*\)(?:\s+as\s+([a-zA-Z0-9_]+))?$/i);
  if (sumMatch) {
    const col = sumMatch[1];
    const alias = sumMatch[2] || 'total';
    const total = matched.length === 0 ? null : matched.reduce((acc, r) => acc + Number(r[col] || 0), 0);
    return [{ [alias]: total }];
  }

  const ordered = applyOrderAndLimit(matched, orderClause, limitClause, params, nextParamIdx);
  return ordered.map(r => projectColumns(r, selectExpr));
}

function executeInsert(sql: string, params: any[]): { changes: number } {
  const normSql = sql.replace(/\s+/g, ' ').trim();
  const insertMatch = normSql.match(
    /^INSERT\s+(OR\s+IGNORE\s+)?INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\((.+?)\)(?:\s+ON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+UPDATE\s+SET\s+(.+))?$/i
  );
  if (!insertMatch) return { changes: 0 };

  const [, orIgnore, tableRaw, colsRaw, valsRaw, conflictColsRaw, updateSetRaw] = insertMatch;
  const tableName = tableRaw as TableName;
  const tableRows = tables[tableName];
  if (!tableRows) return { changes: 0 };

  const cols = colsRaw.split(',').map(c => c.trim());
  const valTokens = splitTopLevel(valsRaw);
  const paramIdx = { i: 0 };

  const newRow: Row = { ...(TABLE_DEFAULTS[tableName]?.() || {}) };
  cols.forEach((col, idx) => {
    newRow[col] = parseLiteralOrParam(valTokens[idx], params, paramIdx);
  });

  if (conflictColsRaw && updateSetRaw) {
    const conflictCols = conflictColsRaw.split(',').map(c => c.trim());
    const existing = tableRows.find(r => conflictCols.every(c => r[c] === newRow[c]));
    if (existing) {
      const assignments = splitTopLevel(updateSetRaw);
      for (const assign of assignments) {
        const eqIdx = assign.indexOf('=');
        if (eqIdx === -1) continue;
        const targetCol = assign.slice(0, eqIdx).trim();
        const expr = assign.slice(eqIdx + 1).trim();
        if (expr.toLowerCase().startsWith('excluded.')) {
          const srcCol = expr.slice('excluded.'.length).trim();
          existing[targetCol] = newRow[srcCol];
        } else if (/^(datetime|date)\(/i.test(expr)) {
          existing[targetCol] = resolveDateExpr(expr);
        } else {
          existing[targetCol] = parseLiteralOrParam(expr, params, paramIdx);
        }
      }
      return { changes: 1 };
    }
  } else if (orIgnore) {
    // Check common unique keys (user_id + date)
    if ('user_id' in newRow && 'date' in newRow) {
      const exists = tableRows.some(r => r.user_id === newRow.user_id && r.date === newRow.date);
      if (exists) return { changes: 0 };
    }
  }

  tableRows.push(newRow);
  return { changes: 1 };
}

function executeUpdate(sql: string, params: any[]): { changes: number } {
  const normSql = sql.replace(/\s+/g, ' ').trim();
  const updMatch = normSql.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
  if (!updMatch) return { changes: 0 };

  const [, tableRaw, setRaw, whereClause] = updMatch;
  const tableRows = tables[tableRaw as TableName];
  if (!tableRows) return { changes: 0 };

  const assignments = splitTopLevel(setRaw);
  const paramIdx = { i: 0 };
  const updates: Record<string, any> = {};
  for (const assign of assignments) {
    const eqIdx = assign.indexOf('=');
    if (eqIdx === -1) continue;
    const col = assign.slice(0, eqIdx).trim();
    const val = parseLiteralOrParam(assign.slice(eqIdx + 1).trim(), params, paramIdx);
    updates[col] = val;
  }

  const { matched } = filterRows(tableRows, whereClause, params, paramIdx.i);
  for (const row of matched) {
    Object.assign(row, updates);
  }
  return { changes: matched.length };
}

function executeDelete(sql: string, params: any[]): { changes: number } {
  const normSql = sql.replace(/\s+/g, ' ').trim();
  const delMatch = normSql.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
  if (!delMatch) return { changes: 0 };

  const [, tableRaw, whereClause] = delMatch;
  const tableName = tableRaw as TableName;
  const tableRows = tables[tableName];
  if (!tableRows) return { changes: 0 };

  if (!whereClause) {
    const count = tableRows.length;
    tables[tableName] = [];
    return { changes: count };
  }

  const { matched } = filterRows(tableRows, whereClause, params, 0);
  const matchedSet = new Set(matched);
  tables[tableName] = tableRows.filter(r => !matchedSet.has(r));

  // Cascade delete if deleting users
  if (tableName === 'users' && matched.length > 0) {
    const deletedUserIds = new Set(matched.map(u => u.id));
    for (const t of TABLE_NAMES) {
      if (t !== 'users') {
        tables[t] = tables[t].filter(r => !deletedUserIds.has(r.user_id));
      }
    }
  }

  return { changes: matched.length };
}

export const db = {
  pragma(_str: string) {
    return [];
  },
  exec(sql: string) {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      if (/^DELETE\s+FROM\s+/i.test(stmt)) {
        executeDelete(stmt, []);
      }
      // CREATE TABLE / CREATE INDEX are no-ops since schema tables are pre-initialized
    }
  },
  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => fn(...args)) as T;
  },
  prepare(sql: string) {
    return {
      get(...params: any[]): any {
        const rows = executeSelect(sql, params);
        return rows[0] ?? undefined;
      },
      all(...params: any[]): any[] {
        return executeSelect(sql, params);
      },
      run(...params: any[]): { changes: number } {
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith('INSERT')) return executeInsert(sql, params);
        if (trimmed.startsWith('UPDATE')) return executeUpdate(sql, params);
        if (trimmed.startsWith('DELETE')) return executeDelete(sql, params);
        return { changes: 0 };
      }
    };
  }
};

export function initDatabase() {
  // In-memory tables are pre-initialized
}
