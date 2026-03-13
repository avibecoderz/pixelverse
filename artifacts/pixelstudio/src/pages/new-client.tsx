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
import { Check, FileText, UploadCloud, Copy } from "lucide-react";

const clientSchema = z.object({
  clientName: z.string().min(2, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  photoFormat: z.enum(["Softcopy", "Hardcopy", "Both"]),
  paymentStatus: z.enum(["Paid", "Pending"]),
  orderStatus: z.enum(["Pending", "Editing", "Ready", "Delivered"]),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function NewClient() {
  const [_, setLocation] = useLocation();
  const createClient = useCreateClient();
  const { toast } = useToast();
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      clientName: "",
      phone: "",
      price: 0,
      photoFormat: "Softcopy",
      paymentStatus: "Pending",
      orderStatus: "Pending",
      notes: "",
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    try {
      const result = await createClient.mutateAsync({
        ...values,
        notes: values.notes || "",
        photos: [],
        staffId: 's1',
        staffName: localStorage.getItem('user_name') || 'Staff Member',
      });
      setSuccessData(result);
      toast({ title: "Client record created!", description: "You can now upload photos for this client." });
    } catch {
      toast({ title: "Error", description: "Failed to create client", variant: "destructive" });
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(window.location.origin + link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Gallery link copied to clipboard." });
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-10 text-white flex flex-col items-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5 border border-white/20">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-display font-bold">Client Created!</h2>
            <p className="text-emerald-50 mt-2">Record saved. Upload photos to activate the gallery.</p>
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
                <p className="font-mono font-bold text-xl text-slate-900">{successData.invoiceId}</p>
                <p className="text-sm text-slate-500 mt-0.5">₦{successData.price.toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Gallery Link (available after upload)</p>
              <div className="flex gap-2">
                <Input readOnly value={window.location.origin + successData.galleryLink} className="bg-slate-50 font-mono text-sm border-slate-200" />
                <Button variant="secondary" onClick={() => copyLink(successData.galleryLink)} className="shrink-0 gap-2 w-28">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t p-5 flex gap-3">
            <Button variant="outline" className="flex-1 bg-white" onClick={() => setLocation("/staff/clients")}>
              View All Clients
            </Button>
            <Button className="flex-1 gap-2 shadow-md" onClick={() => setLocation(`/staff/clients/${successData.id}/upload`)}>
              <UploadCloud className="w-4 h-4" /> Upload Photos Now
            </Button>
            <Button variant="ghost" className="gap-2" onClick={() => setLocation(`/staff/clients/${successData.id}/invoice`)}>
              <FileText className="w-4 h-4" /> Invoice
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">New Client Record</h1>
        <p className="text-muted-foreground mt-1">Create a client record first. Upload photos separately after the shoot is edited.</p>
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
                      <Textarea placeholder="Special requests, shoot location, outfits..." className="resize-none min-h-[90px]" {...field} />
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
            <Button type="submit" size="lg" disabled={createClient.isPending} className="h-11 px-8 font-bold shadow-md">
              {createClient.isPending ? "Saving..." : "Save Client Record"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
