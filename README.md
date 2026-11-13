# Secret Santa Mini App

Праздничный Telegram Mini App / web preview для проекта «Тайный Санта».

## Vercel

Фронтенд работает с подключённым API бота и Telegram `initData`. Адрес API можно задать через `window.__SANTA_API_BASE__` перед загрузкой `assets/app.js`.

## Gameplay input regression tests

Run `npm ci` and `npm test`. The suite checks all 19 renderers at 53 game/level combinations, stable controls during rapid input, deferred IndexedDB/fallback persistence, and offline replay. Fixtures are synthetic and contain no participants.

The canonical UI is hosted on Vercel. The Amvera root redirects there; `/api/*` remains on the existing backend. Build identification is available as `document.documentElement.dataset.build`.

Block placement tests cover read-only landing previews, predicted line clears, touch lift, final release coordinates, overlap/edge rejection, cancellation, multi-touch, and frame coalescing. Hovering never sends moves or changes the score.

## Новогодняя сказка: домик, мастерская и ёлка

Authenticated `/api/workshop` shares the existing bot user database. Thirty gifts: five models at each of six tiers. Craft times: 15/45/90/180/360/720 minutes. Eighteen material types and authoritative 3x3 recipes are supplied by the API. Three simultaneous jobs per player; server timestamps determine readiness. Completed jobs grant inventory only once, including safe retries after a network failure.

Verified first level completions and record milestones (250, 500, 1000, then doubling) award materials. Amount distribution: 1=50%, 2=25%, 3=12%, 4=8%, 5=5%. Existing confirmed achievements are backfilled once; replays and profile recreation cannot duplicate them. Materials and decorations have no payment, wagering, transfer or cash-out routes.

The shared Christmas tree has no inventory capacity limit. Cursor pages render at most 60 decorations at once. Only an owner can remove a decoration, returning the same toy once. The personal cabin offers three scenes, lighting, authenticated visiting via a random public code, and one like per visitor. Public views omit INN, wishes and inventories. Original SVG artwork is local; only visible timers tick, and no game input waits for workshop requests. The leaderboard remains reachable from home and profile.

`npm test` includes wrong-layout rejection, double-submit protection, durable network retry, stale-page responses, storage failure and timer disposal. Backend: `python -m unittest test_workshop test_web_update -q` in an isolated database.
