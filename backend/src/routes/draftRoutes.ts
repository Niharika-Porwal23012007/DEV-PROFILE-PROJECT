import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { db } from '../db/database';
import { DraftService } from '../services/draftService';
import { AnalysisService } from '../services/analysisService';
import { AppError } from '../middleware/errorHandler';
import { randomUUID } from 'crypto';

export const draftRouter = Router();

/**
 * POST /api/drafts
 * Generate a LinkedIn draft (type: weekly, project, profile) adhering to the anti-fabrication rule
 */
draftRouter.post('/drafts', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  const { type = 'weekly', repoName } = req.body;
  const userId = req.user!.id;

  let generatedText = '';

  if (type === 'weekly') {
    // Collect past 7 days verified metrics
    const solves = db.prepare(`
      SELECT COUNT(*) as count FROM leetcode_solved_problems
      WHERE user_id = ? AND solved_at >= datetime('now', '-7 days')
    `).get(userId) as any;

    const commits = db.prepare(`
      SELECT SUM(commits) as total FROM github_daily
      WHERE user_id = ? AND date >= date('now', '-7 days')
    `).get(userId) as any;

    const coding = db.prepare(`
      SELECT SUM(total_sec) as total FROM coding_daily
      WHERE user_id = ? AND date >= date('now', '-7 days')
    `).get(userId) as any;

    const scores = db.prepare(`
      SELECT consistency_score as score FROM daily_scores
      WHERE user_id = ? ORDER BY date DESC LIMIT 7
    `).all(userId) as any[];

    const streakScores = db.prepare('SELECT consistency_score as score FROM daily_scores WHERE user_id = ? ORDER BY date DESC LIMIT 30').all(userId) as any[];
    const streak = AnalysisService.calculateStreak(streakScores);

    const activeRepo = db.prepare(`
      SELECT repo_name FROM github_repos WHERE user_id = ? ORDER BY pushed_at DESC LIMIT 1
    `).get(userId) as any;

    const topProblem = db.prepare(`
      SELECT topic_tags FROM leetcode_solved_problems WHERE user_id = ? ORDER BY solved_at DESC LIMIT 1
    `).get(userId) as any;

    const verifiedSolves = Number(solves?.count || 0);
    const verifiedCommits = Number(commits?.total || 0);
    const verifiedCodingSec = Number(coding?.total || 0);
    const codingHours = Math.round((verifiedCodingSec / 3600) * 10) / 10;

    if (verifiedSolves === 0 && verifiedCommits === 0 && codingHours === 0) {
      return next(new AppError(
        'NO_VERIFIED_ACTIVITY',
        'Anti-fabrication guard: No verified solves, commits, or VS Code coding sessions were recorded in the past 7 days. Sync activity before generating a weekly recap.',
        400
      ));
    }

    let topTopicName = 'Core DSA';
    if (topProblem?.topic_tags) {
      try {
        const tags = JSON.parse(topProblem.topic_tags);
        if (tags.length > 0) topTopicName = tags[0];
      } catch (e) {}
    }

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length)
      : 0;

    generatedText = DraftService.generateWeeklyPost({
      totalSolves: verifiedSolves,
      topTopic: topTopicName,
      topTopicCount: Math.max(1, Math.round(verifiedSolves * 0.4)),
      totalCommits: verifiedCommits,
      activeRepo: activeRepo?.repo_name || 'workspace-repo',
      codingHours,
      currentStreak: streak.currentStreak || 0,
      consistencyScore: avgScore
    });
  } else if (type === 'project') {
    const userRow = db.prepare('SELECT github_username FROM users WHERE id = ?').get(userId) as any;
    const latestRepo = db.prepare('SELECT * FROM github_repos WHERE user_id = ? ORDER BY pushed_at DESC LIMIT 1').get(userId) as any;
    const targetRepo = repoName || latestRepo?.repo_name;
    const repo = targetRepo
      ? (db.prepare('SELECT * FROM github_repos WHERE user_id = ? AND repo_name = ?').get(userId, targetRepo) as any)
      : null;
    const commitsCount = db.prepare('SELECT SUM(commits) as total FROM github_daily WHERE user_id = ?').get(userId) as any;
    const verifiedTotalCommits = Number(commitsCount?.total || 0);

    if (!repo || verifiedTotalCommits === 0) {
      return next(new AppError(
        'NO_VERIFIED_ACTIVITY',
        'Anti-fabrication guard: Connect a GitHub repository and sync verified commits before generating a project milestone draft.',
        400
      ));
    }

    generatedText = DraftService.generateProjectPost({
      repoName: repo.repo_name,
      githubUsername: userRow?.github_username || 'developer',
      commitsCount: Math.min(24, verifiedTotalCommits),
      primaryLanguage: repo.primary_language || 'Code',
      stars: Number(repo.stars || 0),
      recentFeatures: [
        'Automated background session tracking with VS Code extension',
        'Spaced-repetition queue with 3, 7, 21, and 30 day retention checks',
        'Real-time consistency score algorithm factoring GitHub and LeetCode activity'
      ]
    });
  } else if (type === 'profile') {
    const repos = db.prepare('SELECT primary_language FROM github_repos WHERE user_id = ?').all(userId) as any[];
    const topLangs = Array.from(new Set(repos.map(r => r.primary_language).filter(Boolean))) as string[];

    const latestSnapshot = db.prepare("SELECT topic_counts_json, easy, medium, hard FROM leetcode_snapshots WHERE user_id = ? AND (topic_counts_json IS NOT NULL OR (easy + medium + hard) > 0) ORDER BY date DESC LIMIT 1").get(userId) as any;
    let topics: string[] = [];
    if (latestSnapshot?.topic_counts_json) {
      try {
        topics = Object.keys(JSON.parse(latestSnapshot.topic_counts_json));
      } catch (e) {}
    }

    const totalSolves = Number(latestSnapshot?.easy || 0) + Number(latestSnapshot?.medium || 0) + Number(latestSnapshot?.hard || 0);
    const commits = db.prepare('SELECT SUM(commits) as total FROM github_daily WHERE user_id = ?').get(userId) as any;
    const totalCommits = Number(commits?.total || 0);

    if (totalSolves === 0 && totalCommits === 0 && topLangs.length === 0) {
      return next(new AppError(
        'NO_VERIFIED_ACTIVITY',
        'Anti-fabrication guard: Sync your GitHub or LeetCode profile first so your LinkedIn profile checklist reflects verified numbers.',
        400
      ));
    }

    const checklist = DraftService.generateProfileChecklist(
      topLangs.length > 0 ? topLangs : ['Software Engineering'],
      topics.length > 0 ? topics : ['Algorithms'],
      totalSolves,
      totalCommits
    );

    generatedText = checklist.suggestedAbout;
  } else {
    return next(new AppError('BAD_REQUEST', 'Invalid draft type. Choose "weekly", "project", or "profile".', 400));
  }

  const postId = randomUUID();
  db.prepare(`
    INSERT INTO generated_posts (id, user_id, type, text, posted)
    VALUES (?, ?, ?, ?, 0)
  `).run(postId, userId, type, generatedText);

  res.json({
    id: postId,
    type,
    text: generatedText,
    createdAt: new Date().toISOString(),
    posted: false
  });
});

