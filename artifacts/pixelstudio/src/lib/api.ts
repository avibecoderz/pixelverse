/**
 * api.ts — PixelStudio API Client
 *
 * A thin wrapper around fetch that:
 *   · Reads the backend base URL from VITE_API_URL
 *   · Automatically attaches the JWT token from localStorage to every
 *     protected request via the Authorization header
 *   · Throws a plain Error with the server's message on non-2xx responses
 *
 * ─── Setup ────────────────────────────────────────────────────────────────────
 * Create `.env.local` in artifacts/pixelstudio/ with:
 *
 *   VITE_API_URL=http://localhost:4000
 *
 * ─── Token storage ────────────────────────────────────────────────────────────
 * The JWT returned by /api/auth/login is saved in localStorage under "ps_token".
 * Call saveToken() after login (or use the login() helper which does it for you).
 * Call clearToken() on logout.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

// If VITE_API_URL is empty, all requests use relative paths (/api/...).
// The Vite dev server proxy forwards these to the backend on port 3000.
// In production, set VITE_API_URL to your backend's public URL.
if (BASE_URL === undefined) {
  console.warn("[api] VITE_API_URL is undefined — set it in .env.local if the proxy is not configured.");
}

const TOKEN_KEY = "ps_token";

// ─── Image URL helper ─────────────────────────────────────────────────────────

/**
 * Convert a relative imageUrl from the API into a full URL the browser can load.
 *
 * The backend stores imageUrl as a path like "/uploads/photo-123.jpg".
 * Prepend the API base URL so the browser can actually fetch the image.
 *
 * Usage:
 *   <img src={getImageUrl(photo.imageUrl)} alt={photo.fileName} />
 *   <a href={getImageUrl(photo.imageUrl)} download={photo.fileName}>Download</a>
 */
