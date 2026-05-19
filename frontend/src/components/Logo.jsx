import React from 'react';

export function Logo({ size = 32, showText = true, textStyle = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', ...textStyle }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Radial dark-red gradient inside lens */}
          <radialGradient id="lensBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4c0519" />
            <stop offset="100%" stopColor="#1e0008" />
          </radialGradient>
          
          {/* Glass magnifying ring gradient */}
          <linearGradient id="glassRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          
          {/* Tilted handle gradient */}
          <linearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>
          
          {/* Soft drop shadow glow */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floating background embers/particles */}
        <circle cx="28" cy="38" r="2.5" fill="#f97316" opacity="0.8" />
        <circle cx="58" cy="18" r="2" fill="#ea580c" opacity="0.7" />
        <circle cx="82" cy="38" r="3" fill="#f97316" opacity="0.9" />
        <circle cx="76" cy="22" r="1.5" fill="#fb923c" opacity="0.6" />
        <circle cx="84" cy="58" r="2" fill="#dc2626" opacity="0.8" />
        <circle cx="28" cy="58" r="1.5" fill="#dc2626" opacity="0.7" />

        {/* Magnifying Glass Rounded Handle (rotated at -45 deg) */}
        <rect 
          x="12" 
          y="68" 
          width="12" 
          height="28" 
          rx="6" 
          transform="rotate(-45 18 82)" 
          fill="url(#handleGrad)" 
        />
        
        {/* Inner Lens Dark Circle */}
        <circle 
          cx="56" 
          cy="44" 
          r="26" 
          fill="url(#lensBg)" 
        />

        {/* White Rising Trend Line with Vertices inside the Lens */}
        <path 
          d="M 38 52 L 48 42 L 56 48 L 68 32" 
          stroke="#ffffff" 
          strokeWidth="4.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none" 
        />
        
        {/* White circle nodes at vertices */}
        <circle cx="38" cy="52" r="4" fill="#ffffff" />
        <circle cx="48" cy="42" r="4" fill="#ffffff" />
        <circle cx="56" cy="48" r="4" fill="#ffffff" />
        <circle cx="68" cy="32" r="4" fill="#ffffff" />

        {/* Glowing Orange Magnifying Outer Ring */}
        <circle 
          cx="56" 
          cy="44" 
          r="26" 
          stroke="url(#glassRing)" 
          strokeWidth="5" 
          fill="none"
          filter="url(#glow)"
        />
      </svg>
      
      {showText && (
        <span style={{ 
          fontSize: '1.25rem', 
          fontWeight: 800, 
          display: 'flex', 
          alignItems: 'center',
          letterSpacing: '-0.3px',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          userSelect: 'none'
        }}>
          <span style={{ color: '#ffffff' }}>Reddit</span>
          <span style={{ 
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginLeft: '1px'
          }}>
            GapFinder
          </span>
        </span>
      )}
    </div>
  );
}

export default Logo;
