export interface HandleValidationResult {
  valid: boolean;
  value: string;
  error?: string;
}

export interface LoginFormValidationResult {
  valid: boolean;
  githubError?: string;
  leetcodeError?: string;
  emailError?: string;
  formError?: string;
}

// GitHub username spec: 1-39 chars, alphanumeric or single hyphens, cannot begin/end with hyphen or repeat hyphens
const GITHUB_ID_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
// LeetCode handle spec: 3-30 chars, alphanumeric + hyphen/underscore, must start & end with alphanumeric
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
  const value = (raw || '').trim();
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

export function validateLoginForm(fields: {
  githubUsername: string;
  leetcodeUsername: string;
  email?: string;
}): LoginFormValidationResult {
  const gh = (fields.githubUsername || '').trim();
  const lc = (fields.leetcodeUsername || '').trim();
  const email = (fields.email || '').trim();

  if (!gh && !lc) {
    return {
      valid: false,
      formError: 'Please write a correct GitHub ID or LeetCode ID to open the workspace.'
    };
  }

  let githubError: string | undefined;
  let leetcodeError: string | undefined;
  let emailError: string | undefined;

  if (gh) {
    const res = validateGitHubId(gh);
    if (!res.valid) githubError = res.error;
  }

  if (lc) {
    const res = validateLeetCodeId(lc);
    if (!res.valid) leetcodeError = res.error;
  }

  if (email) {
    const res = validateOptionalEmail(email);
    if (!res.valid) emailError = res.error;
  }

  const firstError = githubError || leetcodeError || emailError;
  if (firstError) {
    return {
      valid: false,
      githubError,
      leetcodeError,
      emailError,
      formError: firstError
    };
  }

  return { valid: true };
}
