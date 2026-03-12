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

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading invoice document...</div>;
  if (!client) return <div className="p-12 text-center font-semibold text-lg text-slate-700">Invoice not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast({ title: "Downloading...", description: "PDF is being generated." });
  };

  return (
    <div className="min-h-screen bg-slate-100/80 py-10 px-4 font-sans print:bg-white print:py-0 print:px-0">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Controls - Hidden during print */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden gap-4">
          <Button variant="ghost" onClick={() => window.history.back()} className="gap-2 font-semibold text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownload} className="gap-2 bg-white font-semibold">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
            <Button onClick={handlePrint} className="gap-2 font-semibold shadow-md">
              <Printer className="w-4 h-4" /> Print Invoice
            </Button>
          </div>
        </div>

        {/* Invoice Paper */}
        <Card className="border-0 shadow-xl print:shadow-none print:m-0 rounded-none sm:rounded-2xl overflow-hidden bg-white">
          {/* Top color bar */}
          <div className="h-3 w-full bg-gradient-to-r from-primary to-indigo-600 print:bg-primary"></div>
          
          <CardContent className="p-10 sm:p-16">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
              <div>
                <div className="flex items-center gap-2 font-display text-2xl font-bold text-slate-900 mb-4">
                  <div className="bg-primary p-2 rounded-lg">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  PixelStudio
                </div>
                <div className="space-y-1 text-slate-500 text-sm">
                  <p>123 Creative Avenue</p>
                  <p>New York, NY 10001</p>
                  <p className="mt-2 font-medium text-slate-600">hello@pixelstudio.com</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-display font-bold text-slate-200 tracking-wider mb-3">INVOICE</h1>
                <p className="font-mono text-sm font-bold text-slate-700">INV-{client.invoiceId}</p>
                <p className="text-slate-500 text-sm mt-1 font-medium">Date: {new Date(client.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bill To & Status */}
            <div className="flex justify-between items-end mb-14 bg-slate-50 rounded-xl p-6 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
                <p className="font-bold text-xl text-slate-900">{client.clientName}</p>
                <p className="text-slate-500 font-medium">{client.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                <div className={`font-bold inline-block px-4 py-1.5 rounded-md text-sm border ${client.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {client.paymentStatus.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400">
                  <th className="text-left text-xs uppercase tracking-wider py-4 font-bold">Description</th>
                  <th className="text-center text-xs uppercase tracking-wider py-4 font-bold">Deliverable</th>
                  <th className="text-right text-xs uppercase tracking-wider py-4 font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="group hover:bg-slate-50 transition-colors">
                  <td className="py-6 px-2">
                    <p className="font-bold text-slate-800 text-base">Photography Services</p>
                    {client.notes && <p className="text-sm text-slate-500 mt-1 max-w-sm">{client.notes}</p>}
                  </td>
                  <td className="py-6 text-center">
                    <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded text-sm font-medium">{client.photoStatus}</span>
                  </td>
                  <td className="py-6 text-right font-bold text-lg text-slate-900">${client.price.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Subtotal</span>
                  <span className="text-slate-700">${client.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Tax (0%)</span>
                  <span className="text-slate-700">$0.00</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t-2 border-slate-200 pt-4 text-slate-900">
                  <span>Total</span>
                  <span>${client.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-24 pt-8 border-t-2 border-slate-100 text-center text-slate-500 text-sm">
              <p className="font-medium text-slate-600">Thank you for choosing PixelStudio for your photography needs.</p>
              <p className="mt-1">Photographer: <span className="font-semibold">{client.staffName}</span></p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
