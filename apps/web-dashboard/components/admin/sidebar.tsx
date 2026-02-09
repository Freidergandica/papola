'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Tiendas', href: '/admin/stores', icon: Store },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-4">
              {/* Logo: Asegúrate de subir tu logo como 'logo.png' en apps/web-dashboard/public */}
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
  )
}
