// Rivvra Logo Component - Stacked diamond layers
function RivvraLogo({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      {/* Bottom layer */}
      <path
        d="M50 90 L10 50 L50 10 L90 50 Z"
        fill="none"
        stroke="#00D9B5"
        strokeWidth="6"
        strokeLinejoin="round"
        transform="translate(0, 28)"
      />
      {/* Middle layer */}
      <path
        d="M50 90 L10 50 L50 10 L90 50 Z"
        fill="none"
        stroke="#00D9B5"
        strokeWidth="6"
        strokeLinejoin="round"
        transform="translate(0, 12)"
      />
      {/* Top layer */}
      <path
        d="M50 90 L10 50 L50 10 L90 50 Z"
        fill="none"
        stroke="#00D9B5"
        strokeWidth="6"
        strokeLinejoin="round"
        transform="translate(0, -4)"
      />
    </svg>
  );
}

export default RivvraLogo;
