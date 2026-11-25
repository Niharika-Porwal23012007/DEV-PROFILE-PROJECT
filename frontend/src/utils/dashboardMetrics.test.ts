import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getGoalProgress,
  getConsistencyStatus,
  getHeatmapCellLevel,
  formatSyncTimestamp
} from './dashboardMetrics';

test('getGoalProgress calculates completion and remaining units accurately', () => {
  const half = getGoalProgress(1, 2, 'problems');
  assert.equal(half.pct, 50);
  assert.equal(half.completed, false);
  assert.equal(half.remainingLabel, '1 problem left');

  const done = getGoalProgress(5, 3, 'commits');
  assert.equal(done.pct, 100);
  assert.equal(done.completed, true);
  assert.equal(done.remainingLabel, 'Target reached');
});

test('getConsistencyStatus maps score thresholds to correct labels and colors', () => {
  assert.equal(getConsistencyStatus(88).label, 'Optimal Pace');
  assert.equal(getConsistencyStatus(65).label, 'Strong Progress');
  assert.equal(getConsistencyStatus(38).label, 'Streak Maintained');
  assert.equal(getConsistencyStatus(15).label, 'Below Threshold');
});

test('getHeatmapCellLevel filters metrics by selected activity source', () => {
  const sample = {
    date: '2026-11-20',
    commits: 4,
    solves: 1,
    codingMinutes: 90,
    score: 62,
    intensity: 2
  };

  assert.deepEqual(getHeatmapCellLevel(sample, 'all'), { level: 3, primaryValue: '62/100' });
  assert.deepEqual(getHeatmapCellLevel(sample, 'leetcode'), { level: 1, primaryValue: '1 solve' });
  assert.deepEqual(getHeatmapCellLevel(sample, 'commits'), { level: 3, primaryValue: '4 commits' });
  assert.deepEqual(getHeatmapCellLevel(sample, 'coding'), { level: 3, primaryValue: '90m active' });
});

test('formatSyncTimestamp handles missing and recent timestamps', () => {
  assert.equal(formatSyncTimestamp(null), 'Not synced yet');
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  assert.equal(formatSyncTimestamp(tenMinsAgo), 'Synced 10m ago');
});
