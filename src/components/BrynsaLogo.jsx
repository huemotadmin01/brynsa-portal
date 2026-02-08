// Rivvra Logo Component - Stacked chevron layers
function RivvraLogo({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bottom chevron */}
      <path
        d="M50 95 L5 55 L20 42 L50 68 L80 42 L95 55 Z"
        fill="#00D9B5"
      />
      {/* Middle chevron */}
      <path
        d="M50 70 L5 30 L20 17 L50 43 L80 17 L95 30 Z"
        fill="#00D9B5"
      />
      {/* Top chevron */}
      <path
        d="M50 45 L5 5 L20 -8 L50 18 L80 -8 L95 5 Z"
        fill="#00D9B5"
      />
    </svg>
  );
}

export default RivvraLogo;
