import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { db } from '../db/database';
import { LeetCodeSync, parseSubmissionCalendarByDate } from '../sync/leetcodeSync';
import { GitHubSync } from '../sync/githubSync';
import { AnalysisService } from '../services/analysisService';
import { AppError } from '../middleware/errorHandler';
import { randomUUID } from 'crypto';
import { validateGitHubId, validateLeetCodeId } from '../utils/handleValidation';
import { runNightlyJobs } from '../cron/scheduler';

export const syncRouter = Router();

// In-memory rate limiting map for manual sync: userId -> lastSyncTimestamp
const lastManualSyncTimes = new Map<string, number>();
const SYNC_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

/**
 * POST /api/connect/leetcode
 * Save and verify LeetCode username and perform initial snapshot pull
 */
syncRouter.post('/connect/leetcode', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return next(new AppError('BAD_REQUEST', 'Please write a LeetCode ID.', 400));
  }

  const check = validateLeetCodeId(username);
  if (!check.valid) {
    return next(new AppError('INVALID_LEETCODE_ID', check.error!, 400));
  }

  const cleanUsername = check.value;
  const existingUser = db.prepare('SELECT leetcode_username FROM users WHERE id = ?').get(req.user!.id) as any;
  const changedHandle = (existingUser?.leetcode_username || '').toLowerCase() !== cleanUsername.toLowerCase();

  // Save username to user profile
  db.prepare('UPDATE users SET leetcode_username = ? WHERE id = ?').run(cleanUsername, req.user!.id);

  try {
    const profile = await LeetCodeSync.syncUser(req.user!.id, changedHandle);
    if (profile.syncStatus === 'failed') {
      return next(new AppError('LEETCODE_SYNC_FAILED', profile.error || `Could not find public LeetCode profile '@${cleanUsername}'`, 400));
    }
    res.json({
      message: `LeetCode profile connected for @${cleanUsername} (${profile.totalSolved} solved)`,
      profile
    });
  } catch (err: any) {
    next(new AppError('LEETCODE_SYNC_FAILED', err.message || 'Could not verify LeetCode profile', 400));
  }
});

/**
 * POST /api/connect/github
 * Connect a public GitHub handle directly without needing an OAuth App
 */
syncRouter.post('/connect/github', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return next(new AppError('BAD_REQUEST', 'Please write a GitHub ID.', 400));
  }

  const check = validateGitHubId(username);
  if (!check.valid) {
    return next(new AppError('INVALID_GITHUB_ID', check.error!, 400));
  }

  const cleanUsername = check.value;
  db.prepare('UPDATE users SET github_username = ?, github_token_enc = NULL WHERE id = ?').run(cleanUsername, req.user!.id);

  try {
    const syncRes = await GitHubSync.syncUser(req.user!.id);
    if (!syncRes.success) {
      return next(new AppError('GITHUB_SYNC_FAILED', syncRes.error || `Could not find GitHub user '@${cleanUsername}'`, 400));
    }
    res.json({
      message: `GitHub profile connected for @${cleanUsername}`,
      sync: syncRes
    });
  } catch (err: any) {
    next(new AppError('GITHUB_SYNC_FAILED', err.message || 'Could not sync GitHub profile', 400));
  }
});

/**
 * POST /api/sync
 * Manual sync (rate limited)
 */