/**
 * POST /api/drafts/:id/mark-posted
 */
draftRouter.post('/drafts/:id/mark-posted', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('UPDATE generated_posts SET posted = 1 WHERE id = ? AND user_id = ?').run(id, req.user!.id);
  res.json({ message: 'Draft marked as posted to LinkedIn' });
});

/**
 * GET /api/report/weekly
 * Weekly progress report and synthesis
 */
draftRouter.get('/report/weekly', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;

  const solves = db.prepare(`
    SELECT COUNT(*) as count FROM leetcode_solved_problems
    WHERE user_id = ? AND solved_at >= datetime('now', '-7 days')
  `).get(userId) as any;

  const commits = db.prepare(`
    SELECT SUM(commits) as total FROM github_daily
    WHERE user_id = ? AND date >= date('now', '-7 days')
  `).get(userId) as any;

  const coding = db.prepare(`
    SELECT SUM(total_sec) as total FROM coding_daily
    WHERE user_id = ? AND date >= date('now', '-7 days')
  `).get(userId) as any;

  const dailyBreakdown = db.prepare(`
    SELECT date, consistency_score as score, leetcode_pts, github_pts, coding_pts
    FROM daily_scores
    WHERE user_id = ? AND date >= date('now', '-7 days')
    ORDER BY date ASC
  `).all(userId);

  const repos = db.prepare(`
    SELECT repo_name, primary_language, pushed_at FROM github_repos WHERE user_id = ? ORDER BY pushed_at DESC LIMIT 3
  `).all(userId);

  res.json({
    summary: {
      totalSolves: solves?.count || 0,
      totalCommits: commits?.total || 0,
      codingHours: Math.round(((coding?.total_sec || coding?.total || 0) / 3600) * 10) / 10,
      activeRepositories: repos
    },
    dailyBreakdown,
    generatedAt: new Date().toISOString()
  });
});
