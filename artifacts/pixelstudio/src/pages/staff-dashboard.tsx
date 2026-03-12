import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Users, Camera, UploadCloud, ArrowRight, UserPlus, FileText } from "lucide-react";
import { useClients } from "@/hooks/use-data";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StaffDashboard() {
  const { data: clients, isLoading } = useClients();
  
  // Filter for staff specific data if we had auth context. For demo, we use all.
  const myClients = clients || [];
  
  const pendingDeliveries = myClients.filter(c => c.photoStatus === 'Hardcopy').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Staff Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here are your active projects.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="bg-white">
            <Link href="/staff/clients">View Records</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/staff/clients/new"><UserPlus className="w-4 h-4" /> New Client</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="My Clients" 
          value={isLoading ? "..." : myClients.length} 
          icon={Users} 
        />
        <StatCard 
          title="Delivered Shoots" 
          value={isLoading ? "..." : myClients.filter(c => c.photoStatus === 'Softcopy').length} 
          icon={UploadCloud} 
        />
        <StatCard 
          title="Pending Physicals" 
          value={isLoading ? "..." : pendingDeliveries} 
          icon={Camera} 
          trend={pendingDeliveries > 0 ? { value: pendingDeliveries, label: "needs attention" } : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-display">Recent Client Shoots</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff/clients" className="text-primary gap-1">
                All Clients <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded-md animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {myClients.slice(0, 5).map(client => (
                  <div key={client.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {client.clientName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{client.clientName}</h4>
                        <p className="text-xs text-muted-foreground">{new Date(client.date).toLocaleDateString()} • {client.photos.length} photos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={client.photoStatus === 'Softcopy' ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-purple-600 bg-purple-50 border-purple-200'}>
                        {client.photoStatus}
                      </Badge>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href={`/staff/clients/${client.id}/invoice`}>
                          <FileText className="w-4 h-4 text-slate-400 hover:text-primary" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60 bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Camera className="w-32 h-32" />
          </div>
          <CardContent className="p-8 relative z-10 flex flex-col h-full justify-between">
            <div>
              <h3 className="text-2xl font-display font-bold mb-2">Quick Upload</h3>
              <p className="text-primary-foreground/80 text-sm leading-relaxed mb-8">
                Finished a shoot? Upload photos and automatically generate client galleries and invoices in one step.
              </p>
            </div>
            <Button asChild size="lg" className="w-full bg-white text-primary hover:bg-slate-50 hover-elevate">
              <Link href="/staff/clients/new">Create New Record</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
