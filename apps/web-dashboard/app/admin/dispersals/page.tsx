'use client'

import { useState, useEffect } from 'react'
import { Banknote, AlertCircle, CheckCircle, XCircle, Loader2, History, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://papola-api-production.up.railway.app/api'

interface PreviewStore {
  id: string
  name: string
  balance: number
  bank_name: string
  bank_account_number: string
  bank_account_holder_id: string
}

interface PreviewData {
  stores: PreviewStore[]
  total_amount: number
  store_count: number
}

interface DispersalItem {
  id: string
  store_name: string
  bank_account_number: string
  bank_account_holder_id: string
  amount: number
  previous_balance: number
}

interface Dispersal {
  id: string
  reference: string
  total_amount: number
  store_count: number
  status: 'pending' | 'success' | 'failed'
  error_message?: string
  executed_at: string
  dispersal_items: DispersalItem[]
}

async function apiGet<T>(path: string): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function DispersalsPage() {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [history, setHistory] = useState<Dispersal[]>([])
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [previewData, historyData] = await Promise.all([
        apiGet<PreviewData>('/dispersals/preview'),
        apiGet<Dispersal[]>('/dispersals/history'),
      ])
      setPreview(previewData)
      setHistory(historyData)
    } catch (err) {
      console.error('Error loading dispersal data:', err)
    }
    setLoading(false)
  }

  const handleExecute = async () => {
    if (!reference.trim()) {
      setResult({ success: false, message: 'Ingresa una referencia de pago previo' })
      return
    }

    if (!confirm(`¿Estás seguro de dispersar Bs. ${preview?.total_amount.toFixed(2)} a ${preview?.store_count} tiendas?`)) {
      return
    }

    setExecuting(true)
    setResult(null)

    try {
      const res = await apiPost<{ success: boolean; dispersal_id?: string; error?: string }>(
        '/dispersals/execute',
        { reference: reference.trim() },
      )

      if (res.success) {
        setResult({ success: true, message: `Dispersión exitosa. ID: ${res.dispersal_id}` })
        setReference('')
        loadData()
      } else {
        setResult({ success: false, message: res.error || 'Error en la dispersión' })
      }
    } catch (err: any) {
      setResult({ success: false, message: err?.message || 'Error inesperado' })
    }

    setExecuting(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-papola-blue" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Banknote className="h-7 w-7 text-papola-blue" />
        <h1 className="text-2xl font-bold text-gray-900">Dispersión R4pagos</h1>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tiendas a dispersar</h2>
          <p className="text-sm text-gray-500">
            Tiendas con balance &gt; 0 y cuenta bancaria aprobada (20 dígitos)
          </p>
        </div>

        {preview && preview.store_count > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Tienda</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Cédula/RIF</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Cuenta</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">Balance (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.stores.map((store) => (
                    <tr key={store.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{store.name}</td>
                      <td className="px-6 py-4 text-gray-600">{store.bank_account_holder_id}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">{store.bank_account_number}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{store.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-papola-blue/5">
                  <tr>
                    <td className="px-6 py-4 font-bold text-gray-900" colSpan={3}>
                      Total ({preview.store_count} tiendas)
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-papola-blue text-lg">
                      Bs. {preview.total_amount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Execute */}
            <div className="p-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referencia de pago previo (8 dígitos)
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="Ej: 59707278"
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-papola-blue focus:border-transparent"
                  maxLength={8}
                />
                <button
                  onClick={handleExecute}
                  disabled={executing || !reference.trim()}
                  className="bg-papola-blue text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-papola-blue-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {executing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4" />
                      Ejecutar dispersión
                    </>
                  )}
                </button>
              </div>

              {result && (
                <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm ${
                  result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  {result.message}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay tiendas con balance para dispersar</p>
            <p className="text-gray-400 text-sm mt-1">
              Los balances se acumulan cuando los clientes pagan via Pago Móvil o Pago con Tarjeta
            </p>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <History className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-bold text-gray-900">Historial de dispersiones</h2>
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {history.map((d) => (
              <div key={d.id}>
                <button
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  onClick={() => setExpandedHistory(expandedHistory === d.id ? null : d.id)}
                >
                  <div className="flex items-center gap-3">
                    {d.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : d.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        Ref: {d.reference} — {d.store_count} tiendas
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(d.executed_at).toLocaleString('es-VE')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">Bs. {Number(d.total_amount).toFixed(2)}</span>
                    {expandedHistory === d.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedHistory === d.id && (
                  <div className="px-6 pb-4">
                    {d.error_message && (
                      <p className="text-sm text-red-600 mb-3">Error: {d.error_message}</p>
                    )}
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2">Tienda</th>
                          <th className="text-left px-3 py-2">Cuenta</th>
                          <th className="text-right px-3 py-2">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {d.dispersal_items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-gray-700">{item.store_name}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono">{item.bank_account_number}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              Bs. {Number(item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No hay dispersiones anteriores</p>
          </div>
        )}
      </div>
    </div>
  )
}
