import { ADMIN_HTML } from "./admin-page";
import { ClickCounter } from "./counter";

export { ClickCounter };

export interface Env {
  LINKS: KVNamespace;
  COUNTER: DurableObjectNamespace<ClickCounter>;
  // Secret set via: wrangler secret put API_KEY
  API_KEY: string;
}

function counter(env: Env) {
  return env.COUNTER.get(env.COUNTER.idFromName("global"));
}

// Slugs that can never be assigned to links.
const RESERVED = new Set(["api", "admin", "favicon.ico", "robots.txt"]);

// Where the bare domain and unknown slugs send people.
const HOME_URL = "https://flino.dev";

const SLUG_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SLUG_LENGTH = 6;
const SLUG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function randomSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (const b of bytes) slug += SLUG_ALPHABET[b % SLUG_ALPHABET.length];
  return slug;
}

function isValidTargetUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${env.API_KEY}`;
}

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  // GET /api/links — list all links with click stats
  if (path === "/api/links" && request.method === "GET") {
    const links: { slug: string; url: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await env.LINKS.list({ cursor, limit: 1000 });
      const values = await Promise.all(
        page.keys.map(async (k) => ({
          slug: k.name,
          url: (await env.LINKS.get(k.name)) ?? "",
        })),
      );
      links.push(...values);
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    const stats = await counter(env).counts();
    const withStats = links.map((l) => ({
      ...l,
      clicks: stats[l.slug]?.count ?? 0,
      lastClick: stats[l.slug]?.lastClick ?? null,
    }));
    return json({ links: withStats });
  }

  // POST /api/links  { "url": "https://...", "slug": "optional" }
  if (path === "/api/links" && request.method === "POST") {
    let body: { url?: string; slug?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON body" }, 400);
    }

    if (!body.url || !isValidTargetUrl(body.url)) {
      return json({ error: "field 'url' must be a valid http(s) URL" }, 400);
    }

    let slug = body.slug;
    if (slug !== undefined) {
      if (!SLUG_PATTERN.test(slug) || RESERVED.has(slug)) {
        return json({ error: "invalid or reserved slug" }, 400);
      }
      if ((await env.LINKS.get(slug)) !== null) {
        return json({ error: "slug already exists" }, 409);
      }
    } else {
      do {
        slug = randomSlug();
      } while ((await env.LINKS.get(slug)) !== null);
    }

    await env.LINKS.put(slug, body.url);
    return json({ slug, url: body.url, shortUrl: `https://flino.link/${slug}` }, 201);
  }

  // GET /api/links/:slug and DELETE /api/links/:slug
  const match = path.match(/^\/api\/links\/([a-zA-Z0-9_-]{1,64})$/);
  if (match) {
    const slug = match[1];
    if (request.method === "GET") {
      const url = await env.LINKS.get(slug);
      return url === null ? json({ error: "not found" }, 404) : json({ slug, url });
    }
    if (request.method === "DELETE") {
      await env.LINKS.delete(slug);
      await counter(env).remove(slug);
      return json({ deleted: slug });
    }
  }

  return json({ error: "not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/api/")) {
      return handleApi(request, env, pathname);
    }

    if (pathname === "/" || pathname === "") {
      return Response.redirect(HOME_URL, 302);
    }

    if (pathname === "/admin") {
      return new Response(ADMIN_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const slug = decodeURIComponent(pathname.slice(1));
    if (SLUG_PATTERN.test(slug) && !RESERVED.has(slug)) {
      const target = await env.LINKS.get(slug);
      if (target !== null) {
        // Count the click after the response is sent — adds no latency.
        ctx.waitUntil(counter(env).increment(slug));
        return Response.redirect(target, 302);
      }
    }

    return Response.redirect(HOME_URL, 302);
  },
} satisfies ExportedHandler<Env>;
