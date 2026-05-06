import { useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info' }

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])
  return { toasts, showToast, removeToast }
}

export default function Toast({ toasts, remove }: { toasts: ToastItem[]; remove: (id: number) => void }) {
  const Icon = { success: CheckCircle, error: AlertCircle, info: Info }
  return (
    <div className="toast-wrap">
      {toasts.map(t => {
        const I = Icon[t.type]
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <I size={16} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: 'inherit', opacity: .6, cursor: 'pointer', padding: 0 }}><X size={14} /></button>
          </div>
        )
      })}
    </div>
  )
}
