import { useState } from "react";
import { useRoute } from "wouter";
import { useClient } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, Camera, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GalleryQrCode } from "@/components/gallery-qr-code";
import type { AppClient } from "@/hooks/use-data";

// ── Offline client loader ──────────────────────────────────────────────────────
// When a client is created while offline its ID is "local_<timestamp>".
// The new-client page stores the full AppClient snapshot in sessionStorage
// before navigating here, so we can render the invoice without an API call.
//
// We use a lazy useState initialiser (runs synchronously on the first render)
// rather than a useEffect so there is NEVER a frame where client is null and
// "Invoice not found" flashes on screen.
function useOfflineClient(id: string): AppClient | null {
  const [client] = useState<AppClient | null>(() => {
    if (!id.startsWith("local_")) return null;
    const raw = sessionStorage.getItem(`offline-invoice-${id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppClient;
    } catch {
      return null;
    }
  });
  return client;
}

export default function InvoicePreview() {
  const [, params] = useRoute("/staff/clients/:id/invoice");
  const id = params?.id ?? "";

  const isLocalClient = id.startsWith("local_");

  // Online clients — normal React Query fetch.
  // Pass an empty string for local clients so the query is disabled
  // (useClient has `enabled: !!id` internally).
  const { data: apiClient, isLoading } = useClient(isLocalClient ? "" : id);

  // Offline clients — synchronous read from sessionStorage (no flash).
  const offlineClient = useOfflineClient(id);

  const client: AppClient | undefined = isLocalClient
    ? (offlineClient ?? undefined)
    : apiClient;

  const { toast } = useToast();

  if (!isLocalClient && isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse">
        Loading invoice…
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12 text-center font-semibold">Invoice not found.</div>
    );
  }

  // Offline clients get a temporary DRAFT-XXXXXX reference built from the
  // last 6 digits of the local timestamp.  The real invoice number is issued
  // by the server once the record syncs.
  const invoiceLabel = isLocalClient
    ? `DRAFT-${id.replace("local_", "").slice(-6)}`
    : (client.invoiceId || "—");

  return (
    <div className="min-h-screen bg-slate-100/80 py-10 px-4 font-sans print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Offline notice (screen only, hidden when printing) ─────────── */}
        {isLocalClient && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 text-amber-700 text-sm print:hidden">
            <WifiOff className="w-4 h-4 shrink-0" />
            <p>
              <span className="font-bold">Offline draft invoice.</span>{" "}
              The invoice number is temporary and will be replaced with a
              permanent number once this record syncs to the server.
            </p>
          </div>
        )}

        {/* ── Controls (hidden when printing) ───────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden gap-3">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="gap-2 font-semibold text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex gap-3">
            {!isLocalClient && (
              <Button
                variant="outline"
                onClick={() => toast({ title: "Downloading…", description: "PDF is being generated." })}
                className="gap-2 bg-white font-semibold"
              >
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            )}
            <Button
              onClick={() => window.print()}
              className="gap-2 font-semibold shadow-md"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </Button>
          </div>
        </div>

        {/* ── Invoice paper ─────────────────────────────────────────────── */}
        <Card className="border-0 shadow-xl print:shadow-none rounded-none sm:rounded-2xl overflow-hidden bg-white">

          {/* Accent bar — amber for drafts, violet for confirmed invoices */}
          <div className={`h-2.5 w-full print:bg-violet-600 ${
            isLocalClient
              ? "bg-gradient-to-r from-amber-500 to-amber-400"
              : "bg-gradient-to-r from-violet-600 to-indigo-600"
          }`} />

          <CardContent className="p-10 sm:p-16">

            {/* ── Header: studio branding + invoice reference ──────────── */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
              <div>
                <div className="flex items-center gap-2.5 font-display text-2xl font-bold text-slate-900 mb-4">
                  <div className="bg-primary p-2 rounded-lg">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  PixelStudio
                </div>
                <div className="space-y-1 text-slate-500 text-sm">
                  <p>14 Admiralty Way, Lekki Phase 1</p>
                  <p>Lagos, Nigeria</p>
                  <p className="mt-1.5 font-medium text-slate-600">hello@pixelstudio.ng</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-5xl font-display font-bold text-slate-200 tracking-widest mb-3">
                  {isLocalClient ? "DRAFT" : "INVOICE"}
                </h1>
                <p className="font-mono text-sm font-bold text-slate-700">{invoiceLabel}</p>
                <p className="text-slate-500 text-sm mt-1">
                  Issued:{" "}
                  {new Date(client.date).toLocaleDateString(undefined, {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
                {/* Shown only on print for offline drafts */}
                {isLocalClient && (
                  <p className="text-xs text-amber-600 font-medium mt-1 hidden print:block">
                    ⚠ Pending sync — final invoice number to follow
                  </p>
                )}
              </div>
            </div>

            {/* ── Bill To + Payment Status ─────────────────────────────── */}
            <div className="flex justify-between items-end mb-12 bg-slate-50 rounded-xl p-6 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
                <p className="font-bold text-xl text-slate-900">{client.clientName}</p>
                <p className="text-slate-500 font-medium mt-0.5">{client.phone}</p>
              </div>
              <div className="text-right space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Status</p>
                <div className={`font-bold inline-block px-4 py-1.5 rounded-lg text-sm border ${
                  client.paymentStatus === "Paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {client.paymentStatus.toUpperCase()}
                </div>
              </div>
            </div>

            {/* ── Line Items ───────────────────────────────────────────── */}
            <table className="w-full mb-10">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-bold">Description</th>
                  <th className="text-center py-3 font-bold">Format</th>
                  <th className="text-center py-3 font-bold">Order Status</th>
                  <th className="text-right py-3 font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-6 pr-4">
                    <p className="font-bold text-slate-800 text-base">Photography Services</p>
                    <p className="text-sm text-slate-400 mt-0.5">Photographer: {client.staffName}</p>
                    {client.notes && (
                      <p className="text-sm text-slate-500 mt-1 max-w-xs italic">{client.notes}</p>
                    )}
                  </td>
                  <td className="py-6 text-center">
                    <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-medium">
                      {client.photoFormat}
                    </span>
                  </td>
                  <td className="py-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium border ${
                      client.orderStatus === "Delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      client.orderStatus === "Ready"     ? "bg-violet-50  text-violet-700  border-violet-200"  :
                      client.orderStatus === "Editing"   ? "bg-blue-50    text-blue-700    border-blue-200"    :
                                                           "bg-amber-50   text-amber-700   border-amber-200"
                    }`}>
                      {client.orderStatus}
                    </span>
                  </td>
                  <td className="py-6 text-right font-bold text-xl text-slate-900">
                    ₦{client.price.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── Totals + QR Code ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-10">
              {isLocalClient ? (
                <GalleryQrCode
                  galleryLink="mailto:hello@pixelstudio.ng"
                  size={160}
                  label="Contact PixelStudio"
                  description="Gallery link will be sent once your record syncs to our server."
                />
              ) : client.galleryLink ? (
                <GalleryQrCode galleryLink={client.galleryLink} size={160} />
              ) : null}
              <div className="w-full sm:w-72 space-y-3.5 bg-slate-50 p-6 rounded-xl border border-slate-100 ml-auto">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="text-slate-700 font-medium">₦{client.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax (0%)</span>
                  <span className="text-slate-700 font-medium">₦0.00</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t-2 border-slate-200 pt-4 text-slate-900">
                  <span>Total Due</span>
                  <span>₦{client.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ── Draft watermark (printed pages only) ──────────────────── */}
            {isLocalClient && (
              <div className="hidden print:block mt-8 p-4 border border-dashed border-amber-400 rounded-lg text-center text-amber-700 text-xs">
                DRAFT — Pending server sync. Final invoice number will be issued
                once connectivity is restored.
              </div>
            )}

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="mt-20 pt-8 border-t-2 border-slate-100 text-center text-slate-500 text-sm space-y-1">
              <p className="font-medium text-slate-600">
                Thank you for choosing PixelStudio for your photography needs.
              </p>
              <p>
                Questions? Contact us at{" "}
                <span className="text-primary font-semibold">hello@pixelstudio.ng</span>
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
