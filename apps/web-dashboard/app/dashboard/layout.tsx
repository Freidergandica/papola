import { LayoutDashboard, ShoppingBag, Store, Users, LogOut } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
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
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link 
            href="/dashboard" 
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-papola-blue-20 hover:text-papola-blue transition-colors group"
          >
            <LayoutDashboard className="w-5 h-5 mr-3 group-hover:text-papola-blue" />
            <span className="font-medium">Resumen</span>
          </Link>

          <Link 
            href="/dashboard/stores" 
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-papola-blue-20 hover:text-papola-blue transition-colors group"
          >
            <Store className="w-5 h-5 mr-3 group-hover:text-papola-blue" />
            <span className="font-medium">Tiendas</span>
          </Link>

          <Link 
            href="/dashboard/orders" 
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-papola-blue-20 hover:text-papola-blue transition-colors group"
          >
            <ShoppingBag className="w-5 h-5 mr-3 group-hover:text-papola-blue" />
            <span className="font-medium">Pedidos</span>
          </Link>

          <Link 
            href="/dashboard/users" 
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-papola-blue-20 hover:text-papola-blue transition-colors group"
          >
            <Users className="w-5 h-5 mr-3 group-hover:text-papola-blue" />
            <span className="font-medium">Usuarios</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-papola-blue-20 flex items-center justify-center text-papola-blue font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                {user.email}
              </p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
          <form action="/auth/signout" method="post">
             <button className="w-full mt-2 flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
             </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
