import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Users, CreditCard, Image as ImageIcon, Briefcase, ChevronRight, Camera } from "lucide-react";
import { useStaff, useClients, usePayments } from "@/hooks/use-data";
import { Link } from "wouter";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { data: staff, isLoading: loadingStaff } = useStaff();
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: payments, isLoading: loadingPayments } = usePayments();

  const totalRevenue = payments?.filter(p => p.paymentStatus === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0) || 0;

  const userName = localStorage.getItem("user_name") || "Admin Sarah";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-800 p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
          <Camera className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-bold tracking-tight">Good morning, {userName} 👋</h1>
          <p className="text-indigo-100 mt-2 max-w-xl">Here's what's happening at your studio today. Keep up the great work and have a productive day!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Staff" 
          value={loadingStaff ? "..." : staff?.length || 0} 
          icon={Briefcase} 
          colorScheme="blue"
          trend={{ value: 12, label: "from last month" }}
        />
        <StatCard 
          title="Active Clients" 
          value={loadingClients ? "..." : clients?.length || 0} 
          icon={Users} 
          colorScheme="emerald"
          trend={{ value: 24, label: "from last month" }}
        />
        <StatCard 
          title="Total Revenue" 
          value={loadingPayments ? "..." : `$${totalRevenue.toLocaleString()}`} 
          icon={CreditCard} 
          colorScheme="violet"
          trend={{ value: 8, label: "from last month" }}
        />
        <StatCard 
          title="Photo Deliveries" 
          value={loadingClients ? "..." : clients?.filter(c => c.photoStatus === 'Softcopy').length || 0} 
          icon={ImageIcon} 
          colorScheme="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 shadow-sm border-border/40 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b border-border/40">
            <div className="space-y-1">
              <CardTitle className="text-xl font-display font-bold">Recent Payments</CardTitle>
              <p className="text-sm text-muted-foreground">Latest transactions from clients.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex hover:bg-white hover:shadow-sm">
              <Link href="/admin/payments" className="text-primary font-semibold gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingPayments ? (
              <div className="space-y-4 py-4 px-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-slate-100 rounded-md animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-border/50">
                    <tr className="text-muted-foreground">
                      <th className="font-medium py-3 px-6">Client</th>
                      <th className="font-medium py-3 px-6">Amount</th>
                      <th className="font-medium py-3 px-6">Status</th>
                      <th className="font-medium py-3 px-6 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {payments?.slice(0, 5).map((payment, index) => (
                      <tr key={payment.id} className={`group transition-colors hover:bg-slate-50/80 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}`}>
                        <td className="py-4 px-6 font-medium text-foreground">{payment.clientName}</td>
                        <td className="py-4 px-6 text-foreground font-medium">${payment.amount.toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <StatusBadge status={payment.paymentStatus} />
                        </td>
                        <td className="py-4 px-6 text-right text-muted-foreground">
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

        <Card className="shadow-sm border-border/40 flex flex-col overflow-hidden">
          <CardHeader className="pb-4 bg-slate-50/50 border-b border-border/40">
            <CardTitle className="text-xl font-display font-bold">Staff Directory</CardTitle>
            <p className="text-sm text-muted-foreground">Active team members.</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-6">
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
                {staff?.slice(0, 4).map((member, index) => {
                  const ringColors = [
                    "ring-violet-200 text-violet-700 bg-violet-50",
                    "ring-emerald-200 text-emerald-700 bg-emerald-50",
                    "ring-blue-200 text-blue-700 bg-blue-50",
                    "ring-rose-200 text-rose-700 bg-rose-50"
                  ];
                  const colorClass = ringColors[index % ringColors.length];
                  
                  return (
                    <div key={member.id} className="flex items-center gap-4 group">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ring-4 ring-offset-2 transition-transform duration-300 group-hover:scale-105 ${colorClass}`}>
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <div>
                        <StatusBadge status={member.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full mt-6 bg-slate-50 hover:bg-slate-100" asChild>
              <Link href="/admin/staff">Manage All Staff</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
