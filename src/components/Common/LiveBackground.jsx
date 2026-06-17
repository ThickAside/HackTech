import React, { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';

/**
 * LiveBackground — a full-screen fixed canvas that renders:
 *  • Floating geometric "features" (circles, rings, hexagons, diamonds, crosses, triangles)
 *  • Faint connecting lines between nearby features
 *  • Cursor-reactive parallax (features drift toward/away from cursor)
 *  • Mouse-trail shimmer particles
 *  • Click-burst spark particles
 *
 * All colours are derived from the current `theme` value (light / dark)
 * and update instantly when the user toggles the theme.
 */

/* ── colour palettes keyed by theme ─────────────────────────────── */
const PALETTES = {
  dark: {
    // particles / shapes
    primary:   { r: 59,  g: 130, b: 246 }, // blue-500
    accent:    { r: 16,  g: 185, b: 129 }, // emerald-500
    tertiary:  { r: 139, g: 92,  b: 246 }, // violet-500
    quaternary:{ r: 236, g: 72,  b: 153 }, // pink-500
    // connecting lines
    line:      { r: 59,  g: 130, b: 246 },
    mouseLine: { r: 16,  g: 185, b: 129 },
    // trail / sparks
    trail:     [
      { r: 59,  g: 130, b: 246 },
      { r: 16,  g: 185, b: 129 },
      { r: 139, g: 92,  b: 246 },
    ],
  },
  light: {
    primary:   { r: 37,  g: 99,  b: 235 },
    accent:    { r: 13,  g: 148, b: 136 },
    tertiary:  { r: 124, g: 58,  b: 237 },
    quaternary:{ r: 219, g: 39,  b: 119 },
    line:      { r: 37,  g: 99,  b: 235 },
    mouseLine: { r: 13,  g: 148, b: 136 },
    trail:     [
      { r: 37,  g: 99,  b: 235 },
      { r: 13,  g: 148, b: 136 },
      { r: 124, g: 58,  b: 237 },
    ],
  },
};

const ALPHA_MULT = { dark: 1, light: 0.55 }; // shapes are subtler in light mode

/* ── shape drawing helpers ──────────────────────────────────────── */
function drawHexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawDiamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.7, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.7, y);
  ctx.closePath();
}

function drawCross(ctx, x, y, r) {
  const t = r * 0.28;
  ctx.beginPath();
  ctx.moveTo(x - t, y - r);
  ctx.lineTo(x + t, y - r);
  ctx.lineTo(x + t, y - t);
  ctx.lineTo(x + r, y - t);
  ctx.lineTo(x + r, y + t);
  ctx.lineTo(x + t, y + t);
  ctx.lineTo(x + t, y + r);
  ctx.lineTo(x - t, y + r);
  ctx.lineTo(x - t, y + t);
  ctx.lineTo(x - r, y + t);
  ctx.lineTo(x - r, y - t);
  ctx.lineTo(x - t, y - t);
  ctx.closePath();
}

