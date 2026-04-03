# Astro Site Build Guidance

Spec for building Astro static sites that consume content from the SEO Engine pipeline. This document is the single source of truth for the frontmatter contract, routing, rules, and component requirements.

## Architecture

```
SEO Engine (Next.js dashboard, local only)
  → Pipeline: SCRAPE → ANALYZE → REWRITE → VERIFY → PUBLISH
  → PUBLISH commits .md files + images to Astro repo via GitHub Tree API
  → Astro rebuilds on push (Vercel/Netlify)
  → Users and Googlebot see only static HTML
```

**The Astro site has zero runtime dependencies.** No Supabase, no API calls, no environment variables for data. Everything is baked into frontmatter at publish time.

---

## Frontmatter Schema

Every `.md` file committed by the pipeline follows this structure. Fields marked `*` are always present; others are optional.

### Universal Fields (all content types)

```yaml
title*: "string"                    # H1 / og:title
slug*: "string"                     # URL path segment
description*: "string"             # meta description, 150-160 chars
seoTitle*: "string"                # <title> tag, under 60 chars
excerpt: "string"                   # 200 char preview for cards/listings
publishedAt*: "ISO 8601 datetime"
updatedAt: "ISO 8601 datetime"
publishDate: "YYYY-MM-DD"          # human-readable date
author*: "string"                   # display name
authorSlug*: "string"              # links to /team/{authorSlug}
contentType*: "review | bonus | news | comparison | guide"
category: "string"                  # e.g. "Casino Review", "Bonus Guide"
draft: false
noIndex: false
robots: "index, follow"
canonical: "full absolute URL"

# Cover image
image*: "/images/{slug}.webp"      # local path, committed to /public/images/
imageAlt*: "string"
imageWidth: 1792
imageHeight: 1024

# Tags
tags: ["Tag1", "Tag2"]

# Schema.org — pre-generated, inject as-is in <head>
schemaJsonLd: "JSON-LD string (array of schema objects)"
```

### Casino Review Fields

```yaml
casino*: "slug"                     # casino identifier
casinoName*: "string"
ourRating: 8.1                      # 0-10 scale
player_rating: 3.1                  # aggregated user rating
best_for: "string"                  # one-liner positioning

# Company info
website: "https://..."              # display only, never linked directly
established: "2023"
company: "Operator Name"
licences: "string"
casino_type: "Crypto Casino & Sportsbook"

# Bonus — flat fields for the primary welcome bonus
bonus_title: "100% First Deposit Bonus"
bonus_percentage: 100
max_bonus: "3,000 USDT"
min_deposit: "10 USDT"
wagering: "50x bonus amount"
free_spins: 50
bonus_code: "string or omitted"
vip_program: true

# Bonus array — all offers (welcome + reload + cashback + etc.)
bonuses:
  - name: "200% up to $1,000 and 100 extra spins"
    type: "deposit"                 # deposit | no-deposit | free-spins | cashback | reload
    wagering: "35x"
    min_deposit: "$20"
    max_cashout: "$5,000"
    free_spins: "100 extra spins"
    expiry: "7 days"
  - name: "10% weekly cashback"
    type: "cashback"

# Pros & Cons — 5-7 each, specific and data-backed
pros: ["string", "string"]
cons: ["string", "string"]

# Payment & Banking
acceptedCryptos: ["BTC", "ETH", "USDT"]
depositMethods: "Bitcoin | Ethereum | USDT | Visa"    # pipe-separated
withdrawalMethods: "BTC | ETH | USDT | Visa"          # pipe-separated
currencies: "BTC | ETH | USD | EUR"                    # pipe-separated
cryptoWithdrawalSpeedMinutes: 60

# Games
gameProviders: "Pragmatic Play | NetEnt | Evolution"   # pipe-separated
game_count: 5000

# Trust
kycRequired: true
isNewCasino: false
lastVerified: "2026-03-12"

# Media
logo: "/images/logos/{slug}.jpg"
screenshots:
  - url: "/images/casinos/{slug}/screenshot_1.webp"
    alt: "Casino lobby view"
  - url: "/images/casinos/{slug}/screenshot_2.webp"
    alt: "Game library"
sectionImages:
  - section: "casino games"         # matched against H2/H3 text
    path: "/images/{slug}-casino-games.png"

# FAQs — also sourced for FAQ schema
faqs:
  - question: "Is X Casino legit?"
    answer: "50-80 word answer..."

# Affiliate
claim_url: "https://..."           # NOT used directly — see /go/ redirect rule
```