export function getImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const base = BASE_URL.replace(/\/$/, "");
  const p    = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${base}${p}`;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

/**
 * Internal helper used by every public function below.
 *
 * - Prepends BASE_URL to every path.
 * - Adds Content-Type: application/json for JSON bodies.
 * - Adds Authorization: Bearer <token> when a token is stored.
 * - Parses the JSON response and throws an Error with the server's
 *   `message` field on non-2xx status codes.
 *
 * For file uploads (FormData), do NOT pass Content-Type — the browser
 * sets it automatically with the correct multipart boundary.
 */
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token   = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (data as { data?: T })?.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "staff";

/**
 * The logged-in user's profile returned by /api/auth/login and /api/auth/me.
 * role is always lowercase ("admin" | "staff") — the backend normalises it.
 */
export interface AuthUser {
  id:        string;
  name:      string;
  email:     string;
  phone:     string;
  role:      "admin" | "staff";  // lowercase — matches what formatUser() returns
  isActive:  boolean;
  createdAt: string | null;
}

/**
 * A staff member as returned by the /api/staff endpoints.
 * All staff management routes are admin-only.
 */
export interface StaffMember {
  id:        string;
  name:      string;
  email:     string;
  phone:     string;
  role:      "STAFF";
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id:            string;
  clientName:    string;
  phone:         string;
  price:         string;         // Decimal comes back as a string from Prisma
  photoFormat:   "SOFTCOPY" | "HARDCOPY" | "BOTH";
  paymentStatus: "PENDING" | "PAID";
  orderStatus:   "PENDING" | "EDITING" | "READY" | "DELIVERED";
  notes:         string | null;
  galleryToken:  string;
  createdAt:     string;
  createdBy?:    { id: string; name: string; email: string };
  invoices?:     Invoice[];
  gallery?:      { photos: Photo[] };
}

export interface Invoice {
  id:            string;
  invoiceNumber: string;
  amount:        string;         // Decimal as string
  paymentStatus: "PENDING" | "PAID";
  createdAt:     string;
  client?: {
    id:          string;
    clientName:  string;
    phone:       string;
    price:       string;
    photoFormat: Client["photoFormat"];
    orderStatus: Client["orderStatus"];
  };
  createdBy?: {
    id:    string;
    name:  string;
    email: string;
    phone: string;
  };
  studio?: {
    name:    string;
    address: string;
  };
}

export interface Payment {
  id:        string;
  amount:    string;             // Decimal as string
  status:    "PENDING" | "PAID";
  createdAt: string;
  client?:   { id: string; clientName: string; phone: string };
  receivedBy?: { id: string; name: string };
}

export interface Photo {
  id:        string;
  imageUrl:  string;
  fileName:  string;
  createdAt: string;
}

/**
 * Returned by POST /api/clients/:clientId/photos after a successful upload.
 */
export interface UploadResult {
  client: {
    id:            string;
    clientName:    string;
    phone:         string;
    orderStatus:   Client["orderStatus"];
    paymentStatus: Client["paymentStatus"];
    galleryToken:  string;
  };
  gallery: {
    id:    string;
    token: string;
    url:   string;
  };
  photoCount: number;
  photos:     Photo[];
}

/**
 * Returned by GET /api/gallery/:token (public, no auth required).
 */
export interface GalleryView {
  studioName:       string;
  clientName:       string;
  photographerName: string;
  galleryToken:     string;
  galleryUrl:       string;
  orderStatus:      Client["orderStatus"];
  createdAt:        string;
  photoCount:       number;
  photos:           Photo[];
}

/**
 * Returned by GET /api/dashboard/admin
 */
export interface AdminDashboardData {
  stats: {
    totalStaff:           number;
    totalClients:         number;
    totalRevenue:         number;
    pendingPaymentsCount: number;
    totalGalleries:       number;
  };
  recentClients:  Array<{
    id:            string;
    clientName:    string;
    phone:         string;
    orderStatus:   Client["orderStatus"];
    paymentStatus: Client["paymentStatus"];
    createdAt:     string;
    createdBy:     { id: string; name: string };
  }>;
  recentPayments: Array<{
    id:         string;
    amount:     string;
    status:     Payment["status"];
    createdAt:  string;
    client:     { id: string; clientName: string };
    receivedBy: { id: string; name: string };
  }>;
}

/**
 * Returned by GET /api/dashboard/staff
 */
export interface StaffDashboardData {
  stats: {
    totalClients:           number;
    pendingEditingCount:    number;
    readyForUploadCount:    number;
    uploadedGalleriesCount: number;
    totalRevenue:           number;
  };
  recentClients:  Array<{
    id:            string;
    clientName:    string;
    phone:         string;
    orderStatus:   Client["orderStatus"];
    paymentStatus: Client["paymentStatus"];
    createdAt:     string;
  }>;
  recentPayments: Array<{
    id:        string;
    amount:    string;
    status:    Payment["status"];
    createdAt: string;
    client:    { id: string; clientName: string };
  }>;
}

// ─── 1. Authentication ────────────────────────────────────────────────────────

/**
 * Log in as admin or staff.
 * Saves the returned JWT automatically via saveToken().
 *
 * Usage:
 *   const { token, user } = await login("admin@pixelstudio.ng", "admin123", "admin");
 */
export async function login(
  email:    string,
  password: string,
  role:     UserRole
): Promise<{ token: string; user: AuthUser }> {
  const result = await apiFetch<{ token: string; user: AuthUser }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password, role }) }
  );
  saveToken(result.token);
  return result;
}

/**
 * Fetch the currently logged-in user's profile from the database.
 * Always returns fresh data — name/role changes are reflected immediately.
 */
export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me");
}

/**
 * Change the logged-in user's own password.
 * currentPassword must match the stored password or the server rejects the request.
 *
 * Usage:
 *   await changePassword("oldpassword123", "newpassword456");
 */
export async function changePassword(
  currentPassword: string,
  newPassword:     string
): Promise<void> {
  await apiFetch("/api/auth/change-password", {
    method: "POST",
    body:   JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * Reset a user's password without requiring the old password.
 * This is called at the end of the forgot-password OTP flow, after the user
 * has successfully verified the OTP code on the client side.
 *
 * Usage:
 *   await resetPassword("admin@pixelstudio.com", "mynewpassword");
 */
export async function resetPassword(
  email:       string,
  newPassword: string,
): Promise<void> {
  await apiFetch("/api/auth/reset-password", {
    method: "POST",
    body:   JSON.stringify({ email, newPassword }),
  });
}

/** Remove the JWT from localStorage and end the user's session. */
export function logout(): void {
  clearToken();
  localStorage.removeItem("role");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_id");
}

// ─── 2. Staff Management (Admin only) ─────────────────────────────────────────

/**
 * Fetch all staff members. Optional filter by active status.
 *
 * Usage:
 *   const staff = await getStaff();                 // all staff
 *   const active = await getStaff({ active: true }); // active only
 */
export async function getStaff(filters?: { active?: boolean }): Promise<StaffMember[]> {
  const params = new URLSearchParams();
  if (filters?.active !== undefined) params.set("active", String(filters.active));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<StaffMember[]>(`/api/staff${query}`);
}

/**
 * Create a new staff account.
 *
 * Usage:
 *   const staff = await createStaff({
 *     name: "Adaeze Nwosu", email: "adaeze@pixelstudio.ng",
 *     phone: "08011223344", password: "securepassword"
 *   });
 */
export async function createStaff(data: {
  name:      string;
  email:     string;
  phone:     string;
  password:  string;
  isActive?: boolean;
}): Promise<StaffMember> {
  return apiFetch<StaffMember>("/api/staff", {
    method: "POST",
    body:   JSON.stringify(data),
  });
}

/**
 * Update a staff member's name, email, or phone number.
 * Only fields included in the body are changed.
 *
 * Usage:
 *   await updateStaff(staffId, { name: "New Name", phone: "08099887766" });
 */
export async function updateStaff(
  staffId: string,
  data: { name?: string; email?: string; phone?: string }
): Promise<StaffMember> {
  return apiFetch<StaffMember>(`/api/staff/${staffId}`, {
    method: "PUT",
    body:   JSON.stringify(data),
  });
}

/**
 * Activate or deactivate a staff account.
 * Deactivated staff cannot log in.
 *
 * Usage:
 *   await toggleStaffStatus(staffId, false); // deactivate
 *   await toggleStaffStatus(staffId, true);  // reactivate
 */
export async function toggleStaffStatus(
  staffId:  string,
  isActive: boolean
): Promise<StaffMember> {
  return apiFetch<StaffMember>(`/api/staff/${staffId}/status`, {
    method: "PATCH",
    body:   JSON.stringify({ isActive }),
  });
}

/**
 * Admin resets a staff member's password (no old password required).
 *
 * Usage:
 *   await setStaffPassword(staffId, "newpassword123");
 */
export async function setStaffPassword(
  staffId:     string,
  newPassword: string
): Promise<void> {
  await apiFetch(`/api/staff/${staffId}/password`, {
    method: "PATCH",
    body:   JSON.stringify({ newPassword }),
  });
}

/**
 * Permanently remove a staff account.
 * Blocked if the staff member has any linked clients, galleries, invoices, or payments.
 */
export async function deleteStaff(staffId: string): Promise<void> {
  await apiFetch(`/api/staff/${staffId}`, { method: "DELETE" });
}

// ─── 3. Clients ───────────────────────────────────────────────────────────────

/**
 * Create a new client record.
 *
 * Usage:
 *   const client = await createClient({
 *     clientName: "Ngozi Okonkwo", phone: "08123456789",
 *     price: 150000, photoFormat: "SOFTCOPY", notes: "Wedding shoot"
 *   });
 */
export async function createClient(data: {
  clientName:   string;
  phone:        string;
  price:        number;
  photoFormat?: "SOFTCOPY" | "HARDCOPY" | "BOTH";
  notes?:       string;
}): Promise<Client> {
  return apiFetch<Client>("/api/clients", {
    method: "POST",
    body:   JSON.stringify(data),
  });
}

/**
 * Fetch all clients.
 * Admin sees all clients; staff sees only their own.
 *
 * Optional filters:
 *   getClients({ orderStatus: "EDITING", paymentStatus: "PENDING" })
 */
export async function getClients(filters?: {
  orderStatus?:   Client["orderStatus"];
  paymentStatus?: Client["paymentStatus"];
}): Promise<Client[]> {
  const params = new URLSearchParams();
  if (filters?.orderStatus)   params.set("orderStatus",   filters.orderStatus);
  if (filters?.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Client[]>(`/api/clients${query}`);
}

/**
 * Fetch a single client's full detail, including their gallery and photos.
 */
export async function getClient(clientId: string): Promise<Client> {
  return apiFetch<Client>(`/api/clients/${clientId}`);
}

/**
 * Update a client record. Only fields in the body are changed.
 *
 * Usage:
 *   await updateClient(clientId, { orderStatus: "READY", notes: "Done!" });
 */
export async function updateClient(
  clientId: string,
  data: {
    clientName?:   string;
    phone?:        string;
    price?:        number;
    photoFormat?:  Client["photoFormat"];
    orderStatus?:  Client["orderStatus"];
    paymentStatus?:Client["paymentStatus"];
    notes?:        string | null;
  }
): Promise<Client> {
  return apiFetch<Client>(`/api/clients/${clientId}`, {
    method: "PUT",
    body:   JSON.stringify(data),
  });
}

/**
 * Permanently delete a client record.
 * Cascades to gallery, photos, invoices, and payments.
 */
export async function deleteClient(clientId: string): Promise<void> {
  await apiFetch(`/api/clients/${clientId}`, { method: "DELETE" });
}

// ─── 4. Photo upload ──────────────────────────────────────────────────────────

/**
 * Upload one or more photos for a client.
 * The backend expects a multipart/form-data body with the field name "photos".
 *
 * Usage:
 *   const result = await uploadPhotos(clientId, Array.from(input.files));
 */
export async function uploadPhotos(
  clientId: string,
  files:    File[]
): Promise<UploadResult> {
  const form = new FormData();
  files.forEach((file) => form.append("photos", file));
  return apiFetch<UploadResult>(`/api/clients/${clientId}/photos`, {
    method: "POST",
    body:   form,
    // Content-Type intentionally omitted — browser sets it with the multipart boundary
  });
}

// ─── 5. Public gallery ────────────────────────────────────────────────────────

/**
 * Fetch a client's gallery using their 32-character share token.
 * This is the ONLY endpoint that does not require a login token.
 *
 * Throws an error if the gallery is not ready (PENDING/EDITING status).
 * The error message from the server is suitable to display to the customer.
 *
 * Usage:
 *   const gallery = await getGallery("abc123def456...");
 */
export async function getGallery(token: string): Promise<GalleryView> {
  return apiFetch<GalleryView>(`/api/gallery/${token}`);
}

// ─── 6. Invoices ──────────────────────────────────────────────────────────────

/**
 * Generate a new invoice for a client.
 * If amount is omitted, defaults to the client's session price.
 *
 * Usage:
 *   const invoice = await createInvoice(clientId);          // use session price
 *   const invoice = await createInvoice(clientId, 75000);   // custom amount
 */
export async function createInvoice(
  clientId: string,
  amount?:  number
): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${clientId}`, {
    method: "POST",
    body:   JSON.stringify(amount !== undefined ? { amount } : {}),
  });
}

