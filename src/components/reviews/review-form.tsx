"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { parseReview, REVIEW_TEXT_LIMIT } from "@/lib/reviews/validation";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

function Stars({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled: boolean }) {
  const name = useId();
  return <fieldset disabled={disabled}><legend className="text-sm font-semibold">{label}</legend><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((star) => <label key={star} className="relative flex size-12 cursor-pointer items-center justify-center rounded-lg border border-hutan/15 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hutan"><input className="sr-only" type="radio" name={name} value={star} checked={value === star} onChange={() => onChange(star)} aria-label={`${star} ${star === 1 ? "star" : "stars"}`} /><span aria-hidden="true" className={`text-3xl ${star <= value ? "text-[#86513a]" : "text-[#727b73]"}`}>{star <= value ? "★" : "☆"}</span></label>)}</div></fieldset>;
}

export function ReviewForm({ vendorId, slug, products, siteKey }: { vendorId: string; slug: string; products: { id: string; name: string }[]; siteKey: string }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [existing, setExisting] = useState(false);
  const [ready, setReady] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const busy = useRef(false);
  const token = useRef<{ value: string; created: number } | null>(null);
  const needsReset = useRef(false);
  const pending = useRef<{ resolve: (token: string) => void; reject: (reason: Error) => void } | null>(null);

  useEffect(() => {
    let active = true;
    // Restore only this vendor's short-lived draft after reading the terms.
    const restore = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(`singgah-review-draft:${vendorId}`);
        if (!raw) return;
        sessionStorage.removeItem(`singgah-review-draft:${vendorId}`);
        const draft = JSON.parse(raw);
        if (Date.now() - draft.savedAt > 30 * 60 * 1000) return;
        if (Number.isInteger(draft.rating) && draft.rating >= 0 && draft.rating <= 5) setRating(draft.rating);
        if (typeof draft.text === "string") setText(draft.text.slice(0, REVIEW_TEXT_LIMIT));
        if (draft.ratings && typeof draft.ratings === "object") setRatings(Object.fromEntries(Object.entries(draft.ratings).filter(([id, value]) => products.some(product => product.id === id) && Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5)) as Record<string, number>);
        // Agreement stays unchecked after reading, so acceptance is deliberate.
      } catch { /* Storage may be unavailable; the review form remains usable. */ }
    }, 0);
    const client = createBrowserSupabaseClient();
    void client.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const result = await client.rpc("has_reviewed_vendor", { p_vendor_id: vendorId });
        if (active && result.data) setExisting(true);
      }
    }).catch(() => {});
    return () => { clearTimeout(restore); active = false; if (widget.current) window.turnstile?.remove(widget.current); widget.current = null; pending.current?.reject(new Error("Security check cancelled.")); };
  }, [vendorId, products]);

  function initialize() {
    if (!container.current || !window.turnstile || widget.current) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey: siteKey, action: "review", execution: "render", appearance: "interaction-only", size: "compact",
      retry: "never", "refresh-expired": "manual", "refresh-timeout": "manual",
      callback: (value: string) => {
        if (pending.current) { const waiting = pending.current; pending.current = null; needsReset.current = true; waiting.resolve(value); }
        else { token.current = { value, created: Date.now() }; needsReset.current = false; }
      },
      "error-callback": (code: string) => {
        token.current = null; needsReset.current = true;
        pending.current?.reject(new Error(`The security check couldn’t complete (code ${code}). Retry, or open this page in your regular browser if it keeps failing. Your review has not been submitted.`)); pending.current = null;
      },
      "expired-callback": () => { token.current = null; needsReset.current = true; },
      "timeout-callback": () => {
        token.current = null; needsReset.current = true;
        pending.current?.reject(new Error("The security check timed out. Please retry and complete the check shown below.")); pending.current = null;
      },
    });
    setReady(true);
  }

  async function challenge() {
    if (!widget.current || !window.turnstile) throw new Error("The security check is still loading. Please try again.");
    if (token.current && Date.now() - token.current.created < 240000) {
      const value = token.current.value; token.current = null; needsReset.current = true; return value;
    }
    if (token.current) { token.current = null; needsReset.current = true; }
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.current = null; needsReset.current = true;
        reject(new Error("The security check is taking too long. Retry, or try your regular browser and check that Cloudflare is not blocked."));
      }, 30000);
      pending.current = { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (reason) => { clearTimeout(timer); reject(reason); } };
      if (needsReset.current) {
        needsReset.current = false;
        try { window.turnstile!.reset(widget.current!); }
        catch { needsReset.current = true; pending.current?.reject(new Error("The security check couldn’t restart. Reload the page and try again.")); pending.current = null; }
      }
    });
  }

  function saveDraft() {
    try { sessionStorage.setItem(`singgah-review-draft:${vendorId}`, JSON.stringify({ rating, text, ratings, savedAt: Date.now() })); } catch { /* Optional draft recovery. */ }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setError("");
    let parsed;
    try { parsed = parseReview({ vendorId, termsAccepted, rating, text, products: Object.entries(ratings).map(([productId, value]) => ({ productId, rating: value })) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Please check your review."); return; }
    busy.current = true;
    setStatus("Restoring your customer session…");
    try {
      const client = createBrowserSupabaseClient();
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw new Error("We couldn’t restore your session. Please reload and try again.");
      let session = sessionResult.data.session;
      if (!session) {
        setStatus("Completing the security check for your anonymous session…");
        const captchaToken = await challenge();
        setStatus("Preparing your anonymous session…");
        const result = await client.auth.signInAnonymously({ options: { captchaToken } });
        if (result.error || !result.data.session) throw new Error("We couldn’t start your anonymous session. Please try again shortly.");
        session = result.data.session;
      }
      const existingReview = await client.rpc("has_reviewed_vendor", { p_vendor_id: vendorId });
      if (existingReview.data) { setExisting(true); return; }
      setStatus("Completing the review security check…");
      const turnstileToken = await challenge();
      setStatus("Saving your review…");
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ review: parsed, turnstileToken }) });
      const result = await response.json();
      if (response.status === 409) { setExisting(true); return; }
      if (!response.ok) throw new Error(result.message || "Your review couldn’t be submitted. Please try again.");
      setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again shortly."); }
    finally { busy.current = false; setStatus(""); }
  }

  if (done || existing) return <section role="status" className="rounded-2xl border border-hutan/15 bg-white p-7"><h2 className="font-serif text-3xl">{done ? "Terima kasih!" : "You’ve already reviewed this vendor."}</h2><p className="mt-4 leading-7">{done ? "Your review helps local businesses grow. Thank you for sharing your experience." : "Thank you for sharing your experience. Each customer can review a vendor once."}</p><a className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-hutan px-5 text-white" href={`/vendor/${slug}#reviews`}>Back to vendor</a></section>;
  return <form onSubmit={submit} className="space-y-8 rounded-2xl border border-hutan/15 bg-white p-5 sm:p-8" aria-busy={!!status}>
    <Stars label="Overall experience (required)" value={rating} onChange={setRating} disabled={!!status} />
    <div><label htmlFor="experience" className="text-sm font-semibold">Tell us about your experience <span className="font-normal">(optional)</span></label><textarea id="experience" value={text} onChange={(event) => setText(event.target.value)} maxLength={REVIEW_TEXT_LIMIT} disabled={!!status} rows={4} className="mt-3 w-full resize-y rounded-xl border border-hutan/25 p-3" aria-describedby="text-limit" /><p id="text-limit" className="mt-1 text-xs text-[#5d665f]">{text.length}/{REVIEW_TEXT_LIMIT} characters</p></div>
    {products.length > 0 && <section aria-labelledby="products-heading"><h2 id="products-heading" className="font-serif text-2xl">What did you try?</h2><p className="mt-2 text-sm text-[#5d665f]">Optional — rate any items you tried, or skip this section.</p><div className="mt-5 space-y-5">{products.map((product) => <div key={product.id} className="border-t border-hutan/10 pt-4"><Stars label={product.name} value={ratings[product.id] || 0} onChange={(value) => setRatings({ ...ratings, [product.id]: value })} disabled={!!status} />{ratings[product.id] && <button type="button" disabled={!!status} className="mt-1 min-h-11 text-sm underline" aria-label={`Remove rating for ${product.name}`} onClick={() => setRatings(Object.fromEntries(Object.entries(ratings).filter(([id]) => id !== product.id)))}>Remove rating</button>}</div>)}</div></section>}
    <div className="flex items-start gap-3 rounded-xl bg-[#f5f1e9] p-4"><input id="review-terms" type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} disabled={!!status} className="mt-1 size-5 shrink-0 accent-hutan" aria-required="true" /><label htmlFor="review-terms" className="text-sm leading-6">I agree to the <Link href={`/terms?review=${encodeURIComponent(slug)}`} onClick={saveDraft} className="font-semibold underline underline-offset-4">terms and conditions</Link> and confirm this review reflects my own experience.</label></div>
    <div ref={container} />
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={initialize} onError={() => setError("The security check couldn’t load. Check your connection and reload.")} />
    {error && <p role="alert" className="rounded-xl bg-[#fff1e9] p-4 text-sm text-[#793b28]">{error}</p>}
    <p role="status" className="text-sm">{status}</p>
    <button type="submit" disabled={!!status || !ready} className="min-h-12 w-full rounded-xl bg-hutan px-5 py-3 font-semibold text-white disabled:opacity-60">{status ? "Please wait…" : "Submit Review"}</button>
    <p className="text-xs leading-5 text-[#5d665f]">No signup needed. Your review is public and shown as Anonymous. One review per customer, per vendor.</p>
  </form>;
}
