export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle: string;
  plate: string;
}

export interface Employee {
  id: string;
  name: string;
  baseSalary: number;
  commissionRate: number; // Percentage (e.g., 10 for 10%)
  role: string;
  phone: string;
  active: boolean;
}

export interface Part {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export type UserRole = 'admin' | 'receptionist' | 'mechanic';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  employeeId?: string; // Link to Employee if mechanic
  profileImage?: string;
  active: boolean;
}

export type PaymentMethod = 'cash' | 'card_debit' | 'card_credit' | 'pix';
export type ServiceType = 'mechanical' | 'electrical' | 'suspension' | 'brakes' | 'engine' | 'other';

export interface Checklist {
  fuelLevel: number; // 0-100
  mileage: number;
  scratches: string;
  valuables: string;
}

export interface ServiceOrder {
  id: string;
  entryDate: string; // ISO string with time
  exitDate?: string; // ISO string with time
  customerId: string;
  employeeId: string;
  serviceType: ServiceType;
  description: string;
  notes?: string;
  laborValue: number;
  parts: { partId: string; quantity: number; priceAtTime: number }[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  paymentMethod?: PaymentMethod;
  installments?: number;
  checklist?: Checklist;
  warrantyUntil?: string; // ISO string
  images?: string[]; // URLs
}

export interface MonthlyExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string; // ISO string
  category: string;
  isPaid: boolean;
}

export interface WorkshopInfo {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
}

export const CATEGORIES: Category[] = [
  { id: 'service', name: 'Serviços', color: '#10b981', icon: 'Wrench' },
  { id: 'parts_sale', name: 'Venda de Peças', color: '#3b82f6', icon: 'Package' },
  { id: 'rent', name: 'Aluguel', color: '#f59e0b', icon: 'Home' },
  { id: 'salary', name: 'Salários', color: '#ef4444', icon: 'Users' },
  { id: 'utilities', name: 'Contas Fixas', color: '#8b5cf6', icon: 'Zap' },
  { id: 'marketing', name: 'Marketing', color: '#ec4899', icon: 'Megaphone' },
  { id: 'other', name: 'Outros', color: '#94a3b8', icon: 'MoreHorizontal' },
];
