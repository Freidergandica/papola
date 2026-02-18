'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Shield, Store, User, ChevronDown, Clock, Check, X, AlertCircle } from 'lucide-react'
import { approveStoreOwner, rejectStoreOwner, changeUserRole } from '@/app/admin/users/actions'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone_number: string | null
  role: string
  created_at: string
  avatar_url: string | null
}

interface StoreInfo {
  id: string
  name: string
  is_active: boolean
}

const roleLabels: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200', icon: Shield },
  store_owner: { label: 'Comercio', color: 'bg-papola-blue-20 text-papola-blue border-papola-blue', icon: Store },
  pending_store_owner: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  customer: { label: 'Cliente', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: User },
  driver: { label: 'Repartidor', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: User },
}

export default function UsersTable({
  users,
  storesByOwner,
  currentUserId,
}: {
  users: UserProfile[]
  storesByOwner: Record<string, StoreInfo>
  currentUserId: string
}) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  const filtered = users.filter((user) => {
    const matchesSearch =
      !search ||
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.phone_number?.includes(search)

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const handleApprove = async (userId: string) => {
    setChangingRole(userId)
    setErrorMsg(null)
    try {
      const result = await approveStoreOwner(userId)
      if (result.error) {
        setErrorMsg(`Error al aprobar: ${result.error}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setErrorMsg(`Excepción al aprobar: ${e instanceof Error ? e.message : String(e)}`)
    }
    setChangingRole(null)
  }

  const handleReject = async (userId: string) => {
    setChangingRole(userId)
    setErrorMsg(null)
    try {
      const result = await rejectStoreOwner(userId)
      if (result.error) {
        setErrorMsg(`Error al rechazar: ${result.error}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setErrorMsg(`Excepción al rechazar: ${e instanceof Error ? e.message : String(e)}`)
    }
    setChangingRole(null)
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId)
    setErrorMsg(null)
    try {
      const result = await changeUserRole(userId, newRole)
      if (result.error) {
        setErrorMsg(`Error al cambiar rol: ${result.error}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setErrorMsg(`Excepción al cambiar rol: ${e instanceof Error ? e.message : String(e)}`)
    }
    setChangingRole(null)
  }

  return (
    <div>
      {errorMsg && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue"
        >
          <option value="all">Todos los roles</option>
          <option value="pending_store_owner">Pendientes de Aprobación</option>
          <option value="admin">Administradores</option>
          <option value="store_owner">Comercios</option>
          <option value="customer">Clientes</option>
          <option value="driver">Repartidores</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((user) => {
                const roleInfo = roleLabels[user.role] || roleLabels.customer
                const RoleIcon = roleInfo.icon
                const store = storesByOwner[user.id]
                const isSelf = user.id === currentUserId

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-papola-blue-20 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-papola-blue font-bold text-sm">
                              {(user.full_name || user.email)[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || 'Sin nombre'}
                            {isSelf && (
                              <span className="ml-2 text-xs text-papola-blue font-normal">(Tú)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleInfo.color}`}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {store ? (
                        <div className="flex items-center gap-2">
                          <span>{store.name}</span>
                          <span className={`h-2 w-2 rounded-full ${store.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phone_number || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('es', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isSelf ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : user.role === 'pending_store_owner' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={changingRole === user.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
                          >
                            <Check className="h-3 w-3" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            disabled={changingRole === user.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            disabled={changingRole === user.id}
                            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-papola-blue/20 disabled:opacity-50 cursor-pointer"
                          >
                            <option value="customer">Cliente</option>
                            <option value="store_owner">Comercio</option>
                            <option value="admin">Admin</option>
                            <option value="driver">Repartidor</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Sin resultados</h3>
            <p className="mt-2 text-sm text-gray-500">No se encontraron usuarios con esos criterios.</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Mostrando {filtered.length} de {users.length} usuarios
      </p>
    </div>
  )
}
