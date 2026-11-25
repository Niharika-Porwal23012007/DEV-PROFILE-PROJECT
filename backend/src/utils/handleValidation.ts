export interface HandleValidationResult {
  valid: boolean;
  value: string;
  error?: string;
}

const GITHUB_ID_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const LEETCODE_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,28}[a-zA-Z0-9]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateGitHubId(raw: string): HandleValidationResult {
  const value = (raw || '').trim();
  if (!value) {
    return {
      valid: false,
      value,
      error: 'Please write a GitHub ID.'
    };
  }
  if (!GITHUB_ID_REGEX.test(value)) {
    return {
      valid: false,
      value,
      error: 'Write a correct GitHub ID (1-39 letters, numbers, or single hyphens; no spaces, "@", underscores, or leading/trailing hyphens).'
    };
  }
  return { valid: true, value };
}

export function validateLeetCodeId(raw: string): HandleValidationResult {
  const value = (raw || '').trim();
  if (!value) {
    return {
      valid: false,
      value,
      error: 'Please write a LeetCode ID.'
    };
  }
  if (!LEETCODE_ID_REGEX.test(value)) {
    return {
      valid: false,
      value,
      error: 'Write a correct LeetCode ID (3-30 letters, numbers, "-" or "_"; must start and end with a letter or number).'
    };
  }
  return { valid: true, value };
}

export function validateOptionalEmail(raw?: string): HandleValidationResult {
  const value = (raw || '').trim().toLowerCase();
  if (!value) {
    return { valid: true, value: '' };
  }
  if (!EMAIL_REGEX.test(value)) {
    return {
      valid: false,
      value,
      error: 'Write a valid email address (for example: name@example.com).'
    };
  }
  return { valid: true, value };
}
