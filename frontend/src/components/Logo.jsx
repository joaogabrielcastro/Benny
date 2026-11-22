export default function Logo({ size = "md", className = "" }) {
  const sizes = {
    xs: "w-8 h-8",
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <img
        src="/bennys-logo.jpg"
        alt="Benny's Centro Automotivo"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
