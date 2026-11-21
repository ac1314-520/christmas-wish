/* =========================================================
   星愿圣诞夜 · Scene engine
   A layered Canvas 2D winter world: aurora, alpine lake, snow,
   a volumetric particle spruce, and a small constellation of secrets.
   ========================================================= */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const {
    min, max, abs, sin, cos, PI, random, floor, round, hypot, atan2
  } = Math;
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rgba = (rgb, a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16)
    ];
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  class ChristmasScene {
    constructor(options) {
      this.options = options || {};
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.ornamentLayer = options.ornamentLayer;
      this.topperButton = options.topperButton;
      this.topperPrompt = options.topperPrompt;
      this.ornaments = (options.ornaments || []).map((o) => Object.assign({}, o));
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.isMobile = false;
      this.compact = false;
      this.W = 1;
      this.H = 1;
      this.dpr = 1;
      this.time = 0;
      this.lastTime = 0;
      this.elapsed = 0;
      this.started = performance.now();
      this.parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.pointerPos = { x: -1000, y: -1000 };
      this.rotation = 0;
      this.manualRotation = 0;
      this.drag = null;
      this.lastDragEnd = 0;
      this.lightProgress = 0;
      this.hoveredOrnament = -1;
      this.focusedOrnament = -1;
      this.snowEnabled = true;
      this.snowLevel = 1;
      this.auroraSurge = 0;
      this.moonSurge = 0;
      this.warmSurge = 0;
      this.starSurge = 0;
      this.snowSurge = 0;
      this.grand = 0;
      this.moonPulse = 0;
      this.nextMeteorAt = 7;
      this.nextReindeerAt = 34;
      this.reindeer = null;
      this.meteorQueue = [];
      this.meteors = [];
      this.fireworkQueue = [];
      this.fireworks = [];
      this.sparks = [];
      this.ripples = [];
      this.flashes = [];
      this.extraSnow = [];
      this.wishStars = [];
      this.wishFlights = [];
      this.ornamentScreen = [];
      this.hoveredWish = -1;
      this.hoveredMeteor = -1;
      this.hoveredMoon = false;
      this.ready = false;
      this.visible = true;
      this.renderEnabled = true;
      this.quality = 1;
      this.frameCount = 0;
      this.slowFrames = 0;
      this.lastFpsSample = 0;
      this.fps = 60;
      this.wind = 0;

      this.layout = null;
      this.sprites = this.makeSprites();
      this.buildOrnamentButtons();
      this.buildLayers();
      this.resize(true);
      this.bindEvents();
      this.buildTree();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    /* =====================================================
       Setup
       ===================================================== */

    makeSprites() {
      const makeGlow = (color, core = 1, size = 128) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const c = canvas.getContext('2d');
        const half = size / 2;
        const g = c.createRadialGradient(half, half, 0, half, half, half);
        g.addColorStop(0, `rgba(255, 255, 250, ${0.95 * core})`);
        g.addColorStop(0.055, `rgba(255, 250, 231, ${0.9 * core})`);
        g.addColorStop(0.16, rgba(color, 0.54 * core));
        g.addColorStop(0.42, rgba(color, 0.14 * core));
        g.addColorStop(0.7, rgba(color, 0.035 * core));
        g.addColorStop(1, rgba(color, 0));
        c.fillStyle = g;
        c.fillRect(0, 0, size, size);
        return canvas;
      };

      const glow = {
        gold: makeGlow([255, 207, 118]),
        warm: makeGlow([255, 228, 176]),
        white: makeGlow([232, 245, 244]),
        ice: makeGlow([157, 218, 255]),
        mint: makeGlow([127, 255, 219]),
        rose: makeGlow([255, 165, 174]),
        violet: makeGlow([188, 161, 255]),
        starGold: makeGlow([255, 214, 139], 1.1, 160)
      };

      const makeSnow = (flaked) => {
        const c = document.createElement('canvas');
        c.width = 96; c.height = 96;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(48, 48, 1, 48, 48, 48);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        g.addColorStop(0.07, 'rgba(245, 253, 255, 0.86)');
        g.addColorStop(0.22, 'rgba(221, 245, 252, 0.27)');
        g.addColorStop(0.58, 'rgba(202, 236, 246, 0.06)');
        g.addColorStop(1, 'rgba(202, 236, 246, 0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 96, 96);
        if (flaked) {
          x.translate(48, 48);
          x.strokeStyle = 'rgba(239, 253, 255, 0.62)';
          x.lineWidth = 1.2;
          x.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            x.rotate(PI / 3);
            x.beginPath();
            x.moveTo(0, -17);
            x.lineTo(0, 17);
            x.moveTo(0, -9);
            x.lineTo(-4, -13);
            x.moveTo(0, -9);
            x.lineTo(4, -13);
            x.stroke();
          }
        }
        return c;
      };

      return {
        glow,
        snowSoft: makeSnow(false),
        snowFlaked: makeSnow(true),
        moonDisc: this.makeMoonTexture(),
        aurora: [
          this.makeAuroraTexture(0x41cafe, 0),
          this.makeAuroraTexture(0x1a77a3, 1)
        ]
      };
    }

    makeMoonTexture() {
      const size = 512;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const x = c.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.41;
      const disc = x.createRadialGradient(cx - r * 0.3, cy - r * 0.34, r * 0.04, cx + r * 0.08, cy + r * 0.1, r);
      disc.addColorStop(0, '#fcfaf2');
      disc.addColorStop(0.22, '#e9e6d9');
      disc.addColorStop(0.52, '#d3d2c6');
      disc.addColorStop(0.78, '#b8bbb1');
      disc.addColorStop(0.94, '#969d95');
      disc.addColorStop(1, '#7b857f');
      x.fillStyle = disc;
      x.beginPath();
      x.arc(cx, cy, r, 0, TAU);
      x.fill();

      // Very quiet maria, so the moon stays graphic rather than photographic.
      const craters = [
        [-0.28, -0.16, 0.24, 0.16],
        [0.15, -0.3, 0.15, 0.12],
        [0.28, 0.12, 0.21, 0.14],
        [-0.10, 0.31, 0.14, 0.11],
        [-0.46, 0.19, 0.13, 0.08],
        [0.04, 0.02, 0.09, 0.07],
        [-0.05, -0.37, 0.08, 0.06],
        [0.42, -0.17, 0.06, 0.05]
      ];
      x.save();
      x.beginPath();
      x.arc(cx, cy, r, 0, TAU);
      x.clip();
      craters.forEach(([ox, oy, rr, alpha]) => {
        const g = x.createRadialGradient(
          cx + ox * r, cy + oy * r, 0,
          cx + ox * r, cy + oy * r, rr * r
        );
        g.addColorStop(0, `rgba(111, 119, 113, ${alpha})`);
        g.addColorStop(0.6, `rgba(135, 141, 133, ${alpha * 0.54})`);
        g.addColorStop(1, 'rgba(135, 141, 133, 0)');
        x.fillStyle = g;
        x.beginPath();
        x.arc(cx + ox * r, cy + oy * r, rr * r, 0, TAU);
        x.fill();
      });

      // Frosty rim.
      const rim = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      rim.addColorStop(0, 'rgba(255, 255, 244, 0.9)');
      rim.addColorStop(0.55, 'rgba(255, 251, 229, 0.18)');
      rim.addColorStop(1, 'rgba(255, 242, 205, 0.45)');
      x.strokeStyle = rim;
      x.lineWidth = 2.1;
      x.beginPath();
      x.arc(cx, cy, r - 1, 0, TAU);
      x.stroke();

      // A cool shadow on the right edge gives the moon a little globe-like depth.
      const shade = x.createLinearGradient(cx - r * 0.2, cy, cx + r, cy + r);
      shade.addColorStop(0, 'rgba(35, 61, 74, 0)');
      shade.addColorStop(0.7, 'rgba(33, 57, 70, 0.08)');
      shade.addColorStop(1, 'rgba(16, 38, 50, 0.28)');
      x.fillStyle = shade;
      x.beginPath();
      x.arc(cx, cy, r, 0, TAU);
      x.fill();
      x.restore();
      return c;
    }

    makeAuroraTexture(seed, variant) {
      const rng = mulberry32(seed);
      const w = 900;
      const h = 560;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      const palettes = variant === 0
        ? [
            [82, 255, 200],
            [74, 232, 214],
            [94, 187, 255],
            [158, 135, 255]
          ]
        : [
            [87, 210, 187],
            [67, 238, 207],
            [123, 164, 255],
            [221, 135, 255]
          ];

      // Broad curtains.
      x.save();
      x.filter = 'blur(24px)';
      for (let band = 0; band < 4; band++) {
        const top = 36 + band * 29 + rng() * 34;
        const bottom = 230 + band * 40 + rng() * 80;
        const phase = rng() * TAU;
        const amp = 14 + rng() * 20;
        const g = x.createLinearGradient(0, top, 0, bottom + 80);
        g.addColorStop(0, rgba(palettes[0], 0));
        g.addColorStop(0.12, rgba(palettes[0], 0.18));
        g.addColorStop(0.38, rgba(palettes[1], 0.32));
        g.addColorStop(0.66, rgba(palettes[2], 0.17));
        g.addColorStop(1, rgba(palettes[3], 0));
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(-90, top);
        for (let xx = -90; xx <= w + 90; xx += 28) {
          const t = xx / w;
          const y = top + sin(t * 4.4 + phase) * amp + sin(t * 11 + phase * 2) * 4;
          x.lineTo(xx, y);
        }
        x.lineTo(w + 90, bottom + 100);
        for (let xx = w + 90; xx >= -90; xx -= 36) {
          const t = xx / w;
          const y = bottom + sin(t * 3.3 + phase + 0.8) * amp * 0.8;
          x.lineTo(xx, y);
        }
        x.closePath();
        x.fill();
      }
      x.restore();

      // The fine vertical rays that make an aurora feel alive.
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.filter = 'blur(2.4px)';
      for (let i = 0; i < 145; i++) {
        const t = i / 145;
        const bx = -50 + t * (w + 100) + (rng() - 0.5) * 18;
        const env =
          Math.pow(max(0, sin(t * PI * 2.25 + 0.7)), 2.2) * 0.75 +
          Math.pow(max(0, sin(t * PI * 3.3 + 2.1)), 2.8) * 0.5;
        if (env < 0.09) continue;
        const top = 30 + sin(t * 8 + 2) * 18 + rng() * 38;
        const len = (150 + rng() * 260) * (0.6 + env);
        const hue = palettes[Math.min(palettes.length - 1, floor(t * 3 + rng() * 1.5))];
        const g = x.createLinearGradient(0, top, 0, top + len);
        g.addColorStop(0, rgba(hue, 0));
        g.addColorStop(0.14, rgba(hue, 0.12 * env));
        g.addColorStop(0.45, rgba(hue, 0.25 * env));
        g.addColorStop(0.82, rgba(palettes[3], 0.065 * env));
        g.addColorStop(1, rgba(palettes[3], 0));
        x.fillStyle = g;
        x.fillRect(bx, top, 0.8 + rng() * 2.4, len);
      }
      x.restore();

      // Fade the four edges so the texture can drift without seams.
      x.globalCompositeOperation = 'destination-in';
      const fade = x.createLinearGradient(0, 0, w, 0);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(0.12, 'rgba(0,0,0,1)');
      fade.addColorStop(0.82, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = fade;
      x.fillRect(0, 0, w, h);
      const fadeY = x.createLinearGradient(0, 0, 0, h);
      fadeY.addColorStop(0, 'rgba(0,0,0,0)');
      fadeY.addColorStop(0.2, 'rgba(0,0,0,1)');
      fadeY.addColorStop(0.8, 'rgba(0,0,0,1)');
      fadeY.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in';
      x.fillStyle = fadeY;
      x.fillRect(0, 0, w, h);
      return c;
    }

    buildOrnamentButtons() {
      if (!this.ornamentLayer) return;
      this.ornamentButtons = this.ornaments.map((ornament, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ornament-hit';
        button.setAttribute('aria-label', `打开${ornament.name}的祝福：第 ${index + 1} 颗星愿`);
        button.setAttribute('aria-haspopup', 'dialog');
        button.style.setProperty('--accent', ornament.color);
        const label = document.createElement('span');
        label.className = 'ornament-hit__label';
        label.textContent = ornament.name;
        button.appendChild(label);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          if (this.options.onOrnament) this.options.onOrnament(index);
        });
        button.addEventListener('pointerenter', () => {
          this.hoveredOrnament = index;
        });
        button.addEventListener('pointerleave', () => {
          if (this.hoveredOrnament === index) this.hoveredOrnament = -1;
        });
        button.addEventListener('focus', () => { this.focusedOrnament = index; });
        button.addEventListener('blur', () => {
          if (this.focusedOrnament === index) this.focusedOrnament = -1;
        });
        button.style.transform = 'translate3d(-999px, -999px, 0)';
        this.ornamentLayer.appendChild(button);
        return button;
      });

      if (this.topperButton) {
        this.topperButton.addEventListener('click', (event) => {
          event.stopPropagation();
          if (this.options.onTopper) this.options.onTopper();
        });
      }
    }

    buildLayers() {
      this.treeLayer = document.createElement('canvas');
      this.treeCtx = this.treeLayer.getContext('2d');
      this.landLayer = document.createElement('canvas');
      this.landCtx = this.landLayer.getContext('2d');
      this.skyLayer = document.createElement('canvas');
      this.skyCtx = this.skyLayer.getContext('2d');
    }

    bindEvents() {
      this.onPointerDown = this.handlePointerDown.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerUp = this.handlePointerUp.bind(this);
      this.onPointerLeave = this.handlePointerLeave.bind(this);
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerup', this.onPointerUp);
      this.canvas.addEventListener('pointercancel', this.onPointerUp);
      this.canvas.addEventListener('pointerleave', this.onPointerLeave);

      this.onResize = () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.resize(false), 130);
      };
      window.addEventListener('resize', this.onResize, { passive: true });

      this.onVisibility = () => {
        this.visible = !document.hidden;
        if (this.visible) this.lastTime = performance.now();
      };
      document.addEventListener('visibilitychange', this.onVisibility);

      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMotion = (event) => {
        this.reducedMotion = event.matches;
        if (this.reducedMotion) {
          this.nextMeteorAt = Infinity;
          this.nextReindeerAt = Infinity;
        } else if (!isFinite(this.nextMeteorAt)) {
          this.nextMeteorAt = this.time + 10;
          this.nextReindeerAt = this.time + 35;
        }
      };
      if (this.motionQuery.addEventListener) this.motionQuery.addEventListener('change', handleMotion);
      else if (this.motionQuery.addListener) this.motionQuery.addListener(handleMotion);
    }

    /* =====================================================
       Layout & procedural scenery
       ===================================================== */

    resize(initial) {
      const vw = max(1, window.innerWidth);
      const vh = max(1, window.innerHeight);
      const isMobile = vw <= 760;
      const compact = vh <= 600 || (vw <= 960 && vh <= 560);
      const hadLayout = Boolean(this.layout);
      this.isMobile = isMobile;
      this.compact = compact;
      this.W = vw;
      this.H = vh;
      this.dpr = min(window.devicePixelRatio || 1, isMobile ? 2 : 2);

      [this.canvas, this.treeLayer, this.landLayer, this.skyLayer].forEach((canvas) => {
        canvas.width = round(vw * this.dpr);
        canvas.height = round(vh * this.dpr);
      });

      [this.ctx, this.treeCtx, this.landCtx, this.skyCtx].forEach((context) => {
        context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        context.imageSmoothingEnabled = true;
      });

      this.layout = this.computeLayout(vw, vh, isMobile, compact);
      this.buildSkyLayer();
      this.buildLandLayer();
      this.buildSnow();
      this.buildBokeh();
      this.buildBackdropStars();
      this.buildMeteorSchedule(initial);

      // Keep the scene responsive when the aspect ratio changes a lot.
      if (!initial && hadLayout) {
        this.buildTree();
      }
      this.ready = true;
      if (this.options.onResize) this.options.onResize(this.layout);
    }

    computeLayout(W, H, isMobile, compact) {
      let centerX;
      let baseY;
      let treeTopY;
      let treeHeight;
      let baseRadius;
      let starSize;
      const tightLandscape = (
        (H <= 560 || (W > 760 && W <= 1100 && H <= 680)) &&
        W > H * 1.05
      );

      if (tightLandscape) {
        // Landscape phones need their own composition: a small editorial block
        // on the left, a whole tree on the right, and breathing room below the
        // header for the star.
        centerX = W * 0.7;
        baseY = H * 0.875;
        treeTopY = H * 0.31;
        treeHeight = baseY - treeTopY;
        baseRadius = min(treeHeight * 0.38, W * 0.22);
        starSize = clamp(treeHeight * 0.046, 12, 21);
      } else if (isMobile) {
        centerX = W * 0.5;
        baseY = H * 0.835;
        const topFallback = H <= 720 ? 0.355 : 0.375;
        let measuredTop = 0;
        // Measure the real editorial block, because Chinese serif metrics and
        // the collection strip vary by device. This keeps the first wish safely
        // below the copy even on small phones.
        const prose = document.querySelector('.prose');
        if (prose) {
          const rect = prose.getBoundingClientRect();
          if (rect.height > 0 && rect.top < H * 0.7) measuredTop = rect.bottom + 34;
        }
        treeTopY = max(H * topFallback, measuredTop || 0);
        treeTopY = min(treeTopY, H * 0.52);
        treeHeight = baseY - treeTopY;
        baseRadius = min(treeHeight * 0.36, W * 0.385);
        starSize = clamp(treeHeight * 0.043, 14, 25);
      } else if (compact) {
        centerX = W * 0.655;
        baseY = H * 0.895;
        treeTopY = H * 0.18;
        treeHeight = min(baseY - treeTopY, H * 0.69, W * 0.44);
        baseRadius = min(treeHeight * 0.345, W * 0.19);
        starSize = clamp(treeHeight * 0.042, 17, 30);
      } else {
        // On portrait tablets this branch gets more room than a desktop
        // window: the tree fills the right-hand column instead of becoming a
        // miniature beneath a generous sky.
        centerX = W * (W < 1200 ? 0.66 : 0.635);
        baseY = H * 0.825;
        treeTopY = H * 0.18;
        treeHeight = min(baseY - treeTopY, H * 0.655, W * 0.75);
        baseRadius = min(treeHeight * 0.345, W * 0.24);
        starSize = clamp(treeHeight * 0.043, 19, 33);
      }

      // Whatever the caps above, the crown of the tree is the actual top of
      // the foliage. The star and the canopy must both use this coordinate.
      treeTopY = baseY - treeHeight;

      // The star sits a breath beyond the tree's tip.
      const starY = treeTopY - treeHeight * 0.032;
      let moonRadius;
      let moon;
      if (tightLandscape) {
        moonRadius = clamp(min(W, H) * 0.086, 26, 38);
        moon = { x: W * 0.845, y: H * 0.275, r: moonRadius };
      } else {
        moonRadius = isMobile
          ? clamp(W * 0.125, 36, 58)
          : clamp(min(W, H) * 0.085, 48, 102);
        moon = isMobile
          ? { x: W * 0.80, y: H * 0.135, r: moonRadius }
          : { x: W * 0.825, y: H * 0.185, r: moonRadius };
      }

      return {
        W, H, isMobile, compact, tightLandscape,
        centerX, baseY, treeTopY, treeHeight, baseRadius, starY, starSize,
        moon,
        horizon: H * (tightLandscape ? 0.72 : 0.705),
        copy: { x: isMobile ? W * 0.5 : W * 0.07 },
        reflectionTop: baseY + 4,
        reindeerY: H * (tightLandscape ? 0.38 : isMobile ? 0.27 : 0.24)
      };
    }

    buildSkyLayer() {
      const { W, H, moon, horizon } = this.layout;
      const x = this.skyCtx;
      x.clearRect(0, 0, W, H);
      const sky = x.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#01040a');
      sky.addColorStop(0.22, '#04101a');
      sky.addColorStop(0.46, '#071b28');
      sky.addColorStop(0.68, '#0b2531');
      sky.addColorStop(0.82, '#0d2932');
      sky.addColorStop(1, '#06131a');
      x.fillStyle = sky;
      x.fillRect(0, 0, W, H);

      // A distant teal bloom behind the tree.
      const glow = x.createRadialGradient(W * 0.56, H * 0.58, 0, W * 0.56, H * 0.58, H * 0.54);
      glow.addColorStop(0, 'rgba(24, 92, 86, 0.13)');
      glow.addColorStop(0.4, 'rgba(13, 58, 65, 0.08)');
      glow.addColorStop(1, 'rgba(5, 18, 24, 0)');
      x.fillStyle = glow;
      x.fillRect(0, 0, W, H);

      const moonGlow = x.createRadialGradient(moon.x, moon.y, moon.r * 0.1, moon.x, moon.y, moon.r * 5);
      moonGlow.addColorStop(0, 'rgba(243, 224, 178, 0.075)');
      moonGlow.addColorStop(0.35, 'rgba(220, 200, 162, 0.035)');
      moonGlow.addColorStop(1, 'rgba(220, 200, 162, 0)');
      x.fillStyle = moonGlow;
      x.fillRect(0, 0, W, H);

      // A quiet milky way.
      const rng = mulberry32(9182);
      x.save();
      x.translate(W * 0.38, H * 0.16);
      x.rotate(-0.46);
      x.scale(1, 0.23);
      const band = x.createRadialGradient(0, 0, 0, 0, 0, W * 0.64);
      band.addColorStop(0, 'rgba(116, 155, 158, 0.075)');
      band.addColorStop(0.35, 'rgba(82, 134, 143, 0.05)');
      band.addColorStop(0.72, 'rgba(96, 108, 153, 0.025)');
      band.addColorStop(1, 'rgba(80, 98, 136, 0)');
      x.fillStyle = band;
      x.fillRect(-W, -H, W * 2.2, H * 2);
      for (let i = 0; i < (this.isMobile ? 480 : 940); i++) {
        const t = rng();
        const px = (t - 0.5) * W * 1.45;
        const py = (rng() - 0.5) * H * 0.42 * (0.35 + rng() * 1.1);
        const a = (0.055 + rng() * 0.16) * (1 - abs(t - 0.5) * 0.9);
        x.fillStyle = rng() > 0.84
          ? `rgba(246, 216, 163, ${a * 1.2})`
          : `rgba(207, 231, 236, ${a})`;
        x.fillRect(px, py, 0.65 + rng() * 1.1, 0.65 + rng() * 1.1);
      }
      x.restore();

      // Horizon mist.
      const mist = x.createLinearGradient(0, H * 0.58, 0, horizon + 36);
      mist.addColorStop(0, 'rgba(16, 46, 53, 0)');
      mist.addColorStop(0.56, 'rgba(20, 58, 62, 0.23)');
      mist.addColorStop(1, 'rgba(13, 35, 41, 0)');
      x.fillStyle = mist;
      x.fillRect(0, H * 0.55, W, H * 0.25);
    }

    buildLandLayer() {
      const { W, H, horizon, baseY, centerX, baseRadius, isMobile } = this.layout;
      const x = this.landCtx;
      x.clearRect(0, 0, W, H);
      const rng = mulberry32(11026);

      this.drawMountainRange(x, W, H, horizon, {
        seed: 24,
        offset: 0,
        height: H * 0.205,
        colorTop: '#0b202c',
        colorBottom: '#0a1c25',
        snow: 0.36,
        opacity: 0.92
      });
      this.drawMountainRange(x, W, H, horizon + H * 0.025, {
        seed: 93,
        offset: W * 0.06,
        height: H * 0.135,
        colorTop: '#0b232d',
        colorBottom: '#081b23',
        snow: 0.24,
        opacity: 1
      });

      // A frozen lake, made of layered bands and fine frost cracks.
      const ice = x.createLinearGradient(0, horizon - 6, 0, H);
      ice.addColorStop(0, '#0b2a33');
      ice.addColorStop(0.34, '#081b24');
      ice.addColorStop(0.74, '#06151c');
      ice.addColorStop(1, '#041017');
      x.fillStyle = ice;
      x.fillRect(0, horizon - 8, W, H - horizon + 8);

      const lakeGlow = x.createRadialGradient(centerX, baseY + H * 0.07, 0, centerX, baseY + H * 0.07, W * 0.38);
      lakeGlow.addColorStop(0, 'rgba(74, 141, 133, 0.09)');
      lakeGlow.addColorStop(0.45, 'rgba(43, 98, 104, 0.04)');
      lakeGlow.addColorStop(1, 'rgba(7, 23, 29, 0)');
      x.fillStyle = lakeGlow;
      x.fillRect(0, horizon, W, H - horizon);

      // Soft snowbanks at the edges frame the lake like brush strokes.
      const drawBank = (side) => {
        const direction = side === 'left' ? 1 : -1;
        const anchorX = side === 'left' ? -W * 0.08 : W * 1.08;
        const bankW = W * (isMobile ? 0.36 : 0.28);
        x.beginPath();
        x.moveTo(anchorX, H * 0.73);
        x.bezierCurveTo(
          anchorX + direction * bankW * 0.64, H * 0.72,
          anchorX + direction * bankW * 0.86, H * 0.8,
          anchorX + direction * bankW * 0.95, H
        );
        x.lineTo(anchorX, H);
        x.closePath();
        const g = x.createLinearGradient(anchorX, H * 0.73, anchorX + direction * bankW, H);
        g.addColorStop(0, 'rgba(194, 219, 218, 0.08)');
        g.addColorStop(0.18, 'rgba(174, 208, 208, 0.17)');
        g.addColorStop(0.5, 'rgba(102, 143, 151, 0.12)');
        g.addColorStop(1, 'rgba(21, 39, 48, 0.32)');
        x.fillStyle = g;
        x.fill();
        x.strokeStyle = 'rgba(216, 238, 236, 0.13)';
        x.lineWidth = 1;
        x.stroke();
      };
      drawBank('left');
      drawBank('right');

      // A gentle bed of snow beneath the tree.
      x.save();
      x.translate(centerX, baseY + 5);
      x.scale(1, 0.17);
      const bed = x.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 1.8);
      bed.addColorStop(0, 'rgba(216, 233, 222, 0.16)');
      bed.addColorStop(0.4, 'rgba(166, 201, 196, 0.1)');
      bed.addColorStop(0.76, 'rgba(97, 141, 145, 0.035)');
      bed.addColorStop(1, 'rgba(70, 114, 120, 0)');
      x.fillStyle = bed;
      x.beginPath();
      x.arc(0, 0, baseRadius * 1.8, 0, TAU);
      x.fill();
      x.restore();

      // Fine fractures and wind-polished lines across the ice.
      for (let i = 0; i < 22; i++) {
        const y = horizon + (H - horizon) * Math.pow(rng(), 0.9);
        const startX = rng() * W;
        const len = W * (0.04 + rng() * 0.2);
        x.strokeStyle = `rgba(157, 201, 202, ${0.022 + rng() * 0.045})`;
        x.lineWidth = 0.6 + rng() * 0.7;
        x.beginPath();
        x.moveTo(startX, y);
        x.bezierCurveTo(
          startX + len * 0.3, y - 2 - rng() * 4,
          startX + len * 0.7, y + 2 + rng() * 3,
          startX + len, y + (rng() - 0.5) * 4
        );
        x.stroke();
      }

      // Distant pines, more atmosphere than detail.
      const pines = isMobile ? 8 : 16;
      for (let i = 0; i < pines; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const px = side < 0
          ? W * (0.015 + rng() * 0.22)
          : W * (0.78 + rng() * 0.2);
        const py = horizon + H * (0.01 + rng() * 0.075);
        const ph = H * (0.035 + rng() * 0.072);
        this.drawPine(x, px, py, ph, `rgba(6, 30, 33, ${0.45 + rng() * 0.28})`, rng);
      }

      // Snow glints on the ice and banks.
      for (let i = 0; i < (isMobile ? 65 : 130); i++) {
        const px = rng() * W;
        const py = horizon + rng() * (H - horizon);
        const a = rng() * 0.18;
        x.fillStyle = `rgba(221, 243, 241, ${a})`;
        x.fillRect(px, py, 0.6 + rng() * 1.1, 0.6 + rng() * 0.8);
      }

      // Close foreground snow lips.
      const lip = x.createLinearGradient(0, H * 0.9, 0, H);
      lip.addColorStop(0, 'rgba(129, 172, 174, 0)');
      lip.addColorStop(1, 'rgba(83, 130, 137, 0.2)');
      x.fillStyle = lip;
      x.beginPath();
      x.moveTo(0, H);
      x.bezierCurveTo(W * 0.18, H * 0.925, W * 0.26, H * 0.965, W * 0.43, H * 0.977);
      x.bezierCurveTo(W * 0.66, H * 0.997, W * 0.8, H * 0.94, W, H * 0.947);
      x.lineTo(W, H);
      x.closePath();
      x.fill();
    }

    drawMountainRange(x, W, H, baseY, options) {
      const rng = mulberry32(options.seed);
      const points = [];
      const count = options.offset ? 13 : 10;
      const step = W / count;
      const top = baseY - options.height;
      for (let i = 0; i <= count; i++) {
        const peak = rng();
        const px = -step * 0.45 + i * step;
        const py = baseY - options.height * (0.2 + peak * 0.8) - (rng() - 0.5) * H * 0.035;
        points.push({ x: px, y: py });
      }
      x.save();
      x.globalAlpha = options.opacity;
      x.beginPath();
      x.moveTo(-W * 0.08, baseY + H * 0.03);
      x.lineTo(-W * 0.08, top + options.height * 0.4);
      points.forEach((p) => {
        x.lineTo(p.x, p.y);
      });
      x.lineTo(W * 1.08, baseY + H * 0.03);
      x.closePath();
      const fill = x.createLinearGradient(0, top, 0, baseY + 20);
      fill.addColorStop(0, options.colorTop);
      fill.addColorStop(1, options.colorBottom);
      x.fillStyle = fill;
      x.fill();

      // Rim light + a shy dusting of snow on the left faces.
      x.strokeStyle = 'rgba(146, 196, 201, 0.13)';
      x.lineWidth = 1;
      x.beginPath();
      points.forEach((p, i) => {
        if (i === 0) x.moveTo(p.x, p.y);
        else x.lineTo(p.x, p.y);
      });
      x.stroke();

      x.globalCompositeOperation = 'screen';

      // Snow settles as a thin veil along the whole ridge, not as separate
      // clip-art triangles. The band is deliberately uneven and translucent.
      x.beginPath();
      points.forEach((p, i) => {
        if (i === 0) x.moveTo(p.x, p.y);
        else x.lineTo(p.x, p.y);
      });
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        const depth = options.height * (0.05 + options.snow * (0.15 + rng() * 0.11));
        x.lineTo(p.x, p.y + depth);
      }
      x.closePath();
      const snowVeil = x.createLinearGradient(0, top, 0, top + options.height * 0.65);
      snowVeil.addColorStop(0, 'rgba(199, 227, 226, 0.2)');
      snowVeil.addColorStop(0.45, 'rgba(157, 199, 202, 0.07)');
      snowVeil.addColorStop(1, 'rgba(127, 174, 181, 0)');
      x.fillStyle = snowVeil;
      x.fill();

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.y > top + options.height * 0.54) continue;
        x.strokeStyle = 'rgba(198, 226, 226, 0.075)';
        x.lineWidth = 0.8;
        x.beginPath();
        x.moveTo(p.x, p.y + 1);
        x.lineTo(p.x - options.height * 0.035, p.y + options.height * 0.14);
        x.moveTo(p.x + 2, p.y + 3);
        x.lineTo(p.x + options.height * 0.03, p.y + options.height * 0.1);
        x.stroke();
      }
      x.restore();
    }

    drawPine(x, px, py, height, color, rng) {
      x.save();
      x.translate(px, py);
      x.fillStyle = color;
      x.beginPath();
      x.moveTo(0, -height);
      x.lineTo(height * (0.17 + rng() * 0.08), -height * 0.52);
      x.lineTo(height * 0.1, -height * 0.52);
      x.lineTo(height * 0.27, -height * 0.18);
      x.lineTo(height * 0.12, -height * 0.18);
      x.lineTo(height * 0.32, height * 0.04);
      x.lineTo(-height * 0.32, height * 0.04);
      x.lineTo(-height * 0.12, -height * 0.18);
      x.lineTo(-height * 0.27, -height * 0.18);
      x.lineTo(-height * 0.1, -height * 0.52);
      x.lineTo(-height * 0.17, -height * 0.52);
      x.closePath();
      x.fill();
      // A whisper of snow on the highest branches.
      x.strokeStyle = 'rgba(192, 223, 223, 0.15)';
      x.lineWidth = 0.8;
      x.beginPath();
      x.moveTo(0, -height);
      x.lineTo(height * 0.1, -height * 0.7);
      x.stroke();
      x.restore();
    }

    buildBackdropStars() {
      const rng = mulberry32(55119);
      const count = this.isMobile ? 120 : 230;
      this.stars = [];
      for (let i = 0; i < count; i++) {
        const x = rng();
        const y = Math.pow(rng(), 0.76) * 0.74;
        const size = rng() < 0.05 ? 1.2 + rng() * 1.8 : 0.34 + rng() * 0.7;
        const colorRoll = rng();
        this.stars.push({
          x,
          y,
          size: size * (this.H / 900 + 0.4),
          color: colorRoll > 0.89 ? 'gold' : colorRoll > 0.76 ? 'ice' : 'white',
          phase: rng() * TAU,
          speed: 0.25 + rng() * 1.15,
          bright: 0.25 + rng() * 0.5,
          parallax: 0.3 + rng() * 1.6,
          spike: rng() < 0.07
        });
      }
      this.stars.sort((a, b) => a.size - b.size);
    }

    buildSnow() {
      const rng = mulberry32(7104);
      const baseCount = this.isMobile ? 128 : 235;
      const count = this.reducedMotion ? Math.round(baseCount * 0.2) : baseCount;
      this.snowflakes = [];
      for (let i = 0; i < count; i++) {
        const depth = rng();
        this.snowflakes.push({
          x: rng(),
          y: rng(),
          z: 0.15 + depth * 0.85,
          speed: (0.014 + depth * 0.036) * (0.8 + rng() * 0.45),
          size: (0.62 + depth * 2.65) * (0.65 + rng() * 0.55),
          sway: 0.2 + rng() * 0.8,
          phase: rng() * TAU,
          spin: (rng() - 0.5) * 0.65,
          alpha: 0.18 + depth * 0.56,
          flake: depth > 0.56 && rng() > 0.38,
          extra: false,
          life: Infinity
        });
      }
    }

    buildBokeh() {
      const rng = mulberry32(8177);
      const count = this.isMobile ? 11 : 20;
      this.bokeh = [];
      for (let i = 0; i < count; i++) {
        this.bokeh.push({
          x: rng() * this.W,
          y: this.H * (0.18 + rng() * 0.68),
          size: 18 + rng() * 78,
          alpha: 0.012 + rng() * 0.038,
          speed: 0.02 + rng() * 0.07,
          phase: rng() * TAU,
          color: rng() > 0.75 ? 'gold' : rng() > 0.45 ? 'mint' : 'ice'
        });
      }
    }

    buildMeteorSchedule(initial) {
      if (this.reducedMotion) {
        this.nextMeteorAt = Infinity;
      } else if (initial) {
        this.nextMeteorAt = 8 + rand(0, 5);
      } else {
        this.nextMeteorAt = this.time + rand(10, 19);
      }
      this.nextReindeerAt = this.reducedMotion
        ? Infinity
        : this.time + rand(37, 65);
    }

    /* =====================================================
       Procedural tree geometry
       ===================================================== */

    radiusAt(y) {
      const t = clamp(y, 0, 1);
      return Math.pow(1 - t, 1.055) * (0.93 + 0.055 * sin(t * 29 + 1.8));
    }

    buildTree() {
      if (!this.ornaments.length) return;
      const rng = mulberry32(2608);
      const mobile = this.isMobile;
      const compact = this.compact;
      const areaFactor = clamp((this.W * this.H) / (1440 * 900), 0.45, 1.45);
      const count = floor((mobile ? 4300 : 9000) * (compact ? 0.84 : 1) * min(1.15, areaFactor));
      const tiers = mobile ? 30 : 36;
      const armsBase = mobile ? 8 : 9;

      const needles = [];
      const tierWeights = [];
      const tierInfo = [];
      for (let tier = 0; tier < tiers; tier++) {
        const t = tier / (tiers - 1);
        const y = 0.038 + 0.906 * Math.pow(t, 0.95);
        const radius = this.radiusAt(y);
        const weight = radius + 0.035;
        tierWeights.push(weight);
        tierInfo.push({ y, radius, weight, phase: rng() * TAU });
      }
      const weightSum = tierWeights.reduce((a, b) => a + b, 0);
      const allocated = tierInfo.map((tier) => floor(count * tier.weight / weightSum));
      let allocatedTotal = allocated.reduce((a, b) => a + b, 0);
      while (allocatedTotal < count) {
        allocated[floor(rng() * tiers)] += 1;
        allocatedTotal++;
      }

      const tonePool = [0, 0, 1, 1, 2, 2, 3, 3, 4];

      for (let tier = 0; tier < tiers; tier++) {
        const info = tierInfo[tier];
        const armCount = max(4, floor(lerp(armsBase, 4, info.y) + rng() * 2.4));
        const n = allocated[tier];
        for (let i = 0; i < n; i++) {
          const alongArm = rng() < 0.79;
          let angle;
          let radial;
          if (alongArm) {
            const armIndex = floor(rng() * armCount);
            const spread = 0.12 + rng() * 0.1;
            angle = info.phase + (armIndex / armCount) * TAU + (rng() - 0.5) * spread;
            radial = 0.12 + 0.89 * Math.pow(rng(), 0.77);
          } else {
            angle = rng() * TAU;
            radial = 0.05 + 0.94 * Math.sqrt(rng());
          }
          const tip = radial > 0.75 && rng() < 0.17;
          const tone = tip
            ? (rng() < 0.2 ? 5 : 4)
            : tonePool[floor(rng() * tonePool.length)];
          const droop = (0.007 + rng() * 0.019) * radial * radial;
          const jitterY = (rng() - 0.5) * 0.016;
          const y = clamp(info.y - droop + jitterY, 0.012, 0.985);
          const r = info.radius * radial;
          const x = cos(angle) * r;
          const z = sin(angle) * r;

          // Outward, gently drooping needles.
          const extend = 0.015 + rng() * 0.043;
          const tipR = r + extend * (0.55 + rng() * 0.8);
          const tipAngle = angle + (rng() - 0.5) * 0.16;
          const x2 = cos(tipAngle) * tipR;
          const z2 = sin(tipAngle) * tipR;
          const y2 = y - (0.007 + rng() * 0.021) - (tip ? 0.008 : 0);
          const band = tip ? 3 : undefined;
          needles.push({
            x, y, z,
            x2, y2: clamp(y2, 0.006, 1), z2,
            tone,
            band,
            phase: rng() * TAU,
            glint: tip && rng() < 0.09
          });
        }
      }

      // A little loose stardust around the branches — keeps the silhouette soft.
      const dustCount = floor((mobile ? 140 : 300) * areaFactor);
      const dust = [];
      for (let i = 0; i < dustCount; i++) {
        const y = 0.02 + Math.pow(rng(), 0.82) * 0.93;
        const radius = this.radiusAt(y) * (0.92 + rng() * 0.18);
        const angle = rng() * TAU;
        dust.push({
          x: cos(angle) * radius,
          y,
          z: sin(angle) * radius,
          size: 0.6 + rng() * 1.7,
          phase: rng() * TAU,
          color: rng() > 0.72 ? 'gold' : rng() > 0.45 ? 'mint' : 'white'
        });
      }

      // The eight interactive wishes, always on the visible face of the tree.
      const lightDensity = clamp(
        this.layout.treeHeight / (mobile ? 420 : 560),
        0.36,
        1.04
      );
      const lightCount = floor((mobile ? 180 : 304) * lightDensity * (compact && !this.layout.tightLandscape ? 0.9 : 1));
      const lights = [];
      const colorWeights = [
        'gold', 'gold', 'gold', 'warm', 'warm',
        'ice', 'rose', 'mint', 'gold', 'rose', 'ice'
      ];
      for (let i = 0; i < lightCount; i++) {
        const t = (i + 0.4) / lightCount;
        const spiral = rng() < 0.83;
        let y;
        let angle;
        if (spiral) {
          y = 0.055 + 0.87 * t;
          angle = t * TAU * 6.2 + 0.8;
        } else {
          y = 0.08 + rng() * 0.83;
          angle = rng() * TAU;
        }
        const r = this.radiusAt(y) * (0.92 + rng() * 0.12) + 0.045;
        lights.push({
          x: cos(angle) * r,
          y,
          z: sin(angle) * r,
          t,
          color: colorWeights[floor(rng() * colorWeights.length)],
          big: i % 11 === 0 || rng() < 0.045,
          phase: rng() * TAU,
          speed: 0.7 + rng() * 2.1,
          size: (0.9 + rng() * 0.5) * (mobile ? 0.84 : 1),
          appear: t
        });
      }

      const ornamentGeometry = this.ornaments.map((o, i) => {
        const y = clamp(o.y || (0.24 + i * 0.076), 0.14, 0.86);
        const offset = (o.angle !== undefined ? o.angle : (i % 2 === 0 ? -0.4 : 0.4));
        const angle = PI / 2 + offset;
        const r = this.radiusAt(y) * (1.01 + (i % 3) * 0.01);
        const accent = hexToRgb(o.color || '#f0d398');
        return {
          x: cos(angle) * r,
          y,
          z: sin(angle) * r,
          radius: 0,
          screenX: 0,
          screenY: 0,
          depth: 0,
          accent
        };
      });

      this.tree = {
        needles,
        dust,
        lights,
        ornaments: ornamentGeometry,
        lightProgress: this.lightProgress
      };
      this.needleBuckets = Array.from({ length: 4 }, () =>
        Array.from({ length: 6 }, () => [])
      );
      this.needleTones = [
        [12, 43, 37],
        [18, 62, 49],
        [27, 84, 64],
        [39, 105, 79],
        [86, 143, 107],
        [178, 205, 166]
      ];
      this.needleBandAlphas = [0.32, 0.5, 0.72, 0.98];
      this.needleToneAlphas = [0.82, 0.8, 0.76, 0.7, 0.56, 0.38];
    }

    /* =====================================================
       Snow & ambient motion
       ===================================================== */

    spawnExtraSnow(count) {
      for (let i = 0; i < count; i++) {
        const depth = rand(0.2, 1);
        this.extraSnow.push({
          x: rand(-0.1, 1.1),
          y: rand(-0.15, 0.45),
          z: depth,
          speed: rand(0.03, 0.09) * (0.5 + depth),
          size: rand(1, 4.2) * (0.6 + depth),
          sway: rand(0.2, 1),
          phase: rand(0, TAU),
          spin: rand(-0.7, 0.7),
          alpha: rand(0.22, 0.7),
          flake: depth > 0.6,
          extra: true,
          life: rand(6, 11)
        });
      }
    }

    /* =====================================================
       Interaction
       ===================================================== */

    handlePointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      this.pointerPos.x = event.clientX;
      this.pointerPos.y = event.clientY;
      this.updateParallaxTarget(event.clientX, event.clientY);
      this.drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        startRotation: this.manualRotation,
        startTime: performance.now(),
        moved: 0
      };
      this.lastDragEnd = 0;
      try { this.canvas.setPointerCapture(event.pointerId); } catch (_) {}
      this.canvas.classList.add('is-dragging');
    }

    handlePointerMove(event) {
      this.pointerPos.x = event.clientX;
      this.pointerPos.y = event.clientY;
      this.updateParallaxTarget(event.clientX, event.clientY);

      if (this.drag && event.pointerId === this.drag.id) {
        const dx = event.clientX - this.drag.startX;
        const dy = event.clientY - this.drag.startY;
        this.drag.moved = max(this.drag.moved, hypot(dx, dy));
        if (abs(dx) > 2) {
          this.manualRotation = clamp(
            this.drag.startRotation + dx * 0.0062,
            -0.72,
            0.72
          );
        }
        this.drag.lastX = event.clientX;
        return;
      }

      const target = this.hitTest(event.clientX, event.clientY);
      const pointable = target.type !== 'none';
      this.canvas.classList.toggle('is-pointable', pointable);
      this.hoveredWish = target.type === 'wish' ? target.index : -1;
      this.hoveredMeteor = target.type === 'meteor' ? target.index : -1;
      this.hoveredMoon = target.type === 'moon';
    }

    handlePointerUp(event) {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      const drag = this.drag;
      this.drag = null;
      this.lastDragEnd = this.time;
      this.canvas.classList.remove('is-dragging');
      try { this.canvas.releasePointerCapture(event.pointerId); } catch (_) {}

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const distance = hypot(dx, dy);
      const duration = performance.now() - drag.startTime;
      if (distance < 7 && duration < 700) {
        this.handleCanvasClick(event.clientX, event.clientY);
      }
    }

    handlePointerLeave() {
      if (this.drag) return;
      this.hoveredWish = -1;
      this.hoveredMeteor = -1;
      this.hoveredMoon = false;
      this.canvas.classList.remove('is-pointable');
      this.parallax.targetX = 0;
      this.parallax.targetY = 0;
    }

    updateParallaxTarget(clientX, clientY) {
      if (this.reducedMotion) return;
      this.parallax.targetX = (clientX / this.W - 0.5) * 2;
      this.parallax.targetY = (clientY / this.H - 0.5) * 2;
    }

    hitTest(x, y) {
      for (let i = this.wishStars.length - 1; i >= 0; i--) {
        const wish = this.wishStars[i];
        const px = wish.x * this.W;
        const py = wish.y * this.H;
        if (hypot(x - px, y - py) < 23) return { type: 'wish', index: i };
      }
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const meteor = this.meteors[i];
        if (hypot(x - meteor.x, y - meteor.y) < 48) return { type: 'meteor', index: i };
      }
      if (this.giftScreens) {
        for (let i = 0; i < this.giftScreens.length; i++) {
          const gift = this.giftScreens[i];
          if (
            x > gift.x - gift.w / 2 &&
            x < gift.x + gift.w / 2 &&
            y > gift.y - gift.h / 2 &&
            y < gift.y + gift.h / 2
          ) {
            return { type: 'gift', index: i };
          }
        }
      }
      if (this.layout) {
        const moon = this.layout.moon;
        if (hypot(x - moon.x, y - moon.y) < moon.r + 30) return { type: 'moon', index: 0 };
      }
      return { type: 'none', index: -1 };
    }

    handleCanvasClick(x, y) {
      const target = this.hitTest(x, y);
      if (target.type === 'wish') {
        const wish = this.wishStars[target.index];
        this.spawnSparkBurst(x, y, 22, ['gold', 'white']);
        if (this.options.onWishClick) this.options.onWishClick(wish);
        return;
      }
      if (target.type === 'meteor') {
        const meteor = this.meteors[target.index];
        this.catchMeteor(meteor, target.index);
        return;
      }
      if (target.type === 'moon') {
        this.moonPulse = 1;
        this.spawnMoonRings();
        if (this.options.onMoonClick) this.options.onMoonClick();
        return;
      }
      if (target.type === 'gift') {
        const gift = this.giftScreens[target.index];
        this.spawnSparkBurst(gift.x, gift.y, 24, ['gold', 'white', 'rose']);
        this.flashes.push({
          x: gift.x, y: gift.y, r: 8, max: 70, life: 0.7, maxLife: 0.7,
          color: [244, 215, 155]
        });
        if (this.options.onGift) this.options.onGift(target.index);
        return;
      }
      this.spawnClickRipple(x, y);
      this.spawnSparkBurst(x, y, 10 + floor(rand(0, 7)), ['gold', 'white', 'ice']);
      if (this.options.onSkyClick) this.options.onSkyClick(x, y);
    }

    catchMeteor(meteor, index) {
      this.spawnSparkBurst(meteor.x, meteor.y, 32, ['gold', 'white', 'rose']);
      this.ripples.push({
        x: meteor.x, y: meteor.y, r: 8, max: 48, life: 1, maxLife: 1, color: [255, 228, 170]
      });
      this.meteors.splice(index, 1);
      if (this.options.onMeteorCatch) this.options.onMeteorCatch();
    }

    /* =====================================================
       Public effects
       ===================================================== */

    setRenderEnabled(enabled) {
      this.renderEnabled = Boolean(enabled);
      if (this.renderEnabled) this.lastTime = performance.now();
    }

    setSnowEnabled(enabled) {
      this.snowEnabled = enabled;
    }

    setCollected(indices) {
      this.collected = new Set(indices);
      if (this.ornamentButtons) {
        this.ornamentButtons.forEach((button, i) => {
          button.classList.toggle('is-collected', this.collected.has(i));
        });
      }
    }

    triggerEffect(effect, ornamentIndex) {
      const ornament = this.ornaments[ornamentIndex];
      const screen = this.ornamentScreen[ornamentIndex];
      if (screen) {
        this.spawnSparkBurst(screen.x, screen.y, 34, ['gold', 'white', this.colorKey(ornament.color)]);
        this.flashes.push({
          x: screen.x, y: screen.y, r: 12, max: 180, life: 0.85, maxLife: 0.85,
          color: hexToRgb(ornament.color)
        });
      }
      switch (effect) {
        case 'snowburst':
          this.snowSurge = 8;
          this.spawnExtraSnow(this.isMobile ? 48 : 95);
          break;
        case 'bell':
          this.bellRings = 1;
          this.spawnBellRings(screen ? screen.x : this.layout.centerX, screen ? screen.y : this.layout.treeTopY);
          break;
        case 'candle':
          this.warmSurge = 9;
          break;
        case 'moon':
          this.moonPulse = 1;
          this.spawnMoonRings();
          break;
        case 'aurora':
          this.auroraSurge = 10;
          break;
        case 'reindeer':
          this.reindeer = { progress: 0, duration: this.reducedMotion ? 0.1 : 9.5, dir: 1, trail: 0 };
          if (this.options.onReindeer) this.options.onReindeer();
          break;
        case 'stars':
          this.starSurge = 9;
          this.spawnStarShower();
          break;
        case 'meteor':
          this.meteorQueue.push(
            { at: this.time + 0.2, x: rand(0.16, 0.5), y: rand(0.1, 0.2), dir: 1 },
            { at: this.time + 1.5, x: rand(0.4, 0.8), y: rand(0.08, 0.18), dir: -1 },
            { at: this.time + 2.8, x: rand(0.2, 0.65), y: rand(0.14, 0.24), dir: 1 }
          );
          break;
        default:
          break;
      }
    }

    triggerGrandFinale() {
      this.grand = 1;
      this.starSurge = 13;
      this.auroraSurge = max(this.auroraSurge, 12);
      this.snowSurge = max(this.snowSurge, 7);
      this.spawnExtraSnow(this.isMobile ? 50 : 100);
      const bursts = [
        { x: 0.18, y: 0.28, at: 0.2, color: 'gold' },
        { x: 0.78, y: 0.22, at: 0.55, color: 'rose' },
        { x: 0.32, y: 0.16, at: 1.1, color: 'mint' },
        { x: 0.7, y: 0.37, at: 1.55, color: 'ice' },
        { x: 0.5, y: 0.13, at: 2.2, color: 'white' },
        { x: 0.86, y: 0.42, at: 2.7, color: 'gold' },
        { x: 0.12, y: 0.44, at: 3.3, color: 'rose' },
        { x: 0.5, y: 0.28, at: 3.9, color: 'gold' }
      ];
      bursts.forEach((b) => {
        this.fireworkQueue.push({ at: this.time + b.at, x: b.x, y: b.y, color: b.color, big: true });
      });
      for (let i = 0; i < 45; i++) {
        this.sparks.push(this.makeSpark(
          this.layout.centerX + rand(-this.layout.baseRadius, this.layout.baseRadius),
          this.layout.baseY - rand(0, this.layout.treeHeight * 1.1),
          rand(-20, 20),
          rand(-55, -14),
          rand(2, 4.7),
          pick(['gold', 'white', 'mint', 'rose']),
          rand(2, 5),
          false
        ));
      }
    }

    triggerStarBurstAt(index) {
      const screen = this.ornamentScreen[index];
      if (screen) {
        this.spawnSparkBurst(screen.x, screen.y, 50, ['gold', 'white']);
      }
    }

    hideTopperPrompt() {
      if (this.topperPrompt) this.topperPrompt.classList.add('is-hidden');
    }

    setWishes(wishes) {
      this.wishStars = (wishes || []).map((wish) => ({
        id: wish.id,
        text: wish.text,
        x: clamp(Number(wish.x) || 0.8, 0.06, 0.94),
        y: clamp(Number(wish.y) || 0.2, 0.06, 0.46),
        phase: rand(0, TAU),
        size: rand(0.8, 1.3)
      }));
    }

    releaseWish(wish) {
      const fromX = this.layout.centerX;
      const fromY = this.layout.starY;
      const targetX = clamp(wish.x, 0.06, 0.94) * this.W;
      const targetY = clamp(wish.y, 0.06, 0.46) * this.H;
      const flight = {
        id: wish.id,
        text: wish.text,
        x: wish.x,
        y: wish.y,
        fromX,
        fromY,
        targetX,
        targetY,
        controlX: lerp(fromX, targetX, 0.45) + rand(-80, 80),
        controlY: min(fromY, targetY) - rand(40, 130),
        progress: 0,
        duration: this.reducedMotion ? 0.4 : 2.75,
        phase: rand(0, TAU)
      };
      this.wishFlights.push(flight);
      this.spawnSparkBurst(fromX, fromY, 18, ['gold', 'white']);
      return true;
    }

    /* =====================================================
       Particle helpers
       ===================================================== */

    colorKey(hex) {
      const rgb = hexToRgb(hex);
      if (rgb[0] > 175 && rgb[1] > 135 && rgb[2] < 160) return 'gold';
      if (rgb[2] > 200 && rgb[0] > 135 && rgb[0] < 190 && rgb[2] > rgb[0]) return 'violet';
      if (rgb[0] > rgb[1] && rgb[2] > rgb[1]) return 'rose';
      if (rgb[1] >= rgb[0] && rgb[1] >= rgb[2]) return 'mint';
      if (rgb[2] >= rgb[1]) return 'ice';
      return 'gold';
    }

    makeSpark(x, y, vx, vy, life, color, size, star = true) {
      return {
        x, y,
        px: x, py: y,
        vx, vy,
        gravity: rand(2, 9),
        drag: rand(0.93, 0.985),
        life: life || rand(0.6, 1.8),
        maxLife: life || 1.8,
        color: color || 'gold',
        size: size || rand(1, 3),
        star,
        phase: rand(0, TAU),
        twinkle: rand(1.5, 4)
      };
    }

    spawnSparkBurst(x, y, count, colors) {
      const chosen = colors || ['gold', 'white'];
      for (let i = 0; i < count; i++) {
        const angle = rand(0, TAU);
        const speed = rand(12, 120) * (this.isMobile ? 0.72 : 1);
        this.sparks.push(this.makeSpark(
          x + rand(-3, 3),
          y + rand(-3, 3),
          cos(angle) * speed,
          sin(angle) * speed - rand(0, 18),
          rand(0.7, 1.9),
          chosen[floor(rand(0, chosen.length))],
          rand(0.7, 2.8),
          Math.random() < 0.62
        ));
      }
      if (this.sparks.length > 540) this.sparks.splice(0, this.sparks.length - 540);
    }

    spawnClickRipple(x, y) {
      this.ripples.push({
        x, y, r: 5, max: 46, life: 0.8, maxLife: 0.8, color: [255, 232, 183]
      });
    }

    spawnMoonRings() {
      for (let i = 0; i < 3; i++) {
        this.ripples.push({
          x: this.layout.moon.x,
          y: this.layout.moon.y,
          r: this.layout.moon.r * (0.8 + i * 0.45),
          max: this.layout.moon.r * (3.4 + i * 0.8),
          life: 1.8 + i * 0.35,
          maxLife: 1.8 + i * 0.35,
          color: [243, 224, 179],
          width: 0.8
        });
      }
      this.spawnSparkBurst(this.layout.moon.x, this.layout.moon.y, 28, ['gold', 'white']);
    }

    spawnBellRings(x, y) {
      for (let i = 0; i < 4; i++) {
        this.ripples.push({
          x, y,
          r: 8 + i * 16,
          max: 130 + i * 30,
          life: 1.3 + i * 0.2,
          maxLife: 1.3 + i * 0.2,
          color: [239, 213, 159],
          width: 0.8
        });
      }
    }

    spawnStarShower() {
      for (let i = 0; i < 35; i++) {
        const x = this.layout.centerX + rand(-this.layout.baseRadius * 1.2, this.layout.baseRadius * 1.2);
        const y = this.layout.baseY - rand(0, this.layout.treeHeight);
        this.sparks.push(this.makeSpark(
          x, y,
          rand(-16, 16),
          rand(-70, -18),
          rand(1.4, 3.4),
          pick(['gold', 'white', 'mint']),
          rand(1.2, 3.2),
          true
        ));
      }
    }

    queueFirework(x, y, color, big) {
      this.fireworkQueue.push({ at: this.time + 0.05, x, y, color, big });
    }

    explodeFirework(x, y, colorName, big) {
      const palettes = {
        gold: [[255, 216, 139], [255, 239, 191], [255, 183, 93]],
        rose: [[255, 166, 176], [255, 214, 205], [244, 129, 152]],
        mint: [[140, 255, 216], [213, 255, 237], [84, 213, 181]],
        ice: [[156, 214, 255], [220, 244, 255], [132, 177, 255]],
        white: [[255, 250, 232], [255, 230, 178], [220, 236, 233]]
      };
      const palette = palettes[colorName] || palettes.gold;
      const count = big ? (this.isMobile ? 58 : 86) : (this.isMobile ? 30 : 46);
      const speedBase = (big ? 235 : 140) * (this.H / 900 + 0.52);
      for (let i = 0; i < count; i++) {
        const angle = rand(0, TAU);
        const speed = rand(0.52, 1.18) * speedBase;
        const color = pick(palette);
        this.sparks.push({
          x, y, px: x, py: y,
          vx: cos(angle) * speed,
          vy: sin(angle) * speed,
          gravity: 28,
          drag: 0.984,
          life: rand(1.35, 2.5),
          maxLife: 2.5,
          color,
          rgb: color,
          sprite: colorName,
          size: rand(1.2, 2.8),
          star: false,
          firework: true,
          phase: rand(0, TAU),
          twinkle: rand(2, 7)
        });
      }
      this.ripples.push({
        x, y, r: 4, max: big ? 95 : 54, life: 0.6, maxLife: 0.6,
        color: palette[1], width: 0.7
      });
    }

    /* =====================================================
       Main loop & simulation
       ===================================================== */

    loop(now) {
      requestAnimationFrame(this.loop);
      if (!this.ready || !this.visible) return;
      if (!this.lastTime) this.lastTime = now;
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      if (rawDt > 0.12) {
        // Do not teleport after switching tabs; a slow-motion catch-up is nicer.
        this.step(0.12);
      } else {
        this.step(max(0.001, rawDt));
      }
      if (this.renderEnabled) this.render();
      this.frameCount++;
      if (this.frameCount === 60) {
        this.slowFrames = 0;
      }
    }

    step(dt) {
      this.time += dt;
      this.elapsed += dt;

      const intro = clamp((this.elapsed - 0.4) / 3.5, 0, 1);
      this.lightProgress = easeOutCubic(intro);

      // Pointer parallax is always silky, never bouncy.
      this.parallax.x = lerp(this.parallax.x, this.parallax.targetX, 1 - Math.pow(0.001, dt));
      this.parallax.y = lerp(this.parallax.y, this.parallax.targetY, 1 - Math.pow(0.001, dt));

      if (!this.drag && this.time - this.lastDragEnd > 2.2) {
        this.manualRotation *= Math.pow(0.55, dt);
        if (abs(this.manualRotation) < 0.0005) this.manualRotation = 0;
      }

      const autoRotate = this.reducedMotion ? 0 : sin(this.time * 0.083) * 0.13;
      this.rotation = autoRotate + this.manualRotation;

      this.snowLevel = lerp(
        this.snowLevel,
        this.snowEnabled ? 1 : 0,
        1 - Math.pow(0.03, dt)
      );
      this.snowSurge = max(0, this.snowSurge - dt);
      this.auroraSurge = max(0, this.auroraSurge - dt);
      this.warmSurge = max(0, this.warmSurge - dt);
      this.starSurge = max(0, this.starSurge - dt);
      this.grand = max(0, this.grand - dt * 0.035);
      this.moonPulse = max(0, this.moonPulse - dt * 0.33);
      this.hoveredWish = this.hoveredWish >= this.wishStars.length ? -1 : this.hoveredWish;

      // Snowfall.
      const wind = sin(this.time * 0.31) * 0.0028 + 0.0016;
      this.wind = wind;
      const snowSpeedScale = 1 + (this.snowSurge > 0 ? 0.85 : 0);
      const updateFlake = (flake) => {
        flake.y += flake.speed * dt * snowSpeedScale;
        flake.x += (
          wind * (0.4 + flake.z) * 0.62 +
          sin(this.time * 0.72 + flake.phase) * 0.011 * flake.sway
        ) * dt * (0.5 + flake.z) * snowSpeedScale;
        if (flake.y > 1.08) {
          flake.y = -0.08 - rand(0, 0.16);
          flake.x = rand(-0.04, 1.04);
        }
        if (flake.x > 1.12) flake.x = -0.1;
        if (flake.x < -0.12) flake.x = 1.1;
        if (flake.extra) flake.life -= dt;
      };
      if (this.snowLevel > 0.01) {
        this.snowflakes.forEach(updateFlake);
      }
      this.extraSnow.forEach(updateFlake);
      this.extraSnow = this.extraSnow.filter((flake) => flake.life > 0);

      // Firework scheduling.
      this.fireworkQueue = this.fireworkQueue.filter((burst) => {
        if (this.time >= burst.at) {
          this.explodeFirework(
            burst.x * this.W,
            burst.y * this.H,
            burst.color,
            burst.big
          );
          return false;
        }
        return true;
      });

      // Spark simulation.
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const p = this.sparks[i];
        p.px = p.x;
        p.py = p.y;
        // Frame-rate independent drag: 60 fps reference.
        const drag = Math.pow(p.drag, dt * 60);
        p.vx *= drag;
        p.vy = p.vy * drag + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) this.sparks.splice(i, 1);
      }
      if (this.sparks.length > 620) this.sparks.splice(0, this.sparks.length - 620);

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        ripple.life -= dt;
        ripple.r = lerp(ripple.r, ripple.max, 1 - Math.pow(0.2, dt));
        if (ripple.life <= 0) this.ripples.splice(i, 1);
      }
      if (this.flashes) {
        for (let i = this.flashes.length - 1; i >= 0; i--) {
          const flash = this.flashes[i];
          flash.life -= dt;
          flash.r = lerp(flash.r, flash.max, 1 - Math.pow(0.28, dt));
          if (flash.life <= 0) this.flashes.splice(i, 1);
        }
      }

      // Meteors.
      if (!this.reducedMotion) {
        if (this.time > this.nextMeteorAt) {
          this.spawnMeteor();
          this.nextMeteorAt = this.time + rand(10, 22);
        }
      }
      this.meteorQueue = this.meteorQueue.filter((item) => {
        if (this.time >= item.at) {
          this.spawnMeteor(item.x, item.y, item.dir);
          return false;
        }
        return true;
      });
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const meteor = this.meteors[i];
        meteor.x += meteor.vx * dt;
        meteor.y += meteor.vy * dt;
        meteor.life -= dt;
        if (meteor.life <= 0 || meteor.x < -260 || meteor.x > this.W + 260 || meteor.y > this.H + 200) {
          this.meteors.splice(i, 1);
        }
      }

      // Reindeer flights.
      if (!this.reducedMotion) {
        if (!this.reindeer && this.time > this.nextReindeerAt) {
          this.reindeer = {
            progress: 0,
            duration: 10.5,
            dir: Math.random() > 0.5 ? 1 : -1,
            trail: 0
          };
          this.nextReindeerAt = this.time + rand(42, 75);
          if (this.options.onReindeer) this.options.onReindeer();
        }
      }
      if (this.reindeer) {
        this.reindeer.progress += dt / this.reindeer.duration;
        this.reindeer.trail += dt;
        if (this.reindeer.trail > 0.06) {
          this.reindeer.trail = 0;
          const p = this.reindeerPoint(this.reindeer.progress, this.reindeer.dir);
          this.sparks.push(this.makeSpark(
            p.x - this.reindeer.dir * rand(6, 26),
            p.y + rand(-12, 18),
            -this.reindeer.dir * rand(2, 13),
            rand(-6, 8),
            rand(0.6, 1.6),
            'gold',
            rand(0.5, 1.6),
            Math.random() < 0.4
          ));
        }
        if (this.reindeer.progress >= 1) this.reindeer = null;
      }

      // Wishes flying up to their place in the sky.
      for (let i = this.wishFlights.length - 1; i >= 0; i--) {
        const flight = this.wishFlights[i];
        flight.progress += dt / flight.duration;
        if (flight.progress >= 1) {
          this.wishStars.push({
            id: flight.id,
            text: flight.text,
            x: flight.x,
            y: flight.y,
            phase: rand(0, TAU),
            size: rand(0.9, 1.25)
          });
          this.spawnSparkBurst(flight.targetX, flight.targetY, 28, ['gold', 'white', 'ice']);
          this.ripples.push({
            x: flight.targetX, y: flight.targetY, r: 3, max: 30,
            life: 0.8, maxLife: 0.8, color: [255, 231, 180]
          });
          if (this.options.onWishLanded) this.options.onWishLanded(flight.id);
          this.wishFlights.splice(i, 1);
        }
      }
    }

    spawnMeteor(xFrac, yFrac, direction) {
      if (this.meteors.length > 3) return;
      const dir = direction || (Math.random() > 0.5 ? 1 : -1);
      const startX = (xFrac !== undefined ? xFrac : rand(0.18, 0.8)) * this.W;
      const startY = (yFrac !== undefined ? yFrac : rand(0.1, 0.27)) * this.H;
      const speed = rand(260, 470) * (this.W / 1440 + 0.55);
      const angle = rand(0.33, 0.58);
      this.meteors.push({
        x: startX,
        y: startY,
        vx: cos(angle) * speed * dir,
        vy: sin(angle) * speed,
        life: rand(1.25, 2.1),
        maxLife: 2.1,
        len: rand(85, 205) * (this.W / 1440 + 0.55),
        width: rand(0.8, 1.6),
        phase: rand(0, TAU)
      });
    }

    reindeerPoint(progress, dir) {
      const t = clamp(progress, 0, 1);
      const ease = easeInOutCubic(t);
      const x = dir > 0
        ? lerp(-120, this.W + 120, ease)
        : lerp(this.W + 120, -120, ease);
      const baseY = this.layout.reindeerY;
      const y = baseY + sin(t * PI) * -this.H * 0.035 + sin(t * 22) * 4;
      return { x, y };
    }

    /* =====================================================
       High-level rendering
       ===================================================== */

    render() {
      const ctx = this.ctx;
      const { W, H } = this;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(this.skyLayer, 0, 0, W, H);

      this.drawStars(ctx);
      this.drawAurora(ctx);
      this.drawMoon(ctx);
      this.drawMoonBeam(ctx);
      ctx.drawImage(this.landLayer, 0, 0, W, H);
      this.drawBaseGlow(ctx);
      if (this.reindeer) this.drawReindeer(ctx);
      this.renderTreeLayer();
      this.drawReflection(ctx);
      ctx.drawImage(this.treeLayer, 0, 0, W, H);
      this.drawSnow(ctx, false);
      this.drawBokeh(ctx);
      this.drawMeteors(ctx);
      this.drawWishStars(ctx);
      this.drawWishFlights(ctx);
      this.drawFlashes(ctx);
      this.drawFireworks(ctx);
      this.drawRipples(ctx);
      this.drawSparks(ctx);
      this.drawSnow(ctx, true);
      this.drawForegroundGlints(ctx);
      this.updateInteractionPositions();
    }

    drawStars(ctx) {
      const { W, H } = this;
      const parallaxX = this.parallax.x * 7;
      const parallaxY = this.parallax.y * 4;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const star of this.stars) {
        const twinkle = 0.56 + 0.44 * sin(this.time * star.speed + star.phase);
        const alpha = star.bright * (0.45 + twinkle * 0.55);
        const x = star.x * W + parallaxX * star.parallax;
        const y = star.y * H + parallaxY * star.parallax;
        const size = star.size * (2.7 + twinkle * 0.85);
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.sprites.glow[star.color] || this.sprites.glow.white, x - size / 2, y - size / 2, size, size);
        if (star.spike) {
          ctx.globalAlpha = alpha * 0.44;
          ctx.strokeStyle = 'rgba(235, 244, 240, 0.8)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x - size * 0.9, y);
          ctx.lineTo(x + size * 0.9, y);
          ctx.moveTo(x, y - size * 0.9);
          ctx.lineTo(x, y + size * 0.9);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawAurora(ctx) {
      const { W, H } = this;
      const boost = this.auroraSurge > 0 ? 1.6 : 1;
      const alpha = (0.42 + 0.22 * sin(this.time * 0.035) * 0.25) * boost;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(alpha, 0.2, 0.74);
      ctx.drawImage(
        this.sprites.aurora[0],
        -W * 0.08 + sin(this.time * 0.021) * W * 0.018,
        -H * 0.06,
        W * 1.16,
        H * 0.66
      );
      ctx.globalAlpha = clamp(alpha * 0.68, 0.12, 0.46);
      ctx.drawImage(
        this.sprites.aurora[1],
        W * 0.12 + cos(this.time * 0.016) * W * 0.016,
        H * 0.01,
        W * 0.92,
        H * 0.5
      );
      if (this.auroraSurge > 0) {
        ctx.globalAlpha = 0.12 * clamp(this.auroraSurge / 10, 0, 1);
        ctx.drawImage(this.sprites.aurora[1], -W * 0.14, H * 0.16, W * 1.5, H * 0.55);
      }
      ctx.restore();
    }

    drawMoon(ctx) {
      const { moon } = this.layout;
      const time = this.time;
      const pulse = this.moonPulse;
      const breathe = 1 + sin(time * 0.45) * 0.012;
      const r = moon.r * breathe;
      const haloSize = r * 7.8;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.31 + pulse * 0.18;
      ctx.drawImage(this.sprites.glow.starGold, moon.x - haloSize / 2, moon.y - haloSize / 2, haloSize, haloSize);
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = 'rgba(239, 224, 187, 0.24)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, r * 1.7 + pulse * 22, 0, TAU);
      ctx.stroke();
      if (pulse > 0) {
        ctx.globalAlpha = pulse * 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, r * 2.2 + (1 - pulse) * 70, 0, TAU);
        ctx.stroke();
      }

      // The disc itself must be painted normally, not additively, or the
      // delicate maria wash out into a flat white circle.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.93;
      ctx.drawImage(this.sprites.moonDisc, moon.x - r, moon.y - r, r * 2, r * 2);

      // One translucent wisp of night cloud passes across the lower rim.
      ctx.globalAlpha = 0.16;
      ctx.globalCompositeOperation = 'screen';
      ctx.save();
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, r * 0.98, 0, TAU);
      ctx.clip();
      const cloud = ctx.createLinearGradient(moon.x - r, moon.y + r * 0.2, moon.x + r, moon.y - r * 0.2);
      cloud.addColorStop(0, 'rgba(111, 158, 167, 0)');
      cloud.addColorStop(0.41, 'rgba(178, 207, 208, 0.38)');
      cloud.addColorStop(0.63, 'rgba(72, 118, 132, 0.2)');
      cloud.addColorStop(1, 'rgba(32, 67, 84, 0)');
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.ellipse(moon.x, moon.y + r * 0.42, r * 0.82, r * 0.18, -0.1, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    drawMoonBeam(ctx) {
      if (this.moonPulse <= 0.01) return;
      const { moon } = this.layout;
      const intensity = this.moonPulse;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const targetX = this.layout.centerX - this.layout.baseRadius * 1.1;
      const targetY = this.H * 0.97;
      const gradient = ctx.createLinearGradient(moon.x, moon.y, targetX, targetY);
      gradient.addColorStop(0, `rgba(243, 227, 189, ${0.16 * intensity})`);
      gradient.addColorStop(0.35, `rgba(195, 226, 224, ${0.045 * intensity})`);
      gradient.addColorStop(1, 'rgba(195, 226, 224, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(moon.x - moon.r * 0.3, moon.y);
      ctx.lineTo(moon.x + moon.r * 0.12, moon.y + moon.r * 0.32);
      ctx.lineTo(targetX + this.layout.baseRadius * 0.65, targetY);
      ctx.lineTo(targetX - this.layout.baseRadius * 0.8, targetY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawBaseGlow(ctx) {
      const { centerX, baseY, baseRadius, treeHeight } = this.layout;
      const warm = this.warmSurge > 0 ? 1.3 : 0.7;
      const grand = 1 + this.grand * 0.8;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(centerX, baseY - treeHeight * 0.05, 0, centerX, baseY, baseRadius * 1.85);
      glow.addColorStop(0, `rgba(215, 183, 116, ${0.12 * warm * grand})`);
      glow.addColorStop(0.35, `rgba(56, 130, 112, ${0.075 * grand})`);
      glow.addColorStop(1, 'rgba(27, 83, 76, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(centerX, baseY + 3, baseRadius * 1.9, treeHeight * 0.12, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    drawReflection(ctx) {
      const { W, H, baseY } = this.layout;
      if (!this.tree) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, baseY + 3, W, H - baseY - 3);
      ctx.clip();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.3;
      try { ctx.filter = 'blur(1.7px)'; } catch (_) {}
      ctx.translate(0, baseY * 2);
      ctx.scale(1, -1);
      ctx.drawImage(this.treeLayer, 0, 0, W, H);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Moving ribbons of light on the ice.
      for (let i = 0; i < 12; i++) {
        const y = baseY + 12 + Math.pow(i / 12, 1.5) * (H - baseY) * 0.88;
        const wave = sin(this.time * (0.35 + i * 0.03) + i * 1.7) * (8 + i * 2.2);
        const alpha = (1 - i / 14) * 0.06;
        const gradient = ctx.createLinearGradient(W * 0.27 + wave, y, W * 0.73 + wave, y);
        gradient.addColorStop(0, 'rgba(166, 220, 214, 0)');
        gradient.addColorStop(0.4, `rgba(175, 225, 213, ${alpha})`);
        gradient.addColorStop(0.58, `rgba(241, 218, 165, ${alpha * 0.7})`);
        gradient.addColorStop(1, 'rgba(175, 225, 213, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(W * 0.2, y, W * 0.6, 0.8 + i * 0.03);
      }
      ctx.restore();

      // Fade the mirror into the lake.
      const fade = ctx.createLinearGradient(0, baseY, 0, H);
      fade.addColorStop(0, 'rgba(3, 13, 19, 0)');
      fade.addColorStop(0.36, 'rgba(3, 13, 19, 0.13)');
      fade.addColorStop(1, 'rgba(2, 8, 12, 0.78)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, baseY, W, H - baseY);
    }

    renderTreeLayer() {
      if (!this.tree) return;
      const ctx = this.treeCtx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, this.W, this.H);
      this.drawCanopy(ctx);
      this.drawNeedles(ctx);
      this.drawTreeDust(ctx);
      this.drawLights(ctx);
      this.drawOrnaments(ctx);
      this.drawGifts(ctx);
      this.drawTopper(ctx);
    }

    project(x, y, z, time) {
      const { centerX, baseY, treeHeight, baseRadius } = this.layout;
      const rotation = this.rotation;
      const c = cos(rotation);
      const s = sin(rotation);
      const xr = x * c - z * s;
      const zr = x * s + z * c;
      const perspective = 1 + zr * 0.13;
      const sway = this.reducedMotion ? 0 : sin(this.time * 0.62 + y * 2.2) * baseRadius * 0.004;
      const px = centerX + xr * baseRadius * perspective + parallaxOffsetX(this, y);
      const py = baseY - y * treeHeight + zr * treeHeight * 0.012 + sway * 0.35;
      return { x: px, y: py, z: zr, perspective };
    }

    drawCanopy(ctx) {
      const { centerX, baseY, treeTopY, baseRadius, treeHeight } = this.layout;
      const top = { x: centerX + this.rotation * baseRadius * 0.08, y: treeTopY + treeHeight * 0.035 };
      const left = this.project(-1, 0.012, 0);
      const right = this.project(1, 0.012, 0);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      // Right slope, with a fuller skirt near the bottom.
      ctx.bezierCurveTo(
        top.x + baseRadius * 0.15, top.y + treeHeight * 0.23,
        top.x + baseRadius * 0.66, top.y + treeHeight * 0.68,
        right.x, right.y - treeHeight * 0.02
      );
      // Rounded forest floor.
      ctx.quadraticCurveTo(centerX, baseY + treeHeight * 0.022, left.x, left.y - treeHeight * 0.02);
      ctx.bezierCurveTo(
        top.x - baseRadius * 0.66, top.y + treeHeight * 0.68,
        top.x - baseRadius * 0.15, top.y + treeHeight * 0.23,
        top.x, top.y
      );
      ctx.closePath();
      const canopy = ctx.createLinearGradient(0, top.y, 0, baseY);
      canopy.addColorStop(0, 'rgba(8, 44, 35, 0.34)');
      canopy.addColorStop(0.32, 'rgba(5, 39, 30, 0.68)');
      canopy.addColorStop(0.7, 'rgba(4, 32, 25, 0.88)');
      canopy.addColorStop(1, 'rgba(2, 22, 18, 0.94)');
      ctx.fillStyle = canopy;
      ctx.fill();

      ctx.clip();
      // Interior moonlight and branch tiers.
      ctx.globalCompositeOperation = 'screen';
      const inner = ctx.createRadialGradient(
        centerX - baseRadius * 0.32, baseY - treeHeight * 0.48, 0,
        centerX - baseRadius * 0.1, baseY - treeHeight * 0.4, treeHeight * 0.58
      );
      inner.addColorStop(0, 'rgba(35, 119, 91, 0.15)');
      inner.addColorStop(0.45, 'rgba(18, 75, 60, 0.07)');
      inner.addColorStop(1, 'rgba(4, 28, 24, 0)');
      ctx.fillStyle = inner;
      ctx.fillRect(centerX - baseRadius, top.y, baseRadius * 2, treeHeight);

      for (let tier = 0; tier < 11; tier++) {
        const t = 0.13 + tier * 0.075;
        const y = top.y + treeHeight * t;
        const radius = baseRadius * Math.pow(1 - t, 0.9) * 0.88;
        ctx.save();
        ctx.translate(centerX + sin(this.time * 0.2 + tier) * 1.2, y);
        ctx.scale(1, 0.22);
        const tierLight = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        tierLight.addColorStop(0, 'rgba(42, 112, 84, 0.08)');
        tierLight.addColorStop(0.78, 'rgba(21, 80, 61, 0.045)');
        tierLight.addColorStop(1, 'rgba(10, 45, 39, 0)');
        ctx.fillStyle = tierLight;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(172, 221, 190, 0.045)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(centerX, y, radius, 1.8, 0, PI * 0.04, PI * 0.96);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawNeedles(ctx) {
      if (!this.needleBuckets || !this.tree) return;
      const buckets = this.needleBuckets;
      for (let b = 0; b < 4; b++) {
        for (let t = 0; t < 6; t++) buckets[b][t].length = 0;
      }

      const { baseY, treeHeight, baseRadius } = this.layout;
      const rotation = this.rotation;
      const c = cos(rotation);
      const s = sin(rotation);
      const introAlpha = 0.58 + this.lightProgress * 0.42;
      const needles = this.tree.needles;

      for (let i = 0; i < needles.length; i++) {
        const n = needles[i];
        const xr1 = n.x * c - n.z * s;
        const zr1 = n.x * s + n.z * c;
        const p1 = 1 + zr1 * 0.13;
        const xr2 = n.x2 * c - n.z2 * s;
        const zr2 = n.x2 * s + n.z2 * c;
        const p2 = 1 + zr2 * 0.13;
        const sway = this.reducedMotion ? 0 : sin(this.time * 0.62 + n.y * 2.2) * baseRadius * 0.004;
        const sx1 = this.layout.centerX + xr1 * baseRadius * p1 + sway + this.parallax.x * 1.2;
        const sy1 = baseY - n.y * treeHeight + zr1 * treeHeight * 0.012;
        const sx2 = this.layout.centerX + xr2 * baseRadius * p2 + sway + this.parallax.x * 1.2;
        const sy2 = baseY - n.y2 * treeHeight + zr2 * treeHeight * 0.012;
        let band;
        if (n.band !== undefined) band = n.band;
        else {
          const depth = zr1;
          band = depth < -0.28 ? 0 : depth < 0.08 ? 1 : depth < 0.42 ? 2 : 3;
        }
        const arr = buckets[band][n.tone];
        arr.push(sx1, sy1, sx2, sy2);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';

      for (let band = 0; band < 4; band++) {
        const alphaScale = this.needleBandAlphas[band] * introAlpha;
        for (let tone = 0; tone < 6; tone++) {
          const arr = buckets[band][tone];
          if (!arr.length) continue;
          const color = this.needleTones[tone];
          ctx.strokeStyle = rgba(color, alphaScale * this.needleToneAlphas[tone]);
          ctx.lineWidth = (0.48 + band * 0.11) * (this.isMobile ? 0.9 : 1);
          ctx.beginPath();
          for (let i = 0; i < arr.length; i += 4) {
            ctx.moveTo(arr[i], arr[i + 1]);
            ctx.lineTo(arr[i + 2], arr[i + 3]);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawTreeDust(ctx) {
      if (!this.tree) return;
      const dust = this.tree.dust;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < dust.length; i++) {
        const d = dust[i];
        const p = this.project(d.x, d.y, d.z);
        if (p.z < -0.42) continue;
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(this.time * 1.8 + d.phase));
        const size = d.size * (1.4 + p.z * 0.2) * (this.isMobile ? 2.8 : 3.6) * (0.7 + twinkle * 0.7);
        ctx.globalAlpha = (0.22 + twinkle * 0.5) * (0.6 + (p.z + 1) * 0.18);
        ctx.drawImage(this.sprites.glow[d.color], p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.restore();
    }

    drawLights(ctx) {
      if (!this.tree) return;
      const { lights } = this.tree;
      const progress = this.lightProgress;
      const treeScale = clamp(this.layout.treeHeight / 440, 0.55, 1.05);
      const mobileScale = treeScale;
      const grandBoost = 1 + this.grand * 0.6;
      const cores = {
        gold: [255, 220, 141],
        warm: [255, 240, 202],
        ice: [180, 225, 255],
        rose: [255, 184, 189],
        mint: [171, 255, 223]
      };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < lights.length; i++) {
        const light = lights[i];
        // A wave of light travels from the base of the tree to its star.
        const appear = smoothstep(light.appear - 0.05, light.appear + 0.035, progress);
        if (appear <= 0.001) continue;
        const p = this.project(light.x, light.y, light.z);
        const twinkle = 0.42 + 0.58 * Math.pow(0.5 + 0.5 * sin(this.time * light.speed + light.phase), 1.6);
        const depthAlpha = 0.45 + (p.z + 1) * 0.28;
        const pop = smoothstep(light.appear + 0.12, light.appear, progress);
        const baseSize = (light.big ? 39 : 25) * mobileScale * (1 + p.z * 0.08) * grandBoost;
        const size = baseSize * (0.78 + twinkle * 0.35 + pop * 0.35);
        ctx.globalAlpha = clamp((0.34 + twinkle * 0.68) * depthAlpha * appear, 0, 1);
        ctx.drawImage(
          this.sprites.glow[light.color],
          p.x - size / 2,
          p.y - size / 2,
          size,
          size
        );
        const core = cores[light.color] || cores.gold;
        const coreR = (light.big ? 1.65 : 1.0) * mobileScale * (0.8 + twinkle * 0.45);
        ctx.globalAlpha = clamp((0.58 + twinkle * 0.42) * appear, 0, 1);
        ctx.fillStyle = rgba(core, 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR, 0, TAU);
        ctx.fill();
        if (light.big) {
          ctx.globalAlpha *= 0.48;
          ctx.strokeStyle = 'rgba(255, 241, 201, 0.7)';
          ctx.lineWidth = 0.65;
          const spike = size * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - spike, p.y);
          ctx.lineTo(p.x + spike, p.y);
          ctx.moveTo(p.x, p.y - spike);
          ctx.lineTo(p.x, p.y + spike);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawOrnaments(ctx) {
      if (!this.tree) return;
      const ornaments = this.tree.ornaments;
      const mobile = this.isMobile;
      const grand = 1 + this.grand * 0.4;
      this.ornamentScreen = new Array(ornaments.length);
      ctx.save();

      ctx.strokeStyle = 'rgba(236, 207, 148, 0.26)';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < ornaments.length; i++) {
        const o = ornaments[i];
        const anchor = this.project(o.x * 0.98, o.y + 0.035, o.z * 0.98);
        const p = this.project(o.x, o.y, o.z);
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(p.x, p.y - 6);
        ctx.stroke();
      }

      // Ornaments behind the tree's central mass should still feel dimensional.
      const ordered = ornaments
        .map((o, i) => ({ o, i, p: this.project(o.x, o.y, o.z) }))
        .sort((a, b) => a.p.z - b.p.z);

      for (const item of ordered) {
        const { o, i, p } = item;
        const accent = o.accent;
        const baseR = clamp(this.layout.treeHeight * 0.0182, 6.6, 13.4) * (1 + p.z * 0.08) * grand;
        const hover = (this.hoveredOrnament === i || this.focusedOrnament === i) ? 1 : 0;
        const pulse = 0.5 + 0.5 * sin(this.time * 1.7 + i * 1.7);
        const r = baseR * (1 + hover * 0.1 + pulse * 0.025);
        const bright = accent.map((v) => min(255, v * 1.11 + 25));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (0.38 + pulse * 0.2 + hover * 0.25) * (0.78 + p.z * 0.22);
        const glowSize = r * (13 + hover * 3.4);
        ctx.drawImage(this.sprites.glow[this.colorKey(this.ornaments[i].color)], p.x - glowSize / 2, p.y - glowSize / 2, glowSize, glowSize);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const sphere = ctx.createRadialGradient(
          p.x - r * 0.38, p.y - r * 0.42, r * 0.06,
          p.x, p.y, r
        );
        sphere.addColorStop(0, 'rgba(255, 254, 246, 1)');
        sphere.addColorStop(0.2, rgba(bright, 1));
        sphere.addColorStop(0.56, rgba(accent, 1));
        sphere.addColorStop(0.86, rgba(accent.map((v) => v * 0.3), 1));
        sphere.addColorStop(1, 'rgba(2, 9, 12, 0.98)');
        ctx.fillStyle = sphere;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 245, 215, ${0.48 + hover * 0.24})`;
        ctx.lineWidth = 0.85;
        ctx.stroke();

        // A little gilded cap and its hanging loop.
        ctx.fillStyle = 'rgba(245, 213, 144, 0.92)';
        roundedRect(ctx, p.x - r * 0.24, p.y - r * 1.1, r * 0.48, r * 0.38, r * 0.12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(248, 225, 171, 0.75)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.arc(p.x, p.y - r * 1.22, r * 0.25, PI * 0.1, PI * 0.9, true);
        ctx.stroke();

        // Specular kiss of light.
        ctx.fillStyle = 'rgba(255, 253, 242, 0.72)';
        ctx.beginPath();
        ctx.ellipse(p.x - r * 0.34, p.y - r * 0.42, r * 0.14, r * 0.08, -0.6, 0, TAU);
        ctx.fill();

        if (this.collected && this.collected.has(i)) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.42;
          ctx.strokeStyle = rgba(accent, 0.6);
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 1.38, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 0.7;
          drawSparkle(ctx, p.x + r * 1.5, p.y - r * 0.8, r * 0.62, rgba([255, 242, 205], 0.7));
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35 + pulse * 0.34;
          drawSparkle(ctx, p.x + r * 1.55, p.y - r * 0.72, r * 0.43, rgba([255, 245, 214], 0.76));
        }

        o.screenX = p.x;
        o.screenY = p.y;
        o.depth = p.z;
        o.radius = r;
        this.ornamentScreen[i] = { x: p.x, y: p.y, r, z: p.z };
      }
      ctx.restore();
    }

    drawGifts(ctx) {
      const { centerX, baseY, baseRadius, treeHeight } = this.layout;
      const scale = min(this.isMobile ? baseRadius * 0.34 : baseRadius * 0.31, treeHeight * 0.11);
      const positions = [
        { x: centerX - baseRadius * 0.68, y: baseY + 6, size: scale * 1.08, tone: 'ruby', tilt: -0.06 },
        { x: centerX + baseRadius * 0.59, y: baseY + 9, size: scale * 0.82, tone: 'teal', tilt: 0.07 },
        { x: centerX + baseRadius * 0.2, y: baseY + 15, size: scale * 0.56, tone: 'gold', tilt: 0.02 }
      ];
      this.giftScreens = positions.map((gift) => {
        const w = gift.size * 1.28;
        const h = gift.size * 0.92;
        return {
          x: gift.x,
          y: gift.y - h * 0.48,
          w: w * 1.2,
          h: h * 1.25
        };
      });
      ctx.save();
      for (const gift of positions) {
        this.drawGift(ctx, gift);
      }
      ctx.restore();
    }

    drawGift(ctx, gift) {
      const s = gift.size;
      const x = gift.x;
      const y = gift.y;
      const w = s * 1.28;
      const h = s * 0.92;
      const d = s * 0.24;
      const palettes = {
        ruby: { top: '#7e2d3a', face: '#5b1c2a', side: '#3b1420', ribbon: '#e0b871' },
        teal: { top: '#1a4c4b', face: '#123b3b', side: '#0b282c', ribbon: '#ddc48c' },
        gold: { top: '#66512c', face: '#4b391e', side: '#312513', ribbon: '#f0d49a' }
      };
      const palette = palettes[gift.tone];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(gift.tilt);

      // Soft grounding shadow.
      ctx.fillStyle = 'rgba(1, 7, 10, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, d * 0.1, w * 0.62, h * 0.11, 0, 0, TAU);
      ctx.fill();

      // Box body.
      ctx.fillStyle = palette.face;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h);
      ctx.lineTo(w / 2, -h);
      ctx.lineTo(w / 2, -d);
      ctx.lineTo(-w / 2, -d);
      ctx.closePath();
      ctx.fill();

      // Side face catches the tree light.
      ctx.fillStyle = palette.side;
      ctx.beginPath();
      ctx.moveTo(w / 2, -h);
      ctx.lineTo(w / 2 + d, -h - d * 0.7);
      ctx.lineTo(w / 2 + d, -d - d * 0.7);
      ctx.lineTo(w / 2, -d);
      ctx.closePath();
      ctx.fill();

      // Lid.
      ctx.fillStyle = palette.top;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h);
      ctx.lineTo(w / 2, -h);
      ctx.lineTo(w / 2 + d, -h - d * 0.7);
      ctx.lineTo(-w / 2 + d, -h - d * 0.7);
      ctx.closePath();
      ctx.fill();

      // Ribbon vertical.
      const ribbonW = s * 0.115;
      ctx.fillStyle = palette.ribbon;
      ctx.globalAlpha = 0.84;
      ctx.fillRect(-ribbonW / 2, -h, ribbonW, h - d);
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-ribbonW / 2 + d * 0.4, -h - d * 0.68, ribbonW * 0.9, h - d + d * 0.68);
      ctx.globalAlpha = 1;

      // Ribbon horizontal.
      ctx.fillStyle = palette.ribbon;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-w / 2, -h + h * 0.5, w, ribbonW * 0.78);
      ctx.globalAlpha = 1;

      // Bow.
      ctx.strokeStyle = palette.ribbon;
      ctx.lineWidth = max(1, s * 0.045);
      ctx.beginPath();
      ctx.moveTo(-s * 0.02, -h - d * 0.7);
      ctx.bezierCurveTo(-s * 0.45, -h - d * 0.7 - h * 0.38, -s * 0.38, -h - d * 0.7 + h * 0.18, -s * 0.02, -h - d * 0.7);
      ctx.bezierCurveTo(s * 0.42, -h - d * 0.7 - h * 0.32, s * 0.3, -h - d * 0.7 + h * 0.18, s * 0.02, -h - d * 0.7);
      ctx.stroke();
      ctx.fillStyle = palette.ribbon;
      ctx.beginPath();
      ctx.arc(0, -h - d * 0.7, s * 0.06, 0, TAU);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = palette.ribbon;
      ctx.fillRect(-w / 2 + 1, -h + 1, 1, h - d - 2);
      ctx.restore();
    }

    drawTopper(ctx) {
      const { centerX, starY, starSize, treeHeight } = this.layout;
      const r = starSize * (0.9 + 0.1 * sin(this.time * 1.1)) * (1 + this.grand * 0.2);
      const pulse = 0.55 + 0.45 * sin(this.time * 1.7);
      const angle = this.time * 0.12;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + pulse * 0.25;
      const halo = r * 14;
      ctx.drawImage(this.sprites.glow.starGold, centerX - halo / 2, starY - halo / 2, halo, halo);

      // Long rays.
      ctx.globalAlpha = 0.22 + pulse * 0.1;
      for (let i = 0; i < 4; i++) {
        const a = angle + i * PI / 2;
        ctx.save();
        ctx.translate(centerX, starY);
        ctx.rotate(a);
        const ray = ctx.createLinearGradient(0, 0, r * 5.4, 0);
        ray.addColorStop(0, 'rgba(255, 245, 211, 0.55)');
        ray.addColorStop(0.24, 'rgba(255, 228, 166, 0.1)');
        ray.addColorStop(1, 'rgba(255, 228, 166, 0)');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(0, -0.8);
        ctx.lineTo(r * 5.4, 0);
        ctx.lineTo(0, 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Hand-cut eight-point star.
      ctx.globalAlpha = 1;
      const outer = r;
      const inner = r * 0.3;
      const path = new Path2D();
      for (let i = 0; i < 16; i++) {
        const a = angle - PI / 2 + i * PI / 8;
        const rr = i % 2 === 0 ? outer : inner;
        const xx = centerX + cos(a) * rr;
        const yy = starY + sin(a) * rr;
        if (i === 0) path.moveTo(xx, yy);
        else path.lineTo(xx, yy);
      }
      path.closePath();
      const starFill = ctx.createRadialGradient(centerX, starY, 0, centerX, starY, outer);
      starFill.addColorStop(0, 'rgba(255, 255, 248, 1)');
      starFill.addColorStop(0.32, 'rgba(255, 242, 198, 1)');
      starFill.addColorStop(0.78, 'rgba(231, 195, 119, 0.88)');
      starFill.addColorStop(1, 'rgba(198, 151, 66, 0)');
      ctx.fillStyle = starFill;
      ctx.fill(path);

      // Four bright lens flares.
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = 'rgba(255, 249, 225, 0.9)';
      ctx.lineWidth = 0.8;
      const long = r * 2.1;
      ctx.beginPath();
      ctx.moveTo(centerX - long, starY);
      ctx.lineTo(centerX + long, starY);
      ctx.moveTo(centerX, starY - long);
      ctx.lineTo(centerX, starY + long);
      ctx.stroke();

      // A tiny constellation that seems to orbit the star.
      for (let i = 0; i < 3; i++) {
        const orb = this.time * (0.16 + i * 0.04) + i * 2.1;
        const orbitX = centerX + cos(orb) * r * (2.1 + i * 0.55);
        const orbitY = starY + sin(orb) * r * (0.7 + i * 0.16);
        ctx.globalAlpha = 0.22 + 0.3 * (0.5 + 0.5 * sin(orb * 2.2));
        const size = r * 0.42;
        ctx.drawImage(this.sprites.glow.white, orbitX - size / 2, orbitY - size / 2, size, size);
      }
      ctx.restore();

      // The star's click target and the onboarding prompt track it exactly.
      this.topperScreen = { x: centerX, y: starY, r };
    }

    drawSnow(ctx, foreground) {
      if (!this.tree) return;
      const flakes = this.snowflakes;
      const extra = this.extraSnow;
      const parallaxX = this.parallax.x * 8;
      const parallaxY = this.parallax.y * 5;
      ctx.save();
      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i];
        if (foreground ? flake.z < 0.35 : flake.z >= 0.35) continue;
        if (this.snowLevel < 0.01) continue;
        this.drawFlake(ctx, flake, parallaxX, parallaxY, this.snowLevel);
      }
      for (let i = 0; i < extra.length; i++) {
        const flake = extra[i];
        if (foreground ? flake.z < 0.35 : flake.z >= 0.35) continue;
        this.drawFlake(ctx, flake, parallaxX, parallaxY, 1);
      }
      ctx.restore();
    }

    drawFlake(ctx, flake, parallaxX, parallaxY, level) {
      const x = flake.x * this.W + parallaxX * flake.z;
      const y = flake.y * this.H + parallaxY * flake.z;
      const size = flake.size * 2.7;
      if (x < -30 || x > this.W + 30 || y < -30 || y > this.H + 30) return;
      const twinkle = 0.7 + 0.3 * sin(this.time * 1.4 + flake.phase);
      ctx.globalAlpha = clamp(flake.alpha * twinkle * level, 0, 1);
      const sprite = flake.flake ? this.sprites.snowFlaked : this.sprites.snowSoft;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.time * flake.spin + flake.phase);
      if (size < 3.1) {
        // A sharp little mote for the tiny, far-away crystals.
        ctx.fillStyle = `rgba(245, 253, 255, ${clamp(flake.alpha * 0.9, 0.08, 0.7)})`;
        ctx.fillRect(-size * 0.24, -size * 0.24, size * 0.48, size * 0.48);
      } else {
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      }
      ctx.restore();
    }

    drawBokeh(ctx) {
      if (this.isMobile) return;
      const parallaxX = this.parallax.x * 18;
      const parallaxY = this.parallax.y * 12;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const orb of this.bokeh) {
        const x = orb.x + sin(this.time * orb.speed + orb.phase) * 20 + parallaxX;
        const y = orb.y + cos(this.time * orb.speed * 1.5 + orb.phase) * 10 + parallaxY;
        const size = orb.size * (1 + sin(this.time * 0.12 + orb.phase) * 0.08) * 2.3;
        ctx.globalAlpha = orb.alpha * (0.7 + 0.3 * sin(this.time * 0.25 + orb.phase));
        ctx.drawImage(this.sprites.glow[orb.color], x - size / 2, y - size / 2, size, size);
      }
      ctx.restore();
    }

    drawMeteors(ctx) {
      if (!this.meteors.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const meteor of this.meteors) {
        const lifeRatio = clamp(meteor.life / meteor.maxLife, 0, 1);
        const alpha = Math.min(1, (1 - lifeRatio) * 4) * Math.min(1, lifeRatio * 4.4);
        const speed = hypot(meteor.vx, meteor.vy) || 1;
        const tx = meteor.x - (meteor.vx / speed) * meteor.len;
        const ty = meteor.y - (meteor.vy / speed) * meteor.len;
        const gradient = ctx.createLinearGradient(tx, ty, meteor.x, meteor.y);
        gradient.addColorStop(0, 'rgba(191, 228, 255, 0)');
        gradient.addColorStop(0.35, `rgba(201, 235, 255, ${0.1 * alpha})`);
        gradient.addColorStop(0.84, `rgba(245, 245, 223, ${0.56 * alpha})`);
        gradient.addColorStop(1, `rgba(255, 251, 229, ${0.95 * alpha})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = meteor.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(meteor.x, meteor.y);
        ctx.stroke();

        const head = (12 + theta(meteor.phase) * 6) * (0.7 + alpha);
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.sprites.glow.white, meteor.x - head / 2, meteor.y - head / 2, head, head);
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = 'rgba(255, 249, 218, 0.8)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(meteor.x - 6, meteor.y);
        ctx.lineTo(meteor.x + 6, meteor.y);
        ctx.moveTo(meteor.x, meteor.y - 6);
        ctx.lineTo(meteor.x, meteor.y + 6);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawWishStars(ctx) {
      if (!this.wishStars.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.wishStars.length; i++) {
        const wish = this.wishStars[i];
        const hover = this.hoveredWish === i;
        const x = wish.x * this.W;
        const y = wish.y * this.H;
        const twinkle = 0.55 + 0.45 * sin(this.time * 1.35 + wish.phase);
        const size = (hover ? 24 : 13) + twinkle * 6;
        ctx.globalAlpha = (0.38 + twinkle * 0.4) * (hover ? 1 : 0.8);
        ctx.drawImage(this.sprites.glow.gold, x - size, y - size, size * 2, size * 2);
        ctx.globalAlpha = 0.85;
        drawSparkle(ctx, x, y, hover ? 7 : 4.2, 'rgba(255, 246, 215, 0.9)');
        if (hover) {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = 'rgba(238, 213, 157, 0.45)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawWishFlights(ctx) {
      if (!this.wishFlights.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const flight of this.wishFlights) {
        const t = easeInOutCubic(clamp(flight.progress, 0, 1));
        const inv = 1 - t;
        const x = inv * inv * flight.fromX + 2 * inv * t * flight.controlX + t * t * flight.targetX;
        const y = inv * inv * flight.fromY + 2 * inv * t * flight.controlY + t * t * flight.targetY;
        for (let i = 0; i < 9; i++) {
          const tt = clamp(t - i * 0.032, 0, 1);
          const ii = 1 - tt;
          const px = ii * ii * flight.fromX + 2 * ii * tt * flight.controlX + tt * tt * flight.targetX;
          const py = ii * ii * flight.fromY + 2 * ii * tt * flight.controlY + tt * tt * flight.targetY;
          const alpha = (1 - i / 9) * 0.42;
          ctx.globalAlpha = alpha;
          const trailSize = (1 - i / 11) * 14;
          ctx.drawImage(this.sprites.glow.gold, px - trailSize / 2, py - trailSize / 2, trailSize, trailSize);
        }
        ctx.globalAlpha = 0.95;
        const size = 30 + sin(this.time * 3 + flight.phase) * 4;
        ctx.drawImage(this.sprites.glow.starGold, x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha = 0.9;
        drawSparkle(ctx, x, y, 7, 'rgba(255, 248, 221, 0.96)');
      }
      ctx.restore();
    }

    drawFlashes(ctx) {
      if (!this.flashes.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const flash of this.flashes) {
        const alpha = clamp(flash.life / flash.maxLife, 0, 1);
        const glow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.r);
        glow.addColorStop(0, `rgba(255, 250, 233, ${0.2 * alpha})`);
        glow.addColorStop(0.32, rgba(flash.color, 0.12 * alpha));
        glow.addColorStop(1, rgba(flash.color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, flash.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawFireworks(ctx) {
      if (!this.sparks.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.sparks) {
        if (!p.firework) continue;
        const alpha = Math.pow(clamp(p.life / p.maxLife, 0, 1), 0.72);
        const tail = 0.062;
        ctx.globalAlpha = alpha * 0.54;
        ctx.strokeStyle = rgba(p.rgb || [255, 223, 160], 0.72);
        ctx.lineWidth = p.size * 0.72;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * tail, p.y - p.vy * tail);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.55;
        const glow = 10 + p.size * 4.2;
        const sprite = this.sprites.glow[p.sprite] || this.sprites.glow.gold;
        ctx.drawImage(sprite, p.x - glow / 2, p.y - glow / 2, glow, glow);
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = rgba(p.rgb || [255, 223, 160], 0.92);
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }

    drawRipples(ctx) {
      if (!this.ripples.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const ripple of this.ripples) {
        const alpha = clamp(ripple.life / ripple.maxLife, 0, 1);
        ctx.globalAlpha = alpha * 0.26;
        ctx.strokeStyle = rgba(ripple.color, 0.72);
        ctx.lineWidth = ripple.width || 0.8;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.r, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSparks(ctx) {
      if (!this.sparks.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.sparks) {
        if (p.firework) continue;
        const alpha = clamp(p.life / p.maxLife, 0, 1);
        const twinkle = 0.65 + 0.35 * sin(this.time * p.twinkle + p.phase);
        const size = p.size * (0.8 + twinkle * 0.6) * 4.6;
        const sprite = typeof p.color === 'string'
          ? (this.sprites.glow[p.color] || this.sprites.glow.gold)
          : this.sprites.glow.gold;
        ctx.globalAlpha = alpha * (0.5 + twinkle * 0.5);
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
        if (p.star) {
          ctx.globalAlpha = alpha * 0.8;
          drawSparkle(ctx, p.x, p.y, p.size * (0.6 + twinkle * 0.4) * 1.7, 'rgba(255, 247, 221, 0.8)');
        }
      }
      ctx.restore();
    }

    drawForegroundGlints(ctx) {
      if (!this.layout) return;
      const { baseY, W, H, baseRadius } = this.layout;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 28; i++) {
        const x = W * (0.08 + ((i * 0.344) % 0.84)) + sin(this.time * 0.2 + i) * 8;
        const y = baseY + 16 + ((i * 0.173) % 1) * (H - baseY - 20);
        const twinkle = 0.4 + 0.6 * Math.pow(0.5 + 0.5 * sin(this.time * (0.7 + i * 0.04) + i * 1.4), 2);
        const size = (0.5 + (i % 4) * 0.4) * 4.5 * twinkle;
        ctx.globalAlpha = 0.05 + twinkle * 0.2;
        ctx.drawImage(this.sprites.glow.white, x - size / 2, y - size / 2, size, size);
      }

      // A little gold flurry near the gifts.
      for (let i = 0; i < 8; i++) {
        const x = this.layout.centerX + sin(this.time * 0.5 + i * 2.1) * baseRadius * 0.72;
        const y = baseY - 7 + cos(this.time * 0.75 + i) * 8;
        const twinkle = 0.5 + 0.5 * sin(this.time * 1.4 + i);
        ctx.globalAlpha = 0.12 + twinkle * 0.25;
        const size = 9 + twinkle * 7;
        ctx.drawImage(this.sprites.glow.gold, x - size / 2, y - size / 2, size, size);
      }
      ctx.restore();
    }

    drawReindeer(ctx) {
      if (!this.reindeer) return;
      const progress = clamp(this.reindeer.progress, 0, 1);
      const point = this.reindeerPoint(progress, this.reindeer.dir);
      const scale = clamp(this.H / 900, 0.55, 1.2) * 1.35 * (this.reducedMotion ? 0.8 : 1);
      const opacity = Math.min(1, progress * 8) * Math.min(1, (1 - progress) * 8);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(point.x, point.y);
      ctx.scale(this.reindeer.dir * scale, scale);

      // A faint ribbon of stardust behind the reindeer.
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const px = -18 - i * 12;
        const py = sin(progress * 12 + i * 0.8) * 4 + i * 0.4;
        const a = (1 - i / 12) * 0.16;
        ctx.globalAlpha = a;
        const sz = 16 - i * 0.8;
        ctx.drawImage(this.sprites.glow.gold, px - sz / 2, py - sz / 2, sz, sz);
      }
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'source-over';

      // Body, head, legs and antlers — one continuous, graphic silhouette.
      const body = 'M -31 2 C -27 -11, -7 -15, 10 -9 C 18 -6, 22 -2, 25 -7 C 27 -12, 31 -16, 36 -18 C 38 -18, 39 -15, 37 -12 C 33 -8, 30 -3, 28 1 C 25 5, 20 7, 14 7 L -18 8 C -26 8, -31 6, -31 2 Z';
      ctx.fillStyle = 'rgba(4, 15, 20, 0.9)';
      ctx.beginPath();
      ctx.fill(new Path2D(body));
      ctx.strokeStyle = 'rgba(246, 221, 164, 0.26)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Legs.
      ctx.strokeStyle = 'rgba(4, 15, 20, 0.92)';
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';
      const strides = sin(progress * 55) * 5;
      [[-18, 1], [-9, -1], [13, 1], [20, -1]].forEach(([lx, phase], i) => {
        ctx.beginPath();
        ctx.moveTo(lx, 4);
        ctx.quadraticCurveTo(lx + (i % 2 ? -2 : 2) + phase * strides * 0.3, 16, lx + (i % 2 ? 4 : -3) + phase * strides, 27);
        ctx.stroke();
      });

      // Tail.
      ctx.beginPath();
      ctx.moveTo(-29, 1);
      ctx.quadraticCurveTo(-37, -3, -34, -9);
      ctx.stroke();

      // Antlers, drawn in the same nocturnal ink.
      ctx.strokeStyle = 'rgba(4, 15, 20, 0.95)';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(30, -13);
      ctx.lineTo(28, -26);
      ctx.lineTo(23, -31);
      ctx.moveTo(28, -22);
      ctx.lineTo(33, -27);
      ctx.moveTo(28, -26);
      ctx.lineTo(34, -30);
      ctx.moveTo(34, -15);
      ctx.lineTo(37, -27);
      ctx.lineTo(43, -30);
      ctx.moveTo(37, -22);
      ctx.lineTo(32, -28);
      ctx.stroke();

      // A ruby nose — the only bright thing on the silhouette.
      ctx.globalCompositeOperation = 'lighter';
      const noseSize = 24 + sin(this.time * 5) * 2;
      ctx.globalAlpha = opacity * 0.7;
      ctx.drawImage(this.sprites.glow.rose, 38 * 1 - noseSize / 2, -13 - noseSize / 2, noseSize, noseSize);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = 'rgba(255, 172, 160, 0.95)';
      ctx.beginPath();
      ctx.arc(38, -13, 1.8, 0, TAU);
      ctx.fill();

      // Tiny gift in the sleigh? No — leave a little mystery.
      ctx.restore();
    }

    updateInteractionPositions() {
      if (!this.layout) return;
      const { centerX, starY } = this.layout;
      if (this.topperButton) {
        this.topperButton.style.transform = `translate3d(${centerX}px, ${starY}px, 0)`;
      }
      if (this.topperPrompt) {
        const side = this.W > 760 && !this.layout.tightLandscape;
        if (side) {
          this.topperPrompt.classList.add('is-side');
          this.topperPrompt.style.left = `${centerX - this.layout.starSize * 2.25 - 20}px`;
          this.topperPrompt.style.top = `${starY + 1}px`;
        } else {
          this.topperPrompt.classList.remove('is-side');
          const promptY = starY + this.layout.starSize * 2.25 + 16;
          this.topperPrompt.style.left = `${centerX}px`;
          this.topperPrompt.style.top = `${promptY}px`;
        }
      }
      if (this.ornamentButtons && this.ornamentScreen) {
        for (let i = 0; i < this.ornamentButtons.length; i++) {
          const screen = this.ornamentScreen[i];
          if (!screen) continue;
          this.ornamentButtons[i].style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
          this.ornamentButtons[i].style.opacity = screen.z < -0.82 ? 0.2 : 1;
        }
      }
    }
  }

  /* A few small drawing helpers kept outside the class. */
  function parallaxOffsetX(scene, y) {
    return scene.parallax.x * (0.6 + y * 1.4);
  }

  function drawSparkle(ctx, x, y, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.moveTo(x - size * 0.42, y - size * 0.42);
    ctx.lineTo(x + size * 0.42, y + size * 0.42);
    ctx.moveTo(x + size * 0.42, y - size * 0.42);
    ctx.lineTo(x - size * 0.42, y + size * 0.42);
    ctx.stroke();
  }

  // Two tiny helpers used by drawMeteors without polluting the class API.
  function theta(phase) {
    return 0.5 + 0.5 * sin(phase);
  }

  window.ChristmasScene = ChristmasScene;
})();
