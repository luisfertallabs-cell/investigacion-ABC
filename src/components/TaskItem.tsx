import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { Deadline } from './ui'
import { fmtDate } from '../lib/format'
import type { Task } from '../lib/types'

interface Props {
  task: Task
  projectTitle?: string
  assigneeName?: string
  canToggle: boolean
  onToggle: (t: Task) => void
  onEdit?: (t: Task) => void
}

export default function TaskItem({ task, projectTitle, assigneeName, canToggle, onToggle, onEdit }: Props) {
  const [open, setOpen] = useState(false)
  const steps = task.description.split('\n').map((s) => s.trim()).filter(Boolean)
  const done = !!task.done_at
  return (
    <div className={`task${done ? ' done' : ''}`}>
      <button
        className={`task-check${done ? ' on' : ''}`}
        onClick={() => canToggle && onToggle(task)}
        disabled={!canToggle}
        aria-label={done ? 'Marcar pendiente' : 'Marcar hecha'}
      >
        {done && <Icon name="check" />}
      </button>
      <div style={{ minWidth: 0, cursor: steps.length ? 'pointer' : undefined }} onClick={() => steps.length && setOpen(!open)}>
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span>{fmtDate(task.due_date)}</span>
          {projectTitle && <Link to={`/proyectos/${task.project_id}`} onClick={(e) => e.stopPropagation()} className="clamp">{projectTitle}</Link>}
          {assigneeName && <span>{assigneeName}</span>}
          {steps.length > 0 && <span className="row" style={{ gap: 2 }}>{steps.length} pasos <Icon name={open ? 'up' : 'down'} size={13} /></span>}
        </div>
        {open && <ol className="steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
      </div>
      <div className="row" style={{ gap: 4 }}>
        <Deadline date={task.due_date} done={done} />
        {onEdit && <button className="icon-btn" onClick={() => onEdit(task)} aria-label="Editar"><Icon name="edit" /></button>}
      </div>
    </div>
  )
}
