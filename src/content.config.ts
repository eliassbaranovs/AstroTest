import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const bonusSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  wagering: z.string().optional(),
  min_deposit: z.string().optional(),
  max_cashout: z.string().optional(),
  free_spins: z.union([z.string(), z.number()]).optional(),
  expiry: z.string().optional(),
});

const screenshotSchema = z.object({
  url: z.string(),
  alt: z.string(),
});

const sectionImageSchema = z.object({
  section: z.string(),
  path: z.string(),
});

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

// ─── Universal fields shared across all article content types ─────────────────

const universalFields = {
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  seoTitle: z.string(),
  excerpt: z.string().optional(),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  publishDate: z.string().optional(),
  author: z.string(),
  authorSlug: z.string(),
  contentType: z.enum(["review", "bonus", "news", "comparison", "guide"]),
  category: z.string().optional(),
  draft: z.boolean().default(false),
  noIndex: z.boolean().default(false),
  robots: z.string().default("index, follow"),
  canonical: z.string().optional(),
  image: z.string(),
  imageAlt: z.string(),
  imageWidth: z.number().optional(),
  imageHeight: z.number().optional(),
  tags: z.array(z.string()).optional(),
  schemaJsonLd: z.string().optional(),
};

// ─── Casino-specific fields (shared by casinos + bonuses collections) ─────────

const casinoFields = {
  casino: z.string().optional(),
  casinoName: z.string().optional(),
  ourRating: z.number().optional(),
  player_rating: z.number().optional(),
  best_for: z.string().optional(),
  website: z.string().optional(),
  established: z.string().optional(),
  company: z.string().optional(),
  licences: z.string().optional(),
  casino_type: z.string().optional(),
  bonus_title: z.string().optional(),
  bonus_percentage: z.number().optional(),
  max_bonus: z.string().optional(),
  min_deposit: z.string().optional(),
  wagering: z.string().optional(),
  free_spins: z.union([z.string(), z.number()]).optional(),
  bonus_code: z.string().optional(),
  vip_program: z.boolean().optional(),
  bonuses: z.array(bonusSchema).optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  acceptedCryptos: z.array(z.string()).optional(),
  depositMethods: z.string().optional(),
  withdrawalMethods: z.string().optional(),
  currencies: z.string().optional(),
  cryptoWithdrawalSpeedMinutes: z.number().optional(),
  gameProviders: z.string().optional(),
  game_count: z.number().optional(),
  kycRequired: z.boolean().optional(),
  isNewCasino: z.boolean().optional(),
  lastVerified: z.string().optional(),
  logo: z.string().optional(),
  screenshots: z.array(screenshotSchema).optional(),
  sectionImages: z.array(sectionImageSchema).optional(),
  faqs: z.array(faqSchema).optional(),
  claim_url: z.string().optional(),
  categories: z.array(z.string()).optional(),
};

// ─── Collections ─────────────────────────────────────────────────────────────

/** Casino reviews — contentType: "review" */
const casinos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/casinos" }),
  schema: z.object({ ...universalFields, ...casinoFields }),
});

/** Bonus-focused pages — contentType: "bonus" */
const bonuses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/bonuses" }),
  schema: z.object({ ...universalFields, ...casinoFields }),
});

/** News articles — contentType: "news" */
const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: z.object({
    ...universalFields,
    source_url: z.string().optional(),
    source_name: z.string().optional(),
  }),
});

/** Head-to-head comparisons — contentType: "comparison" */
const comparisons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/comparisons" }),
  schema: z.object({
    ...universalFields,
    casino_a: z.string().optional(),
    casino_b: z.string().optional(),
    casino_a_name: z.string().optional(),
    casino_b_name: z.string().optional(),
    casino_a_rating: z.number().optional(),
    casino_b_rating: z.number().optional(),
    winner: z.string().optional(),
  }),
});

/** Long-form guides — contentType: "guide" */
const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({ ...universalFields }),
});

/** Author profiles — manually written, not pipeline-generated */
const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    bio: z.string(), // required
    avatar: z.string(), // required — /images/authors/{slug}.png
    role: z.string().optional(),
    expertise: z.array(z.string()).optional(),
    credentials: z.array(z.string()).optional(),
    socialLinks: z
      .object({
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = {
  casinos,
  bonuses,
  news,
  comparisons,
  guides,
  authors,
};
