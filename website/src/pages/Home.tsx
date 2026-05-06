import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Shield, Zap, Clock, CheckCircle, Star, MessageCircle, ArrowRight, Lock, Globe, Award, Mail } from 'lucide-react'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

const NewsletterSection = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await axios.post(`${API_URL}/api/newsletter/subscribe`, { email, source: 'website-home' })
      setMsg(res.data.message || 'Subscribed!')
      setStatus('done')
      setEmail('')
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed. Try again.')
      setStatus('error')
    }
  }

  return (
    <section className="section" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(249,115,22,0.08))', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container text-center" style={{ maxWidth: 560 }}>
        <Mail size={36} color="#6366f1" style={{ marginBottom: '1rem' }} />
        <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Stay Updated</h2>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1rem' }}>
          Don't miss our future updates! Get Subscribed now!
        </p>
        {status === 'done' ? (
          <div style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '1rem 2rem', fontSize: '1rem', fontWeight: 600 }}>
            ✅ {msg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', maxWidth: 480, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              required
              onChange={e => { setEmail(e.target.value); setStatus('idle') }}
              style={{ flex: 1, minWidth: 220, padding: '0.8rem 1.2rem', borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary" disabled={status === 'loading'} style={{ height: 48, padding: '0 1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {status === 'loading' ? '...' : <><Mail size={16} /> Subscribe</>}
            </button>
            {status === 'error' && <div style={{ width: '100%', color: '#f87171', fontSize: '0.85rem' }}>{msg}</div>}
          </form>
        )}
        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '1rem' }}>No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}

const HOT_DEALS = [
  { icon: '📱', label: 'BEST SELLER', labelColor: '#f97316', title: 'iPhone Factory Unlock', oldPrice: '$54.99', price: '$39.99', time: '1–5 Days', highlight: true },
  { icon: '🔐', label: 'FAST DEAL', labelColor: '#10b981', title: 'Samsung FRP Remove', oldPrice: '$22.99', price: '$11.99', time: '1–6 Hours', highlight: false },
  { icon: '🔍', label: 'INSTANT', labelColor: '#3b82f6', title: 'Live IMEI Check', oldPrice: '$1.99', price: '$0.29', time: 'Instant', highlight: false },
  { icon: '🛡️', label: 'HOT', labelColor: '#ef4444', title: 'MDM / Knox Remove', oldPrice: '$34.99', price: '$18.99', time: '1–24 Hours', highlight: false },
]

const SERVICES_PREVIEW = [
  { icon: '📱', title: 'iPhone Factory Unlock', desc: 'All carriers — T-Mobile, AT&T, Verizon & more. Permanent factory unlock.', price: 'From $39.99', time: '1–5 Days', badge: '🔥 Popular' },
  { icon: '🔓', title: 'Samsung Unlock', desc: 'All US & worldwide carriers. Network unlock by IMEI.', price: 'From $29.99', time: '1–24 Hours', badge: '⚡ Fast' },
  { icon: '🔐', title: 'FRP Remove by IMEI', desc: 'Google account removal for Samsung, Xiaomi, Huawei, Oppo & more.', price: 'From $11.99', time: '1–6 Hours', badge: '💰 Best Price' },
  { icon: '☁️', title: 'iCloud Unlock', desc: 'Activation lock removal — works on all iPhone models.', price: 'From $99.99', time: '2–7 Days', badge: null },
  { icon: '🛡️', title: 'MDM Remove', desc: 'Knox bypass & device management removal for Samsung & others.', price: 'From $18.99', time: '1–24 Hours', badge: null },
  { icon: '🔍', title: 'IMEI Check', desc: 'Live device info — carrier, blacklist, iCloud, SIM lock status.', price: '$0.29', time: 'Instant', badge: '✅ Instant' },
]

const STATS = [
  { value: '10,000+', label: 'Devices Unlocked' },
  { value: '99.8%', label: 'Success Rate' },
  { value: '37+', label: 'Services Available' },
  { value: '24/7', label: 'Support' },
]

