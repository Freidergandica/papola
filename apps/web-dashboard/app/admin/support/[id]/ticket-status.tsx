'use client'

import { useState } from 'react'
import { updateTicketStatus } from '../actions'

const statusOptions = [
  { value: 'open', label: 'Abierto', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'En proceso', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'resolved', label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Cerrado', color: 'bg-gray-100 text-gray-500' },
]

export default function AdminTicketStatus({
  ticketId,
  currentStatus,
}: {
  ticketId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [updating, setUpdating] = useState(false)

  const handleChange = async (newStatus: string) => {
    if (newStatus === status) return
    setUpdating(true)
    setStatus(newStatus)

    const result = await updateTicketStatus(ticketId, newStatus)
    if (result.error) {
      setStatus(currentStatus)
      console.error(result.error)
    }
    setUpdating(false)
  }

  const current = statusOptions.find(s => s.value === status) || statusOptions[0]

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={updating}
      className={`px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-papola-blue/20 ${current.color} ${updating ? 'opacity-50' : ''}`}
    >
      {statusOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