function drawTriangle(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* ── component ──────────────────────────────────────────────────── */
export default function LiveBackground() {
  const canvasRef  = useRef(null);
  const { theme }  = useApp();
  const themeRef   = useRef(theme);

  // keep a mutable ref so the animation loop always reads the latest theme
  useEffect(() => { themeRef.current = theme; }, [theme]);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width  = (canvas.width  = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animId;

    /* ── resize ───────────────────────── */
    const onResize = () => {
      width  = canvas.width  = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    /* ── mouse state ──────────────────── */
    const mouse = { x: null, y: null };
    const onMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      // CSS glow vars
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
      // trail particles
      if (trails.length < 100) {
        for (let i = 0; i < 2; i++) trails.push(makeTrail(e.clientX, e.clientY));
      }
    };
    const onMouseLeave = () => { mouse.x = null; mouse.y = null; };
    const onClick = (e) => {
      if (trails.length < 140) {
        for (let i = 0; i < 14; i++) trails.push(makeSpark(e.clientX, e.clientY));
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('click', onClick);

    /* ── Feature (floating shape) class ─ */
    const SHAPES = ['circle', 'ring', 'hexagon', 'diamond', 'cross', 'triangle'];

    function makeFeature() {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      return {
        x:       Math.random() * width,
        y:       Math.random() * height,
        vx:      (Math.random() - 0.5) * 0.32,
        vy:      (Math.random() - 0.5) * 0.32,
        radius:  Math.random() * 6 + 3,   // 3-9
        rotation: Math.random() * Math.PI * 2,
        rotSpeed:(Math.random() - 0.5) * 0.008,
        shape,
        palKey:  ['primary','accent','tertiary','quaternary'][Math.floor(Math.random()*4)],
        baseAlpha: Math.random() * 0.25 + 0.12, // 0.12‑0.37
        pulse:     Math.random() * Math.PI * 2,
        pulseSpeed:Math.random() * 0.012 + 0.004,
      };
    }

    const featureCount = Math.min(70, Math.floor((width * height) / 18000));
    const features = Array.from({ length: featureCount }, makeFeature);

    /* ── Trail / spark particles ─────── */
    const trails = [];

    function makeTrail(x, y) {
      return {
        x, y,
        vx: (Math.random() - 0.5) * 1.4,
        vy: (Math.random() - 0.5) * 1.4,
        r:  Math.random() * 3 + 1.2,
        alpha: 1,
        decay: 0.022,
        palIdx: Math.floor(Math.random() * 3),
        type: 'trail',
      };
    }

    function makeSpark(x, y) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.5;
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  Math.random() * 3.5 + 1.5,
        alpha: 1,
        decay: 0.016,
        friction: 0.96,
        gravity: 0.014,
        palIdx: Math.floor(Math.random() * 3),
        type: 'spark',
      };
    }

    /* ── draw a feature ──────────────── */
    function drawFeature(f, pal, aMult) {
      const c = pal[f.palKey];
      const pulseAlpha = f.baseAlpha + Math.sin(f.pulse) * 0.08;
      const a = pulseAlpha * aMult;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);

      const rgba  = `rgba(${c.r},${c.g},${c.b},${a})`;
      const rgbaG = `rgba(${c.r},${c.g},${c.b},${a * 0.25})`;

      // outer glow
      ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},${a * 0.5})`;
      ctx.shadowBlur  = f.radius * 2.5;

      switch (f.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
          ctx.fillStyle = rgba;
          ctx.fill();
          break;
        case 'ring':
          ctx.beginPath();
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
          ctx.strokeStyle = rgba;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          // inner dot
          ctx.beginPath();
          ctx.arc(0, 0, f.radius * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = rgbaG;
          ctx.fill();
          break;
        case 'hexagon':
          drawHexagon(ctx, 0, 0, f.radius);
          ctx.fillStyle = rgba;
          ctx.fill();
          break;
        case 'diamond':
          drawDiamond(ctx, 0, 0, f.radius);
          ctx.strokeStyle = rgba;
          ctx.lineWidth = 1.1;
          ctx.stroke();
          break;
        case 'cross':
          drawCross(ctx, 0, 0, f.radius * 0.85);
          ctx.fillStyle = rgba;
          ctx.fill();
          break;
        case 'triangle':
          drawTriangle(ctx, 0, 0, f.radius);
          ctx.strokeStyle = rgba;
          ctx.lineWidth = 1.1;
          ctx.stroke();
          break;
        default:
          break;
      }

      ctx.restore();
    }

    /* ── render loop ─────────────────── */
    function render() {
      const t   = themeRef.current || 'dark';
      const pal = PALETTES[t] || PALETTES.dark;
      const am  = ALPHA_MULT[t] || 1;

      ctx.clearRect(0, 0, width, height);

      // --- trails / sparks ---
      for (let i = trails.length - 1; i >= 0; i--) {
        const p = trails[i];
        if (p.type === 'spark') {
          p.vx *= p.friction;
          p.vy *= p.friction;
          p.vy += p.gravity;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { trails.splice(i, 1); continue; }

        const tc = pal.trail[p.palIdx];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tc.r},${tc.g},${tc.b},${p.alpha * 0.65 * am})`;
        ctx.fill();

        if (p.type === 'spark') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 1.8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${tc.r},${tc.g},${tc.b},${p.alpha * 0.22 * am})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // --- features ---
      const LINK_DIST  = 110;
      const MOUSE_DIST = 160;
      const ATTRACT    = 0.0004;  // subtle cursor pull

      for (let i = 0; i < features.length; i++) {
        const f = features[i];

        // cursor attraction / parallax
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - f.x;
          const dy = mouse.y - f.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 350) {
            const force = (1 - d / 350) * ATTRACT;
            f.vx += dx * force;
            f.vy += dy * force;
          }
        }

        // damping
        f.vx *= 0.998;
        f.vy *= 0.998;

        f.x += f.vx;
        f.y += f.vy;

        // wrap edges
        if (f.x < -20) f.x = width  + 20;
        if (f.x > width  + 20) f.x = -20;
        if (f.y < -20) f.y = height + 20;
        if (f.y > height + 20) f.y = -20;

        f.rotation += f.rotSpeed;
        f.pulse    += f.pulseSpeed;

        drawFeature(f, pal, am);

        // connecting lines between nearby features
        for (let j = i + 1; j < features.length; j++) {
          const g  = features[j];
          const dx = f.x - g.x;
          const dy = f.y - g.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const la = (1 - d / LINK_DIST) * 0.18 * am;
            const lc = pal.line;
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(g.x, g.y);
            ctx.strokeStyle = `rgba(${lc.r},${lc.g},${lc.b},${la})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }

        // cursor → feature line
        if (mouse.x !== null && mouse.y !== null) {
          const dx = f.x - mouse.x;
          const dy = f.y - mouse.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < MOUSE_DIST) {
            const la = (1 - d / MOUSE_DIST) * 0.30 * am;
            const mc = pal.mouseLine;
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${mc.r},${mc.g},${mc.b},${la})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    }

    render();

    /* ── cleanup ──────────────────────── */
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('click', onClick);
      cancelAnimationFrame(animId);
    };
  }, []); // runs once — colours are read each frame via themeRef

  useEffect(setup, [setup]);

  return (
    <>
      {/* Interactive canvas */}
      <canvas
        ref={canvasRef}
        id="live-bg-canvas"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Cursor spotlight glow (CSS-driven, follows --mouse-x / --mouse-y) */}
      <div className="cursor-glow" />

      {/* Floating ambient orbs — theme-aware via CSS vars */}
      <div className="live-bg-orb live-bg-orb--1" />
      <div className="live-bg-orb live-bg-orb--2" />
      <div className="live-bg-orb live-bg-orb--3" />
    </>
  );
}
