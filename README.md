# Secret Santa Mini App

Праздничный Telegram Mini App / web preview для проекта «Тайный Санта».

## Vercel

Фронтенд работает с подключённым API бота и Telegram `initData`. Адрес API можно задать через `window.__SANTA_API_BASE__` перед загрузкой `assets/app.js`.

## Gameplay input regression tests

Run `npm ci` and `npm test`. The suite checks all 19 renderers at 53 game/level combinations, stable controls during rapid input, deferred IndexedDB/fallback persistence, and offline replay. Fixtures are synthetic and contain no participants.

The canonical UI is hosted on Vercel. The Amvera root redirects there; `/api/*` remains on the existing backend. Build identification is available as `document.documentElement.dataset.build`.

Block placement tests cover read-only landing previews, predicted line clears, touch lift, final release coordinates, overlap/edge rejection, cancellation, multi-touch, and frame coalescing. Hovering never sends moves or changes the score.

## Virtual-only Plinko

The separate «Азартные» tab uses authenticated `/api/plinko` and `/api/plinko/throw`. Minimum stake: 5 snowflakes. Outcomes: x0.2 (45%), x0.5 (45%), x1 (5%), x2 (3%), x5 (1.5%), x10 (0.5%). x1 is break-even; returns are rounded down to whole snowflakes and quoted before submission. The server chooses and settles the result atomically; the canvas animates that result locally.

Snowflakes and the iPhone figurine are closed-loop virtual game content, without sale, transfer, redemption, Stars exchange, or real-world prizes. Requests have persistent idempotency keys for safe network retries. Tests cover all landing slots, duplicate submissions, offline retry, stale responses after navigation, and both animated and reduced-motion completion.
