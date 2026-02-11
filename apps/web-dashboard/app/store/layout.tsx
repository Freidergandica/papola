import StoreSidebar from '@/components/store/sidebar'
import StoreNotificationWrapper from './notification-wrapper'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <StoreSidebar />
      <StoreNotificationWrapper />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
