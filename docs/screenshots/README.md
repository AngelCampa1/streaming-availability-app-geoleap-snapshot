# Screenshot archive

Forty-seven screenshots, captured from GeoLeap running locally on 7 August 2026 against
PostgreSQL 16, Redis 7, the .NET API on port 8020 and the Next.js app on port 3020.

Nothing here is a mockup. Every image is a real page render. Reproduce them with:

```bash
npx playwright install chromium   # once, downloads the browser binary
node scripts/capture-screenshots.mjs
```

The script is [`scripts/capture-screenshots.mjs`](../../scripts/capture-screenshots.mjs).
Desktop captures are 1440x900, mobile 390x844, all full-page. The cookie consent
banner is dismissed with "Reject All" before each capture so it does not cover
content.

---

## marketing/

Public pages. These render entirely from local TypeScript data files in
`frontend/src/data/`, so they need neither the API nor a database.

| File | Route | What it shows |
|---|---|---|
| `home.png` | `/` | Landing page, search entry, feature grid |
| `pricing.png` | `/pricing` | Plan comparison and FAQ |
| `about.png` | `/about` | Product background |
| `faq.png` | `/faq` | Full FAQ |
| `help.png` | `/help` | Help centre |
| `vpn-guidance.png` | `/vpn-guidance` | VPN explainer |
| `privacy.png` | `/privacy` | Privacy policy with the portfolio-demo notice |
| `terms.png` | `/terms` | Terms with the portfolio-demo notice |
| `platforms-index.png` | `/platforms` | Index of 41 streaming platforms |
| `platform-detail.png` | `/platforms/netflix` | A generated platform page |
| `countries-index.png` | `/countries` | Index of 56 countries |
| `country-detail.png` | `/countries/japan` | A generated country page |
| `compare-index.png` | `/compare` | Index of 58 comparisons |
| `compare-detail.png` | `/compare/netflix-vs-hulu` | Side-by-side platform comparison |
| `genres-index.png` | `/genres` | Index of 38 genres |
| `genre-detail.png` | `/genres/k-drama` | A generated genre page |
| `sports-index.png` | `/sports` | Index of 47 sports |
| `sport-detail.png` | `/sports/premier-league` | A generated sports page |
| `unblock-index.png` | `/unblock` | Unblock hub |
| `glossary-index.png` | `/glossary` | Index of 105 terms |
| `glossary-term.png` | `/glossary/svod` | A glossary entry |
| `guides-index.png` | `/guides` | Index of 20 guides |
| `blog-index.png` | `/blog` | Index of 53 posts |
| `features-index.png` | `/features` | Feature pages index |
| `authors-index.png` | `/about/authors` | Author pages, for E-E-A-T signals |
| `auth-login.png` | `/auth/login` | Sign in |
| `auth-register.png` | `/auth/register` | Registration |
| `auth-forgot-password.png` | `/auth/forgot-password` | Password reset request |
| `search-empty.png` | `/search` | Search page, empty state |

The `platform-detail`, `country-detail`, `compare-detail`, `genre-detail` and
`sport-detail` pages are one example each of route families that generate hundreds
of pages.

**There is no `unblock-platform-country` capture.** The run pointed at
`/unblock/netflix/japan`, which returned 404, correctly. That page exists to explain
how to reach a service that is *not* available where you are, so
`[platform]/[country]/page.tsx:86` calls `notFound()` when the platform already works
in that country, and Netflix works in Japan. The URL was the mistake, not the route.
`scripts/capture-screenshots.mjs` now points at `/unblock/netflix/ireland`, which the
page does serve; the image is missing only because the local stack had been torn down
by the time this was found. Which of those pages are allowed into the
sitemap is decided by `frontend/src/lib/seo/page-governance.ts`.

## app/

Signed-in pages. These need the API and a database. Captured as the development
seed user (`test@example.com`) holding the `Admin` role.

