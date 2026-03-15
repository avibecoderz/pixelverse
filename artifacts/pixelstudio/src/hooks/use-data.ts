/**
 * use-data.ts — React Query Hooks for PixelStudio
 *
 * All hooks call the real backend API via api.ts and normalise the
 * responses to the "App" types below — the same shape that the UI
 * pages were originally built against when using mock data.
 *
 * Normalisation mapping:
 *   Backend StaffMember { isActive, createdAt }
 *     → AppStaff        { status: "Active"|"Inactive", dateAdded }
 *
 *   Backend Client      { price: string, photoFormat: "SOFTCOPY", paymentStatus: "PENDING", ... }
 *     → AppClient       { price: number, photoFormat: "Softcopy", paymentStatus: "Pending", ... }
 *
 *   Backend Payment     { amount: string, status: "PAID", client: {...}, receivedBy: {...} }
 *     → AppPayment      { amount: number, paymentStatus: "Paid", clientName, staffName, ... }
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStaff, createStaff, updateStaff, deleteStaff,
  toggleStaffStatus, setStaffPassword,
  getClients, getClient, createClient, updateClient,
  getPayments, getGallery, uploadPhotos,
  getImageUrl,
  type StaffMember,
} from "@/lib/api";

// ─── Normalised App Types ─────────────────────────────────────────────────────
// These types define what the UI pages receive from hooks.
// They are intentionally similar to the old mock-db types so pages need
// minimal changes when switching from mock to real API.

export type AppStaff = {
  id:        string;
  name:      string;
  email:     string;
  phone:     string;
  /** Email prefix used for display (real API has no username field). */
  username:  string;
  status:    "Active" | "Inactive";
  dateAdded: string;
};

export type AppClient = {
  id:            string;
  clientName:    string;
  phone:         string;
  /** Parsed to number — backend Decimal comes back as a string. */
  price:         number;
  photoFormat:   "Softcopy" | "Hardcopy" | "Both";
  paymentStatus: "Paid" | "Pending";
  orderStatus:   "Pending" | "Editing" | "Ready" | "Delivered";
  notes:         string;
  /** Full image URLs (from gallery.photos on detail view; empty on list view). */
  photos:        string[];
  /**
   * Accurate photo count: uses photos.length on detail view (where actual
   * photo URLs are included), or _count.photos from the list endpoint.
   * Always use photoCount instead of photos.length on list-view pages.
   */
  photoCount:    number;
  /** First invoice's invoiceNumber, or "" if no invoice yet. */
  invoiceId:     string;
  /** Frontend gallery route: /gallery/<galleryToken> */
  galleryLink:   string;
  /** ISO date string (= createdAt from backend). */
  date:          string;
  staffId:       string;
  staffName:     string;
};

export type AppPayment = {
  id:            string;
  /** The client this payment belongs to — used to update the client's paymentStatus. */
  clientId:      string;
  clientName:    string;
  staffName:     string;
  /** Parsed to number — backend Decimal comes back as a string. */
  amount:        number;
  paymentStatus: "Paid" | "Pending";
  /** ISO date string (= createdAt from backend). */
  date:          string;
  /** Not available on the payment list endpoint — set to "" by default. */
  invoiceId:     string;
};

// ─── Lookup maps (Backend UPPERCASE → UI capitalised) ─────────────────────────

const PHOTO_FORMAT: Record<string, AppClient["photoFormat"]> = {
  SOFTCOPY: "Softcopy",
  HARDCOPY: "Hardcopy",
  BOTH:     "Both",
};

const PAYMENT_STATUS: Record<string, AppClient["paymentStatus"]> = {
  PENDING: "Pending",
  PAID:    "Paid",
};

const ORDER_STATUS: Record<string, AppClient["orderStatus"]> = {
  PENDING:   "Pending",
  EDITING:   "Editing",
  READY:     "Ready",
  DELIVERED: "Delivered",
};

// ─── Adapters ─────────────────────────────────────────────────────────────────

