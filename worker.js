/*
  Proxies PDF requests through this Worker's own domain (doe.mlsu.workers.dev)
  instead of exposing the raw Supabase storage domain to the browser.

  The client (script.js) still creates a normal Supabase signed URL client-side
  (auth + RLS is enforced by Supabase, unchanged). It then asks THIS worker to
  fetch that signed URL on the client's behalf, at:

    /pdf?target=<url-encoded supabase signed url>

  This worker fetches it server-side and streams the file back, so the address
  bar / network tab only ever shows this site's own domain.

  Locked down so it can only ever proxy to this one Supabase project's
  storage-signing endpoint — never an arbitrary open proxy.
*/

const SUPABASE_HOST = "eztspowxxwxhavhpkthm.supabase.co";
const SUPABASE_SIGN_PATH_PREFIX = "/storage/v1/object/sign/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/pdf") {
      return handlePdfProxy(request, url);
    }

    // Everything else (index.html, script.js, style.css, etc.) is the
    // normal static site — served as before.
    return env.ASSETS.fetch(request);
  }
};

async function handlePdfProxy(request, url) {

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const target = url.searchParams.get("target");

  if (!target) {
    return new Response("Missing target", { status: 400 });
  }

  let targetUrl;

  try {
    targetUrl = new URL(target);
  } catch {
    return new Response("Invalid target", { status: 400 });
  }

  // Only ever forward requests to our own Supabase project's signed-URL
  // endpoint. This is what stops the proxy from being abused to fetch
  // arbitrary third-party URLs through our domain.
  if (
    targetUrl.hostname !== SUPABASE_HOST ||
    !targetUrl.pathname.startsWith(SUPABASE_SIGN_PATH_PREFIX)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstream = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: { "Accept": request.headers.get("Accept") || "*/*" }
  });

  const headers = new Headers(upstream.headers);
  headers.delete("set-cookie"); // never forward Supabase cookies to the client

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });

}
