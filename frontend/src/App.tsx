import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Smartphone, Home, ChevronDown, Lock, MessageCircle, Mail, LogOut, ChevronRight,
  Activity, Twitter, Facebook, Rss, Sun, Moon, Search, Shield, CheckCircle,
  AlertCircle, Loader, PlusCircle, CreditCard, Clock, Package, Zap, Crown,
  Users, RefreshCw, X, TrendingUp, DollarSign
} from 'lucide-react';
import './App.css';

const API_URL = '';
const socket = io({ path: '/socket.io', transports: ['polling'] });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }
interface Subscription { id: number; user_id: number; plan: string; status: string; trial_ends_at?: string; current_period_end?: string; }
interface Plan { id: string; name: string; price: number; features: string[]; popular?: boolean; }
interface AdminUser { id: number; email: string; balance: number; role: string; plan?: string; sub_status?: string; trial_ends_at?: string; current_period_end?: string; }
interface Order { id: number; user_id: number; service_id: number; imei: string; status: string; date: string; service_name?: string; service_price?: number; service_category?: string; }
interface IMEICheckResult { success: boolean; reason?: string; result?: any; }

// ─── Splash Screen ────────────────────────────────────────────────────────────
const SplashScreen: React.FC<{ fading: boolean }> = ({ fading }) => (
  <div className={`splash-screen ${fading ? 'splash-fading' : ''}`}>
    <div className="splash-bg-glow" />
    <div className="splash-content">
      <div className="splash-ring">
        <div className="splash-ring-inner">
          <div className="splash-icon-wrap">
            <Smartphone color="#f97316" fill="#f97316" size={44} />
            <div className="splash-lock-dot"><Lock color="#fff" fill="#fff" size={14} /></div>
          </div>
        </div>
      </div>
      <div className="splash-brand">
        S&amp;J<span> UNLOCK</span>
      </div>
      <div className="splash-tagline">Enterprise Mobile Solutions</div>
      <div className="splash-progress-wrap">
        <div className="splash-progress-bar" />
      </div>
      <div className="splash-status">Initializing secure connection<span className="splash-dots">...</span></div>
    </div>
  </div>
);

