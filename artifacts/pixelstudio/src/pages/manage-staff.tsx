import { useState } from "react";
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Trash2, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Staff } from "@/lib/mock-db";

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
          <h1 className="text-3xl font-display font-bold tracking-tight">Manage Staff</h1>
          <p className="text-muted-foreground mt-1">Add, update, or remove studio team members.</p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2" size="lg">
          <Plus className="w-4 h-4" /> Add Staff Member
        </Button>
      </div>

      <Card className="border-border/60 shadow-sm">
        <div className="p-4 border-b border-border/50 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
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
                <TableHead className="py-4">Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Loading staff directory...
                  </TableCell>
                </TableRow>
              ) : filteredStaff?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-12 h-12 mb-4 opacity-20" />
                      <p>No staff members found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff?.map(member => (
                  <TableRow key={member.id} className="group">
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-0.5">
                        <span>{member.email}</span>
                        <span className="text-xs text-muted-foreground">{member.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={member.status === 'Active' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-slate-500'}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.dateAdded).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)} className="h-8 w-8 text-slate-500 hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(member.id)} className="h-8 w-8 text-slate-500 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
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
              
              <DialogFooter className="pt-4">
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
