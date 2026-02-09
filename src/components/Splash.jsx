import Avatar from './Avatar.jsx';

export default function Splash() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    key: i,
    width: 2 + Math.random() * 3,
    bg: i % 3 === 0 ? '#FFD54F' : '#4FC3F7',
    left: Math.random() * 100 + '%',
    top: Math.random() * 100 + '%',
    opacity: 0.2 + Math.random() * 0.5,
    dur: (3 + Math.random() * 4) + 's',
    delay: Math.random() * 2 + 's',
  }));

  return (
    <div className="splash">
      {particles.map(p => (
        <div
          key={p.key}
          className="particle"
          style={{
            width: p.width, height: p.width, background: p.bg,
            left: p.left, top: p.top, opacity: p.opacity,
            animationDuration: p.dur, animationDelay: p.delay,
          }}
        />
      ))}
      <div className="splash-avatar"><Avatar size={130} pulse={true} /></div>
      <h1 className="splash-title">A-GENTEE</h1>
      <p className="splash-sub">THE WAVE 🌊</p>
      <p className="splash-phi">&I — AI + Human, not AI instead of Human</p>
      <div className="splash-engines">
        {['Claude', 'Gemini', 'OpenAI'].map(n => (
          <span key={n} className="engine-badge">{n} ✅</span>
        ))}
      </div>
    </div>
  );
}
