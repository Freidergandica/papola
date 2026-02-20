'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Store, LogOut, Package, Tag, MessageCircle, MoreHorizontal, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Panel', href: '/store/dashboard', icon: LayoutDashboard, mobileMain: true },
  { name: 'Productos', href: '/store/products', icon: Package, mobileMain: true },
  { name: 'Ofertas', href: '/store/deals', icon: Tag, mobileMain: false },
  { name: 'Pedidos', href: '/store/orders', icon: ShoppingBag, mobileMain: true },
  { name: 'Soporte', href: '/store/support', icon: MessageCircle, mobileMain: false },
  { name: 'Mi Negocio', href: '/store/settings', icon: Store, mobileMain: false },
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

export default function StoreSidebar({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [moreOpen, setMoreOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const mobileMain = navigation.filter(item => item.mobileMain)
  const mobileMore = navigation.filter(item => !item.mobileMain)
  const hasMore = mobileMore.length > 0
  const moreHasActive = mobileMore.some(item => pathname.startsWith(item.href))
  const moreBadgeTotal = mobileMore.reduce((sum, item) => sum + (badges[item.href] || 0), 0)

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
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
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-papola-blue-20 text-papola-blue'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive ? 'text-papola-blue' : 'text-gray-400 group-hover:text-gray-500'
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
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              className="flex-shrink-0 w-full group block"
            >
              <div className="flex items-center">
                <LogOut className="inline-block h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    Cerrar Sesión
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: "More" sheet overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
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
              {/* Cerrar sesión en el menú "Más" */}
              <button
                onClick={() => { setMoreOpen(false); handleSignOut() }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                Salir
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
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
