export const vendorStatuses = ["all", "pending", "published", "suspended", "draft", "archived"] as const;
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
