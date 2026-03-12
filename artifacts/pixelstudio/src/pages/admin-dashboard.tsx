import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Users, CreditCard, Image as ImageIcon, Briefcase, ChevronRight } from "lucide-react";
import { useStaff, useClients, usePayments } from "@/hooks/use-data";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { data: staff, isLoading: loadingStaff } = useStaff();
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: payments, isLoading: loadingPayments } = usePayments();

  const totalRevenue = payments?.filter(p => p.paymentStatus === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening at your studio today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Staff" 
          value={loadingStaff ? "..." : staff?.length || 0} 
          icon={Briefcase} 
          trend={{ value: 12, label: "from last month" }}
        />
        <StatCard 
          title="Active Clients" 
          value={loadingClients ? "..." : clients?.length || 0} 
          icon={Users} 
          trend={{ value: 24, label: "from last month" }}
        />
        <StatCard 
          title="Total Revenue" 
          value={loadingPayments ? "..." : `$${totalRevenue.toLocaleString()}`} 
          icon={CreditCard} 
          trend={{ value: 8, label: "from last month" }}
        />
        <StatCard 
          title="Photo Deliveries" 
          value={loadingClients ? "..." : clients?.filter(c => c.photoStatus === 'Softcopy').length || 0} 
          icon={ImageIcon} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl font-display">Recent Payments</CardTitle>
              <p className="text-sm text-muted-foreground">Latest transactions from clients.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href="/admin/payments" className="text-primary gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-slate-100 rounded-md animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="font-medium text-left pb-3">Client</th>
                      <th className="font-medium text-left pb-3">Amount</th>
                      <th className="font-medium text-left pb-3">Status</th>
                      <th className="font-medium text-right pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {payments?.slice(0, 5).map(payment => (
                      <tr key={payment.id} className="group transition-colors hover:bg-slate-50/50">
                        <td className="py-4 font-medium text-foreground">{payment.clientName}</td>
                        <td className="py-4 text-foreground">${payment.amount.toLocaleString()}</td>
                        <td className="py-4">
                          <Badge variant={payment.paymentStatus === 'Paid' ? 'default' : 'secondary'} className={payment.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                            {payment.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-4 text-right text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-display">Staff Directory</CardTitle>
            <p className="text-sm text-muted-foreground">Active team members.</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {loadingStaff ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
                      <div className="h-3 bg-slate-100 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 flex-1">
                {staff?.slice(0, 4).map(member => (
                  <div key={member.id} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className={member.status === 'Active' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-slate-500'}>
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-6" asChild>
              <Link href="/admin/staff">Manage All Staff</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
