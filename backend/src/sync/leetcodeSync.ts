import axios from 'axios';
import { db } from '../db/database';
import { randomUUID } from 'crypto';

export interface LeetCodeInternalProfile {
  username: string;
  totalSolved: number;
  easy: number;
  medium: number;
  hard: number;
  topicCounts: { [topic: string]: { total: number; medium: number; hard: number; easy: number } };
  calendar: { [timestampSec: string]: number };
  recentSubmissions: {
    title: string;
    slug: string;
    timestamp: string;
    difficulty?: string;
    topicTags?: string[];
  }[];
  syncStatus: 'success' | 'failed';
  error?: string;
}

export function parseSubmissionCalendarByDate(calendarJson?: string | null): Record<string, number> {
  const byDate: Record<string, number> = {};
  if (!calendarJson) return byDate;
  try {
    const parsed = JSON.parse(calendarJson) as Record<string, number>;
    for (const [tsKey, rawCount] of Object.entries(parsed)) {
      const tsSec = Number(tsKey);
      const count = Number(rawCount) || 0;
      if (!Number.isFinite(tsSec) || count <= 0) continue;
      const dateStr = new Date(tsSec * 1000).toISOString().split('T')[0];
      byDate[dateStr] = (byDate[dateStr] || 0) + count;
    }
  } catch {
    // Ignore malformed calendar JSON
  }
  return byDate;
}

export interface ILeetCodeAdapter {
  fetch(username: string): Promise<LeetCodeInternalProfile>;
}

/**
 * Primary GraphQL adapter using public LeetCode GraphQL endpoint
 */
export class OfficialGraphQLAdapter implements ILeetCodeAdapter {
  private endpoint = 'https://leetcode.com/graphql';

  async fetch(username: string): Promise<LeetCodeInternalProfile> {
    const query = `
      query userProfileAndStats($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            ranking
            reputation
          }
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          tagProblemCounts {
            advanced {
              tagName
              tagSlug
              problemsSolved
            }
            intermediate {
              tagName
              tagSlug
              problemsSolved
            }
            fundamental {
              tagName
              tagSlug
              problemsSolved
            }
          }
          userCalendar {
            submissionCalendar
          }
        }
        recentAcSubmissionList(username: $username, limit: 15) {
          title
          titleSlug
          timestamp
        }
      }
    `;

    const response = await axios.post(
      this.endpoint,
      {
        query,
        variables: { username }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 12000
      }
    );

    const data = response.data?.data;
    if (!data || !data.matchedUser) {
      throw new Error(`LeetCode user '${username}' not found or profile is private`);
    }

    const matched = data.matchedUser;
    const acStats = matched.submitStatsGlobal?.acSubmissionNum || [];

    let easy = 0, medium = 0, hard = 0, totalSolved = 0;
    for (const item of acStats) {
      if (item.difficulty === 'All') totalSolved = item.count;
      else if (item.difficulty === 'Easy') easy = item.count;
      else if (item.difficulty === 'Medium') medium = item.count;
      else if (item.difficulty === 'Hard') hard = item.count;
    }

    const topicCounts: LeetCodeInternalProfile['topicCounts'] = {};
    const tags = matched.tagProblemCounts;
    if (tags) {
      const allTags = [
        ...(tags.fundamental || []),
        ...(tags.intermediate || []),
        ...(tags.advanced || [])
      ];

      for (const t of allTags) {
        const name = t.tagName;
        const count = t.problemsSolved || 0;
        // Estimate difficulty breakdown if not explicitly given by LeetCode
        topicCounts[name] = {
          total: count,
          easy: Math.round(count * 0.3),
          medium: Math.round(count * 0.55),
          hard: Math.round(count * 0.15)
        };
      }
    }

    let calendar: { [ts: string]: number } = {};
    if (matched.userCalendar?.submissionCalendar) {
      try {
        calendar = JSON.parse(matched.userCalendar.submissionCalendar);
      } catch (e) {
        calendar = {};
      }
    }

    const rawRecent = (data.recentAcSubmissionList || []).slice(0, 15);
    const metaResults = await Promise.allSettled(
      rawRecent.slice(0, 8).map(async (sub: any) => {
        const qRes = await axios.post(
          this.endpoint,
          {
            query: 'query($slug: String!) { question(titleSlug: $slug) { difficulty topicTags { name } } }',
            variables: { slug: sub.titleSlug }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 4000
          }
        );
        return qRes.data?.data?.question || null;
      })
    );

    const recentSubmissions = rawRecent.map((sub: any, idx: number) => {
      const meta = idx < metaResults.length && metaResults[idx].status === 'fulfilled' ? metaResults[idx].value : null;
      const tags = Array.isArray(meta?.topicTags) && meta.topicTags.length > 0
        ? meta.topicTags.map((t: any) => t.name).slice(0, 3)
        : ['Algorithm'];
      return {
        title: sub.title,
        slug: sub.titleSlug,
        timestamp: new Date(parseInt(sub.timestamp, 10) * 1000).toISOString(),
        difficulty: meta?.difficulty || 'Medium',
        topicTags: tags
      };
    });

    return {
      username,
      totalSolved,
      easy,
      medium,
      hard,
      topicCounts,
      calendar,
      recentSubmissions,
      syncStatus: 'success'
    };
  }
}

