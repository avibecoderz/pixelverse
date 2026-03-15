import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateClient } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Check, FileText, UploadCloud, Copy, WifiOff, Printer } from "lucide-react";
import { putSyncEntry } from "@/lib/offline-db";
import { useSyncContext } from "@/hooks/use-sync-context";
import type { AppClient } from "@/hooks/use-data";

// UI → Backend enum conversion (mirrors PHOTO_FORMAT_API in use-data.ts)
const PHOTO_FORMAT_API: Record<string, string> = {
  Softcopy: "SOFTCOPY",
  Hardcopy: "HARDCOPY",
  Both:     "BOTH",
};

const clientSchema = z.object({
  clientName:    z.string().min(2, "Name is required"),
  phone:         z.string().min(5, "Phone is required"),
  price:         z.coerce.number().min(1, "Price must be greater than 0"),
  photoFormat:   z.enum(["Softcopy", "Hardcopy", "Both"]),
  paymentStatus: z.enum(["Paid", "Pending"]),
  orderStatus:   z.enum(["Pending", "Editing", "Ready", "Delivered"]),
  notes:         z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function NewClient() {
  const [, setLocation]      = useLocation();
  const createClient         = useCreateClient();
  const { toast }            = useToast();
  const { isOnline, refreshPendingCount } = useSyncContext();

  const [successData, setSuccessData]   = useState<AppClient | null>(null);
  const [isOfflineSave, setIsOfflineSave] = useState(false);
  const [copied, setCopied]             = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      clientName:    "",
      phone:         "",
      price:         0,
      photoFormat:   "Softcopy",
      paymentStatus: "Pending",
      orderStatus:   "Pending",
      notes:         "",
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    // ── Offline path ──────────────────────────────────────────────────────────
    if (!isOnline) {
      const localId   = `local_${Date.now()}`;
      const createdAt = new Date().toISOString();

      // Build the API-ready payload stored in the sync queue
      const payload = {
        clientName:  values.clientName,
        phone:       values.phone,
        price:       values.price,
        photoFormat: PHOTO_FORMAT_API[values.photoFormat] ?? "SOFTCOPY",
        notes:       values.notes || "",
      };

      // Build the UI AppClient snapshot shown in the success screen
      const localClient: AppClient = {
        id:            localId,
        clientName:    values.clientName,
        phone:         values.phone,
        price:         values.price,
        photoFormat:   values.photoFormat,
        paymentStatus: values.paymentStatus,
        orderStatus:   values.orderStatus,
        notes:         values.notes || "",
        photos:        [],
        photoCount:    0,
        invoiceId:     "",        // unknown until synced
        galleryLink:   "",        // unknown until synced
        date:          createdAt,
        staffId:       "",
        staffName:     localStorage.getItem("user_name") || "Staff Member",
      };

      await putSyncEntry({
        id:        localId,
        type:      "createClient",
        payload,
        localData: localClient as unknown as Record<string, unknown>,
        status:    "pending",
        createdAt: Date.now(),
      });

      await refreshPendingCount();
      setIsOfflineSave(true);
      setSuccessData(localClient);
      toast({
        title:       "Saved offline",
        description: "This client will sync automatically when you're back online.",
      });
      return;
    }

    // ── Online path ───────────────────────────────────────────────────────────
    try {
      const result = await createClient.mutateAsync({
        ...values,
        notes: values.notes || "",
      });
      setIsOfflineSave(false);
      setSuccessData(result);
      toast({ title: "Client record created!", description: "You can now upload photos for this client." });
    } catch (err: unknown) {
      // If the network is actually unreachable (navigator.onLine can be wrong —
      // e.g. the device is on Wi-Fi but the internet is down), fall back to the
      // same offline-save path so the record is never lost.
      const isNetworkError =
        !navigator.onLine ||
        (err instanceof TypeError && /fetch|network|failed/i.test(err.message)) ||
        (err instanceof Error && /network|offline|ECONNREFUSED|ERR_NETWORK/i.test(err.message));

      if (isNetworkError) {
        const localId   = `local_${Date.now()}`;
        const createdAt = new Date().toISOString();

        const payload = {
          clientName:  values.clientName,
          phone:       values.phone,
          price:       values.price,
          photoFormat: PHOTO_FORMAT_API[values.photoFormat] ?? "SOFTCOPY",
          notes:       values.notes || "",
        };

        const localClient: AppClient = {
          id:            localId,
          clientName:    values.clientName,
          phone:         values.phone,
          price:         values.price,
          photoFormat:   values.photoFormat,
          paymentStatus: values.paymentStatus,
          orderStatus:   values.orderStatus,
          notes:         values.notes || "",
          photos:        [],
          photoCount:    0,
          invoiceId:     "",
          galleryLink:   "",
          date:          createdAt,
          staffId:       "",
          staffName:     localStorage.getItem("user_name") || "Staff Member",
        };

        await putSyncEntry({
          id:        localId,
          type:      "createClient",
          payload,
          localData: localClient as unknown as Record<string, unknown>,
          status:    "pending",
          createdAt: Date.now(),
        });

        await refreshPendingCount();
        setIsOfflineSave(true);
        setSuccessData(localClient);
        toast({
          title:       "Saved offline",
          description: "Connection unavailable. Record queued — will sync automatically.",
        });
      } else {
        toast({ title: "Error", description: "Failed to create client. Please try again.", variant: "destructive" });
      }
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(window.location.origin + link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Gallery link copied to clipboard." });
  };

  // For offline clients, persist the local data so the invoice page can render
  // it without an API call.  The invoice page detects "local_" IDs and reads
  // from sessionStorage instead.
  const openOfflineInvoice = (client: AppClient) => {
    sessionStorage.setItem(`offline-invoice-${client.id}`, JSON.stringify(client));
    setLocation(`/staff/clients/${client.id}/invoice`);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className={`p-10 text-white flex flex-col items-center ${
            isOfflineSave
              ? "bg-gradient-to-br from-amber-400 to-amber-600"
              : "bg-gradient-to-br from-emerald-400 to-emerald-600"
          }`}>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5 border border-white/20">
              {isOfflineSave
                ? <WifiOff className="w-10 h-10" />
                : <Check className="w-10 h-10" />}
            </div>
            <h2 className="text-3xl font-display font-bold">
              {isOfflineSave ? "Saved Offline" : "Client Created!"}
            </h2>
            <p className={isOfflineSave ? "text-amber-50 mt-2 text-center" : "text-emerald-50 mt-2"}>
              {isOfflineSave
                ? "Record saved locally. It will sync to the server automatically when you reconnect."
                : "Record saved. Upload photos to activate the gallery."}
            </p>
          </div>

          <CardContent className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Client</p>
                <p className="font-bold text-xl text-slate-900">{successData.clientName}</p>
                <p className="text-sm text-slate-500 mt-0.5">{successData.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Invoice ID</p>
                {isOfflineSave
                  ? <p className="text-sm text-amber-600 font-medium mt-1">⏳ Assigned after sync</p>
                  : <>
                      <p className="font-mono font-bold text-xl text-slate-900">{successData.invoiceId}</p>
                      <p className="text-sm text-slate-500 mt-0.5">₦{successData.price.toLocaleString()}</p>
                    </>
                }
              </div>
            </div>

            {isOfflineSave ? (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                <WifiOff className="w-5 h-5 shrink-0" />
                <p>
                  You are currently offline. This record is queued and will be uploaded
                  automatically when your connection is restored. Photo upload and
                  invoice generation will be available after sync.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Gallery Link (available after upload)</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={window.location.origin + successData.galleryLink}
                    className="bg-slate-50 font-mono text-sm border-slate-200"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => copyLink(successData.galleryLink)}
                    className="shrink-0 gap-2 w-28"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-slate-50 border-t p-5 flex gap-3 flex-wrap">
            <Button variant="outline" className="flex-1 bg-white" onClick={() => setLocation("/staff/clients")}>
              View All Clients
            </Button>
            {isOfflineSave ? (
              // Offline clients: show invoice print button using locally-stored data
              <Button
                className="flex-1 gap-2 shadow-md bg-amber-600 hover:bg-amber-700"
                onClick={() => openOfflineInvoice(successData)}
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </Button>
            ) : (
              <>
                <Button
                  className="flex-1 gap-2 shadow-md"
                  onClick={() => setLocation(`/staff/clients/${successData.id}/upload`)}
                >
                  <UploadCloud className="w-4 h-4" /> Upload Photos Now
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2"
                  onClick={() => setLocation(`/staff/clients/${successData.id}/invoice`)}
                >
                  <FileText className="w-4 h-4" /> Invoice
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">New Client Record</h1>
        <p className="text-muted-foreground mt-1">
          Create a client record first. Upload photos separately after the shoot is edited.
        </p>
        {!isOnline && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <WifiOff className="w-4 h-4 shrink-0" />
            You are offline. Records you create will be saved locally and synced when you reconnect.
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-border/40">
              <CardTitle className="font-display">Client Information</CardTitle>
              <CardDescription>Basic contact and billing details.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" className="h-11" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="(555) 000-0000" className="h-11" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Agreed Price (₦)</FormLabel>
                  <FormControl><Input type="number" placeholder="1500" className="h-11" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="photoFormat" render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Softcopy">Softcopy (Digital)</SelectItem>
                      <SelectItem value="Hardcopy">Hardcopy (Print)</SelectItem>
                      <SelectItem value="Both">Both (Digital + Print)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid in Full</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="orderStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Editing">Editing</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="md:col-span-2">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Special requests, shoot location, outfits..."
                        className="resize-none min-h-[90px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" className="h-11 px-6" onClick={() => setLocation("/staff/clients")}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={createClient.isPending}
              className="h-11 px-8 font-bold shadow-md"
            >
              {createClient.isPending
                ? "Saving..."
                : isOnline
                  ? "Save Client Record"
                  : "Save Offline"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
