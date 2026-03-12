import { useState } from "react";
import { useLocation } from "wouter";
import { useClients } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Link as LinkIcon, FileText, Image as ImageIcon, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function ClientRecords() {
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const filteredClients = clients?.filter(c => 
    c.clientName.toLowerCase().includes(search.toLowerCase()) || 
    c.invoiceId.toLowerCase().includes(search.toLowerCase())
  );

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(window.location.origin + link);
    toast({ title: "Copied!", description: "Gallery link copied to clipboard" });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold tracking-tight">Client Records</h1>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold border border-primary/20">
              {clients?.length || 0} Total
            </span>
          </div>
          <p className="text-muted-foreground mt-1">Manage client details, galleries, and invoices.</p>
        </div>
        <Button onClick={() => setLocation("/staff/clients/new")} size="lg" className="shadow-md hover-elevate">
          New Client
        </Button>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-slate-50/50 flex items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by client name or invoice ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-border/60"
            />
          </div>
        </div>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
              <TableRow className="hover:bg-slate-50/50 border-b border-border/40">
                <TableHead className="py-4 pl-6 font-semibold">Client</TableHead>
                <TableHead className="font-semibold">Deliverable</TableHead>
                <TableHead className="font-semibold">Payment</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="text-right pr-6 font-semibold">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      <p>Loading records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">No clients found</h3>
                      <p className="max-w-sm mb-4">We couldn't find any clients matching your current search criteria.</p>
                      <Button variant="outline" onClick={() => setSearch("")} className="bg-white">Clear Search</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients?.map((client, index) => (
                  <TableRow key={client.id} className={`group hover:bg-slate-50/80 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}>
                    <TableCell className="pl-6 py-4">
                      <div className="font-semibold text-foreground text-base">{client.clientName}</div>
                      <div className="text-sm text-muted-foreground mt-0.5"><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{client.invoiceId}</span> • {client.photos.length} photos</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={client.photoStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={client.paymentStatus} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {new Date(client.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <TooltipProvider>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-full border border-transparent hover:border-primary/20"
                                onClick={() => window.open(client.galleryLink, '_blank')}
                              >
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Gallery</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-full border border-transparent hover:border-emerald-200/50"
                                onClick={() => copyLink(client.galleryLink)}
                              >
                                <LinkIcon className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy Link</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-slate-500 hover:text-violet-600 hover:bg-violet-100 rounded-full border border-transparent hover:border-violet-200/50"
                                onClick={() => setLocation(`/staff/clients/${client.id}/invoice`)}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Invoice</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
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
