import "server-only";
import QRCode from "qrcode";

/** SVG kodu QR (renderowany na serwerze — bez zewnętrznych usług). */
export function qrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#1B3B2F", light: "#FFFFFF" } });
}
