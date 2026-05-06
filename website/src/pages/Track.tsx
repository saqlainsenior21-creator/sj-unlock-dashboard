import { useState, useEffect } from 'react'
import { Search, Loader, CheckCircle, Clock, AlertCircle, Package, MessageCircle } from 'lucide-react'
import axios from 'axios'

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending:    { color: '#fbbf24', bg: 'rgba(251,191,36,.1)',   icon: Clock,         label: 'Pending' },
  processing: { color: '#3b82f6', bg: 'rgba(59,130,246,.1)',  icon: Loader,        label: 'Processing' },
  completed:  { color: '#10b981', bg: 'rgba(16,185,129,.1)',  icon: CheckCircle,   label: 'Completed' },
  failed:     { color: '#ef4444', bg: 'rgba(239,68,68,.1)',   icon: AlertCircle,   label: 'Failed' },
  cancelled:  { color: '#64748b', bg: 'rgba(100,116,139,.1)', icon: AlertCircle,   label: 'Cancelled' },
}

export default function Track({ showToast }: { showToast: (m: string, t?: any) => void }) {
  const [orderId, setOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [searched, setSearched] = useState(false)

  // Pre-fill from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) { setOrderId(id); handleLookup(id) }
  }, [])

  const handleLookup = async (id?: string) => {
    const lookupId = id || orderId.trim()
    if (!lookupId) return showToast('Enter an Order ID', 'error')
    setLoading(true)
    setSearched(true)
    try {
      const res = await axios.get(`/api/public/track/${lookupId}`)
      setOrder(res.data)
    } catch (err: any) {
      setOrder(null)
      showToast(err.response?.data?.error || 'Order not found', 'error')
    } finally { setLoading(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLookup()
  }

  const cfg = order ? (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending) : null

  return (
    <div>
      <section style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '3rem 0' }}>
        <div className="container text-center">
          <span className="badge badge-blue" style={{ marginBottom: '.75rem' }}>Real-Time Tracking</span>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, color: '#f1f5f9', marginBottom: '.75rem' }}>Track Your Order</h1>
          <p style={{ color: '#64748b', maxWidth: 500, margin: '0 auto' }}>Enter your Order ID to see the latest status update on your unlock service.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 580 }}>

          {/* Search form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '.75rem', marginBottom: '2.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Package size={16} style={{ position: 'absolute', left: '.9rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input
                className="form-input"
                placeholder="Enter Order ID (e.g. ORD-1234567890)"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? <Loader size={16} className="spinner" /> : <Search size={16} />}
              {loading ? 'Looking up...' : 'Track'}
            </button>
          </form>

          {/* Result */}
          {loading && (
            <div className="text-center" style={{ padding: '3rem' }}>
              <Loader size={32} className="spinner" style={{ color: '#f97316' }} />
            </div>
          )}

          {!loading && order && cfg && (
            <div className="card" style={{ padding: '2rem' }}>
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.75rem' }}>
                <div style={{ width: 48, height: 48, background: cfg.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <cfg.icon size={22} color={cfg.color} className={order.status === 'processing' ? 'spinner' : ''} />
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Order Status</div>
                  <div style={{ color: cfg.color, fontWeight: 800, fontSize: '1.2rem' }}>{cfg.label}</div>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[
                  { label: 'Order ID',  value: order.order_id,   highlight: true },
                  { label: 'Service',   value: order.service },
                  { label: 'Price',     value: `$${Number(order.price).toFixed(2)}` },
                  { label: 'Submitted', value: new Date(order.created_at).toLocaleString() },
                  order.notes && { label: 'Notes', value: order.notes },
                ].filter(Boolean).map((row: any) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', paddingBottom: '.75rem', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: '#64748b', fontSize: '.85rem', whiteSpace: 'nowrap' }}>{row.label}</span>
                    <span style={{ color: row.highlight ? '#f97316' : '#f1f5f9', fontWeight: row.highlight ? 700 : 400, fontSize: '.85rem', textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Result / notes from admin */}
              {order.result && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, padding: '1rem' }}>
                  <div style={{ color: '#6ee7b7', fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '.4rem' }}>Result</div>
                  <div style={{ color: '#f1f5f9', fontSize: '.9rem', lineHeight: 1.6 }}>{order.result}</div>
                </div>
              )}

              {/* Status messages */}
              {order.status === 'pending' && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.2)', borderRadius: 8, padding: '.85rem 1rem', fontSize: '.83rem', color: '#fde68a' }}>
                  ⏳ Your order is in the queue. We'll begin processing shortly.
                </div>
              )}
              {order.status === 'processing' && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 8, padding: '.85rem 1rem', fontSize: '.83rem', color: '#93c5fd' }}>
                  🔄 We are actively working on your order. You'll receive an email update.
                </div>
              )}
              {order.status === 'completed' && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, padding: '.85rem 1rem', fontSize: '.83rem', color: '#6ee7b7' }}>
                  ✅ Your device has been unlocked! Check your email for the full details.
                </div>
              )}
              {order.status === 'failed' && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '.85rem 1rem', fontSize: '.83rem', color: '#fca5a5' }}>
                  ❌ This order could not be completed. Please contact us on WhatsApp for a refund or retry.
                </div>
              )}

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" className="btn" style={{ background: '#16a34a', color: '#fff', flex: 1 }}>
                  <MessageCircle size={15} /> WhatsApp Support
                </a>
                <button className="btn" style={{ background: 'var(--bg3)', color: '#94a3b8', border: '1px solid var(--border)' }} onClick={() => { setOrder(null); setSearched(false); setOrderId('') }}>
                  Track Another
                </button>
              </div>
            </div>
          )}

          {!loading && searched && !order && (
            <div className="card text-center" style={{ padding: '3rem 2rem' }}>
              <AlertCircle size={44} color="#ef4444" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '.5rem' }}>Order Not Found</h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '.9rem' }}>
                We couldn't find an order with that ID. Double-check the Order ID from your confirmation email.
              </p>
              <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" className="btn" style={{ background: '#16a34a', color: '#fff' }}>
                <MessageCircle size={15} /> Contact Support
              </a>
            </div>
          )}

          {/* Help tip */}
          {!searched && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
              <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '.5rem', fontSize: '.9rem' }}>Where is my Order ID?</div>
              <ul style={{ color: '#64748b', fontSize: '.85rem', lineHeight: 2, paddingLeft: '1.25rem' }}>
                <li>Check the confirmation email sent to you after placing your order</li>
                <li>It looks like: <span style={{ color: '#f97316', fontFamily: 'monospace' }}>ORD-1234567890</span></li>
                <li>Can't find it? <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" style={{ color: '#22c55e', fontWeight: 600 }}>WhatsApp us</a> with your email address</li>
              </ul>
            </div>
          )}

        </div>
      </section>
    </div>
  )
}
