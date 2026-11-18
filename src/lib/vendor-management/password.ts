export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// HTML patterns use Unicode-aware matching. Length is enforced separately by
// minLength/maxLength, matching JavaScript's string-length checks on the server.
export const REGISTRATION_PASSWORD_PATTERN = String.raw`(?=[\s\S]*\p{Lu})(?=[\s\S]*[0-9])(?=[\s\S]*[^\p{L}\p{M}\p{N}\s])[\s\S]*`;

export function passwordRequirements(password: string) {
  return [
    { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: "uppercase", label: "At least 1 uppercase letter", met: /\p{Lu}/u.test(password) },
    { id: "number", label: "At least 1 number (0–9)", met: /[0-9]/.test(password) },
    { id: "special", label: "At least 1 special character (e.g. ! @ #)", met: /[^\p{L}\p{M}\p{N}\s]/u.test(password) },
  ];
}

export function isValidRegistrationPassword(password: string) {
  return password.length <= PASSWORD_MAX_LENGTH && passwordRequirements(password).every((requirement) => requirement.met);
}
