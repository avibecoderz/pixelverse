// In-memory database to simulate a backend for PixelStudio

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  status: 'Active' | 'Inactive';
  dateAdded: string;
}

export interface ClientRecord {
  id: string;
  clientName: string;
  phone: string;
  price: number;
  photoFormat: 'Softcopy' | 'Hardcopy' | 'Both';
  paymentStatus: 'Paid' | 'Pending';
  orderStatus: 'Pending' | 'Editing' | 'Ready' | 'Delivered';
  notes: string;
  photos: string[];
  invoiceId: string;
  galleryLink: string;
  date: string;
  staffId: string;
  staffName: string;
}

export interface Payment {
  id: string;
  clientName: string;
  staffName: string;
  amount: number;
  paymentStatus: 'Paid' | 'Pending';
  date: string;
  invoiceId: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let staffDB: Staff[] = [
  { id: 's1', name: 'Ngozi Adeyemi',  email: 'ngozi@pixelstudio.ng',   phone: '08031234567', username: 'staff01', password: 'staff123', status: 'Active',   dateAdded: '2023-11-01T10:00:00Z' },
  { id: 's2', name: 'Emeka Okafor',   email: 'emeka@pixelstudio.ng',   phone: '08059876543', username: 'staff02', password: 'staff456', status: 'Active',   dateAdded: '2023-11-15T10:00:00Z' },
  { id: 's3', name: 'Aisha Bello',    email: 'aisha@pixelstudio.ng',   phone: '08167001122', username: 'staff03', password: 'staff789', status: 'Inactive', dateAdded: '2023-12-05T10:00:00Z' },
  { id: 's4', name: 'Tunde Adeleke',  email: 'tunde@pixelstudio.ng',   phone: '07089994455', username: 'staff04', password: 'staff000', status: 'Active',   dateAdded: '2024-01-10T10:00:00Z' },
];

let clientDB: ClientRecord[] = [
  {
    id: 'c1', clientName: 'Chidinma Eze', phone: '08023456789', price: 250000,
    photoFormat: 'Softcopy', paymentStatus: 'Paid', orderStatus: 'Delivered',
    notes: 'Traditional wedding pre-shoot. Needs quick turnaround. Aso-ebi colours.',
    photos: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&fit=crop',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&fit=crop',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&fit=crop',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&fit=crop',
      'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800&fit=crop',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&fit=crop',
    ],
    invoiceId: 'INV-0001', galleryLink: '/gallery/c1', date: '2024-01-10T14:30:00Z',
    staffId: 's1', staffName: 'Ngozi Adeyemi',
  },
  {
    id: 'c2', clientName: 'Adebayo Ogundimu', phone: '08155667788', price: 120000,
    photoFormat: 'Hardcopy', paymentStatus: 'Pending', orderStatus: 'Ready',
    notes: 'Family portrait session at Lagos Island. Outdoor location.',
    photos: [
      'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=800&fit=crop',
      'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&fit=crop',
    ],
    invoiceId: 'INV-0002', galleryLink: '/gallery/c2', date: '2024-01-12T09:15:00Z',
    staffId: 's2', staffName: 'Emeka Okafor',
  },
  {
    id: 'c3', clientName: 'Fatima Musa', phone: '08067891234', price: 380000,
    photoFormat: 'Both', paymentStatus: 'Paid', orderStatus: 'Editing',
    notes: 'Engagement shoot. Three outfit changes. Outdoor and studio sessions.',
    photos: [],
    invoiceId: 'INV-0003', galleryLink: '/gallery/c3', date: '2024-02-05T11:00:00Z',
    staffId: 's1', staffName: 'Ngozi Adeyemi',
  },
  {
    id: 'c4', clientName: 'James Okoye', phone: '07033445566', price: 75000,
    photoFormat: 'Softcopy', paymentStatus: 'Pending', orderStatus: 'Pending',
    notes: 'Corporate headshots for LinkedIn and company website.',
    photos: [],
    invoiceId: 'INV-0004', galleryLink: '/gallery/c4', date: '2024-02-18T15:45:00Z',
    staffId: 's2', staffName: 'Emeka Okafor',
  },
  {
    id: 'c5', clientName: 'Blessing Nwosu', phone: '08099887766', price: 200000,
    photoFormat: 'Softcopy', paymentStatus: 'Paid', orderStatus: 'Delivered',
    notes: 'Maternity shoot. Sunset/golden hour preferred. Location: Lekki Conservation Centre.',
    photos: [
      'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&fit=crop',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&fit=crop',
      'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=800&fit=crop',
    ],
    invoiceId: 'INV-0005', galleryLink: '/gallery/c5', date: '2024-03-01T10:00:00Z',
    staffId: 's4', staffName: 'Tunde Adeleke',
  },
  {
    id: 'c6', clientName: 'Kemi Bankole', phone: '08144332211', price: 150000,
    photoFormat: 'Both', paymentStatus: 'Paid', orderStatus: 'Editing',
    notes: 'Birthday shoot — 30th birthday. Glam style. Studio setup.',
    photos: [],
    invoiceId: 'INV-0006', galleryLink: '/gallery/c6', date: '2024-03-15T13:00:00Z',
    staffId: 's4', staffName: 'Tunde Adeleke',
  },
  {
    id: 'c7', clientName: 'Ibrahim Sule', phone: '08122334455', price: 95000,
    photoFormat: 'Hardcopy', paymentStatus: 'Pending', orderStatus: 'Pending',
    notes: 'Product photography for clothing brand. White backdrop required.',
    photos: [],
    invoiceId: 'INV-0007', galleryLink: '/gallery/c7', date: '2024-03-20T09:00:00Z',
    staffId: 's2', staffName: 'Emeka Okafor',
  },
];

