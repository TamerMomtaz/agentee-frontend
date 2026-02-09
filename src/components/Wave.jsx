import { useRef, useEffect } from 'react';

export default function Wave({ active }) {
  const c = useRef(null);
  const a = useRef(null);
  const t = useRef(0);

  useEffect(() => {
    if (!active || !c.current) {
      if (a.current) cancelAnimationFrame(a.current);
      return;
    }
    const cv = c.current;
    const ctx = cv.getContext('2d');
    const w = (cv.width = cv.offsetWidth * 2);
    const h = (cv.height = cv.offsetHeight * 2);

    const draw = () => {
      t.current += 0.03;
      ctx.clearRect(0, 0, w, h);
      [
        [0.5, 0.28, 0.008, 1, '#4FC3F7'],
        [0.3, 0.2, 0.012, 1.3, '#FFD54F'],
        [0.18, 0.14, 0.006, 0.7, '#42A5F5'],
      ].forEach(([op, af, fr, sp, col]) => {
        ctx.beginPath();
        ctx.strokeStyle = col;
        ctx.globalAlpha = op;
        ctx.lineWidth = 2;
        const am = h * af;
        for (let x = 0; x <= w; x += 2) {
          const y = h / 2 + Math.sin(x * fr + t.current * sp) * am + Math.sin(x * fr * 2.5 + t.current * sp * 1.5) * am * 0.3;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      a.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (a.current) cancelAnimationFrame(a.current); };
  }, [active]);

  if (!active) return null;
  return <canvas ref={c} style={{ width: '100%', height: 48, opacity: 0.85 }} />;
}
