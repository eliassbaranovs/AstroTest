// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://casinorank.com",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/go/"),
    }),
  ],
});