### News Article Fields

```yaml
contentType: "news"
# Uses universal fields only, plus optional:
source_url: "string"
source_name: "string"
```

### Comparison Fields

```yaml
contentType: "comparison"
casino_a: "slug"
casino_b: "slug"
casino_a_name: "string"
casino_b_name: "string"
casino_a_rating: 8.1
casino_b_rating: 7.5
winner: "slug or tie"
```

### Guide Fields

```yaml
contentType: "guide"
# Uses universal fields. Body is long-form markdown.
```

---

## Hard Rules

### 1. Affiliate Links

**ALL links to casino websites MUST use `/go/{slug}/` redirect pattern.**

- Never expose direct casino URLs in HTML (href, onclick, data attributes).
- The `/go/[slug]` page reads the target URL and performs a client-side redirect.
- This page is `noindex, nofollow` — search engines never see it.
- `claim_url` / `website` in frontmatter are for the redirect handler only.

```astro
<!-- CORRECT -->
<a href="/go/bitz/">Claim Bonus</a>

<!-- WRONG — never do this -->
<a href="https://bitz.io">Claim Bonus</a>
```

### 2. No API Calls in Production

- Zero fetch calls to Supabase, external APIs, or any backend.
- All data lives in frontmatter + markdown body.
- Astro runs in full SSG mode (`output: "static"`).
- The only JavaScript in production is for UI interactions (lightbox, accordion, etc.).

### 3. Schema.org

- Schema JSON-LD is pre-generated by the pipeline and stored in `schemaJsonLd` frontmatter.
- Inject it as-is inside a `<script type="application/ld+json">` tag in `<head>`.
- Do NOT regenerate or modify schema in Astro — it's deterministic from the pipeline.

### 4. Images Are Local

- All images (covers, logos, screenshots) are committed to `/public/images/` by the publish step.
- Frontmatter references local paths (`/images/...`), not Supabase URLs.
- Use Astro's `<Image>` component for optimization where possible.

### 5. Markdown Body Contains Custom Tags

The article body (markdown) may contain:

- `<bonus-card>...</bonus-card>` — custom bonus card blocks (field:value pairs inside)
- Standard markdown: headings, tables, lists, blockquotes, images, links
- `![alt](url)` images referencing local paths
- `[**CTA Text →**](/go/{slug}/)` — bold links rendered as CTA buttons

These need component renderers in Astro (see Components section below).

### 6. Responsible Gambling

Every casino review and bonus page MUST include:
- Affiliate disclaimer near the top
- Responsible gambling note with links to GambleAware and Gambling Therapy
- "18+/21+" age notice

These are included in the markdown body by the pipeline, but verify they're present.

---

## Content Collections

Each content type has its own collection. Do NOT mix content types into a single folder.

```
src/content/
  casinos/        # casino reviews (contentType: review)
  bonuses/        # bonus-focused reviews (contentType: bonus)
  news/           # news articles (contentType: news)
  comparisons/    # head-to-head comparisons (contentType: comparison)
  guides/         # long-form guides (contentType: guide)
  authors/        # author profiles (name, slug, bio, avatar, persona)
```

The PUBLISH step routes files by `contentType` field to the correct collection folder. Define Zod schemas in `src/content/config.ts` matching the frontmatter above.

---

## Route Structure

```
/                        # homepage — featured casinos, latest reviews
/casinos/                # casino listing page
/casinos/[slug]          # individual casino review
/bonus/[slug]            # bonus-focused review page
/news/                   # news listing
/news/[slug]             # individual news article
/compare/[a]-vs-[b]     # head-to-head comparison
/guides/                 # guide listing
/guides/[slug]           # individual guide
/go/[slug]               # affiliate redirect (noindex, nofollow)
/team/                   # author listing
/team/[slug]             # author profile + their articles
```

---

## Required Components

These components consume frontmatter data. Implementation details and visual design are up to the designer — each page type should look visually distinct.

### Data Display Components

