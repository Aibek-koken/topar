// Maps raw Supabase/GoTrue error messages to i18n keys so users never see
// raw English API strings (error-clarity: state the cause + how to fix).
const RULES: { pattern: RegExp; key: string }[] = [
  { pattern: /token has expired|otp_expired|invalid otp/i, key: 'errors.invalidCode' },
  { pattern: /error sending|sms_send_failed|provider/i, key: 'errors.smsFailed' },
  { pattern: /rate limit|too many|over_sms_send_rate/i, key: 'errors.rateLimit' },
  { pattern: /validate phone|invalid.*phone|phone.*invalid/i, key: 'errors.invalidPhone' },
  { pattern: /invalid login credentials/i, key: 'errors.invalidCredentials' },
  { pattern: /already registered|already been registered|already exists/i, key: 'errors.emailTaken' },
  { pattern: /network|failed to fetch|fetch failed|timeout/i, key: 'errors.network' },
];

export function authErrorKey(raw: string): string {
  const rule = RULES.find((r) => r.pattern.test(raw));
  return rule ? rule.key : 'common.error';
}
