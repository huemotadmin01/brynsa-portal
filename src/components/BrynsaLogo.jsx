// Brynsa Logo Component - Turquoise layered squares/diamonds
function BrynsaLogo({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bottom layer - darkest */}
      <path
        d="M50 85 L15 50 L50 15 L85 50 Z"
        fill="#00B8A0"
        transform="translate(0, 10)"
      />
      {/* Middle layer */}
      <path
        d="M50 85 L15 50 L50 15 L85 50 Z"
        fill="#00D4B8"
        transform="translate(0, 0)"
      />
      {/* Top layer - brightest */}
      <path
        d="M50 85 L15 50 L50 15 L85 50 Z"
        fill="#00F0D0"
        transform="translate(0, -10)"
      />
    </svg>
  );
}

export default BrynsaLogo;
