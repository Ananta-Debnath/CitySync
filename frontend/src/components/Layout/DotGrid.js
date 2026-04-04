import React, { useEffect, useRef, useCallback } from 'react';

// Dot grid with cursor spotlight 
// Renders a fixed full-screen canvas behind all content.
const DotGrid = () => {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });
  const raf       = useRef(null);

  const DOT_SPACING  = 18;
  const DOT_RADIUS   = 1;
  const DOT_COLOR    = 'rgba(232,232,232,0.12)';
  const SPOTLIGHT_R  = 140;
  const ACCENTS = ['#CCFF00', '#00D4FF', '#FF9900'];

  const draw = useCallback((ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);

    const mx = mouse.current.x;
    const my = mouse.current.y;

    const t      = Math.max(0, Math.min(1, (mx / W + my / H) * 0.5));
    const accIdx = Math.floor(t * ACCENTS.length) % ACCENTS.length;
    const accent = ACCENTS[accIdx] ?? ACCENTS[0];

    const hex = accent.replace('#', '');
    const aR  = parseInt(hex.substring(0, 2), 16);
    const aG  = parseInt(hex.substring(2, 4), 16);
    const aB  = parseInt(hex.substring(4, 6), 16);

    const cols = Math.ceil(W / DOT_SPACING) + 1;
    const rows = Math.ceil(H / DOT_SPACING) + 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * DOT_SPACING;
        const y = r * DOT_SPACING;

        const dx   = x - mx;
        const dy   = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < SPOTLIGHT_R) {
          const strength = 1 - dist / SPOTLIGHT_R;
          const eased    = strength * strength;
          const alpha    = 0.12 + eased * 0.65;
          const dotR     = DOT_RADIUS + eased * 1.6;

          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${aR},${aG},${aB},${alpha.toFixed(2)})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = DOT_COLOR;
          ctx.fill();
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove  = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = ()  => { mouse.current = { x: -9999, y: -9999 }; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    const loop = () => {
      draw(ctx, canvas.width, canvas.height);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        0,
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  );
};

export default DotGrid;