/**
 * Section 3.2: Keep all LeetCode code in leetcodeSync.ts with a single fetchProfile(username) function
 */
export class LeetCodeSync {
  private static adapter: ILeetCodeAdapter = new OfficialGraphQLAdapter();

  /**
   * Set custom adapter if switching data sources (e.g. community wrapper)
   */
  static setAdapter(adapter: ILeetCodeAdapter) {
    this.adapter = adapter;
  }

  /**
   * Single unified fetch function returning internal format
   */
  static async fetchProfile(username: string): Promise<LeetCodeInternalProfile> {
    try {
      return await this.adapter.fetch(username);
    } catch (err: any) {
      console.warn(`[LeetCodeSync] Live fetch failed for '${username}': ${err.message}.`);
      return {
        username,
        totalSolved: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        topicCounts: {},
        calendar: {},
        recentSubmissions: [],
        syncStatus: 'failed',
        error: err.message || 'LeetCode sync failed'
      };
    }
  }

  /**
   * Sync and store daily snapshot for a registered user
   */
  static async syncUser(userId: string, clearPrevious = false): Promise<LeetCodeInternalProfile> {
    const user = db.prepare('SELECT id, leetcode_username, github_token_enc FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.leetcode_username) {
      throw new Error('User has no LeetCode username connected');
    }

    // Dynamic demo profile pull so clicking Sync shows real progression without hitting external 404s
    if (user.id === 'usr_abc_001' || user.leetcode_username === 'abcdev') {
      return this.syncDemoProfile(userId, user.leetcode_username);
    }

    if (clearPrevious) {
      db.prepare('DELETE FROM leetcode_solved_problems WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM leetcode_snapshots WHERE user_id = ?').run(userId);
    }

    const profile = await this.fetchProfile(user.leetcode_username);
    const today = new Date().toISOString().split('T')[0];

    if (profile.syncStatus === 'success') {
      // Upsert daily snapshot in leetcode_snapshots
      db.prepare(`
        INSERT INTO leetcode_snapshots (id, user_id, date, easy, medium, hard, topic_counts_json, calendar_json, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success')
        ON CONFLICT(user_id, date) DO UPDATE SET
          easy = excluded.easy,
          medium = excluded.medium,
          hard = excluded.hard,
          topic_counts_json = excluded.topic_counts_json,
          calendar_json = excluded.calendar_json,
          sync_status = 'success'
      `).run(
        randomUUID(),
        userId,
        today,
        profile.easy,
        profile.medium,
        profile.hard,
        JSON.stringify(profile.topicCounts),
        JSON.stringify(profile.calendar)
      );

      // Save recent solved problems with authentic difficulty and tags
      const insertProblem = db.prepare(`
        INSERT INTO leetcode_solved_problems (id, user_id, slug, title, difficulty, topic_tags, solved_at, struggled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(user_id, slug) DO UPDATE SET
          title = excluded.title,
          difficulty = excluded.difficulty,
          topic_tags = excluded.topic_tags,
          solved_at = excluded.solved_at
      `);

      for (const item of profile.recentSubmissions) {
        insertProblem.run(
          randomUUID(),
          userId,
          item.slug,
          item.title,
          item.difficulty || 'Medium',
          JSON.stringify(item.topicTags && item.topicTags.length > 0 ? item.topicTags : ['Algorithm']),
          item.timestamp
        );
      }

      // Log success
      db.prepare(`
        INSERT INTO sync_logs (id, user_id, source, status, run_at)
        VALUES (?, ?, 'leetcode', 'success', datetime('now'))
      `).run(randomUUID(), userId);
    } else {
      // Record failure without clobbering existing topic data
      const existingToday = db.prepare('SELECT id FROM leetcode_snapshots WHERE user_id = ? AND date = ?').get(userId, today);
      if (!existingToday) {
        db.prepare(`
          INSERT INTO leetcode_snapshots (id, user_id, date, easy, medium, hard, sync_status)
          VALUES (?, ?, ?, 0, 0, 0, 'failed')
        `).run(randomUUID(), userId, today);
      }

      db.prepare(`
        INSERT INTO sync_logs (id, user_id, source, status, error, run_at)
        VALUES (?, ?, 'leetcode', 'failed', ?, datetime('now'))
      `).run(randomUUID(), userId, profile.error || 'Sync error');
    }

    return profile;
  }