| File | Route | What it shows |
|---|---|---|
| `dashboard.png` | `/dashboard` | Stat cards, quick actions, recent searches, watchlist, trending |
| `dashboard-watchlist.png` | `/dashboard/watchlist` | Watchlist panel |
| `dashboard-history.png` | `/dashboard/history` | Search history |
| `dashboard-trending.png` | `/dashboard/trending` | Trending content |
| `dashboard-subscriptions.png` | `/dashboard/subscriptions` | Subscription management |
| `dashboard-notifications.png` | `/dashboard/notifications` | Notification centre |
| `settings.png` | `/settings` | Account settings |
| `preferences.png` | `/preferences` | Content preferences |
| `watchlist.png` | `/watchlist` | Standalone watchlist |
| `upgrade.png` | `/upgrade` | Upgrade and paywall |
| `admin-dashboard.png` | `/admin/dashboard` | Admin overview |
| `admin-users.png` | `/admin/users` | User management |
| `admin-roles.png` | `/admin/roles` | Role and permission management |
| `admin-analytics.png` | `/admin/analytics` | Analytics |
| `admin-audit-logs.png` | `/admin/audit-logs` | Audit log viewer |

The database behind these holds ten seeded titles and one user, so counters read
zero and most lists show empty states. That is the honest state of a freshly seeded
instance rather than a rendering failure, and empty states were a deliberate design
surface here, so several of these images are showing them work.

Several caveats worth stating rather than hiding:

- **`admin-users.png` shows an empty table** even though one user exists. The page
  shell, navigation and column headers render, but no row appears. So this image
  demonstrates the admin layout and the RBAC gate, not a working user list.
- **`admin-analytics.png` is an error state, not a dashboard.** It shows "Error
  Loading Dashboard: Failed to fetch analytics: Forbidden". The seed user holds the
  `Admin` role, so this is an authorization gap between that role and whatever scope
  the analytics endpoint requires, not a rendering failure. It was captured as-is.
- **`admin-roles.png` renders an empty permission list.** The "All Available
  Permissions" heading appears with nothing under it. Permissions are static
  configuration rather than seeded rows, so the empty-database explanation above does
  not cover this one.
- **`admin-dashboard.png` shows placeholder figures, not data.** The 12,847 customers,
  $284,750 monthly revenue and 9,234 active subscriptions come from
  `generateMockMetrics()` in `frontend/src/components/admin/UnifiedAdminDashboard.tsx`,
  which is hardcoded and clearly named as mock in the source. No number on that screen
  was read from the database.
- **Captures were taken against a development build.** The Next.js dev indicator is
  visible in the lower-left of most images, and on five of them it is expanded to show
  an issue count. A production build would not carry it.
- **The API became unresponsive on `/api/auth/login` after the capture run.** Health
  checks still returned 200. The cause was not established, because the Docker
  environment on the capture machine was degrading at the same time (the published
  port relay for the original Postgres container had already failed). It is recorded
  here as an observation, not a diagnosis.

## responsive/

| File | Viewport | Route |
|---|---|---|
| `home-mobile.png` | 390x844 | `/` |
| `platform-detail-mobile.png` | 390x844 | `/platforms/netflix` |
| `pricing-mobile.png` | 390x844 | `/pricing` |

**There are no dark-mode captures, because the web app has no dark mode.** An earlier
version of this archive included `home-dark.png` and `platforms-index-dark.png`,
taken with Playwright's `colorScheme: 'dark'`. Both came back in light mode:
`platforms-index-dark.png` was byte-for-byte identical to the light capture. The
cause is not the capture script: no component in `frontend/src` uses a Tailwind
`dark:` variant, there is no `prefers-color-scheme` rule anywhere, and the custom
variant declared at `frontend/src/app/globals.css:4` is written backwards
(`@custom-variant dark (&:is(.light *))`). A `ThemeContext` exists and the
preferences screen offers the setting, but nothing downstream responds to it. The
two images were removed rather than relabelled.

---

## Coverage

The 47 images above cover every public and signed-in route captured for this snapshot. Two
formats are not included: mobile app screens, since capturing those needs a simulator or a
device and the Expo build was not stood up for this snapshot, and the Swagger UI, which the API
serves at `/swagger` when running and generates from XML doc comments across the 905 endpoints,
but a screenshot of an endpoint list carries less than the endpoint table in the README.
