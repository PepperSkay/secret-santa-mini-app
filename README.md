# Secret Santa Mini App

Праздничный Telegram Mini App / web preview для проекта «Тайный Санта».

## Vercel

Фронтенд работает с подключённым API бота и Telegram `initData`. Адрес API можно задать через `window.__SANTA_API_BASE__` перед загрузкой `assets/app.js`.

## Gameplay input regression tests

Run `npm ci` and `npm test`. The suite checks all 19 renderers at 53 game/level combinations, stable controls during rapid input, deferred IndexedDB/fallback persistence, and offline replay. Fixtures are synthetic and contain no participants.

The canonical UI is hosted on Vercel. The Amvera root redirects there; `/api/*` remains on the existing backend. Build identification is available as `document.documentElement.dataset.build`.

Block placement tests cover read-only landing previews, predicted line clears, touch lift, final release coordinates, overlap/edge rejection, cancellation, multi-touch, and frame coalescing. Hovering never sends moves or changes the score.

## Новогодняя сказка: коллекционные игрушки и ёлка

Thirty individually generated transparent ornaments, eighteen individually generated crafting material types, five generated navigation icons, a snowy navigation frame, and a generated winter town/tree scene. Prompt provenance: `assets/workshop/art-prompts-v2.json`. All runtime artwork is optimized WebP; no generated SVG collectibles or remote image dependencies remain.

Materials retain six rarity levels (108 combinations). Old inventory and running jobs remain valid. First-tier recipes still use familiar basic ingredients; additional material types unlock progressively with achievement difficulty. Quantity probabilities remain 1=50%, 2=25%, 3=12%, 4=8%, 5=5%.

The cabin UI and API have been removed. Opening the workshop returns any archived cabin decorations to the owner's inventory once, under the existing transaction lock. No user records or craft jobs are deleted.

The tree uses 63 branch anchors, with server-side snapping. Hover/touch preview, hanging cord, foreground needle occlusion, a short settling swing and local shadow ground each tiny ornament in the scene. Decorations remain unlimited and paginated. Snow twinkles and all motion respect the existing motion preferences. The original navigation timing is retained in a compact 74px bar with consistent outline icons. Shared safe-area offsets keep content and floating controls above the navigation.

Tests: `npm test`; backend: `python -m unittest test_workshop test_web_update -q`. Fixtures are isolated from production.
