"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { parseReview, REVIEWER_NAME_LIMIT, REVIEW_TEXT_LIMIT } from "@/lib/reviews/validation";

function Stars({ label, value, onChange, disabled, hideLabel = false }: { label: string; value: number; onChange: (value: number) => void; disabled: boolean; hideLabel?: boolean }) {
  const name = useId();
  return <fieldset disabled={disabled}><legend className={hideLabel ? "sr-only" : "text-sm"}>{label}</legend><div className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => <label key={star} className="relative flex size-11 cursor-pointer items-center justify-center rounded-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hutan"><input className="sr-only" type="radio" name={name} value={star} checked={value === star} onChange={() => onChange(star)} aria-label={`${star} ${star === 1 ? "star" : "stars"}`} /><span aria-hidden="true" className={`text-4xl ${star <= value ? "text-[#94632b]" : "text-[#727b73]"}`}>{star <= value ? "★" : "☆"}</span></label>)}</div></fieldset>;
}

export function ReviewForm({ vendorId, slug, products, siteKey }: { vendorId: string; slug: string; products: { id: string; name: string }[]; siteKey: string }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [name, setName] = useState("");
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
        if (typeof draft.name === "string") setName(draft.name.slice(0, REVIEWER_NAME_LIMIT));
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
    try { sessionStorage.setItem(`singgah-review-draft:${vendorId}`, JSON.stringify({ name, rating, text, ratings, savedAt: Date.now() })); } catch { /* Optional draft recovery. */ }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setError("");
    let parsed;
    try { parsed = parseReview({ vendorId, name, termsAccepted, rating, text, products: Object.entries(ratings).map(([productId, value]) => ({ productId, rating: value })) }); }
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

  if (done || existing) return <section role="status" className="py-6"><h2 className="font-serif text-4xl">{done ? "Terima kasih!" : "You’ve already reviewed this vendor."}</h2><p className="mt-4 text-base leading-7 text-[#526056]">{done ? "Your review helps local businesses grow. Thank you for sharing your experience." : "Thank you for sharing your experience. Each customer can review a vendor once."}</p><a className="editorial-action mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-hutan px-5 text-sm text-white" href={`/vendor/${slug}#reviews`}>Back to vendor</a></section>;
  return <form onSubmit={submit} className="space-y-6" aria-busy={!!status}>
    <div><Stars label="Overall experience (required)" value={rating} onChange={setRating} disabled={!!status} hideLabel /><p className="mt-2 min-h-5 text-sm text-[#526056]" aria-live="polite">{rating ? ["Poor", "Fair", "Good", "Very good", "Excellent"][rating - 1] : "Choose 1–5 stars"}</p></div>
    <div><label htmlFor="reviewer-name" className="text-sm">Your name</label><input id="reviewer-name" name="name" type="text" value={name} onChange={(event) => setName(event.target.value.slice(0, REVIEWER_NAME_LIMIT))} required minLength={2} maxLength={REVIEWER_NAME_LIMIT} autoComplete="name" disabled={!!status} className="mt-2 min-h-12 w-full rounded-sm border border-hutan/30 bg-transparent px-3 text-base" aria-describedby="name-help" /><p id="name-help" className="mt-2 text-xs leading-5 text-[#526056]">Shown publicly. Use 2–{REVIEWER_NAME_LIMIT} letters and spaces.</p></div>
    <div><label htmlFor="experience" className="text-sm">Your experience <span className="text-[#526056]">(optional)</span></label><textarea id="experience" value={text} onChange={(event) => setText(event.target.value)} maxLength={REVIEW_TEXT_LIMIT} disabled={!!status} rows={3} className="mt-2 w-full resize-y rounded-sm border border-hutan/30 bg-transparent p-3 text-base leading-6" aria-describedby="text-limit" /><p id="text-limit" className="mt-1 text-right text-xs text-[#526056]">{text.length} / {REVIEW_TEXT_LIMIT}</p></div>
    {products.length > 0 && <details className="review-products group border-y border-hutan/15">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-4"><span id="products-heading">What did you try?</span><span className="text-sm text-[#526056]">Optional</span><span aria-hidden="true" className="ml-auto text-xl group-open:hidden">+</span><span aria-hidden="true" className="ml-auto hidden text-xl group-open:block">−</span></summary>
      <div className="divide-y divide-hutan/15">{products.map((product) => <div key={product.id} className="py-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={Object.hasOwn(ratings, product.id)} disabled={!!status} className="size-5 shrink-0 accent-hutan"
          onChange={(event) => setRatings(event.target.checked ? { ...ratings, [product.id]: 0 } : Object.fromEntries(Object.entries(ratings).filter(([id]) => id !== product.id)))} />{product.name}</label>
        {Object.hasOwn(ratings, product.id) && <div className="mt-2"><Stars label={product.name} value={ratings[product.id] || 0} onChange={(value) => setRatings({ ...ratings, [product.id]: value })} disabled={!!status} hideLabel /><button type="button" disabled={!!status} className="min-h-11 text-xs underline underline-offset-4" aria-label={`Remove rating for ${product.name}`} onClick={() => setRatings(Object.fromEntries(Object.entries(ratings).filter(([id]) => id !== product.id)))}>Remove rating</button></div>}
      </div>)}</div>
    </details>}
    <div className="flex items-start gap-3"><input id="review-terms" type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} disabled={!!status} className="mt-1 size-5 shrink-0 accent-hutan" aria-required="true" /><label htmlFor="review-terms" className="text-sm leading-6">I agree to the <Link href={`/terms?review=${encodeURIComponent(slug)}`} onClick={saveDraft} className="underline underline-offset-4">terms and conditions</Link> and confirm this review reflects my own experience.</label></div>
    <div ref={container} />
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={initialize} onError={() => setError("The security check couldn’t load. Check your connection and reload.")} />
    {error && <p role="alert" className="text-sm leading-6 text-[#793b28]">{error}</p>}
    <p role="status" className={status ? "text-sm leading-6" : "sr-only"}>{status}</p>
    <button type="submit" disabled={!!status || !ready} className="editorial-action min-h-12 w-full rounded-sm bg-hutan px-5 py-3 text-sm text-white disabled:opacity-60">{status ? "Please wait…" : "Submit Review"}</button>
    <p className="text-center text-xs leading-5 text-[#526056]">One review per customer, per business.</p>
  </form>;
}
