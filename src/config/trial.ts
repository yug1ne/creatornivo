export const TRIAL_DURATION_HOURS = 72;
export const TRIAL_DURATION_MS = TRIAL_DURATION_HOURS * 60 * 60 * 1000;
export const TRIAL_GENERATION_LIMIT = 30;
export const TRIAL_INVITE_TOKEN_BYTES = 32;
export const TRIAL_INVITE_COOKIE_NAME = "creatornivo_trial_invite";
export const TRIAL_INVITE_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

export function getTrialPeriodKey(trialStartedAt: Date): string {
  return `trial:${trialStartedAt.toISOString()}`;
}
