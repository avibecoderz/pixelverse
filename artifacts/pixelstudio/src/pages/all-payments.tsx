import { useState } from "react";
import { usePayments, useClients, useInvoices, useUpdateClient } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DollarSign, CheckCircle2, Clock, Filter, Download, CreditCard, CheckCheck, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/hooks/use-toast";

export default function AllPayments() {
  const { data: payments, isLoading: loadingPayments } = usePayments();
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const { data: clients, isLoading: loadingClients } = useClients();
  const updateClient = useUpdateClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("All");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Keep the table hidden until every source it relies on is ready so status
  // and invoice labels never flash stale values.
  const isLoading = loadingPayments || loadingClients || loadingInvoices;

  const clientStatusMap = new Map((clients ?? []).map((client) => [client.id, client.paymentStatus]));
  const latestInvoiceByClientId = new Map<string, NonNullable<(typeof invoices)>[number]>();
  for (const invoice of invoices ?? []) {
    const clientId = invoice.client?.id;
    if (clientId && !latestInvoiceByClientId.has(clientId)) {
      latestInvoiceByClientId.set(clientId, invoice);
    }
  }

  // The summary cards on this page should reflect invoice totals.
  const paidInvoices = (invoices ?? []).filter((invoice) => invoice.paymentStatus === "PAID");
  const pendingInvoices = (invoices ?? []).filter((invoice) => invoice.paymentStatus === "PENDING");
  const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);
  const paidCount = paidInvoices.length;
  const pendingRevenue = pendingInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);

  const filteredPayments = (payments ?? []).filter((payment) => {
    if (filter === "All") return true;
    const invoiceStatus = latestInvoiceByClientId.get(payment.clientId)?.paymentStatus;
    const liveStatus = invoiceStatus === "PAID"
      ? "Paid"
      : invoiceStatus === "PENDING"
        ? "Pending"
        : (clientStatusMap.get(payment.clientId) ?? payment.paymentStatus);
    return liveStatus === filter;
  });

  const togglePaymentStatus = async (
    clientId: string,
    currentStatus: "Paid" | "Pending",
    clientName: string,
  ) => {
    const newStatus = currentStatus === "Paid" ? "Pending" : "Paid";
    setTogglingId(clientId);
    try {
      await updateClient.mutateAsync({ id: clientId, paymentStatus: newStatus });
      toast({
        title: newStatus === "Paid" ? "Marked as Paid" : "Marked as Pending",
        description: `${clientName}'s payment status updated to ${newStatus}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Payments & Invoicing</h1>
        <p className="text-muted-foreground mt-1">Track studio revenue and pending client invoices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue"
          value={loadingInvoices ? "..." : `NGN ${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          colorScheme="violet"
        />
        <StatCard
          title="Paid Invoices"
          value={loadingInvoices ? "..." : paidCount}
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="Pending Collection"
          value={loadingInvoices ? "..." : `NGN ${pendingRevenue.toLocaleString()}`}
          icon={Clock}
          colorScheme="amber"
        />
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-white border border-border/60 rounded-md p-1 shadow-sm flex items-center">
              <Filter className="w-4 h-4 text-muted-foreground ml-2 mr-1" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[160px] h-8 bg-transparent border-0 shadow-none focus:ring-0 text-sm font-medium">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Invoices</SelectItem>
                  <SelectItem value="Paid">Paid Only</SelectItem>
                  <SelectItem value="Pending">Pending Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto bg-white shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        <CardContent className="p-0">
          <TooltipProvider>
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                <TableRow className="hover:bg-slate-50/50 border-b border-border/40">
                  <TableHead className="py-4 pl-6 font-semibold">Invoice ID</TableHead>
                  <TableHead className="font-semibold">Client Name</TableHead>
                  <TableHead className="font-semibold">Assigned Staff</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right pr-6 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <p>Loading payments data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                          <CreditCard className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">No payments found</h3>
                        <p className="max-w-sm mb-4">No invoices match your selected filter.</p>
                        <Button variant="outline" onClick={() => setFilter("All")} className="bg-white">
                          Show All
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment, index) => {
                    const latestInvoice = latestInvoiceByClientId.get(payment.clientId);
                    const liveStatus = latestInvoice?.paymentStatus === "PAID"
                      ? "Paid"
                      : latestInvoice?.paymentStatus === "PENDING"
                        ? "Pending"
                        : (clientStatusMap.get(payment.clientId) ?? payment.paymentStatus);
                    const isToggling = togglingId === payment.clientId;
                    const isPending = liveStatus === "Pending";

                    return (
                      <TableRow
                        key={payment.id}
                        className={`group transition-colors hover:bg-slate-50/80 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                      >
                        <TableCell className="pl-6 py-4">
                          <span className="font-mono text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 border border-slate-200">
                            {latestInvoice?.invoiceNumber ?? payment.invoiceId ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-base">{payment.clientName}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.staffName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm font-medium">
                          {new Date(payment.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell className="font-bold text-foreground text-base">NGN {payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={liveStatus} />
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isToggling || !payment.clientId}
                                onClick={() => togglePaymentStatus(payment.clientId, liveStatus, payment.clientName)}
                                className={`h-8 w-8 rounded-lg transition-colors ${
                                  isPending
                                    ? "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                    : "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                }`}
                              >
                                {isToggling ? (
                                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                                ) : isPending ? (
                                  <CheckCheck className="w-4 h-4" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isPending ? "Mark as Paid" : "Mark as Pending"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
