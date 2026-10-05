"use client";
import { useActionState, useState } from "react";
import { moderateVendor } from "@/lib/admin/actions";

export function ModerationForm({ id, status }: { id: string; status: string }) {
  const [state, submit, pending] = useActionState(moderateVendor, { message: "" });
  const [decision, choose] = useState(status === "published" ? "reject" : "approve");
  return <form action={submit} aria-busy={pending} className="mt-5 space-y-3">
    <input type="hidden" name="id" value={id} /><input type="hidden" name="expected_status" value={status} />
    <fieldset disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
      <label className="text-sm">Decision<select name="decision" value={decision} onChange={event => choose(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-hutan/25 bg-white px-3">
        {status !== "published" && <option value="approve">Approve</option>}{status !== "suspended" && <option value="reject">Reject</option>}
      </select></label>
      <label className="text-sm">Reason {decision === "reject" ? "(required)" : "(optional)"}<textarea name="reason" required={decision === "reject"} minLength={decision === "reject" ? 3 : undefined} maxLength={1000} rows={2} className="mt-2 min-h-12 w-full rounded-xl border border-hutan/25 bg-white px-3 py-2" /></label>
      <button disabled={pending} className="min-h-12 rounded-xl bg-hutan px-5 font-semibold text-white hover:bg-[#28523e] disabled:opacity-60">{pending ? "Saving…" : "Save decision"}</button>
    </fieldset>
    {state.message && <p role={state.ok ? "status" : "alert"} className="text-sm leading-6">{state.message}</p>}
  </form>;
}
