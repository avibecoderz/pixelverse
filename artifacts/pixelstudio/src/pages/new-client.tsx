import { useState, useCallback } from "react";
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
import { UploadCloud, X, Copy, Check, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";

const clientSchema = z.object({
  clientName: z.string().min(2, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  photoStatus: z.enum(["Softcopy", "Hardcopy"]),
  paymentStatus: z.enum(["Paid", "Pending"]),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function NewClient() {
  const [_, setLocation] = useLocation();
  const createClient = useCreateClient();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      clientName: "",
      phone: "",
      price: 0,
      photoStatus: "Softcopy",
      paymentStatus: "Pending",
      notes: "",
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] } 
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: ClientFormValues) => {
    try {
      // In a real app we'd upload files first, get URLs. We'll use mock URLs.
      const mockPhotoUrls = files.length > 0 
        ? files.map((_, i) => `https://images.unsplash.com/photo-1519741497674-611481863552?w=800&fit=crop&sig=${i}`)
        : [];

      const result = await createClient.mutateAsync({
        ...values,
        notes: values.notes || "",
        photos: mockPhotoUrls,
        staffId: 's1', // Mock current staff
        staffName: localStorage.getItem('user_name') || 'Staff Member',
      });

      setSuccessData(result);
      toast({ title: "Success", description: "Client record and gallery created." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to create client", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(window.location.origin + text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
        <Card className="border-border/60 shadow-lg text-center overflow-hidden">
          <div className="bg-emerald-500 p-8 text-white flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-display font-bold">Record Created!</h2>
            <p className="text-emerald-100 mt-2">Client gallery and invoice are ready.</p>
          </div>
          
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-left p-6 bg-slate-50 rounded-xl border border-border/50">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-semibold text-lg">{successData.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice ID</p>
                <p className="font-mono font-medium text-lg">{successData.invoiceId}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-left">Shareable Gallery Link</p>
              <div className="flex gap-2">
                <Input readValue={window.location.origin + successData.galleryLink} value={window.location.origin + successData.galleryLink} readOnly className="bg-slate-50 font-mono text-sm" />
                <Button onClick={() => copyToClipboard(successData.galleryLink)} variant="secondary" className="shrink-0 gap-2 w-28">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-6 flex gap-4">
            <Button variant="outline" className="w-full bg-white" onClick={() => setLocation("/staff/clients")}>
              View All Clients
            </Button>
            <Button className="w-full gap-2" onClick={() => setLocation(`/staff/clients/${successData.id}/invoice`)}>
              <FileText className="w-4 h-4" /> View Invoice
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">New Client Record</h1>
        <p className="text-muted-foreground mt-1">Upload photos and generate billing in one step.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60 shadow-sm md:col-span-1">
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>Basic contact and billing info.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="(555) 000-0000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreed Price ($)</FormLabel>
                      <FormControl><Input type="number" placeholder="1500" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="photoStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Softcopy">Softcopy (Digital)</SelectItem>
                            <SelectItem value="Hardcopy">Hardcopy (Print)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Paid">Paid in Full</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Special requests, shoot location..." className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm md:col-span-1 h-full flex flex-col">
              <CardHeader>
                <CardTitle>Photo Upload</CardTitle>
                <CardDescription>Drag and drop edited images for the client gallery.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div 
                  {...getRootProps()} 
                  className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all cursor-pointer min-h-[200px]
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-border/60 bg-slate-50/50 hover:bg-slate-50'}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                    <UploadCloud className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Drag & drop photos here</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Supports JPG, PNG (Max 10MB each)</p>
                </div>
                
                {previews.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-3">Selected ({previews.length})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {previews.map((src, i) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden group border border-border">
                          <img src={src} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                              className="bg-white text-rose-600 p-1 rounded-full hover:scale-110 transition-transform"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button type="button" variant="ghost" className="mr-4" onClick={() => setLocation("/staff")}>Cancel</Button>
            <Button type="submit" size="lg" disabled={createClient.isPending} className="px-8 font-semibold">
              {createClient.isPending ? "Processing..." : "Save & Generate Gallery"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
