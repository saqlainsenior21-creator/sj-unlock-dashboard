import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Smartphone, Lock, Menu, X, MessageCircle, Zap } from 'lucide-react'

const TICKER_ITEMS = [
  '🔥 FLASH SALE — iPhone Factory Unlock from $39.99',
  '⚡ Samsung FRP Remove in as fast as 1 Hour — from $11.99',
  '✅ 99.8% Success Rate — Guaranteed or Full Refund',
  '📱 iCloud Activation Lock Remove — All iPhone Models',
  '🌍 Worldwide Service — We unlock any carrier, any country',
  '🔓 MDM / Knox Remove from $18.99 — Fast & Permanent',
]

function AnnouncementBar() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % TICKER_ITEMS.length)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  if (!visible) return null
  return (
    <div style={{ background: 'linear-gradient(90deg,#ea580c,#f97316,#ea580c)', backgroundSize: '200% 100%', animation: 'ticker-bg 4s linear infinite', color: '#fff', fontSize: '.8rem', fontWeight: 700, padding: '.45rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.75rem', position: 'relative', letterSpacing: '.01em' }}>
      <Zap size={13} fill="#fff" style={{ flexShrink: 0 }} />
      <span style={{ textAlign: 'center' }}>{TICKER_ITEMS[idx]}</span>
      <button onClick={() => setVisible(false)} style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '.1rem' }}>×</button>
      <style>{`@keyframes ticker-bg{0%{background-position:0%}100%{background-position:200%}}`}</style>
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const links = [
    { to: '/',         label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/order',    label: 'Place Order' },
    { to: '/track',    label: 'Track Order' },
    { to: '/contact',  label: 'Contact' },
  ]
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <AnnouncementBar />
    <nav style={{ background: 'rgba(7,11,20,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontWeight: 900, fontSize: '1.1rem', color: '#f1f5f9', letterSpacing: '.5px' }}>
          <div style={{ position: 'relative', width: 34, height: 34, background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Smartphone size={18} color="#fff" fill="#fff" />
            <div style={{ position: 'absolute', bottom: -3, right: -3, background: '#ef4444', borderRadius: '50%', padding: 2 }}>
              <Lock size={8} color="#fff" fill="#fff" />
            </div>
          </div>
          S&amp;J <span style={{ color: '#64748b', fontWeight: 400 }}>UNLOCK</span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }} className="desktop-nav">
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              padding: '.45rem .9rem', borderRadius: 8, fontSize: '.88rem', fontWeight: 600,
              color: pathname === l.to ? '#f97316' : '#94a3b8',
              background: pathname === l.to ? 'rgba(249,115,22,.1)' : 'transparent',
              transition: 'all .2s'
            }}>{l.label}</Link>
          ))}
          <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: '#16a34a', color: '#fff', padding: '.45rem 1rem', borderRadius: 8, fontSize: '.85rem', fontWeight: 700, marginLeft: '.5rem' }}>
            <MessageCircle size={15} /> WhatsApp
          </a>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} style={{ display: 'none', background: 'none', border: 'none', color: '#94a3b8', padding: '.25rem' }} className="mobile-toggle">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} style={{ padding: '.65rem .75rem', borderRadius: 8, color: pathname === l.to ? '#f97316' : '#94a3b8', fontWeight: 600, fontSize: '.95rem' }}>{l.label}</Link>
          ))}
          <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: '#16a34a', color: '#fff', padding: '.65rem .75rem', borderRadius: 8, fontWeight: 700, marginTop: '.25rem' }}>
            <MessageCircle size={15} /> WhatsApp Us
          </a>
        </div>
      )}

      <style>{`
        @media(max-width:768px){
          .desktop-nav { display:none !important; }
          .mobile-toggle { display:block !important; }
        }
      `}</style>
    </nav>
    </div>
  )
}
