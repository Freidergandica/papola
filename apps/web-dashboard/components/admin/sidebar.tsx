'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, Users, Settings, Tag, ShoppingBag, Landmark, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const navigation = [
  { name: 'Panel', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Afiliados', href: '/admin/stores', icon: Store },
  { name: 'Ofertas', href: '/admin/deals', icon: Tag },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Cuentas', href: '/admin/bank-changes', icon: Landmark },
  { name: 'Soporte', href: '/admin/support', icon: MessageCircle },
  { name: 'Config', href: '/admin/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

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
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around h-16 px-1">
          {navigation.map((item) => {
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
                <item.icon className={cn('h-5 w-5', isActive ? 'text-papola-blue' : 'text-gray-400')} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