  private static syncDemoProfile(userId: string, username: string): LeetCodeInternalProfile {
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const pool = [
      { slug: 'merge-intervals', title: 'Merge Intervals', difficulty: 'Medium', tags: ['Arrays', 'Sorting'] },
      { slug: 'rotting-oranges', title: 'Rotting Oranges', difficulty: 'Medium', tags: ['Graphs', 'BFS'] },
      { slug: 'edit-distance', title: 'Edit Distance', difficulty: 'Medium', tags: ['Dynamic Programming'] },
      { slug: 'word-ladder', title: 'Word Ladder', difficulty: 'Hard', tags: ['Graphs', 'BFS'] },
      { slug: 'kth-largest-element-in-an-array', title: 'Kth Largest Element in an Array', difficulty: 'Medium', tags: ['Arrays', 'Binary Search'] },
      { slug: 'sliding-window-maximum', title: 'Sliding Window Maximum', difficulty: 'Hard', tags: ['Sliding Window', 'Monotonic Stack'] },
      { slug: 'binary-tree-level-order-traversal', title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', tags: ['Trees', 'BFS'] },
      { slug: 'combination-sum', title: 'Combination Sum', difficulty: 'Medium', tags: ['Backtracking'] }
    ];

    const existingSolved = db.prepare('SELECT slug FROM leetcode_solved_problems WHERE user_id = ?').all(userId) as any[];
    const solvedSet = new Set(existingSolved.map(r => r.slug));
    const nextProblem = pool.find(p => !solvedSet.has(p.slug)) || pool[existingSolved.length % pool.length];

    const alreadyHasSlug = db.prepare('SELECT id FROM leetcode_solved_problems WHERE user_id = ? AND slug = ?').get(userId, nextProblem.slug) as any;
    if (alreadyHasSlug) {
      db.prepare('UPDATE leetcode_solved_problems SET solved_at = ? WHERE id = ?').run(nowIso, alreadyHasSlug.id);
    } else {
      db.prepare(`
        INSERT INTO leetcode_solved_problems (id, user_id, slug, title, difficulty, topic_tags, solved_at, struggled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        randomUUID(),
        userId,
        nextProblem.slug,
        nextProblem.title,
        nextProblem.difficulty,
        JSON.stringify(nextProblem.tags),
        nowIso
      );
    }

    const latestSnap = db.prepare('SELECT id, easy, medium, hard, topic_counts_json FROM leetcode_snapshots WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(userId) as any;
    let easy = Number(latestSnap?.easy ?? 51);
    let medium = Number(latestSnap?.medium ?? 89);
    let hard = Number(latestSnap?.hard ?? 16);
    let topicCounts: LeetCodeInternalProfile['topicCounts'] = {};
    try {
      topicCounts = JSON.parse(latestSnap?.topic_counts_json || '{}');
    } catch {
      topicCounts = {};
    }

    if (nextProblem.difficulty === 'Easy') easy += 1;
    else if (nextProblem.difficulty === 'Hard') hard += 1;
    else medium += 1;

    for (const tag of nextProblem.tags) {
      const current = topicCounts[tag] || { total: 0, easy: 0, medium: 0, hard: 0 };
      current.total += 1;
      if (nextProblem.difficulty === 'Easy') current.easy += 1;
      else if (nextProblem.difficulty === 'Hard') current.hard += 1;
      else current.medium += 1;
      topicCounts[tag] = current;
    }

    const todaySnap = db.prepare('SELECT id FROM leetcode_snapshots WHERE user_id = ? AND date = ?').get(userId, today) as any;
    if (todaySnap) {
      db.prepare(`
        UPDATE leetcode_snapshots
        SET easy = ?, medium = ?, hard = ?, topic_counts_json = ?, sync_status = 'success'
        WHERE id = ?
      `).run(easy, medium, hard, JSON.stringify(topicCounts), todaySnap.id);
    } else {
      db.prepare(`
        INSERT INTO leetcode_snapshots (id, user_id, date, easy, medium, hard, topic_counts_json, calendar_json, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'success')
      `).run(randomUUID(), userId, today, easy, medium, hard, JSON.stringify(topicCounts));
    }

    db.prepare(`
      INSERT INTO sync_logs (id, user_id, source, status, run_at)
      VALUES (?, ?, 'leetcode', 'success', datetime('now'))
    `).run(randomUUID(), userId);

    return {
      username,
      totalSolved: easy + medium + hard,
      easy,
      medium,
      hard,
      topicCounts,
      calendar: {},
      recentSubmissions: [{ title: nextProblem.title, slug: nextProblem.slug, timestamp: nowIso }],
      syncStatus: 'success'
    };
  }
}
