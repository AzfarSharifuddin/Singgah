"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionResult } from "@/lib/vendor-management/actions";

type AuthAction = (state: ActionResult, form: FormData) => Promise<ActionResult>;

const input = "mt-2 min-h-12 w-full rounded-xl border border-hutan/25 bg-white px-3 py-2 text-base";

export function AdminAuthForm({ action, mode, siteKey }: { action: AuthAction; mode: "login" | "recovery"; siteKey: string }) {
  const [state, submit, pending] = useActionState(action, { message: "" });
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const submitted = useRef(false);

  function initialize() {
    const api = window.turnstile;
    if (!siteKey || !container.current || !api || widget.current) return;
    widget.current = api.render(container.current, {
      sitekey: siteKey,
      action: mode === "login" ? "admin_login" : "admin_recovery",
      appearance: "always",
      size: "flexible",
      callback: (value: string) => { setToken(value); setSecurityError(""); },
      "expired-callback": () => setToken(""),
      "error-callback": () => { setToken(""); setSecurityError("The security check could not complete. Reload this page and try again."); },
    });
    setReady(true);
  }

  useEffect(() => () => {
    if (widget.current) window.turnstile?.remove(widget.current);
    widget.current = null;
  }, []);

  useEffect(() => {
    if (!submitted.current || pending) return;
    submitted.current = false;
    setToken("");
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [pending, state]);

  const recovery = mode === "recovery";
  return <form action={submit} className="space-y-5" aria-busy={pending} onSubmit={() => { submitted.current = true; }}>
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <label className="block">Email<input required type="email" name="email" maxLength={254} autoComplete="email" className={input} /></label>
      {!recovery && <label className="block">Password<input required type="password" name="password" maxLength={128} autoComplete="current-password" className={input} /></label>}
      <input type="hidden" name="captcha_token" value={token} />
      <div ref={container} />
    </fieldset>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={initialize} onError={() => setSecurityError("The security check could not load. Check your connection and reload this page.")} />
    {securityError && <p role="alert" className="rounded-xl bg-[#fff1e9] p-4 text-sm text-[#793b28]">{securityError}</p>}
    {state.message && <p role={state.ok ? "status" : "alert"} className="rounded-xl bg-rembulan/40 p-4 text-sm">{state.message}</p>}
    <button type="submit" disabled={pending || !ready || !token} className="min-h-12 rounded-xl bg-hutan px-6 py-3 font-semibold text-white disabled:opacity-60">{pending ? "Please wait…" : recovery ? "Send password setup link" : "Sign in"}</button>
  </form>;
}
