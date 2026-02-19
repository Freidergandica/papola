'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Settings, Store, LogOut, Package, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const navigation = [
  { name: 'Panel', href: '/store/dashboard', icon: LayoutDashboard },
  { name: 'Productos', href: '/store/products', icon: Package },
  { name: 'Ofertas', href: '/store/deals', icon: Tag },
  { name: 'Pedidos', href: '/store/orders', icon: ShoppingBag },
  { name: 'Mi Negocio', href: '/store/settings', icon: Store },
]

export default function StoreSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
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
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-papola-blue-20 text-papola-blue'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-papola-blue' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
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
  )
}
