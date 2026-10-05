export const vendorStatuses = ["all", "pending", "published", "suspended", "draft", "archived"] as const;

const captchaToken = (form: FormData) => {
  const token = String(form.get("captcha_token") || "");
  if (!token || token.length > 4096) throw new Error("Complete the security check and try again.");
  return token;
};

export function adminLoginInput(form: FormData) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || email.length > 254 || !email.includes("@") || !password || password.length > 128) throw new Error("Check your email and password.");
  return { email, password, captchaToken: captchaToken(form) };
}

export function adminRecoveryInput(form: FormData) {
  const email = String(form.get("email") || "").trim();
  const token = captchaToken(form);
  return { email: email && email.length <= 254 && email.includes("@") ? email : null, captchaToken: token };
}

export function adminPasswordInput(form: FormData) {
  const password = String(form.get("password") || "");
  if (password.length < 12 || password.length > 128) throw new Error("Use a password between 12 and 128 characters.");
  if (password !== String(form.get("confirm_password") || "")) throw new Error("The passwords do not match.");
  return password;
}

export function moderationInput(form: FormData) {
  const id = String(form.get("id") || "");
  const decision = String(form.get("decision") || "");
  const expected = String(form.get("expected_status") || "");
  const reason = String(form.get("reason") || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid vendor. Refresh and retry.");
  if (decision !== "approve" && decision !== "reject") throw new Error("Choose approve or reject.");
  if (!["pending", "published", "suspended"].includes(expected)) throw new Error("This vendor cannot be reviewed.");
  if (reason.length > 1000 || (decision === "reject" && reason.length < 3)) throw new Error("Give a rejection reason between 3 and 1,000 characters.");
  return { p_id: id, p_decision: decision, p_expected_status: expected, p_reason: reason };
}
