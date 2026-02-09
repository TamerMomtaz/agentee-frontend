import Avatar from './Avatar.jsx';

export default function Splash() {
  return (
    <div className="splash">
      {[...Array(25)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            background: i % 3 === 0 ? '#FFD54F' : '#4FC3F7',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            opacity: 0.2 + Math.random() * 0.5,
            animationDuration: (3 + Math.random() * 4) + 's',
            animationDelay: Math.random() * 2 + 's',
          }}
        />
      ))}
      <div className="splash-avatar">
        <Avatar size={130} pulse={true} />
      </div>
      <h1 className="splash-title">A-GENTEE</h1>
      <p className="splash-sub">THE WAVE 🌊</p>
      <p className="splash-phi">&I — AI + Human, not AI instead of Human</p>
      <div className="splash-engines">
        {['Claude', 'Gemini', 'OpenAI'].map((n) => (
          <span key={n} className="engine-badge">{n} ✅</span>
        ))}
      </div>
    </div>
  );
}
