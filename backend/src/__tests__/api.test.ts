import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app';
import { runSeed } from '../db/seed';

let authToken = '';
const apiKey = 'devprof_seed_secret_key_123';

before(() => {
  runSeed();
});

describe('DevProfile Backend Integration Tests (Section 4 & 11)', () => {
  it('POST /api/auth/demo-login authenticates and returns JWT', async () => {
    const res = await request(app).post('/api/auth/demo-login');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.name, 'ABC');
    authToken = res.body.token;
  });

  it('GET /api/me returns user profile and connected sources', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.githubUsername, 'abcdev');
    assert.strictEqual(res.body.connectedSources.github.connected, true);
    assert.strictEqual(res.body.connectedSources.leetcode.connected, true);
  });

  it('POST /api/sync dynamically updates demo account metrics', async () => {
    const beforeRes = await request(app)
      .get('/api/dashboard?range=30d')
      .set('Authorization', `Bearer ${authToken}`);
    const beforeCommits = beforeRes.body.today.commitsCount;
    const beforeSolves = beforeRes.body.today.solvesCount;
    const beforeCoding = beforeRes.body.today.codingMinutes;

    const syncRes = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(syncRes.status, 200);
    assert.strictEqual(syncRes.body.results.github.success, true);
    assert.strictEqual(syncRes.body.results.leetcode.syncStatus, 'success');

    const afterRes = await request(app)
      .get('/api/dashboard?range=30d')
      .set('Authorization', `Bearer ${authToken}`);
    assert.ok(afterRes.body.today.commitsCount > beforeCommits);
    assert.ok(afterRes.body.today.solvesCount > beforeSolves);
    assert.ok(afterRes.body.today.codingMinutes > beforeCoding);
  });

  it('POST /api/sessions accepts VS Code session batches with extension API key', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        sessions: [
          {
            project: 'devprofile',
            repoUrl: 'https://github.com/abcdev/devprofile',
            language: 'TypeScript',
            file: 'src/components/Planner.tsx',
            start: new Date().toISOString(),
            durationSec: 1800
          }
        ]
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('Successfully ingested'));
  });

  it('POST /api/problem-times records timer and schedules review on struggle', async () => {
    const res = await request(app)
      .post('/api/problem-times')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        problem: 'word-break',
        durationSec: 2500,
        difficultyFeeling: 'Struggled'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.spacedRepetitionScheduled, true);
  });

  it('GET /api/dashboard returns merged metrics, heatmap, and goals', async () => {
    const res = await request(app)
      .get('/api/dashboard?range=30d')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.today);
    assert.ok(res.body.streak.currentStreak >= 0);
    assert.ok(res.body.heatmap.length > 0);
    assert.ok(res.body.recentRepositories.length > 0);
  });

  it('GET /api/insights returns weakness analysis and balance status', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.weaknesses.weakestTopics);
    assert.ok(res.body.balance.message);
    assert.ok(res.body.interviewReadiness.overallScore > 0);
  });

  it('GET /api/reviews/today and POST /api/reviews/:id/done handles spaced repetition', async () => {
    const listRes = await request(app)
      .get('/api/reviews/today')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.dueToday.length > 0);

    const firstReview = listRes.body.dueToday[0];
    const doneRes = await request(app)
      .post(`/api/reviews/${firstReview.id}/done`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ passed: true });

    assert.strictEqual(doneRes.status, 200);
    assert.ok(doneRes.body.nextInterval !== undefined);
  });

  it('GET /api/plan/today returns 3 tasks with explicit reasons', async () => {
    const res = await request(app)
      .get('/api/plan/today')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.tasks.length, 3);
    assert.strictEqual(res.body.tasks[0].type, 'practice');
    assert.strictEqual(res.body.tasks[1].type, 'project');
    assert.ok(res.body.tasks[0].reason);
  });

  it('POST /api/drafts generates verified LinkedIn progress post without fabrication', async () => {
    const res = await request(app)
      .post('/api/drafts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'weekly' });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.text.includes('Weekly Dev & DSA Progress Update'));
    assert.ok(/devprofile|algo-visualizer|campus-connect/i.test(res.body.text));
  });

  it('GET /api/portfolio/:publicSlug serves public portfolio without auth', async () => {
    const res = await request(app).get('/api/portfolio/abc');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.name, 'ABC');
    assert.ok(res.body.verifiedStats.totalSolves > 0);
  });

  it('GET /api/export downloads all user records as JSON', async () => {
    const res = await request(app)
      .get('/api/export')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.name, 'ABC');
    assert.ok(res.body.githubDaily.length > 0);
    assert.ok(res.body.leetcodeSnapshots.length > 0);
  });

  it('POST /api/auth/register-or-login rejects invalid GitHub ID and LeetCode ID formats', async () => {
    const missingBoth = await request(app)
      .post('/api/auth/register-or-login')
      .send({ email: 'onlyemail@example.com' });
    assert.strictEqual(missingBoth.status, 400);
    assert.match(missingBoth.body.error.message, /GitHub ID or LeetCode ID/i);

    const badGithub = await request(app)
      .post('/api/auth/register-or-login')
      .send({ githubUsername: 'bad_user!' });
    assert.strictEqual(badGithub.status, 400);
    assert.match(badGithub.body.error.message, /correct GitHub ID/i);

    const badLeetcode = await request(app)
      .post('/api/auth/register-or-login')
      .send({ githubUsername: 'validuser', leetcodeUsername: 'x' });
    assert.strictEqual(badLeetcode.status, 400);
    assert.match(badLeetcode.body.error.message, /correct LeetCode ID/i);
  });

  it('POST /api/connect/github and /api/connect/leetcode reject malformed IDs', async () => {
    const badGh = await request(app)
      .post('/api/connect/github')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ username: '@invalid' });
    assert.strictEqual(badGh.status, 400);
    assert.match(badGh.body.error.message, /correct GitHub ID/i);

    const badLc = await request(app)
      .post('/api/connect/leetcode')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ username: 'ab' });
    assert.strictEqual(badLc.status, 400);
    assert.match(badLc.body.error.message, /correct LeetCode ID/i);
  });

  it('TC-22: POST /api/sessions rejects invalid extension API key with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', 'Bearer devprof_invalid_wrong_key')
      .send({
        sessions: [{ project: 'test', language: 'TypeScript', durationSec: 120 }]
      });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_API_KEY');
  });

  it('TC-21: POST /api/sync enforces 120-second cooldown with HTTP 429 on non-demo user', async () => {
    const { db } = await import('../db/database');
    const jwt = (await import('jsonwebtoken')).default;
    const { config } = await import('../config');
    const { hashApiKey } = await import('../services/cryptoService');

    const cooldownUserId = 'usr_cooldown_test';
    db.prepare(`
      INSERT INTO users (id, name, email, api_key_hash, public_slug, is_public)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(cooldownUserId, 'Cooldown Tester', 'cooldown@example.com', hashApiKey('devprof_cd_key'), 'cooldown-tester');

    const cdToken = jwt.sign({ id: cooldownUserId, email: 'cooldown@example.com', name: 'Cooldown Tester' }, config.jwtSecret, { expiresIn: '1h' });

    const first = await request(app).post('/api/sync').set('Authorization', `Bearer ${cdToken}`);
    assert.strictEqual(first.status, 200);

    const second = await request(app).post('/api/sync').set('Authorization', `Bearer ${cdToken}`);
    assert.strictEqual(second.status, 429);
    assert.strictEqual(second.body.error.code, 'RATE_LIMITED');
  });

  it('Section 5.3.4: Anti-fabrication guard blocks empty-week LinkedIn draft with HTTP 400', async () => {
    const { db } = await import('../db/database');
    const jwt = (await import('jsonwebtoken')).default;
    const { config } = await import('../config');
    const { hashApiKey } = await import('../services/cryptoService');

    const emptyUserId = 'usr_empty_draft_test';
    db.prepare(`
      INSERT INTO users (id, name, email, api_key_hash, public_slug, is_public)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(emptyUserId, 'Empty Tester', 'empty@example.com', hashApiKey('devprof_empty_key'), 'empty-tester');

    const emptyToken = jwt.sign({ id: emptyUserId, email: 'empty@example.com', name: 'Empty Tester' }, config.jwtSecret, { expiresIn: '1h' });

    const draftRes = await request(app)
      .post('/api/drafts')
      .set('Authorization', `Bearer ${emptyToken}`)
      .send({ type: 'weekly' });
    assert.strictEqual(draftRes.status, 400);
    assert.strictEqual(draftRes.body.error.code, 'NO_VERIFIED_ACTIVITY');
  });

  it('Section 5.3.4 & 5.3.5: Toggling privacy to Private makes /api/portfolio/:slug return 404, and DELETE /api/account purges data', async () => {
    const { db } = await import('../db/database');
    const jwt = (await import('jsonwebtoken')).default;
    const { config } = await import('../config');
    const { hashApiKey } = await import('../services/cryptoService');

    const privUserId = 'usr_privacy_test';
    db.prepare(`
      INSERT INTO users (id, name, email, api_key_hash, public_slug, is_public)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(privUserId, 'Privacy Tester', 'privacy@example.com', hashApiKey('devprof_priv_key'), 'privacy-tester');

    const privToken = jwt.sign({ id: privUserId, email: 'privacy@example.com', name: 'Privacy Tester' }, config.jwtSecret, { expiresIn: '1h' });

    const pubRes = await request(app).get('/api/portfolio/privacy-tester');
    assert.strictEqual(pubRes.status, 200);

    const toggleRes = await request(app)
      .patch('/api/account/privacy')
      .set('Authorization', `Bearer ${privToken}`)
      .send({ isPublic: false });
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.body.isPublic, false);

    const hiddenRes = await request(app).get('/api/portfolio/privacy-tester');
    assert.strictEqual(hiddenRes.status, 404);

    const delRes = await request(app)
      .delete('/api/account')
      .set('Authorization', `Bearer ${privToken}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(db.prepare('SELECT id FROM users WHERE id = ?').get(privUserId), undefined);
  });

  it('Section 5.3.3 & 5.4: Supports 21d -> 30d review progression, problem notes, goals, plan task toggle, and API key regeneration', async () => {
    const { db } = await import('../db/database');
    const { randomUUID } = await import('crypto');
    const today = new Date().toISOString().split('T')[0];
    const r21Id = randomUUID();

    db.prepare(`
      INSERT INTO reviews (id, user_id, problem_slug, due_date, interval_days, done_at)
      VALUES (?, 'usr_abc_001', 'trapping-rain-water', ?, 21, NULL)
    `).run(r21Id, today);

    const done21Res = await request(app)
      .post(`/api/reviews/${r21Id}/done`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ passed: true });
    assert.strictEqual(done21Res.status, 200);
    assert.strictEqual(done21Res.body.nextInterval, 30);

    const noteRes = await request(app)
      .post('/api/notes/trapping-rain-water')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ noteText: 'Maintain leftMax and rightMax', patternTag: 'Two Pointers' });
    assert.strictEqual(noteRes.status, 200);

    const goalRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'daily_leetcode', targetValue: 3, period: 'daily' });
    assert.strictEqual(goalRes.status, 200);

    const toggleRes = await request(app)
      .post('/api/plan/task/0/toggle')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(toggleRes.status, 200);
    assert.ok(toggleRes.body.completedIndices.includes(0));

    const regenRes = await request(app)
      .post('/api/apikey/regenerate')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(regenRes.status, 200);
    assert.ok(regenRes.body.apiKey.startsWith('devprof_'));

    // Old key must now be revoked (401) and new key accepted (200)
    const oldKeyRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ sessions: [{ project: 'devprofile', language: 'TypeScript', durationSec: 60 }] });
    assert.strictEqual(oldKeyRes.status, 401);

    const newKeyRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${regenRes.body.apiKey}`)
      .send({ sessions: [{ project: 'devprofile', language: 'TypeScript', durationSec: 60 }] });
    assert.strictEqual(newKeyRes.status, 200);
  });

  it('Scenario A: LeetCodeSync handles upstream failures gracefully and logs failure in sync_logs', async () => {
    const { LeetCodeSync, OfficialGraphQLAdapter } = await import('../sync/leetcodeSync');
    const { db } = await import('../db/database');
    const { hashApiKey } = await import('../services/cryptoService');

    const failUserId = 'usr_lc_fail_test';
    db.prepare(`
      INSERT INTO users (id, name, email, leetcode_username, api_key_hash, public_slug, is_public)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(failUserId, 'LC Fail Tester', 'lcfail@example.com', 'nonexistent_lc_test_xyz', hashApiKey('devprof_lcfail'), 'lc-fail-tester');

    LeetCodeSync.setAdapter({
      async fetch() {
        throw new Error('Simulated LeetCode upstream timeout');
      }
    });

    const result = await LeetCodeSync.syncUser(failUserId);
    assert.strictEqual(result.syncStatus, 'failed');

    const log = db.prepare("SELECT status, error FROM sync_logs WHERE user_id = ? AND source = 'leetcode' ORDER BY run_at DESC LIMIT 1").get(failUserId) as any;
    assert.strictEqual(log.status, 'failed');
    assert.match(log.error, /timeout/i);

    LeetCodeSync.setAdapter(new OfficialGraphQLAdapter());
  });

  it('Real LeetCode ID sync shows exact lifetime totals and calendar solves without fabricating Two Sum', async () => {
    const { LeetCodeSync, OfficialGraphQLAdapter } = await import('../sync/leetcodeSync');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayUtcSec = Math.floor(Date.UTC(
      Number(todayStr.slice(0, 4)),
      Number(todayStr.slice(5, 7)) - 1,
      Number(todayStr.slice(8, 10))
    ) / 1000);

    LeetCodeSync.setAdapter({
      async fetch(username: string) {
        if (username === 'real_user_one') {
          return {
            username,
            totalSolved: 253,
            easy: 60,
            medium: 141,
            hard: 52,
            topicCounts: { Arrays: { total: 50, easy: 15, medium: 25, hard: 10 } },
            calendar: { [String(todayUtcSec)]: 3 },
            recentSubmissions: [],
            syncStatus: 'success'
          };
        }
        return {
          username,
          totalSolved: 12,
          easy: 7,
          medium: 4,
          hard: 1,
          topicCounts: { Graphs: { total: 4, easy: 1, medium: 2, hard: 1 } },
          calendar: {},
          recentSubmissions: [{
            title: 'Course Schedule',
            slug: 'course-schedule',
            timestamp: new Date().toISOString(),
            difficulty: 'Medium',
            topicTags: ['Graphs']
          }],
          syncStatus: 'success'
        };
      }
    });

    const regRes = await request(app)
      .post('/api/auth/register-or-login')
      .send({ name: 'Real User', leetcodeUsername: 'real_user_one' });
    assert.strictEqual(regRes.status, 200);
    const token = regRes.body.token;

    const dash1 = await request(app).get('/api/dashboard?range=30d').set('Authorization', `Bearer ${token}`);
    assert.strictEqual(dash1.status, 200);
    assert.strictEqual(dash1.body.leetcodeTotals.totalSolved, 253);
    assert.strictEqual(dash1.body.leetcodeTotals.easy, 60);
    assert.strictEqual(dash1.body.leetcodeTotals.medium, 141);
    assert.strictEqual(dash1.body.leetcodeTotals.hard, 52);
    assert.strictEqual(dash1.body.today.solvesCount, 3);
    assert.strictEqual(dash1.body.recentProblems.length, 0); // Must NOT fabricate Two Sum

    // Switch LeetCode ID -> old 253 snapshot must be cleared and replaced with 12
    const switchRes = await request(app)
      .post('/api/connect/leetcode')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'real_user_two' });
    assert.strictEqual(switchRes.status, 200);

    const dash2 = await request(app).get('/api/dashboard?range=30d').set('Authorization', `Bearer ${token}`);
    assert.strictEqual(dash2.status, 200);
    assert.strictEqual(dash2.body.leetcodeTotals.totalSolved, 12);
    assert.strictEqual(dash2.body.today.solvesCount, 1);
    assert.strictEqual(dash2.body.recentProblems[0].slug, 'course-schedule');

    LeetCodeSync.setAdapter(new OfficialGraphQLAdapter());
  });

  it('GET /download-extension serves prebuilt VS Code VSIX attachment', async () => {
    const res = await request(app)
      .get('/download-extension')
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    assert.strictEqual(res.status, 200);
    assert.ok(String(res.headers['content-disposition'] || '').includes('devprofile-vscode-1.0.0.vsix'));
    assert.ok(Buffer.isBuffer(res.body) && res.body.length > 5000);
    assert.strictEqual(res.body.subarray(0, 2).toString('utf8'), 'PK');
  });

  it('GET /api/me transitions VS Code status from false (Ready) to true (Synced) after first session upload', async () => {
    const regRes = await request(app)
      .post('/api/auth/register-or-login')
      .send({ name: 'VSCode Fresh User', githubUsername: 'octocat' });
    assert.strictEqual(regRes.status, 200);
    const { token, apiKey } = regRes.body;
    assert.ok(apiKey);

    const meBefore = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
    assert.strictEqual(meBefore.status, 200);
    assert.strictEqual(meBefore.body.connectedSources.vscode.connected, false);
    assert.strictEqual(meBefore.body.connectedSources.vscode.sessionCount, 0);

    const sessRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        sessions: [{ project: 'HotelPro_MERN_Project', language: 'javascript', durationSec: 300, start: new Date().toISOString() }]
      });
    assert.strictEqual(sessRes.status, 200);

    const meAfter = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
    assert.strictEqual(meAfter.status, 200);
    assert.strictEqual(meAfter.body.connectedSources.vscode.connected, true);
    assert.strictEqual(meAfter.body.connectedSources.vscode.sessionCount, 1);
  });
});

