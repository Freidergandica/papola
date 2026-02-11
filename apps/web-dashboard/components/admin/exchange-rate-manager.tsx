'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { RefreshCw, TrendingUp, Clock, AlertCircle } from 'lucide-react'

interface ExchangeRate {
  id: string
  currency_pair: string
  rate: number
  source: string
  fetched_at: string
}

export default function ExchangeRateManager({
  currentRate,
  rateHistory,
}: {
  currentRate: ExchangeRate | null
  rateHistory: ExchangeRate[]
}) {
  const [newRate, setNewRate] = useState('')
  const [source, setSource] = useState('BCV')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingBCV, setIsFetchingBCV] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const submitRate = async () => {
    const rateValue = parseFloat(newRate)
    if (!rateValue || rateValue <= 0) {
      setError('Ingresa una tasa válida mayor a 0')
      return
    }

    setIsSubmitting(true)
    setError('')

    const { error: insertError } = await supabase
      .from('exchange_rates')
      .insert({
        currency_pair: 'USD_VES',
        rate: rateValue,
        source,
        fetched_at: new Date().toISOString(),
      })

    if (insertError) {
      setError('Error al guardar la tasa: ' + insertError.message)
    } else {
      setNewRate('')
      router.refresh()
    }

    setIsSubmitting(false)
  }

  const fetchBCVRate = async () => {
    setIsFetchingBCV(true)
    setError('')

    try {
      // Try to fetch from BCV API proxy or known endpoint
      const res = await fetch('https://pydolarve.org/api/v2/dollar?monitor=bcv')
      if (res.ok) {
        const data = await res.json()
        // pydolarve returns { price: number } for BCV
        const bcvRate = data?.price || data?.monitors?.bcv?.price
        if (bcvRate) {
          setNewRate(String(bcvRate))
          setSource('BCV (automático)')
        } else {
          setError('No se pudo extraer la tasa del BCV. Ingrésala manualmente.')
        }
      } else {
        setError('No se pudo conectar con la API de tasa BCV. Ingrésala manualmente.')
      }
    } catch {
      setError('Error de conexión. Ingresa la tasa manualmente.')
    }

    setIsFetchingBCV(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Update Rate Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-papola-blue" />
          Actualizar Tasa
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa USD → VES
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Bs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newRate}
                  onChange={(e) => { setNewRate(e.target.value); setError('') }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue"
                />
              </div>
              <button
                onClick={fetchBCVRate}
                disabled={isFetchingBCV}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingBCV ? 'animate-spin' : ''}`} />
                BCV
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fuente
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-papola-blue/20"
            >
              <option value="BCV">BCV (Manual)</option>
              <option value="BCV (automático)">BCV (Automático)</option>
              <option value="Monitor Dólar">Monitor Dólar</option>
              <option value="Personalizada">Personalizada</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {newRate && parseFloat(newRate) > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Vista previa:</span> $10.00 USD = Bs. {(10 * parseFloat(newRate)).toFixed(2)}
              </p>
            </div>
          )}

          <button
            onClick={submitRate}
            disabled={isSubmitting || !newRate}
            className="w-full py-2.5 bg-papola-blue text-white font-bold rounded-xl hover:bg-papola-blue-80 disabled:opacity-50 transition-colors shadow-lg shadow-papola-blue-20"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Nueva Tasa'}
          </button>
        </div>
      </div>

      {/* Rate History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-papola-blue" />
          Historial de Tasas
        </h3>

        {rateHistory.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No hay historial de tasas.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rateHistory.map((rate, index) => (
              <div
                key={rate.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0 ? 'bg-papola-blue-20 border border-papola-blue/20' : 'bg-gray-50'
                }`}
              >
                <div>
                  <p className={`text-sm font-bold ${index === 0 ? 'text-papola-blue' : 'text-gray-900'}`}>
                    Bs. {Number(rate.rate).toFixed(2)}
                    {index === 0 && (
                      <span className="ml-2 text-xs font-normal bg-papola-blue text-white px-2 py-0.5 rounded-full">
                        Actual
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(rate.fetched_at).toLocaleString('es', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{rate.source}</p>
                  {index > 0 && (
                    <p className={`text-xs font-medium ${
                      Number(rate.rate) < Number(rateHistory[index - 1]?.rate)
                        ? 'text-green-600'
                        : Number(rate.rate) > Number(rateHistory[index - 1]?.rate)
                          ? 'text-red-600'
                          : 'text-gray-400'
                    }`}>
                      {Number(rate.rate) < Number(rateHistory[index - 1]?.rate) ? '↓' :
                       Number(rate.rate) > Number(rateHistory[index - 1]?.rate) ? '↑' : '='}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
