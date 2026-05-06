import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ArrowRight, Search, Loader } from 'lucide-react'
import axios from 'axios'

const CATEGORY_TABS = ['All', 'IMEI Unlock', 'FRP By IMEI', 'Remote Services', 'File Services', 'Server Tools', 'IMEI Check']
const TYPE_MAP: Record<string, string> = { 'IMEI Unlock': 'imei', 'FRP By IMEI': 'imei', 'Remote Services': 'remote', 'File Services': 'file', 'Server Tools': 'server', 'IMEI Check': 'check' }
const CAT_MAP: Record<string, string> = { 'FRP By IMEI': 'FRP By IMEI' }

interface Service { id: number; name: string; category: string; price: number; delivery: string; type: string }

export default function Services({ showToast }: { showToast: (m: string, t?: any) => void }) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    axios.get('/api/public/services').then(r => setServices(r.data)).catch(() => {
      showToast('Could not load services', 'error')
    }).finally(() => setLoading(false))
  }, [])

  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (tab === 'All') return true
    if (CAT_MAP[tab]) return s.category === CAT_MAP[tab]
    return s.type === TYPE_MAP[tab]
  })

  const typeColor: Record<string, string> = { imei: '#f97316', remote: '#a855f7', file: '#3b82f6', server: '#10b981', check: '#fbbf24' }

  return (
    <div>
      {/* Header */}
      <section style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '3rem 0' }}>
        <div className="container text-center">
          <span className="badge badge-blue" style={{ marginBottom: '.75rem' }}>37+ Services</span>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, color: '#f1f5f9', marginBottom: '.75rem' }}>All Services</h1>
          <p style={{ color: '#64748b', maxWidth: 500, margin: '0 auto' }}>Browse our full catalogue of IMEI unlock, FRP removal, MDM bypass and more.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto 2rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input className="form-input" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.75rem' }} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2.5rem' }}>
            {CATEGORY_TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className="btn btn-sm" style={{
                background: tab === t ? 'var(--orange)' : 'var(--bg2)',
                color: tab === t ? '#fff' : '#94a3b8',
                border: `1px solid ${tab === t ? 'var(--orange)' : 'var(--border)'}`,
              }}>{t}</button>
            ))}
          </div>

          {/* Results count */}
          <p style={{ color: '#475569', fontSize: '.85rem', marginBottom: '1.5rem' }}>{filtered.length} service{filtered.length !== 1 ? 's' : ''} found</p>

          {loading ? (
            <div className="text-center" style={{ padding: '4rem' }}><Loader size={32} className="spinner" style={{ color: '#f97316' }} /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1rem' }}>
              {filtered.map(s => (
                <div key={s.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                    <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: typeColor[s.type] || '#94a3b8', background: `${typeColor[s.type]}18`, padding: '.2rem .6rem', borderRadius: 99 }}>{s.type}</span>
                    <span style={{ fontSize: '.75rem', color: '#475569' }}>{s.category}</span>
                  </div>
                  <h3 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '.92rem', lineHeight: 1.4 }}>{s.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: '#f97316', fontWeight: 800 }}>${s.price.toFixed(2)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', color: '#64748b', fontSize: '.8rem' }}><Clock size={12} />{s.delivery}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center" style={{ padding: '4rem', color: '#475569' }}>No services found for "{search}"</div>
          )}

          <div className="text-center" style={{ marginTop: '3rem' }}>
            <Link to="/order" className="btn btn-primary btn-lg">Place an Order <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
