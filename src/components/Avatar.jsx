import { useState } from 'react';

const AV_SRC = '/kahotia/avatar_closeup_512px.jpg';

export default function Avatar({ size = 40, pulse = false }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}>
      {!imgFailed ? (
        <img
          src={AV_SRC}
          alt="K"
          style={{
            width: size, height: size, borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(255,213,79,0.4)',
            boxShadow: pulse ? '0 0 16px rgba(79,195,247,0.4)' : '0 0 8px rgba(79,195,247,0.2)',
            transition: 'box-shadow 0.5s'
          }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1565C0,#0D47A1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid rgba(255,213,79,0.4)',
          color: '#FFD54F', fontSize: size * 0.35, fontWeight: 700
        }}>K</div>
      )}
      {pulse && (
        <div style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          border: '2px solid rgba(79,195,247,0.3)',
          animation: 'avatar-ripple 2s ease-out infinite', pointerEvents: 'none'
        }} />
      )}
    </div>
  );
}
