/* =========================================================
   星愿圣诞夜 · Opening film
   A little galaxy of golden-green dust spirals into a tree,
   then hands the night over to the living scene beneath it.
   ========================================================= */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const {
    min, max, abs, sin, cos, PI, floor, round
  } = Math;
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
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

  const PALETTES = {
    green: [82, 226, 175],
    mint: [140, 255, 218],
    gold: [255, 211, 137],
    warm: [255, 237, 195],
    ice: [171, 223, 255],
    rose: [255, 171, 171]
  };

  class ChristmasIntro {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.getLayout = typeof options.getLayout === 'function' ? options.getLayout : () => null;
      this.ornaments = options.ornaments || [];
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.sprites = this.makeSprites();
      this.W = 1;
      this.H = 1;
      this.dpr = 1;
      this.active = false;
      this.startAt = 0;
      this.time = 0;
      this.raf = null;
      this.layout = null;
      this.stars = [];
      this.snow = [];
      this.particles = [];
      this.particleBuckets = { green: [], mint: [], gold: [], warm: [], ice: [], rose: [] };
      this.resize();
      this.onResize = () => {
        if (!this.active) return;
        clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.resize(), 120);
      };
      window.addEventListener('resize', this.onResize, { passive: true });
    }

    makeSprites() {
      const make = (rgb) => {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255, 255, 250, 0.96)');
        g.addColorStop(0.08, 'rgba(255, 251, 231, 0.9)');
        g.addColorStop(0.23, rgba(rgb, 0.54));
        g.addColorStop(0.55, rgba(rgb, 0.12));
        g.addColorStop(1, rgba(rgb, 0));
        x.fillStyle = g;
        x.fillRect(0, 0, 64, 64);
        return c;
      };
      return {
        green: make(PALETTES.green),
        mint: make(PALETTES.mint),
        gold: make(PALETTES.gold),
        warm: make(PALETTES.warm),
        ice: make(PALETTES.ice),
        rose: make(PALETTES.rose)
      };
    }

    resize() {
      const vw = max(1, window.innerWidth);
      const vh = max(1, window.innerHeight);
      this.W = vw;
      this.H = vh;
      this.dpr = min(window.devicePixelRatio || 1, 2);
      this.canvas.width = round(vw * this.dpr);
      this.canvas.height = round(vh * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = true;
      const layout = this.getLayout();
      this.layout = layout && layout.treeHeight
        ? layout
        : {
            W: vw,
            H: vh,
            centerX: vw * 0.58,
            baseY: vh * 0.83,
            treeHeight: min(vh * 0.54, vw * 0.5),
            baseRadius: min(vh * 0.2, vw * 0.22),
            starY: vh * 0.25,
            horizon: vh * 0.7,
            moon: { x: vw * 0.82, y: vh * 0.18, r: 48 }
          };
      this.build();
    }

    build() {
      const layout = this.layout;
      const W = this.W;
      const H = this.H;
      const mobile = W <= 760;
      const rng = mulberry32(20261225);
      this.centerX = layout.centerX;
      this.baseY = layout.baseY;
      this.treeHeight = layout.treeHeight;
      this.treeRadius = layout.baseRadius;
      this.topY = layout.baseY - layout.treeHeight;
      this.starY = layout.starY || this.topY - layout.treeHeight * 0.032;
      this.horizon = layout.horizon || H * 0.705;
      this.moon = layout.moon || { x: W * 0.82, y: H * 0.18, r: 48 };

      this.stars = [];
      const starCount = mobile ? 54 : 96;
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: rng() * W,
          y: rng() * (H * 0.68),
          size: 0.35 + rng() * 1.3,
          alpha: 0.12 + rng() * 0.48,
          phase: rng() * TAU,
          speed: 0.3 + rng() * 1.1,
          flare: rng() < 0.08
        });
      }

      this.snow = [];
      const snowCount = this.reduced ? 10 : (mobile ? 28 : 52);
      for (let i = 0; i < snowCount; i++) {
        this.snow.push({
          x: rng(),
          y: rng(),
          speed: 0.018 + rng() * 0.04,
          size: 0.8 + rng() * 2.4,
          phase: rng() * TAU,
          alpha: 0.18 + rng() * 0.48
        });
      }

      this.particles = [];
      const total = this.reduced ? 260 : (mobile ? 500 : 840);
      const tiers = mobile ? 16 : 22;
      const tierWeights = [];
      const tierInfo = [];
      for (let tier = 0; tier < tiers; tier++) {
        const f = tier / (tiers - 1);
        const height = Math.pow(f, 0.93);
        const weight = Math.pow(1 - height, 0.9) + 0.08;
        tierWeights.push(weight);
        tierInfo.push({
          height,
          radius: Math.pow(1 - height, 1.02),
          phase: rng() * TAU,
          weight
        });
      }
      const weightSum = tierWeights.reduce((a, b) => a + b, 0);
      const allocation = tierInfo.map((tier) => floor(total * tier.weight / weightSum));
      let allocated = allocation.reduce((a, b) => a + b, 0);
      while (allocated < total) {
        allocation[floor(rng() * tiers)] += 1;
        allocated += 1;
      }

      for (let tier = 0; tier < tiers; tier++) {
        const info = tierInfo[tier];
        const armCount = max(4, round(lerp(9, 3, info.height)));
        const count = allocation[tier];
        for (let i = 0; i < count; i++) {
          const arm = floor(rng() * armCount);
          const p = 0.12 + 0.9 * Math.pow(rng(), 0.7);
          const angle = info.phase + arm / armCount * TAU + (rng() - 0.5) * 0.22;
          const z = sin(angle);
          const r = this.treeRadius * info.radius * (0.42 + p * 0.58);
          const x = this.centerX + cos(angle) * r * (1 + z * 0.11);
          const y = this.baseY - info.height * this.treeHeight - (1 - p) * this.treeHeight * 0.035 + z * this.treeHeight * 0.008;
          const light = rng() < 0.145;
          const colorRoll = rng();
          let color;
          if (light) color = colorRoll > 0.72 ? 'ice' : colorRoll > 0.33 ? 'gold' : 'warm';
          else color = colorRoll > 0.72 ? 'mint' : colorRoll > 0.2 ? 'green' : 'gold';
          const heightNorm = info.height;
          this.particles.push(this.makeParticle({
            x, y, z,
            color,
            size: light ? 1.65 + rng() * 1.55 : 0.55 + rng() * 0.8,
            big: light,
            heightNorm,
            rng
          }));
        }
      }

      // A garland of brighter stars wraps the same silhouette as the living tree.
      const garlandCount = mobile ? 64 : 96;
      for (let i = 0; i < garlandCount; i++) {
        const t = 0.055 + 0.89 * i / garlandCount;
        const height = Math.pow(t, 0.94);
        const angle = t * TAU * 4.6 + 1.2;
        const rr = this.treeRadius * Math.pow(1 - height, 1.01) * 0.96;
        const z = sin(angle);
        const x = this.centerX + cos(angle) * rr * (1 + z * 0.11);
        const y = this.baseY - height * this.treeHeight + z * this.treeHeight * 0.008;
        this.particles.push(this.makeParticle({
          x, y, z,
          color: i % 9 === 0 ? 'ice' : 'gold',
          size: 1.45 + rng() * 1.15,
          big: true,
          heightNorm: height,
          rng
        }));
      }

      // Echo the eight coloured ornaments of the final tree.
      if (this.ornaments.length) {
        this.ornaments.forEach((ornament, i) => {
          const height = clamp(ornament.y || 0.3 + i * 0.07, 0.14, 0.86);
          const angle = PI / 2 + (ornament.angle || 0);
          const rr = this.treeRadius * Math.pow(1 - height, 1.03) * 1.01;
          const x = this.centerX + cos(angle) * rr;
          const y = this.baseY - height * this.treeHeight;
          const rgb = this.hexToRgb(ornament.color || '#f0d398');
          const key = this.closestPalette(rgb);
          this.particles.push(this.makeParticle({
            x, y, z: sin(angle), color: key, size: 2.4,
            big: true, heightNorm: height, rng, ornament: i
          }));
        });
      }

    }

    makeParticle({ x, y, z, color, size, big, heightNorm, rng, ornament = -1 }) {
      const startAngle = rng() * TAU;
      const spread = this.treeRadius * (1.65 + rng() * 2.7) + min(this.W, this.H) * 0.025;
      const startX = this.centerX + cos(startAngle) * spread;
      const startY = this.baseY - this.treeHeight * (0.24 + rng() * 0.92) + sin(startAngle) * spread * 0.17;
      const delay = 0.08 + 0.34 * heightNorm + rng() * 0.95;
      // The tree grows from the base upward, with a soft overlap so it feels
      // alive rather than mechanical.
      return {
        x, y, z, color, size, big, ornament,
        startX,
        startY,
        startAngle,
        delay,
        duration: 0.72 + rng() * 0.52,
        phase: rng() * TAU,
        twinkle: 0.8 + rng() * 1.8,
        alpha: 0.42 + rng() * 0.5
      };
    }

    closestPalette(rgb) {
      const entries = Object.entries(PALETTES);
      let best = 'gold';
      let bestDist = Infinity;
      for (const [name, c] of entries) {
        const d = Math.pow(c[0] - rgb[0], 2) + Math.pow(c[1] - rgb[1], 2) + Math.pow(c[2] - rgb[2], 2);
        if (d < bestDist) {
          bestDist = d;
          best = name;
        }
      }
      return best;
    }

    hexToRgb(hex) {
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16)
      ];
    }

    start() {
      if (this.active) return;
      this.active = true;
      this.resize();
      this.startedAt = performance.now() / 1000;
      this.time = 0;
      this.last = performance.now();
      this.raf = requestAnimationFrame((now) => this.loop(now));
    }

    stop() {
      this.active = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    loop(now) {
      if (!this.active) return;
      this.time = max(0, now / 1000 - this.startedAt);
      const dt = clamp((now - this.last) / 1000, 0.001, 0.06);
      this.last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame((next) => this.loop(next));
    }

    update(dt) {
      for (const flake of this.snow) {
        flake.y += flake.speed * dt;
        flake.x += (0.003 + sin(this.time * 0.5 + flake.phase) * 0.006) * dt;
        if (flake.y > 1.05) {
          flake.y = -0.06;
          flake.x = Math.random();
        }
      }
    }

    /** Where a particle lives at a given local progress. */
    particlePosition(p, e) {
      const remain = 1 - e;
      const swirl = remain * 1.55;
      const ox = (p.startX - p.x) * remain;
      const oy = (p.startY - p.y) * remain;
      const cs = cos(swirl);
      const sn = sin(swirl);
      return {
        x: p.x + ox * cs - oy * sn,
        y: p.y + ox * sn + oy * cs + sin(e * PI) * 16
      };
    }

    draw() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const t = this.time;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#01040a');
      sky.addColorStop(0.25, '#05131d');
      sky.addColorStop(0.52, '#0a2630');
      sky.addColorStop(0.7, '#0d2d35');
      sky.addColorStop(1, '#041015');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      this.drawAurora();
      this.drawStars(t);
      this.drawMoon();
      this.drawLand();

      const reveal = smoothstep(0.1, 0.65, t);
      this.drawTreeAura(reveal, t);
      this.drawParticles(t, reveal);
      this.drawSnow(t);
      this.drawStar(t);
      this.drawVignette();
    }

    drawAurora() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(W * 0.46, H * 0.25, 0, W * 0.46, H * 0.25, W * 0.52);
      glow.addColorStop(0, 'rgba(46, 151, 140, 0.12)');
      glow.addColorStop(0.42, 'rgba(24, 92, 96, 0.07)');
      glow.addColorStop(1, 'rgba(6, 24, 32, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H * 0.8);

      const ribbon = ctx.createLinearGradient(W * 0.15, H * 0.12, W * 0.65, H * 0.42);
      ribbon.addColorStop(0, 'rgba(107, 238, 204, 0)');
      ribbon.addColorStop(0.38, 'rgba(78, 219, 190, 0.055)');
      ribbon.addColorStop(0.68, 'rgba(96, 156, 255, 0.035)');
      ribbon.addColorStop(1, 'rgba(140, 112, 255, 0)');
      ctx.fillStyle = ribbon;
      ctx.beginPath();
      ctx.moveTo(-W * 0.06, H * 0.08);
      ctx.bezierCurveTo(W * 0.23, H * 0.17, W * 0.38, H * 0.12, W * 0.62, H * 0.26);
      ctx.bezierCurveTo(W * 0.74, H * 0.33, W * 0.82, H * 0.28, W * 1.06, H * 0.13);
      ctx.lineTo(W * 1.06, H * 0.4);
      ctx.bezierCurveTo(W * 0.7, H * 0.46, W * 0.44, H * 0.33, W * 0.2, H * 0.24);
      ctx.bezierCurveTo(W * 0.04, H * 0.17, -W * 0.02, H * 0.2, -W * 0.06, H * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawStars(t) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const star of this.stars) {
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * sin(t * star.speed + star.phase));
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillStyle = 'rgba(229, 243, 239, 0.9)';
        ctx.fillRect(star.x, star.y, star.size, star.size);
        if (star.flare) {
          ctx.globalAlpha *= 0.35;
          ctx.strokeStyle = 'rgba(234, 246, 240, 0.7)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(star.x - 4, star.y);
          ctx.lineTo(star.x + 4, star.y);
          ctx.moveTo(star.x, star.y - 4);
          ctx.lineTo(star.x, star.y + 4);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawMoon() {
      const ctx = this.ctx;
      const moon = this.moon;
      const r = moon.r;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.26;
      const halo = ctx.createRadialGradient(moon.x, moon.y, r * 0.3, moon.x, moon.y, r * 5);
      halo.addColorStop(0, 'rgba(245, 228, 187, 0.38)');
      halo.addColorStop(0.4, 'rgba(219, 205, 173, 0.08)');
      halo.addColorStop(1, 'rgba(219, 205, 173, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(moon.x - r * 5, moon.y - r * 5, r * 10, r * 10);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.84;
      ctx.fillStyle = 'rgba(226, 224, 205, 0.92)';
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, r * 0.93, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = 'rgba(100, 124, 126, 0.8)';
      ctx.beginPath();
      ctx.arc(moon.x - r * 0.22, moon.y - r * 0.1, r * 0.2, 0, TAU);
      ctx.arc(moon.x + r * 0.18, moon.y + r * 0.2, r * 0.13, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    drawLand() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const y = this.horizon;
      ctx.save();
      const ice = ctx.createLinearGradient(0, y, 0, H);
      ice.addColorStop(0, '#0b2730');
      ice.addColorStop(0.48, '#081b23');
      ice.addColorStop(1, '#020c12');
      ctx.fillStyle = ice;
      ctx.fillRect(0, y, W, H - y);

      // Distant ridges, just enough to place the tree in a landscape.
      ctx.fillStyle = 'rgba(5, 23, 29, 0.92)';
      ctx.beginPath();
      ctx.moveTo(0, y + 8);
      ctx.lineTo(W * 0.16, y - H * 0.09);
      ctx.lineTo(W * 0.3, y - H * 0.015);
      ctx.lineTo(W * 0.43, y - H * 0.07);
      ctx.lineTo(W * 0.59, y + 3);
      ctx.lineTo(W * 0.72, y - H * 0.045);
      ctx.lineTo(W * 0.86, y + 1);
      ctx.lineTo(W, y - H * 0.035);
      ctx.lineTo(W, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 199, 197, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const mist = ctx.createLinearGradient(0, y - 20, 0, y + 42);
      mist.addColorStop(0, 'rgba(81, 151, 146, 0)');
      mist.addColorStop(0.5, 'rgba(94, 166, 158, 0.12)');
      mist.addColorStop(1, 'rgba(17, 49, 54, 0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, y - 22, W, 70);

      const ground = ctx.createRadialGradient(this.centerX, this.baseY, 0, this.centerX, this.baseY, this.treeRadius * 2.2);
      ground.addColorStop(0, 'rgba(77, 131, 115, 0.12)');
      ground.addColorStop(1, 'rgba(13, 43, 45, 0)');
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.ellipse(this.centerX, this.baseY, this.treeRadius * 2.2, this.treeHeight * 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    drawTreeAura(reveal, t) {
      const ctx = this.ctx;
      const progress = smoothstep(0.25, 2.0, t);
      if (progress <= 0) return;
      const top = this.topY + 5;
      const base = this.baseY;
      const left = this.centerX - this.treeRadius * 0.97;
      const right = this.centerX + this.treeRadius * 0.97;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = progress * 0.4;
      const g = ctx.createLinearGradient(0, top, 0, base);
      g.addColorStop(0, 'rgba(104, 236, 191, 0.035)');
      g.addColorStop(0.4, 'rgba(40, 156, 121, 0.22)');
      g.addColorStop(1, 'rgba(10, 59, 51, 0.38)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(this.centerX, top);
      ctx.bezierCurveTo(this.centerX + this.treeRadius * 0.18, top + this.treeHeight * 0.24, this.centerX + this.treeRadius * 0.7, top + this.treeHeight * 0.72, right, base - 2);
      ctx.quadraticCurveTo(this.centerX, base + 8, left, base - 2);
      ctx.bezierCurveTo(this.centerX - this.treeRadius * 0.7, top + this.treeHeight * 0.72, this.centerX - this.treeRadius * 0.18, top + this.treeHeight * 0.24, this.centerX, top);
      ctx.closePath();
      try { ctx.filter = 'blur(18px)'; } catch (_) {}
      ctx.fill();
      try { ctx.filter = 'none'; } catch (_) {}

      ctx.globalAlpha = progress * 0.33;
      ctx.strokeStyle = 'rgba(147, 232, 193, 0.13)';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 11; i++) {
        const h = 0.12 + i * 0.074;
        const r = this.treeRadius * Math.pow(1 - h, 1.02) * 0.9;
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.baseY - h * this.treeHeight, r, 1.5, 0, PI * 0.06, PI * 0.94);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawParticles(t, reveal) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        const local = clamp((t - p.delay) / p.duration, 0, 1);
        const e = easeOutCubic(local);
        const pos = this.particlePosition(p, e);
        if (pos.x < -80 || pos.x > this.W + 80 || pos.y < -80 || pos.y > this.H + 80) continue;
        const twinkle = 0.58 + 0.42 * sin(t * p.twinkle + p.phase);
        const arrived = smoothstep(0.62, 0.97, local);
        const alpha = reveal * p.alpha * (0.2 + e * 0.8) * (0.62 + twinkle * 0.38) + arrived * 0.08;
        if (alpha <= 0.01) continue;
        const ratio = p.big ? 1 : 0.8;
        const size = p.size * (0.55 + e * 0.7) * ratio;
        if (p.big) {
          // A small comet tail while the star is still on its way home.
          if (local > 0.06 && local < 0.92) {
            const prevE = easeOutCubic(clamp(local - 0.055, 0, 1));
            const prev = this.particlePosition(p, prevE);
            ctx.globalAlpha = alpha * 0.24;
            ctx.strokeStyle = rgba(PALETTES[p.color], 0.6);
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
          }
          ctx.globalAlpha = alpha * (0.35 + arrived * 0.35);
          const glow = (p.ornament >= 0 ? 22 : 16) * (0.55 + e * 0.65);
          ctx.drawImage(this.sprites[p.color], pos.x - glow / 2, pos.y - glow / 2, glow, glow);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = rgba(PALETTES[p.color], 0.9);
          ctx.fillRect(pos.x - 0.75, pos.y - 0.75, 1.5, 1.5);
        } else {
          ctx.globalAlpha = alpha * 0.92;
          ctx.fillStyle = rgba(PALETTES[p.color], 0.9);
          const s = 0.7 + e * 0.8;
          ctx.fillRect(pos.x - s / 2, pos.y - s / 2, s, s);
          if (local > 0.3 && p.size > 0.95) {
            ctx.globalAlpha = alpha * 0.18;
            ctx.drawImage(this.sprites[p.color], pos.x - 5, pos.y - 5, 10, 10);
          }
        }
      }
      ctx.restore();
    }

    drawSnow(t) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const flake of this.snow) {
        const x = flake.x * this.W + sin(t * 0.5 + flake.phase) * 9;
        const y = flake.y * this.H;
        ctx.globalAlpha = flake.alpha * (0.6 + 0.4 * sin(t + flake.phase));
        ctx.fillStyle = 'rgba(240, 251, 250, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, flake.size * 0.7, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawStar(t) {
      const ctx = this.ctx;
      const bloom = smoothstep(0.25, 2.15, t);
      const x = this.centerX;
      const y = this.starY;
      const r = (5 + bloom * (this.W < 760 ? 12 : 17)) * (0.95 + sin(t * 2.2) * 0.05);
      const pulse = 0.65 + 0.35 * sin(t * 2.6);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 + bloom * 0.45;
      const halo = r * (8 + bloom * 3);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, halo);
      glow.addColorStop(0, `rgba(255, 252, 236, ${0.34 + bloom * 0.28})`);
      glow.addColorStop(0.16, `rgba(255, 231, 165, ${0.18 + bloom * 0.16})`);
      glow.addColorStop(0.5, 'rgba(178, 232, 203, 0.05)');
      glow.addColorStop(1, 'rgba(178, 232, 203, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);

      ctx.globalAlpha = 0.35 + bloom * 0.45;
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(i * PI / 2 + 0.22);
        const ray = ctx.createLinearGradient(0, 0, r * (3.2 + bloom * 2.1), 0);
        ray.addColorStop(0, 'rgba(255, 249, 224, 0.6)');
        ray.addColorStop(0.3, 'rgba(255, 229, 166, 0.12)');
        ray.addColorStop(1, 'rgba(255, 229, 166, 0)');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(0, -0.7);
        ctx.lineTo(r * (3.2 + bloom * 2.1), 0);
        ctx.lineTo(0, 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 0.75 + pulse * 0.2;
      const starFill = ctx.createRadialGradient(x, y, 0, x, y, r);
      starFill.addColorStop(0, 'rgba(255, 255, 250, 1)');
      starFill.addColorStop(0.4, 'rgba(255, 240, 193, 0.95)');
      starFill.addColorStop(1, 'rgba(220, 177, 96, 0)');
      ctx.fillStyle = starFill;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = -PI / 2 + i * PI / 8 + t * 0.08;
        const rr = i % 2 === 0 ? r : r * 0.28;
        const px = x + cos(a) * rr;
        const py = y + sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawVignette() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const vignette = ctx.createRadialGradient(W * 0.54, H * 0.42, H * 0.2, W * 0.54, H * 0.42, H * 0.82);
      vignette.addColorStop(0, 'rgba(1, 6, 10, 0)');
      vignette.addColorStop(1, 'rgba(1, 5, 9, 0.35)');
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  window.ChristmasIntro = ChristmasIntro;
})();
