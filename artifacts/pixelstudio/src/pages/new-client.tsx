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
        <Card className="border-0 shadow-xl text-center overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-10 text-white flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/20">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-display font-bold">Record Created!</h2>
            <p className="text-emerald-50 mt-3 text-lg">Client gallery and invoice are ready to share.</p>
          </div>
          
          <CardContent className="p-8 space-y-8 bg-white">
            <div className="grid grid-cols-2 gap-4 text-left p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Client</p>
                <p className="font-bold text-xl text-slate-900">{successData.clientName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice ID</p>
                <p className="font-mono font-bold text-xl text-slate-900">{successData.invoiceId}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-left text-slate-700">Shareable Gallery Link</p>
              <div className="flex gap-2">
                <Input readValue={window.location.origin + successData.galleryLink} value={window.location.origin + successData.galleryLink} readOnly className="bg-slate-50 font-mono text-sm h-12 border-slate-200" />
                <Button onClick={() => copyToClipboard(successData.galleryLink)} variant="secondary" className="shrink-0 gap-2 w-32 h-12 font-semibold">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-6 flex gap-4 border-t border-slate-100">
            <Button variant="outline" className="w-full h-12 bg-white font-semibold shadow-sm" onClick={() => setLocation("/staff/clients")}>
              View All Clients
            </Button>
            <Button className="w-full gap-2 h-12 font-semibold shadow-md" onClick={() => setLocation(`/staff/clients/${successData.id}/invoice`)}>
              <FileText className="w-4 h-4" /> View Invoice
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">New Client Record</h1>
        <p className="text-muted-foreground mt-1">Upload photos and generate billing in one seamless step.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <Card className="border-border/60 shadow-sm lg:col-span-2 order-2 lg:order-1">
              <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-5">
                <CardTitle className="font-display">Client Details</CardTitle>
                <CardDescription>Basic contact and billing info.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Client Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" className="h-11" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Phone Number</FormLabel>
                      <FormControl><Input placeholder="(555) 000-0000" className="h-11" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Agreed Price ($)</FormLabel>
                      <FormControl><Input type="number" placeholder="1500" className="h-11" {...field} /></FormControl>
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
                        <FormLabel className="font-semibold text-slate-700">Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
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
                        <FormLabel className="font-semibold text-slate-700">Payment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
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
                      <FormLabel className="font-semibold text-slate-700">Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Special requests, shoot location..." className="resize-none min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm lg:col-span-3 flex flex-col order-1 lg:order-2">
              <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-5">
                <CardTitle className="font-display">Photo Upload</CardTitle>
                <CardDescription>Drag and drop edited images for the client gallery.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-6">
                <div 
                  {...getRootProps()} 
                  className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-10 transition-all cursor-pointer min-h-[300px]
                    ${isDragActive ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-400'}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors shadow-sm
                    ${isDragActive ? 'bg-primary text-white' : 'bg-white text-primary border border-slate-200'}`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-lg text-slate-700">Drag & drop photos here</p>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-xs">Supports high-res JPG, PNG formats up to 10MB each</p>
                  <Button type="button" variant="secondary" className="mt-6 font-semibold bg-white shadow-sm border border-slate-200">
                    Browse Files
                  </Button>
                </div>
                
                {previews.length > 0 && (
                  <div className="mt-8 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-slate-700">Selected Photos ({previews.length})</p>
                      <Button type="button" variant="ghost" size="sm" onClick={() => {setFiles([]); setPreviews([])}} className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                        Clear All
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto p-1">
                      {previews.map((src, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm border border-slate-200">
                          <img src={src} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                              className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg"
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

          <div className="flex justify-end pt-6 border-t border-border/60">
            <Button type="button" variant="ghost" className="mr-4 h-12 px-6 font-semibold" onClick={() => setLocation("/staff")}>Cancel</Button>
            <Button type="submit" size="lg" disabled={createClient.isPending} className="h-12 px-8 font-bold shadow-md hover-elevate text-base">
              {createClient.isPending ? "Processing..." : "Save & Generate Gallery"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
