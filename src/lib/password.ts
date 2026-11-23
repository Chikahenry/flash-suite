/** Rules for a new password. The checks run in the browser to guide the person; the Bank enforces them again. */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "An uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "A number (0-9)", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "A special character (e.g. ! @ # $ %)", test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
] as const;

/** The first rule a password breaks, as a sentence, or null when it passes them all. */
export const passwordProblem = (p: string): string | null => {
  const broken = PASSWORD_RULES.find((r) => !r.test(p));
  return broken ? `The new password needs: ${broken.label.toLowerCase()}.` : null;
};
