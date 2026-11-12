(() => {
  let selectedPiece = 0,
    flagMode = false;
  const symbols = [
    "🎁",
    "🎄",
    "⭐",
    "❄️",
    "🔔",
    "🧦",
    "🍬",
    "⛄",
    "🦌",
    "🦊",
    "🕯️",
    "🛷",
    "🍪",
    "🧸",
    "🎀",
    "🪄",
  ];
  const games = [
    {
      id: "blocks",
      name: "Зимние блоки",
      sub: "Бесконечная игра на рекорд",
      genre: "Логика",
      icon: "🧊",
      endless: true,
      desc: "Размещай фигуры из трёх предложенных на поле 8×8. Полностью заполненные строки и столбцы эффектно исчезают. Игра продолжается, пока для фигур остаётся место. Побей свой максимальный рекорд.",
    },
    {
      id: "merge2048",
      name: "Зимние 2048",
      sub: "Бесконечная игра на рекорд",
      genre: "Логика",
      icon: "🔢",
      endless: true,
      desc: "Свайпай всё поле в одну сторону. Две одинаковые плитки сливаются в одну, после успешного хода появляется двойка или четвёрка. Играй до заполнения поля и побей свой максимальный рекорд.",
    },
    {
      id: "sort",
      name: "Сортировка шаров",
      sub: "Каждому цвету — своя колба",
      genre: "Логика",
      icon: "🔴",
      desc: "Разложи ёлочные шары по цветам. Выбери колбу, затем другую: верхний шар можно переместить на такой же цвет или в пустую колбу. В колбе четыре места. Собери каждый цвет целиком.",
    },
    {
      id: "mines",
      name: "Снежный сапёр",
      sub: "Читай следы на снегу",
      genre: "Логика",
      icon: "🚩",
      desc: "Открой все безопасные клетки. Число показывает, сколько ловушек в восьми соседних клетках. Переключись на флажок, чтобы отметить опасное место. Первый открытый участок безопасен.",
    },
    {
      id: "memory",
      name: "Пары подарков",
      sub: "Запоминай и находи",
      genre: "Память",
      icon: "🎴",
      desc: "Переворачивай по две карточки и находи одинаковые подарки. Совпавшие пары остаются открытыми, остальные снова закрываются. На следующих уровнях карточек больше и меньше права на ошибку.",
    },
  ];
  function progress(s) {
    if (s.record_mode) return 0;
    if (s.game === "sort")
      return (
        (s.tubes.filter((t) => t.length === 4 && new Set(t).size === 1).length /
          s.target) *
        100
      );
    if (s.game === "mines") return (s.opened.length / s.target) * 100;
    return (s.pairs / s.target) * 100;
  }
  function render({ board: b, state: s, send, toast, refresh, motion }) {
    const status = document.querySelector("#game-status");
    b.className = "board extra-board " + s.game;
    b.style.gridTemplateColumns = `repeat(${s.n || 4},minmax(0,1fr))`;
    if (s.game === "blocks") {
      b.innerHTML = s.board
        .map(
          (v, i) =>
            `<button class="block-cell ${v ? "filled color-" + v : ""}" data-block-cell="${i}" aria-label="Ряд ${Math.floor(i / 8) + 1}, столбец ${(i % 8) + 1}${v ? ", занято" : ""}"></button>`,
        )
        .join("");
      if (!s.tray[selectedPiece]) selectedPiece = s.tray.findIndex(Boolean);
      const tray = document.createElement("div");
      tray.className = "block-tray";
      tray.innerHTML = s.tray
        .map(
          (piece, p) =>
            `<button class="tray-piece ${selectedPiece === p ? "selected" : ""}" data-piece="${p}" ${piece ? "" : "disabled"} aria-label="Фигура ${p + 1}">${piece ? shape(piece, p) : "<span>✓</span>"}</button>`,
        )
        .join("");
      b.after(tray);
      tray.querySelectorAll("[data-piece]").forEach(
        (el) =>
          (el.onclick = () => {
            selectedPiece = +el.dataset.piece;
            tray
              .querySelectorAll("button")
              .forEach((x) => x.classList.toggle("selected", x === el));
          }),
      );
      b.querySelectorAll("button").forEach(
        (el) =>
          (el.onclick = () => {
            if (selectedPiece < 0) return;
            const i = +el.dataset.blockCell;
            send({ piece: selectedPiece, x: i % 8, y: Math.floor(i / 8) });
          }),
      );
      let drag = null,
        ghost = null;
      tray.onpointerdown = (e) => {
        const button = e.target.closest("[data-piece]");
        if (!button || button.disabled) return;
        selectedPiece = +button.dataset.piece;
        drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
        tray.setPointerCapture(e.pointerId);
      };
      tray.onpointermove = (e) => {
        if (!drag) return;
        const delta = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
        if (delta < 10 && !ghost) return;
        if (!ghost) {
          ghost = document.createElement("div");
          ghost.className = "block-ghost";
          ghost.innerHTML = shape(s.tray[selectedPiece], selectedPiece);
          document.body.append(ghost);
        }
        ghost.style.transform = `translate(${e.clientX}px,${e.clientY - 42}px)`;
      };
      tray.onpointerup = (e) => {
        if (!drag) return;
        const moved = !!ghost;
        ghost?.remove();
        ghost = null;
        drag = null;
        if (moved) {
          const cell = document
            .elementFromPoint(e.clientX, e.clientY - 30)
            ?.closest("[data-block-cell]");
          if (cell) {
            const i = +cell.dataset.blockCell;
            send({ piece: selectedPiece, x: i % 8, y: Math.floor(i / 8) });
          } else toast("Перетащи фигуру на игровое поле");
        }
      };
      tray.onpointercancel = () => {
        ghost?.remove();
        ghost = null;
        drag = null;
      };
      status.textContent = `Очищено линий: ${s.lines}${s.combo > 1 ? " · Комбо ×" + s.combo : ""} · игра до заполнения поля`;
    } else if (s.game === "merge2048") {
      b.innerHTML = s.board
        .map(
          (v, i) =>
            `<span class="merge-tile ${v ? "v-" + Math.min(11, Math.log2(v)) : ""}" aria-label="${v || "Пусто"}">${v || ""}</span>`,
        )
        .join("");
      const controls = document.createElement("div");
      controls.className = "direction-controls";
      controls.innerHTML = ["left", "up", "down", "right"]
        .map(
          (d, i) =>
            `<button class="secondary" data-direction="${d}" aria-label="${["Влево", "Вверх", "Вниз", "Вправо"][i]}">${["←", "↑", "↓", "→"][i]}</button>`,
        )
        .join("");
      b.after(controls);
      controls
        .querySelectorAll("button")
        .forEach(
          (el) =>
            (el.onclick = () => send({ direction: el.dataset.direction })),
        );
      let down = null;
      b.onpointerdown = (e) => {
        down = [e.clientX, e.clientY];
        b.setPointerCapture(e.pointerId);
      };
      b.onpointercancel = () => (down = null);
      b.onpointerup = (e) => {
        if (!down) return;
        const dx = e.clientX - down[0],
          dy = e.clientY - down[1];
        down = null;
        if (Math.hypot(dx, dy) < 20) return;
        send({
          direction:
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up",
        });
      };
      b.tabIndex = 0;
      b.onkeydown = (e) => {
        const dirs = {
          ArrowUp: "up",
          ArrowDown: "down",
          ArrowLeft: "left",
          ArrowRight: "right",
        };
        if (dirs[e.key]) {
          e.preventDefault();
          send({ direction: dirs[e.key] });
        }
      };
      status.textContent = `Максимальная плитка: ${Math.max(...s.board)} · игра до заполнения поля`;
    } else if (s.game === "sort") {
      b.className = "sort-board";
      b.style.gridTemplateColumns = "";
      b.innerHTML = s.tubes
        .map(
          (t, i) =>
            `<button class="tube" data-tube="${i}" aria-label="Колба ${i + 1}, ${t.length} шаров"><span class="tube-glass">${t.map((c) => `<span class="sort-ball ball-${c}">${["●", "◆", "★", "❄", "♥", "✦"][c]}</span>`).join("")}</span><small>${i + 1}</small></button>`,
        )
        .join("");
      let selected = null;
      b.querySelectorAll("button").forEach(
        (el) =>
          (el.onclick = () => {
            const i = +el.dataset.tube;
            if (selected === null) {
              if (!s.tubes[i].length) return toast("Выбери колбу с шарами");
              selected = i;
              el.classList.add("selected");
            } else if (selected === i) {
              selected = null;
              el.classList.remove("selected");
            } else {
              const a = selected;
              selected = null;
              send({ a, b: i });
            }
          }),
      );
      status.textContent = `Собери ${s.colors} цветов в полные колбы`;
    } else if (s.game === "mines") {
      b.innerHTML = s.board
        .map(
          (v, i) =>
            `<button class="mine-cell ${v >= 0 ? "opened" : ""} ${v === 9 ? "trap" : ""}" data-mine="${i}" data-count="${v}" aria-label="${v === -2 ? "Флажок" : v === -1 ? "Закрытая клетка" : v === 9 ? "Ловушка" : "Рядом ловушек: " + v}">${v === -2 ? "🚩" : v === -1 ? "" : v === 9 ? "💥" : v || ""}</button>`,
        )
        .join("");
      b.querySelectorAll("button").forEach(
        (el) =>
          (el.onclick = () =>
            send({ i: +el.dataset.mine, type: flagMode ? "flag" : "open" })),
      );
      const button = document.createElement("button");
      button.className = "secondary wide flag-mode";
      button.textContent = flagMode
        ? "🚩 Флажки включены · сменить на открытие"
        : "❄ Открываем клетки · включить флажки";
      button.onclick = () => {
        flagMode = !flagMode;
        button.textContent = flagMode
          ? "🚩 Флажки включены · сменить на открытие"
          : "❄ Открываем клетки · включить флажки";
      };
      b.after(button);
      status.textContent = `Открыто ${s.opened.length} / ${s.target} · флажков ${s.flags.length} / ${s.mine_count}`;
    } else {
      b.innerHTML = s.cards
        .map(
          (v, i) =>
            `<button class="memory-card ${v !== null ? "face-up" : ""} ${s.found.includes(i) ? "found" : ""}" data-card="${i}" aria-label="${v !== null ? "Подарок " + symbols[v] : "Закрытый подарок"}" ${s.found.includes(i) ? "disabled" : ""}><span>${v !== null ? symbols[v] : "❄"}</span></button>`,
        )
        .join("");
      b.querySelectorAll("button").forEach(
        (el) => (el.onclick = () => send({ i: +el.dataset.card })),
      );
      status.textContent = `Пары: ${s.pairs} / ${s.target}`;
      if (s.peek_until > Date.now() / 1000)
        setTimeout(
          refresh,
          Math.max(50, (s.peek_until - Date.now() / 1000) * 1000 + 60),
        );
    }
    if (
      motion() &&
      window.gsap &&
      s.effects?.flat().length &&
      s.game !== "blocks"
    )
      gsap.fromTo(b, { opacity: 0.8 }, { opacity: 1, duration: 0.15 });
  }
  function shape(piece, color) {
    const cols = Math.max(...piece.map(([x]) => x)) + 1,
      rows = Math.max(...piece.map(([, y]) => y)) + 1;
    return `<span class="mini-shape" style="width:${cols * 18}px;height:${rows * 18}px">${piece.map(([x, y]) => `<i class="color-${color + 1}" style="transform:translate(${x * 18}px,${y * 18}px)"></i>`).join("")}</span>`;
  }
  window.WinterExtras = { games, render, progress };
})();
