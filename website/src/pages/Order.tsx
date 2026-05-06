import { useState, useEffect } from 'react'
import { Loader, Search, Clock, CheckCircle, MessageCircle, ArrowRight } from 'lucide-react'
import axios from 'axios'

interface Service { id: number; name: string; category: string; price: number; delivery: string; type: string }

const TYPE_LABELS: Record<string, string> = { imei: 'IMEI Required', remote: 'Remote Service', file: 'File Service', server: 'Server/Tool', check: 'Instant Check' }
const TYPE_COLORS: Record<string, string> = { imei: '#f97316', remote: '#a855f7', file: '#3b82f6', server: '#10b981', check: '#fbbf24' }

export default function Order({ showToast }: { showToast: (m: string, t?: any) => void }) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Service | null>(null)
  const [imei, setImei] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState<any>(null)

  useEffect(() => {
    axios.get('/api/public/services').then(r => setServices(r.data)).catch(() => showToast('Could not load services', 'error')).finally(() => setLoading(false))
  }, [])

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50)

  const needsIMEI = selected && ['imei', 'check'].includes(selected.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return showToast('Please select a service', 'error')
    if (needsIMEI && imei.length !== 15) return showToast('IMEI must be 15 digits', 'error')
    if (!email.includes('@')) return showToast('Enter a valid email', 'error')
    setSubmitting(true)
    try {
      const res = await axios.post('/api/public/order', { service_id: selected.id, imei: needsIMEI ? imei : '', email, notes })
      setDone(res.data)
      showToast('Order placed! Check your email for updates.', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to place order', 'error')
    } finally { setSubmitting(false) }
  }

  if (done) return (
    <div className="section">
      <div className="container" style={{ maxWidth: 540 }}>
        <div className="card text-center" style={{ padding: '3rem 2rem' }}>
          <CheckCircle size={52} color="#10b981" style={{ marginBottom: '1.25rem' }} />
          <h2 style={{ color: '#f1f5f9', fontWeight: 900, marginBottom: '.75rem' }}>Order Placed!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Your order has been received. We'll update you via email.</p>
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>Order ID</span>
              <span style={{ color: '#f97316', fontWeight: 700 }}>{done.order_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>Service</span>
              <span style={{ color: '#f1f5f9', fontSize: '.85rem', maxWidth: 220, textAlign: 'right' }}>{done.service}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>Price</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>${done.price}</span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '.85rem', marginBottom: '1.5rem' }}>
            Save your Order ID: <strong style={{ color: '#f97316' }}>{done.order_id}</strong><br />Use it to track your order status anytime.
          </p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/track?id=${done.order_id}`} className="btn btn-primary">Track Order <ArrowRight size={15} /></a>
            <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" className="btn" style={{ background: '#16a34a', color: '#fff' }}>
              <MessageCircle size={15} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <section style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '3rem 0' }}>
        <div className="container text-center">
          <span className="badge badge-orange" style={{ marginBottom: '.75rem' }}>Fast & Secure</span>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, color: '#f1f5f9', marginBottom: '.75rem' }}>Place Your Order</h1>
          <p style={{ color: '#64748b', maxWidth: 500, margin: '0 auto' }}>Select a service, enter your IMEI and we'll get started immediately.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* Service picker */}
          <div>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem' }}>1. Choose Service</h3>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '.8rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input className="form-input" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.4rem' }} />
            </div>
            {loading ? (
              <div className="text-center" style={{ padding: '2rem' }}><Loader size={24} className="spinner" style={{ color: '#f97316' }} /></div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.5rem', paddingRight: '.25rem' }}>
                {filtered.map(s => (
                  <div key={s.id} onClick={() => setSelected(s)} style={{
                    padding: '.85rem 1rem', borderRadius: 10, cursor: 'pointer', border: `1px solid ${selected?.id === s.id ? '#f97316' : 'var(--border)'}`,
                    background: selected?.id === s.id ? 'rgba(249,115,22,.08)' : 'var(--bg2)', transition: 'all .15s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
                      <span style={{ color: '#f1f5f9', fontSize: '.85rem', fontWeight: 600, lineHeight: 1.3 }}>{s.name}</span>
                      <span style={{ color: '#f97316', fontWeight: 800, fontSize: '.85rem', whiteSpace: 'nowrap' }}>${s.price.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.4rem' }}>
                      <span style={{ fontSize: '.7rem', color: TYPE_COLORS[s.type], background: `${TYPE_COLORS[s.type]}18`, padding: '.15rem .5rem', borderRadius: 99, fontWeight: 600 }}>{TYPE_LABELS[s.type]}</span>
                      <span style={{ fontSize: '.7rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '.2rem' }}><Clock size={11} />{s.delivery}</span>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p style={{ color: '#475569', padding: '1rem', textAlign: 'center' }}>No services found</p>}
              </div>
            )}
          </div>

          {/* Order form */}
          <div>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem' }}>2. Order Details</h3>
            {selected && (
              <div style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '.9rem', marginBottom: '.4rem' }}>{selected.name}</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ color: '#f97316', fontWeight: 800 }}>${selected.price.toFixed(2)}</span>
                  <span style={{ color: '#64748b', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}><Clock size={13} />{selected.delivery}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {needsIMEI && (
                <div className="form-group">
                  <label className="form-label">IMEI Number *</label>
                  <input className="form-input" placeholder="Enter 15-digit IMEI" maxLength={15} value={imei}
                    onChange={e => setImei(e.target.value.replace(/\D/g, ''))} required />
                  <span style={{ fontSize: '.75rem', color: '#475569' }}>Dial *#06# on your phone to get your IMEI</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Your Email *</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required />
                <span style={{ fontSize: '.75rem', color: '#475569' }}>We'll send order updates to this email</span>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea className="form-input" placeholder="Any additional info about your device..." value={notes}
                  onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, padding: '.75rem 1rem', marginBottom: '1.25rem', fontSize: '.82rem', color: '#6ee7b7' }}>
                ✓ Payment via WhatsApp/bank transfer after order confirmation
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '3rem' }} disabled={submitting || !selected}>
                {submitting ? <><Loader size={16} className="spinner" /> Processing...</> : 'Place Order'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', padding: '.75rem 1rem', background: 'var(--bg2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <MessageCircle size={16} color="#22c55e" />
              <span style={{ fontSize: '.82rem', color: '#64748b' }}>Need help? <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" style={{ color: '#22c55e', fontWeight: 600 }}>WhatsApp us</a></span>
            </div>
          </div>
        </div>

        <style>{`@media(max-width:700px){ .container > div { grid-template-columns:1fr !important; } }`}</style>
      </section>
    </div>
  )
}
