/**
 * Logo oficial Benny's Motorsport para OS/orçamento impressos.
 * Usa a imagem colorida (azul + branco) para o PDF não sair em preto e branco.
 */
export default function LogoImpressao({ width = 90, height = 90 }) {
  return (
    <img
      src="/bennys-logo.jpg"
      alt="Benny's Motorsport"
      width={width}
      height={height}
      className="logo-impressao"
      style={{
        display: "block",
        width: `${width}px`,
        height: `${height}px`,
        objectFit: "contain",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        colorAdjust: "exact",
      }}
    />
  );
}
