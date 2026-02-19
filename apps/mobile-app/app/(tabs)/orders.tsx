import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { useActiveOrdersUpdates } from '../../hooks/useActiveOrdersUpdates';
import { shadowStyles } from '../../styles/shadows';

const TERMINAL_STATUSES = ['completed', 'cancelled', 'canceled', 'delivered', 'expired'];

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendiente', color: '#eab308', icon: 'time-outline' },
  pending_payment: { label: 'Esperando pago', color: '#f59e0b', icon: 'hourglass-outline' },
  authorized: { label: 'Pago detectado', color: '#3b82f6', icon: 'shield-checkmark-outline' },
  expired: { label: 'Expirado', color: '#ef4444', icon: 'alert-circle-outline' },
  paid: { label: 'Pagado', color: '#3b82f6', icon: 'checkmark-circle-outline' },
  accepted: { label: 'Aceptado', color: '#3b82f6', icon: 'checkmark-circle-outline' },
  preparing: { label: 'Preparando', color: '#f97316', icon: 'restaurant-outline' },
  ready_for_pickup: { label: 'Listo', color: '#22c55e', icon: 'bag-check-outline' },
  ready_for_delivery: { label: 'En camino', color: '#8b5cf6', icon: 'bicycle-outline' },
  out_for_delivery: { label: 'En camino', color: '#8b5cf6', icon: 'bicycle-outline' },
  delivered: { label: 'Entregado', color: '#22c55e', icon: 'checkmark-done-outline' },
  completed: { label: 'Completado', color: '#22c55e', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelado', color: '#ef4444', icon: 'close-circle-outline' },
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('orders')
        .select('*, stores(id, name, logo_url), order_items(*, products(name, image_url))')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-time updates for ALL customer orders
  const handleOrderUpdate = useCallback((orderId: string, updatedFields: Record<string, unknown>) => {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o)
    );
  }, []);

  useActiveOrdersUpdates(userId, handleOrderUpdate);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="px-4 mt-4 mb-4">
        <Text className="text-2xl font-bold text-gray-900">Mis Pedidos</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Cargando pedidos...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-gray-100 p-6 rounded-full mb-4">
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center">Sin pedidos</Text>
          <Text className="text-gray-500 text-center mt-2">
            Tus pedidos apareceran aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F29DE" />
          }
          renderItem={({ item: order }) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const isActive = !TERMINAL_STATUSES.includes(order.status);
            return (
              <TouchableOpacity
                className="bg-white rounded-2xl border border-gray-100 mb-4 p-4"
                style={shadowStyles.sm}
                activeOpacity={0.7}
                onPress={() => router.push(`/order/${order.id}`)}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <Ionicons name={status.icon as any} size={18} color={status.color} />
                    <Text style={{ color: status.color }} className="ml-1 text-sm font-bold">
                      {status.label}
                    </Text>
                    {isActive && (
                      <View className="ml-2 bg-papola-blue-20 rounded-full px-2 py-0.5">
                        <Text className="text-papola-blue text-[10px] font-bold">EN VIVO</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400">
                    {new Date(order.created_at || '').toLocaleDateString('es')}
                  </Text>
                </View>

                {/* Store name */}
                {(order as any).stores?.name && (
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    {(order as any).stores.name}
                  </Text>
                )}

                {/* Items */}
                {(order as any).order_items?.map((item: any, i: number) => (
                  <Text key={i} className="text-xs text-gray-500">
                    {item.quantity}x {item.products?.name}
                  </Text>
                ))}

                {/* Total + chevron */}
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-lg font-bold text-papola-blue">
                    ${order.total_amount.toFixed(2)}
                  </Text>
                  <View className="flex-row items-center">
                    {order.discount_amount && order.discount_amount > 0 ? (
                      <Text className="text-xs text-green-600 mr-2">
                        Ahorraste ${order.discount_amount.toFixed(2)}
                      </Text>
                    ) : null}
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
