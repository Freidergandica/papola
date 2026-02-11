import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExchangeRateManager from '@/components/admin/exchange-rate-manager'
import { DollarSign } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  // Fetch current exchange rate (latest)
  const { data: currentRate } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('currency_pair', 'USD_VES')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch exchange rate history (last 30)
  const { data: rateHistory } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('currency_pair', 'USD_VES')
    .order('fetched_at', { ascending: false })
    .limit(30)

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración</h2>
        <p className="text-gray-500 mt-2">Gestiona la tasa de cambio BCV y configuraciones de la plataforma.</p>
      </div>

      {/* Current Rate Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-papola-green-20">
              <DollarSign className="h-8 w-8 text-papola-green" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tasa BCV Actual</p>
              <p className="text-4xl font-bold text-gray-900">
                {currentRate ? `Bs. ${Number(currentRate.rate).toFixed(2)}` : 'No configurada'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                1 USD = {currentRate ? `${Number(currentRate.rate).toFixed(2)} VES` : '—'}
              </p>
            </div>
          </div>
          {currentRate && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Última actualización</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(currentRate.fetched_at).toLocaleString('es', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-400 mt-1">Fuente: {currentRate.source}</p>
            </div>
          )}
        </div>
      </div>

      <ExchangeRateManager
        currentRate={currentRate}
        rateHistory={rateHistory || []}
      />
    </div>
  )
}
