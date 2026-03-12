import { useState } from "react";
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Trash2, Edit2, Users, Mail, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Staff } from "@/lib/mock-db";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(5, "Phone is required"),
  status: z.enum(["Active", "Inactive"]),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export default function ManageStaff() {
  const { data: staff, isLoading } = useStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", email: "", phone: "", status: "Active" }
  });

  const filteredStaff = staff?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingId(null);
    form.reset({ name: "", email: "", phone: "", status: "Active" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: Staff) => {
    setEditingId(member.id);
    form.reset({
      name: member.name,
      email: member.email,
      phone: member.phone,
      status: member.status
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: StaffFormValues) => {
    try {
      if (editingId) {
        await updateStaff.mutateAsync({ id: editingId, ...values });
        toast({ title: "Success", description: "Staff updated successfully" });
      } else {
        await createStaff.mutateAsync(values);
        toast({ title: "Success", description: "Staff added successfully" });
      }
      setIsModalOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to save staff", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      try {
        await deleteStaff.mutateAsync(id);
        toast({ title: "Success", description: "Staff removed successfully" });
      } catch (e) {
        toast({ title: "Error", description: "Failed to remove staff", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold tracking-tight">Manage Staff</h1>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold border border-primary/20">
              {staff?.length || 0} Members
            </span>
          </div>
          <p className="text-muted-foreground mt-1">Add, update, or remove studio team members.</p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2 shadow-md hover-elevate" size="lg">
          <Plus className="w-4 h-4" /> Add Staff Member
        </Button>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
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
                <TableHead className="py-4 pl-6 font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Contact Info</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date Added</TableHead>
                <TableHead className="text-right pr-6 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      <p>Loading staff directory...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStaff?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">No staff found</h3>
                      <p className="max-w-sm mb-4">We couldn't find any staff members matching your current search criteria.</p>
                      <Button variant="outline" onClick={() => setSearch("")} className="bg-white">Clear Search</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff?.map((member, index) => (
                  <TableRow key={member.id} className={`group transition-colors hover:bg-slate-50/80 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}>
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-primary flex items-center justify-center font-bold shadow-sm border border-primary/10">
                          {member.name.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={member.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(member.dateAdded).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <TooltipProvider>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)} className="h-9 w-9 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-full">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Staff</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(member.id)} className="h-9 w-9 text-slate-500 hover:text-destructive hover:bg-destructive/10 rounded-full">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update details for this staff member." : "Enter details for the new studio team member."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@pixelstudio.com" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4 border-t mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createStaff.isPending || updateStaff.isPending}>
                  {createStaff.isPending || updateStaff.isPending ? "Saving..." : "Save Staff"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
