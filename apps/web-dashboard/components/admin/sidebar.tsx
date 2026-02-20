'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, Users, Settings, Tag, ShoppingBag, Landmark, MessageCircle, MoreHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const allNavigation = [
  { name: 'Panel', href: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin', 'sales_manager'], mobileMain: true },
  { name: 'Afiliados', href: '/admin/stores', icon: Store, roles: ['admin', 'sales_manager'], mobileMain: true },
  { name: 'Ofertas', href: '/admin/deals', icon: Tag, roles: ['admin', 'sales_manager'], mobileMain: false },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag, roles: ['admin', 'sales_manager'], mobileMain: true },
  { name: 'Usuarios', href: '/admin/users', icon: Users, roles: ['admin'], mobileMain: false },
  { name: 'Cuentas', href: '/admin/bank-changes', icon: Landmark, roles: ['admin'], mobileMain: false },
  { name: 'Soporte', href: '/admin/support', icon: MessageCircle, roles: ['admin'], mobileMain: true },
  { name: 'Config', href: '/admin/settings', icon: Settings, roles: ['admin'], mobileMain: false },
]

function BadgeCount({ count }: { count: number }) {
  const label = count > 20 ? '+20' : String(count)
  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
      {label}
    </span>
  )
}

function MobileBadge({ count }: { count: number }) {
  return (
    <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
      {count > 20 ? '+20' : count}
    </span>
  )
}

export default function Sidebar({ role = 'admin', badges = {} }: { role?: string; badges?: Record<string, number> }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const navigation = allNavigation.filter(item => item.roles.includes(role))

  // Mobile: split into main tabs (max 4) + overflow
  const mobileMain = navigation.filter(item => item.mobileMain)
  const mobileMore = navigation.filter(item => !item.mobileMain)
  const hasMore = mobileMore.length > 0

  // Check if any "more" item has a badge
  const moreBadgeTotal = mobileMore.reduce((sum, item) => sum + (badges[item.href] || 0), 0)
  // Check if any "more" item is active
  const moreHasActive = mobileMore.some(item => pathname.startsWith(item.href))

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-6 mb-4">
                <div className="relative h-8 w-32">
                  <Image
                    src="/logo.png"
                    alt="Papola"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </div>
              {role === 'sales_manager' && (
                <div className="mx-4 mb-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Gerente de Ventas</p>
                </div>
              )}
              <nav className="mt-5 flex-1 px-4 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        isActive
                          ? 'bg-papola-blue-20 text-papola-blue'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-papola-blue' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 flex-shrink-0 h-5 w-5'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                      {badges[item.href] ? <BadgeCount count={badges[item.href]} /> : null}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: "More" sheet overlay */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-xl border-t border-gray-200 p-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Más opciones</p>
              <button onClick={() => setMoreOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {mobileMore.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-papola-blue-20 text-papola-blue'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-papola-blue' : 'text-gray-400')} />
                    {item.name}
                    {badges[item.href] ? (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                        {badges[item.href] > 20 ? '+20' : badges[item.href]}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileMain.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors',
                  isActive ? 'text-papola-blue' : 'text-gray-400'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-papola-blue' : 'text-gray-400')} />
                  {badges[item.href] ? <MobileBadge count={badges[item.href]} /> : null}
                </div>
                {item.name}
              </Link>
            )
          })}
          {hasMore && (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors',
                moreHasActive || moreOpen ? 'text-papola-blue' : 'text-gray-400'
              )}
            >
              <div className="relative">
                <MoreHorizontal className={cn('h-5 w-5', moreHasActive || moreOpen ? 'text-papola-blue' : 'text-gray-400')} />
                {moreBadgeTotal > 0 && <MobileBadge count={moreBadgeTotal} />}
              </div>
              Más
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
