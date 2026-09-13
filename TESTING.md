# Verification record

Verified in the continuation session on 2026-09-13. This is an engineering verification record, not a claim of external deployment certification.

## Automated checks

`npm run build` passes TypeScript checking and the Vite production build. The generated service worker precaches 58 local assets, including lazy routes, chart code, fonts and images. The Gemini function bundles successfully with esbuild for Node. `npm test` passes 31 tests across five files:

| Suite | Coverage |
| --- | --- |
| Data (3) | Deterministic linked seed; transaction rollback; concurrent writes without lost updates |
| Commerce (6) | Order creation and derived values; stock rejection and duplicate line aggregation; cancel/reopen exactly once; invoice snapshots/idempotency; customer/product CRUD and reference protection; local role enforcement |
| Advanced (12) | Backup schema/relationship/total validation; import; clear/reset persistence; workflow deduplication; notification read/delete; focused AI context; order-frequency ranking; entity search; conversation lifecycle; offline refusal; unavailable service handling |
| Gemini boundary (7) | Environment configuration without secret disclosure; missing credentials; origin/input rejection; size/method limits; mocked Google transport and instructions; generic provider errors; per-instance rate limit |
| Platform (3) | UUID fallback without crypto.randomUUID; all five sound sequences with mute/autoplay checks; shell precaching and offline navigation fallback excluding Gemini |

IndexedDB automated tests use fake-indexeddb. Provider responses, Web Audio and service-worker globals are mocked in platform/security tests; no fabricated response is used by the application.

## Browser checks

- Landing page rendered and visually inspected; local SVG branding and bundled assets loaded.
- Local demo onboarding, dashboard navigation and refreshed startup checked.
- Dashboard displayed actual seeded revenue, customers, order status, inventory and charts.
- Created Maya Bennett / Northline Design through the customer form: total increased from 50 to 51 and the unread notification badge increased.
- Edited that customer to Northline Creative; searched and verified the edit after browser refresh, exercising real browser IndexedDB persistence.
- Opened global command palette and verified categorized customer/notification search results.
- Checked native customer dialog visually, including readable fields and visible save/cancel controls.
- Verified AI service unavailable state without fabricated replies and visually checked the dark theme.
- The final recent browser error check contained no application errors (browser-extension diagnostics excluded).

Fixed during browser QA: non-secure development preview UUID compatibility, startup loading race, onboarding stale-state redirect, and initial dialog input focus. Development hot updates can reset route state; verify saved results after a full reload when editing core providers.

## Remaining deployment/device acceptance checks

These are not claimed as verified:

1. Real Gemini response on the deployed Netlify Function with the owner's valid `GEMINI_API_KEY` and `GEMINI_MODEL`; actual provider quota/timeout behavior.
2. Installed PWA cold start and airplane-mode navigation on a production HTTPS origin. Caching logic is automated-tested, but the development preview does not register production service workers.
3. Physical mobile/tablet browser layouts, OS notification permissions/delivery and audible sound output. Responsive CSS and fallback logic exist; device coverage is not exhaustive.
4. Print/PDF pagination in target browsers; actual download/import file-picker UX across devices. Invoice calculations and backup services are covered by tests.
5. Full manual execution of every CRUD/status/automation/team/settings control. Core service operations are covered, but the browser smoke test is not an exhaustive end-to-end suite.
6. Netlify-hosted redirects, response security headers and deployment lifecycle. Configuration exists and the function bundles, but this session did not publish a site.

The application remains local/browser-based. No secure authentication, cloud synchronization, real payment processing or background server workflow execution is claimed.
