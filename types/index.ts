export type ProductCategory = 'Ayam' | 'Paket' | 'Promo' | 'Makanan' | 'Minuman' | 'Lainnya';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  icon_or_image_url?: string | null;
  created_at?: string;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  created_at?: string;
}

export interface InventoryLog {
  id: string;
  item_id: string;
  change_qty: number;
  type: 'in' | 'out' | 'opname';
  cost_total: number;
  payment_source: 'drawer' | 'other';
  created_at?: string;
  item?: InventoryItem;
}

export interface FryingLog {
  id: string;
  fried_at: string;
  piece_count: number;
  note?: string | null;
  created_at?: string;
}

export interface Transaction {
  id: string;
  receipt_no: string;
  total_amount: number;
  payment_method: 'cash' | 'qris';
  cash_received: number;
  cash_change: number;
  status: string;
  cashier_name?: string;
  created_at?: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id?: string;
  transaction_id?: string;
  product_name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface CashDrawer {
  id: string;
  opened_at: string;
  initial_cash: number;
  actual_cash?: number | null;
  expected_cash?: number | null;
  cash_difference?: number | null;
  closed_at?: string | null;
  status: 'open' | 'closed';
}

export interface StoreSettings {
  id?: string;
  store_name: string;
  address?: string | null;
  whatsapp_number?: string | null;
  receipt_footer?: string | null;
  qris_mode: 'static' | 'dynamic';
  qris_static_image_url?: string | null;
  admin_pin: string;
  updated_at?: string;
}

export interface CartAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  selectedAddons?: CartAddon[];
  note?: string;
}

export interface CashierSession {
  name: string;
  loggedInAt: string;
}

export interface CashierUser {
  id: string;
  name: string;
  pin: string; // PIN atau Password
  role: 'cashier' | 'admin';
  is_active: boolean;
  created_at?: string;
}

export interface CashierActivityLog {
  id: string;
  cashier_name: string;
  action: 'login' | 'sale' | 'open_drawer' | 'close_drawer';
  details?: string;
  receipt_no?: string;
  amount?: number;
  created_at: string;
}

