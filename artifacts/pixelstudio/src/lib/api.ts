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
 *
 * Create a file called `.env.local` in artifacts/pixelstudio/ and add:
 *
 *   VITE_API_URL=http://localhost:4000
 *
 * Replace the port with wherever your backend is actually running.
 * Vite automatically loads .env.local during development.
 *
 * ─── Token storage ────────────────────────────────────────────────────────────
 *
 * The JWT returned by /api/auth/login is saved in localStorage under the key
 * "ps_token".  Call saveToken() after login and clearToken() after logout.
 * getToken() is used internally by apiFetch — you rarely need to call it
 * directly.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

if (!BASE_URL) {
  console.warn(
    "[api] VITE_API_URL is not set. " +
    "Create .env.local and add: VITE_API_URL=http://localhost:4000"
  );
}

const TOKEN_KEY = "ps_token";

// ─── Image URL helper ─────────────────────────────────────────────────────────

/**
 * Convert a relative imageUrl from the API into a full URL the browser can load.
 *
 * The backend stores imageUrl as a relative path, e.g. "/uploads/photo-123.jpg".
 * This is intentional — it keeps the database storage-agnostic.
 * The frontend must prepend the API base URL to get a usable src for <img> tags
 * or href for download links.
 *
 * Usage:
 *   <img src={getImageUrl(photo.imageUrl)} alt={photo.fileName} />
 *
 *   <a href={getImageUrl(photo.imageUrl)} download={photo.fileName}>
 *     Download
 *   </a>
 *
 * The function trims any accidental double-slashes between BASE_URL and the path.
 */
