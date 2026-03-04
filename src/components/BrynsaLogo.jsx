// Rivvra Logo Component — new green swirl icon
function RivvraLogo({ className = "w-5 h-5" }) {
  return (
    <img
      src="/rivvra-icon-sm.png"
      alt="Rivvra"
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}

export default RivvraLogo;