const WHY = [
  { icon: <Zap size={22} color="#f97316" />, title: 'Lightning Fast', desc: 'Most services completed within hours. Instant IMEI checks.' },
  { icon: <Shield size={22} color="#10b981" />, title: 'Secure & Legit', desc: 'Official factory unlocks via carrier & manufacturer databases.' },
  { icon: <Globe size={22} color="#3b82f6" />, title: 'Worldwide', desc: 'We support devices locked to carriers across the globe.' },
  { icon: <Award size={22} color="#fbbf24" />, title: 'Guaranteed', desc: 'Full refund if we cannot complete your order.' },
]

const REVIEWS = [
  { name: 'Marcus T.', stars: 5, text: 'iPhone unlocked in under 2 days. Worked perfectly on any carrier. Will use again!' },
  { name: 'Priya K.', stars: 5, text: 'Samsung FRP removed in 3 hours. Fast, legit and affordable. Highly recommend S&J.' },
  { name: 'James W.', stars: 5, text: 'IMEI check gave me all the info I needed instantly. Great service and support.' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(160deg, #070b14 0%, #0f1a2e 50%, #070b14 100%)', padding: '5rem 0 4rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(249,115,22,.07) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,.07) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div className="container text-center" style={{ position: 'relative' }}>
          <div className="fade-up" style={{ marginBottom: '1.25rem' }}>
            <span className="badge badge-orange"><Lock size={12} /> Official Reseller</span>
          </div>
          <h1 className="fade-up" style={{ fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-.04em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Professional IMEI<br /><span style={{ color: '#f97316' }}>Unlock Services</span>
          </h1>
          <p className="fade-up" style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Fast, permanent &amp; guaranteed unlocks for iPhone, Samsung &amp; all Android devices. FRP removal, MDM bypass, iCloud unlock &amp; more.
          </p>
          <div className="fade-up" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/order" className="btn btn-primary btn-lg">
              Place Order <ArrowRight size={18} />
            </Link>
            <Link to="/services" className="btn btn-secondary btn-lg">
              View Services
            </Link>
            <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" className="btn btn-lg" style={{ background: '#16a34a', color: '#fff' }}>
              <MessageCircle size={18} /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Hot Deals Banner */}
      <section style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b3a)', borderTop: '1px solid rgba(249,115,22,.25)', borderBottom: '1px solid rgba(249,115,22,.25)', padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'linear-gradient(90deg,#ef4444,#f97316)', color: '#fff', fontWeight: 900, fontSize: '.75rem', padding: '.3rem .9rem', borderRadius: 20, letterSpacing: '.08em', textTransform: 'uppercase' }}>🔥 Hot Deals</span>
            <span style={{ color: '#94a3b8', fontSize: '.9rem' }}>Limited-time prices — order now before they change</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '1rem' }}>
            {HOT_DEALS.map(d => (
              <Link key={d.title} to="/order" style={{ textDecoration: 'none' }}>
                <div style={{ background: d.highlight ? 'linear-gradient(135deg,rgba(249,115,22,.15),rgba(249,115,22,.05))' : 'rgba(255,255,255,.04)', border: d.highlight ? '1px solid rgba(249,115,22,.4)' : '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem', transition: 'transform .2s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.transform='translateY(-3px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.6rem' }}>{d.icon}</span>
                    <span style={{ background: d.labelColor, color: '#fff', fontSize: '.65rem', fontWeight: 800, padding: '.15rem .55rem', borderRadius: 20, letterSpacing: '.06em' }}>{d.label}</span>
                  </div>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '.95rem', lineHeight: 1.3 }}>{d.title}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem' }}>
                    <span style={{ color: '#f97316', fontWeight: 900, fontSize: '1.35rem' }}>{d.price}</span>
                    <span style={{ color: '#475569', fontSize: '.8rem', textDecoration: 'line-through' }}>{d.oldPrice}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '.78rem' }}>⏱ {d.time}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '2rem 1.5rem' }}>
          <div className="grid-4">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f97316', letterSpacing: '-.04em' }}>{s.value}</div>
                <div style={{ fontSize: '.85rem', color: '#64748b', marginTop: '.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section">
        <div className="container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '.75rem' }}>What We Offer</span>
            <h2 className="section-title">Our Services</h2>
            <p className="section-sub" style={{ margin: '.75rem auto 0' }}>Everything you need to unlock your device — fast, permanent and guaranteed.</p>
          </div>
          <div className="grid-3">
            {SERVICES_PREVIEW.map(s => (
              <div key={s.title} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', position: 'relative', overflow: 'hidden' }}>
                {s.badge && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(249,115,22,.15)', border: '1px solid rgba(249,115,22,.35)', color: '#f97316', fontSize: '.68rem', fontWeight: 800, padding: '.2rem .55rem', borderRadius: 20 }}>{s.badge}</div>
                )}
                <div style={{ fontSize: '2rem' }}>{s.icon}</div>
                <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.05rem' }}>{s.title}</h3>
                <p style={{ fontSize: '.875rem', color: '#64748b', lineHeight: 1.6, flex: 1 }}>{s.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '.75rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: '#f97316', fontWeight: 800, fontSize: '.95rem' }}>{s.price}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', color: '#64748b', fontSize: '.8rem' }}><Clock size={13} />{s.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: '2.5rem' }}>
            <Link to="/services" className="btn btn-outline">View All 37+ Services <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="section" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <span className="badge badge-green" style={{ marginBottom: '.75rem' }}>Why Choose Us</span>
            <h2 className="section-title">Trusted by Thousands</h2>
          </div>
          <div className="grid-4">
            {WHY.map(w => (
              <div key={w.title} className="text-center" style={{ padding: '1.5rem' }}>
                <div style={{ width: 52, height: 52, background: 'var(--bg3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>{w.icon}</div>
                <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '.5rem' }}>{w.title}</h3>
                <p style={{ color: '#64748b', fontSize: '.875rem', lineHeight: 1.6 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <span className="badge badge-orange" style={{ marginBottom: '.75rem' }}>Simple Process</span>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="grid-3" style={{ gap: '2rem' }}>
            {[
              { step: '01', title: 'Select Service', desc: 'Browse our services and choose what you need. Enter your IMEI number.' },
              { step: '02', title: 'Place Your Order', desc: 'Submit your order. We process it through official channels immediately.' },
              { step: '03', title: 'Device Unlocked', desc: 'Receive confirmation when your device is unlocked. Track status anytime.' },
            ].map(s => (
              <div key={s.step} className="text-center" style={{ padding: '2rem 1.5rem' }}>
                <div style={{ width: 56, height: 56, background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#f97316' }}>{s.step}</div>
                <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '.5rem', fontSize: '1.1rem' }}>{s.title}</h3>
                <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: '2rem' }}>
            <Link to="/order" className="btn btn-primary btn-lg">Get Started Now <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="section" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <span className="badge badge-orange" style={{ marginBottom: '.75rem' }}>Reviews</span>
            <h2 className="section-title">What Customers Say</h2>
          </div>
          <div className="grid-3">
            {REVIEWS.map(r => (
              <div key={r.name} className="card">
                <div style={{ display: 'flex', gap: '.2rem', marginBottom: '1rem' }}>
                  {Array.from({ length: r.stars }).map((_, i) => <Star key={i} size={15} fill="#fbbf24" color="#fbbf24" />)}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '.9rem', lineHeight: 1.7, marginBottom: '1rem' }}>"{r.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(249,115,22,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontWeight: 700, fontSize: '.85rem' }}>{r.name[0]}</div>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '.9rem' }}>{r.name}</span>
                  <span style={{ marginLeft: 'auto' }}><CheckCircle size={15} color="#10b981" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />

      {/* CTA */}
      <section className="section">
        <div className="container text-center">
          <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,.1), rgba(59,130,246,.1))', border: '1px solid rgba(249,115,22,.2)', borderRadius: 20, padding: '3.5rem 2rem' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 900, marginBottom: '1rem' }}>Ready to Unlock Your Device?</h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1rem' }}>Place your order now or contact us on WhatsApp for instant support.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/order" className="btn btn-primary btn-lg">Place Order <ArrowRight size={18} /></Link>
              <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" className="btn btn-lg" style={{ background: '#16a34a', color: '#fff' }}>
                <MessageCircle size={18} /> WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