/**
 * Fetch all invoices.
 * Admin sees all; staff sees only invoices for their own clients.
 */
export async function getInvoices(): Promise<Invoice[]> {
  return apiFetch<Invoice[]>("/api/invoices");
}

/**
 * Fetch a single invoice's full detail including studio info.
 * Returns the full shape needed to render and print an invoice.
 */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${invoiceId}`);
}

/**
 * Mark an invoice as PAID.
 * Returns the updated invoice with full client and studio details.
 */
export async function markInvoicePaid(invoiceId: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${invoiceId}/mark-paid`, {
    method: "PATCH",
  });
}

// ─── 7. Payments ──────────────────────────────────────────────────────────────

/**
 * Record a confirmed payment received from a client.
 * The backend automatically marks the client as PAID when the total reaches
 * or exceeds the session price.
 *
 * Usage:
 *   const { payment, summary } = await recordPayment(clientId, 50000);
 *   console.log(summary.isFullyPaid); // true / false
 */
export async function recordPayment(
  clientId: string,
  amount:   number
): Promise<{
  payment: Payment & { client: NonNullable<Payment["client"]>; receivedBy: NonNullable<Payment["receivedBy"]> };
  summary: { totalPaid: number; sessionPrice: number; balance: number; isFullyPaid: boolean };
}> {
  return apiFetch(`/api/payments/${clientId}`, {
    method: "POST",
    body:   JSON.stringify({ amount }),
  });
}

/**
 * Fetch all payment records.
 * Admin sees all; staff sees only their own clients' payments.
 */
export async function getPayments(): Promise<Payment[]> {
  return apiFetch<Payment[]>("/api/payments");
}

// ─── 8. Dashboards ────────────────────────────────────────────────────────────

/**
 * Fetch admin dashboard stats and recent activity (admin only).
 */
export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return apiFetch<AdminDashboardData>("/api/dashboard/admin");
}

/**
 * Fetch staff dashboard stats and personal recent activity.
 */
export async function getStaffDashboard(): Promise<StaffDashboardData> {
  return apiFetch<StaffDashboardData>("/api/dashboard/staff");
}
