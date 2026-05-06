import { Link } from 'react-router-dom'
import { Smartphone, Lock, MessageCircle, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
      <div className="container" style={{ padding: '3rem 1.5rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontWeight: 900, fontSize: '1.1rem', color: '#f1f5f9', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', width: 32, height: 32, background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={16} color="#fff" fill="#fff" />
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#ef4444', borderRadius: '50%', padding: 2 }}>
                  <Lock size={7} color="#fff" fill="#fff" />
                </div>
              </div>
              S&amp;J <span style={{ color: '#64748b', fontWeight: 400 }}>UNLOCK</span>
            </div>
            <p style={{ fontSize: '.875rem', lineHeight: 1.7, color: '#64748b' }}>
              Professional IMEI unlocking &amp; mobile solutions. Fast, secure &amp; reliable service worldwide.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem', fontSize: '.9rem', letterSpacing: '.05em', textTransform: 'uppercase' }}>Quick Links</h4>
            {[['/', 'Home'], ['/services', 'Services'], ['/order', 'Place Order'], ['/track', 'Track Order'], ['/contact', 'Contact']].map(([to, label]) => (
              <div key={to} style={{ marginBottom: '.5rem' }}>
                <Link to={to} style={{ color: '#64748b', fontSize: '.88rem', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f97316')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>{label}</Link>
              </div>
            ))}
          </div>

          {/* Services */}
          <div>
            <h4 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem', fontSize: '.9rem', letterSpacing: '.05em', textTransform: 'uppercase' }}>Services</h4>
            {['iPhone Factory Unlock', 'Samsung Unlock', 'FRP Remove by IMEI', 'iCloud Unlock', 'MDM Remove', 'IMEI Check'].map(s => (
              <div key={s} style={{ marginBottom: '.5rem', color: '#64748b', fontSize: '.88rem' }}>• {s}</div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem', fontSize: '.9rem', letterSpacing: '.05em', textTransform: 'uppercase' }}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.6rem', color: '#22c55e', fontSize: '.88rem' }}>
                <MessageCircle size={15} /> WhatsApp: +1 876 875 1969
              </a>
              <a href="mailto:saqlain.senior21@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '.6rem', color: '#64748b', fontSize: '.88rem' }}>
                <Mail size={15} /> saqlain.senior21@gmail.com
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', color: '#64748b', fontSize: '.88rem' }}>
                <Phone size={15} /> +1 876 875 1969
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ color: '#475569', fontSize: '.82rem' }}>© 2026 S&amp;J UNLOCK Inc. All rights reserved.</p>
          <p style={{ color: '#475569', fontSize: '.82rem' }}>Professional Mobile Unlocking Services</p>
        </div>
      </div>
    </footer>
  )
}
