import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { authApi, productApi, cartApi, orderApi } from './services/api';
import type { User, Product, Cart, Order, Pagination } from './types';

// ─── Auth Context ──────────────────────────────────────────────────────────
interface AuthCtx { user: User | null; login: (u: User, t: string) => void; logout: () => void; }
const AuthContext = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} });
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then((r) => setUser(r.data.data.user))
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  const login = (u: User, t: string) => { localStorage.setItem('token', t); setUser(u); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ background: '#1e293b', color: 'white', padding: '12px 0' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>🛒 E-Commerce</Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/products" style={{ color: '#94a3b8' }}>Produits</Link>
          {user ? (
            <>
              <Link to="/cart" style={{ color: '#94a3b8' }}>Panier</Link>
              <Link to="/orders" style={{ color: '#94a3b8' }}>Commandes</Link>
              {user.role === 'ADMIN' && <Link to="/admin" style={{ color: '#fbbf24' }}>Admin</Link>}
              <button onClick={logout} className="btn-secondary" style={{ padding: '4px 12px' }}>
                {user.firstName} — Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#94a3b8' }}>Connexion</Link>
              <Link to="/register"><button className="btn-primary">Inscription</button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Home ──────────────────────────────────────────────────────────────────
function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 16px' }}>
      <h1 style={{ fontSize: 48, marginBottom: 16 }}>Bienvenue sur E-Commerce</h1>
      <p style={{ color: '#64748b', fontSize: 18, marginBottom: 32 }}>
        Projet Bachelor 3 DevOps — Stack complète Node.js + React + AWS ECS
      </p>
      <Link to="/products"><button className="btn-primary" style={{ padding: '12px 32px', fontSize: 16 }}>
        Découvrir nos produits
      </button></Link>
    </div>
  );
}

// ─── Products ──────────────────────────────────────────────────────────────
function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    productApi.categories().then((r) => setCategories(r.data.data.categories));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 8 };
    if (search) params.search = search;
    if (category) params.category = category;
    productApi.list(params)
      .then((r) => { setProducts(r.data.data.products); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, search, category]);

  const addToCart = async (productId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    await cartApi.add(productId);
    alert('Ajouté au panier!');
  };

  return (
    <div className="container" style={{ padding: '32px 16px' }}>
      <h2 style={{ marginBottom: 24 }}>Nos produits</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input placeholder="Rechercher..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 300 }} />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={{ maxWidth: 200 }}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <p>Chargement...</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {products.map((p) => (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 48 }}>📦</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>{p.category}</span>
                <h3 style={{ fontSize: 15 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: '#64748b', flexGrow: 1 }}>{p.description.slice(0, 80)}...</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#2563eb', fontSize: 18 }}>{Number(p.price).toFixed(2)} €</span>
                  <span style={{ fontSize: 12, color: p.stock > 0 ? '#16a34a' : '#dc2626' }}>
                    {p.stock > 0 ? `Stock: ${p.stock}` : 'Rupture'}
                  </span>
                </div>
                <button className="btn-primary" disabled={p.stock === 0} onClick={() => addToCart(p.id)}>
                  Ajouter au panier
                </button>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32 }}>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary">← Précédent</button>
              <span style={{ padding: '8px 16px' }}>Page {page} / {pagination.pages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages} className="btn-secondary">Suivant →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Login ─────────────────────────────────────────────────────────────────
function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.login(form);
      login(res.data.data.user, res.data.data.token);
      window.location.href = '/products';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 16 }}>
      <div className="card">
        <h2 style={{ marginBottom: 24 }}>Connexion</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Mot de passe" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary">Se connecter</button>
          <p style={{ textAlign: 'center', fontSize: 13 }}>
            Pas de compte ? <Link to="/register" style={{ color: '#2563eb' }}>S'inscrire</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Register ──────────────────────────────────────────────────────────────
function Register() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.register(form);
      login(res.data.data.user, res.data.data.token);
      window.location.href = '/products';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur inscription');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 16 }}>
      <div className="card">
        <h2 style={{ marginBottom: 24 }}>Créer un compte</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Prénom" value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <input placeholder="Nom" value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <input type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Mot de passe (8 caractères min)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary">S'inscrire</button>
        </form>
      </div>
    </div>
  );
}

// ─── Cart ──────────────────────────────────────────────────────────────────
function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  const loadCart = () => {
    cartApi.get().then((r) => setCart(r.data.data.cart)).finally(() => setLoading(false));
  };

  useEffect(loadCart, []);

  const removeItem = async (itemId: string) => {
    await cartApi.remove(itemId);
    loadCart();
  };

  const checkout = async () => {
    setOrdering(true);
    try {
      await orderApi.create();
      alert('Commande passée avec succès!');
      window.location.href = '/orders';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: 32 }}>Chargement...</div>;

  return (
    <div className="container" style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 24 }}>Mon panier</h2>
      {!cart?.items?.length ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#64748b', marginBottom: 16 }}>Votre panier est vide</p>
          <Link to="/products"><button className="btn-primary">Continuer les achats</button></Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cart.items.map((item) => (
              <div key={item.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 40 }}>📦</span>
                <div style={{ flexGrow: 1 }}>
                  <p style={{ fontWeight: 600 }}>{item.product.name}</p>
                  <p style={{ color: '#64748b', fontSize: 13 }}>Qté: {item.quantity}</p>
                </div>
                <p style={{ fontWeight: 700, color: '#2563eb' }}>
                  {(Number(item.product.price) * item.quantity).toFixed(2)} €
                </p>
                <button className="btn-danger" style={{ padding: '4px 10px' }} onClick={() => removeItem(item.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="card" style={{ alignSelf: 'start' }}>
            <h3 style={{ marginBottom: 16 }}>Récapitulatif</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Sous-total</span>
              <span>{Number(cart.total).toFixed(2)} €</span>
            </div>
            <hr style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
              <span>Total</span>
              <span>{Number(cart.total).toFixed(2)} €</span>
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: 12 }}
              onClick={checkout} disabled={ordering}>
              {ordering ? 'Traitement...' : 'Passer la commande'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Orders ────────────────────────────────────────────────────────────────
function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    orderApi.list().then((r) => setOrders(r.data.data.orders));
  }, []);

  const statusColors: Record<string, string> = {
    PENDING: '#f59e0b', CONFIRMED: '#3b82f6', SHIPPED: '#8b5cf6',
    DELIVERED: '#10b981', CANCELLED: '#ef4444',
  };

  return (
    <div className="container" style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 24 }}>Mes commandes</h2>
      {orders.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucune commande pour l'instant.</p>
      ) : orders.map((order) => (
        <div key={order.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>Commande #{order.id.slice(0, 8)}</span>
            <span style={{ background: statusColors[order.status] + '22', color: statusColors[order.status],
              padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
              {order.status}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            {new Date(order.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
          </p>
          <p style={{ fontWeight: 700, color: '#2563eb' }}>{Number(order.totalAmount).toFixed(2)} €</p>
        </div>
      ))}
    </div>
  );
}

// ─── Protected Route ───────────────────────────────────────────────────────
function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Protected><CartPage /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