// ─── Subscribe Page ───────────────────────────────────────────────────────────
const SubscribePage: React.FC<{
  plans: Plan[];
  subscription: Subscription | null;
  onSubscribe: (planId: string) => void;
  onLogout: () => void;
  loading: boolean;
  stripeEnabled: boolean;
}> = ({ plans, subscription, onSubscribe, onLogout, loading, stripeEnabled }) => {
  const PlanIcons = [Package, Zap, Crown];

  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const isExpired = subscription?.status === 'expired';

  return (
    <div className="subscribe-page">
      <div className="subscribe-header">
        <div className="subscribe-logo">
          <div className="splash-icon-wrap" style={{ position: 'relative', width: 36, height: 36, background: '#f97316', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone color="#fff" fill="#fff" size={20} />
          </div>
          <span style={{ fontWeight: 900, letterSpacing: 1 }}>S&amp;J<span style={{ color: '#64748b', fontWeight: 400 }}> UNLOCK</span></span>
        </div>
        <button
          onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div className="subscribe-body">
        <div className="subscribe-hero">
          {isExpired ? (
            <>
              <div className="sub-badge expired-badge">FREE TRIAL ENDED</div>
              <h1>Ready to keep unlocking?</h1>
              <p>Your {Math.round((new Date().getTime() - (trialEnd?.getTime() || 0)) / 86400000)} day trial has ended. Subscribe below to continue using all services.</p>
            </>
          ) : (
            <>
              <div className="sub-badge new-badge">ACCESS REQUIRED</div>
              <h1>Choose Your Plan</h1>
              <p>Get full access to IMEI unlocks, server tools, remote services and more.</p>
            </>
          )}
        </div>

        <div className="plans-grid">
          {plans.map((plan, i) => {
            const Icon = PlanIcons[i] || Package;
            return (
              <div key={plan.id} className={`plan-card ${plan.popular ? 'plan-popular' : ''}`}>
                {plan.popular && <div className="plan-popular-tag">⭐ MOST POPULAR</div>}
                <div className="plan-icon-wrap"><Icon size={30} /></div>
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price-row">
                  <span className="plan-dollar">$</span>
                  <span className="plan-price-num">{plan.price}</span>
                  <span className="plan-price-period">/mo</span>
                </div>
                <ul className="plan-feature-list">
                  {plan.features.map((f, fi) => (
                    <li key={fi}><CheckCircle size={13} color="#10b981" style={{ flexShrink: 0 }} /> {f}</li>
                  ))}
                </ul>
                <button
                  className={`plan-cta-btn ${plan.popular ? 'plan-cta-popular' : ''}`}
                  onClick={() => onSubscribe(plan.id)}
                  disabled={loading}
                >
                  {loading ? <Loader size={16} className="spinner" /> : stripeEnabled ? `Subscribe — $${plan.price}/mo` : `Contact Admin`}
                </button>
                {!stripeEnabled && (
                  <div className="plan-contact-hint">
                    <MessageCircle size={12} color="#22c55e" />
                    <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer">WhatsApp us to activate</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="subscribe-footer-note">
          <MessageCircle size={14} color="#22c55e" />
          <span>
            Questions? <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" style={{ color: '#22c55e' }}>WhatsApp</a>
            {' '}or{' '}
            <span style={{ color: '#6366f1' }}>saqlain.senior21@gmail.com</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Landing Page ────────────────────────────────────────────────────────────
const NewsletterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await axios.post(`${API_URL}/api/newsletter/subscribe`, { email, source: 'dashboard-footer' });
      setMsg(res.data.message || 'Subscribed!');
      setStatus('done');
      setEmail('');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed. Try again.');
      setStatus('error');
    }
  };

  if (status === 'done') return (
    <div style={{ color: '#10b981', fontSize: '0.9rem', padding: '0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)' }}>
      ✅ {msg}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
        style={{ padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none' }}
        required
      />
      <button
        type="submit"
        className="newsletter-btn"
        disabled={status === 'loading'}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        {status === 'loading' ? '...' : <><Mail size={15} /> Subscribe</>}
      </button>
      {status === 'error' && <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{msg}</div>}
    </form>
  );
};

const LandingPage: React.FC<{ onLogin: () => void; onRegister: () => void }> = ({ onLogin, onRegister }) => (
  <div className="landing-page">
    <header className="landing-header">
      <div className="landing-logo">
        <div className="landing-logo-icon">
          <Smartphone color="#fff" fill="#fff" size={22} />
          <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#ef4444', borderRadius: '50%', padding: 2 }}>
            <Lock color="#fff" size={10} fill="#fff" />
          </div>
        </div>
        <span style={{ letterSpacing: '1px' }}>S&amp;J<span style={{ color: '#94a3b8' }}> UNLOCK</span></span>
      </div>
      <nav className="landing-nav">
        <span className="landing-nav-link">Home</span>
        <div className="nav-item-container">
          <span className="landing-nav-link">Reseller Pricing <ChevronDown size={14} /></span>
        </div>
        <span className="landing-nav-link" onClick={onRegister}>Registration</span>
        <span className="landing-nav-link" style={{ color: '#fbbf24' }}>* Become a Supplier *</span>
        <button className="login-btn-yellow" onClick={onLogin}>
          <Lock size={16} fill="currentColor" /> Login
        </button>
      </nav>
    </header>

    <section className="hero-section">
      <h1 className="hero-title">S&amp;J UNLOCK Inc. — An exciting place to grow your business!</h1>
      <p style={{ marginTop: '1rem', color: '#c4b5fd', maxWidth: 600, margin: '1.5rem auto 0', lineHeight: 1.6 }}>
        Professional IMEI unlock, server tools, remote services &amp; firmware files. Trusted by resellers worldwide.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem' }}>
        <button className="login-btn-yellow" onClick={onRegister} style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }}>Start Free Trial</button>
        <button onClick={onLogin} style={{ padding: '0.9rem 2.5rem', fontSize: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
      </div>
    </section>

    <div className="notice-container">
      <div className="notice-title"><span>⚠️</span> IMPORTANT NOTICE <span>⚠️</span></div>
      <div className="notice-text">
        Our working days are <strong>Monday to Friday</strong> only.<br />
        <strong>Saturday and Sunday are holidays.</strong> Orders are processed on working days only.<br />
        Some payments are handled <strong>manually</strong>; please contact us via <span>WhatsApp</span> after payment for faster processing.
      </div>
      <div className="notice-links">
        <div className="notice-link-item">Any Queries: <span>WhatsApp</span></div>
        <div className="notice-link-item">Refund/Withdraw: <a href="#">Submit a Ticket</a></div>
        <div className="notice-link-item">Updates: <em>@S&amp;J_UNLOCK_Media</em></div>
      </div>
      <div className="address-section">
        <div className="address-line"><strong>USA:</strong> 4112 NW, 88TH AVE, Sunrise, Florida - United States</div>
        <div className="address-line"><strong>UAE:</strong> 409B-7 Al Asayel St, Business Bay. Dubai - United Arab Emirates</div>
      </div>
      <div className="footer-thanks">Thank you for choosing <strong>S&amp;J UNLOCK Server</strong>. We appreciate your trust and support!</div>
    </div>

    <footer className="landing-footer-main">
      <div className="footer-col">
        <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '2px solid #6366f1', display: 'inline-block', paddingBottom: '0.2rem' }}>S&amp;J UNLOCK INC.</div>
        <div className="social-icons">
          <Twitter className="social-icon" size={20} />
          <Facebook className="social-icon" size={20} />
          <Rss className="social-icon" size={20} />
        </div>
      </div>
      <div className="footer-col">
        <h4>Useful Links</h4>
        <ul><li>Contact Us</li><li>Discount Offer</li><li>News &amp; Update</li><li>Terms &amp; Conditions</li></ul>
      </div>
      <div className="footer-col">
        <h4>Subscribe</h4>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Don't miss our future updates! Get Subscribed now!</p>
        <NewsletterForm />
      </div>
      <div className="footer-col">
        <h4>Connect With Us</h4>
        <ul>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageCircle size={16} color="#22c55e" /> WhatsApp: +1 (876) 875-1969</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} color="#6366f1" /> eMail: saqlain.senior21@gmail.com</li>
        </ul>
      </div>
    </footer>
  </div>
);

// ─── Main App ────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminTab, setAdminTab] = useState<'orders' | 'users' | 'topups' | 'services' | 'newsletter'>('orders');
  const [adminServices, setAdminServices] = useState<any[]>([]);
  const [serviceIdEdits, setServiceIdEdits] = useState<Record<number, string>>({});
  const [sickwServices, setSickwServices] = useState<any[]>([]);
  const [sickwBalance, setSickwBalance] = useState<string | null>(null);
  const [sickwSyncing, setSickwSyncing] = useState(false);
  const [sickwLoading, setSickwLoading] = useState(false);
  const [selectedSickw, setSelectedSickw] = useState<Set<string>>(new Set());
  const [newsletterSubs, setNewsletterSubs] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [bcSubject, setBcSubject] = useState('');
  const [bcBody, setBcBody] = useState('');
  const [bcSending, setBcSending] = useState(false);
  const [globalMargin, setGlobalMargin] = useState<number>(0);
  const [marginInput, setMarginInput] = useState<string>('');
  const [marginSaving, setMarginSaving] = useState(false);
  const [gsmServerIdEdits, setGsmServerIdEdits] = useState<Record<number, string>>({});

  const [showAuth, setShowAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeService, setActiveService] = useState('Dashboard');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [imei, setImei] = useState('');
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'imei' | 'server' | 'all'>('all');

  // IMEI Check state
  const [imeiCheckInput, setImeiCheckInput] = useState('');
  const [imeiCheckResult, setImeiCheckResult] = useState<IMEICheckResult | null>(null);
  const [imeiCheckLoading, setImeiCheckLoading] = useState(false);
  const [checkServices, setCheckServices] = useState<any[]>([]);
  const [selectedCheckService, setSelectedCheckService] = useState<any>(null);
  const [payoneerInfo, setPayoneerInfo] = useState<{ email: string; link: string } | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupRef, setTopupRef] = useState('');
  const [topupStep, setTopupStep] = useState<'amount' | 'method' | 'pay' | 'done'>('amount');
  const [topupMethod, setTopupMethod] = useState<'payoneer' | 'wipay'>('wipay');
  const [topupLoading, setTopupLoading] = useState(false);
  const [_topupRequests, setTopupRequests] = useState<any[]>([]);
  const [adminTopups, setAdminTopups] = useState<any[]>([]);

  // Intel Mode State
  const [intelImei, setIntelImei] = useState('');
  const [intelSearch, setIntelSearch] = useState('');

  // Admin profit stats
  const [adminStats, setAdminStats] = useState<any>(null);

  // Admin user management state
  const [balanceInputs, setBalanceInputs] = useState<Record<number, string>>({});
  const [subDays, setSubDays] = useState<Record<number, string>>({});

  // Sidebar collapse state
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);

  // Hash-based auto-login (for testing: navigate to /#token=JWT)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const t = decodeURIComponent(hash.slice(7));
      localStorage.setItem('token', t);
      setToken(t);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // WiPay return handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const orderId = params.get('order');
    if (payment && orderId) {
      window.history.replaceState(null, '', window.location.pathname);
      if (payment === 'success') {
        showToast('Card payment received! Checking balance...', 'info');
        setTimeout(async () => {
          try {
            const t = localStorage.getItem('token');
            if (!t) return;
            const res = await axios.get(`${API_URL}/api/payment/wipay/status?order_id=${orderId}`, { headers: { Authorization: `Bearer ${t}` } });
            if (res.data.status === 'approved') {
              showToast(`$${res.data.amount.toFixed(2)} added to your balance!`, 'success');
              setUser((u: any) => u ? { ...u, balance: res.data.balance } : u);
            } else {
              showToast('Payment received — balance will be updated shortly.', 'info');
            }
          } catch { showToast('Payment processed. Refresh to see updated balance.', 'info'); }
        }, 2000);
      } else {
        showToast('Card payment was not completed. Please try again.', 'error');
      }
    }
  }, []);

  // Splash
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 2000);
    const t2 = setTimeout(() => setSplashVisible(false), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: { Authorization: `Bearer ${token}` }
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // Computed subscription state
  const subActive = user?.role === 'admin' || ['active', 'trial'].includes(user?.subscription?.status || '');
  const needsSub = !!token && !!user && !subActive;

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ordRes, profRes] = await Promise.all([api.get('/orders'), api.get('/user/profile')]);
      setOrders(ordRes.data);
      setUser(profRes.data);
      if (activeService !== 'Dashboard' && activeService !== 'Admin' && activeService !== 'History') {
        const typeMap: Record<string, string> = { 'IMEI Service': 'imei', 'Server Services': 'server', 'Remote Service': 'remote', 'File services': 'file' };
        const svcRes = await api.get(`/services?type=${typeMap[activeService] || 'server'}`);
        setServices(svcRes.data);
      }
      // Load SickW check services
      const chkRes = await api.get('/services?type=check');
      setCheckServices(chkRes.data);
      if (!selectedCheckService && chkRes.data.length > 0) setSelectedCheckService(chkRes.data[0]);
      // Load Payoneer info
      const payRes = await api.get('/topup/info');
      setPayoneerInfo(payRes.data);
      // Load user's own top-up history
      const myTopups = await api.get('/topup/my');
      setTopupRequests(myTopups.data);
    } catch (err: any) {
      if (err.response?.status === 401) { setToken(''); localStorage.removeItem('token'); }
      else showToast('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/plans`);
      setPlans(res.data);
      // If any plan has a stripe_price_id, Stripe may be configured (backend decides)
      setStripeEnabled(false); // Only true after checkout attempt succeeds
    } catch { /* ignore */ }
  };

  const fetchAdminUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await api.get('/admin/users');
      setAdminUsers(res.data);
    } catch { /* ignore */ }
  };

  const fetchAdminTopups = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await api.get('/admin/topup-requests');
      setAdminTopups(res.data);
    } catch { /* ignore */ }
  };

  const approveTopup = async (id: number) => {
    try {
      await api.post(`/admin/topup-requests/${id}/approve`);
      showToast('Balance credited!', 'success');
      fetchAdminTopups();
      fetchAdminStats();
    } catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const rejectTopup = async (id: number) => {
    try {
      await api.post(`/admin/topup-requests/${id}/reject`);
      showToast('Request rejected', 'info');
      fetchAdminTopups();
    } catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const fetchSickwServices = async () => {
    setSickwLoading(true);
    try {
      const [svcRes, balRes] = await Promise.all([
        api.get('/admin/sickw/services'),
        api.get('/admin/sickw/balance'),
      ]);
      setSickwServices(svcRes.data.services || []);
      setSickwBalance(balRes.data.balance);
      // Pre-select all
      setSelectedSickw(new Set(svcRes.data.services.map((s: any) => s.service_id)));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch SickW services', 'error');
    } finally { setSickwLoading(false); }
  };

  const syncSickwServices = async () => {
    setSickwSyncing(true);
    try {
      const res = await api.post('/admin/sickw/sync', {
        service_ids: selectedSickw.size === sickwServices.length ? null : Array.from(selectedSickw),
      });
      showToast(res.data.message, 'success');
      fetchAdminServices();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Sync failed', 'error');
    } finally { setSickwSyncing(false); }
  };

  const fetchAdminServices = async () => {
    try {
      const [svcRes, marginRes] = await Promise.all([
        api.get('/admin/services'),
        api.get('/admin/settings/margin'),
      ]);
      setAdminServices(svcRes.data);
      const pct = marginRes.data.global_margin_pct ?? 0;
      setGlobalMargin(pct);
      setMarginInput(String(pct));
      const edits: Record<number, string> = {};
      const gsmEdits: Record<number, string> = {};
      svcRes.data.forEach((s: any) => {
        edits[s.id] = s.api_service_id || '';
        gsmEdits[s.id] = s.gsmserver_service_id || '';
      });
      setServiceIdEdits(edits);
      setGsmServerIdEdits(gsmEdits);
    } catch { /* ignore */ }
  };

  const saveServiceMappings = async () => {
    const mappings = adminServices.map((s: any) => ({ id: s.id, api_service_id: serviceIdEdits[s.id] || null }));
    try {
      await api.post('/admin/services/map', { mappings });
      showToast('UnlockBase IDs saved!', 'success');
      fetchAdminServices();
    } catch (err: any) { showToast(err.response?.data?.error || 'Save failed', 'error'); }
  };

  const saveGsmServerMappings = async () => {
    const mappings = adminServices.map((s: any) => ({ id: s.id, gsmserver_service_id: gsmServerIdEdits[s.id] || null }));
    try {
      await api.post('/admin/services/map-gsmserver', { mappings });
      showToast('GsmServer IDs saved!', 'success');
      fetchAdminServices();
    } catch (err: any) { showToast(err.response?.data?.error || 'Save failed', 'error'); }
  };

  const fetchNewsletterSubs = async () => {
    try {
      const [subsRes, bcRes] = await Promise.all([
        api.get('/admin/newsletter'),
        api.get('/admin/newsletter/broadcasts'),
      ]);
      setNewsletterSubs(subsRes.data);
      setBroadcasts(bcRes.data);
    } catch { /* ignore */ }
  };

  const sendBroadcast = async () => {
    if (!bcSubject.trim() || !bcBody.trim()) { showToast('Subject and message are required', 'error'); return; }
    setBcSending(true);
    try {
      const res = await api.post('/admin/newsletter/broadcast', { subject: bcSubject, body: bcBody });
      showToast(`Sending to ${res.data.total} subscribers...`, 'success');
      setBcSubject(''); setBcBody('');
      setTimeout(fetchNewsletterSubs, 3000);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send', 'error');
    } finally { setBcSending(false); }
  };

  const retryOrder = async (id: number) => {
    try {
      await api.post(`/admin/orders/${id}/retry`);
      showToast('Order resubmitted to API', 'success');
    } catch (err: any) { showToast(err.response?.data?.error || 'Retry failed', 'error'); }
  };

  const fetchAdminStats = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await api.get('/admin/stats');
      setAdminStats(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchPlans(); }, []);

  useEffect(() => {
    fetchData();
    socket.on('order_updated', fetchData);
    socket.on('subscription_updated', fetchData);
    return () => { socket.off('order_updated'); socket.off('subscription_updated'); };
  }, [token, activeService]);

  useEffect(() => {
    if (activeService === 'Admin') { fetchAdminUsers(); fetchAdminStats(); fetchAdminTopups(); }
  }, [activeService, user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/admin/sickw/balance')
        .then(r => setSickwBalance(r.data.balance))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    document.body.className = isDarkMode ? '' : 'light-mode';
  }, [isDarkMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/${isRegistering ? 'register' : 'login'}`, authForm);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setShowAuth(false);
      showToast(isRegistering ? `Welcome! ${res.data.user.subscription?.status === 'trial' ? '7-day free trial started.' : ''}` : 'Welcome back!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Authentication failed', 'error');
    } finally { setLoading(false); }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || imei.length < 15) { showToast('Enter a valid 15-digit IMEI', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/orders', { service_id: selectedService.id, imei });
      showToast('Order placed successfully!', 'success');
      setUser((u: any) => ({ ...u, balance: res.data.balance }));
      setSelectedService(null);
      setImei('');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Order failed', 'error');
    } finally { setLoading(false); }
  };

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    try {
      const res = await api.post('/subscription/checkout', { plan_id: planId });
      if (res.data.url) window.location.href = res.data.url;
      else showToast('Please contact admin via WhatsApp to activate your subscription.', 'info');
    } catch (err: any) {
      const msg = err.response?.data?.error || '';
      if (msg.includes('not configured') || msg.includes('Contact admin')) {
        window.open('https://wa.me/18768751969?text=Hi, I would like to activate my S%26J UNLOCK subscription.', '_blank');
      } else {
        showToast(msg || 'Checkout failed', 'error');
      }
    } finally { setLoading(false); }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      showToast('Order status updated', 'success');
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.error || 'Update failed', 'error'); }
  };

  const handleAdjustBalance = async (userId: number) => {
    const amount = parseFloat(balanceInputs[userId] || '0');
    if (!amount || isNaN(amount)) { showToast('Enter a valid amount', 'error'); return; }
    try {
      await api.patch(`/admin/users/${userId}/balance`, { amount });
      showToast(`Balance adjusted by $${amount.toFixed(2)}`, 'success');
      setBalanceInputs(p => ({ ...p, [userId]: '' }));
      fetchAdminUsers();
    } catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleGrantSub = async (userId: number, plan: string) => {
    const days = parseInt(subDays[userId] || '30');
    try {
      await api.patch(`/admin/users/${userId}/subscription`, { plan, status: 'active', days });
      showToast(`Subscription granted (${days} days)`, 'success');
      fetchAdminUsers();
    } catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleRevokeSub = async (userId: number) => {
    try {
      await api.patch(`/admin/users/${userId}/subscription`, { status: 'expired' });
      showToast('Subscription revoked', 'success');
      fetchAdminUsers();
    } catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleIMEICheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanImei = imeiCheckInput.replace(/\D/g, '');
    if (cleanImei.length < 15) { showToast('Enter a valid 15-digit IMEI', 'error'); return; }
    setImeiCheckLoading(true);
    setImeiCheckResult(null);
    try {
      const svc = selectedCheckService;
      const endpoint = svc ? `/sickw/check?imei=${cleanImei}&service_id=${svc.id}` : `/imei/check?imei=${cleanImei}`;
      const res = await api.get(endpoint);
      setImeiCheckResult(res.data);
      if (res.data.charged > 0 && res.data.balance !== undefined) {
        setUser((u: any) => ({ ...u, balance: res.data.balance }));
        showToast(`$${res.data.charged.toFixed(2)} deducted for ${svc?.name || 'IMEI check'}`, 'info');
      }
      if (!res.data.success) showToast(res.data.reason || 'Check failed', 'error');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.reason || 'IMEI check failed';
      setImeiCheckResult({ success: false, reason: msg });
      showToast(msg, 'error');
    } finally { setImeiCheckLoading(false); }
  };

  const handleLogout = () => {
    setToken(''); localStorage.removeItem('token'); setUser(null);
    setOrders([]); setServices([]); setAdminUsers([]);
    showToast('Signed out successfully');
  };

  const filteredServices = useMemo(() =>
    services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase())),
    [services, searchQuery]
  );
  const groupServices = (svcs: any[]) =>
    svcs.reduce((g: any, item) => { g[item.category] = [...(g[item.category] || []), item]; return g; }, {});

  const announcements = [
    { title: 'Samsung FRP Removal | WORK ID | Android 11–14 | All Models Supported : 15.7 USD', date: '2026-03-28' },
    { title: 'Tecno / Infinix / iTel - MDM Remove Permanent Unlock By IMEI : 13.5 USD', date: '2026-03-25' },
    { title: 'US T-Mobile / Sprint / MetroPCS - Unbarring Service | iPhone and Generic : 26 USD', date: '2026-03-23' },
  ];

  const orderServices = ['IMEI Service', 'Server Services', 'Remote Service', 'File services'];
  const statusColors: Record<string, string> = { completed: 'success', 'in process': 'warning', failed: 'danger-pill', cancelled: 'muted-pill' };

  // Subscription badge text
  const subBadge = () => {
    const s = user?.subscription;
    if (!s) return null;
    if (s.status === 'trial') {
      const daysLeft = s.trial_ends_at ? Math.max(0, Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;
      return { text: `Trial — ${daysLeft}d left`, cls: 'sub-badge-trial' };
    }
    if (s.status === 'active') return { text: s.plan?.toUpperCase() || 'ACTIVE', cls: 'sub-badge-active' };
    if (s.status === 'expired') return { text: 'EXPIRED', cls: 'sub-badge-expired' };
    return null;
  };
  const badge = subBadge();

  // ── Render ─────────────────────────────────────────────────────────────────
  if (splashVisible) return <SplashScreen fading={splashFading} />;

  if (!token) {
    return (
      <>
        <LandingPage onLogin={() => { setIsRegistering(false); setShowAuth(true); }} onRegister={() => { setIsRegistering(true); setShowAuth(true); }} />
        <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Loader size={16} />} {t.message}</div>)}</div>
        {showAuth && (
          <div className="modal-overlay">
            <div className="auth-modal">
              <div className="auth-modal-head">
                <h3>{isRegistering ? 'CREATE ACCOUNT' : 'SIGN IN'}</h3>
                <button onClick={() => setShowAuth(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              {isRegistering && (
                <div className="trial-notice">
                  <CheckCircle size={14} color="#10b981" /> <span><strong>7-day free trial</strong> — no card required</span>
                </div>
              )}
              <form onSubmit={handleAuth}>
                <label className="form-label">EMAIL ADDRESS</label>
                <input type="email" placeholder="email@example.com" required onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
                <label className="form-label">PASSWORD</label>
                <input type="password" placeholder="••••••••" required onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
                <button type="submit" className="tool-btn accent" style={{ width: '100%', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                  {loading ? <div className="spinner" /> : isRegistering ? 'Create Free Account' : 'Sign In'}
                </button>
              </form>
              <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                <span style={{ color: 'var(--accent-blue)', cursor: 'pointer' }} onClick={() => setIsRegistering(!isRegistering)}>
                  {isRegistering ? 'Login here' : 'Register free'}
                </span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (needsSub) {
    return (
      <>
        <SubscribePage plans={plans} subscription={user?.subscription || null} onSubscribe={handleSubscribe} onLogout={handleLogout} loading={loading} stripeEnabled={stripeEnabled} />
        <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Loader size={16} />} {t.message}</div>)}</div>
      </>
    );
  }

  return (
    <div className={`dashboard-layout ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Loader size={16} />} {t.message}</div>)}</div>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => setActiveService('Dashboard')}>
          <div className="sidebar-logo-icon"><Smartphone color="#fff" fill="#fff" size={18} /></div>
          <div className="sidebar-logo-text"><span className="logo-sj">S&amp;J</span><span className="logo-unlocks"> UNLOCKS</span></div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">MAIN</div>
          <div className={`sidebar-item ${activeService === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveService('Dashboard')}>
            <Home size={16} /> <span>Dashboard</span>
          </div>

          <div className="sidebar-section-label">ORDERS</div>
          <div className={`sidebar-item has-sub ${orderMenuOpen ? 'open' : ''}`} onClick={() => setOrderMenuOpen(!orderMenuOpen)}>
            <Package size={16} /> <span>Place an Order</span> <ChevronDown size={12} className="sub-arrow" />
          </div>
          {orderMenuOpen && (
            <div className="sidebar-submenu">
              {orderServices.map(s => (
                <div key={s} className={`sidebar-subitem ${activeService === s ? 'active' : ''}`} onClick={() => setActiveService(s)}>{s}</div>
              ))}
            </div>
          )}

          <div className={`sidebar-item has-sub ${historyMenuOpen ? 'open' : ''} ${activeService === 'History' ? 'active' : ''}`} onClick={() => setHistoryMenuOpen(!historyMenuOpen)}>
            <Clock size={16} /> <span>Order History</span> <ChevronDown size={12} className="sub-arrow" />
          </div>
          {historyMenuOpen && (
            <div className="sidebar-submenu">
              <div className="sidebar-subitem" onClick={() => { setActiveService('History'); setHistoryFilter('imei'); }}>IMEI Orders</div>
              <div className="sidebar-subitem" onClick={() => { setActiveService('History'); setHistoryFilter('server'); }}>Server Orders</div>
              <div className="sidebar-subitem" onClick={() => { setActiveService('History'); setHistoryFilter('all'); }}>All Orders</div>
            </div>
          )}

          <div className="sidebar-section-label">TOOLS</div>
          <div className={`sidebar-item ${activeService === 'IMEI Check' ? 'active' : ''}`} onClick={() => { setActiveService('IMEI Check'); setImeiCheckResult(null); }}>
            <Search size={16} /> <span>IMEI Check</span>
          </div>
          <div className={`sidebar-item intel-item ${activeService === 'Intel' ? 'active' : ''}`} onClick={() => setActiveService('Intel')}>
            <Activity size={16} /> <span>Secure Intel</span>
          </div>
          <div className="sidebar-item funds-item" onClick={() => setShowAddFunds(true)}>
            <PlusCircle size={16} /> <span>Add Funds</span>
            {user?.balance > 0 && <span className="sidebar-balance-chip">${user.balance.toFixed(2)}</span>}
          </div>

          {user?.role === 'admin' && (
            <>
              <div className="sidebar-section-label">ADMIN</div>
              <div className={`sidebar-item admin-item ${activeService === 'Admin' ? 'active' : ''}`} onClick={() => { setActiveService('Admin'); setAdminTab('orders'); }}>
                <Shield size={16} /> <span>Admin Console</span>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-contacts">
            <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" className="sidebar-contact-link"><MessageCircle size={12} /> WhatsApp</a>
            <a href="mailto:saqlain.senior21@gmail.com" className="sidebar-contact-link"><Mail size={12} /> Email</a>
          </div>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className="main-panel">
        <div className="page-topbar">
          <div className="page-breadcrumb"><Home size={13} /> <ChevronRight size={11} /> <span className="bc-active">{activeService}</span></div>
          <div className="page-topbar-right">
            <div className="topbar-balance"><DollarSign size={13} /> Balance: <strong>${user?.balance?.toFixed(2)}</strong></div>
            {badge && <span className={`sub-nav-badge ${badge.cls}`}>{badge.text}</span>}
            <div className="topbar-user-chip">
              <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{user?.email?.[0]?.toUpperCase() || 'U'}</div>
              <span className="topbar-username">{user?.email?.split('@')[0]?.toUpperCase()}</span>
            </div>
            <div className="topbar-icon-btn" onClick={() => setIsDarkMode(!isDarkMode)}>{isDarkMode ? <Sun size={14} /> : <Moon size={14} />}</div>
            <div className="topbar-icon-btn logout" onClick={handleLogout}><LogOut size={14} /></div>
          </div>
        </div>

        <div className="page-content">

        {/* ── Intel Intelligence Dashboard ── */}
        {activeService === 'Intel' && (
          <div className="intel-dashboard">
            <div className="intel-secure-banner">
              <div className="banner-scanline" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Activity size={24} className="banner-pulse" />
                <div>
                  <h2 className="banner-title">SECURE INTEL MODE</h2>
                  <p className="banner-subtitle">IMEI INTELLIGENCE DASHBOARD</p>
                </div>
              </div>
              <div className="banner-status">
                <span className="status-dot green" /> ENCRYPTED NODE ACTIVE
              </div>
            </div>

            <div className="intel-grid">
              <div className="intel-main-panel">
                <div className="intel-card">
                  <div className="intel-card-head">
                    <Zap size={18} color="#06b6d4" />
                    <span>Real-time iPhone Tether Policy &amp; Unlock Eligibility Engine</span>
                  </div>
                  <div className="intel-input-group">
                    <label>Apple GSX / Next Tether (SickW)</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input 
                        type="text" 
                        placeholder="ENTER 15-DIGIT IMEI" 
                        className="intel-imei-input"
                        value={intelImei}
                        onChange={e => setIntelImei(e.target.value.replace(/\D/g, '').substring(0, 15))}
                      />
                      <button className="intel-action-btn" onClick={() => { setImeiCheckInput(intelImei); setActiveService('IMEI Check'); }}>
                        START ADVANCED CHECK
                      </button>
                    </div>
                  </div>
                </div>

                <div className="intel-card" style={{ marginTop: '2rem' }}>
                  <div className="intel-card-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <Activity size={18} color="#22d3ee" />
                    <span>Order Sequence Tracking</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Search size={14} color="var(--text-secondary)" />
                      <input 
                        type="text" 
                        placeholder="Filter by ID, Model or IMEI..." 
                        className="intel-filter-input"
                        value={intelSearch}
                        onChange={e => setIntelSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="intel-table-wrap">
                    <table className="intel-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Model</th>
                          <th>Price</th>
                          <th>IMEI</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders
                          .filter(o => !intelSearch || o.imei.includes(intelSearch) || String(o.id).includes(intelSearch) || (o.service_name || '').toLowerCase().includes(intelSearch.toLowerCase()))
                          .map(o => (
                          <tr key={o.id}>
                            <td className="mono">#{o.id}</td>
                            <td className="truncate">{o.service_name || 'iPhone Generic'}</td>
                            <td className="mono success">${o.service_price?.toFixed(2) || '0.00'}</td>
                            <td className="mono">{o.imei}</td>
                            <td><span className={`status-pill ${statusColors[o.status] || 'warning'}`}>{o.status.toUpperCase()}</span></td>
                            <td>{new Date(o.date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>No records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="intel-sidebar">
                <div className="intel-card admin-access-card">
                  <Lock size={20} color="#fbbf24" />
                  <h3>ADMIN ACCESS</h3>
                  <p>Authorized access only. All actions are logged under secure node sequence.</p>
                  <button className="intel-sidebar-btn" onClick={() => { setActiveService('Admin'); }}>ACCESS CONSOLE</button>
                </div>

                <div className="intel-stats-stack">
                  <div className="intel-mini-stat">
                    <div className="label">ACTIVE SESSIONS</div>
                    <div className="value">12.4K</div>
                  </div>
                  <div className="intel-mini-stat">
                    <div className="label">THROUGHPUT</div>
                    <div className="value">99.8%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Order History ── */}
        {activeService === 'History' && (() => {
          const filteredOrders = historyFilter === 'all'
            ? orders
            : orders.filter(o => (o as any).service_type === historyFilter);

          const historyTitle = historyFilter === 'imei' ? 'IMEI Orders' : historyFilter === 'server' ? 'Server Orders' : 'Advanced History';

          return (
            <div className="history-section">
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{historyTitle}</h1>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
                  </div>
                </div>
                {/* Filter tabs */}
                <div className="history-filter-tabs">
                  {(['imei', 'server', 'all'] as const).map(f => (
                    <button
                      key={f}
                      className={`history-filter-tab ${historyFilter === f ? 'active' : ''}`}
                      onClick={() => setHistoryFilter(f)}
                    >
                      {f === 'imei' ? 'IMEI Orders' : f === 'server' ? 'Server Orders' : 'Advanced History'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced History — full table */}
              {historyFilter === 'all' ? (
                <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ORDER #</th>
                        <th>SERVICE</th>
                        <th>TYPE</th>
                        <th>IMEI</th>
                        <th>PRICE</th>
                        <th>DATE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>#{o.id}</td>
                          <td style={{ fontSize: '0.85rem', maxWidth: 260 }}>{o.service_name || `Service #${o.service_id}`}</td>
                          <td>
                            <span className="type-pill" data-type={(o as any).service_type || 'server'}>
                              {((o as any).service_type || 'server').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: 1 }}>{o.imei}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>
                            {o.service_price ? `$${o.service_price.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                            {new Date(o.date).toLocaleDateString()} {new Date(o.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td><span className={`status-pill ${statusColors[o.status] || 'warning'}`}>{o.status.toUpperCase()}</span></td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No orders found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Card view for IMEI / Server Orders */
                <div className="history-grid">
                  {filteredOrders.map(o => (
                    <div key={o.id} className="history-card">
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace', minWidth: 28 }}>#{o.id}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{o.service_name || `Service #${o.service_id}`}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 2, letterSpacing: 1 }}>
                            IMEI: {o.imei}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                        {o.service_price && <div style={{ fontSize: '0.88rem', color: 'var(--success)', fontWeight: 800, fontFamily: 'monospace' }}>${o.service_price.toFixed(2)}</div>}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} /> {new Date(o.date).toLocaleDateString()}
                        </div>
                        <span className={`status-pill ${statusColors[o.status] || 'warning'}`}>{o.status.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                  {filteredOrders.length === 0 && (
                    <div className="stat-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No {historyFilter.toUpperCase()} orders yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Admin Panel ── */}
        {activeService === 'Admin' && (
          <div className="admin-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1>Enterprise Management Console</h1>
              <button onClick={() => { fetchData(); fetchAdminUsers(); }} className="tool-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { label: 'TOTAL ORDERS', value: adminStats?.total_orders ?? orders.length, icon: <TrendingUp size={18} color="#6366f1" /> },
                { label: 'COMPLETED', value: adminStats?.completed ?? orders.filter(o => o.status === 'completed').length, icon: <CheckCircle size={18} color="#10b981" /> },
                { label: 'IN PROCESS', value: adminStats?.in_process ?? orders.filter(o => o.status === 'in process').length, icon: <Clock size={18} color="#f59e0b" /> },
                { label: 'TOTAL USERS', value: adminStats?.user_count ?? adminUsers.length, icon: <Users size={18} color="#3b82f6" /> },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', textAlign: 'left' }}>
                  {s.icon}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Profit bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'TOTAL REVENUE', value: `$${(adminStats?.total_revenue || 0).toFixed(2)}`, color: '#10b981', icon: <DollarSign size={18} color="#10b981" />, hint: 'Credits spent by users' },
                { label: 'TOTAL COST', value: `$${(adminStats?.total_cost || 0).toFixed(2)}`, color: '#ef4444', icon: <TrendingUp size={18} color="#ef4444" />, hint: 'Wholesale cost of orders' },
                { label: 'NET PROFIT', value: `$${(adminStats?.total_profit || 0).toFixed(2)}`, color: '#a78bfa', icon: <DollarSign size={18} color="#a78bfa" />, hint: 'Your earnings after cost' },
              ].map(s => (
                <div key={s.label} className="stat-card profit-stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem' }}>
                  {s.icon}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 2 }}>{s.hint}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
              <button className={`admin-tab ${adminTab === 'orders' ? 'active' : ''}`} onClick={() => setAdminTab('orders')}>📋 Orders ({orders.length})</button>
              <button className={`admin-tab ${adminTab === 'users' ? 'active' : ''}`} onClick={() => { setAdminTab('users'); fetchAdminUsers(); }}>👥 Users ({adminUsers.length})</button>
              <button className={`admin-tab ${adminTab === 'topups' ? 'active' : ''}`} onClick={() => { setAdminTab('topups'); fetchAdminTopups(); }} style={{ position: 'relative' }}>
                💳 Top-Ups {adminTopups.filter((t: any) => t.status === 'pending').length > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: '0.65rem', padding: '0 5px', marginLeft: 4 }}>{adminTopups.filter((t: any) => t.status === 'pending').length}</span>}
              </button>
              <button className={`admin-tab ${adminTab === 'services' ? 'active' : ''}`} onClick={() => { setAdminTab('services'); fetchAdminServices(); }}>⚙️ API Mapping</button>
              <button className={`admin-tab ${adminTab === 'newsletter' ? 'active' : ''}`} onClick={() => { setAdminTab('newsletter' as any); fetchNewsletterSubs(); }}>📧 Newsletter</button>
            </div>

            {adminTab === 'orders' && (
              <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead><tr><th>#</th><th>USER</th><th>SERVICE</th><th>IMEI</th><th>DATE</th><th>STATUS</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>#{o.id}</td>
                        <td style={{ fontSize: '0.8rem' }}>USER_{o.user_id}</td>
                        <td style={{ maxWidth: 220, fontSize: '0.82rem' }}>{o.service_name || `Service #${o.service_id}`}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.imei}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{new Date(o.date).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <select
                              value={o.status}
                              className="status-select"
                              data-status={o.status}
                              onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                            >
                              <option value="in process">IN PROCESS</option>
                              <option value="completed">COMPLETED</option>
                              <option value="failed">FAILED</option>
                              <option value="cancelled">CANCELLED</option>
                            </select>
                            {(o.status === 'in process' || o.status === 'failed') && (
                              <button className="admin-action-btn blue" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }} onClick={() => retryOrder(o.id)} title="Retry via API">↻</button>
                            )}
                          </div>
                          {(o as any).api_status && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 2 }}>API: {(o as any).api_status}</div>}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No orders.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {adminTab === 'users' && (
              <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead><tr><th>#</th><th>EMAIL</th><th>ROLE</th><th>BALANCE</th><th>SUBSCRIPTION</th><th>ACTIONS</th></tr></thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>#{u.id}</td>
                        <td style={{ fontSize: '0.85rem' }}>{u.email}</td>
                        <td><span className={`status-pill ${u.role === 'admin' ? 'admin-pill' : 'user-pill'}`}>{u.role.toUpperCase()}</span></td>
                        <td style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>$ {u.balance?.toFixed(2)}</td>
                        <td>
                          <span className={`status-pill ${u.sub_status === 'active' ? 'success' : u.sub_status === 'trial' ? 'trial-pill' : 'warning'}`}>
                            {u.sub_status ? u.sub_status.toUpperCase() : 'NONE'}
                          </span>
                          {u.plan && u.plan !== 'none' && u.plan !== 'trial' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: 6 }}>{u.plan}</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-action-row">
                            {/* Balance adjustment */}
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <input
                                type="number"
                                placeholder="±$"
                                step="0.01"
                                className="admin-mini-input"
                                value={balanceInputs[u.id] || ''}
                                onChange={e => setBalanceInputs(p => ({ ...p, [u.id]: e.target.value }))}
                              />
                              <button className="admin-action-btn green" onClick={() => handleAdjustBalance(u.id)}>
                                <DollarSign size={12} /> Add
                              </button>
                            </div>
                            {/* Subscription grant */}
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <input
                                type="number"
                                placeholder="days"
                                className="admin-mini-input"
                                style={{ width: 55 }}
                                value={subDays[u.id] || ''}
                                onChange={e => setSubDays(p => ({ ...p, [u.id]: e.target.value }))}
                              />
                              <select className="admin-mini-select" id={`plan-${u.id}`}>
                                <option value="starter">Starter</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                              <button className="admin-action-btn blue" onClick={() => handleGrantSub(u.id, (document.getElementById(`plan-${u.id}`) as HTMLSelectElement)?.value || 'starter')}>
                                Grant
                              </button>
                              {u.sub_status === 'active' && u.role !== 'admin' && (
                                <button className="admin-action-btn red" onClick={() => handleRevokeSub(u.id)}>Revoke</button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {adminUsers.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No users yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {adminTab === 'topups' && (
              <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead><tr><th>#</th><th>USER</th><th>AMOUNT</th><th>REFERENCE</th><th>SUBMITTED</th><th>STATUS</th><th>ACTION</th></tr></thead>
                  <tbody>
                    {adminTopups.map((t: any) => (
                      <tr key={t.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>#{t.id}</td>
                        <td style={{ fontSize: '0.82rem' }}>{t.user_email}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 800, fontFamily: 'monospace' }}>${parseFloat(t.amount).toFixed(2)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#a78bfa' }}>{t.reference}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(t.created_at).toLocaleString()}</td>
                        <td>
                          <span className={`status-pill ${t.status === 'approved' ? 'success' : t.status === 'rejected' ? 'warning' : 'trial-pill'}`}>
                            {t.status.toUpperCase()}
                          </span>
                          {t.note && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>{t.note}</div>}
                        </td>
                        <td>
                          {t.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="admin-action-btn green" onClick={() => approveTopup(t.id)}>✓ Approve</button>
                              <button className="admin-action-btn red" onClick={() => rejectTopup(t.id)}>✗ Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {adminTopups.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No top-up requests yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {adminTab === 'services' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Global Profit Margin Panel */}
              <div className="stat-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>💰 Global Profit Margin</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Set a % markup applied to all service cost prices when auto-pricing. Current: <strong style={{ color: '#a78bfa' }}>{globalMargin}%</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={marginInput}
                      onChange={e => setMarginInput(e.target.value)}
                      style={{ width: 80, padding: '0.4rem 0.6rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      placeholder="e.g. 30"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>%</span>
                    <button
                      className="tool-btn accent"
                      style={{ height: '2.2rem', padding: '0 1rem' }}
                      disabled={marginSaving}
                      onClick={async () => {
                        const pct = parseFloat(marginInput);
                        if (isNaN(pct) || pct < 0) { showToast('Enter a valid margin %', 'error'); return; }
                        setMarginSaving(true);
                        try {
                          await api.post('/admin/settings/margin', { global_margin_pct: pct });
                          setGlobalMargin(pct);
                          showToast(`Global margin set to ${pct}%`, 'success');
                          fetchAdminServices();
                        } catch (err: any) {
                          showToast(err.response?.data?.error || 'Failed to save margin', 'error');
                        } finally { setMarginSaving(false); }
                      }}
                    >
                      {marginSaving ? 'Saving…' : '✓ Apply'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SickW Sync Panel */}
              <div className="stat-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>🔄 Sync Services from SickW.com</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Pull all SickW services into your dashboard with auto markup pricing.
                      {sickwBalance && <span style={{ color: '#10b981', marginLeft: 8 }}>SickW Balance: <strong>${sickwBalance}</strong></span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="tool-btn" style={{ height: '2.5rem', padding: '0 1.2rem' }} onClick={fetchSickwServices} disabled={sickwLoading}>
                      {sickwLoading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Loading...</> : '📋 Load Services'}
                    </button>
                    {sickwServices.length > 0 && (
                      <button className="tool-btn accent" style={{ height: '2.5rem', padding: '0 1.2rem' }} onClick={syncSickwServices} disabled={sickwSyncing || selectedSickw.size === 0}>
                        {sickwSyncing ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Syncing...</> : `⬇ Sync ${selectedSickw.size} Services`}
                      </button>
                    )}
                  </div>
                </div>

                {sickwServices.length > 0 && (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <button className="tool-btn" style={{ fontSize: '0.75rem', height: '1.8rem', padding: '0 0.75rem' }} onClick={() => setSelectedSickw(new Set(sickwServices.map((s: any) => s.service_id)))}>Select All</button>
                      <button className="tool-btn" style={{ fontSize: '0.75rem', height: '1.8rem', padding: '0 0.75rem' }} onClick={() => setSelectedSickw(new Set())}>Deselect All</button>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{selectedSickw.size} of {sickwServices.length} selected</span>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <table className="admin-table">
                        <thead><tr><th style={{ width: 36 }}></th><th>SERVICE ID</th><th>NAME</th><th>YOUR COST</th><th>YOUR PRICE</th><th>PROFIT</th></tr></thead>
                        <tbody>
                          {sickwServices.map((s: any) => (
                            <tr key={s.service_id} style={{ cursor: 'pointer' }} onClick={() => {
                              const next = new Set(selectedSickw);
                              next.has(s.service_id) ? next.delete(s.service_id) : next.add(s.service_id);
                              setSelectedSickw(next);
                            }}>
                              <td><input type="checkbox" checked={selectedSickw.has(s.service_id)} readOnly /></td>
                              <td style={{ fontFamily: 'monospace', color: '#a78bfa', fontSize: '0.8rem' }}>#{s.service_id}</td>
                              <td style={{ fontSize: '0.82rem' }}>{s.name}</td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>${s.cost.toFixed(3)}</td>
                              <td style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>${s.sell_price.toFixed(2)}</td>
                              <td style={{ fontFamily: 'monospace', color: '#a78bfa', fontSize: '0.8rem' }}>${(s.sell_price - s.cost).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Activate Services via UnlockBase */}
              <div className="stat-card" style={{ padding: '1.5rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>⚡ Activate Services — UnlockBase Setup</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  UnlockBase processes orders automatically. Complete these 3 steps to make services go live.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Step 1 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.9rem 1rem', flexWrap: 'wrap' }}>
                    <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>1</span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Get your Railway server IP</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Copy it — you need to whitelist it in UnlockBase</div>
                    </div>
                    <button className="tool-btn" style={{ height: '2.2rem', padding: '0 1rem', flexShrink: 0 }}
                      onClick={async () => {
                        try {
                          const r = await api.get('/admin/server-ip');
                          await navigator.clipboard.writeText(r.data.ip);
                          showToast(`Server IP: ${r.data.ip} — copied to clipboard`, 'success');
                        } catch (err: any) {
                          showToast(err.response?.data?.error || 'Could not get IP', 'error');
                        }
                      }}>📋 Copy Server IP</button>
                  </div>
                  {/* Step 2 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.9rem 1rem', flexWrap: 'wrap' }}>
                    <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>2</span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Whitelist the IP in UnlockBase</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Log in → Reseller Panel → API Settings → add the IP above</div>
                    </div>
                    <button className="tool-btn" style={{ height: '2.2rem', padding: '0 1rem', flexShrink: 0 }}
                      onClick={async () => {
                        try {
                          const r = await api.get('/admin/unlockbase/balance');
                          showToast(`✅ Connected! UB Balance: $${parseFloat(r.data.balance).toFixed(2)}`, 'success');
                        } catch (err: any) {
                          showToast(err.response?.data?.error || 'Not connected — IP not whitelisted yet?', 'error');
                        }
                      }}>🔌 Test Connection</button>
                  </div>
                  {/* Step 3 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.9rem 1rem', flexWrap: 'wrap' }}>
                    <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>3</span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Auto-map services from UnlockBase</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Fetches your UB service catalogue and matches to local services — makes them ✅ LIVE</div>
                    </div>
                    <button className="tool-btn accent" style={{ height: '2.2rem', padding: '0 1rem', flexShrink: 0 }}
                      onClick={async () => {
                        showToast('Auto-mapping from UnlockBase…', 'loading');
                        try {
                          const r = await api.post('/admin/unlockbase/auto-map');
                          showToast(`✅ ${r.data.matched} services mapped from ${r.data.ub_services} UB services`, 'success');
                          fetchAdminServices();
                        } catch (err: any) {
                          showToast(err.response?.data?.error || 'Auto-map failed', 'error');
                        }
                      }}>⚡ Auto-Map & Activate</button>
                  </div>
                </div>
              </div>

              {/* API Provider Mapping Table */}
              <div className="stat-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>🔗 Service ID Mapping — All Services</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ✅ LIVE = has UnlockBase ID (auto-processed) &nbsp;|&nbsp; ⚠ MANUAL = no API ID (you fulfill manually)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <button className="tool-btn" style={{ height: '2.5rem', padding: '0 1.2rem' }} onClick={saveGsmServerMappings}>💾 Save GSM IDs</button>
                    <button className="tool-btn accent" style={{ height: '2.5rem', padding: '0 1.2rem' }} onClick={saveServiceMappings}>💾 Save UB IDs</button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>SERVICE NAME</th>
                        <th>TYPE</th>
                        <th>COST</th>
                        <th>PRICE</th>
                        <th>PROFIT</th>
                        <th>MARGIN</th>
                        <th>STATUS</th>
                        <th style={{ color: '#34d399' }}>GSMSERVER ID</th>
                        <th style={{ color: '#60a5fa' }}>UNLOCKBASE ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminServices.map((s: any) => {
                        const cost   = parseFloat(s.cost_price) || 0;
                        const price  = parseFloat(s.price) || 0;
                        const profit = price - cost;
                        const margin = cost > 0 ? ((profit / cost) * 100).toFixed(0) : '—';
                        const hasGsm = !!(s.gsmserver_service_id || gsmServerIdEdits[s.id]);
                        const hasUb  = !!(s.api_service_id || serviceIdEdits[s.id]);
                        return (
                        <tr key={s.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>#{s.id}</td>
                          <td style={{ fontSize: '0.8rem', maxWidth: 200 }}>{s.name}</td>
                          <td><span className="status-pill" style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>{s.type.toUpperCase()}</span></td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>${cost.toFixed(2)}</td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--success)', fontWeight: 700 }}>${price.toFixed(2)}</td>
                          <td style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>${profit.toFixed(2)}</td>
                          <td style={{ fontFamily: 'monospace', color: '#a78bfa', fontSize: '0.8rem' }}>{margin}%</td>
                          <td>
                            {hasGsm
                              ? <span className="status-pill success">✅ GSM</span>
                              : hasUb
                                ? <span className="status-pill success">✅ LIVE</span>
                                : <span className="status-pill warning">⚠ MANUAL</span>}
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="GSM ID"
                              value={gsmServerIdEdits[s.id] || ''}
                              onChange={e => setGsmServerIdEdits(p => ({ ...p, [s.id]: e.target.value }))}
                              className="admin-mini-input"
                              style={{ width: 90, fontFamily: 'monospace', borderColor: '#34d399' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="UB ID"
                              value={serviceIdEdits[s.id] || ''}
                              onChange={e => setServiceIdEdits(p => ({ ...p, [s.id]: e.target.value }))}
                              className="admin-mini-input"
                              style={{ width: 90, fontFamily: 'monospace', borderColor: '#60a5fa' }}
                            />
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            )}

            {(adminTab as string) === 'newsletter' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Compose Broadcast */}
                <div className="stat-card" style={{ padding: '1.5rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>📣 Send Broadcast Email</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Sends to all <strong style={{ color: '#10b981' }}>{newsletterSubs.filter((s: any) => s.subscribed).length}</strong> active subscribers
                  </div>
                  <input
                    type="text"
                    placeholder="Subject line (e.g. New Service — Samsung S25 FRP Now Available!)"
                    value={bcSubject}
                    onChange={e => setBcSubject(e.target.value)}
                    className="search-bar"
                    style={{ width: '100%', marginBottom: '0.75rem' }}
                  />
                  <textarea
                    placeholder={`Write your message here...\n\nExample:\nHey there! 👋\n\nWe just added FRP removal for the latest Samsung S25 Ultra at the best prices.\n\nCheck it out at sjunlock.com\n\n— S&J UNLOCK Team`}
                    value={bcBody}
                    onChange={e => setBcBody(e.target.value)}
                    rows={8}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', marginBottom: '1rem', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button className="tool-btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => { setBcSubject(''); setBcBody(''); }}>Clear</button>
                    <button className="tool-btn accent" style={{ height: '2.8rem', padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={bcSending || !bcSubject || !bcBody} onClick={sendBroadcast}>
                      {bcSending ? <><div className="spinner" /> Sending...</> : <>✉ Send to {newsletterSubs.filter((s: any) => s.subscribed).length} Subscribers</>}
                    </button>
                  </div>
                </div>

                {/* Broadcast History */}
                {broadcasts.length > 0 && (
                  <div className="stat-card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '1rem' }}>📬 Broadcast History</div>
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>SUBJECT</th><th>SENT</th><th>FAILED</th><th>STATUS</th><th>DATE</th></tr></thead>
                      <tbody>
                        {broadcasts.map((b: any) => (
                          <tr key={b.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>#{b.id}</td>
                            <td style={{ fontSize: '0.82rem', maxWidth: 260 }}>{b.subject}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>{b.sent_count}</td>
                            <td style={{ color: b.fail_count > 0 ? 'var(--danger)' : 'var(--text-secondary)', fontFamily: 'monospace' }}>{b.fail_count}</td>
                            <td><span className={`status-pill ${b.status === 'sent' ? 'success' : 'trial-pill'}`}>{b.status.toUpperCase()}</span></td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Subscribers List */}
                <div className="stat-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>👥 Subscribers</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{newsletterSubs.filter((s: any) => s.subscribed).length} active · {newsletterSubs.length} total</div>
                    </div>
                    <button className="tool-btn" style={{ fontSize: '0.8rem', height: '2.2rem', padding: '0 1rem' }} onClick={() => {
                      const csv = 'Email,Source,Date\n' + newsletterSubs.filter((s: any) => s.subscribed).map((s: any) => `${s.email},${s.source},${s.created_at}`).join('\n');
                      const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'subscribers.csv'; a.click();
                    }}>⬇ Export CSV</button>
                  </div>
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>EMAIL</th><th>SOURCE</th><th>DATE</th><th>STATUS</th></tr></thead>
                    <tbody>
                      {newsletterSubs.map((s: any) => (
                        <tr key={s.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>#{s.id}</td>
                          <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{s.email}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.source}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                          <td><span className={`status-pill ${s.subscribed ? 'success' : 'warning'}`}>{s.subscribed ? 'ACTIVE' : 'UNSUB'}</span></td>
                        </tr>
                      ))}
                      {newsletterSubs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No subscribers yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── IMEI Check ── */}
        {activeService === 'IMEI Check' && (
          <div className="imei-check-page">
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>IMEI Check</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Look up any device by IMEI — carrier, blacklist status, model info &amp; more.
            </p>

            {/* Service selector */}
            {checkServices.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {checkServices.map(svc => (
                  <div
                    key={svc.id}
                    onClick={() => { setSelectedCheckService(svc); setImeiCheckResult(null); }}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 8,
                      border: `2px solid ${selectedCheckService?.id === svc.id ? '#6366f1' : 'rgba(255,255,255,0.07)'}`,
                      background: selectedCheckService?.id === svc.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{svc.category}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: selectedCheckService?.id === svc.id ? '#a78bfa' : 'var(--text-primary)', lineHeight: 1.3, marginBottom: 6 }}>{svc.name}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>${svc.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Cost badge */}
            <div className="imei-check-cost-bar">
              <DollarSign size={14} color="#a78bfa" />
              <span>Selected: <strong>{selectedCheckService?.name || 'Full Bundle'}</strong> — <strong>${(selectedCheckService?.price || 0.99).toFixed(2)}</strong></span>
              <span style={{ marginLeft: 'auto', color: user?.balance >= (selectedCheckService?.price || 0.99) ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                Balance: ${user?.balance?.toFixed(2) || '0.00'}
                {user?.balance < (selectedCheckService?.price || 0.99) && user?.role !== 'admin' && (
                  <span style={{ color: 'var(--danger)', marginLeft: 8, fontSize: '0.8rem' }}>
                    ⚠ <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowAddFunds(true)}>Add Funds</span>
                  </span>
                )}
              </span>
              {user?.role === 'admin' && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>(Admin — free)</span>}
            </div>

            <form className="imei-check-form" onSubmit={handleIMEICheck}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                <input
                  type="text"
                  placeholder="Enter 15-digit IMEI (e.g. 35xxxxxxxxxxxx5)"
                  value={imeiCheckInput}
                  onChange={e => setImeiCheckInput(e.target.value.replace(/\D/g, '').substring(0, 16))}
                  style={{ paddingLeft: '3rem', fontFamily: 'monospace', fontSize: '1.05rem', letterSpacing: 2, margin: 0, flex: 1, width: '100%' }}
                  className="search-bar"
                  maxLength={16}
                />
              </div>
              <button
                type="submit"
                className="tool-btn accent"
                style={{ height: '3rem', padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
                disabled={imeiCheckLoading || (user?.balance < (selectedCheckService?.price || 0.99) && user?.role !== 'admin')}
              >
                {imeiCheckLoading ? <div className="spinner" /> : <><Search size={16} /> Check — ${(selectedCheckService?.price || 0.99).toFixed(2)}</>}
              </button>
            </form>

            {imeiCheckResult && (
              <div className="imei-result-card">
                {!imeiCheckResult.success ? (
                  <div className="imei-result-error">
                    <AlertCircle size={20} color="var(--danger)" />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Check Failed</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{imeiCheckResult.reason}</div>
                      {imeiCheckResult.reason?.includes('not configured') && (
                        <div style={{ marginTop: '1rem', fontSize: '0.82rem', padding: '0.75rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6 }}>
                          To enable live IMEI checks: add <code style={{ color: '#a78bfa' }}>IMEI_CHECK_API_KEY</code> to <code style={{ color: '#a78bfa' }}>.env</code> and restart the server.
                          <br />Sign up at <a href="https://imeicheck.net" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>imeicheck.net</a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (() => {
                  const r = imeiCheckResult.result;
                  const props = r?.properties || r?.result || {};
                  const provider = (imeiCheckResult as any).provider || 'Live API';
                  const isBlacklisted = props?.blacklistStatus === 'ON' || props?.blacklisted === true || String(props?.blacklistStatus || '').toLowerCase().includes('blacklist');
                  const simRaw = String(props?.simLock || props?.networkLock || '').toLowerCase();
                  const isLocked = simRaw.includes('lock') || simRaw === 'true' || props?.simLock === true;
                  return (
                    <div>
                      <div className="imei-result-header">
                        <CheckCircle size={22} color="#10b981" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{props?.deviceName || props?.name || props?.modelName || 'Device Found'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            IMEI: <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{imeiCheckInput}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '0.2rem 0.6rem', borderRadius: 4, border: '1px solid rgba(99,102,241,0.3)', whiteSpace: 'nowrap' }}>
                          via {provider}
                        </span>
                      </div>
                      <div className="imei-result-grid">
                        {[
                          { label: 'MODEL', value: props?.modelNumber || props?.model || '—' },
                          { label: 'BRAND', value: props?.brand || props?.manufacturer || '—' },
                          { label: 'CARRIER', value: props?.network || props?.carrier || props?.simNetwork || '—' },
                          { label: 'COUNTRY', value: props?.country || props?.purchaseCountry || '—' },
                          { label: 'SIM LOCK', value: isLocked ? 'LOCKED' : 'UNLOCKED', color: isLocked ? 'var(--danger)' : 'var(--success)' },
                          { label: 'BLACKLIST', value: isBlacklisted ? 'BLACKLISTED ⚠' : 'CLEAN ✓', color: isBlacklisted ? 'var(--danger)' : 'var(--success)' },
                          { label: 'STORAGE', value: props?.storage || props?.capacity || '—' },
                          { label: 'COLOR', value: props?.color || '—' },
                        ].map(item => (
                          <div key={item.label} className="imei-result-item">
                            <div className="imei-result-label">{item.label}</div>
                            <div className="imei-result-value" style={{ color: item.color }}>{item.value || '—'}</div>
                          </div>
                        ))}
                      </div>
                      {/* Raw properties fallback for any extra fields */}
                      {Object.keys(props).length === 0 && (
                        <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', overflow: 'auto' }}>
                          {JSON.stringify(r, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {!imeiCheckResult && !imeiCheckLoading && (
              <div className="imei-check-info-grid">
                {[
                  { icon: <Smartphone size={22} color="#6366f1" />, title: 'Device Info', desc: 'Model, brand, storage, color, country of purchase' },
                  { icon: <Shield size={22} color="#10b981" />, title: 'Blacklist Status', desc: 'Check if device is reported lost or stolen worldwide' },
                  { icon: <Lock size={22} color="#f97316" />, title: 'Carrier Lock', desc: 'Find out which network the device is locked to' },
                  { icon: <Activity size={22} color="#3b82f6" />, title: 'Network Info', desc: 'Original carrier, country, and SIM status' },
                ].map(item => (
                  <div key={item.title} className="imei-info-card">
                    <div className="imei-info-icon">{item.icon}</div>
                    <div className="imei-info-title">{item.title}</div>
                    <div className="imei-info-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Dashboard & Services ── */}
        {activeService !== 'History' && activeService !== 'Admin' && activeService !== 'IMEI Check' && (
          <div className="dashboard-layout">
            <div className="dashboard-main">
              <h1 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
                {activeService === 'Dashboard' ? 'Client Area Dashboard' : `Place A New ${activeService} Order`}
              </h1>

              {activeService === 'Dashboard' ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="stat-card">
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 6 }}>CURRENT BALANCE</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>$ {user?.balance?.toFixed(2) || '0.00'}</div>
                    </div>
                    <div className="stat-card" onClick={() => setActiveService('History')} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 6 }}>TOTAL ORDERS</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{orders.length}</div>
                    </div>
                    <div className="stat-card">
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 6 }}>SUBSCRIPTION</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                        {user?.subscription?.status === 'trial' && `Trial — ${Math.max(0, Math.ceil((new Date(user.subscription.trial_ends_at || '').getTime() - Date.now()) / 86400000))} days left`}
                        {user?.subscription?.status === 'active' && `${user.subscription.plan?.toUpperCase()} Plan`}
                        {user?.role === 'admin' && 'Enterprise (Admin)'}
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => api.get('/admin/sickw/balance').then(r => { setSickwBalance(r.data.balance); showToast('SickW balance synced', 'success'); }).catch(() => showToast('Failed to sync SickW balance', 'error'))}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>SICKW CREDIT</span>
                          <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>(click to refresh)</span>
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
                          {sickwBalance != null ? `$ ${parseFloat(sickwBalance).toFixed(2)}` : '—'}
                        </div>
                      </div>
                    )}
                  </div>

                  <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>RECENT ORDERS</h2>
                  <div className="history-grid">
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} className="history-card">
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>#{o.id}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{o.service_name || `Service #${o.service_id}`}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>IMEI: {o.imei}</div>
                          </div>
                        </div>
                        <span className={`status-pill ${statusColors[o.status] || 'warning'}`}>{o.status.toUpperCase()}</span>
                      </div>
                    ))}
                    {orders.length === 0 && <div className="stat-card" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>No orders placed yet. Use "Place an Order" above to get started.</div>}
                  </div>
                </div>
              ) : (
                <div className="marketplace-container">
                  <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={16} />
                    <input type="text" className="search-bar" placeholder="Search services..." style={{ paddingLeft: '3rem', margin: 0 }} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  {loading && !services.length
                    ? <div style={{ padding: '4rem', textAlign: 'center' }}><Loader className="spinner" size={30} /></div>
                    : Object.entries(groupServices(filteredServices)).map(([cat, items]: [string, any]) => (
                        <div key={cat} className="category-group">
                          <div className="category-title">{cat}</div>
                          {items.map((item: any) => (
                            <div key={item.id} className={`service-row ${selectedService?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedService(item)}>
                              <div className="service-icon-box">{cat.substring(0, 2).toUpperCase()}</div>
                              <div className="service-main-info">
                                <div className="service-name">{item.name}</div>
                                <div className="service-cat-label">{item.category}</div>
                              </div>
                              <div className="service-price-info">
                                <div className="service-price">${item.price}</div>
                                <div className="service-delivery">{item.delivery}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                  }
                  {!loading && services.length > 0 && filteredServices.length === 0 && (
                    <div className="stat-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No services match "{searchQuery}"</div>
                  )}
                </div>
              )}
            </div>

            <div className="dashboard-sidebar">
              {selectedService ? (
                <section className="order-form">
                  <h2 style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>Order Confirmation</h2>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>SERVICE</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedService.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{selectedService.delivery} delivery</div>
                  </div>
                  <form onSubmit={handlePlaceOrder}>
                    <label className="form-label">ENTER IMEI (15 DIGITS)</label>
                    <input type="text" placeholder="35xxxxxxxxxxxxx" value={imei} required onChange={e => setImei(e.target.value.replace(/\D/g, '').substring(0, 15))} style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 2 }} />
                    <div className="order-summary">
                      <div className="order-summary-row"><span>Price</span><span>${selectedService.price.toFixed(2)}</span></div>
                      <div className="order-summary-row"><span>Your Balance</span><span style={{ color: user.balance >= selectedService.price ? 'var(--success)' : 'var(--danger)' }}>$ {user.balance.toFixed(2)}</span></div>
                      <div className="order-summary-row" style={{ fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}><span>Final Total</span><span style={{ color: 'var(--success)' }}>${selectedService.price.toFixed(2)}</span></div>
                    </div>
                    <button type="submit" className="tool-btn accent" style={{ width: '100%', marginTop: '1.5rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading || user.balance < selectedService.price}>
                      {loading ? <div className="spinner" /> : user.balance < selectedService.price ? '⚠ INSUFFICIENT BALANCE' : 'PLACE ORDER'}
                    </button>
                  </form>
                  <button className="tool-btn" style={{ width: '100%', marginTop: '0.75rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }} onClick={() => setSelectedService(null)}>CANCEL</button>
                </section>
              ) : (
                <section className="announcements-section">
                  <h2 style={{ fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} /> Announcements</h2>
                  <div className="announcement-list">
                    {announcements.map((a, i) => (
                      <div key={i} className="announcement-item">
                        <span className="announcement-title">{a.title}</span>
                        <span className="announcement-meta">{a.date}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

      {/* Add Funds Modal */}
      {showAddFunds && (
        <div className="modal-overlay" onClick={() => { setShowAddFunds(false); setTopupStep('amount'); setTopupAmount(''); setTopupRef(''); }}>
          <div className="stat-card" style={{ width: 460, padding: '2rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>

            {topupStep === 'amount' && (<>
              <CreditCard size={36} color="#6366f1" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ marginBottom: '0.25rem' }}>Add Funds</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Select an amount to top up your balance.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {[10, 25, 50, 100].map(amt => (
                  <button key={amt} className={`tool-btn ${topupAmount === String(amt) ? 'accent' : ''}`}
                    style={{ height: '2.5rem', fontWeight: 700 }} onClick={() => setTopupAmount(String(amt))}>
                    ${amt}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Custom amount ($)" value={topupAmount} min="1" step="0.01"
                onChange={e => setTopupAmount(e.target.value)}
                style={{ width: '100%', marginBottom: '1.25rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '1.1rem' }}
                className="search-bar" />
              <button className="tool-btn accent" style={{ width: '100%', height: '3rem' }}
                disabled={!topupAmount || parseFloat(topupAmount) < 1}
                onClick={() => setTopupStep('method')}>
                Continue — ${topupAmount ? parseFloat(topupAmount).toFixed(2) : '0.00'} →
              </button>
              <button className="tool-btn" style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => { setShowAddFunds(false); setTopupAmount(''); }}>Cancel</button>
            </>)}

            {topupStep === 'method' && (<>
              <h3 style={{ marginBottom: '0.25rem' }}>Choose Payment Method</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Adding <strong style={{ color: '#10b981' }}>${parseFloat(topupAmount).toFixed(2)}</strong> to your balance</p>

              {/* WiPay Card Payment */}
              <div onClick={() => setTopupMethod('wipay')}
                style={{ border: `2px solid ${topupMethod === 'wipay' ? '#6366f1' : 'var(--border)'}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem', cursor: 'pointer', textAlign: 'left', background: topupMethod === 'wipay' ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💳</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Credit / Debit Card</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Visa · Mastercard · Any Jamaican Bank Card — powered by WiPay</div>
                  </div>
                  {topupMethod === 'wipay' && <span style={{ marginLeft: 'auto', color: '#6366f1', fontSize: '1.1rem' }}>✓</span>}
                </div>
              </div>

              {/* Payoneer */}
              <div onClick={() => setTopupMethod('payoneer')}
                style={{ border: `2px solid ${topupMethod === 'payoneer' ? '#6366f1' : 'var(--border)'}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem', cursor: 'pointer', textAlign: 'left', background: topupMethod === 'payoneer' ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🏦</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Payoneer Transfer</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Manual bank/wire transfer — admin approval required</div>
                  </div>
                  {topupMethod === 'payoneer' && <span style={{ marginLeft: 'auto', color: '#6366f1', fontSize: '1.1rem' }}>✓</span>}
                </div>
              </div>

              <button className="tool-btn accent" style={{ width: '100%', height: '3rem' }}
                disabled={topupLoading}
                onClick={async () => {
                  if (topupMethod === 'wipay') {
                    setTopupLoading(true);
                    try {
                      const res = await api.post('/payment/wipay/initiate', { amount: parseFloat(topupAmount) });
                      window.location.href = res.data.payment_url;
                    } catch (err: any) {
                      showToast(err.response?.data?.error || 'Card payment unavailable. Try Payoneer.', 'error');
                      setTopupLoading(false);
                    }
                  } else {
                    setTopupStep('pay');
                  }
                }}>
                {topupLoading ? <div className="spinner" /> : topupMethod === 'wipay' ? '💳 Pay by Card →' : '🏦 Continue with Payoneer →'}
              </button>
              <button className="tool-btn" style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => setTopupStep('amount')}>← Back</button>
            </>)}

            {topupStep === 'pay' && (<>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏦</div>
              <h3 style={{ marginBottom: '0.25rem' }}>Send ${parseFloat(topupAmount).toFixed(2)} via Payoneer</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Send the exact amount to our Payoneer account, then paste your transaction reference below.</p>
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>PAYONEER EMAIL</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa', fontSize: '1rem', marginBottom: '0.75rem' }}>{payoneerInfo?.email || 'saqlain.senior21@gmail.com'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>AMOUNT TO SEND</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#10b981', fontSize: '1.2rem' }}>${parseFloat(topupAmount).toFixed(2)} USD</div>
                {payoneerInfo?.link && (
                  <button className="tool-btn accent" style={{ width: '100%', marginTop: '0.75rem', height: '2.5rem', fontSize: '0.85rem' }} onClick={() => window.open(payoneerInfo.link, '_blank')}>
                    Open Payoneer Payment Link ↗
                  </button>
                )}
              </div>
              <input type="text" placeholder="Paste Payoneer transaction reference / ID"
                value={topupRef} onChange={e => setTopupRef(e.target.value)}
                className="search-bar" style={{ width: '100%', marginBottom: '0.75rem', fontFamily: 'monospace' }} />
              <button className="tool-btn accent" style={{ width: '100%', height: '3rem' }}
                disabled={topupLoading || topupRef.trim().length < 3}
                onClick={async () => {
                  setTopupLoading(true);
                  try {
                    await api.post('/topup/request', { amount: parseFloat(topupAmount), reference: topupRef.trim() });
                    setTopupStep('done');
                    const myTopups = await api.get('/topup/my');
                    setTopupRequests(myTopups.data);
                  } catch (err: any) {
                    showToast(err.response?.data?.error || 'Submission failed', 'error');
                  } finally { setTopupLoading(false); }
                }}>
                {topupLoading ? <div className="spinner" /> : 'Submit Top-Up Request'}
              </button>
              <button className="tool-btn" style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => setTopupStep('method')}>← Back</button>
            </>)}

            {topupStep === 'done' && (<>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <h3 style={{ marginBottom: '0.5rem' }}>Request Submitted!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Your top-up of <strong style={{ color: '#10b981' }}>${parseFloat(topupAmount).toFixed(2)}</strong> is under review. We'll credit your balance once payment is confirmed — usually within a few hours.
              </p>
              <button className="tool-btn accent" style={{ width: '100%', height: '3rem' }} onClick={() => { setShowAddFunds(false); setTopupStep('amount'); setTopupAmount(''); setTopupRef(''); }}>Done</button>
            </>)}

          </div>
        </div>
      )}

        <footer className="page-footer">
          © 2026 S&amp;J_UNLOCKS Inc. All rights reserved.
        </footer>
        </div>{/* end page-content */}
      </main>
    </div>
  );
};

export default App;
