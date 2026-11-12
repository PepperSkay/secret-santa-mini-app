/* Christmas arcade preview. Animation: GSAP timelines + motion-principles recipes. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const fmt = (x) => Number(x || 0).toLocaleString("ru-RU");
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();
  const motion = () =>
    !S.reduce &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    window.gsap;
  const view = $("#view"),
    scene = $("#scene"),
    nav = $("#nav");
  const games = [
    {
      id: "match3",
      name: "Три в ряд",
      sub: "Новогодние каскады",
      genre: "Логика",
      icon: "🍬",
      desc: "Меняй соседние фишки местами. Линии от трёх одинаковых исчезают, а новые фишки падают сверху. Набери цель до окончания ходов. Каскады умножают очки.",
    },
    {
      id: "mahjong",
      name: "Новогодний маджонг",
      sub: "Найди свою пару",
      genre: "Логика",
      icon: "🀄",
      desc: "Собирай одинаковые пары. Плитка доступна, если сверху ничего нет и хотя бы один её бок свободен. Выбирай пары так, чтобы не перекрыть остальные.",
    },
    {
      id: "tree",
      name: "Укрась ёлку",
      sub: "Запомни волшебство",
      genre: "Память",
      icon: "🎄",
      desc: "Запомни образец, затем расставь все игрушки. Их можно менять местами до проверки. Когда всё готово, нажми «Проверить ёлку». Ошибка завершает попытку: в новой будет другой образец.",
    },
    {
      id: "puzzle",
      name: "Снежные пазлы",
      sub: "Собери зимнюю сказку",
      genre: "Пазлы",
      icon: "🧩",
      desc: "36 фрагментов без номеров, новая зимняя картина на каждом уровне. Коснись двух фрагментов или перетащи один на другой. Собери картинку за ограниченное число ходов.",
    },
    ...window.WinterExtras.games,
  ];
  const levelGames = games.filter((game) => !game.endless);
  let S = {
    tab: "home",
    me: null,
    progress: { levels: [], records: {}, score: 0, wins: 0 },
    session: null,
    selected: null,
    ornament: 0,
    busy: false,
    game: null,
    level: 1,
    filter: "Все",
    search: "",
    favorites: loadStorage("santa.favorites", []),
    avatar: loadStorage("santa.avatar", "⛄"),
    snow: loadStorage("santa.snow", true),
    reduce: loadStorage("santa.reduce", false),
  };
  let pageToken = 0,
    timer = null,
    toastTimer,
    gameEpoch = 0;
  function loadStorage(k, fallback) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? fallback;
    } catch {
      return fallback;
    }
  }
  function save(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  }
  function icon(name) {
    const p = {
      home: "M3 11 12 3l9 8v10h-6v-6H9v6H3Z",
      games:
        "M7 7h10c3 0 5 11 2 12-2 1-4-4-7-4s-5 5-7 4C2 18 4 7 7 7ZM7 11v5m-2-2h4m7-2h.01m2 3h.01",
      cup: "M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3c0 3 3 4 5 4m7-7h4v3c0 3-3 4-5 4m-3 1v6m-4 2h8",
      profile: "M20 21v-3a8 8 0 0 0-16 0v3M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
      snow: "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M8 4l4 3 4-3M8 20l4-3 4 3",
      heart: "M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-5 5 2 11 8 16 6-5 13-11 8-16Z",
      gift: "M3 8h18v4H3Zm2 4v9h14v-9M12 8v13M12 8C4 9 5 1 9 3c3 1 3 5 3 5Zm0 0c8 1 7-7 3-5-3 1-3 5-3 5Z",
      list: "M6 3h12v18H6ZM9 7h6m-6 5h6m-6 5h4",
      support:
        "M4 16v-4a8 8 0 0 1 16 0v4M4 11H2v7h4v-7Zm16 0h2v7h-4v-7Zm0 7c0 3-4 4-8 4",
      share:
        "M8 12 17 6M8 12l9 6M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM22 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
      back: "m14 5-7 7 7 7",
      gear: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 2h6l1 4 4 1 2 5-3 3-1 5-6 2-3-3-5-1-2-6 3-3 1-4Z",
    };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${p[name] || p.gift}"/></svg>`;
  }
  function toast(text) {
    clearTimeout(toastTimer);
    $("#toast").textContent = text;
    $("#toast").classList.add("show");
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
  }
  async function api(path, opts = {}) {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch((window.__SANTA_API_BASE__ || "") + path, {
        ...opts,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Init-Data": tg?.initData || "",
          ...(opts.headers || {}),
        },
      });
      const data = await response
        .json()
        .catch(() => ({ error: "Сервер временно недоступен" }));
      if (!response.ok)
        throw Error(data.error || "Не удалось выполнить действие");
      return data;
    } catch (e) {
      if (e.name === "AbortError")
        throw Error("Долго нет ответа. Проверь соединение и попробуй снова.");
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }
  const post = (path, body) =>
    api(path, { method: "POST", body: JSON.stringify(body) });
  function animateIn() {
    const avatar = $(".avatar");
    if (avatar && S.avatar === "⛄") {
      avatar.classList.add("photo-avatar");
      if (avatar.firstChild.nodeType === 3) avatar.firstChild.textContent = "";
    }
    if (motion())
      gsap.fromTo(
        view.children,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.48,
          ease: "power3.out",
          stagger: 0.045,
          clearProps: "transform,opacity,visibility",
        },
      );
  }
  function snow() {
    const el = $("#snowfall");
    el.innerHTML = "";
    gsapIf(() => gsap.killTweensOf(".snow-dot"));
    if (!S.snow || !motion()) return;
    for (let i = 0; i < 14; i++) {
      const d = document.createElement("i");
      d.className = "snow-dot";
      d.style.left = i * 7.3 + "%";
      d.style.top = "-8px";
      el.append(d);
      gsap.fromTo(
        d,
        { y: -10, x: 0, opacity: 0.3 + Math.random() * 0.6 },
        {
          y: 270,
          x: 20 + Math.random() * 35,
          duration: 5 + Math.random() * 6,
          delay: -Math.random() * 8,
          ease: "none",
          repeat: -1,
        },
      );
    }
  }
  function gsapIf(fn) {
    if (window.gsap) fn();
  }
  function header(title = "", type = "compact") {
    scene.className =
      "scene " +
      (type === "home" ? "" : type === "profile" ? "profile-scene" : "compact");
    $("#topbar").innerHTML =
      `${S.tab === "home" ? '<span class="wordmark">Тайный Санта 🎅</span>' : `<button class="icon-button" data-tab="home" aria-label="На главную">${icon("back")}</button>`}<div class="controls"><span class="pill">${icon("snow")}${fmt(S.me?.user?.snowflakes)}</span>${type === "profile" ? `<button class="icon-button" id="settings" aria-label="Настройки">${icon("gear")}</button>` : `<button class="avatar-mini" data-tab="profile" aria-label="Профиль">${esc(S.avatar)}</button>`}</div>`;
    $("#settings")?.addEventListener("click", settingsSheet);
    $("#scene-title").innerHTML =
      type === "profile"
        ? ""
        : `<div class="hero-copy">${type === "home" ? "<small>Рублёвка играет</small><h1>Твоя зимняя<br>сказка начинается</h1>" : `<h1>${esc(title)}</h1>`}</div>`;
  }
  function setupNav() {
    nav.innerHTML =
      '<div id="nav-glow"></div>' +
      [
        ["home", "Главная", "home"],
        ["games", "Все игры", "games"],
        ["rating", "Рейтинги", "cup"],
        ["profile", "Профиль", "profile"],
      ]
        .map(
          ([id, title, i]) =>
            `<button data-tab="${id}" aria-label="${title}">${icon(i)}<span>${title}</span></button>`,
        )
        .join("");
  }
  function navTo(tab) {
    const index = ["home", "games", "rating", "profile"].indexOf(tab);
    if (index < 0) return;
    nav.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tab);
      b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
    });
    if (motion()) {
      gsap.to("#nav-glow", {
        xPercent: index * 100,
        duration: 0.48,
        ease: "power3.out",
        overwrite: true,
      });
      gsap.fromTo(
        nav.querySelector(`[data-tab="${tab}"] svg`),
        { y: 5, scale: 0.86 },
        { y: 0, scale: 1, duration: 0.5, ease: "back.out(2)", overwrite: true },
      );
    } else $("#nav-glow").style.transform = `translateX(${index * 100}%)`;
  }
  async function navigate(tab) {
    if (S.me?.user.active === false) {
      registration();
      return;
    }
    if (S.busy) return toast("Дождись завершения хода");
    closeSheet();
    clearTimeout(timer);
    gameEpoch++;
    const token = ++pageToken;
    const old = ["home", "games", "rating", "profile"].indexOf(S.tab),
      next = ["home", "games", "rating", "profile"].indexOf(tab);
    view.style.pointerEvents = "none";
    if (motion() && view.children.length)
      await gsap.to(view, {
        opacity: 0,
        x: next < old ? 25 : -25,
        duration: 0.16,
        ease: "power2.in",
      });
    if (token !== pageToken) return;
    S.tab = tab;
    S.session = null;
    S.selected = null;
    view.style.cssText = "";
    navTo(tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (tab === "home") home();
    else if (tab === "games") allGames();
    else if (tab === "rating") await rating();
    else if (tab === "profile") profile();
    else if (tab === "favorites") favorites();
    else if (tab === "catalog") await catalog();
    else if (tab === "support") support();
    else if (tab === "referral") await referral();
    else if (tab === "wishlist") wishlist();
    else if (tab === "snow") await snowHistory();
    else if (tab === "orders") await orders();
    if (token === pageToken) animateIn();
  }
  function gameCard(g) {
    const done = S.progress.levels.filter((l) => l.game === g.id).length;
    const record = S.progress.records?.[g.id] || 0;
    return `<button class="game-card" data-game="${g.id}" aria-label="${esc(g.name)}"><span class="game-art ${g.id}"><span class="badge">${g.endless ? "∞ РЕКОРД" : "❄ 3–8"}</span></span><strong>${g.name}</strong><small>${g.endless ? `Рекорд: ${fmt(record)}` : `${done}/10 уровней`}</small></button>`;
  }
  function head(text, tab) {
    return `<div class="section-head"><h2>${text}</h2>${tab ? `<button data-tab="${tab}" aria-label="Показать всё">›</button>` : ""}</div>`;
  }
  function quickLinks() {
    return `<div class="quick-grid">${[
      ["catalog", "gift", "Каталог Санты"],
      ["referral", "share", "Пригласить друга"],
      ["wishlist", "list", "Мой вишлист"],
      ["support", "support", "Помощь деда"],
    ]
      .map(
        ([t, i, l]) =>
          `<button class="quick" data-tab="${t}">${icon(i)}${l}</button>`,
      )
      .join("")}</div>`;
  }
  function home() {
    header("", "home");
    const latest = S.progress.levels.at(-1);
    view.innerHTML = `<div class="categories">${[
      ["❄", "Новогодние", "games"],
      ["🔥", "Популярные", "games"],
      ["✦", "Новые", "games"],
      ["♥", "Для тебя", "favorites"],
      ["▦", "Все игры", "games"],
    ]
      .map(
        ([i, t, p], n) =>
          `<button data-tab="${p}" class="${n === 0 ? "selected" : ""}"><span>${i}</span>${t}</button>`,
      )
      .join(
        "",
      )}</div>${head("Подборка к празднику 🎁", "games")}<div class="games-grid">${games.slice(0, 4).map(gameCard).join("")}</div>${head("Ещё больше зимних игр", "games")}<div class="games-grid new-games">${games.slice(4).map(gameCard).join("")}</div>${head(latest ? "Продолжим волшебство?" : "Начни свою историю", "games")}<button class="panel quest wide" data-game="${latest?.game || "match3"}"><span class="quest-art">${games.find((g) => g.id === latest?.game)?.icon || "🍬"}</span><div><h3>${latest ? games.find((g) => g.id === latest.game).name : "Три в ряд"}</h3><p>${latest ? `Следующий уровень ждёт тебя` : "Собирай каскады и первые снежинки"}</p></div><span class="chevron">›</span></button>${head("Твой зимний сезон")}<section class="panel"><div class="row"><h3>${S.progress.wins} из ${levelGames.length * 10} уровней</h3><span>${fmt(S.progress.score)} 🏆</span></div><div class="progress"><span style="width:${(S.progress.wins / (levelGames.length * 10)) * 100}%"></span></div><div class="progress-text"><span>Играй в своём темпе</span><span>До ${levelGames.length * 53} ❄ за уровни · 2 игры на рекорд</span></div></section>${head("Санта рядом")}${quickLinks()}<div class="info-foot"><button class="snow-control" id="snow-toggle">${S.snow ? "Приостановить" : "Включить"} снег</button></div>`;
    $("#snow-toggle").onclick = () => {
      S.snow = !S.snow;
      save("santa.snow", S.snow);
      snow();
      home();
    };
  }
  function allGames() {
    header("Все игры");
    view.innerHTML = `<input class="search" id="search" aria-label="Поиск игр" placeholder="⌕  Поиск игр" value="${esc(S.search)}"><div class="filter-row">${["Все", "Логика", "Память", "Пазлы"].map((f) => `<button class="filter ${S.filter === f ? "selected" : ""}" data-filter="${f}">${f}</button>`).join("")}</div><div class="games-grid large" id="game-list"></div><p class="info-foot">${games.length} игр · ${levelGames.length * 10} уровней · 2 игры на рекорд · один общий рейтинг</p>`;
    filterGames();
    $("#search").oninput = (e) => {
      S.search = e.target.value;
      filterGames();
    };
    view.querySelectorAll("[data-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          S.filter = b.dataset.filter;
          allGames();
        }),
    );
  }
  function filterGames() {
    const list = games.filter(
      (g) =>
        (S.filter === "Все" || g.genre === S.filter) &&
        g.name.toLowerCase().includes(S.search.toLowerCase()),
    );
    $("#game-list").innerHTML =
      list.map(gameCard).join("") || '<p class="empty">Такой игры пока нет</p>';
  }
  async function rating() {
    header("Рейтинги");
    view.innerHTML =
      '<div class="leader-tabs"><span>🏆 Общий рейтинг игроков</span></div><div class="initial"><span class="spinner"></span>Собираем результаты…</div>';
    try {
      const r = await api("/api/games/leaderboard");
      if (S.tab !== "rating") return;
      view.innerHTML = `<div class="leader-tabs"><span>🏆 Общий рейтинг игроков</span></div><section class="panel">${r.players.map((p, i) => `<div class="ranking-row ${p.me ? "me" : ""}"><span>${["🥇", "🥈", "🥉"][i] || i + 1}</span><span class="rank-avatar">${p.me ? esc(S.avatar) : "⛄"}</span><span>${esc(p.name)}${p.me ? " <small>это ты</small>" : ""}</span><strong class="rank-score">${fmt(p.score)}</strong></div>`).join("") || `<div class="empty">${icon("cup")}<h3>Первое место свободно</h3><p>Пройди уровень и открой зимнюю таблицу лидеров.</p><button class="primary wide" data-tab="games">Выбрать игру</button></div>`}</section><p class="info-foot">Сумма лучших результатов всех уровней.<br>Повторное прохождение улучшает очки, а не снежинки.</p>`;
    } catch (e) {
      view.innerHTML = `<section class="panel"><p>${esc(e.message)}</p><button class="secondary wide" data-tab="rating">Повторить</button></section>`;
    }
  }
  function profile() {
    header("", "profile");
    const u = S.me.user,
      level = Math.floor(S.progress.score / 3000) + 1,
      xp = S.progress.score % 3000;
    view.innerHTML = `<section class="profile-head"><div class="avatar">${esc(S.avatar)}<button class="avatar-edit" id="avatar-edit" aria-label="Изменить аватар">✎</button></div><h1>${esc(u.alias)}</h1><p>Уровень ${level}</p></section><div class="profile-xp"><div class="progress"><span style="width:${(xp / 3000) * 100}%"></span></div><div class="progress-text"><span>${fmt(S.progress.score)} очков</span><span>${fmt(xp)} / 3 000</span></div></div><div class="stat-grid"><div class="stat">${icon("games")}<strong>${S.progress.wins}</strong><small>Уровней пройдено</small></div><div class="stat">${icon("cup")}<strong>${fmt(S.progress.score)}</strong><small>Общий рейтинг</small></div><div class="stat">${icon("snow")}<strong>${fmt(u.snowflakes)}</strong><small>Снежинки</small></div></div><button class="panel gift-banner wide" data-tab="wishlist"><h2>🎁 Мой Тайный Санта</h2><p>${S.me.assignment ? "Получатель уже ждёт твой подарок" : "Вишлист готов. Ждём распределения!"}</p></button><section class="panel menu-list">${[
      ["account", "profile", "Моя анкета и ИНН"],
      ["wishlist", "list", "Мой вишлист"],
      ["snow", "snow", "История снежинок"],
      ["favorites", "heart", "Избранные игры"],
      ["referral", "share", "Пригласить друга"],
      ["orders", "list", "Мои заказы"],
      ["catalog", "gift", "Каталог Санты"],
      ["support", "support", "Помощь деда"],
    ]
      .map(
        ([t, i, l]) =>
          `<button class="menu-row" ${t === "account" ? 'id="account"' : `data-tab="${t}"`}>${icon(i)}<span>${l}</span><span class="chevron">›</span></button>`,
      )
      .join(
        "",
      )}${S.me.is_admin ? '<button class="menu-row" id="admin-open">⚙ <span>Админ-панель</span><span class="chevron">›</span></button>' : ""}</section>`;
    $("#avatar-edit").onclick = avatarSheet;
    $("#account").onclick = accountSheet;
    $("#admin-open")?.addEventListener("click", () => {
      sheet(
        '<h2>Админ-панель</h2><p>Действующая панель сохранена. В отдельном превью действия с реальными пользователями отключены.</p><button class="secondary wide" id="legacy-admin">Посмотреть разделы панели</button>',
      );
      $("#legacy-admin").onclick = () =>
        sheet(
          '<h2>Панель администратора</h2><p>Участники · поиск · активные · снежинки · траты Stars · рефералы · сообщения · блокировка · каталог · цены · тексты · стикеры · поддержка · рассылки · распределение · аудит.</p><p class="notice">Эти разделы остаются в действующей панели. Их подключение к новому оформлению выполняется при переносе превью.</p>',
        );
    });
  }
  function favorites() {
    header("Избранные игры");
    view.innerHTML = `<div class="games-grid large">${games
      .filter((g) => S.favorites.includes(g.id))
      .map(gameCard)
      .join(
        "",
      )}</div>${!S.favorites.length ? '<div class="panel empty">♥<h3>Сохрани зимние любимчики</h3><p>Открой игру и нажми сердечко.</p><button class="primary wide" data-tab="games">Найти свою игру</button></div>' : ""}`;
  }
  function avatarSheet() {
    sheet(
      '<h2>Твой зимний герой</h2><div class="ornament-tools">' +
        ["⛄", "🎅", "🦊", "🐻‍❄️", "🐧", "🦌"]
          .map((a) => `<button data-avatar="${a}">${a}</button>`)
          .join("") +
        "</div>",
    );
    $("#overlay")
      .querySelectorAll("[data-avatar]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.avatar = b.dataset.avatar;
            save("santa.avatar", S.avatar);
            closeSheet();
            profile();
            animateIn();
          }),
      );
  }
  function settingsSheet() {
    sheet(
      `<h2>Настройки</h2><label class="menu-row"><input id="reduce-motion" type="checkbox" ${S.reduce ? "checked" : ""}> Уменьшить анимации</label><label class="menu-row"><input id="enable-snow" type="checkbox" ${S.snow ? "checked" : ""}> Падающий снег</label><p class="notice">Настройки сохраняются на этом устройстве. Системное уменьшение движения учитывается автоматически.</p>`,
    );
    $("#reduce-motion").onchange = (e) => {
      S.reduce = e.target.checked;
      save("santa.reduce", S.reduce);
      document.documentElement.classList.toggle("reduced-motion", S.reduce);
      snow();
    };
    $("#enable-snow").onchange = (e) => {
      S.snow = e.target.checked;
      save("santa.snow", S.snow);
      snow();
    };
  }
  function accountSheet() {
    const u = S.me.user;
    sheet(
      `<h2>Моя анкета</h2><dl class="profile-data"><dt>Индивидуальный Новогодний Номер</dt><dd class="inn">${esc(u.inn || "—")}</dd><dt>Имя</dt><dd>${esc(u.alias)}</dd><dt>Username</dt><dd>@${esc(u.username || "—")}</dd><dt>Участие</dt><dd>${S.me.assignment ? "Получатель назначен" : "Ожидает распределения"}</dd><dt>Приглашено друзей</dt><dd>${S.me.referrals || 0}</dd></dl><p class="notice">ИНН и вишлист видны только тебе и администраторам.</p><button class="danger wide" id="delete-profile">Удалить анкету</button>`,
    );
    $("#delete-profile").onclick = () => {
      sheet(
        '<h2>Удалить анкету?</h2><p>Участие в обмене будет отключено. Для возвращения понадобится снова добавить анкету. Повторные награды за уже пройденные уровни не начисляются.</p><button class="danger wide" id="confirm-delete">Да, удалить анкету</button><button class="secondary wide" id="cancel-delete">Сохранить анкету</button>',
      );
      $("#cancel-delete").onclick = accountSheet;
      $("#confirm-delete").onclick = async (e) => {
        e.target.disabled = true;
        try {
          await api("/api/profile", { method: "DELETE" });
          closeSheet();
          S.tab = "home";
          await boot();
        } catch (x) {
          toast(x.message);
          e.target.disabled = false;
        }
      };
    };
  }
  function wishlist() {
    header("Мой вишлист");
    view.innerHTML = `<section class="panel"><h2>Что тебя порадует?</h2><p style="margin:10px 0">Твой Санта увидит этот список после распределения.</p><form id="wish" class="stack"><label>Пожелания<textarea name="wishlist" maxlength="1500" minlength="2" required>${esc(S.me.user.wishlist)}</textarea></label><button class="primary">Сохранить вишлист</button></form></section>${S.me.assignment ? `<section class="panel"><h3>Твой получатель: ${esc(S.me.assignment.alias)}</h3><p>${esc(S.me.assignment.wishlist)}</p></section>` : ""}`;
    $("#wish").onsubmit = async (e) => {
      e.preventDefault();
      const b = e.submitter;
      b.disabled = true;
      try {
        const w = new FormData(e.target).get("wishlist");
        await api("/api/wishlist", {
          method: "PUT",
          body: JSON.stringify({ wishlist: w }),
        });
        S.me.user.wishlist = w;
        toast("Вишлист сохранён");
      } catch (x) {
        toast(x.message);
      } finally {
        b.disabled = false;
      }
    };
  }
  async function snowHistory() {
    header("Мои снежинки");
    view.innerHTML =
      '<div class="initial"><span class="spinner"></span>Загружаем историю…</div>';
    try {
      const d = await api("/api/snowflakes");
      if (S.tab !== "snow") return;
      view.innerHTML = `<section class="panel"><h1>❄ ${fmt(d.balance)}</h1><p style="margin-top:8px">Твои снежинки за участие, друзей, покупки и первые победы в играх.</p></section><section class="panel">${d.history.map((h) => `<div class="menu-row"><span>${esc(h.reason)}</span><strong style="margin-left:auto">${h.amount > 0 ? "+" : ""}${h.amount} ❄</strong></div>`).join("") || "<p>История пока пуста</p>"}</section>`;
    } catch (e) {
      toast(e.message);
    }
  }
  async function catalog() {
    header("Каталог Санты");
    try {
      const c = await api("/api/catalog");
      if (S.tab !== "catalog") return;
      view.innerHTML = `<section class="panel"><h2>Слова, которые греют</h2>${[
        ["Анонимное поздравление", c.custom_price],
        ["Фирменное от Санты", c.official_price],
      ]
        .map(
          ([n, p]) =>
            `<div class="menu-row"><span>${n}</span><button class="secondary demo-pay" style="margin-left:auto">${p} ⭐ · ❄ ${Math.floor(p * 0.2)}</button></div>`,
        )
        .join(
          "",
        )}</section>${head("Наш мерч")}<section class="panel">${c.products.map((p) => `<div class="menu-row"><span>${esc(p.name)}</span><button class="secondary demo-pay">${p.price} ⭐ · ❄ ${p.snowflakes}</button></div>`).join("") || "<p>Товары пока не опубликованы.</p>"}</section><p class="notice">Это отдельное превью. Оплата реальными Stars здесь отключена.</p>`;
      view
        .querySelectorAll(".demo-pay")
        .forEach(
          (b) =>
            (b.onclick = () => toast("Оплата доступна в действующем боте")),
        );
    } catch (e) {
      toast(e.message);
    }
  }
  async function referral() {
    header("Пригласи друга");
    try {
      const d = await api("/api/referral");
      if (S.tab !== "referral") return;
      view.innerHTML = `<section class="panel gift-banner"><h2>Вместе веселее 🎁</h2><p>Тебе в сумме 200 снежинок,<br>другу в сумме 150.</p></section><section class="panel"><p>Твоя ссылка</p><p style="overflow-wrap:anywhere;margin:12px 0">${esc(d.url)}</p><button class="primary wide" id="share">Поделиться</button><button class="secondary wide" id="copy">Скопировать ссылку</button></section>`;
      $("#copy").onclick = async () => {
        try {
          await navigator.clipboard.writeText(d.url);
          toast("Скопировано");
        } catch {
          toast("Скопируй ссылку из текста");
        }
      };
      $("#share").onclick = () => {
        if (tg?.openTelegramLink)
          tg.openTelegramLink(
            "https://t.me/share/url?url=" + encodeURIComponent(d.url),
          );
        else if (navigator.share)
          navigator.share({ url: d.url }).catch(() => {});
        else $("#copy").click();
      };
    } catch (e) {
      toast(e.message);
    }
  }
  function support() {
    header("Помощь деда");
    view.innerHTML =
      '<section class="panel"><h2>Дед на связи</h2><p style="margin:12px 0">Опиши свой вопрос. Админы видят отправителя, а ты получаешь ответ от бота.</p><form id="support" class="stack"><label>Сообщение<textarea name="body" maxlength="2000" required placeholder="Что случилось?"></textarea></label><button class="primary">Отправить</button></form></section>';
    $("#support").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await post("/api/support", {
          body: new FormData(e.target).get("body"),
        });
        toast("Вопрос отправлен");
      } catch (x) {
        toast(x.message);
      }
    };
  }
  async function orders() {
    header("Мои заказы");
    try {
      const d = await api("/api/orders");
      if (S.tab !== "orders") return;
      view.innerHTML = `<section class="panel">${d.orders.map((o) => `<div class="menu-row"><span>${esc(o.kind)} · ${esc(o.status)}</span><strong>${o.amount} ⭐</strong></div>`).join("") || '<div class="empty">Заказов пока нет</div>'}</section>`;
    } catch (e) {
      toast(e.message);
    }
  }
  function openLevels(game) {
    if (S.me?.user.active === false) {
      registration();
      return;
    }
    clearTimeout(timer);
    gameEpoch++;
    S.game = game;
    S.session = null;
    S.tab = "levels";
    header("Зимние приключения");
    navTo("games");
    const g = games.find((g) => g.id === game);
    if (g.endless) {
      const record = S.progress.records?.[game] || 0;
      view.innerHTML = `<section class="level-hero"><span class="game-art ${game}"></span><div><h1>${g.name}</h1><p>Бесконечная игра · ${g.genre}</p></div><button class="icon-button" id="favorite" aria-label="В избранное">${S.favorites.includes(game) ? "💜" : "♡"}</button></section><p class="game-instructions">${g.desc}</p><section class="panel"><div class="row"><div><small>Твой максимальный рекорд</small><h2>${fmt(record)} очков</h2></div><span style="font-size:34px">🏆</span></div><p class="notice">Уровней нет: играй сколько сможешь. Новый рекорд сохраняется после каждого удачного хода, даже если закрыть игру.</p><button class="primary wide" id="start-record">Начать игру</button></section><button class="secondary wide" data-tab="games">Все игры</button>`;
      $("#start-record").onclick = () => startGame(game, 0);
      $("#favorite").onclick = () => {
        S.favorites = S.favorites.includes(game)
          ? S.favorites.filter((x) => x !== game)
          : [...S.favorites, game];
        save("santa.favorites", S.favorites);
        $("#favorite").textContent = S.favorites.includes(game) ? "💜" : "♡";
      };
      animateIn();
      return;
    }
    const passed = new Set(
      S.progress.levels.filter((x) => x.game === game).map((x) => x.level),
    );
    view.innerHTML = `<section class="level-hero"><span class="game-art ${game}"></span><div><h1>${g.name}</h1><p>10 уровней · ${g.genre}</p></div><button class="icon-button" id="favorite" aria-label="В избранное">${S.favorites.includes(game) ? "💜" : "♡"}</button></section><p class="game-instructions">${g.desc}</p><div class="levels">${Array.from(
      { length: 10 },
      (_, i) => {
        const l = i + 1,
          locked = l > 1 && !passed.has(l - 1),
          best = S.progress.levels.find(
            (b) => b.game === game && b.level === l,
          );
        return `<button class="level ${locked ? "locked" : passed.has(l) ? "done" : ""}" data-level="${l}" ${locked ? "disabled" : ""}>${locked ? "♙" : passed.has(l) ? "✓" : l}<small>${best ? fmt(best.score) + " оч." : "❄ " + (l <= 3 ? 3 : l <= 7 ? 5 : 8)}</small></button>`;
      },
    ).join(
      "",
    )}</div><p class="notice">Снежинки — только за первую победу. Повторно можно улучшить очки. Следующий уровень открывается после победы.</p><button class="secondary wide" data-tab="games">Все игры</button>`;
    $("#favorite").onclick = () => {
      S.favorites = S.favorites.includes(game)
        ? S.favorites.filter((x) => x !== game)
        : [...S.favorites, game];
      save("santa.favorites", S.favorites);
      $("#favorite").textContent = S.favorites.includes(game) ? "💜" : "♡";
      if (motion())
        gsap.fromTo(
          "#favorite",
          { scale: 0.8, rotation: -15 },
          { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" },
        );
    };
    view
      .querySelectorAll("[data-level]")
      .forEach((b) => (b.onclick = () => startGame(game, +b.dataset.level)));
    animateIn();
  }
  async function startGame(game, level) {
    if (S.busy) return;
    S.busy = true;
    const epoch = ++gameEpoch;
    try {
      const d = await post("/api/games/start", { game, level });
      if (epoch !== gameEpoch) return;
      S.session = d;
      S.game = game;
      S.level = level;
      S.selected = null;
      S.ornament = 0;
      S.tab = "playing";
      header(games.find((g) => g.id === game).name);
      scene.classList.add("play-scene");
      navTo("games");
      drawGame();
      animateIn();
    } catch (e) {
      toast(e.message);
    } finally {
      S.busy = false;
    }
  }
  const symbols = ["🎁", "🎄", "⭐", "❄️", "🔔", "🧦", "🍬", "⛄"];
  function treeSvg() {
    return `<svg class="tree-silhouette" viewBox="0 0 300 360" aria-hidden="true"><defs><linearGradient id="fir" x2=".7" y2="1"><stop stop-color="#378779"/><stop offset="1" stop-color="#173e43"/></linearGradient></defs><rect x="134" y="292" width="32" height="53" rx="5" fill="#6e4266"/><path d="m150 12-65 101h30L57 193h42L22 295q126 43 256 0l-77-102h42l-58-80h30Z" fill="url(#fir)" stroke="#75b3a77a" stroke-width="2"/><path d="m150 12-65 101q67 13 130 0M57 193q95 20 186 0M22 295q126 43 256 0" fill="none" stroke="#b8d7e0" stroke-width="8" stroke-linecap="round"/><path d="m150 1 8 17 19 2-14 12 4 19-17-10-17 10 4-19-14-12 19-2Z" fill="#ffe199" stroke="#ffc451" stroke-width="3"/></svg>`;
  }
  function treeCoords(i, count) {
    const rows = count <= 9 ? 3 : count <= 14 ? 4 : 5;
    let points = [];
    for (let row = 0; row < rows; row++) {
      const num = row + 2;
      for (let col = 0; col < num; col++)
        points.push([
          50 + (col - (num - 1) / 2) * (17 - row),
          28 + row * (48 / (rows - 1)),
        ]);
    }
    return points.slice(0, count)[i];
  }
  function legacyDrawGame() {
    clearTimeout(timer);
    const s = S.session.state,
      g = games.find((g) => g.id === s.game);
    const progress =
      s.game === "match3"
        ? Math.min(100, (s.score / s.target) * 100)
        : s.game === "mahjong"
          ? (s.pairs / s.target) * 100
          : s.game === "tree"
            ? (s.placed.filter((v) => v >= 0).length / s.placed.length) * 100
            : (s.board.filter((v, i) => v === i).length / s.board.length) * 100;
    view.innerHTML = `<div class="backline"><button id="exit-game" aria-label="Назад">${icon("back")}</button><h2>${g.name}</h2><span class="pill" style="margin-left:auto">${s.level}/10</span></div><div class="game-header"><div class="game-meter"><small>Очки</small><strong>${fmt(s.score)}</strong></div><div class="game-meter"><small>Ходы</small><strong>${s.moves}</strong></div><div class="game-meter"><small>Награда</small><strong>❄ ${s.reward}</strong></div></div><div class="progress"><span style="width:${progress}%"></span></div><div id="play-board"></div><div id="game-status" class="game-status"></div><div class="game-tools"><button class="secondary" id="game-help">Правила</button>${["match3", "mahjong"].includes(s.game) ? '<button class="secondary" id="hint">Подсказка −1 ход</button>' : ""}${s.game === "mahjong" ? `<button class="secondary" id="shuffle">Смешать (${s.shuffles})</button>` : ""}${s.game === "puzzle" ? '<button class="secondary" id="sample">Образец</button>' : ""}<button class="secondary" id="restart">Заново</button></div>`;
    $("#exit-game").onclick = () => {
      if (S.busy) return;
      sheet(
        '<h2>Вернуться к уровням?</h2><p>Текущая партия будет прервана. Лучшие результаты и снежинки сохранятся.</p><button class="primary wide" id="leave-game">Выйти</button>',
      );
      $("#leave-game").onclick = () => {
        closeSheet();
        openLevels(S.game);
      };
    };
    $("#game-help").onclick = () => sheet(`<h2>${g.name}</h2><p>${g.desc}</p>`);
    $("#restart").onclick = () => {
      sheet(
        '<h2>Начать заново?</h2><p>Текущие ходы будут сброшены. Полученные ранее награды сохранятся.</p><button class="primary wide" id="restart-confirm">Начать заново</button>',
      );
      $("#restart-confirm").onclick = () => {
        closeSheet();
        startGame(S.game, S.level);
      };
    };
    $("#hint")?.addEventListener("click", () => sendMove({ type: "hint" }));
    $("#shuffle")?.addEventListener("click", () =>
      sendMove({ type: "shuffle" }),
    );
    $("#sample")?.addEventListener("click", () =>
      sheet(
        `<h2>Зимняя картинка · уровень ${s.level}</h2><div class="puzzle-sample" style="${puzzleImageStyle(s)}" role="img" aria-label="Образец зимнего пазла"></div>`,
      ),
    );
    const b = $("#play-board");
    if (s.game === "match3" || s.game === "puzzle") {
      b.className = "board " + (s.game === "puzzle" ? "puzzle" : "");
      b.style.gridTemplateColumns = `repeat(${s.n},1fr)`;
      b.innerHTML = s.board
        .map(
          (v, i) =>
            `<button class="cell ${S.selected === i ? "selected" : ""} ${s.hint?.includes(i) ? "hinted" : ""}" data-cell="${i}" data-value="${v}" aria-label="${s.game === "puzzle" ? "Фрагмент" : "Фишка " + symbols[v]}, ряд ${Math.floor(i / s.n) + 1}, столбец ${(i % s.n) + 1}" ${s.game === "puzzle" ? `style="${puzzleImageStyle(s, v)}"` : ""}>${s.game === "puzzle" ? "" : symbols[v]}</button>`,
        )
        .join("");
      b.querySelectorAll("[data-cell]").forEach(
        (el) => (el.onclick = () => selectCell(+el.dataset.cell)),
      );
      wirePointer(b, s.n, s.game === "match3");
      $("#game-status").textContent =
        s.game === "match3"
          ? `Цель: ${fmt(s.target)} очков${s.combo > 1 ? " · Каскад ×" + s.combo : ""}`
          : `На месте ${s.board.filter((v, i) => v === i).length} из ${s.n * s.n} фрагментов`;
    } else if (s.game === "mahjong") {
      b.className = "board mahjong-board";
      b.innerHTML = s.tiles
        .map((t, i) =>
          t.gone
            ? ""
            : `<button class="mahjong-tile ${!t.free ? "covered" : ""} ${S.selected === i ? "selected" : ""} ${s.hint?.includes(i) ? "hinted" : ""}" data-cell="${i}" style="left:${3 + t.x * 15 - t.z * 0.9}%;top:${5 + t.y * 22 - t.z * 2}%;z-index:${t.z + 1}" aria-label="${symbols[t.value]}, ${t.free ? "свободная" : "закрытая"} плитка">${symbols[t.value]}</button>`,
        )
        .join("");
      b.querySelectorAll("[data-cell]").forEach(
        (el) =>
          (el.onclick = () => {
            const i = +el.dataset.cell;
            if (!s.tiles[i].free)
              return toast("Сначала освободи верх и один из боков плитки");
            selectCell(i);
          }),
      );
      $("#game-status").textContent = `Пары: ${s.pairs} / ${s.target}`;
    } else {
      const remaining = Math.max(
        0,
        Math.ceil(s.memorize_until - Date.now() / 1000),
      );
      const count = s.slots || s.target.length;
      const remembering = remaining > 0 && s.target;
      b.className = "tree-board";
      b.innerHTML =
        treeSvg() +
        Array.from({ length: count }, (_, i) => {
          const [x, y] = treeCoords(i, count),
            v = remembering ? s.target[i] : s.placed[i];
          return `<button class="ornament-slot ${v >= 0 ? "filled" : ""}" data-slot="${i}" style="left:${x}%;top:${y}%" aria-label="Место для украшения ${i + 1}">${v >= 0 ? symbols[v] : "+"}</button>`;
        }).join("");
      const tools = document.createElement("div");
      tools.className = "ornament-tools";
      tools.innerHTML = symbols
        .slice(0, 6)
        .map(
          (v, i) =>
            `<button data-ornament="${i}" class="${S.ornament === i ? "selected" : ""}" aria-label="Украшение ${v}" ${remembering ? "disabled" : ""}>${v}</button>`,
        )
        .join("");
      b.after(tools);
      tools.querySelectorAll("button").forEach(
        (el) =>
          (el.onclick = () => {
            S.ornament = +el.dataset.ornament;
            tools
              .querySelectorAll("button")
              .forEach((x) => x.classList.toggle("selected", x === el));
          }),
      );
      b.querySelectorAll("[data-slot]").forEach(
        (el) =>
          (el.onclick = () => {
            if (remembering) return toast("Запомни образец");
            sendMove({ i: +el.dataset.slot, value: S.ornament });
          }),
      );
      $("#game-status").textContent = remembering
        ? `Запомни украшения · ${remaining} сек.`
        : "Расставь все игрушки, затем проверь результат";
      if (!remembering) {
        const check = document.createElement("button");
        check.id = "check-tree";
        check.className = "primary wide";
        check.textContent = "Проверить ёлку";
        check.disabled = s.placed.includes(-1);
        check.onclick = () => sendMove({ type: "check" });
        tools.after(check);
      }
      if (remembering)
        timer = setTimeout(async () => {
          if (S.tab !== "playing" || !S.session) return;
          try {
            S.session = await api("/api/games/session/" + S.session.id);
            drawGame();
          } catch (e) {
            toast(e.message);
          }
        }, 1000);
    }
  }
  function selectCell(i) {
    if (S.busy) return;
    const previous = S.selected;
    view
      .querySelectorAll(".cell.selected,.mahjong-tile.selected")
      .forEach((el) => el.classList.remove("selected"));
    if (previous === null) {
      S.selected = i;
      view.querySelector(`[data-cell="${i}"]`)?.classList.add("selected");
      return;
    }
    S.selected = null;
    if (previous === i) return;
    if (S.game === "match3") {
      const n = S.session.state.n;
      if (!(
        Math.abs(previous - i) === n ||
        (Math.abs(previous - i) === 1 &&
          Math.floor(previous / n) === Math.floor(i / n))
      )) {
        S.selected = i;
        view.querySelector(`[data-cell="${i}"]`)?.classList.add("selected");
        return;
      }
    }
    sendMove({ a: previous, b: i });
  }
  function wirePointer(board, n, adjacent) {
    let drag = null,
      suppress = false;
    board.addEventListener("pointerdown", (e) => {
      const tile = e.target.closest("[data-cell]");
      if (!tile || S.busy) return;
      drag = {
        i: +tile.dataset.cell,
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
      };
      board.setPointerCapture(e.pointerId);
    });
    board.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      suppress = true;
      setTimeout(() => (suppress = false), 0);
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 15) {
        selectCell(d.i);
        return;
      }
      let dest;
      if (adjacent) {
        const dx = e.clientX - d.x,
          dy = e.clientY - d.y;
        dest =
          d.i +
          (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : dy > 0 ? n : -n);
        if (
          dest < 0 ||
          dest >= n * n ||
          (Math.abs(dest - d.i) === 1 &&
            Math.floor(dest / n) !== Math.floor(d.i / n))
        )
          return;
      } else {
        const el = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest("[data-cell]");
        if (!el || !board.contains(el)) return;
        dest = +el.dataset.cell;
      }
      S.selected = null;
      sendMove({ a: d.i, b: dest });
    });
    board.addEventListener(
      "click",
      (e) => {
        if (suppress) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    board.addEventListener("pointercancel", () => (drag = null));
  }
  function puzzleImageStyle(s, fragment) {
    const id = s.image_id ?? s.level - 1,
      col = id % 4,
      row = Math.floor(id / 4);
    if (fragment === undefined)
      return `background-image:url('assets/puzzle-atlas.webp');background-size:400% 400%;background-position:${(col / 3) * 100}% ${(row / 3) * 100}%`;
    const n = s.n,
      side = 4 * n,
      x = col * n + (fragment % n),
      y = row * n + Math.floor(fragment / n);
    return `background-image:url('assets/puzzle-atlas.webp');background-size:${side * 100}% ${side * 100}%;background-position:${(x / (side - 1)) * 100}% ${(y / (side - 1)) * 100}%`;
  }
  function drawGame() {
    if (!window.WinterExtras.games.some((g) => g.id === S.game)) {
      legacyDrawGame();
      return;
    }
    clearTimeout(timer);
    const s = S.session.state,
      g = games.find((x) => x.id === s.game);
    const recordMode = Boolean(s.record_mode);
    const best = Math.max(S.progress.records?.[s.game] || 0, S.session.record || 0, s.score || 0);
    const thirdLabel = s.game === "blocks" ? "Линии" : "Макс. плитка";
    const thirdValue = s.game === "blocks" ? s.lines : Math.max(...s.board);
    view.innerHTML = `<div class="backline"><button id="exit-game" aria-label="Назад">${icon("back")}</button><h2>${g.name}</h2><span class="pill" style="margin-left:auto">${recordMode ? "∞ рекорд" : `${s.level}/10`}</span></div><div class="game-header"><div class="game-meter"><small>Очки</small><strong>${fmt(s.score)}</strong></div><div class="game-meter"><small>${recordMode ? "Рекорд" : "Ходы"}</small><strong>${recordMode ? fmt(best) : s.moves}</strong></div><div class="game-meter"><small>${recordMode ? thirdLabel : "Награда"}</small><strong>${recordMode ? fmt(thirdValue) : `❄ ${s.reward}`}</strong></div></div>${recordMode ? "" : `<div class="progress"><span style="width:${Math.min(100, WinterExtras.progress(s))}%"></span></div>`}<div id="play-board"></div><div id="game-status" class="game-status"></div><div class="game-tools"><button class="secondary" id="game-help">Правила</button><button class="secondary" id="restart">Заново</button></div>`;
    $("#exit-game").onclick = () => {
      if (!S.busy) openLevels(S.game);
    };
    $("#game-help").onclick = () => sheet(`<h2>${g.name}</h2><p>${g.desc}</p>`);
    $("#restart").onclick = () => {
      if (!S.busy) startGame(S.game, S.level);
    };
    const id = S.session.id,
      epoch = gameEpoch;
    WinterExtras.render({
      board: $("#play-board"),
      state: s,
      send: sendMove,
      toast,
      motion,
      refresh: async () => {
        if (S.busy || S.session?.id !== id || epoch !== gameEpoch) return;
        try {
          S.session = await api("/api/games/session/" + id);
          drawGame();
        } catch (e) {
          toast(e.message);
        }
      },
    });
  }
  function paintCell(el, value, n) {
    if (!el) return;
    el.dataset.value = value;
    el.textContent = symbols[value];
    el.setAttribute(
      "aria-label",
      `Фишка ${symbols[value]}, ряд ${Math.floor(+el.dataset.cell / n) + 1}, столбец ${(+el.dataset.cell % n) + 1}`,
    );
  }
  async function updateMatch(result) {
    const s = result.state,
      board = $("#play-board"),
      cells = [...board.querySelectorAll(".cell")],
      n = s.n;
    cells.forEach((el) => el.classList.remove("selected", "hinted"));
    const pair = s.swap;
    if (pair && motion()) {
      const [a, b] = pair,
        ra = cells[a].getBoundingClientRect(),
        rb = cells[b].getBoundingClientRect();
      await Promise.all([
        gsap.to(cells[a], {
          x: rb.x - ra.x,
          y: rb.y - ra.y,
          duration: 0.18,
          ease: "power2.out",
        }),
        gsap.to(cells[b], {
          x: ra.x - rb.x,
          y: ra.y - rb.y,
          duration: 0.18,
          ease: "power2.out",
        }),
      ]);
      if (s.invalid) {
        await Promise.all(
          pair.map((i) =>
            gsap.to(cells[i], {
              x: 0,
              y: 0,
              duration: 0.18,
              ease: "power2.out",
            }),
          ),
        );
      } else {
        const values = pair.map((i) => +cells[i].dataset.value);
        paintCell(cells[a], values[1], n);
        paintCell(cells[b], values[0], n);
        gsap.set(
          pair.map((i) => cells[i]),
          { x: 0, y: 0 },
        );
      }
    }
    if (!s.invalid) {
      for (const frame of s.frames || []) {
        if (motion())
          await gsap.to(
            frame.clear.map((i) => cells[i]),
            { scale: 0.6, opacity: 0, duration: 0.16, ease: "power2.in" },
          );
        for (const drop of frame.drops)
          paintCell(cells[drop.to], drop.value, n);
        if (motion()) {
          const pitch = cells[n].offsetTop - cells[0].offsetTop;
          await Promise.all(
            frame.drops.map((drop) =>
              gsap.fromTo(
                cells[drop.to],
                {
                  y:
                    (Math.floor(drop.from / n) - Math.floor(drop.to / n)) *
                    pitch,
                  opacity: 1,
                  scale: 1,
                },
                {
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  duration: 0.26,
                  ease: "power2.out",
                  clearProps: "transform,opacity",
                },
              ),
            ),
          );
        }
      }
      s.board.forEach((v, i) => {
        if (+cells[i].dataset.value !== v) paintCell(cells[i], v, n);
      });
      if (s.reshuffled) {
        toast("Ходов не осталось — перемешиваем те же фишки");
        if (motion())
          gsap.fromTo(
            cells,
            { scale: 0.88 },
            { scale: 1, duration: 0.3, ease: "back.out(1.4)" },
          );
      }
    }
    for (const i of s.hint || []) cells[i]?.classList.add("hinted");
    const meters = view.querySelectorAll(".game-meter strong");
    meters[0].textContent = fmt(s.score);
    meters[1].textContent = s.moves;
    const fill = view.querySelector(".progress span");
    fill.style.width = `${Math.min(100, (s.score / s.target) * 100)}%`;
    $("#game-status").textContent =
      `Цель: ${fmt(s.target)} очков${s.combo > 1 ? " · Каскад ×" + s.combo : ""}`;
  }
  async function sendMove(action) {
    if (S.busy || !S.session) return;
    S.busy = true;
    const epoch = gameEpoch;
    const id = S.session.id;
    try {
      const oldRects = new Map(
        [...view.querySelectorAll("[data-cell]")].map((el) => [
          +el.dataset.cell,
          el.getBoundingClientRect(),
        ]),
      );
      const result = await post("/api/games/session/" + id + "/move", {
        version: S.session.version,
        action,
      });
      if (epoch !== gameEpoch) return;
      const hit = result.state.effects?.flat() || [];
      if (motion() && hit.length && S.game === "mahjong")
        await gsap.to(
          hit
            .map((i) => view.querySelector(`[data-cell="${i}"]`))
            .filter(Boolean),
          { scale: 0.65, opacity: 0, y: -12, duration: 0.2, ease: "power2.in" },
        );
      if (S.game === "blocks" && result.state.cleared?.length)
        await animateBlockClear(result.state.cleared);
      S.session = result;
      S.selected = null;
      if (result.balance !== undefined) S.me.user.snowflakes = result.balance;
      if (S.game === "match3") await updateMatch(result);
      else drawGame();
      if (motion()) {
        if (S.game === "puzzle" && action.a !== undefined) {
          const a = view.querySelector(`[data-cell="${action.a}"]`),
            b = view.querySelector(`[data-cell="${action.b}"]`),
            ra = oldRects.get(action.a),
            rb = oldRects.get(action.b);
          if (a && b && ra && rb) {
            gsap.fromTo(
              a,
              { x: rb.x - ra.x, y: rb.y - ra.y },
              { x: 0, y: 0, duration: 0.3, ease: "power2.out" },
            );
            gsap.fromTo(
              b,
              { x: ra.x - rb.x, y: ra.y - rb.y },
              { x: 0, y: 0, duration: 0.3, ease: "power2.out" },
            );
          }
        }
      }
      if (result.state.won || result.state.lost) {
        await refreshProgress();
        showResult(result);
        if (S.game === "tree" && !result.state.won) {
          $("#overlay .result p").textContent =
            "Игрушки не совпали с образцом. Следующая попытка — с новым расположением.";
          $("#result-next").textContent = "Заново: новый образец";
        }
      }
    } catch (e) {
      toast(e.message);
      if (S.session?.id === id) {
        try {
          S.session = await api("/api/games/session/" + id);
          drawGame();
          if (S.session.state.won || S.session.state.lost) {
            await refreshProgress();
            showResult(S.session);
          }
        } catch {}
      }
    } finally {
      S.busy = false;
    }
  }
  async function animateBlockClear(indices) {
    const cells = indices
      .map((i) => view.querySelector(`[data-block-cell="${i}"]`))
      .filter(Boolean);
    if (!cells.length) return;
    cells.forEach((cell) => cell.classList.add("clearing"));
    tg?.HapticFeedback?.impactOccurred("medium");
    if (!motion()) return;
    await new Promise((resolve) => {
      const timeline = gsap.timeline({ onComplete: resolve });
      timeline
        .to(cells, {
          scale: 1.16,
          filter: "brightness(1.75)",
          duration: 0.16,
          ease: "power2.out",
          stagger: { each: 0.025, from: "center" },
        })
        .to(cells, {
          scale: 0,
          rotation: 22,
          opacity: 0,
          duration: 0.3,
          ease: "back.in(2.4)",
          stagger: { each: 0.026, from: "center" },
        })
        .fromTo(
          "#play-board",
          { x: -5 },
          { x: 5, duration: 0.06, repeat: 3, yoyo: true, clearProps: "transform" },
          0.08,
        );
    });
  }
  function showResult(r) {
    const s = r.state;
    clearTimeout(timer);
    header(games.find((g) => g.id === s.game).name);
    if (s.record_mode) {
      const record = Math.max(r.record || 0, s.score || 0);
      sheet(`<div class="result"><span class="result-icon">${r.new_record ? "🏆" : "❄️"}</span><h2>${r.new_record ? "Новый рекорд!" : "Партия окончена"}</h2><p>${r.new_record ? "Санта записал твой лучший результат." : "Рекорд сохранён. Попробуешь превзойти?"}</p><div class="result-score">${fmt(s.score)} <small>очков</small></div><div class="result-reward">Рекорд: ${fmt(record)}</div><button class="primary wide" id="result-next">Играть ещё</button><button class="secondary wide" id="result-levels">Ко всем играм</button></div>`);
      $("#result-next").onclick = () => {
        closeSheet();
        startGame(s.game, 0);
      };
      $("#result-levels").onclick = () => {
        closeSheet();
        navigate("games");
      };
      if (r.new_record) confetti();
      return;
    }
    sheet(
      `<div class="result"><span class="result-icon">${s.won ? "🏆" : "⛄"}</span><h2>${s.won ? "Зимняя победа!" : "Ещё одна попытка?"}</h2><p>${s.won ? "Уровень " + s.level + " пройден" : "Ходы закончились. Теперь ты знаешь, как сделать лучше."}</p><div class="result-score">${fmt(s.score)} <small>очков</small></div>${s.won ? `<div class="result-reward">${r.awarded ? "+" + r.awarded + " ❄" : "Лучший результат сохранён"}</div><p style="margin-top:8px">${r.awarded ? "Снежинки уже на балансе" : "За повторную победу снежинки не начисляются"}</p>` : ""}<button class="primary wide" id="result-next">${s.won && s.level < 10 ? "Следующий уровень" : s.won ? "К уровням" : "Попробовать ещё"}</button><button class="secondary wide" id="result-levels">Выбор уровня</button></div>`,
    );
    $("#result-next").onclick = () => {
      closeSheet();
      if (s.won && s.level === 10) openLevels(s.game);
      else startGame(s.game, s.won ? s.level + 1 : s.level);
    };
    $("#result-levels").onclick = () => {
      closeSheet();
      openLevels(s.game);
    };
    if (s.won) {
      tg?.HapticFeedback?.notificationOccurred("success");
      confetti();
    }
  }
  function confetti() {
    if (!motion()) return;
    for (let i = 0; i < 22; i++) {
      const el = document.createElement("span");
      el.className = "particle";
      el.textContent = i % 3 ? "❄" : "✦";
      el.style.left = "50%";
      el.style.top = "60%";
      document.body.append(el);
      gsap.to(el, {
        x: (Math.random() - 0.5) * 390,
        y: -250 + Math.random() * 140,
        rotation: Math.random() * 240,
        opacity: 0,
        duration: 1.2 + Math.random() * 0.6,
        ease: "power2.out",
        onComplete: () => el.remove(),
      });
    }
  }
  function sheet(html) {
    $("#overlay").innerHTML =
      `<section class="sheet" role="dialog" aria-modal="true" aria-label="Информация"><button class="close-sheet" aria-label="Закрыть">×</button>${html}</section>`;
    $(".close-sheet").onclick = closeSheet;
    if (motion())
      gsap.fromTo(
        ".sheet",
        { y: 65, opacity: 0.4 },
        { y: 0, opacity: 1, duration: 0.42, ease: "power3.out" },
      );
    $(".sheet").querySelector("button")?.focus();
  }
  function closeSheet() {
    if (!$("#overlay").children.length) return;
    gsapIf(() => gsap.killTweensOf(".sheet"));
    $("#overlay").innerHTML = "";
  }
  $("#overlay").addEventListener("click", (e) => {
    if (e.target === $("#overlay")) closeSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
  });
  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      navigate(tab.dataset.tab).catch((x) => toast(x.message));
      return;
    }
    const game = e.target.closest("[data-game]");
    if (game) openLevels(game.dataset.game);
  });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.(
    "change",
    snow,
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) gsapIf(() => gsap.globalTimeline.pause());
    else {
      gsapIf(() => gsap.globalTimeline.resume());
      if (S.session?.state.game === "tree") drawGame();
    }
  });
  async function refreshProgress() {
    S.progress = await api("/api/games/progress");
  }
  function registration() {
    header("Твой Тайный Санта");
    view.innerHTML = `<section class="panel"><h1>С Наступающим!</h1><p style="margin:14px 0">Готов к Тайному Санте? Скорей регистрируйся и составляй свой ВИШЛИСТ. Но сначала один вопросик: тебе есть 18?</p><button class="primary wide" id="age-yes">Да, войти</button><button class="secondary wide" id="age-no">Нет, пока малой</button><div id="age-form"></div></section>`;
    $("#age-no").onclick = () => {
      $("#age-form").innerHTML =
        '<p class="notice">Возвращайся, когда исполнится 18 🎄</p>';
    };
    $("#age-yes").onclick = () => {
      $("#age-form").innerHTML =
        '<form class="stack" id="register-form" style="margin-top:20px"><label>Имя или псевдоним<input name="alias" required maxlength="80"></label><label>Вишлист<textarea name="wishlist" required minlength="2" maxlength="1500"></textarea></label><button class="primary">Создать анкету</button></form>';
      $("#register-form").onsubmit = async (e) => {
        e.preventDefault();
        const button = e.submitter;
        button.disabled = true;
        try {
          await post("/api/register", {
            ...Object.fromEntries(new FormData(e.target)),
            age_verified: true,
          });
          await boot();
        } catch (x) {
          toast(x.message);
        } finally {
          button.disabled = false;
        }
      };
    };
  }
  async function boot() {
    document.documentElement.classList.toggle("reduced-motion", S.reduce);
    setupNav();
    header("", "home");
    home();
    navTo("home");
    try {
      const progressRequest = api("/api/games/progress").catch(() => null);
      S.me = await api("/api/me");
      if (!S.me.preview) $("#preview-label")?.remove();
      if (!S.me.user.exists || !S.me.user.age_verified || !S.me.user.active) {
        registration();
        return;
      }
      const progress = await progressRequest;
      if (progress) S.progress = progress;
      home();
      animateIn();
      snow();
    } catch (e) {
      view.innerHTML = `<section class="panel"><h2>Не удалось открыть игры</h2><p style="margin:12px 0">${esc(e.message)}</p><button class="primary wide" id="retry">Повторить</button></section>`;
      $("#retry").onclick = boot;
    }
  }
  // Skeleton renders synchronously; no animation CDN or secondary endpoint blocks initial paint.
  S.me = {
    user: { alias: "Санта", snowflakes: 0, wishlist: "", status: "visitor" },
    referrals: 0,
  };
  boot();
})();
