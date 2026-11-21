/* =========================================================
   星愿圣诞夜 · App / UI
   Everything that makes the night feel alive lives here:
   eight little wishes, a virtual snow globe, a postcard,
   and a small secret in the keyboard.
   ========================================================= */
(function () {
  'use strict';

  /* -----------------------------------------------------
     Edit these eight little surprises to make it yours.
     y:       height on the tree, 0 (bottom) → 1 (top)
     angle:   position around the front of the tree
     color:   the bauble + glow colour
     effect:  snowburst | bell | candle | moon | aurora |
              reindeer | stars | meteor
     ----------------------------------------------------- */
  const ORNAMENTS = [
    {
      name: '初雪',
      english: 'FIRST SNOW',
      icon: 'snowflake',
      color: '#c9f3ef',
      effect: 'snowburst',
      y: 0.22,
      angle: -0.55,
      title: '初雪落在你的肩上',
      quote: '雪落无声，却把整个世界变得柔软。愿你在忙碌的日子里，也给自己留一点空白。',
      action: '收下这场初雪'
    },
    {
      name: '铃音',
      english: 'SILVER BELL',
      icon: 'bell',
      color: '#f0c667',
      effect: 'bell',
      y: 0.32,
      angle: 0.46,
      title: '风把铃铛吹响了',
      quote: '有些祝福不必说出口。风一吹，铃铛就会替你唱给想念的人听。',
      action: '收下这声铃音'
    },
    {
      name: '烛光',
      english: 'CANDLELIGHT',
      icon: 'candle',
      color: '#f3aa67',
      effect: 'candle',
      y: 0.40,
      angle: -0.32,
      title: '有一盏灯为你亮着',
      quote: '愿有一盏小小的灯，在你走夜路的时候刚好亮着；也愿你知道，总有人在等你回家。',
      action: '收下这束微光'
    },
    {
      name: '月光',
      english: 'MOONLIGHT',
      icon: 'moon',
      color: '#c6def7',
      effect: 'moon',
      y: 0.48,
      angle: 0.64,
      title: '月亮也在偷偷看你',
      quote: '月亮不会奔你而来，但你可以抬头。今晚的月光，是我托它带给你的拥抱。',
      action: '收下这片月光'
    },
    {
      name: '极光',
      english: 'AURORA',
      icon: 'aurora',
      color: '#5af0cf',
      effect: 'aurora',
      y: 0.56,
      angle: -0.72,
      title: '极光只为幸运的人出现',
      quote: '听说看见极光的人，会被整个冬天温柔以待。现在，你看见啦。',
      action: '收下这道极光'
    },
    {
      name: '驯鹿',
      english: 'REINDEER',
      icon: 'reindeer',
      color: '#f19586',
      effect: 'reindeer',
      y: 0.64,
      angle: 0.25,
      title: '它把最好的礼物留给了你',
      quote: '驯鹿载着全世界的礼物路过，却把最好的一份，悄悄留在了你身边。',
      action: '收下这份礼物'
    },
    {
      name: '星河',
      english: 'GALAXY',
      icon: 'galaxy',
      color: '#a6a8ff',
      effect: 'stars',
      y: 0.72,
      angle: -0.24,
      title: '你眼里也有一条星河',
      quote: '你眼里的光，比今晚所有的星星都要亮。别怀疑，你本身就是很美好的存在。',
      action: '收下这条星河'
    },
    {
      name: '流星',
      english: 'SHOOTING STAR',
      icon: 'meteor',
      color: '#f7da8f',
      effect: 'meteor',
      y: 0.80,
      angle: 0.57,
      title: '接住这颗流星',
      quote: '别急着许愿，先快乐。愿望会慢慢来，像雪落在手心，总会融化成一整个春天。',
      action: '收下这颗流星'
    }
  ];

  const WISH_SPOTS = {
    landscape: [
      [0.74, 0.11], [0.88, 0.24], [0.63, 0.30], [0.91, 0.36],
      [0.57, 0.12], [0.78, 0.43], [0.86, 0.16], [0.68, 0.07]
    ],
    portrait: [
      [0.12, 0.20], [0.86, 0.21], [0.16, 0.32], [0.84, 0.35],
      [0.51, 0.11], [0.11, 0.42], [0.89, 0.44], [0.76, 0.09]
    ]
  };

  const METEOR_BLESSINGS = [
    '你接住了一颗流星。今晚的好运，会加倍。',
    '流星说：你偷偷许的愿，它已经听见了。',
    '一颗流星落进你的口袋，变成了一小块光。',
    '快看，整个夜空都在为你让路。',
    '你赶上了一场很短的浪漫。它说，会记得你。'
  ];

  const MOON_BLESSINGS = [
    '月亮说：今晚也要好好爱自己。',
    '你抬头的时候，月光刚好落在你身上。',
    '这不是偶然，是月亮一直在等你抬头。',
    '月亮把今晚最柔软的一束光，留给了你。'
  ];

  const GIFT_BLESSINGS = [
    '你拆开一只小礼盒，里面只有一句话：你已经被这个世界温柔地记住了。',
    '礼盒里装着一小片北极的雪。它说，祝你今晚好梦。',
    '礼物是一张空白车票。目的地：任何一个你想去的地方。'
  ];

  const DEFAULT_WISH = '愿每一颗心，都有星光抵达。';
  const SESSION_KEY = 'noel.collected.v1';
  const WISH_KEY = 'noel.wishes.v1';
  const MAX_WISHES = 8;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const elements = {
    curtain: $('#curtain'),
    scene: $('#scene'),
    intro: $('#intro'),
    introSound: $('#intro-sound'),
    introSkip: $('#intro-skip'),
    introStatus: $('#intro-status'),
    topbar: $('.topbar'),
    treeUI: $('#tree-ui'),
    soundToggle: $('#sound-toggle'),
    snowToggle: $('#snow-toggle'),
    postcardOpen: $('#postcard-open'),
    collection: $('.collection'),
    collectedCount: $('#collected-count'),
    progressDots: $('#progress-dots'),
    collectionHint: $('.collection__hint'),
    topper: $('#topper'),
    topperPrompt: $('#topper-prompt'),
    ornamentLayer: $('#ornament-layer'),
    surpriseDialog: $('#surprise-dialog'),
    surpriseEmblem: $('#surprise-emblem'),
    surpriseIcon: $('#surprise-icon'),
    surpriseKicker: $('#surprise-kicker'),
    surpriseTitle: $('#surprise-title'),
    surpriseQuote: $('#surprise-quote'),
    surpriseCollect: $('#surprise-collect'),
    surpriseFootnote: $('#surprise-footnote'),
    wishDialog: $('#wish-dialog'),
    wishForm: $('#wish-form'),
    wishInput: $('#wish-input'),
    wishCount: $('#wish-count'),
    wishError: $('#wish-error'),
    wishPast: $('#wish-past'),
    wishPastList: $('#wish-past-list'),
    postcardDialog: $('#postcard-dialog'),
    postcardStage: $('#postcard-stage'),
    postcardLoading: $('#postcard-loading'),
    postcardImage: $('#postcard-image'),
    postcardDownload: $('#postcard-download'),
    finaleDialog: $('#finale-dialog'),
    finaleWish: $('#finale-wish'),
    toastRegion: $('#toast-region')
  };

  let scene = null;
  let audio = null;
  let soundBusy = false;
  let snowOn = true;
  let introActive = false;
  let introFinished = false;
  let introTimers = [];
  let audioStarting = false;
  let audioAutoTried = false;
  let lastSoundToggleAt = 0;
  let collected = new Set();
  let wishes = [];
  let currentOrnament = -1;
  let finaleShown = false;
  let promptTimer = null;
  let interacted = false;
  let lastMeteorLine = -1;
  let lastMoonLine = -1;
  const openedGifts = new Set();
  let postcardGeneration = 0;
  let secretBuffer = '';
  let secretAt = 0;
  let lastSecret = 0;
  let progressDotEls = [];

  /* -----------------------------------------------------
     Data helpers
     ----------------------------------------------------- */

  function loadCollection() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        collected = new Set(
          parsed
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0 && value < ORNAMENTS.length)
        );
      }
    } catch (_) {
      collected = new Set();
    }
  }

  function saveCollection() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(collected)));
    } catch (_) {
      /* A private window can refuse session storage. The night still goes on. */
    }
  }

  function loadWishes() {
    try {
      const raw = localStorage.getItem(WISH_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((wish) => wish && typeof wish.text === 'string')
        .slice(-MAX_WISHES)
        .map((wish, index) => ({
          id: String(wish.id || `wish-${index}`),
          text: wish.text.slice(0, 48),
          x: clamp(Number(wish.x) || WISH_SPOTS.landscape[index % 8][0], 0.06, 0.94),
          y: clamp(Number(wish.y) || WISH_SPOTS.landscape[index % 8][1], 0.06, 0.46),
          createdAt: Number(wish.createdAt) || Date.now()
        }));
    } catch (_) {
      return [];
    }
  }

  function saveWishes() {
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify(wishes.slice(-MAX_WISHES)));
    } catch (_) {
      /* Keep this wish in memory if storage is blocked. */
    }
  }

  function chooseWishSpot() {
    const portrait = window.innerHeight / window.innerWidth > 1.08;
    const spots = portrait ? WISH_SPOTS.portrait : WISH_SPOTS.landscape;
    const used = new Set(wishes.map((wish) => `${wish.x.toFixed(2)},${wish.y.toFixed(2)}`));
    const free = spots.filter(([x, y]) => !used.has(`${x.toFixed(2)},${y.toFixed(2)}`));
    const chosen = (free.length ? pick(free) : pick(spots));
    return {
      x: chosen[0] + (free.length ? (Math.random() - 0.5) * 0.02 : (Math.random() - 0.5) * 0.16),
      y: chosen[1] + (free.length ? (Math.random() - 0.5) * 0.02 : (Math.random() - 0.5) * 0.05)
    };
  }

  /* -----------------------------------------------------
     Dialog helpers
     ----------------------------------------------------- */

  function openDialog(dialog, focusTarget) {
    if (!dialog) return;
    clearTimeout(dialog._closeTimer);
    if (dialog.open) {
      dialog.classList.add('is-open');
      return;
    }
    // Some browsers require showModal to be called during a user gesture.
    try {
      dialog.showModal();
    } catch (_) {
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => dialog.classList.add('is-open'));
    });
    document.body.classList.add('has-dialog');
    if (focusTarget) {
      window.setTimeout(() => {
        try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
      }, 430);
    }
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    dialog.classList.remove('is-open');
    clearTimeout(dialog._closeTimer);
    dialog._closeTimer = window.setTimeout(() => {
      if (dialog.open) dialog.close();
      if (!document.querySelector('dialog[open]')) {
        document.body.classList.remove('has-dialog');
      }
    }, reduceMotion ? 30 : 340);
  }

  function closeOtherDialogs(except) {
    $$('dialog[open]').forEach((dialog) => {
      if (dialog !== except) closeDialog(dialog);
    });
  }

  function setupDialogs() {
    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeDialog(dialog);
      });
      dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog[open]')) {
          document.body.classList.remove('has-dialog');
        }
      });
    });

    document.addEventListener('click', (event) => {
      const close = event.target.closest('[data-close]');
      if (!close) return;
      const dialog = close.closest('dialog');
      if (dialog) closeDialog(dialog);
    });
  }

  /* -----------------------------------------------------
     Toast & onboarding
     ----------------------------------------------------- */

  function showToast(message, duration = 4200) {
    if (!elements.toastRegion) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    elements.toastRegion.appendChild(toast);

    while (elements.toastRegion.children.length > 2) {
      elements.toastRegion.firstElementChild.remove();
    }

    window.setTimeout(() => {
      toast.classList.add('is-out');
      window.setTimeout(() => toast.remove(), 420);
    }, Math.max(1200, duration));
  }

  function hidePrompt() {
    interacted = true;
    if (elements.topperPrompt) elements.topperPrompt.classList.add('is-hidden');
    clearTimeout(promptTimer);
  }

  function showPromptSoon() {
    const tightLandscape = window.matchMedia('(orientation: landscape) and (max-height: 560px)').matches;
    if (tightLandscape) {
      elements.topperPrompt.classList.add('is-hidden');
      window.setTimeout(() => {
        showToast('拖动旋转 · 轻触彩球 · 点亮星星许愿', 5600);
      }, 1900);
      return;
    }
    if (reduceMotion) {
      elements.topperPrompt.classList.add('is-visible');
      return;
    }
    promptTimer = window.setTimeout(() => {
      if (interacted) return;
      elements.topperPrompt.classList.add('is-visible');
    }, 2500);
    window.setTimeout(() => {
      if (!interacted) elements.topperPrompt.classList.add('is-hidden');
    }, 17500);
  }

  function markInteraction() {
    hidePrompt();
  }

  /* -----------------------------------------------------
     Collection
     ----------------------------------------------------- */

  function setupProgress() {
    elements.progressDots.innerHTML = '';
    progressDotEls = ORNAMENTS.map((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'collection__dot';
      dot.dataset.index = String(i);
      elements.progressDots.appendChild(dot);
      return dot;
    });
    updateProgress();
  }

  function updateProgress() {
    elements.collectedCount.textContent = String(collected.size);
    elements.progressDots.setAttribute(
      'aria-label',
      `已收集 ${collected.size} 颗星愿，共 8 颗`
    );
    progressDotEls.forEach((dot, i) => {
      dot.classList.toggle('is-lit', collected.has(i));
    });
    if (collected.size === ORNAMENTS.length) {
      elements.collectionHint.textContent = '八颗星愿都亮了 · 抬头看看天空';
    } else if (collected.size === 0) {
      elements.collectionHint.textContent = '轻触树上的彩球，收集八份小小惊喜';
    } else {
      elements.collectionHint.textContent = `已收下 ${collected.size} 份来自北极的祝福`;
    }
    if (scene) scene.setCollected(Array.from(collected));
  }

  function openSurprise(index) {
    const ornament = ORNAMENTS[index];
    if (!ornament) return;
    markInteraction();
    closeOtherDialogs(elements.surpriseDialog);
    currentOrnament = index;
    const isCollected = collected.has(index);

    elements.surpriseEmblem.style.setProperty('--accent', ornament.color);
    elements.surpriseIcon.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-${ornament.icon}"></use></svg>`;
    elements.surpriseKicker.textContent = `NO. 0${index + 1} · ${ornament.english}`;
    elements.surpriseTitle.textContent = ornament.title;
    elements.surpriseQuote.textContent = ornament.quote;
    elements.surpriseCollect.textContent = isCollected ? '再看一次这份祝福' : ornament.action;
    elements.surpriseFootnote.textContent = isCollected
      ? `第 ${index + 1} / 8 颗星愿 · 已在你的星图里`
      : `第 ${index + 1} / 8 颗星愿 · 来自北极`;

    openDialog(elements.surpriseDialog, elements.surpriseCollect);
  }

  function collectCurrentOrnament() {
    const index = currentOrnament;
    if (index < 0) return;
    const ornament = ORNAMENTS[index];
    const wasCollected = collected.has(index);
    closeDialog(elements.surpriseDialog);
    markInteraction();

    window.setTimeout(() => {
      if (!scene) return;
      scene.triggerEffect(ornament.effect, index);
      if (audio && audio.enabled) {
        if (ornament.effect === 'bell') audio.chime('cool');
        else if (ornament.effect === 'moon') audio.chime('deep');
        else if (ornament.effect === 'reindeer') { /* the scene calls sleigh bells itself */ }
        else audio.chime(index % 2 ? 'warm' : 'cool');
      }

      if (!wasCollected) {
        collected.add(index);
        saveCollection();
        updateProgress();
        showToast(`第 ${collected.size} 颗星愿「${ornament.name}」，已收进今夜。`, 3200);
      }
      if (collected.size === ORNAMENTS.length && !finaleShown) {
        finaleShown = true;
        window.setTimeout(showFinale, reduceMotion ? 250 : 1900);
      }
    }, reduceMotion ? 40 : 310);
  }

  function showFinale() {
    if (!scene || !elements.finaleDialog) return;
    hidePrompt();
    if (audio && audio.enabled) audio.finale();
    scene.triggerGrandFinale();
    openDialog(elements.finaleDialog, elements.finaleWish);
  }

  /* -----------------------------------------------------
     Wishes
     ----------------------------------------------------- */

  function renderWishHistory() {
    if (!elements.wishPast || !elements.wishPastList) return;
    if (!wishes.length) {
      elements.wishPast.hidden = true;
      elements.wishPastList.innerHTML = '';
      return;
    }
    elements.wishPast.hidden = false;
    elements.wishPastList.innerHTML = '';
    wishes.slice(-4).reverse().forEach((wish) => {
      const li = document.createElement('li');
      li.textContent = wish.text;
      li.title = wish.text;
      elements.wishPastList.appendChild(li);
    });
  }

  function openWish() {
    markInteraction();
    closeOtherDialogs(elements.wishDialog);
    elements.wishError.hidden = true;
    elements.wishForm.classList.remove('is-shaking');
    elements.wishCount.textContent = String(elements.wishInput.value.length);
    renderWishHistory();
    openDialog(elements.wishDialog, elements.wishInput);
  }

  function showWishError() {
    elements.wishError.hidden = false;
    elements.wishForm.classList.remove('is-shaking');
    // Restart the little error animation.
    void elements.wishForm.offsetWidth;
    elements.wishForm.classList.add('is-shaking');
    elements.wishInput.focus();
  }

  function submitWish(event) {
    event.preventDefault();
    const text = elements.wishInput.value.trim().replace(/\s+/g, ' ');
    if (!text) {
      showWishError();
      return;
    }
    if (text.length < 2) {
      showWishError();
      return;
    }
    elements.wishError.hidden = true;

    const spot = chooseWishSpot();
    const wish = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.slice(0, 48),
      x: spot.x,
      y: spot.y,
      createdAt: Date.now()
    };
    wishes.push(wish);
    wishes = wishes.slice(-MAX_WISHES);
    saveWishes();
    elements.wishInput.value = '';
    elements.wishCount.textContent = '0';
    closeDialog(elements.wishDialog);

    window.setTimeout(() => {
      if (scene) scene.releaseWish(wish);
      if (audio && audio.enabled) audio.chime('warm');
    }, reduceMotion ? 40 : 300);
  }

  /* -----------------------------------------------------
     Ambient interactions
     ----------------------------------------------------- */

  function catchMeteorBlessing() {
    hidePrompt();
    let index = Math.floor(Math.random() * METEOR_BLESSINGS.length);
    if (METEOR_BLESSINGS.length > 1 && index === lastMeteorLine) {
      index = (index + 1) % METEOR_BLESSINGS.length;
    }
    lastMeteorLine = index;
    if (audio && audio.enabled) audio.chime('cool');
    showToast(METEOR_BLESSINGS[index], 4600);
  }

  function moonBlessing() {
    hidePrompt();
    let index = Math.floor(Math.random() * MOON_BLESSINGS.length);
    if (MOON_BLESSINGS.length > 1 && index === lastMoonLine) {
      index = (index + 1) % MOON_BLESSINGS.length;
    }
    lastMoonLine = index;
    if (audio && audio.enabled) audio.chime('deep');
    showToast(MOON_BLESSINGS[index], 4200);
  }

  function wishClicked(wish) {
    if (!wish) return;
    hidePrompt();
    if (audio && audio.enabled) audio.chime('warm');
    showToast(`你曾把「${wish.text}」交给星光。它一直替你收着。`, 5600);
  }

  function wishLanded() {
    showToast('愿望已经挂上夜空。抬头看，它正在发光。', 4800);
  }

  function giftOpened(index) {
    hidePrompt();
    if (audio && audio.enabled) audio.chime(index % 2 ? 'warm' : 'deep');
    showToast(GIFT_BLESSINGS[index] || GIFT_BLESSINGS[0], 5400);
    openedGifts.add(index);
    if (openedGifts.size === 3) {
      window.setTimeout(() => showToast('三只礼盒都拆完啦。最后一句话：要一直快乐。', 5600), 1600);
    }
  }

  /* -----------------------------------------------------
     Postcard
     ----------------------------------------------------- */

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function wrapCanvasText(ctx, text, maxWidth, maxLines) {
    const chars = Array.from(text);
    const lines = [];
    let line = '';
    for (const char of chars) {
      const next = line + char;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = char;
        if (lines.length === maxLines) break;
      } else {
        line = next;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines) {
      const joined = lines.join('');
      if (joined.length < chars.length) {
        let last = lines[maxLines - 1];
        while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) {
          last = last.slice(0, -1);
        }
        lines[maxLines - 1] = last + '…';
      }
    }
    return lines;
  }

  function drawPostcard() {
    if (!scene) throw new Error('Scene is not ready');
    const portrait = window.innerHeight / window.innerWidth > 1.08;
    const CW = portrait ? 1200 : 1600;
    const CH = portrait ? 1500 : 1000;
    const pad = portrait ? 52 : 48;
    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    const g = canvas.getContext('2d');

    // Cover the postcard with the current night, keeping the tree in view.
    const source = elements.scene;
    const sourceW = scene.W;
    const sourceH = scene.H;
    const scale = Math.max(CW / sourceW, CH / sourceH);
    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const focus = clamp(
      ((scene.layout.starY + scene.layout.baseY) / 2) / scene.H,
      0.32,
      0.7
    );
    const dx = (CW - drawW) / 2;
    const dy = clamp(CH * 0.51 - drawH * focus, CH - drawH, 0);

    g.fillStyle = '#030c12';
    g.fillRect(0, 0, CW, CH);
    g.drawImage(source, 0, 0, source.width, source.height, dx, dy, drawW, drawH);

    // Cinematic grade.
    const topShade = g.createLinearGradient(0, 0, 0, CH * 0.36);
    topShade.addColorStop(0, 'rgba(1, 7, 11, 0.68)');
    topShade.addColorStop(1, 'rgba(1, 7, 11, 0)');
    g.fillStyle = topShade;
    g.fillRect(0, 0, CW, CH * 0.4);

    const bottomShade = g.createLinearGradient(0, CH * (portrait ? 0.48 : 0.38), 0, CH);
    bottomShade.addColorStop(0, 'rgba(1, 7, 11, 0)');
    bottomShade.addColorStop(0.55, 'rgba(2, 8, 12, 0.46)');
    bottomShade.addColorStop(1, 'rgba(2, 8, 12, 0.94)');
    g.fillStyle = bottomShade;
    g.fillRect(0, 0, CW, CH);

    if (!portrait) {
      const leftShade = g.createLinearGradient(0, 0, CW * 0.58, 0);
      leftShade.addColorStop(0, 'rgba(2, 8, 12, 0.7)');
      leftShade.addColorStop(1, 'rgba(2, 8, 12, 0)');
      g.fillStyle = leftShade;
      g.fillRect(0, 0, CW * 0.6, CH);
    }

    // A warm, barely-there vignette.
    const vignette = g.createRadialGradient(CW * 0.55, CH * 0.45, CH * 0.1, CW * 0.55, CH * 0.45, CH * 0.8);
    vignette.addColorStop(0, 'rgba(8, 20, 24, 0)');
    vignette.addColorStop(1, 'rgba(1, 5, 8, 0.48)');
    g.fillStyle = vignette;
    g.fillRect(0, 0, CW, CH);

    // Paper grain.
    for (let i = 0; i < 1700; i++) {
      const x = Math.random() * CW;
      const y = Math.random() * CH;
      g.fillStyle = Math.random() > 0.5
        ? `rgba(246, 236, 211, ${Math.random() * 0.032})`
        : `rgba(0, 0, 0, ${Math.random() * 0.04})`;
      g.fillRect(x, y, 1 + Math.random() * 1.4, 1 + Math.random() * 1.4);
    }

    // Frame.
    g.strokeStyle = 'rgba(239, 219, 176, 0.62)';
    g.lineWidth = portrait ? 1.5 : 1.4;
    g.strokeRect(pad, pad, CW - pad * 2, CH - pad * 2);
    g.strokeStyle = 'rgba(239, 219, 176, 0.16)';
    g.lineWidth = 1;
    g.strokeRect(pad + 9, pad + 9, CW - (pad + 9) * 2, CH - (pad + 9) * 2);

    // Corner flourishes.
    const corner = portrait ? 44 : 36;
    g.strokeStyle = 'rgba(245, 226, 184, 0.62)';
    g.lineWidth = 1;
    [
      [pad + 18, pad + 18, 1, 1],
      [CW - pad - 18, pad + 18, -1, 1],
      [pad + 18, CH - pad - 18, 1, -1],
      [CW - pad - 18, CH - pad - 18, -1, -1]
    ].forEach(([x, y, sx, sy]) => {
      g.beginPath();
      g.moveTo(x + sx * corner, y);
      g.lineTo(x, y);
      g.lineTo(x, y + sy * corner);
      g.stroke();
    });

    const year = new Date().getFullYear();
    const useChineseFont = '"Noto Serif SC", "Songti SC", "STSong", serif';
    const useEnglishFont = '"Cormorant Garamond", "Iowan Old Style", Baskerville, serif';
    const useSansFont = '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif';
    const latestWish = wishes.length ? wishes[wishes.length - 1].text : DEFAULT_WISH;

    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(245, 234, 208, 0.78)';
    g.font = `500 ${portrait ? 21 : 18}px ${useSansFont}`;
    g.letterSpacing = `${portrait ? 5 : 4}px`;
    g.fillText('FROM THE NORTH POLE, WITH LOVE', pad + 44, pad + 54);

    g.textAlign = 'right';
    g.fillStyle = 'rgba(236, 218, 178, 0.58)';
    g.font = `500 ${portrait ? 22 : 18}px ${useSansFont}`;
    g.fillText(`25 · 12 · ${year}`, CW - pad - 44, pad + 54);
    g.textAlign = 'left';
    g.letterSpacing = '0px';

    const textX = portrait ? pad + 58 : pad + 55;
    // One baseline controls the whole editorial block. The vertical rhythm is
    // deliberately generous so the italic display face never crowds the wish.
    const titleBaseY = portrait ? CH - 460 : CH - 410;
    const starCX = textX + 8;
    const starCY = titleBaseY - (portrait ? 122 : 122);
    const starGlow = g.createRadialGradient(starCX, starCY, 0, starCX, starCY, 34);
    starGlow.addColorStop(0, 'rgba(255, 241, 200, 0.42)');
    starGlow.addColorStop(1, 'rgba(255, 227, 165, 0)');
    g.fillStyle = starGlow;
    g.fillRect(starCX - 34, starCY - 34, 68, 68);
    g.fillStyle = 'rgba(248, 226, 175, 0.92)';
    drawCanvasStar(g, starCX, starCY, 10);

    g.fillStyle = 'rgba(239, 216, 166, 0.7)';
    g.font = `500 ${portrait ? 20 : 17}px ${useSansFont}`;
    g.letterSpacing = `${portrait ? 5 : 4}px`;
    g.fillText('A LITTLE CHRISTMAS WISH', textX, titleBaseY - 62);
    g.letterSpacing = '0px';

    g.fillStyle = 'rgba(249, 240, 218, 0.96)';
    g.font = `400 ${portrait ? 76 : 58}px ${useEnglishFont}`;
    g.fillText('Merry', textX - 4, titleBaseY);

    if (g.createLinearGradient) {
      const gold = g.createLinearGradient(textX, 0, textX + (portrait ? 780 : 650), 0);
      gold.addColorStop(0, '#fff0bf');
      gold.addColorStop(0.48, '#e6c47f');
      gold.addColorStop(1, '#f7e6b8');
      g.fillStyle = gold;
    } else {
      g.fillStyle = '#efd79e';
    }
    g.font = `italic 500 ${portrait ? 140 : 112}px ${useEnglishFont}`;
    g.fillText('Christmas', textX - 7, titleBaseY + (portrait ? 138 : 108));

    g.letterSpacing = '0px';
    g.fillStyle = 'rgba(238, 229, 210, 0.84)';
    g.font = `400 ${portrait ? 32 : 26}px ${useChineseFont}`;
    g.fillText('愿每一颗心，都有星光抵达。', textX, titleBaseY + (portrait ? 214 : 178));

    g.fillStyle = 'rgba(223, 235, 229, 0.54)';
    g.font = `400 ${portrait ? 24 : 20}px ${useChineseFont}`;
    const wishLines = wrapCanvasText(
      g,
      `「${latestWish}」`,
      portrait ? CW - textX - 90 : CW * 0.5,
      2
    );
    wishLines.forEach((line, i) => {
      g.fillText(line, textX, titleBaseY + (portrait ? 270 : 222) + i * (portrait ? 34 : 27));
    });

    const footerLineY = CH - pad - (portrait ? 66 : 68);
    g.strokeStyle = 'rgba(238, 220, 180, 0.2)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(textX, footerLineY);
    g.lineTo(textX + (portrait ? 100 : 76), footerLineY);
    g.stroke();

    g.fillStyle = 'rgba(233, 222, 199, 0.42)';
    g.font = `400 ${portrait ? 20 : 16}px ${useSansFont}`;
    g.letterSpacing = '3px';
    g.fillText('A NIGHT OF WISHES', textX, CH - pad - 37);
    g.letterSpacing = '0px';

    return canvas.toDataURL('image/jpeg', 0.93);
  }

  function drawCanvasStar(g, x, y, radius) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 4;
      const r = i % 2 === 0 ? radius : radius * 0.26;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }

  async function openPostcard() {
    markInteraction();
    closeOtherDialogs(elements.postcardDialog);
    const generation = ++postcardGeneration;
    elements.postcardImage.hidden = true;
    elements.postcardImage.removeAttribute('src');
    elements.postcardLoading.classList.remove('is-hidden');
    elements.postcardLoading.innerHTML = `
      <svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-star4"></use></svg>
      <span>正在收集月光…</span>
    `;
    elements.postcardDownload.href = '#';
    elements.postcardDownload.setAttribute('aria-disabled', 'true');
    openDialog(elements.postcardDialog);

    try {
      await Promise.race([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 1200))
      ]);
      await nextFrame();
      if (generation !== postcardGeneration) return;
      const url = drawPostcard();
      if (generation !== postcardGeneration) return;
      elements.postcardImage.onload = () => {
        elements.postcardLoading.classList.add('is-hidden');
        elements.postcardImage.hidden = false;
      };
      elements.postcardImage.src = url;
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      elements.postcardDownload.href = url;
      elements.postcardDownload.download = `noel-postcard-${stamp}.jpg`;
      elements.postcardDownload.removeAttribute('aria-disabled');
    } catch (error) {
      console.warn('[Noël] Postcard rendering failed:', error);
      elements.postcardLoading.innerHTML = '<span>月光晚了一点，请再试一次。</span>';
    }
  }

  /* -----------------------------------------------------
     Controls
     ----------------------------------------------------- */

  function setSoundState(on) {
    elements.soundToggle.classList.toggle('is-on', on);
    if (on) elements.soundToggle.classList.remove('is-inviting');
    elements.soundToggle.setAttribute('aria-pressed', String(on));
    elements.soundToggle.setAttribute('aria-label', on ? '关闭声音' : '开启声音');
  }

  function setIntroSoundVisible(visible) {
    const button = elements.introSound;
    if (!button) return;
    if (!visible) {
      button.classList.remove('is-visible');
      button.hidden = true;
      return;
    }
    if (!introActive || introFinished) return;
    button.hidden = false;
    requestAnimationFrame(() => button.classList.add('is-visible'));
  }

  async function requestAudio({ auto = false, quiet = false } = {}) {
    if (!audio || !audio.supported) {
      if (!auto && !quiet) showToast('这片星空暂时听不见风铃。');
      return false;
    }
    if (audio.enabled) {
      setSoundState(true);
      setIntroSoundVisible(false);
      return true;
    }
    if (audioStarting) return false;
    audioStarting = true;
    let ok = false;
    try {
      ok = auto ? await audio.autoStart() : await audio.enable();
    } catch (_) {
      ok = false;
    }
    audioStarting = false;
    setSoundState(ok);
    if (ok) {
      setIntroSoundVisible(false);
      if (introActive && !introFinished && elements.introStatus) {
        elements.introStatus.textContent = '音乐已开启 · 正在把星光挂上树梢';
      }
      if (!auto && !quiet && !introActive) {
        showToast('风铃和一首小夜曲，已为你开启。', 3800);
      }
    } else if (auto) {
      if (introActive && !introFinished) setIntroSoundVisible(true);
      elements.soundToggle.classList.add('is-inviting');
    } else if (!introActive && !quiet) {
      showToast('浏览器暂时没有放行声音，请再点一次声音按钮。', 4400);
    }
    return ok;
  }

  function attemptAutoSound() {
    if (audioAutoTried) return;
    audioAutoTried = true;
    if (!audio || !audio.supported) return;
    requestAudio({ auto: true, quiet: true });
  }

  async function toggleSound() {
    const now = performance.now();
    if (soundBusy || now - lastSoundToggleAt < 420) return;
    lastSoundToggleAt = now;
    if (!audio || !audio.supported) {
      showToast('这片星空暂时听不见风铃。');
      return;
    }
    markInteraction();
    if (audioStarting) {
      showToast('正在唤醒今夜的旋律，请稍等。', 2000);
      return;
    }
    soundBusy = true;
    if (audio.enabled) {
      audio.disable();
      setSoundState(false);
      soundBusy = false;
      showToast('声音已关闭。', 2400);
      return;
    }
    const ok = await audio.enable();
    setSoundState(ok);
    soundBusy = false;
    if (!ok) {
      showToast('浏览器暂时没有放行声音。请再点一次；若仍无声，可刷新页面或换用 Chrome / Edge。', 5400);
    } else {
      setIntroSoundVisible(false);
      showToast('风铃和一首小夜曲，已为你开启。', 4200);
    }
  }

  function toggleSnow() {
    markInteraction();
    snowOn = !snowOn;
    elements.snowToggle.classList.toggle('is-on', snowOn);
    elements.snowToggle.setAttribute('aria-pressed', String(snowOn));
    elements.snowToggle.setAttribute('aria-label', snowOn ? '关闭飘雪' : '开启飘雪');
    if (scene) scene.setSnowEnabled(snowOn);
    showToast(snowOn ? '雪又落下来了。' : '留一片安静给你。', 2600);
  }

  /* -----------------------------------------------------
     Keyboard secret
     ----------------------------------------------------- */

  function setupKeyboard() {
    document.addEventListener('keydown', (event) => {
      if (introActive && !introFinished) {
        if (event.key === 'Escape') {
          event.preventDefault();
          finishIntro(true);
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const typing = target && (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable
      );
      if (typing || document.querySelector('dialog[open]')) return;
      if (!/^[a-zA-Z]$/.test(event.key)) return;
      secretBuffer = (secretBuffer + event.key.toLowerCase()).slice(-12);
      const now = Date.now();
      if (now - secretAt > 2800) {
        secretBuffer = event.key.toLowerCase();
      }
      secretAt = now;
      if (secretBuffer.endsWith('merry') && now - lastSecret > 5000) {
        lastSecret = now;
        secretBuffer = '';
        if (scene) {
          for (let i = 0; i < 5; i++) {
            scene.queueFirework(0.16 + i * 0.17, 0.14 + (i % 3) * 0.09, i % 2 ? 'gold' : 'rose', true);
          }
          scene.spawnSparkBurst(scene.W * 0.5, scene.H * 0.35, 60, ['gold', 'white', 'rose', 'mint']);
          scene.spawnExtraSnow(35);
        }
        hidePrompt();
        if (audio && audio.enabled) audio.chime('warm');
        showToast('你找到了藏在风里的秘密：圣诞快乐，愿望成真。', 6000);
      }
    });
  }

  /* -----------------------------------------------------
     Init
     ----------------------------------------------------- */

  function setupUI() {
    setupDialogs();
    setupProgress();

    elements.soundToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleSound();
    });
    elements.snowToggle.addEventListener('click', toggleSnow);
    elements.postcardOpen.addEventListener('click', openPostcard);

    if (elements.intro) {
      elements.intro.addEventListener('pointerdown', () => {
        if (!audio || !audio.enabled) requestAudio({ auto: false, quiet: true });
      }, { passive: true });
    }
    if (elements.introSound) {
      elements.introSound.addEventListener('click', (event) => {
        event.stopPropagation();
        requestAudio({ auto: false });
      });
    }
    if (elements.introSkip) {
      elements.introSkip.addEventListener('click', (event) => {
        event.stopPropagation();
        requestAudio({ auto: false, quiet: true });
        finishIntro(true);
      });
    }
    elements.surpriseCollect.addEventListener('click', collectCurrentOrnament);
    elements.wishForm.addEventListener('submit', submitWish);
    elements.wishInput.addEventListener('input', () => {
      elements.wishCount.textContent = String(elements.wishInput.value.length);
      if (!elements.wishError.hidden) elements.wishError.hidden = true;
    });
    elements.wishInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        elements.wishForm.requestSubmit();
      }
    });
    elements.finaleWish.addEventListener('click', () => {
      closeDialog(elements.finaleDialog);
      window.setTimeout(openWish, reduceMotion ? 40 : 350);
    });

    if (!audio || !audio.supported) {
      elements.soundToggle.setAttribute('aria-label', '此浏览器不支持声音');
      elements.soundToggle.title = '此浏览器不支持声音';
    }

    setupKeyboard();
  }

  function createScene() {
    if (!window.ChristmasScene) return;
    scene = new window.ChristmasScene({
      canvas: elements.scene,
      ornamentLayer: elements.ornamentLayer,
      topperButton: elements.topper,
      topperPrompt: elements.topperPrompt,
      ornaments: ORNAMENTS,
      onOrnament: openSurprise,
      onTopper: () => {
        markInteraction();
        openWish();
      },
      onMeteorCatch: catchMeteorBlessing,
      onMoonClick: moonBlessing,
      onWishClick: wishClicked,
      onWishLanded: wishLanded,
      onGift: giftOpened,
      onReindeer: () => {
        if (audio && audio.enabled) audio.sleigh();
      },
      onSkyClick: () => {
        if (!interacted) hidePrompt();
      }
    });
    scene.setCollected(Array.from(collected));
    if (wishes.length) scene.setWishes(wishes);
    scene.setSnowEnabled(snowOn);
  }

  function hidePageFromAssistiveTech(hide) {
    const nodes = [elements.topbar, $('.hero'), $('.site-footer')].filter(Boolean);
    nodes.forEach((node) => {
      if (hide) node.setAttribute('aria-hidden', 'true');
      else node.removeAttribute('aria-hidden');
    });
  }

  function revealPage() {
    hidePageFromAssistiveTech(false);
    if (elements.topbar) elements.topbar.removeAttribute('inert');
    if (elements.treeUI) elements.treeUI.removeAttribute('inert');
    document.documentElement.classList.add('scene-live', 'is-ready');
    if (elements.curtain) elements.curtain.classList.add('is-hidden');
    if (scene) scene.setRenderEnabled(true);
    showPromptSoon();
  }

  function setIntroFlashPoint() {
    if (!elements.intro || !scene || !scene.layout) return;
    elements.intro.style.setProperty('--flash-x', `${scene.layout.centerX}px`);
    elements.intro.style.setProperty('--flash-y', `${scene.layout.starY}px`);
  }

  function startIntroSequence() {
    // The opening is the real tree: the main scene starts as a drift of
    // embers, then the actual needles, lights, ornaments and star assemble.
    if (scene) {
      scene.startAssembly();
      scene.setRenderEnabled(true);
    }
    document.documentElement.classList.add('scene-live');

    if (reduceMotion) {
      if (scene) scene.finishAssembly();
      if (elements.intro) {
        elements.intro.hidden = true;
        elements.intro.inert = true;
      }
      revealPage();
      attemptAutoSound();
      return;
    }

    introActive = true;
    introFinished = false;
    hidePageFromAssistiveTech(true);
    if (elements.curtain) elements.curtain.classList.add('is-hidden');
    elements.intro.hidden = false;
    elements.intro.inert = false;
    elements.intro.classList.add('is-playing');
    setIntroFlashPoint();
    attemptAutoSound();

    introTimers.push(window.setTimeout(() => {
      if (introFinished) return;
      elements.intro.classList.add('is-flashing');
      if (audio && audio.enabled) audio.chime('warm');
    }, 2650));

    introTimers.push(window.setTimeout(() => finishIntro(false), 3250));
  }

  function finishIntro(skipped = false) {
    if (introFinished) return;
    introFinished = true;
    introTimers.forEach((timer) => clearTimeout(timer));
    introTimers = [];

    if (scene) scene.finishAssembly();
    if (elements.intro) {
      elements.intro.classList.remove('is-playing');
      if (skipped) elements.intro.classList.add('is-skipped');
      elements.intro.classList.add('is-leaving');
      elements.intro.inert = true;
      elements.intro.setAttribute('aria-hidden', 'true');
      if (elements.intro.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }
    setIntroSoundVisible(false);
    revealPage();

    const hideDelay = skipped || reduceMotion ? 500 : 1180;
    window.setTimeout(() => {
      if (!elements.intro) return;
      elements.intro.hidden = true;
      elements.intro.classList.remove('is-leaving', 'is-skipped', 'is-flashing');
      introActive = false;
      if (!audio || !audio.enabled) {
        elements.soundToggle.classList.add('is-inviting');
        showToast('轻触右上角的声音按钮，今夜的旋律就会响起。', 4400);
      }
    }, hideDelay);
  }

  function boot() {
    const start = () => {
      startIntroSequence();
    };
    const delay = reduceMotion ? 20 : 450;
    if (document.readyState === 'complete') {
      window.setTimeout(start, delay);
    } else {
      window.addEventListener('load', () => {
        window.setTimeout(start, delay);
      }, { once: true });
    }
  }

  function init() {
    audio = window.ChristmasAudio ? new window.ChristmasAudio() : null;
    loadCollection();
    wishes = loadWishes();

    setupUI();
    createScene();
    if (scene) scene.setRenderEnabled(false);
    updateProgress();
    if (wishes.length) renderWishHistory();
    hidePageFromAssistiveTech(true);

    // The Chinese editorial block changes height once its serif arrives. Give
    // the scene a second measuring pass so the tree never crowds the copy.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (scene) scene.resize(false);
      }).catch(() => {});
    }

    // A small, intentionally public handle for tinkerers: you can reach in
    // from the browser console to spawn a meteor, recolor the evening, or
    // inspect the scene. Everything visible on the page remains plain DOM.
    window.NOEL = {
      version: '1.2.0',
      scene,
      audio,
      ornaments: ORNAMENTS,
      openWish,
      openPostcard,
      showToast,
      skipIntro: () => finishIntro(true)
    };

    // A small gift for anyone who lets the page sit for a while.
    window.setTimeout(() => {
      if (collected.size >= 3 && audio && !audio.enabled) {
        elements.soundToggle.classList.add('is-inviting');
      }
    }, 18000);

    boot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
