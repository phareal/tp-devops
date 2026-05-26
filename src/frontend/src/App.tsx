import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
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
    if (token) authApi.me().then((r) => setUser(r.data.data.user)).catch(() => localStorage.removeItem('token'));
  }, []);
  const login = (u: User, t: string) => { localStorage.setItem('token', t); setUser(u); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

// ─── Stars ────────────────────────────────────────────────────────────────
function Stars({ n = 4.5 }: { n?: number }) {
  const full = Math.floor(n);
  const half = n % 1 >= 0.5;
  return (
    <span className="amz-stars">
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      <span className="amz-stars-count">{(Math.floor(Math.random() * 4000) + 200).toLocaleString()}</span>
    </span>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <>
      <nav className="amz-navbar">
        {/* Logo */}
        <Link to="/" className="amz-logo">
          <span className="amz-logo-top">amazon</span>
          <span className="amz-logo-brand">E-Shop<span>.fr</span></span>
        </Link>

        {/* Delivery location */}
        <div className="amz-location">
          <span className="amz-location-top">📍 Livrer à</span>
          <span className="amz-location-main">France</span>
        </div>

        {/* Search */}
        <form className="amz-search" onSubmit={handleSearch}>
          <select className="amz-search-cat">
            <option>Tout</option>
            <option>Électronique</option>
            <option>Vêtements</option>
            <option>Livres</option>
          </select>
          <input
            className="amz-search-input"
            placeholder="Rechercher des produits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="amz-search-btn">🔍</button>
        </form>

        {/* Account */}
        {user ? (
          <div className="amz-nav-item" onClick={logout}>
            <span className="amz-nav-item-top">Bonjour, {user.firstName}</span>
            <span className="amz-nav-item-main">Compte ▾</span>
          </div>
        ) : (
          <Link to="/login" className="amz-nav-item">
            <span className="amz-nav-item-top">Bonjour, identifiez-vous</span>
            <span className="amz-nav-item-main">Compte &amp; Listes ▾</span>
          </Link>
        )}

        {/* Orders */}
        <Link to={user ? '/orders' : '/login'} className="amz-nav-item">
          <span className="amz-nav-item-top">Retours</span>
          <span className="amz-nav-item-main">&amp; Commandes</span>
        </Link>

        {/* Cart */}
        <Link to={user ? '/cart' : '/login'} className="amz-cart-nav">
          <div className="amz-cart-icon-wrap">
            🛒
            <span className="amz-cart-count">0</span>
          </div>
          <span className="amz-cart-label">Panier</span>
        </Link>
      </nav>

      {/* Sub-nav */}
      <div className="amz-subnav">
        <span className="amz-subnav-item bold">☰ Toutes les catégories</span>
        <Link to="/products" className="amz-subnav-item">Ventes Flash</Link>
        <Link to="/products" className="amz-subnav-item">Nouveautés</Link>
        <Link to="/products" className="amz-subnav-item">Électronique</Link>
        <Link to="/products" className="amz-subnav-item">Mode</Link>
        <Link to="/products" className="amz-subnav-item">Maison &amp; Jardin</Link>
        <Link to="/products" className="amz-subnav-item">Sport</Link>
        <Link to="/products" className="amz-subnav-item">Livres</Link>
        <span className="amz-subnav-item" style={{ color: '#ffa41c' }}>🔥 Offres du jour</span>
      </div>
    </>
  );
}

// ─── Home ──────────────────────────────────────────────────────────────────
function Home() {
  const categories = [
    { icon: '💻', title: 'Électronique', sub: 'Smartphones, PC, TV' },
    { icon: '👕', title: 'Mode', sub: 'Vêtements, Chaussures' },
    { icon: '🏠', title: 'Maison', sub: 'Déco, Cuisine, Jardin' },
    { icon: '📚', title: 'Livres', sub: 'Romans, BD, Scolaire' },
    { icon: '⚽', title: 'Sport', sub: 'Fitness, Outdoor, Vélo' },
    { icon: '🎮', title: 'Jeux vidéo', sub: 'Consoles, Jeux, Accessoires' },
    { icon: '🍳', title: 'Cuisine', sub: 'Ustensiles, Électroménager' },
    { icon: '💄', title: 'Beauté', sub: 'Soins, Parfums, Maquillage' },
  ];

  return (
    <>
      {/* Hero */}
      <div className="amz-page">
        <div className="amz-hero">
          <div className="amz-hero-badge">⚡ Offres du jour</div>
          <h1>Bienvenue sur E-Shop.fr</h1>
          <p>
            Des milliers de produits livrés rapidement.<br />
            Projet Bachelor 3 DevOps — Node.js · React · AWS ECS
          </p>
          <div className="amz-hero-cta">
            <Link to="/products">
              <button className="amz-btn amz-btn-primary" style={{ padding: '10px 28px', fontSize: 15, borderRadius: 4 }}>
                Découvrir nos produits
              </button>
            </Link>
            <Link to="/register">
              <button className="amz-btn amz-btn-secondary" style={{ padding: '10px 28px', fontSize: 15, borderRadius: 4 }}>
                Créer un compte
              </button>
            </Link>
          </div>
        </div>

        {/* Deal banner */}
        <div className="amz-deal-banner">
          <div className="amz-deal-title">🔥 Ventes Flash — Offres à durée limitée</div>
          <div className="amz-deal-sub">Voir toutes les offres →</div>
        </div>

        {/* Category grid */}
        <div className="amz-section-header">
          <span className="amz-section-title">Acheter par catégorie</span>
          <Link to="/products" className="amz-section-see-all">Voir tout →</Link>
        </div>
        <div className="amz-cat-grid">
          {categories.map((c) => (
            <Link to="/products" key={c.title}>
              <div className="amz-cat-card">
                <div className="amz-cat-card-icon">{c.icon}</div>
                <div className="amz-cat-card-title">{c.title}</div>
                <div className="amz-cat-card-sub">{c.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Prime banner */}
        <div style={{ background: 'linear-gradient(90deg,#00a8e0,#0066c0)', borderRadius: 4, padding: '20px 28px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🚀 E-Shop Prime</div>
            <div style={{ fontSize: 14, opacity: .9 }}>Livraison gratuite, illimitée · Offres exclusives · Streaming inclus</div>
          </div>
          <Link to="/register">
            <button className="amz-btn amz-btn-primary" style={{ borderRadius: 4, padding: '10px 24px' }}>Essai gratuit 30 jours</button>
          </Link>
        </div>
      </div>

      <Footer />
    </>
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
  const [addedId, setAddedId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    productApi.categories().then((r) => setCategories(r.data.data.categories));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 12 };
    if (search) params.search = search;
    if (category) params.category = category;
    productApi.list(params)
      .then((r) => { setProducts(r.data.data.products); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, search, category]);

  const addToCart = async (productId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    await cartApi.add(productId);
    setAddedId(productId);
    setTimeout(() => setAddedId(null), 2000);
  };

  const fakeStars = (id: string) => 3.5 + (id.charCodeAt(0) % 15) / 10;
  const fakeEmoji = (cat: string) => {
    const map: Record<string, string> = {
      électronique: '💻', mode: '👕', maison: '🏠', livres: '📚',
      sport: '⚽', cuisine: '🍳', beauté: '💄', jeux: '🎮',
    };
    return map[cat?.toLowerCase()] ?? '📦';
  };

  return (
    <>
      <div className="amz-page">
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: '#007185', marginBottom: 12 }}>
          <Link to="/">Accueil</Link> › <span style={{ color: '#565959' }}>Tous les produits</span>
          {category && <> › <span style={{ color: '#565959' }}>{category}</span></>}
        </div>

        <div className="amz-two-col">
          {/* Sidebar */}
          <aside className="amz-sidebar">
            <div className="amz-sidebar-box">
              <div className="amz-sidebar-title">Département</div>
              <span className={`amz-sidebar-link${!category ? ' active' : ''}`}
                onClick={() => { setCategory(''); setPage(1); }}>
                Tous les produits
              </span>
              {categories.map((c) => (
                <span key={c}
                  className={`amz-sidebar-link${category === c ? ' active' : ''}`}
                  onClick={() => { setCategory(c); setPage(1); }}>
                  {c}
                </span>
              ))}
            </div>

            <div className="amz-sidebar-box">
              <div className="amz-sidebar-title">Note client</div>
              {[4, 3, 2].map((r) => (
                <div key={r} className="amz-sidebar-link" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ color: '#ffa41c' }}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
                  <span style={{ fontSize: 12 }}>&amp; plus</span>
                </div>
              ))}
            </div>

            <div className="amz-sidebar-box">
              <div className="amz-sidebar-title">Livraison</div>
              <div className="amz-sidebar-link">🚀 Prime</div>
              <div className="amz-sidebar-link">🆓 Livraison gratuite</div>
            </div>

            <div className="amz-sidebar-box">
              <div className="amz-sidebar-title">Prix</div>
              {['Moins de 25 €', '25 € – 50 €', '50 € – 100 €', 'Plus de 100 €'].map((r) => (
                <div key={r} className="amz-sidebar-link">{r}</div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Filter bar */}
            <div className="amz-filter-bar">
              <input
                placeholder="🔍 Rechercher dans les résultats..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ maxWidth: 320 }}
              />
              <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                style={{ maxWidth: 200 }}>
                <option value="">Toutes catégories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="amz-results-count">
                {pagination ? `${pagination.total} résultats` : ''}
                {search && ` pour "${search}"`}
              </span>
            </div>

            {addedId && (
              <div className="amz-alert amz-alert-success">✅ Produit ajouté au panier !</div>
            )}

            {loading ? (
              <div className="amz-loading"><span className="amz-spinner">⟳</span> Chargement...</div>
            ) : products.length === 0 ? (
              <div className="amz-empty">
                <div className="amz-empty-icon">🔍</div>
                <div className="amz-empty-title">Aucun résultat trouvé</div>
                <div className="amz-empty-sub">Essayez d'autres termes de recherche</div>
              </div>
            ) : (
              <>
                <div className="amz-product-grid">
                  {products.map((p) => {
                    const stars = fakeStars(p.id);
                    const emoji = fakeEmoji(p.category);
                    const priceParts = Number(p.price).toFixed(2).split('.');
                    const stockLow = p.stock > 0 && p.stock <= 5;

                    return (
                      <div key={p.id} className="amz-product-card">
                        <div className="amz-product-img">{emoji}</div>
                        <div className="amz-product-cat">{p.category}</div>
                        <div className="amz-product-name">{p.name}</div>
                        <Stars n={stars} />
                        <div className="amz-prime-badge">✈ Prime</div>
                        <div className="amz-price-block">
                          <span className="amz-price-symbol">€</span>
                          <span className="amz-price-whole">{priceParts[0]}</span>
                          <span className="amz-price-symbol">{priceParts[1]}</span>
                        </div>
                        <div className="amz-delivery">Livraison GRATUITE demain</div>
                        {p.stock === 0 ? (
                          <div className="amz-stock-out">Rupture de stock</div>
                        ) : stockLow ? (
                          <div className="amz-stock-low">⚠ Plus que {p.stock} en stock</div>
                        ) : (
                          <div className="amz-stock-ok">En stock</div>
                        )}
                        <button
                          className="amz-btn amz-btn-primary amz-btn-full"
                          style={{ borderRadius: 4, marginTop: 4 }}
                          disabled={p.stock === 0}
                          onClick={() => addToCart(p.id)}
                        >
                          {p.stock === 0 ? 'Indisponible' : 'Ajouter au panier'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {pagination && pagination.pages > 1 && (
                  <div className="amz-pagination">
                    <button className="amz-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Préc.</button>
                    {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map((n) => (
                      <button key={n} className={`amz-page-btn${n === page ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                    ))}
                    <button className="amz-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages}>Suiv. →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

// ─── Login ─────────────────────────────────────────────────────────────────
function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form);
      login(res.data.data.user, res.data.data.token);
      window.location.href = '/products';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--amz-bg)', minHeight: 'calc(100vh - 98px)', padding: '20px 0' }}>
      <div className="amz-auth-wrap">
        <div className="amz-auth-logo">E-Shop<span>.fr</span></div>
        <div className="amz-auth-box">
          <h1 className="amz-auth-title">Connexion</h1>
          <form onSubmit={submit}>
            {error && <div className="amz-auth-error">⚠ {error}</div>}
            <label className="amz-auth-label">Adresse e-mail</label>
            <input type="email" className="amz-auth-input" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <label className="amz-auth-label">Mot de passe</label>
            <input type="password" className="amz-auth-input" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="submit" className="amz-btn amz-btn-primary amz-btn-full"
              style={{ borderRadius: 4, padding: '9px', marginBottom: 12, marginTop: 4 }}
              disabled={loading}>
              {loading ? '⟳ Connexion...' : 'Se connecter'}
            </button>
            <div style={{ fontSize: 12, color: 'var(--amz-muted)' }}>
              En vous connectant, vous acceptez les <a href="#" style={{ color: 'var(--amz-link)' }}>Conditions d'utilisation</a>.
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0', color: 'var(--amz-muted)', fontSize: 12 }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #ccc' }} />
          Nouveau sur E-Shop ?
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #ccc' }} />
        </div>

        <div className="amz-auth-new-box">
          <h4>Créer un compte E-Shop</h4>
          <Link to="/register">
            <button className="amz-btn amz-btn-secondary amz-btn-full" style={{ borderRadius: 4 }}>
              Créer votre compte E-Shop
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Register ──────────────────────────────────────────────────────────────
function Register() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(form);
      login(res.data.data.user, res.data.data.token);
      window.location.href = '/products';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--amz-bg)', minHeight: 'calc(100vh - 98px)', padding: '20px 0' }}>
      <div className="amz-auth-wrap">
        <div className="amz-auth-logo">E-Shop<span>.fr</span></div>
        <div className="amz-auth-box">
          <h1 className="amz-auth-title">Créer un compte</h1>
          <form onSubmit={submit}>
            {error && <div className="amz-auth-error">⚠ {error}</div>}
            <label className="amz-auth-label">Votre nom</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
              <input className="amz-auth-input" placeholder="Prénom" value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <input className="amz-auth-input" placeholder="Nom" value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            <label className="amz-auth-label">Adresse e-mail</label>
            <input type="email" className="amz-auth-input" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <label className="amz-auth-label">Mot de passe</label>
            <input type="password" className="amz-auth-input" placeholder="Au moins 8 caractères"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              required minLength={8} />
            <div style={{ fontSize: 11, color: 'var(--amz-muted)', marginBottom: 10, marginTop: -6 }}>
              Les mots de passe doivent comporter au moins 8 caractères.
            </div>
            <button type="submit" className="amz-btn amz-btn-primary amz-btn-full"
              style={{ borderRadius: 4, padding: '9px', marginBottom: 12 }}
              disabled={loading}>
              {loading ? '⟳ Création...' : 'Créer votre compte E-Shop'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--amz-muted)' }}>
              En créant un compte, vous acceptez les <a href="#" style={{ color: 'var(--amz-link)' }}>Conditions d'utilisation</a> et la <a href="#" style={{ color: 'var(--amz-link)' }}>Politique de confidentialité</a>.
            </div>
          </form>
          <hr className="amz-auth-divider" />
          <div style={{ fontSize: 13 }}>
            Vous avez déjà un compte ? <Link to="/login" style={{ color: 'var(--amz-link)' }}>Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cart ──────────────────────────────────────────────────────────────────
function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadCart = () => {
    cartApi.get().then((r) => setCart(r.data.data.cart)).finally(() => setLoading(false));
  };
  useEffect(loadCart, []);

  const removeItem = async (itemId: string) => { await cartApi.remove(itemId); loadCart(); };

  const checkout = async () => {
    setOrdering(true);
    try {
      await orderApi.create();
      setSuccess(true);
      setTimeout(() => { window.location.href = '/orders'; }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="amz-loading amz-page"><span className="amz-spinner">⟳</span> Chargement...</div>;

  return (
    <>
      <div className="amz-page">
        {success && <div className="amz-alert amz-alert-success">✅ Commande passée ! Redirection vers vos commandes...</div>}
        <h1 className="amz-cart-page-title">🛒 Panier</h1>

        {!cart?.items?.length ? (
          <div className="amz-empty">
            <div className="amz-empty-icon">🛒</div>
            <div className="amz-empty-title">Votre panier E-Shop est vide</div>
            <div className="amz-empty-sub">Vous n'avez aucun article dans votre panier.</div>
            <Link to="/products">
              <button className="amz-btn amz-btn-primary" style={{ borderRadius: 4, padding: '9px 20px' }}>
                Continuer vos achats
              </button>
            </Link>
          </div>
        ) : (
          <div className="amz-two-col" style={{ alignItems: 'flex-start' }}>
            {/* Items */}
            <div style={{ flex: 1, background: 'white', border: '1px solid var(--amz-border)', borderRadius: 4, padding: '16px 24px' }}>
              <div style={{ fontSize: 18, fontWeight: 400, marginBottom: 4, borderBottom: '1px solid var(--amz-border)', paddingBottom: 12 }}>
                Votre panier
              </div>
              {cart.items.map((item) => (
                <div key={item.id} className="amz-cart-item">
                  <div className="amz-cart-item-img">📦</div>
                  <div style={{ flex: 1 }}>
                    <div className="amz-cart-item-name">{item.product.name}</div>
                    <div className="amz-cart-item-meta">✈ Prime · Livraison GRATUITE demain</div>
                    <div style={{ fontSize: 12, color: 'var(--amz-green)' }}>En stock</div>
                    <div className="amz-cart-item-actions">
                      <span style={{ border: '1px solid var(--amz-border)', borderRadius: 4, padding: '2px 10px', fontSize: 13 }}>
                        Qté : {item.quantity}
                      </span>
                      <span style={{ color: '#ccc' }}>|</span>
                      <button className="amz-cart-item-del" onClick={() => removeItem(item.id)}>Supprimer</button>
                      <span style={{ color: '#ccc' }}>|</span>
                      <span style={{ color: 'var(--amz-link)', cursor: 'pointer', fontSize: 13 }}>Enregistrer pour plus tard</span>
                    </div>
                  </div>
                  <div className="amz-cart-item-price">
                    {(Number(item.product.price) * item.quantity).toFixed(2)} €
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'right', padding: '12px 0', fontSize: 18 }}>
                Sous-total ({cart.items.length} article{cart.items.length > 1 ? 's' : ''}) :
                <strong> {Number(cart.total).toFixed(2)} €</strong>
              </div>
            </div>

            {/* Summary */}
            <div className="amz-order-summary">
              <div className="amz-free-shipping">✈ Votre commande est éligible à la <strong>livraison GRATUITE</strong>.</div>
              <div className="amz-order-summary-title">
                Sous-total ({cart.items.length} article{cart.items.length > 1 ? 's' : ''}) :
                <strong style={{ display: 'block', fontSize: 22 }}>{Number(cart.total).toFixed(2)} €</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13 }}>
                <input type="checkbox" id="gift" />
                <label htmlFor="gift">Il s'agit d'un cadeau</label>
              </div>
              <button
                className="amz-btn amz-btn-primary amz-btn-full"
                style={{ borderRadius: 4, padding: '10px', fontSize: 14, marginBottom: 8 }}
                onClick={checkout}
                disabled={ordering}
              >
                {ordering ? '⟳ Traitement...' : 'Passer la commande'}
              </button>
              <hr className="amz-order-summary" style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />
              <div className="amz-order-summary-row" style={{ fontSize: 12, color: 'var(--amz-muted)' }}>
                <span>Livraison estimée</span><span style={{ color: 'var(--amz-green)' }}>Gratuite</span>
              </div>
              <div className="amz-order-summary-row amz-order-summary-total" style={{ marginTop: 8 }}>
                <span>Total</span><span>{Number(cart.total).toFixed(2)} €</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

// ─── Orders ────────────────────────────────────────────────────────────────
function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.list().then((r) => setOrders(r.data.data.orders)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="amz-loading amz-page"><span className="amz-spinner">⟳</span> Chargement...</div>;

  return (
    <>
      <div className="amz-page">
        <div style={{ fontSize: 12, color: '#007185', marginBottom: 12 }}>
          <Link to="/">Accueil</Link> › <span style={{ color: '#565959' }}>Compte</span> › <span style={{ color: '#565959' }}>Commandes</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 400, marginBottom: 20 }}>Mes commandes</h1>

        {orders.length === 0 ? (
          <div className="amz-empty">
            <div className="amz-empty-icon">📦</div>
            <div className="amz-empty-title">Vous n'avez pas encore passé de commande</div>
            <div className="amz-empty-sub">Commencez vos achats et retrouvez votre historique ici.</div>
            <Link to="/products">
              <button className="amz-btn amz-btn-primary" style={{ borderRadius: 4, padding: '9px 20px' }}>Commencer vos achats</button>
            </Link>
          </div>
        ) : (
          <div style={{ maxWidth: 900 }}>
            {orders.map((order) => (
              <div key={order.id} className="amz-order-card">
                <div className="amz-order-card-header">
                  <div className="amz-order-card-header-item">
                    <span className="amz-order-card-header-label">Commande passée le</span>
                    <span className="amz-order-card-header-value">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                    </span>
                  </div>
                  <div className="amz-order-card-header-item">
                    <span className="amz-order-card-header-label">Total</span>
                    <span className="amz-order-card-header-value">{Number(order.totalAmount).toFixed(2)} €</span>
                  </div>
                  <div className="amz-order-card-header-item">
                    <span className="amz-order-card-header-label">Livrer à</span>
                    <span className="amz-order-card-header-value">Adresse principale</span>
                  </div>
                  <div className="amz-order-card-header-id">
                    Commande n° {order.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
                <div className="amz-order-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 32 }}>📦</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                        <span className={`amz-order-status amz-order-status-${order.status}`}>{order.status}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--amz-muted)' }}>
                        Montant total : <strong>{Number(order.totalAmount).toFixed(2)} €</strong>
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <button className="amz-btn amz-btn-secondary" style={{ borderRadius: 4, fontSize: 12 }}>Voir détails</button>
                      <button className="amz-btn amz-btn-secondary" style={{ borderRadius: 4, fontSize: 12 }}>Acheter à nouveau</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <>
      <div className="amz-footer-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        Retour en haut de page ↑
      </div>
      <footer className="amz-footer">
        <div className="amz-footer-grid">
          <div>
            <div className="amz-footer-col-title">Acheter avec nous</div>
            <a className="amz-footer-col-link">Nouveau sur E-Shop ?</a>
            <a className="amz-footer-col-link">E-Shop Business</a>
            <a className="amz-footer-col-link">E-Shop Prime</a>
            <a className="amz-footer-col-link">Livraison gratuite</a>
          </div>
          <div>
            <div className="amz-footer-col-title">Gagnez de l'argent avec nous</div>
            <a className="amz-footer-col-link">Vendre sur E-Shop</a>
            <a className="amz-footer-col-link">Devenir affilié</a>
            <a className="amz-footer-col-link">Devenez partenaire</a>
          </div>
          <div>
            <div className="amz-footer-col-title">Besoin d'aide ?</div>
            <a className="amz-footer-col-link">Centre d'aide</a>
            <a className="amz-footer-col-link">Suivi de commande</a>
            <a className="amz-footer-col-link">Retours &amp; remboursements</a>
            <a className="amz-footer-col-link">Nous contacter</a>
          </div>
          <div>
            <div className="amz-footer-col-title">Informations</div>
            <a className="amz-footer-col-link">À propos d'E-Shop</a>
            <a className="amz-footer-col-link">Recrutement</a>
            <a className="amz-footer-col-link">Données personnelles</a>
            <a className="amz-footer-col-link">Mentions légales</a>
          </div>
        </div>
        <div className="amz-footer-bottom">
          <div className="amz-footer-logo">E-Shop<span>.fr</span></div>
          <div>© 2024–2025 E-Shop.fr · Projet Bachelor 3 DevOps — Node.js · React · AWS ECS</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a style={{ color: '#888', fontSize: 12 }}>Conditions d'utilisation</a>
            <a style={{ color: '#888', fontSize: 12 }}>Politique de confidentialité</a>
            <a style={{ color: '#888', fontSize: 12 }}>Cookies</a>
          </div>
        </div>
      </footer>
    </>
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
