import { useState } from "react";
import { useLocation } from "wouter";
import { useClients } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Link as LinkIcon, FileText, Image as ImageIcon, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

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
          <h1 className="text-3xl font-display font-bold tracking-tight">Client Records</h1>
          <p className="text-muted-foreground mt-1">Manage client details, galleries, and invoices.</p>
        </div>
        <Button onClick={() => setLocation("/staff/clients/new")} size="lg">
          New Client
        </Button>
      </div>

      <Card className="border-border/60 shadow-sm">
        <div className="p-4 border-b border-border/50 bg-slate-50/50 flex items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by client name or invoice ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="py-4 pl-6">Client</TableHead>
                <TableHead>Deliverable</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right pr-6">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : filteredClients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No client records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients?.map(client => (
                  <TableRow key={client.id} className="group">
                    <TableCell className="pl-6">
                      <div className="font-medium text-foreground">{client.clientName}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">{client.invoiceId} • {client.photos.length} photos</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={client.photoStatus === 'Softcopy' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-purple-600 border-purple-200 bg-purple-50'}>
                        {client.photoStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={client.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                        {client.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(client.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-1 text-slate-600 hover:text-primary"
                          onClick={() => window.open(client.galleryLink, '_blank')}
                        >
                          <ImageIcon className="w-4 h-4" /> <span className="hidden xl:inline">Gallery</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-1 text-slate-600"
                          onClick={() => copyLink(client.galleryLink)}
                        >
                          <LinkIcon className="w-4 h-4" /> <span className="hidden xl:inline">Copy Link</span>
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 gap-1"
                          onClick={() => setLocation(`/staff/clients/${client.id}/invoice`)}
                        >
                          <FileText className="w-4 h-4" /> <span className="hidden xl:inline">Invoice</span>
                        </Button>
                      </div>
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
