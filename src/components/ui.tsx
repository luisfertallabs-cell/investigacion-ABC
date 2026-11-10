import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { daysUntil, fmtDate, relative, urgency } from '../lib/format'

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const show = useCallback((m: string) => setMsg(m), [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status" key={msg}>{msg}</div>}
    </ToastCtx.Provider>
  )
}

export function Empty({ icon = 'spark', children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}

export function Skeleton({ h = 88, n = 3 }: { h?: number; n?: number }) {
  return (
    <div className="stack">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
    </div>
  )
}

// group: usar con controles de botones para que el clic en la etiqueta no active la primera opción.
export function Field({ label, required, hint, children, full, group }: { label: string; required?: boolean; hint?: string; children: ReactNode; full?: boolean; group?: boolean }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={`field${full ? ' full' : ''}`} role={group ? 'group' : undefined} aria-label={group ? label : undefined}>
      <span>{label}{required && <em>*</em>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </Tag>
  )
}

export function Deadline({ date, done }: { date: string | null; done?: boolean }) {
  if (!date) return <span className="chip outline">Por definir</span>
  if (done) return <span className="chip ok">Hecho</span>
  const d = daysUntil(date)
  const u = urgency(d)
  return <span className={`chip ${u === 'ok' ? 'outline' : u}`} title={fmtDate(date)}>{relative(d)}</span>
}

export function DateBox({ date }: { date: string | null }) {
  if (!date) return <div className="datebox"><b>?</b><span>fecha</span></div>
  const d = new Date(date + 'T00:00:00')
  return (
    <div className="datebox">
      <b>{d.getDate()}</b>
      <span>{d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}</span>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = requestAnimationFrame(() => setW(value)); return () => cancelAnimationFrame(t) }, [value])
  return <div className="progress" aria-valuenow={Math.round(value)} role="progressbar"><i style={{ width: `${w}%` }} /></div>
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button type="button" key={String(o.value)} role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
