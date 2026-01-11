// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },

  ssr: false,

  // Custom SPA loading splash screen
  spaLoadingTemplate: "spa-loading-template.html",

  future: {
    compatibilityVersion: 4,
  },

  runtimeConfig: {
    public: {
      version: process.env.npm_package_version || "0.0.1",
      buildTime: new Date().toISOString(),
      devRelayUrl: process.env.PUBLIC_DEV_RELAY_URL,
      // Cloudinary system default configuration (fallback when user doesn't set their own)
      cloudinaryCloudName: process.env.NUXT_CLOUDINARY_CLOUD_NAME,
      cloudinaryUploadPreset: process.env.NUXT_CLOUDINARY_UPLOAD_PRESET,
      cloudinaryApiKey: process.env.NUXT_CLOUDINARY_API_KEY,
    },
  },

  app: {
    pageTransition: {
      name: "page",
      mode: "out-in",
    },
    layoutTransition: {
      name: "layout",
      mode: "out-in",
    },
  },

  css: ["~/assets/fonts/stylesheet.css", "~/assets/css/main.css"],

  modules: [
    "@nuxt/ui",
    "@nuxt/eslint",
    "@nuxtjs/i18n",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@vite-pwa/nuxt",
  ],

  // PWA Configuration for offline mode
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "BNOS - Business OS",
      short_name: "BNOS",
      description:
        "Lightning-powered Point of Sale System, Business OS - Nostr BNOS | Bitcoin Nostr Operating System",
      theme_color: "#FFA240",
      background_color: "#111827",
      display: "standalone",
      orientation: "any",
      start_url: "/",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      // Splash screens for iOS and Android
      screenshots: [
        {
          src: "/screenshots/mobile-splash.png",
          sizes: "500x520",
          type: "image/png",
          form_factor: "narrow",
          label: "BNOS - Mobile",
        },
        {
          src: "/screenshots/tablet-splash.png",
          sizes: "796x547",
          type: "image/png",
          form_factor: "wide",
          label: "BNOS - Tablet",
        },
        {
          src: "/screenshots/dashboard.png",
          sizes: "837x802",
          type: "image/png",
          form_factor: "wide",
          label: "BNOS - Dashboard",
        },
        {
          src: "/screenshots/dashboard-2-light.png",
          sizes: "540x805",
          type: "image/png",
          form_factor: "wide",
          label: "BNOS - Dashboard",
        },
        {
          src: "/screenshots/settings.png",
          sizes: "901x801",
          type: "image/png",
          form_factor: "wide",
          label: "BNOS - Settings",
        },
      ],
      // iOS specific splash screen settings
      launch_handler: {
        client_mode: ["navigate-existing", "auto"],
      },
    },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2,woff,ttf}"],
      globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
      cleanupOutdatedCaches: true,
      navigateFallbackDenylist: [/^\/_payload\.json$/],
      runtimeCaching: [
        {
          // Cache QR code API responses
          urlPattern: /^https:\/\/api\.qrserver\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "qr-codes-cache",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // Cache Google Fonts
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          // Cache font files
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "gstatic-fonts-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true, // Enable in dev for testing
      type: "module",
    },
  },

  ui: {
    theme: {
      colors: [
        "red",
        "gray",
        "orange",
        "amber",
        "yellow",
        "lime",
        "green",
        "emerald",
        "teal",
        "cyan",
        "sky",
        "blue",
        "indigo",
        "violet",
        "purple",
        "fuchsia",
        "pink",
        "rose",
        "amethyst",
        "slate",
        "gray",
        "zinc",
        "neutral",
        "stone",
        "error",
        "warning",
        "info",
        "success",
        "white",
      ],
    },
  },

  icon: {
    // Use local server bundle for better performance
    serverBundle: "local",
    // Pre-bundle icons used in the app for faster loading
    clientBundle: {
      // Only include icon collections you actually use
      icons: [],
      // Include full icon sets you use
      includeCustomCollections: true,
    },
    // Customize icon rendering
    customCollections: [],
    // Provider settings
    provider: "iconify",
  },

  i18n: {
    locales: [
      {
        code: "lo",
        name: "Lao PDR",
        iso: "lo-LA",
        files: [
          "lo-LA/app.json",
          "lo-LA/common.json",
          "lo-LA/navigation.json",
          "lo-LA/pos.json",
          "lo-LA/loyalty.json",
          "lo-LA/analytics.json",
          "lo-LA/receipt.json",
          "lo-LA/payment.json",
          "lo-LA/coupon.json",
          "lo-LA/tables.json",
          "lo-LA/currency.json",
          "lo-LA/dashboard.json",
          "lo-LA/shop.json",
          "lo-LA/orders.json",
          "lo-LA/products.json",
          "lo-LA/memberships.json",
          "lo-LA/customers.json",
          "lo-LA/inventory.json",
          "lo-LA/recipes.json",
          "lo-LA/ingredients.json",
          "lo-LA/reports.json",
          "lo-LA/settings.json",
          "lo-LA/auth.json",
          "lo-LA/accounting.json",
          "lo-LA/kitchen.json",
          "lo-LA/account.json",
          "lo-LA/notifications.json",
          "lo-LA/delivery.json",
          "lo-LA/contracts.json",
          "lo-LA/employees.json",
          "lo-LA/legal.json",
          "lo-LA/help.json",
          "lo-LA/onboarding.json",
          "lo-LA/order.json",
          "lo-LA/promotions.json",
        ],
      },
      {
        code: "en",
        name: "English (US)",
        iso: "en-US",
        files: [
          "en-US/app.json",
          "en-US/common.json",
          "en-US/navigation.json",
          "en-US/pos.json",
          "en-US/loyalty.json",
          "en-US/analytics.json",
          "en-US/receipt.json",
          "en-US/payment.json",
          "en-US/coupon.json",
          "en-US/tables.json",
          "en-US/currency.json",
          "en-US/dashboard.json",
          "en-US/shop.json",
          "en-US/orders.json",
          "en-US/products.json",
          "en-US/memberships.json",
          "en-US/customers.json",
          "en-US/inventory.json",
          "en-US/inventoryReports.json",
          "en-US/cycleCount.json",
          "en-US/recipes.json",
          "en-US/ingredients.json",
          "en-US/reports.json",
          "en-US/settings.json",
          "en-US/auth.json",
          "en-US/accounting.json",
          "en-US/kitchen.json",
          "en-US/refund.json",
          "en-US/account.json",
          "en-US/notifications.json",
          "en-US/delivery.json",
          "en-US/contracts.json",
          "en-US/employees.json",
          "en-US/legal.json",
          "en-US/help.json",
          "en-US/onboarding.json",
          "en-US/order.json",
          "en-US/promotions.json",
        ],
      },
      {
        code: "th",
        name: "ไทย",
        iso: "th-TH",
        files: [
          "th-TH/app.json",
          "th-TH/common.json",
          "th-TH/navigation.json",
          "th-TH/pos.json",
          "th-TH/loyalty.json",
          "th-TH/analytics.json",
          "th-TH/receipt.json",
          "th-TH/payment.json",
          "th-TH/coupon.json",
          "th-TH/tables.json",
          "th-TH/currency.json",
          "th-TH/dashboard.json",
          "th-TH/orders.json",
          "th-TH/products.json",
          "th-TH/shop.json",
          "th-TH/memberships.json",
          "th-TH/customers.json",
          "th-TH/inventory.json",
          "th-TH/recipes.json",
          "th-TH/ingredients.json",
          "th-TH/reports.json",
          "th-TH/settings.json",
          "th-TH/auth.json",
          "th-TH/accounting.json",
          "th-TH/kitchen.json",
          "th-TH/account.json",
          "th-TH/notifications.json",
          "th-TH/delivery.json",
          "th-TH/contracts.json",
          "th-TH/employees.json",
          "th-TH/legal.json",
          "th-TH/help.json",
          "th-TH/promotions.json",
        ],
      },
    ],
    lazy: true,
    defaultLocale: "lo",
    langDir: "locales",
    bundle: {
      optimizeTranslationDirective: false,
    },
  },
});
