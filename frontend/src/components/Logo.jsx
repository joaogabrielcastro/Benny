export default function Logo({ size = "md", className = "" }) {
  const sizes = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Círculo de fundo azul */}
        <circle cx="100" cy="100" r="95" fill="#1e40af"/>
        
        {/* Texto BENNY'S */}
        <text 
          x="100" 
          y="85" 
          fontFamily="Arial, sans-serif" 
          fontSize="32" 
          fontWeight="bold" 
          fill="white" 
          textAnchor="middle"
        >
          BENNY'S
        </text>
        
        {/* Texto MOTORSPORT com linhas */}
        <line x1="40" y1="100" x2="80" y2="100" stroke="white" strokeWidth="2"/>
        <text 
          x="100" 
          y="105" 
          fontFamily="Arial, sans-serif" 
          fontSize="12" 
          fontWeight="normal" 
          fill="white" 
          textAnchor="middle" 
          letterSpacing="2"
        >
          MOTORSPORT
        </text>
        <line x1="120" y1="100" x2="160" y2="100" stroke="white" strokeWidth="2"/>
        
        {/* Texto Centro Automotivo */}
        <text 
          x="100" 
          y="125" 
          fontFamily="Arial, sans-serif" 
          fontSize="11" 
          fontWeight="normal" 
          fill="white" 
          textAnchor="middle" 
          letterSpacing="1"
        >
          CENTRO AUTOMOTIVO
        </text>
      </svg>
    </div>
  );
}
