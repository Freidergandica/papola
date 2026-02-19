'use client'

import { useState } from 'react'
import { Check, X, Loader2, ArrowRight } from 'lucide-react'
import { approveBankChange, rejectBankChange } from '@/app/admin/bank-changes/actions'

interface BankChange {
  id: string
  store_id: string
  new_bank_name: string
  new_account_number: string
  new_account_holder_id: string
  new_account_type: string
  old_bank_name: string | null
  old_account_number: string | null
  old_account_holder_id: string | null
  old_account_type: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  stores?: { name: string }
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

export default function BankChangesTable({ changes }: { changes: BankChange[] }) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = filter === 'pending'
    ? changes.filter(c => c.status === 'pending')
    : changes

  const handleApprove = async (id: string) => {
    if (!confirm('¿Aprobar este cambio de cuenta bancaria? Los datos del afiliado se actualizarán inmediatamente.')) return
    setLoadingId(id)
    setError(null)
    const result = await approveBankChange(id)
    if (result.error) setError(result.error)
    setLoadingId(null)
  }

  const handleReject = async (id: string) => {
    if (!confirm('¿Rechazar esta solicitud de cambio?')) return
    setLoadingId(id)
    setError(null)
    const result = await rejectBankChange(id)
    if (result.error) setError(result.error)
    setLoadingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-papola-blue text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-papola-blue text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            {filter === 'pending' ? 'No hay solicitudes pendientes.' : 'No hay solicitudes de cambio.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afiliado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta Actual</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta Nueva</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {change.stores?.name || 'Sin nombre'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {change.old_bank_name ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-700">{change.old_bank_name}</div>
                          <div className="font-mono text-xs">{change.old_account_number}</div>
                          <div className="text-xs">{change.old_account_holder_id} - {change.old_account_type}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sin cuenta</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight className="h-4 w-4 text-gray-400 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-0.5">
                        <div className="font-medium text-gray-900">{change.new_bank_name}</div>
                        <div className="font-mono text-xs text-gray-700">{change.new_account_number}</div>
                        <div className="text-xs text-gray-500">{change.new_account_holder_id} - {change.new_account_type}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(change.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_BADGE[change.status]}`}>
                        {STATUS_LABEL[change.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {change.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(change.id)}
                            disabled={loadingId === change.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {loadingId === change.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(change.id)}
                            disabled={loadingId === change.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            {loadingId === change.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                            Rechazar
                          </button>
                        </div>
                      )}
                      {change.status !== 'pending' && change.reviewed_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(change.reviewed_at).toLocaleDateString('es-VE')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
