import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { db } from '../db/database';
import { config } from '../config';
import { encryptToken, generateApiKey, hashApiKey, generateOAuthState } from '../services/cryptoService';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { GitHubSync } from '../sync/githubSync';
import { LeetCodeSync } from '../sync/leetcodeSync';
import { AnalysisService } from '../services/analysisService';
import { validateGitHubId, validateLeetCodeId, validateOptionalEmail } from '../utils/handleValidation';

export const authRouter = Router();

// In-memory OAuth state tracker to prevent CSRF attacks (Section 9)
const pendingStates = new Set<string>();

/**
 * GET /api/auth/profiles
 * List all registered developer accounts for quick switching
 */
authRouter.get('/auth/profiles', (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT id, name, email, github_username, leetcode_username, public_slug, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();
  res.json({ profiles: users });
});

/**
 * POST /api/auth/register-or-login
 * Allows ANY developer / student to log in or register with their own GitHub & LeetCode IDs
 */
authRouter.post('/auth/register-or-login', async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, githubUsername, leetcodeUsername } = req.body;

  const cleanGh = typeof githubUsername === 'string' ? githubUsername.trim() : '';
  const cleanLc = typeof leetcodeUsername === 'string' ? leetcodeUsername.trim() : '';
  const rawEmail = typeof email === 'string' ? email.trim() : '';

  if (!cleanGh && !cleanLc) {
    return next(new AppError('BAD_REQUEST', 'Please write a correct GitHub ID or LeetCode ID to open your workspace.', 400));
  }

  if (cleanGh) {
    const ghCheck = validateGitHubId(cleanGh);
    if (!ghCheck.valid) {
      return next(new AppError('INVALID_GITHUB_ID', ghCheck.error!, 400));
    }
  }

  if (cleanLc) {
    const lcCheck = validateLeetCodeId(cleanLc);
    if (!lcCheck.valid) {
      return next(new AppError('INVALID_LEETCODE_ID', lcCheck.error!, 400));
    }
  }

  if (rawEmail) {
    const emailCheck = validateOptionalEmail(rawEmail);
    if (!emailCheck.valid) {
      return next(new AppError('INVALID_EMAIL', emailCheck.error!, 400));
    }
  }

  const cleanEmail = (rawEmail || `${cleanGh || cleanLc}@devprofile.io`).toLowerCase();
  const cleanName = (typeof name === 'string' && name.trim() ? name.trim() : cleanGh || cleanLc || 'Developer');

  // 1. Look up existing user by email or GitHub/LeetCode handle
  let user = db.prepare(`
    SELECT * FROM users
    WHERE LOWER(email) = LOWER(?)
       OR (github_username IS NOT NULL AND ? != '' AND LOWER(github_username) = LOWER(?))
       OR (leetcode_username IS NOT NULL AND ? != '' AND LOWER(leetcode_username) = LOWER(?))
  `).get(cleanEmail, cleanGh, cleanGh, cleanLc, cleanLc) as any;

  let rawApiKey: string | null = null;

  if (!user) {
    const newId = `usr_${randomUUID().slice(0, 8)}`;
    rawApiKey = generateApiKey();
    const apiKeyHash = hashApiKey(rawApiKey);
    const publicSlug = (cleanGh || cleanLc || cleanName.split(' ')[0] || `dev_${Math.floor(Math.random() * 10000)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    db.prepare(`
      INSERT INTO users (id, name, email, github_username, leetcode_username, api_key_hash, public_slug, is_public, timezone)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'Asia/Kolkata')
    `).run(
      newId,
      cleanName,
      cleanEmail,
      cleanGh || null,
      cleanLc || null,
      apiKeyHash,
      publicSlug
    );

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);

    // Initialize default goals
    const insertGoal = db.prepare('INSERT INTO goals (id, user_id, type, target_value, period) VALUES (?, ?, ?, ?, ?)');
    insertGoal.run(randomUUID(), newId, 'daily_leetcode', 2, 'daily');
    insertGoal.run(randomUUID(), newId, 'daily_commits', 3, 'daily');
    insertGoal.run(randomUUID(), newId, 'daily_coding_min', 60, 'daily');

    // Trigger initial multi-platform sync for their IDs
    try {
      if (cleanGh) await GitHubSync.syncUser(newId);
      if (cleanLc) await LeetCodeSync.syncUser(newId);
    } catch (e) {
      console.warn('[Register] Background initial sync caught:', e);
    }

    // Recompute daily_scores strictly from verified synced activity (zero fabricated solves or commits)
    const { parseSubmissionCalendarByDate } = await import('../sync/leetcodeSync');
    const latestLcSnap = db.prepare('SELECT calendar_json FROM leetcode_snapshots WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(newId) as any;
    const lcCalByDate = parseSubmissionCalendarByDate(latestLcSnap?.calendar_json);
    const ghRows = db.prepare('SELECT date, commits FROM github_daily WHERE user_id = ?').all(newId) as any[];
    const ghMap = new Map<string, number>(ghRows.map(r => [r.date, Number(r.commits || 0)]));
    const lcProblemRows = db.prepare('SELECT date(solved_at) as d, COUNT(*) as c FROM leetcode_solved_problems WHERE user_id = ? GROUP BY date(solved_at)').all(newId) as any[];
    const lcProbMap = new Map<string, number>(lcProblemRows.map(r => [r.d, Number(r.c || 0)]));

    const allDates = new Set<string>([
      ...ghMap.keys(),
      ...lcProbMap.keys(),
      ...Object.keys(lcCalByDate)
    ]);

    const insertScore = db.prepare('INSERT OR IGNORE INTO daily_scores (id, user_id, date, consistency_score, leetcode_pts, github_pts, coding_pts) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const ds of allDates) {
      const commits = ghMap.get(ds) || 0;
      const solves = Math.max(lcProbMap.get(ds) || 0, lcCalByDate[ds] || 0);
      const sc = AnalysisService.calculateDailyScore(solves, commits, 0);
      insertScore.run(randomUUID(), newId, ds, sc.totalScore, sc.leetcodePts, sc.githubPts, sc.codingPts);
    }
  } else {
    // If user already exists, update their handles if new ones were provided and re-sync cleanly
    if (cleanGh && user.github_username !== cleanGh) {
      db.prepare('UPDATE users SET github_username = ?, github_token_enc = NULL WHERE id = ?').run(cleanGh, user.id);
      db.prepare('DELETE FROM github_repos WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM github_daily WHERE user_id = ?').run(user.id);
      await GitHubSync.syncUser(user.id).catch(console.warn);
      user.github_username = cleanGh;
    }
    if (cleanLc && user.leetcode_username !== cleanLc) {
      db.prepare('UPDATE users SET leetcode_username = ? WHERE id = ?').run(cleanLc, user.id);
      await LeetCodeSync.syncUser(user.id, true).catch(console.warn);
      user.leetcode_username = cleanLc;
    }
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    apiKey: rawApiKey,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      githubUsername: user.github_username,
      leetcodeUsername: user.leetcode_username,
      publicSlug: user.public_slug
    }
  });
});

/**
 * GET /api/auth/github
 * Start GitHub OAuth flow
 */
authRouter.get('/auth/github', (req: Request, res: Response) => {
  const state = generateOAuthState();
  pendingStates.add(state);

  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

  const scope = 'read:user user:email repo';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&scope=${encodeURIComponent(scope)}&state=${state}&redirect_uri=${encodeURIComponent(config.githubCallbackUrl)}`;

  res.json({
    url: githubAuthUrl,
    state
  });
});

