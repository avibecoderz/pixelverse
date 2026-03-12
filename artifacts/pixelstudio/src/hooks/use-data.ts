import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi, type Staff, type ClientRecord, type Payment } from "@/lib/mock-db";

// --- STAFF HOOKS ---
export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: mockApi.getStaff,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mockApi.addStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<Omit<Staff, 'id' | 'dateAdded'>>) => 
      mockApi.updateStaff(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // in case name updated
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mockApi.deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

// --- CLIENT HOOKS ---
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: mockApi.getClients,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => mockApi.getClient(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mockApi.addClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<ClientRecord>) =>
      mockApi.updateClient(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

// --- PAYMENT HOOKS ---
export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: mockApi.getPayments,
  });
}
