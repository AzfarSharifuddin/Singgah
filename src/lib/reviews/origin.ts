// Next.js may normalize request.url to an internal hostname. Compare the
// browser Origin with the actual incoming Host instead. Authorization and
// CAPTCHA are still required; Host alone never authorizes a review.
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && parsed.host === host.toLowerCase()
      && parsed.protocol === new URL(request.url).protocol;
  } catch { return false; }
}
