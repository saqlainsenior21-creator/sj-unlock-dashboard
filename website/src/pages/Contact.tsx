import { useState } from 'react'
import { MessageCircle, Mail, Phone, Clock, Send, Loader } from 'lucide-react'
import axios from 'axios'

export default function Contact({ showToast }: { showToast: (m: string, t?: any) => void }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.includes('@') || !form.message.trim())
      return showToast('Please fill in all required fields', 'error')
    setSending(true)
    try {
      await axios.post('/api/public/contact', form)
      setSent(true)
      showToast('Message sent! We\'ll reply within 24 hours.', 'success')
    } catch {
      showToast('Failed to send message. Please WhatsApp us directly.', 'error')
    } finally { setSending(false) }
  }

  return (
    <div>
      {/* Header */}
      <section style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '3rem 0' }}>
        <div className="container text-center">
          <span className="badge badge-green" style={{ marginBottom: '.75rem' }}>24/7 Support</span>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, color: '#f1f5f9', marginBottom: '.75rem' }}>Contact Us</h1>
          <p style={{ color: '#64748b', maxWidth: 500, margin: '0 auto' }}>Need help? We're here 24/7. Reach us on WhatsApp for the fastest response.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860, display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '2.5rem', alignItems: 'start' }}>

          {/* Contact info */}
          <div>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1.5rem' }}>Get In Touch</h3>

            {/* WhatsApp — primary */}
            <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.25)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', textDecoration: 'none', transition: 'border-color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(22,163,74,.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(22,163,74,.25)')}
            >
              <div style={{ width: 44, height: 44, background: '#16a34a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageCircle size={22} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '.25rem' }}>WhatsApp (Fastest)</div>
                <div style={{ color: '#f1f5f9', fontWeight: 600 }}>+1 876 875 1969</div>
                <div style={{ color: '#64748b', fontSize: '.8rem', marginTop: '.2rem' }}>Tap to open WhatsApp</div>
              </div>
            </a>

            {/* Email */}
            <a href="mailto:saqlain.senior21@gmail.com"
              style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', textDecoration: 'none', transition: 'border-color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#f97316')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ width: 44, height: 44, background: 'rgba(249,115,22,.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={22} color="#f97316" />
              </div>
              <div>
                <div style={{ color: '#f97316', fontWeight: 700, marginBottom: '.25rem' }}>Email</div>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '.9rem' }}>saqlain.senior21@gmail.com</div>
                <div style={{ color: '#64748b', fontSize: '.8rem', marginTop: '.2rem' }}>Reply within 24 hours</div>
              </div>
            </a>

            {/* Phone */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 44, height: 44, background: 'rgba(59,130,246,.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={22} color="#3b82f6" />
              </div>
              <div>
                <div style={{ color: '#3b82f6', fontWeight: 700, marginBottom: '.25rem' }}>Phone</div>
                <div style={{ color: '#f1f5f9', fontWeight: 600 }}>+1 876 875 1969</div>
                <div style={{ color: '#64748b', fontSize: '.8rem', marginTop: '.2rem' }}>Mon–Sun, 8AM–10PM EST</div>
              </div>
            </div>

            {/* Hours */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem' }}>
                <Clock size={16} color="#fbbf24" /> Business Hours
              </div>
              {[
                { day: 'Monday – Friday', hours: '8:00 AM – 10:00 PM EST' },
                { day: 'Saturday', hours: '9:00 AM – 8:00 PM EST' },
                { day: 'Sunday', hours: '10:00 AM – 6:00 PM EST' },
              ].map(r => (
                <div key={r.day} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '.5rem', marginBottom: '.5rem', borderBottom: '1px solid var(--border)', fontSize: '.83rem' }}>
                  <span style={{ color: '#64748b' }}>{r.day}</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{r.hours}</span>
                </div>
              ))}
              <div style={{ marginTop: '.5rem', fontSize: '.82rem', color: '#22c55e' }}>
                ✓ WhatsApp support available 24/7
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1.5rem' }}>Send a Message</h3>

            {sent ? (
              <div className="card text-center" style={{ padding: '3rem 2rem' }}>
                <div style={{ width: 60, height: 60, background: 'rgba(16,185,129,.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <Send size={26} color="#10b981" />
                </div>
                <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '.5rem' }}>Message Sent!</h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '.9rem' }}>
                  Thanks for reaching out! We'll get back to you within 24 hours. For urgent matters, please WhatsApp us.
                </p>
                <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a href="https://wa.me/18768751969" target="_blank" rel="noreferrer" className="btn" style={{ background: '#16a34a', color: '#fff' }}>
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                  <button className="btn" style={{ background: 'var(--bg3)', color: '#94a3b8', border: '1px solid var(--border)' }} onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }}>
                    Send Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Your Name *</label>
                    <input className="form-input" name="name" placeholder="John Smith" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email Address *</label>
                    <input className="form-input" name="email" type="email" placeholder="you@email.com" value={form.email} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subject</label>
                  <select className="form-input" name="subject" value={form.subject} onChange={handleChange}
                    style={{ appearance: 'none', cursor: 'pointer' }}>
                    <option value="">Select a topic...</option>
                    <option value="Order Inquiry">Order Inquiry</option>
                    <option value="Track My Order">Track My Order</option>
                    <option value="Refund Request">Refund Request</option>
                    <option value="Service Question">Service Question</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Message *</label>
                  <textarea className="form-input" name="message" placeholder="Describe your issue or question in detail. Include your Order ID if applicable..." value={form.message} onChange={handleChange} rows={6} style={{ resize: 'vertical' }} required />
                </div>

                <div style={{ background: 'rgba(249,115,22,.06)', border: '1px solid rgba(249,115,22,.15)', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.82rem', color: '#fdba74' }}>
                  💬 For the fastest response, message us on WhatsApp instead!
                </div>

                <button type="submit" className="btn btn-primary" style={{ height: '3rem' }} disabled={sending}>
                  {sending ? <><Loader size={16} className="spinner" /> Sending...</> : <><Send size={16} /> Send Message</>}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      <style>{`@media(max-width:700px){ .container > div { grid-template-columns:1fr !important; } }`}</style>
    </div>
  )
}
