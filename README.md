# NEXORA

Run your business from one intelligent workspace.

A browser-first business operations application with React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide, Inter, IndexedDB (`idb`), Zod and a Gemini proxy on Netlify Functions. No database server or application backend is required for local business operations.

## Run

Use Node.js 22 or newer for frontend tooling:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. This runs the frontend development server, not a database or business backend. `npm run build` produces `dist/`; `npm run preview` serves that production build. `npm test` runs the automated suite. The plain Vite server does not run Netlify Functions: AI correctly reports unavailable there.

## Features

- Landing page and explicitly local profile onboarding; demo/local role controls.
- Dashboard and analytics with date comparisons calculated from stored orders, customers and products.
- Customer CRUD, tags, notes, history; product CRUD, descriptions, local image uploads; inventory adjustments and threshold alerts.
- Atomic order creation, stock reservation, cancellation/restocking, payment/status recording, immutable invoice snapshots and print/PDF.
- Persisted notification center, five local Web Audio sounds, browser notification fallback, activity timeline.
- Global search and keyboard command palette; workflows with edge-triggered actions, execution history and follow-up tasks.
- Gemini conversations with focused business context, explicit sharing consent, history, retry, regeneration and offline/error handling.
- Theme, local team profiles, JSON export/import, demo reset, clear data and optional simulation.
- Responsive layouts, accessible native dialogs, lazy-loaded routes/charts, generated offline cache and installable PWA assets.

First launch seeds 50 customers, 30 products, 120 orders, 60 invoices, 24 notifications, 120 activities, 5 workflows, 10 tasks and 5 local team profiles. Workflows may generate additional records when the workspace opens. Seeds are deterministic for the same reference date. Demo product photos illustrate categories; attribution is in `public/images/credits.json`.

## Structure

```text
src/
  ai/                 Relevant context, AI client, conversation persistence
  charts/             Charts derived from analytics selectors
  components/         Forms, dialogs, feedback, search and shared controls
  db/                 Schemas, IndexedDB transactions, repositories, demo seed
  layouts/            Application shell and navigation
  notifications/      Center, browser fallback, Web Audio
  pages/              Landing and business modules
  services/           Commerce, analytics, import/export, network and PWA
  store/              Reactive workspace provider
  styles/             Design system and responsive/print styling
  utils/              Formatting, IDs and safe error messages
  workflows/          Persisted rules and evaluation bridge
netlify/functions/gemini/  Validated server-side Gemini boundary
public/icons/         SVG branding and PNG PWA icons
public/images/        Locally bundled illustrative product photography
public/manifest.webmanifest
scripts/build-sw.mjs   Versioned production precache generation
tests/                Data, commerce, AI, platform and security tests
netlify.toml          Build, functions, routing and security headers
.env.example          Blank server environment template
```

## Gemini and Netlify

Import this repository into a Netlify site, with the project directory as its base directory if nested. The included `netlify.toml` sets build command `npm run build`, publish directory `dist`, and functions directory `netlify/functions`. Deploy using a repository build so the function is included; uploading only static `dist` files does not deploy the AI function.

Set these environment variables in Netlify's server/function environment and redeploy:

| Variable         | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| `GEMINI_API_KEY` | Your Google Gemini API credential, server-side only    |
| `GEMINI_MODEL`   | A Gemini model identifier available to that credential |

Both are required; no model is silently assumed. Never prefix them with `VITE_`, commit a populated `.env`, or put credentials in browser storage. `.env.example` deliberately has blank values. Use the Google account's available model selection; model availability can change.

The browser calls `/.netlify/functions/gemini`. The function validates method, origin, JSON shape, sizes and context depth, applies a per-instance rate limit and timeout, and sends the key only in a server-to-Google request header. Its system instructions prohibit fabricated business facts and unperformed actions. No AI tool executes writes. The frontend sends relevant aggregates/rankings, not the full database; customer email, address and notes are excluded from the generated context. User-entered messages and selected business context do go to Google after consent. Responses are plain text, never unsafe HTML.

For local function development, Netlify CLI can optionally emulate this boundary; it is not required for local business features. Production AI requires a deployed function and valid credentials.

## Data semantics

Business changes use one IndexedDB transaction across related stores. Orders reserve stock immediately. Cancellation restores it once; reopening checks and reserves stock again. Historical item prices/costs and invoice details are snapshots. Revenue is paid, non-cancelled net sales after discount and before tax; gross profit subtracts recorded costs. Payment status records bookkeeping only: no payment is charged or refunded. Metrics use UTC dates. Customer conversion means paying contacts divided by eligible CRM contacts, not website traffic conversion.

Referenced customers/products cannot be deleted; mark inactive/archive them to retain history. Backup imports validate schemas, duplicate IDs, relationships and totals before replacement. Export before resetting or clearing. Clear retains your current local profile and company settings, removes business records and disables reseeding. Browser storage may be evicted or cleared: keep backups.

## Offline and operational limits

After a successful production cache on HTTPS (or localhost), local navigation and business records work offline. Service workers are disabled in Vite development. The generated worker caches all local route chunks, fonts, images and shell assets; it excludes API calls. AI requires internet and a configured function. PWA installation, OS notifications, clipboard and sound depend on browser support and user interaction/permission.

This version has no secure account authentication, cloud database, cross-device synchronization, email invitations, payment processing or server push. Frontend role controls are a local demonstration, not a security boundary. Data is not encrypted at rest by the app. Workflows and simulation run only while the workspace is open; they are not background server jobs. AI context uses bounded rankings and identifies coverage; it cannot establish causes absent from the data. Invoice tax/discount entry is generic, not jurisdiction-specific accounting compliance.

The public AI endpoint has no authenticated user identity, and its in-memory rate limit resets with function instances. Before opening an AI-enabled site to untrusted public traffic, add verified server-side identity and durable abuse controls, and configure provider spending limits. Origin checks alone are not authentication.

See `TESTING.md` for verified checks and remaining deployment/device acceptance checks.