syncRouter.post('/sync', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const user = db.prepare('SELECT id, github_token_enc, github_username, leetcode_username FROM users WHERE id = ?').get(userId) as any;
  const isDemoAccount = userId === 'usr_abc_001' || user?.github_username === 'abcdev';

  const now = Date.now();
  const lastSync = lastManualSyncTimes.get(userId) || 0;

  if (!isDemoAccount && now - lastSync < SYNC_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSync)) / 1000);
    return next(new AppError('RATE_LIMITED', `Sync rate limit reached. Please wait ${waitSeconds} seconds before syncing again.`, 429));
  }

  lastManualSyncTimes.set(userId, now);

  const results: { github?: any; leetcode?: any } = {};

  // Sync GitHub (supports both OAuth token and public username)
  if (user?.github_token_enc || user?.github_username) {
    try {
      results.github = await GitHubSync.syncUser(userId);
    } catch (ghErr: any) {
      console.warn('[SyncRoutes] GitHub sync notice:', ghErr.message);
      results.github = { success: false, error: ghErr.message };
    }
  }

  // Sync LeetCode
  if (user?.leetcode_username) {
    try {
      results.leetcode = await LeetCodeSync.syncUser(userId);
    } catch (lcErr: any) {
      console.warn('[SyncRoutes] LeetCode sync notice:', lcErr.message);
      results.leetcode = { syncStatus: 'failed', error: lcErr.message };
    }
  }

  // For the demo profile, also record fresh IDE active coding minutes on sync
  const today = new Date().toISOString().split('T')[0];
  if (isDemoAccount) {
    const addedSec = (Math.floor(Math.random() * 11) + 10) * 60; // +10 to +20 mins
    const existingCoding = db.prepare('SELECT id, total_sec FROM coding_daily WHERE user_id = ? AND date = ?').get(userId, today) as any;
    if (existingCoding) {
      db.prepare('UPDATE coding_daily SET total_sec = ? WHERE id = ?').run(
        Number(existingCoding.total_sec || 0) + addedSec,
        existingCoding.id
      );
    } else {
      db.prepare(`
        INSERT INTO coding_daily (id, user_id, date, total_sec, by_language_json, by_project_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        userId,
        today,
        addedSec,
        JSON.stringify({ TypeScript: addedSec }),
        JSON.stringify({ devprofile: addedSec })
      );
    }
  }

  // Recalculate today's score
  const solves = db.prepare("SELECT COUNT(*) as count FROM leetcode_solved_problems WHERE user_id = ? AND date(solved_at) = ?").get(userId, today) as any;
  const latestLcSnap = db.prepare("SELECT calendar_json FROM leetcode_snapshots WHERE user_id = ? AND sync_status = 'success' ORDER BY date DESC LIMIT 1").get(userId) as any;
  const calByDate = parseSubmissionCalendarByDate(latestLcSnap?.calendar_json);
  const commits = db.prepare("SELECT commits FROM github_daily WHERE user_id = ? AND date = ?").get(userId, today) as any;
  const coding = db.prepare("SELECT total_sec FROM coding_daily WHERE user_id = ? AND date = ?").get(userId, today) as any;

  const solvedCount = Math.max(solves?.count || 0, calByDate[today] || 0);
  const commitCount = commits?.commits || 0;
  const codingMinutes = Math.round((coding?.total_sec || 0) / 60);

  const score = AnalysisService.calculateDailyScore(solvedCount, commitCount, codingMinutes);

  const existingScore = db.prepare('SELECT id FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, today) as any;
  if (existingScore) {
    db.prepare(`
      UPDATE daily_scores
      SET consistency_score = ?, leetcode_pts = ?, github_pts = ?, coding_pts = ?
      WHERE id = ?
    `).run(score.totalScore, score.leetcodePts, score.githubPts, score.codingPts, existingScore.id);
  } else {
    db.prepare(`
      INSERT INTO daily_scores (id, user_id, date, consistency_score, leetcode_pts, github_pts, coding_pts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      userId,
      today,
      score.totalScore,
      score.leetcodePts,
      score.githubPts,
      score.codingPts
    );
  }

  res.json({
    message: 'Manual sync completed',
    results,
    todayScore: score
  });
});

/**
 * POST /api/scheduler/trigger
 * Secured endpoint for external cron triggers (Deployment Guide Section 4.4)
 */
syncRouter.post('/scheduler/trigger', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await runNightlyJobs();
    res.json({ message: 'Nightly scheduler jobs executed successfully.' });
  } catch (err: any) {
    next(new AppError('SCHEDULER_FAILED', err.message || 'Scheduler trigger failed', 500));
  }
});