/**
 * GET /api/auth/github/callback
 * Finish OAuth, exchange code for access token, create or update user
 */
authRouter.get('/auth/github/callback', async (req: Request, res: Response, next: NextFunction) => {
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state || !pendingStates.has(state)) {
    return next(new AppError('INVALID_STATE', 'Invalid or expired OAuth state parameter. Please try logging in again.', 400));
  }
  pendingStates.delete(state);

  try {
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: config.githubCallbackUrl
      },
      {
        headers: { Accept: 'application/json' },
        timeout: 10000
      }
    );

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      throw new Error(tokenRes.data?.error_description || 'Failed to obtain access token from GitHub');
    }

    const userRes = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'DevProfile-App'
      }
    });

    const ghUser = userRes.data;
    const encryptedToken = encryptToken(accessToken);

    let user = db.prepare('SELECT * FROM users WHERE github_id = ?').get(String(ghUser.id)) as any;
    let rawApiKey: string | null = null;

    if (!user) {
      const newId = randomUUID();
      rawApiKey = generateApiKey();
      const apiKeyHash = hashApiKey(rawApiKey);
      const publicSlug = (ghUser.login || `dev_${Math.floor(Math.random() * 10000)}`).toLowerCase();

      db.prepare(`
        INSERT INTO users (id, name, email, github_id, github_username, github_token_enc, api_key_hash, public_slug, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        newId,
        ghUser.name || ghUser.login,
        ghUser.email || `${ghUser.login}@users.noreply.github.com`,
        String(ghUser.id),
        ghUser.login,
        encryptedToken,
        apiKeyHash,
        publicSlug
      );

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    } else {
      db.prepare('UPDATE users SET github_token_enc = ?, github_username = ? WHERE id = ?').run(
        encryptedToken,
        ghUser.login,
        user.id
      );
    }

    const sessionJwt = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.redirect(`${config.frontendUrl}/auth/callback?token=${sessionJwt}${rawApiKey ? `&apiKey=${rawApiKey}` : ''}`);
  } catch (err: any) {
    next(new AppError('OAUTH_ERROR', err.message || 'GitHub OAuth callback error', 500));
  }
});

/**
 * POST /api/auth/demo-login
 * Direct demo authentication for testing and professor evaluations
 */
authRouter.post('/auth/demo-login', (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, name, email, github_username, leetcode_username, public_slug, is_public FROM users LIMIT 1').get() as any;

  if (!user) {
    return res.status(404).json({ error: { code: 'NO_USERS', message: 'No seed user available. Run seed script first.' } });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user
  });
});

/**
 * GET /api/me
 * Current user and connected sources status
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT id, name, email, github_username, github_token_enc, leetcode_username,
           linkedin_sub, public_slug, is_public, timezone, created_at
    FROM users WHERE id = ?
  `).get(req.user!.id) as any;

  const lastGithubSync = db.prepare("SELECT run_at, status FROM sync_logs WHERE user_id = ? AND source = 'github' ORDER BY run_at DESC LIMIT 1").get(user.id) as any;
  const lastLeetcodeSync = db.prepare("SELECT run_at, status FROM sync_logs WHERE user_id = ? AND source = 'leetcode' ORDER BY run_at DESC LIMIT 1").get(user.id) as any;
  const vscodeSessions = db.prepare('SELECT COUNT(*) as count FROM coding_sessions WHERE user_id = ?').get(user.id) as any;
  const vscodeProblems = db.prepare('SELECT COUNT(*) as count FROM problem_times WHERE user_id = ?').get(user.id) as any;
  const lastVscodeSession = db.prepare('SELECT start_time FROM coding_sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT 1').get(user.id) as any;
  const vscodeCount = Number(vscodeSessions?.count || 0) + Number(vscodeProblems?.count || 0);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      githubUsername: user.github_username,
      leetcodeUsername: user.leetcode_username,
      publicSlug: user.public_slug,
      isPublic: Boolean(user.is_public),
      timezone: user.timezone,
      createdAt: user.created_at
    },
    connectedSources: {
      github: {
        connected: Boolean(user.github_token_enc || user.github_username),
        username: user.github_username,
        lastSynced: lastGithubSync?.run_at || null,
        syncStatus: lastGithubSync?.status || 'active'
      },
      leetcode: {
        connected: Boolean(user.leetcode_username),
        username: user.leetcode_username,
        lastSynced: lastLeetcodeSync?.run_at || null,
        syncStatus: lastLeetcodeSync?.status || 'active'
      },
      vscode: {
        connected: vscodeCount > 0,
        lastSynced: lastVscodeSession?.start_time || null,
        sessionCount: vscodeCount
      },
      linkedin: {
        connected: Boolean(user.linkedin_sub),
        mode: 'output_only'
      }
    }
  });
});

/**
 * POST /api/apikey/regenerate
 * Generates a new extension API key, hashes and stores it, returns raw key once
 */
authRouter.post('/apikey/regenerate', requireAuth, (req: Request, res: Response) => {
  const rawKey = generateApiKey();
  const hashed = hashApiKey(rawKey);

  db.prepare('UPDATE users SET api_key_hash = ? WHERE id = ?').run(hashed, req.user!.id);

  res.json({
    message: 'API key regenerated successfully. Store it safely in your VS Code extension settings; it will not be displayed again.',
    apiKey: rawKey
  });
});
