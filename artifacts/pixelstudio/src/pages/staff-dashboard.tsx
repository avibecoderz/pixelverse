import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Users, Camera, UploadCloud, ArrowRight, UserPlus, FileText } from "lucide-react";
import { useClients } from "@/hooks/use-data";
import { Link } from "wouter";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export default function StaffDashboard() {
  const { data: clients, isLoading } = useClients();
  
  const myClients = clients || [];
  const pendingDeliveries = myClients.filter(c => c.photoStatus === 'Hardcopy').length;
  const userName = localStorage.getItem("user_name") || "Staff Member";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Welcome back, {userName}</h1>
          <p className="text-muted-foreground mt-1">Here are your active projects and recent client shoots.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="bg-white hover:bg-slate-50 shadow-sm border-border/60">
            <Link href="/staff/clients">View Records</Link>
          </Button>
          <Button asChild className="gap-2 shadow-md hover-elevate">
            <Link href="/staff/clients/new"><UserPlus className="w-4 h-4" /> New Client</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="My Clients" 
          value={isLoading ? "..." : myClients.length} 
          icon={Users} 
          colorScheme="blue"
        />
        <StatCard 
          title="Delivered Shoots" 
          value={isLoading ? "..." : myClients.filter(c => c.photoStatus === 'Softcopy').length} 
          icon={UploadCloud} 
          colorScheme="emerald"
        />
        <StatCard 
          title="Pending Physicals" 
          value={isLoading ? "..." : pendingDeliveries} 
          icon={Camera} 
          colorScheme="amber"
          trend={pendingDeliveries > 0 ? { value: pendingDeliveries, label: "needs attention" } : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 shadow-sm border-border/40 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 border-b border-border/40">
            <div>
              <CardTitle className="text-xl font-display font-bold">Recent Client Shoots</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild className="hover:bg-white hover:shadow-sm">
              <Link href="/staff/clients" className="text-primary font-semibold gap-1">
                All Clients <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {myClients.slice(0, 5).map((client, index) => (
                  <div key={client.id} className={`flex items-center justify-between p-5 transition-colors hover:bg-slate-50/80 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold shadow-sm border border-blue-200/50">
                        {client.clientName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-base">{client.clientName}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{new Date(client.date).toLocaleDateString()} • {client.photos.length} photos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={client.photoStatus} />
                      <Button variant="outline" size="icon" asChild className="h-9 w-9 text-slate-500 hover:text-primary hover:border-primary/30 rounded-full shadow-sm">
                        <Link href={`/staff/clients/${client.id}/invoice`}>
                          <FileText className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-violet-600 to-indigo-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
            <Camera className="w-40 h-40" />
          </div>
          <CardContent className="p-8 relative z-10 flex flex-col h-full justify-center">
            <div className="mb-8">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-6 shadow-lg border border-white/10">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-3">Quick Upload</h3>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Finished a shoot? Upload photos and automatically generate client galleries and invoices in one seamless step.
              </p>
            </div>
            <Button asChild size="lg" className="w-full bg-white text-indigo-700 hover:bg-slate-50 shadow-xl hover:-translate-y-0.5 transition-all">
              <Link href="/staff/clients/new" className="font-bold">Create New Record</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
