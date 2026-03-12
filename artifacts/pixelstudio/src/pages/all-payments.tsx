import { useState } from "react";
import { usePayments } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle2, Clock, Filter, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";

export default function AllPayments() {
  const { data: payments, isLoading } = usePayments();
  const [filter, setFilter] = useState("All");

  const totalRevenue = payments?.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0) || 0;
  const pendingRevenue = payments?.filter(p => p.paymentStatus === 'Pending').reduce((sum, p) => sum + p.amount, 0) || 0;
  
  const filteredPayments = payments?.filter(p => filter === "All" || p.paymentStatus === filter);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Payments & Invoicing</h1>
        <p className="text-muted-foreground mt-1">Track studio revenue and pending client invoices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`$${totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
        />
        <StatCard 
          title="Paid Invoices" 
          value={payments?.filter(p => p.paymentStatus === 'Paid').length || 0} 
          icon={CheckCircle2} 
        />
        <StatCard 
          title="Pending Collection" 
          value={`$${pendingRevenue.toLocaleString()}`} 
          icon={Clock} 
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <div className="p-4 border-b border-border/50 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Status:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px] h-8 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Invoices</SelectItem>
                <SelectItem value="Paid">Paid Only</SelectItem>
                <SelectItem value="Pending">Pending Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="py-4 pl-6">Invoice ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Loading payments data...
                  </TableCell>
                </TableRow>
              ) : filteredPayments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments?.map(payment => (
                  <TableRow key={payment.id} className="group">
                    <TableCell className="font-medium font-mono text-xs pl-6">{payment.invoiceId}</TableCell>
                    <TableCell className="font-medium text-foreground">{payment.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{payment.staffName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">${payment.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge variant="outline" className={payment.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                        {payment.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
