import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi, type Staff, type ClientRecord } from "@/lib/mock-db";

// --- STAFF HOOKS ---
export function useStaff() {
  return useQuery({ queryKey: ['staff'], queryFn: mockApi.getStaff });
}
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mockApi.addStaff,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<Omit<Staff, 'id' | 'dateAdded'>>) =>
      mockApi.updateStaff(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mockApi.deleteStaff,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

// --- CLIENT HOOKS ---
export function useClients() {
  return useQuery({ queryKey: ['clients'], queryFn: mockApi.getClients });
}
export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => mockApi.getClient(id),
    enabled: !!id,
  });
}
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mockApi.addClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<ClientRecord>) =>
      mockApi.updateClient(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['clients', variables.id] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
export function useUploadPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, photoUrls }: { id: string; photoUrls: string[] }) =>
      mockApi.uploadPhotos(id, photoUrls),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['clients', variables.id] });
    },
  });
}

// --- PAYMENT HOOKS ---
export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: mockApi.getPayments });
}
