# Secret Santa Mini App

Праздничный Telegram Mini App / web preview для проекта «Тайный Санта».

## Vercel

Фронтенд работает с подключённым API бота и Telegram `initData`. Адрес API можно задать через `window.__SANTA_API_BASE__` перед загрузкой `assets/app.js`.

## Gameplay input regression tests

Run `npm ci` and `npm test`. The suite checks all 19 renderers at 53 game/level combinations, stable controls during rapid input, deferred IndexedDB/fallback persistence, and offline replay. Fixtures are synthetic and contain no participants.

The canonical UI is hosted on Vercel. The Amvera root redirects there; `/api/*` remains on the existing backend. Build identification is available as `document.documentElement.dataset.build`.

Block placement tests cover read-only landing previews, predicted line clears, touch lift, final release coordinates, overlap/edge rejection, cancellation, multi-touch, and frame coalescing. Hovering never sends moves or changes the score.

## Local Yermak typography

The Mini App uses a self-hosted DS Yermak_D webfont in all UI text, including controls and admin forms. The Telegram chat appearance is unchanged. `assets/fonts/YERMAK-NOTICE.txt` records the source and author attribution. The UI font completes Cyrillic Yo/Yery from the existing glyph shapes; unsupported digits and punctuation use the serif fallback. Rebuild with `scripts/build-yermak.py` and `fonttools[woff]==4.60.1`.