export const mockApi = {
  // AUTH
  validateStaffCredentials: async (username: string, password: string): Promise<Staff | null> => {
    await delay(600);
    const match = staffDB.find(s => s.username === username && s.password === password && s.status === 'Active');
    return match ? { ...match } : null;
  },

  // STAFF
  getStaff: async (): Promise<Staff[]> => {
    await delay(400);
    return [...staffDB];
  },
  addStaff: async (staff: Omit<Staff, 'id' | 'dateAdded'>): Promise<Staff> => {
    await delay(500);
    // Ensure username is unique
    if (staffDB.find(s => s.username === staff.username)) {
      throw new Error('Username already taken');
    }
    const newStaff: Staff = { ...staff, id: `s${Date.now()}`, dateAdded: new Date().toISOString() };
    staffDB.push(newStaff);
    return newStaff;
  },
  updateStaff: async (id: string, updates: Partial<Omit<Staff, 'id' | 'dateAdded'>>): Promise<Staff> => {
    await delay(500);
    const index = staffDB.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Staff not found');
    // Check username uniqueness if changing
    if (updates.username && staffDB.find(s => s.username === updates.username && s.id !== id)) {
      throw new Error('Username already taken');
    }
    staffDB[index] = { ...staffDB[index], ...updates };
    if (updates.name) {
      clientDB = clientDB.map(c => c.staffId === id ? { ...c, staffName: updates.name! } : c);
    }
    return { ...staffDB[index] };
  },
  deleteStaff: async (id: string): Promise<void> => {
    await delay(500);
    staffDB = staffDB.filter(s => s.id !== id);
  },

  // CLIENTS
  getClients: async (): Promise<ClientRecord[]> => {
    await delay(600);
    return [...clientDB].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  getClient: async (id: string): Promise<ClientRecord> => {
    await delay(300);
    const client = clientDB.find(c => c.id === id);
    if (!client) throw new Error('Client not found');
    return { ...client };
  },
  addClient: async (client: Omit<ClientRecord, 'id' | 'invoiceId' | 'galleryLink' | 'date'>): Promise<ClientRecord> => {
    await delay(800);
    const id = `c${Date.now()}`;
    const count = String(clientDB.length + 1).padStart(4, '0');
    const newClient: ClientRecord = {
      ...client,
      id,
      invoiceId: `INV-${count}`,
      galleryLink: `/gallery/${id}`,
      date: new Date().toISOString(),
    };
    clientDB.push(newClient);
    return newClient;
  },
  updateClient: async (id: string, updates: Partial<ClientRecord>): Promise<ClientRecord> => {
    await delay(500);
    const index = clientDB.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Client not found');
    clientDB[index] = { ...clientDB[index], ...updates };
    return { ...clientDB[index] };
  },
  uploadPhotos: async (id: string, photoUrls: string[]): Promise<ClientRecord> => {
    await delay(800);
    const index = clientDB.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Client not found');
    clientDB[index] = { ...clientDB[index], photos: photoUrls, orderStatus: 'Ready' };
    return { ...clientDB[index] };
  },

  // PAYMENTS
  getPayments: async (): Promise<Payment[]> => {
    await delay(400);
    return clientDB.map(c => ({
      id: `p_${c.id}`,
      clientName: c.clientName,
      staffName: c.staffName,
      amount: c.price,
      paymentStatus: c.paymentStatus,
      date: c.date,
      invoiceId: c.invoiceId,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
};
