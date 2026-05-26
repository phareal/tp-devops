export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  quantity: number;
  product: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl' | 'stock'>;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: Pick<Product, 'id' | 'name' | 'imageUrl'>;
}

export interface Order {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