function adaptStaff(raw: StaffMember): AppStaff {
  return {
    id:        raw.id,
    name:      raw.name,
    email:     raw.email,
    phone:     raw.phone,
    username:  raw.email.split("@")[0], // email prefix as display "username"
    status:    raw.isActive ? "Active" : "Inactive",
    dateAdded: raw.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptClient(raw: any): AppClient {
  // Photos are present on detail responses (via gallery.photos).
  // List responses include only _count.photos, so photos array defaults to [].
  const photos: string[] = Array.isArray(raw.gallery?.photos)
    ? raw.gallery.photos.map((p: { imageUrl: string }) => getImageUrl(p.imageUrl))
    : [];

  // Use the actual array length when photos are loaded (detail view).
  // Fall back to _count.photos from the list endpoint so stats are always accurate.
  const photoCount = photos.length > 0 ? photos.length : (raw._count?.photos ?? 0);

  return {
    id:            raw.id,
    clientName:    raw.clientName,
    phone:         raw.phone,
    price:         parseFloat(raw.price),
    photoFormat:   PHOTO_FORMAT[raw.photoFormat]   ?? "Softcopy",
    paymentStatus: PAYMENT_STATUS[raw.paymentStatus] ?? "Pending",
    orderStatus:   ORDER_STATUS[raw.orderStatus]   ?? "Pending",
    notes:         raw.notes ?? "",
    photos,
    photoCount,
    invoiceId:     raw.invoices?.[0]?.invoiceNumber ?? "",
    galleryLink:   raw.galleryToken ? `/gallery/${raw.galleryToken}` : "",
    date:          raw.createdAt,
    staffId:       raw.createdBy?.id   ?? "",
    staffName:     raw.createdBy?.name ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptPayment(raw: any): AppPayment {
  return {
    id:            raw.id,
    clientId:      raw.clientId ?? raw.client?.id ?? "",
    clientName:    raw.client?.clientName  ?? "",
    staffName:     raw.receivedBy?.name    ?? "",
    amount:        parseFloat(raw.amount),
    paymentStatus: raw.status === "PAID" ? "Paid" : "Pending",
    date:          raw.createdAt,
    invoiceId:     "",  // the payment list endpoint does not include invoice IDs
  };
}

// ─── Reverse maps (UI → Backend) for create/update mutations ─────────────────
// Exported so pages (e.g. new-client.tsx) can convert form values to API enums
// without defining the same map twice.

export const PHOTO_FORMAT_API = { Softcopy: "SOFTCOPY", Hardcopy: "HARDCOPY", Both: "BOTH" } as const;
export const ORDER_STATUS_API  = { Pending: "PENDING", Editing: "EDITING", Ready: "READY", Delivered: "DELIVERED" } as const;
export const PAY_STATUS_API    = { Pending: "PENDING", Paid: "PAID" } as const;

// ─── Staff Hooks ──────────────────────────────────────────────────────────────

/** Fetch all staff members (admin only). */
export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn:  async () => {
      const raw = await getStaff();
      return raw.map(adaptStaff);
    },
  });
}

/** Create a new staff account (admin only). */
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name:     string;
      email:    string;
      phone:    string;
      password: string;
      status?:  "Active" | "Inactive";
    }) => {
      const { status, ...rest } = data;
      const raw = await createStaff({ ...rest, isActive: status !== "Inactive" });
      return adaptStaff(raw);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

/** Update a staff member's profile fields or toggle their active status. */
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      ...rest
    }: {
      id:      string;
      name?:   string;
      email?:  string;
      phone?:  string;
      status?: "Active" | "Inactive";
    }) => {
      if (status !== undefined) {
        // Status toggle uses its own dedicated endpoint
        const raw = await toggleStaffStatus(id, status === "Active");
        return adaptStaff(raw);
      }
      const raw = await updateStaff(id, rest);
      return adaptStaff(raw);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

/** Admin resets a staff member's password (no old password required). */
export function useSetStaffPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      setStaffPassword(id, newPassword),
  });
}

/** Permanently remove a staff account (blocked if they have linked records). */
export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

// ─── Client Hooks ─────────────────────────────────────────────────────────────

/** Fetch all clients visible to the logged-in user. */
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn:  async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await getClients() as any[];
      return raw.map(adaptClient);
    },
  });
}

/** Fetch a single client's full detail including gallery photos. */
export function useClient(id: string) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn:  async () => {
      const raw = await getClient(id);
      return adaptClient(raw);
    },
    enabled: !!id,
  });
}

/** Create a new client record. */
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      clientName:     string;
      phone:          string;
      price:          number;
      photoFormat?:   AppClient["photoFormat"];
      orderStatus?:   AppClient["orderStatus"];
      paymentStatus?: AppClient["paymentStatus"];
      notes?:         string;
      staffId?:       string; // ignored — backend sets this from the JWT
      staffName?:     string; // ignored — backend reads from user record
      photos?:        string[]; // ignored — use uploadPhotos hook
    }) => {
      const raw = await createClient({
        clientName:    data.clientName,
        phone:         data.phone,
        price:         data.price,
        photoFormat:   data.photoFormat
          ? PHOTO_FORMAT_API[data.photoFormat]
          : undefined,
        orderStatus:   data.orderStatus
          ? ORDER_STATUS_API[data.orderStatus]
          : undefined,
        paymentStatus: data.paymentStatus
          ? PAY_STATUS_API[data.paymentStatus]
          : undefined,
        notes: data.notes,
      });
      return adaptClient(raw);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/** Update a client's fields. Only provided fields are changed. */
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<AppClient>) => {
      const raw = await updateClient(id, {
        clientName:    data.clientName,
        phone:         data.phone,
        price:         data.price,
        photoFormat:   data.photoFormat
          ? PHOTO_FORMAT_API[data.photoFormat]
          : undefined,
        orderStatus:   data.orderStatus
          ? ORDER_STATUS_API[data.orderStatus]
          : undefined,
        paymentStatus: data.paymentStatus
          ? PAY_STATUS_API[data.paymentStatus]
          : undefined,
        notes: data.notes ?? null,
      });
      return adaptClient(raw);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients", vars.id] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

/**
 * Upload photos to a client's gallery.
 * Accepts real File objects (from a file input or drag-and-drop).
 */
export function useUploadPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      uploadPhotos(id, files),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients", vars.id] });
    },
  });
}

// ─── Gallery Hook (public, no auth required) ──────────────────────────────────

/**
 * Fetch a public gallery by its share token.
 * Returns the raw GalleryView shape from the API.
 *
 * The query is set to retry: false so a "not ready yet" 403 response
 * (gallery is PENDING or EDITING) does not get retried automatically.
 */
export function useGallery(token: string) {
  return useQuery({
    queryKey: ["gallery", token],
    queryFn:  () => getGallery(token),
    enabled:  !!token,
    retry:    false, // do not retry 403 (not ready) or 404 (invalid token)
  });
}

// ─── Payment Hooks ────────────────────────────────────────────────────────────

/** Fetch all payment records visible to the logged-in user. */
export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn:  async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await getPayments() as any[];
      return raw.map(adaptPayment);
    },
  });
}
