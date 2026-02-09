export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <p className="text-gray-500">No hay pedidos activos por el momento.</p>
        <p className="text-sm text-gray-400 mt-2">Los nuevos pedidos aparecerán aquí.</p>
      </div>
    </div>
  )
}
