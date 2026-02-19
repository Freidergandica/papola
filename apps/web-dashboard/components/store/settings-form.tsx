'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, X, Landmark, Clock, AlertCircle } from 'lucide-react'
import { Store, BankAccountChange } from '@/types'
import { STORE_CATEGORIES } from '@/lib/categories'
import { VENEZUELAN_BANKS } from '@/lib/banks'

interface Props {
  store: Store
  pendingBankChange?: Pick<BankAccountChange, 'id' | 'status' | 'new_bank_name' | 'new_account_number' | 'new_account_holder_id' | 'new_account_type' | 'created_at'> | null
}

export default function StoreSettingsForm({ store, pendingBankChange }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Bank change modal
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankLoading, setBankLoading] = useState(false)
  const [bankMessage, setBankMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_number: '',
    holder_id: '',
    account_type: 'corriente' as 'corriente' | 'ahorro'
  })

  const [formData, setFormData] = useState({
    name: store.name,
    description: store.description || '',
    address: store.address || '',
    phone: store.phone || '',
    schedule: store.schedule || '',
    category: store.category || '',
    image_url: store.image_url || ''
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${store.id}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('stores')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('stores').getPublicUrl(fileName)
      setFormData({ ...formData, image_url: data.publicUrl })
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: 'Error al subir la imagen' })
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          phone: formData.phone,
          schedule: formData.schedule,
          category: formData.category,
          image_url: formData.image_url
        })
        .eq('id', store.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Datos del negocio actualizados correctamente.' })
    } catch (error) {
      console.error('Error updating store:', error)
      setMessage({ type: 'error', text: 'Error al actualizar los datos.' })
    } finally {
      setLoading(false)
    }
  }

  const handleBankChangeRequest = async () => {
    if (bankForm.account_number.length !== 20) {
      setBankMessage({ type: 'error', text: 'El número de cuenta debe tener exactamente 20 dígitos.' })
      return
    }
    if (!bankForm.bank_name) {
      setBankMessage({ type: 'error', text: 'Selecciona un banco.' })
      return
    }
    if (!bankForm.holder_id.trim()) {
      setBankMessage({ type: 'error', text: 'Ingresa la cédula del titular.' })
      return
    }

    setBankLoading(true)
    setBankMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('bank_account_changes')
        .insert({
          store_id: store.id,
          requested_by: user.id,
          new_bank_name: bankForm.bank_name,
          new_account_number: bankForm.account_number,
          new_account_holder_id: bankForm.holder_id,
          new_account_type: bankForm.account_type,
          old_bank_name: store.bank_name || null,
          old_account_number: store.bank_account_number || null,
          old_account_holder_id: store.bank_account_holder_id || null,
          old_account_type: store.bank_account_type || null,
        })

      if (error) {
        if (error.code === '23505') {
          setBankMessage({ type: 'error', text: 'Ya tienes una solicitud pendiente. Espera a que sea revisada.' })
        } else {
          throw error
        }
        return
      }

      setBankMessage({ type: 'success', text: 'Solicitud enviada correctamente. Sera revisada por el equipo.' })
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Error requesting bank change:', error)
      setBankMessage({ type: 'error', text: 'Error al enviar la solicitud.' })
    } finally {
      setBankLoading(false)
    }
  }

  const hasBankData = store.bank_name || store.bank_account_number

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Información General</h3>
            <p className="mt-1 text-sm text-gray-500">
              Detalles públicos de tu negocio visibles para los usuarios.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2 space-y-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Negocio</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                <select
                  name="category"
                  id="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white"
                >
                  <option value="">Seleccionar categoría</option>
                  {STORE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

               <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">Logo del Negocio</label>
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:border-papola-blue transition-colors">
                  <div className="space-y-1 text-center">
                    {formData.image_url ? (
                      <div className="relative w-full h-48 mx-auto mb-4">
                        <img
                          src={formData.image_url}
                          alt="Logo"
                          className="h-48 object-contain mx-auto rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute top-0 right-0 -mr-2 -mt-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label
                            htmlFor="logo-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-papola-blue hover:text-papola-blue-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-papola-blue"
                          >
                            <span>Subir un archivo</span>
                            <input
                              id="logo-upload"
                              name="logo-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                            />
                          </label>
                          <p className="pl-1">o arrastrar y soltar</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB. Recomendado: Imagen cuadrada (1:1)</p>
                      </>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-8 w-8 text-papola-blue animate-spin" />
                          <span className="text-sm text-papola-blue mt-2">Subiendo imagen...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:block" aria-hidden="true">
          <div className="py-5">
            <div className="border-t border-gray-200" />
          </div>
        </div>

        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Ubicación y Contacto</h3>
            <p className="mt-1 text-sm text-gray-500">
              Cómo pueden encontrarte tus usuarios.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2 space-y-6">
             <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección</label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="schedule" className="block text-sm font-medium text-gray-700">Horario de Atención</label>
                <input
                  type="text"
                  name="schedule"
                  id="schedule"
                  value={formData.schedule}
                  onChange={handleChange}
                  placeholder="Ej. Lun-Vie: 9am - 6pm"
                  className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-5">
           {message && (
            <div className={`mr-4 flex items-center text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* Bank Account Section - Separate from main form */}
      <div className="bg-white shadow sm:rounded-lg sm:p-6 px-4 py-5">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-papola-blue" />
              Datos Bancarios
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Cuenta donde recibirás los pagos por tus ventas.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2 space-y-4">
            {/* Pending change banner */}
            {pendingBankChange && (
              <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
                <div className="flex">
                  <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Cambio pendiente de aprobación</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Solicitaste un cambio de cuenta bancaria el{' '}
                      {new Date(pendingBankChange.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}.
                      Será revisado por nuestro equipo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {hasBankData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Banco</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.bank_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tipo de Cuenta</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{store.bank_account_type || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Número de Cuenta</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{store.bank_account_number || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cédula del Titular</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.bank_account_holder_id || '-'}</dd>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Sin datos bancarios</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      No tienes una cuenta bancaria registrada. Solicita agregar una para recibir tus pagos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={!!pendingBankChange}
                onClick={() => {
                  setBankForm({
                    bank_name: '',
                    account_number: '',
                    holder_id: '',
                    account_type: 'corriente'
                  })
                  setBankMessage(null)
                  setShowBankModal(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Landmark className="h-4 w-4 mr-2" />
                {hasBankData ? 'Solicitar Cambio de Cuenta' : 'Agregar Cuenta Bancaria'}
              </button>
              {pendingBankChange && (
                <p className="mt-2 text-xs text-gray-500">
                  Ya tienes una solicitud pendiente. Espera a que sea revisada.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bank Change Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowBankModal(false)} />
            <div className="relative bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0">
                    <Landmark className="h-6 w-6 text-papola-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {hasBankData ? 'Solicitar Cambio de Cuenta' : 'Agregar Cuenta Bancaria'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {hasBankData ? 'Tu solicitud será revisada por nuestro equipo.' : 'Ingresa los datos de la cuenta donde recibirás tus pagos.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Banco</label>
                    <select
                      value={bankForm.bank_name}
                      onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm text-gray-900 bg-white"
                    >
                      <option value="">Seleccionar banco</option>
                      {VENEZUELAN_BANKS.map((bank) => (
                        <option key={bank.code} value={bank.name}>{bank.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número de Cuenta</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={20}
                      value={bankForm.account_number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setBankForm({ ...bankForm, account_number: val })
                      }}
                      placeholder="20 dígitos"
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm text-gray-900 bg-white font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">{bankForm.account_number.length}/20 dígitos</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cédula del Titular</label>
                    <input
                      type="text"
                      value={bankForm.holder_id}
                      onChange={(e) => setBankForm({ ...bankForm, holder_id: e.target.value })}
                      placeholder="Ej. V-12345678"
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Cuenta</label>
                    <select
                      value={bankForm.account_type}
                      onChange={(e) => setBankForm({ ...bankForm, account_type: e.target.value as 'corriente' | 'ahorro' })}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm text-gray-900 bg-white"
                    >
                      <option value="corriente">Corriente</option>
                      <option value="ahorro">Ahorro</option>
                    </select>
                  </div>
                </div>

                {bankMessage && (
                  <div className={`mt-4 text-sm ${bankMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {bankMessage.text}
                  </div>
                )}
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  disabled={bankLoading}
                  onClick={handleBankChangeRequest}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-papola-blue text-base font-medium text-white hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue sm:col-start-2 sm:text-sm disabled:opacity-50"
                >
                  {bankLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enviar Solicitud'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
