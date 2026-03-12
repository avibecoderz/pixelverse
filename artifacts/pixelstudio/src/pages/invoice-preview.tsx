import { useRoute, useLocation } from "wouter";
import { useClient } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InvoicePreview() {
  const [match, params] = useRoute("/staff/clients/:id/invoice");
  const [_, setLocation] = useLocation();
  const { data: client, isLoading } = useClient(params?.id || "");
  const { toast } = useToast();

  if (isLoading) return <div className="p-12 text-center">Loading invoice...</div>;
  if (!client) return <div className="p-12 text-center">Invoice not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast({ title: "Downloading...", description: "PDF is being generated." });
  };

  return (
    <div className="min-h-screen bg-slate-100/50 py-8 px-4 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Controls - Hidden during print */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-border/50 print:hidden gap-4">
          <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownload} className="gap-2 bg-white">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Print Invoice
            </Button>
          </div>
        </div>

        {/* Invoice Paper */}
        <Card className="border-0 shadow-lg print:shadow-none print:m-0 rounded-none sm:rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-10 sm:p-16">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
              <div>
                <div className="flex items-center gap-2 font-display text-2xl font-bold text-primary mb-2">
                  <Camera className="w-7 h-7" />
                  PixelStudio
                </div>
                <p className="text-slate-500 text-sm">123 Creative Avenue</p>
                <p className="text-slate-500 text-sm">New York, NY 10001</p>
                <p className="text-slate-500 text-sm mt-1">hello@pixelstudio.com</p>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-light text-slate-300 tracking-wider mb-2">INVOICE</h1>
                <p className="font-mono text-sm font-medium">{client.invoiceId}</p>
                <p className="text-slate-500 text-sm mt-1">Date: {new Date(client.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="flex justify-between items-end mb-12">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
                <p className="font-semibold text-lg">{client.clientName}</p>
                <p className="text-slate-500">{client.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                <div className={`font-semibold inline-block px-3 py-1 rounded-sm text-sm ${client.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {client.paymentStatus.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400">
                  <th className="text-left text-xs uppercase tracking-wider py-3 font-semibold">Description</th>
                  <th className="text-center text-xs uppercase tracking-wider py-3 font-semibold">Deliverable</th>
                  <th className="text-right text-xs uppercase tracking-wider py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-4">
                    <p className="font-medium">Photography Services</p>
                    {client.notes && <p className="text-sm text-slate-500 mt-1">{client.notes}</p>}
                  </td>
                  <td className="py-4 text-center text-slate-600">{client.photoStatus}</td>
                  <td className="py-4 text-right font-medium">${client.price.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>${client.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax (0%)</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-3">
                  <span>Total</span>
                  <span>${client.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
              <p>Thank you for choosing PixelStudio for your photography needs.</p>
              <p className="mt-1">Photographer: {client.staffName}</p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
