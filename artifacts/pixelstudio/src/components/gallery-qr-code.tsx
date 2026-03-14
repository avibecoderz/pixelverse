import QRCode from "react-qr-code";

interface GalleryQrCodeProps {
  /** Relative gallery path, e.g. /gallery/abc123 */
  galleryLink: string;
  /** QR code size in px (default 160) */
  size?: number;
}

/**
 * Renders a QR code that points to the client's photo gallery.
 * Constructs the full URL from window.location.origin + galleryLink so it
 * always reflects the current domain (dev, staging, or production).
 *
 * Place this wherever the invoice is rendered — it is print-safe and
 * renders as an SVG so it stays crisp at any DPI.
 */
export function GalleryQrCode({ galleryLink, size = 160 }: GalleryQrCodeProps) {
  const fullUrl = `${window.location.origin}${galleryLink}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Scan to View Your Photos
      </p>

      {/* White padding around the QR code is required for scanners */}
      <div className="gallery-qr-wrapper bg-white p-3 rounded-xl border border-slate-200 shadow-sm inline-block">
        <QRCode
          value={fullUrl}
          size={size}
          level="M"
          style={{ display: "block" }}
        />
      </div>

      <p className="text-xs text-slate-500 text-center max-w-[200px] leading-relaxed">
        Scan this QR code to access and download your photos.
      </p>
    </div>
  );
}
