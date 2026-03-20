import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Users, Image as ImageIcon, Briefcase, ChevronRight, Clock, type LucideIcon } from "lucide-react";
import { useAdminDashboard, useClients, useStaff } from "@/hooks/use-data";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const NairaIcon = (({ className, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M7 5v14" />
    <path d="M17 5v14" />
    <path d="M7 7l10 10" />
    <path d="M7 17V7h10" />
    <path d="M5 10h14" />
    <path d="M5 14h14" />
  </svg>
)) as LucideIcon;

export default function AdminDashboard() {
  const { data: dashboard, isLoading: loadingDashboard } = useAdminDashboard();
  const { data: staff, isLoading: loadingStaff } = useStaff();
  const { data: clients, isLoading: loadingClients } = useClients();
  const [, setLocation] = useLocation();
  const userName = localStorage.getItem("user_name") || "Admin";

  const stats = dashboard?.stats;
  const recentPayments = dashboard?.recentPayments ?? [];
  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingPayments = stats?.pendingPaymentsCount ?? 0;
  const uploadedGalleries = stats?.totalGalleries ?? 0;
  const totalStaff = stats?.totalStaff ?? staff?.filter((member) => member.status === "Active").length ?? 0;
  const totalClients = stats?.totalClients ?? clients?.length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-7 shadow-lg border border-slate-700/50">
        <div className="absolute right-0 top-0 p-6 opacity-5">
          <Briefcase className="w-56 h-56" />
        </div>
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-medium mb-1">Admin Portal</p>
          <h1 className="text-3xl font-display font-bold">Good morning, {userName}</h1>
          <p className="text-slate-300 mt-2">
            Studio is running with <span className="text-white font-bold">{totalStaff} active staff</span> and{" "}
            <span className="text-white font-bold">{pendingPayments} pending payments</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Staff"
          value={loadingDashboard && loadingStaff ? "..." : totalStaff}
          icon={Briefcase}
          colorScheme="violet"
        />
        <StatCard
          title="Total Clients"
          value={loadingDashboard && loadingClients ? "..." : totalClients}
          icon={Users}
          colorScheme="blue"
        />
        <StatCard
          title="Total Revenue"
          value={loadingDashboard ? "..." : `NGN ${totalRevenue.toLocaleString()}`}
          icon={NairaIcon}
          colorScheme="emerald"
          trend={{ value: 8, label: "this month" }}
        />
        <StatCard
          title="Pending Payments"
          value={loadingDashboard ? "..." : pendingPayments}
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="Galleries Live"
          value={loadingDashboard ? "..." : uploadedGalleries}
          icon={ImageIcon}
          colorScheme="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 shadow-sm border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 border-b border-border/40">
            <div>
              <CardTitle className="text-xl font-display">Recent Payments</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Latest customer transactions.</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/payments" className="text-primary font-semibold gap-1 flex items-center">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingDashboard ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground bg-slate-50/30">
                    <th className="font-semibold text-left py-3 pl-6">Customer</th>
                    <th className="font-semibold text-left py-3">Staff</th>
                    <th className="font-semibold text-left py-3">Amount</th>
                    <th className="font-semibold text-left py-3">Status</th>
                    <th className="font-semibold text-right py-3 pr-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {recentPayments.slice(0, 6).map((payment, index) => (
                    <tr
                      key={payment.id}
                      className={`hover:bg-slate-50/60 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                    >
                      <td className="py-3.5 pl-6 font-semibold text-foreground">{payment.client.clientName}</td>
                      <td className="py-3.5 text-muted-foreground text-sm">{payment.receivedBy.name}</td>
                      <td className="py-3.5 font-bold text-foreground">NGN {parseFloat(payment.amount).toLocaleString()}</td>
                      <td className="py-3.5">
                        <StatusBadge status={payment.status === "PAID" ? "Paid" : "Pending"} />
                      </td>
                      <td className="py-3.5 text-right pr-6 text-muted-foreground text-sm">
                        {new Date(payment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/40">
          <CardHeader className="pb-4 bg-slate-50/50 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-display">Team</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/staff" className="text-primary text-sm font-semibold">Manage</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Active studio members.</p>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {loadingStaff ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              staff?.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                      member.status === "Active"
                        ? "bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 border border-violet-200/50"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <StatusBadge status={member.status} />
                </div>
              ))
            )}
            <Button variant="outline" className="w-full mt-2 bg-white" asChild>
              <Link href="/admin/staff">View All Staff</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-4 bg-slate-50/50 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-display">Recent Customer Activity</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Latest customer records and order statuses.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/staff/clients" className="text-primary font-semibold gap-1 flex items-center">
              All Records <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingClients ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground bg-slate-50/30">
                  <th className="font-semibold text-left py-3 pl-6">Customer</th>
                  <th className="font-semibold text-left py-3">Staff</th>
                  <th className="font-semibold text-left py-3">Format</th>
                  <th className="font-semibold text-left py-3">Order</th>
                  <th className="font-semibold text-left py-3">Payment</th>
                  <th className="font-semibold text-right py-3 pr-6">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {clients?.slice(0, 5).map((client, index) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                    onClick={() => setLocation(`/staff/clients/${client.id}`)}
                  >
                    <td className="py-3.5 pl-6 font-semibold text-foreground">{client.clientName}</td>
                    <td className="py-3.5 text-muted-foreground text-sm">{client.staffName}</td>
                    <td className="py-3.5"><StatusBadge status={client.photoFormat} /></td>
                    <td className="py-3.5"><StatusBadge status={client.orderStatus} /></td>
                    <td className="py-3.5"><StatusBadge status={client.paymentStatus} /></td>
                    <td className="py-3.5 text-right pr-6 font-bold text-foreground">NGN {client.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
