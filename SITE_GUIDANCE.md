# Astro Site Data Contract

Technical spec for Astro sites consuming content from the SEO Engine pipeline. Defines the data schema, file structure, and rules that prevent build failures.

---

## Architecture

```
SEO Engine (local Next.js dashboard)
  → PUBLISH commits .md files + images to Astro repo via GitHub Tree API
  → Vercel auto-deploys on push
  → Output: static HTML only
```

**Zero runtime dependencies.** No Supabase, no API calls, no env vars for data. Everything is in frontmatter + markdown body at build time.

---

## Frontmatter Schema

All fields are optional unless marked `*`. **Astro schemas should make all non-starred fields optional** so missing data never fails a build — just skip rendering.

### Universal Fields (all content types)

```yaml
title*: "string"
slug*: "string"
description*: "string"             # 150-160 chars
seoTitle*: "string"                # under 60 chars
excerpt: "string"                   # ~200 chars
publishedAt*: "ISO 8601 datetime"
updatedAt: "ISO 8601 datetime"
publishDate: "YYYY-MM-DD"
author*: "string"                   # display name
authorSlug*: "string"              # matches author collection slug
contentType*: "review | bonus | news | comparison | guide"
category: "string"
draft: false
noIndex: false
robots: "index, follow"
canonical: "full absolute URL"
image*: "/images/{slug}.webp"      # local path in /public/images/
imageAlt*: "string"
imageWidth: 1792
imageHeight: 1024
tags: ["string"]
schemaJsonLd: "JSON-LD string"     # inject as-is in <script type="application/ld+json">
```

### Casino Review Fields

```yaml
casino: "slug"
casinoName: "string"
ourRating: 8.1                      # 0-10
player_rating: 3.1
best_for: "string"
website: "https://..."              # for /go/ redirect only, never rendered as href
established: "2023"
company: "string"
licences: "string"
casino_type: "string"

# Primary welcome bonus (flat)
bonus_title: "string"
bonus_percentage: 100
max_bonus: "string"
min_deposit: "string"
wagering: "string"
free_spins: 50
bonus_code: "string"
vip_program: true

# All bonuses (array)
bonuses:
  - name: "string"
    type: "deposit | no-deposit | free-spins | cashback | reload"
    wagering: "string"
    min_deposit: "string"
    max_cashout: "string"
    free_spins: "string"
    expiry: "string"

pros: ["string"]
cons: ["string"]

# Payment
acceptedCryptos: ["Bitcoin", "Ethereum"]
depositMethods: "pipe-separated string"
withdrawalMethods: "pipe-separated string"
currencies: "pipe-separated string"
cryptoWithdrawalSpeedMinutes: 60

# Games
gameProviders: "pipe-separated string"
game_count: 5000

# Trust
kycRequired: true
isNewCasino: false
lastVerified: "YYYY-MM-DD"

# SEO Categories (auto-derived, for filtering/listing)
categories:
  - "crypto-casino"
  - "bitcoin-casino"
  - "no-kyc-casino"
  - "fast-withdrawal-casino"
# Full list of possible values:
#   bitcoin-casino, ethereum-casino, solana-casino, litecoin-casino,
#   usdt-casino, dogecoin-casino, visa-casino, mastercard-casino,
#   bank-transfer-casino, apple-pay-casino, skrill-casino,
#   no-kyc-casino, fast-withdrawal-casino, instant-withdrawal-casino,
#   no-deposit-bonus, free-spins-casino, vip-program-casino, live-casino,
#   crypto-casino, online-casino, sweepstakes-casino, sportsbook,
#   casino-and-sportsbook, licensed-casino, new-casino

# Media
logo: "/images/logos/{slug}.{ext}"  # actual extension matches source file
screenshots:
  - url: "/images/casinos/{slug}/screenshot_1.webp"
    alt: "string"
sectionImages:
  - section: "string"               # heading text this image relates to
    path: "/images/{slug}-section.png"

# FAQs
faqs:
  - question: "string"
    answer: "string"

# Affiliate
claim_url: "https://..."           # target URL for /go/{slug}/ redirect
```

### News Fields

```yaml
contentType: "news"
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
# Universal fields only. Body is long-form markdown.
```

---

## Markdown Body

**Standard markdown only.** No custom tags, no HTML components, no embedded images.

Contains: headings, paragraphs, tables, lists, blockquotes, bold, italic, links.

CTA links use format: `[**Text →**](/go/{slug}/)`

Internal links use relative paths: `[Casino Name](/casinos/slug/)`

All structured data (bonuses, screenshots, ratings, pros/cons, FAQs) is in frontmatter. The body is prose content only.