export function getImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  // If the URL is already absolute (starts with http:// or https://), return as-is.
  // This makes the function safe to call even after a future Cloudinary migration.
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const base = BASE_URL.replace(/\/$/, "");   // strip trailing slash from base
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${base}${path}`;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Save the JWT to localStorage after a successful login. */
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Read the stored JWT. Returns null when the user is not logged in. */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove the JWT — call this on logout. */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** True when a token exists in storage (does not verify expiry). */
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
 * For file uploads (FormData bodies) do NOT pass Content-Type — the
 * browser sets it automatically with the correct multipart boundary.
 */
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);

  // Attach auth header when a token exists
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set JSON content-type for string bodies — skip for FormData (file uploads)
  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Parse body (may be empty on some 204/error responses)
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

  // All backend responses are wrapped in { success, data, message }
  return (data as { data?: T })?.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "staff";

export interface AuthUser {
  id:       string;
  name:     string;
  email:    string;
  phone:    string;
  role:     "ADMIN" | "STAFF";
  isActive: boolean;
}

export interface Client {
  id:            string;
  clientName:    string;
  phone:         string;
  price:         string;        // Decimal comes back as a string from Prisma
  photoFormat:   "SOFTCOPY" | "HARDCOPY" | "BOTH";
  paymentStatus: "PENDING" | "PAID";
  orderStatus:   "PENDING" | "EDITING" | "READY" | "DELIVERED";
  notes:         string | null;
  galleryToken:  string;
  createdAt:     string;
}

export interface Invoice {
  id:            string;
  invoiceNumber: string;
  amount:        string;
  paymentStatus: "PENDING" | "PAID";
  clientId:      string;
  createdAt:     string;
}

export interface Payment {
  id:        string;
  amount:    string;
  status:    "PENDING" | "PAID";
  clientId:  string;
  createdAt: string;
}

export interface Photo {
  id:        string;
  imageUrl:  string;
  fileName:  string;
  createdAt: string;  // returned by both upload and gallery endpoints
}

/**
 * Shape returned by POST /api/clients/:clientId/photos
 * The `data` field contains client info, gallery info, and the new photo records.
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
    url:   string;   // full frontend URL built from FRONTEND_URL env var
  };
  photoCount: number;
  photos:     Photo[];
}

/**
 * Shape returned by GET /api/gallery/:token (public endpoint).
 * Note: this is different from UploadResult.gallery — this is the full
 * customer-facing gallery view returned by galleryController.
 */
export interface GalleryView {
  studioName:       string;
  clientName:       string;
  photographerName: string;
  galleryToken:     string;
  orderStatus:      Client["orderStatus"];
  createdAt:        string;
  photoCount:       number;
  photos:           Photo[];
}

// ─── 1. Authentication ────────────────────────────────────────────────────────

/**
 * Log in as admin or staff.
 *
 * Saves the returned JWT automatically — you do not need to call saveToken()
 * yourself.
 *
 * Usage:
 *   const { token, user } = await login("admin@pixelstudio.com", "admin123", "admin");
 */
export async function login(
  email: string,
  password: string,
  role: UserRole
): Promise<{ token: string; user: AuthUser }> {
  const result = await apiFetch<{ token: string; user: AuthUser }>(
    "/api/auth/login",
    {
      method: "POST",
      body:   JSON.stringify({ email, password, role }),
    }
  );
  saveToken(result.token);
  return result;
}

/**
 * Get the currently logged-in user's profile.
 * Useful for populating the dashboard header or checking session on page load.
 *
 * Usage:
 *   const user = await getMe();
 */
export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me");
}

/**
 * Change the logged-in user's password.
 *
 * Usage:
 *   await changePassword("oldpassword", "newpassword123");
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiFetch("/api/auth/change-password", {
    method: "POST",
    body:   JSON.stringify({ currentPassword, newPassword }),
  });
}

/** Clear the stored token and end the session. */
export function logout(): void {
  clearToken();
}

// ─── 2. Clients ───────────────────────────────────────────────────────────────

/**
 * Create a new client record.
 *
 * Usage:
 *   const client = await createClient({
 *     clientName: "Ngozi Okonkwo",
 *     phone:      "08123456789",
 *     price:      150000,
 *     photoFormat: "SOFTCOPY",
 *     notes:      "Wedding shoot",
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
 * Fetch a single client's full detail.
 *
 * Usage:
 *   const client = await getClient("client-uuid-here");
 */
export async function getClient(clientId: string): Promise<Client> {
  return apiFetch<Client>(`/api/clients/${clientId}`);
}

// ─── 3. Photo upload ──────────────────────────────────────────────────────────

/**
 * Upload one or more photos for a client.
 *
 * The backend expects a multipart/form-data body with the field name "photos".
 * Do NOT set Content-Type manually — the browser fills in the boundary.
 *
 * Usage (from a file input or drag-and-drop):
 *
 *   const input = document.querySelector('input[type="file"]') as HTMLInputElement;
 *   const files = Array.from(input.files ?? []);
 *   const result = await uploadPhotos(clientId, files);
 *
 * Usage with React state:
 *
 *   const [files, setFiles] = useState<File[]>([]);
 *   // ... user picks files ...
 *   const result = await uploadPhotos(clientId, files);
 */
export async function uploadPhotos(
  clientId: string,
  files: File[]
): Promise<UploadResult> {
  const form = new FormData();
  files.forEach((file) => form.append("photos", file));

  return apiFetch<UploadResult>(
    `/api/clients/${clientId}/photos`,
    {
      method: "POST",
      body:   form,
      // Content-Type is intentionally omitted — browser sets it with the boundary
    }
  );
}

// ─── 4. Public gallery ────────────────────────────────────────────────────────

/**
 * Fetch a client's gallery using their share token.
 * This is the ONLY endpoint that does not require a login token.
 * Share the URL with the client: /gallery/<token>
 *
 * Usage:
 *   const gallery = await getGallery("abc123def456...");
 */
export async function getGallery(token: string): Promise<GalleryView> {
  // Public endpoint — apiFetch still works here, it simply won't add an
  // Authorization header if no token is stored.
  return apiFetch<GalleryView>(`/api/gallery/${token}`);
}

// ─── 5. Invoices ──────────────────────────────────────────────────────────────

/**
 * Generate an invoice for a client.
 * If amount is omitted, the backend defaults to the client's session price.
 *
 * Usage:
 *   // Use the session price as the invoice amount:
 *   const invoice = await createInvoice(clientId);
 *
 *   // Override with a custom amount:
 *   const invoice = await createInvoice(clientId, 75000);
 */
export async function createInvoice(
  clientId: string,
  amount?: number
): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${clientId}`, {
    method: "POST",
    body:   JSON.stringify(amount !== undefined ? { amount } : {}),
  });
}

/**
 * Fetch all invoices.
 * Admin sees all; staff sees only invoices for their own clients.
 *
 * Usage:
 *   const invoices = await getInvoices();
 */
export async function getInvoices(): Promise<Invoice[]> {
  return apiFetch<Invoice[]>("/api/invoices");
}

/**
 * Fetch a single invoice's full detail.
 *
 * Usage:
 *   const invoice = await getInvoice("invoice-uuid-here");
 */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/invoices/${invoiceId}`);
}

// ─── 6. Payments ──────────────────────────────────────────────────────────────

/**
 * Record a payment for a client.
 * The backend automatically marks the client as PAID when total payments
 * reach or exceed the session price.
 *
 * Usage:
 *   const result = await recordPayment(clientId, 50000);
 *   console.log(result.isFullyPaid); // true / false
 */
export async function recordPayment(
  clientId: string,
  amount: number
): Promise<{ paymentId: string; totalPaid: number; isFullyPaid: boolean }> {
  return apiFetch<{ paymentId: string; totalPaid: number; isFullyPaid: boolean }>(
    `/api/payments/${clientId}`,
    {
      method: "POST",
      body:   JSON.stringify({ amount }),
    }
  );
}

/**
 * Fetch all payment records.
 * Admin sees all; staff sees only their own clients' payments.
 *
 * Usage:
 *   const payments = await getPayments();
 */
export async function getPayments(): Promise<Payment[]> {
  return apiFetch<Payment[]>("/api/payments");
}
