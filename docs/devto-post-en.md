---
title: I built a serverless URL shortener for $4.68/year (total)
published: true
description: How I built flino.link on Cloudflare Workers, KV and Durable Objects — sub-10 ms redirects from the edge, click counting with zero added latency, and zero infrastructure cost.
tags: cloudflare, serverless, typescript, showdev
cover_image: https://www.flino.dev/images/blog/flino-link.webp
---

I wanted two things: short links under my own brand (every link I share points traffic back to [my site](https://www.flino.dev)), and a real excuse to run a complete system on the edge — DNS, distributed compute, storage, auth and a dashboard — in production, at zero infrastructure cost.

The result is [flino.link](https://flino.link/devto-en): a shortener that responds in under 10 ms from 300+ locations, runs entirely on Cloudflare's free tier, and whose only expense is the domain: $4.68 a year. This post covers the design decisions, which is where the interesting parts are.

## The architecture in 30 seconds

A single Cloudflare Worker serves the whole domain:

- **`GET /<slug>`** — the hot path. One read from Workers KV (globally replicated) and a `302` redirect. Nothing else touches that path.
- **`/api/links`** — a REST API with Bearer auth to create, list and delete links.
- **`/admin`** — a single-page dashboard served as inline HTML from the Worker itself. No framework, no build step.
- A **Durable Object** with embedded SQLite keeps per-slug click counts.

No servers, no containers, no database to manage. The whole Worker is three TypeScript files and zero runtime dependencies.

## Why a dedicated domain?

My first idea was to hang the shortener off a route on `flino.dev`. Bad idea: shorteners attract abuse — spam, phishing — and their domains sooner or later end up on blocklists. If that happens, I don't want it dragging my main domain down with it. A separate domain isolates that reputation risk completely, and a short `.link` costs less than a coffee per year.

## KV for links, a Durable Object for counters

This is the central design decision. Workers KV is perfect for a shortener's access pattern — read-heavy, write-light, reads served from the edge — but its writes are *eventually consistent*: two concurrent increments in different datacenters would clobber each other. For counting clicks, it's useless.

A Durable Object solves exactly that: it's a single global instance with transactional SQLite storage. Every increment, no matter which datacenter it comes from, serializes through one consistent point:

```ts
export class ClickCounter extends DurableObject<unknown> {
  private sql = this.ctx.storage.sql;

  increment(slug: string): void {
    const now = Date.now();
    this.sql.exec(
      "INSERT INTO clicks (slug, count, last_click) VALUES (?, 1, ?) " +
        "ON CONFLICT(slug) DO UPDATE SET count = count + 1, last_click = ?",
      slug, now, now,
    );
  }
}
```

Doesn't that single point become a bottleneck for redirects? No — because of what comes next.

## The `waitUntil` trick: click counting with zero latency

A shortener's contract is to redirect *fast*. If the redirect had to wait for the Durable Object write, every click would pay an extra round-trip. The solution is `ctx.waitUntil()`: it hands the runtime a promise that executes **after** the response has been sent to the visitor.

```ts
const target = await env.LINKS.get(slug);
if (target !== null) {
  // Runs after the response is sent — adds no latency to the redirect.
  ctx.waitUntil(counter(env).increment(slug));
  return Response.redirect(target, 302);
}
```

The visitor gets their `302` after a single KV read; the counting happens in the background. Free analytics, in the literal sense of the word.

## Fail toward the brand

What happens when someone visits a slug that doesn't exist, or the domain root? Never a 404: always a redirect to `flino.dev`. A broken or deleted link never shows an ugly error page — it shows my site. Every dead path in the system becomes a touchpoint.

```ts
// Unknown slug, root, or anything else:
return Response.redirect("https://flino.dev", 302);
```

## The dashboard: inline HTML, no framework

The admin panel is a TypeScript constant holding a complete HTML page that the Worker serves at `/admin`. The API key lives in `localStorage`, dark mode comes free with `prefers-color-scheme`, and creating a link auto-copies the short URL to the clipboard. Zero dependencies, zero build, and it deploys together with the Worker in the same `wrangler deploy`.

For a project this size, a frontend framework would have been more infrastructure than product.

## The numbers

| | |
|---|---|
| Redirect latency | < 10 ms from 300+ locations |
| Capacity (free tier) | ~100,000 requests/day |
| Infrastructure cost | $0/mo |
| Total cost | $4.68/yr (the domain) |
| Runtime dependencies | 0 |

## What I'm taking away

1. **The edge changes the defaults.** For a read-heavy service, the question is no longer "how close do I put the server?" but "why would there be a server?".
2. **Pick storage by semantics, not by habit.** KV and Durable Objects coexist in the same Worker, each doing the one thing it's good at: global replication for reads, strong consistency for counting.
3. **`waitUntil` is the most underrated pattern in Workers.** Anything the visitor doesn't need — metrics, logs, counters — can move off the critical path.

The full code is on [GitHub](https://github.com/flinodev/url-shortened), and if you want to see the system in action, this link goes through it: [flino.link/devto-en](https://flino.link/devto-en). (Yes — your click is already on my dashboard 😄)

Where would you have hosted this? Workers, a $5 VPS, Deno Deploy, fly.io? I'd genuinely like to read other approaches in the comments. 👇