### Casino review body
LLM-generated article covering the casino's bonuses, games, payments, licensing, pros/cons, and verdict. Pure prose — no bonus cards or images embedded. The Astro template renders those from frontmatter.

### Bonus page body
LLM-generated analysis of all bonus offers — overview, welcome bonus breakdown, free spins, ongoing promotions, wagering terms comparison, how to claim, and verdict. Pure prose + markdown tables. All bonus data is also available in frontmatter `bonuses[]` for structured rendering.

---

## Rules That Prevent Build Failures

### 1. All frontmatter fields are optional (except starred)

If a field is missing, the Astro template skips it. No crashes from null data.

### 2. No external URLs in content

- All image paths are local (`/images/...`)
- No Supabase URLs, no third-party hotlinks
- `website` and `claim_url` are data for the `/go/` redirect handler, not rendered as links

### 3. Affiliate links use `/go/{slug}/`

Never expose direct casino URLs in HTML. The `/go/[slug]` route handles redirects. This page is `noindex, nofollow`.

### 4. Schema.org is pre-generated

`schemaJsonLd` contains a JSON string. Inject as-is in `<head>`. Do not parse, modify, or regenerate.

### 5. Images are committed alongside content

The publish step commits images to `public/images/`. Frontmatter references these local paths. No external image fetching at build time.

---

## Content Collections

```
src/content/
  casinos/       # contentType: review
  bonuses/       # contentType: bonus
  news/          # contentType: news
  comparisons/   # contentType: comparison
  guides/        # contentType: guide
  authors/       # manually created, not from pipeline
```

### Zod Schema Guidance

Make every field optional except the starred universal fields. Example pattern:

```ts
bonuses: z.array(z.object({
  name: z.string(),
  type: z.string().optional(),
  wagering: z.string().optional(),
  min_deposit: z.string().optional(),
  max_cashout: z.string().optional(),
  free_spins: z.string().optional(),
  expiry: z.string().optional(),
})).optional(),
```

This ensures any combination of present/missing data builds successfully.

---

## Route Structure

```
/casinos/[slug]
/bonus/[slug]
/news/[slug]
/compare/[slug]
/guides/[slug]
/go/[slug]               # noindex, nofollow redirect
/team/[slug]             # author pages (manual)
```

---

## Authors

Manually created in `src/content/authors/`. Not generated by the pipeline.

Pipeline sets `author` and `authorSlug` in frontmatter to reference them.

```yaml
name*: "string"
slug*: "string"
bio*: "string"
avatar*: "/images/authors/{slug}.png"
expertise: ["string"]
role: "string"
credentials: ["string"]
socialLinks:
  twitter: "string"
  linkedin: "string"
```

---

## File Structure

```
# Content (committed by publish step)
src/content/casinos/{slug}.md
src/content/bonuses/{slug}-bonus-review.md
src/content/news/{slug}.md
src/content/comparisons/{slug}.md
src/content/guides/{slug}.md

# Images (committed by publish step)
public/images/{slug}.webp              # cover images
public/images/logos/{slug}.{ext}       # casino logos (jpg, svg, png, webp)
public/images/casinos/{slug}/          # screenshots
public/images/authors/{slug}.png       # author avatars (manual)
```

---

## /go/ Redirect

The only page that touches external URLs. Reads `claim_url` or `website` from frontmatter. Performs client-side redirect. Must be `noindex, nofollow`.

---

## SEO Requirements

### Open Graph Meta

Every page needs these in `<head>` from frontmatter fields:

```
og:title        ← seoTitle
og:description  ← description
og:image        ← https://{domain}{image}
og:url          ← canonical
og:type         ← "article"
twitter:card    ← "summary_large_image"
twitter:title   ← seoTitle
twitter:description ← description
twitter:image   ← https://{domain}{image}
```

Missing OG tags = no preview when shared on social/Google Discover.

### Schema.org

Already in `schemaJsonLd` frontmatter. Inject as `<script type="application/ld+json">` in `<head>`.

### Canonical URLs

Use `canonical` from frontmatter. If missing, construct: `https://{domain}/{route}/{slug}/`. Be consistent with trailing slashes.

### robots.txt

```
User-agent: *
Allow: /
Disallow: /go/
Sitemap: https://{domain}/sitemap-index.xml
```

### Sitemap

Generate at build time via `@astrojs/sitemap`. Include all non-draft, non-noindex pages. Exclude `/go/` routes.

### Internal Linking

The pipeline embeds contextual internal links in the markdown body (e.g., `[Best Crypto Casinos](/best-crypto-casinos)`). These are SEO-driven and should render as standard `<a>` tags.

### Robots Meta

Use `robots` frontmatter field for per-page meta robots tag. Default: `index, follow`. `/go/` pages and `draft: true` pages: `noindex, nofollow`.
