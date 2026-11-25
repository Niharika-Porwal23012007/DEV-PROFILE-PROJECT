import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateGitHubId,
  validateLeetCodeId,
  validateOptionalEmail,
  validateLoginForm
} from './handleValidation';

test('validateGitHubId accepts valid real-world GitHub handles', () => {
  assert.equal(validateGitHubId('abcdev').valid, true);
  assert.equal(validateGitHubId('torvalds').valid, true);
  assert.equal(validateGitHubId('gaearon-dev-99').valid, true);
  assert.equal(validateGitHubId('a').valid, true);
  assert.equal(validateGitHubId('a'.repeat(39)).valid, true);
});

test('validateGitHubId rejects invalid formats clearly', () => {
  assert.equal(validateGitHubId('').valid, false);
  assert.equal(validateGitHubId('-leading').valid, false);
  assert.equal(validateGitHubId('trailing-').valid, false);
  assert.equal(validateGitHubId('double--hyphen').valid, false);
  assert.equal(validateGitHubId('has_underscore').valid, false);
  assert.equal(validateGitHubId('@withatsign').valid, false);
  assert.equal(validateGitHubId('has space').valid, false);
  assert.equal(validateGitHubId('https://github.com/abc').valid, false);
  assert.equal(validateGitHubId('a'.repeat(40)).valid, false);
  assert.match(validateGitHubId('bad_id').error || '', /correct GitHub ID/i);
});

test('validateLeetCodeId accepts valid real-world LeetCode handles', () => {
  assert.equal(validateLeetCodeId('abcdev').valid, true);
  assert.equal(validateLeetCodeId('neal_wu').valid, true);
  assert.equal(validateLeetCodeId('lee-215').valid, true);
  assert.equal(validateLeetCodeId('abc').valid, true);
  assert.equal(validateLeetCodeId('a'.repeat(30)).valid, true);
});

test('validateLeetCodeId rejects invalid formats clearly', () => {
  assert.equal(validateLeetCodeId('').valid, false);
  assert.equal(validateLeetCodeId('ab').valid, false);
  assert.equal(validateLeetCodeId('_leading').valid, false);
  assert.equal(validateLeetCodeId('trailing_').valid, false);
  assert.equal(validateLeetCodeId('-leading').valid, false);
  assert.equal(validateLeetCodeId('@handle').valid, false);
  assert.equal(validateLeetCodeId('bad space').valid, false);
  assert.equal(validateLeetCodeId('bad.dot').valid, false);
  assert.equal(validateLeetCodeId('a'.repeat(31)).valid, false);
  assert.match(validateLeetCodeId('a').error || '', /correct LeetCode ID/i);
});

test('validateOptionalEmail allows empty or valid emails and rejects malformed ones', () => {
  assert.equal(validateOptionalEmail('').valid, true);
  assert.equal(validateOptionalEmail('abc@devprofile.io').valid, true);
  assert.equal(validateOptionalEmail('not-an-email').valid, false);
});

test('validateLoginForm requires at least one valid ID and rejects wrong formats', () => {
  const emptyRes = validateLoginForm({ githubUsername: '', leetcodeUsername: '', email: 'abc@devprofile.io' });
  assert.equal(emptyRes.valid, false);
  assert.match(emptyRes.formError || '', /GitHub ID or LeetCode ID/i);

  const badBoth = validateLoginForm({ githubUsername: 'bad_gh', leetcodeUsername: 'x', email: 'bad' });
  assert.equal(badBoth.valid, false);
  assert.ok(badBoth.githubError);
  assert.ok(badBoth.leetcodeError);
  assert.ok(badBoth.emailError);

  const validSingleGh = validateLoginForm({ githubUsername: 'torvalds', leetcodeUsername: '' });
  assert.equal(validSingleGh.valid, true);

  const validSingleLc = validateLoginForm({ githubUsername: '', leetcodeUsername: 'neal_wu' });
  assert.equal(validSingleLc.valid, true);

  const validBoth = validateLoginForm({ githubUsername: 'abcdev', leetcodeUsername: 'abcdev', email: 'abc@devprofile.io' });
  assert.equal(validBoth.valid, true);
});
