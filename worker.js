/*
  Site + PDF access Worker.
  1. Serves the static site (HTML/CSS/JS) via env.ASSETS.
  2. Issues short-lived HMAC-signed links for PDFs via GET /sign.
  3. Streams PDF bytes at GET/HEAD /pdf/:filename from Supabase Storage.
*/

// All of SUPABASE_URL, SUPABASE_ANON_KEY, WORKER_SECRET and
// SUPABASE_SERVICE_ROLE_KEY are Wrangler secrets (see `wrangler secret list`).
const NOTES_BUCKET = "notes";

const ACCESS_LINK_EXPIRY_SECONDS = 60 * 5; // 5 minutes
const SHARE_LINK_EXPIRY_SECONDS = 60 * 60; // 1 hour

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/sign" && request.method === "GET") {
      return handleSign(request, url, env);
    }

    if (
      url.pathname.startsWith("/pdf/") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return handlePdfServe(request, url, env);
    }

    if (url.pathname.startsWith("/pdfs/")) {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(pingSupabase(env));
  }
};

async function pingSupabase(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error("Supabase keepalive skipped: missing SUPABASE_URL/SUPABASE_ANON_KEY");
    return;
  }
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: env.SUPABASE_ANON_KEY }
    });
    console.log(`Supabase keepalive ping: HTTP ${res.status}`);
  } catch (err) {
    console.error("Supabase keepalive ping failed:", err);
  }
}

async function getSupabaseUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) {
    return null;
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY
      }
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

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
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function timingSafeEqual(a, b) {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function isValidFilename(name) {
  return Boolean(
    name &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..") &&
    !name.startsWith(".")
  );
}

async function handleSign(request, url, env) {
  if (!env.WORKER_SECRET || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("Server configuration error", { status: 500 });
  }

  const user = await getSupabaseUser(request, env);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const file = (url.searchParams.get("file") || "").trim();
  const kind = url.searchParams.get("kind");

  if (!isValidFilename(file)) {
    return new Response("Invalid file", { status: 400 });
  }

  const expiresIn =
    kind === "share" ? SHARE_LINK_EXPIRY_SECONDS : ACCESS_LINK_EXPIRY_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const token = await signToken(file, exp, env.WORKER_SECRET);
  const signedUrl = `${url.origin}/pdf/${encodeURIComponent(file)}?exp=${exp}&token=${token}`;

  return new Response(JSON.stringify({ url: signedUrl }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

async function handlePdfServe(request, url, env) {
  if (!env.WORKER_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Server configuration error", { status: 500 });
  }

  let filename = "";
  try {
    filename = decodeURIComponent(url.pathname.slice("/pdf/".length));
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const expRaw = url.searchParams.get("exp") || "";
  const exp = /^\d+$/.test(expRaw) ? Number(expRaw) : 0;
  const token = url.searchParams.get("token") || "";

  if (!isValidFilename(filename) || !exp || !token) {
    return new Response("Bad request", { status: 400 });
  }

  if (Math.floor(Date.now() / 1000) > exp) {
    return new Response("Link expired", { status: 403 });
  }

  const expected = await signToken(filename, exp, env.WORKER_SECRET);
  if (!timingSafeEqual(expected, token)) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstreamHeaders = {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY
  };

  const rangeHeader = request.headers.get("Range");
  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader;
  }

  const upstream = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/${NOTES_BUCKET}/${encodeURIComponent(filename)}`,
    {
      method: request.method,
      headers: upstreamHeaders
    }
  );

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  headers.set("Cache-Control", "private, max-age=0, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Accept-Ranges", "bytes");

  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }
  const contentRange = upstream.headers.get("Content-Range");
  if (contentRange) {
    headers.set("Content-Range", contentRange);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers
  });
}