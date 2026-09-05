/*
  Site + PDF access.

  Auth AND PDF storage both live on Supabase, unchanged. This Worker:
    1. Serves the static site (HTML/CSS/JS) as before.
    2. Issues its OWN short-lived signed links for PDFs (via /sign), so
       a shared link only ever shows THIS domain — never the Supabase
       project URL or its storage token.
    3. Serves the actual file bytes at /pdf/:filename by fetching them
       from Supabase Storage server-side, using a service role key that
       never reaches the browser.

  Routes:
    GET  /sign?file=..&kind=access|share  → logged-in users only.
         Returns { "url": "https://yoursite.com/pdf/<file>?exp=..&token=.." }
    GET  /pdf/:filename?exp=..&token=..   → serves the file, only if the
         signature is valid and hasn't expired.
    everything else                       → the static site (as before)

  Requires two secrets set in the dashboard — Pages project → Settings →
  Environment variables (as "Secret", not plain text). Do NOT put these
  in this file:
    WORKER_SECRET               → any long random string you make up —
                                   this is what signs your file links.
    SUPABASE_SERVICE_ROLE_KEY   → from Supabase dashboard → Project
                                   Settings → API → "service_role" key.
                                   This bypasses Supabase's normal
                                   access rules, so keep it secret —
                                   never put it in script.js or anywhere
                                   the browser can see.
*/

const SUPABASE_URL = "https://eztspowxxwxhavhpkthm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dHNwb3d4eHd4aGF2aHBrdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzI2MTYsImV4cCI6MjEwMzAwODYxNn0.fVnX45GDjT8HMVXSAm5Xucr8J6PCJ9AQ4vkjmJLNeRE";
const NOTES_BUCKET = "notes";

const ACCESS_LINK_EXPIRY_SECONDS = 60 * 5;   // 5 minutes — preview/download
const SHARE_LINK_EXPIRY_SECONDS = 60 * 60;   // 1 hour — share link

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/sign" && request.method === "GET") {
      return handleSign(request, url, env);
    }

    if (url.pathname.startsWith("/pdf/") && request.method === "GET") {
      return handlePdfServe(url, env);
    }

    // Everything else (index.html, script.js, style.css, etc.) is the
    // normal static site — served as before.
    return env.ASSETS.fetch(request);

  }
};

/* ===================== Supabase token verification ===================== */

async function getSupabaseUser(request) {

  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return null;
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY
    }
  });

  if (!res.ok) {
    return null;
  }

  return res.json();

}

/* ===================== Signed, expiring file tokens (our own) ===================== */

async function signToken(filename, exp, secret) {

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${filename}:${exp}`)
  );

  return arrayBufferToBase64Url(sig);

}

function arrayBufferToBase64Url(buf) {

  let binary = "";
  const bytes = new Uint8Array(buf);

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

}

/* ===================== /sign ===================== */

async function handleSign(request, url, env) {

  const user = await getSupabaseUser(request);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const file = url.searchParams.get("file");
  const kind = url.searchParams.get("kind"); // "access" or "share"

  if (!file) {
    return new Response("Missing file", { status: 400 });
  }

  const expiresIn = kind === "share" ? SHARE_LINK_EXPIRY_SECONDS : ACCESS_LINK_EXPIRY_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const token = await signToken(file, exp, env.WORKER_SECRET);

  const signedUrl = `${url.origin}/pdf/${encodeURIComponent(file)}?exp=${exp}&token=${token}`;

  return new Response(JSON.stringify({ url: signedUrl }), {
    headers: { "Content-Type": "application/json" }
  });

}

/* ===================== /pdf/:filename ===================== */

async function handlePdfServe(url, env) {

  const filename = decodeURIComponent(url.pathname.replace("/pdf/", ""));
  const exp = parseInt(url.searchParams.get("exp") || "0", 10);
  const token = url.searchParams.get("token") || "";

  if (!filename || !exp || !token) {
    return new Response("Bad request", { status: 400 });
  }

  if (Date.now() / 1000 > exp) {
    return new Response("Link expired", { status: 403 });
  }

  const expected = await signToken(filename, exp, env.WORKER_SECRET);

  if (expected !== token) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${NOTES_BUCKET}/${encodeURIComponent(filename)}`,
    {
      headers: {
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY
      }
    }
  );

  if (!upstream.ok) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Cache-Control", "private, max-age=0, no-store");

  return new Response(upstream.body, { headers });

}