| Component | Data Source | Purpose |
|-----------|-----------|---------|
| **BonusCard** | `bonuses[]` array or `<bonus-card>` in markdown | Shows bonus offer: logo, value, wagering, min deposit, CTA |
| **KeyFactsTable** | Flat frontmatter fields | Top-of-page summary: rating, license, established, payout speed, game count |
| **ProsCons** | `pros[]`, `cons[]` | Styled pros/cons list |
| **FAQAccordion** | `faqs[]` | Expandable Q&A section |
| **ScreenshotGallery** | `screenshots[]` | Grid with lightbox/modal |
| **SectionImage** | `sectionImages[]` | Auto-matched to nearby heading text, inserted inline |
| **RatingBadge** | `ourRating` | Visual rating display (number + stars/bar) |
| **CryptoList** | `acceptedCryptos[]` | Icon grid of accepted cryptocurrencies |
| **PaymentMethods** | `depositMethods`, `withdrawalMethods` | Tables or icon rows |

### Navigation Components

| Component | Purpose |
|-----------|---------|
| **CTAButton** | Always links to `/go/{slug}/`. Used for "Claim Bonus", "Visit Casino" |
| **RelatedReviews** | 3 related casino review cards at bottom of page |
| **ComparisonPairs** | "Compare X vs Y" links for the current casino |
| **AuthorCard** | Author name, avatar, bio snippet, link to /team/{slug} |
| **Breadcrumbs** | Home > Casinos > {Casino Name} |

### Markdown Renderer

The markdown body needs a custom renderer that handles:

1. `<bonus-card>` tags → BonusCard component
2. `![alt](url)` → optimized image with caption
3. `[**CTA Text →**](/go/{slug}/)` → CTAButton component
4. Markdown tables → styled responsive tables
5. Standard markdown (headings, lists, blockquotes, bold, italic, links)

---

## Design Guidance

**Each page type should have its own distinct visual identity.** Casino reviews, bonus pages, news articles, comparisons, and guides should NOT look like the same template with different data. They serve different user intents and should feel different.

Examples of differentiation:
- **Casino reviews** — data-heavy, dashboard-like with key facts, rating badge, screenshot gallery, structured sections
- **Bonus pages** — promotion-forward with large bonus cards, terms breakdown, comparison tables
- **News articles** — editorial feel, minimal chrome, focus on readability
- **Comparisons** — side-by-side layout, visual scoring, winner callout
- **Guides** — long-form educational, table of contents sidebar, clean typography

The pipeline does NOT dictate design. It provides structured data — how that data is displayed is entirely up to the Astro site's components and layouts.

---

## /go/ Redirect Handler

The `/go/[slug]` page is the only page that touches external URLs.

```astro
// src/pages/go/[slug].astro
// 1. Look up claim_url or website from the post's frontmatter
// 2. Render a brief interstitial ("Redirecting to {casinoName}...")
// 3. Client-side redirect after 1-2 seconds
// 4. Meta robots: noindex, nofollow
```

This keeps casino URLs out of your HTML and lets you track/swap affiliate links from one place.

---

## Authors

Authors are **manually created and published** — not generated by the pipeline. You create the `.md` files, bios, avatars, and personas yourself and commit them directly to the Astro repo.

The pipeline only references authors by slug:
- Sets `author` (display name) and `authorSlug` in article frontmatter
- Uses the author's persona prompt (from Supabase `authors` table) during rewrite
- Schema.org links to `/team/{authorSlug}`

### Author frontmatter (manually written)

```yaml
name*: "Silvia Rodriguez"
slug*: "silvia-rodriguez"
bio*: "2-3 sentence professional bio"
avatar*: "/images/authors/silvia-rodriguez.png"
expertise: ["crypto casino bonuses", "wagering requirements"]
role: "Crypto Gambling Analyst"
credentials:
  - "Certified iGaming Compliance Specialist"
socialLinks:
  twitter: "https://..."
  linkedin: "https://..."
```

### What the Astro site does with authors

- `/team/` — listing page of all authors
- `/team/[slug]` — author profile + list of their articles (query all collections filtering by `authorSlug`)
- **AuthorCard** component on every article — avatar, name, role, link to `/team/{slug}`
- Schema.org `author` field references `/team/{authorSlug}` (already in the pre-generated schema)

---

## SEO Essentials

### Open Graph & Social Meta

Every page must render these in `<head>`. Data comes from frontmatter:

```html
<meta property="og:title" content="{seoTitle}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="https://{domain}{image}" />
<meta property="og:url" content="{canonical}" />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{seoTitle}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="https://{domain}{image}" />
```

### Canonical URLs

- Every page has a `canonical` field in frontmatter — use it as-is.
- If missing, construct from `https://{domain}/{route}/{slug}/`.
- Trailing slash: be consistent. Pick one pattern and stick with it.

### Robots

- Use `robots` frontmatter field for the meta robots tag.
- Default: `index, follow`.
- `/go/` pages: always `noindex, nofollow`.
- Draft pages (`draft: true`): `noindex, nofollow`.

### Sitemap

Generate `sitemap.xml` at build time using Astro's `@astrojs/sitemap` integration. Include all non-draft, non-noindex pages. Exclude `/go/` redirects.

### robots.txt

```
User-agent: *
Allow: /
Disallow: /go/
Sitemap: https://{domain}/sitemap-index.xml
```

### RSS Feed

Optional but recommended. Use `@astrojs/rss` for `/rss.xml` covering news articles and new reviews.

---

## Internal Linking Strategy

The pipeline embeds internal links in the markdown body during the REWRITE step (e.g., `[Best Crypto Casinos](/best-crypto-casinos)`). These are contextual and SEO-driven.

Additionally, Astro components should add structural internal links:

- **RelatedReviews** — 3 other casino review cards at the bottom of every review page (same collection, different slug, sorted by date)
- **ComparisonPairs** — "Compare {this} vs {other}" links generated from the comparisons collection
- **AuthorCard** — links to `/team/{authorSlug}` on every article
- **Breadcrumbs** — `Home > {Section} > {Title}` on every page (also in Schema.org BreadcrumbList)
- **Category/tag pages** — if tags are rendered as links, they should point to filterable listing pages

Do NOT rely solely on pipeline-embedded links. The Astro site should add its own navigational links from the data it has.

---

## Performance & Core Web Vitals

- **LCP** — Cover images are the largest element. Use Astro's `<Image>` with `loading="eager"` for above-the-fold cover, `loading="lazy"` for everything else. Serve WebP.
- **CLS** — Always set `width` and `height` on images (frontmatter provides `imageWidth`, `imageHeight`). Reserve space for bonus cards and galleries.
- **INP** — Keep client-side JS minimal. Accordions, lightboxes, and the `/go/` redirect are the only interactive elements.
- **Font loading** — Use `font-display: swap`. Prefer system fonts or self-hosted (no Google Fonts CDN calls).

---

## Legal Pages (Static, Not Pipeline)

These are hand-written pages, NOT generated by the pipeline:

- `/terms/` — Terms of Service
- `/privacy/` — Privacy Policy
- `/responsible-gambling/` — Responsible gambling policy and resources
- `/about/` — About the site
- `/contact/` — Contact information

Every page footer should link to these.

---

## Listing Pages

Each content type has a listing/index page:

| Route | Content | Sort | Features |
|-------|---------|------|----------|
| `/casinos/` | All casino reviews | Rating desc, then date | Filter by rating, crypto support, bonus type |
| `/bonus/` (if separate) | Bonus reviews | Date desc | Filter by bonus type (no-deposit, free spins, etc.) |
| `/news/` | News articles | Date desc | Pagination |
| `/guides/` | Guides | Date desc | Category grouping |
| `/compare/` | Comparisons | Date desc | Search/filter by casino name |

Pagination: 12-20 items per page. Use `/casinos/2/`, `/casinos/3/` pattern (not query params).

---

## File Naming Conventions

```
# Content files — routed by contentType
src/content/casinos/{slug}.md        # e.g. bitz.md, spinbetter-casino.md
src/content/bonuses/{slug}.md        # e.g. bitz-casino-bonus-review.md
src/content/news/{slug}.md           # e.g. sec-crypto-ruling.md
src/content/comparisons/{slug}.md    # e.g. bitz-vs-stake.md
src/content/guides/{slug}.md         # e.g. how-crypto-casino-withdrawals-work.md
src/content/authors/{slug}.md        # e.g. silvia-rodriguez.md

# Images (committed by publish step)
public/images/{slug}.webp            # cover images
public/images/logos/{slug}.jpg       # casino logos
public/images/casinos/{slug}/        # screenshots per casino
public/images/authors/{slug}.png     # author avatars
```
