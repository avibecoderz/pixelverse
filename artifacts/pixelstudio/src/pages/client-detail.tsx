import { useRoute, useLocation } from "wouter";
import { useClient, useUpdateClient } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UploadCloud, FileText, Copy, Check, Camera, Image as ImageIcon, Phone, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ClientDetail() {
  const [, params] = useRoute("/staff/clients/:id");
  const [, setLocation] = useLocation();
  const { data: client, isLoading } = useClient(params?.id || "");
  const updateClient = useUpdateClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + client!.galleryLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Gallery link copied to clipboard." });
  };

  const handleOrderStatusChange = async (value: string) => {
    await updateClient.mutateAsync({ id: client!.id, orderStatus: value as any });
    toast({ title: "Updated", description: `Order status set to ${value}` });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-24">
        <Camera className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold">Client not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/staff/clients")}>Back to Records</Button>
      </div>
    );
  }

  const hasPhotos = client.photos.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/staff/clients")} className="rounded-full border border-border/50">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">{client.clientName}</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-mono">{client.invoiceId}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2 bg-white shadow-sm" onClick={() => setLocation(`/staff/clients/${client.id}/invoice`)}>
            <FileText className="w-4 h-4" /> Invoice
          </Button>
          <Button className="gap-2 shadow-md" onClick={() => setLocation(`/staff/clients/${client.id}/upload`)}>
            <UploadCloud className="w-4 h-4" /> Upload Photos
          </Button>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Phone", value: client.phone, icon: Phone },
          { label: "Price", value: `$${client.price.toLocaleString()}`, icon: DollarSign },
          { label: "Date Created", value: new Date(client.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
          { label: "Photos Uploaded", value: `${client.photos.length} photos`, icon: ImageIcon },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/40 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
              </div>
              <p className="font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status & Details */}
        <Card className="border-border/40 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3 border-b border-border/40 bg-slate-50/50">
            <CardTitle className="text-base font-semibold">Status & Details</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Status</p>
              <StatusBadge status={client.paymentStatus} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Photo Format</p>
              <StatusBadge status={client.photoFormat} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Order Status</p>
              <Select defaultValue={client.orderStatus} onValueChange={handleOrderStatusChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Editing">Editing</SelectItem>
                  <SelectItem value="Ready">Ready</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Staff</p>
              <p className="text-sm font-medium text-foreground">{client.staffName}</p>
            </div>
            {client.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-foreground leading-relaxed">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gallery & Photos */}
        <Card className="border-border/40 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/40 bg-slate-50/50 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Photo Gallery</CardTitle>
            {hasPhotos && (
              <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-5">
            {!hasPhotos ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">No photos uploaded yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload edited photos to generate the client gallery link.</p>
                <Button onClick={() => setLocation(`/staff/clients/${client.id}/upload`)} className="gap-2 shadow-sm">
                  <UploadCloud className="w-4 h-4" /> Upload Photos Now
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{client.photos.length} photos uploaded</span>
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/staff/clients/${client.id}/upload`)} className="gap-1.5 h-8 text-xs">
                    <UploadCloud className="w-3.5 h-3.5" /> Add More
                  </Button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {client.photos.slice(0, 8).map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border/40 shadow-sm">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                  {client.photos.length > 8 && (
                    <div className="aspect-square rounded-xl bg-slate-100 border border-border/40 flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-500">+{client.photos.length - 8}</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-border/40 text-sm">
                  <span className="text-muted-foreground truncate flex-1 font-mono text-xs">{window.location.origin + client.galleryLink}</span>
                  <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 h-8 gap-1.5 text-xs bg-white">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button size="sm" onClick={() => window.open(client.galleryLink, '_blank')} className="shrink-0 h-8 text-xs">
                    View Gallery
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
