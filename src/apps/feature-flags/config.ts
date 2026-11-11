// App-level settings for the feature-flag admin.

/** Lowercase snake_case: starts with a letter; letters, digits and single underscores. */
export const FLAG_KEY_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
export const FLAG_KEY_MAX_LENGTH = 64;

export const OWNER_TEAMS = ["checkout", "growth", "mobile", "onboarding", "payments", "platform", "risk", "search"] as const;

/** Slack channel for approved prod flag changes. */
export const RELEASES_CHANNEL = "#releases";
