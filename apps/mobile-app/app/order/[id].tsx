import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useOrderUpdates } from '../../hooks/useOrderUpdates';
import { shadowStyles } from '../../styles/shadows';
import { TouchableOpacity } from 'react-native';

interface OrderDetail {
  id: string;
  status: string;
  total_amount: number;
  discount_amount?: number;
  amount_in_ves?: number;
  exchange_rate?: number;
  payment_method?: string;
  delivery_address?: string;
  created_at?: string;
  stores?: { id: string; name: string };
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price?: number;
    products?: { name: string; image_url?: string };
  }>;
}

const TERMINAL_STATUSES = ['completed', 'cancelled', 'canceled', 'delivered', 'expired'];

const deliverySteps = [
  { status: 'accepted', label: 'Aceptado', icon: 'checkmark-circle-outline' as const },
  { status: 'preparing', label: 'Preparando', icon: 'restaurant-outline' as const },
  { status: 'ready_for_delivery', label: 'Listo', icon: 'bag-check-outline' as const },
  { status: 'out_for_delivery', label: 'En camino', icon: 'bicycle-outline' as const },
  { status: 'delivered', label: 'Entregado', icon: 'checkmark-done-outline' as const },
];

const statusOrder = ['accepted', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'delivered'];

const preAcceptanceConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pedido pendiente', color: '#eab308', icon: 'time-outline' },
  pending_payment: { label: 'Esperando pago', color: '#f59e0b', icon: 'hourglass-outline' },
  authorized: { label: 'Pago detectado', color: '#3b82f6', icon: 'shield-checkmark-outline' },
  paid: { label: 'Pagado', color: '#3b82f6', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Cancelado', color: '#ef4444', icon: 'close-circle-outline' },
  canceled: { label: 'Cancelado', color: '#ef4444', icon: 'close-circle-outline' },
  expired: { label: 'Expirado', color: '#ef4444', icon: 'alert-circle-outline' },
  completed: { label: 'Completado', color: '#22c55e', icon: 'checkmark-done-outline' },
};

const paymentLabels: Record<string, string> = {
  pago_movil: 'Pago Móvil',
  cash: 'Efectivo',
  c2p: 'Pago con Tarjeta',
};

function getStepState(stepStatus: string, currentStatus: string) {
  const currentIdx = statusOrder.indexOf(currentStatus);
  const stepIdx = statusOrder.indexOf(stepStatus);

  if (currentIdx === -1) return 'pending';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*, stores(id, name), order_items(*, products(name, image_url))')
      .eq('id', id)
      .single();

    if (!error && data) {
      setOrder(data as unknown as OrderDetail);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusChange = useCallback((newStatus: string) => {
    setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
  }, []);

  useOrderUpdates(id ?? null, handleStatusChange);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator size="large" color="#1F29DE" />
        </SafeAreaView>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
          <Text className="text-lg font-bold text-gray-900">Pedido no encontrado</Text>
          <TouchableOpacity className="mt-4" onPress={() => router.back()}>
            <Text className="text-papola-blue font-bold">Volver</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </>
    );
  }

  const isActive = !TERMINAL_STATUSES.includes(order.status);
  const showTimeline = statusOrder.includes(order.status) || order.status === 'completed';
  const preStatus = preAcceptanceConfig[order.status];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 flex-1">Detalle del Pedido</Text>
          {isActive && (
            <View className="bg-papola-blue-20 rounded-full px-3 py-1">
              <Text className="text-papola-blue text-[10px] font-bold">EN VIVO</Text>
            </View>
          )}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Status Timeline or Pre-acceptance Badge */}
          {showTimeline ? (
            <View className="bg-white rounded-2xl p-5 mb-4" style={shadowStyles.sm}>
              <Text className="text-sm font-bold text-gray-900 mb-4">Estado del Pedido</Text>
              <View className="flex-row items-center justify-between px-2">
                {deliverySteps.map((step, index) => {
                  const state = getStepState(step.status, order.status === 'completed' ? 'delivered' : order.status);
                  // For completed orders, mark all as done
                  const finalState = order.status === 'completed' ? 'done' : state;
                  return (
                    <View key={step.status} className="items-center flex-1">
                      <View className="flex-row items-center w-full">
                        {/* Connector line before */}
                        {index > 0 && (
                          <View
                            className="flex-1 h-0.5"
                            style={{
                              backgroundColor: finalState === 'pending' ? '#e5e7eb' : '#22c55e',
                            }}
                          />
                        )}
                        {/* Circle */}
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center"
                          style={{
                            backgroundColor:
                              finalState === 'done'
                                ? '#22c55e'
                                : finalState === 'active'
                                  ? '#1F29DE'
                                  : '#e5e7eb',
                          }}
                        >
                          {finalState === 'done' ? (
                            <Ionicons name="checkmark" size={16} color="white" />
                          ) : (
                            <Ionicons name={step.icon} size={14} color={finalState === 'active' ? 'white' : '#9ca3af'} />
                          )}
                        </View>
                        {/* Connector line after */}
                        {index < deliverySteps.length - 1 && (
                          <View
                            className="flex-1 h-0.5"
                            style={{
                              backgroundColor:
                                finalState === 'done' || finalState === 'active'
                                  ? statusOrder.indexOf(order.status === 'completed' ? 'delivered' : order.status) > index
                                    ? '#22c55e'
                                    : '#e5e7eb'
                                  : '#e5e7eb',
                            }}
                          />
                        )}
                      </View>
                      <Text
                        className="text-[10px] mt-1 text-center"
                        style={{
                          color:
                            finalState === 'done'
                              ? '#22c55e'
                              : finalState === 'active'
                                ? '#1F29DE'
                                : '#9ca3af',
                          fontWeight: finalState === 'active' ? '700' : '500',
                        }}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : preStatus ? (
            <View className="bg-white rounded-2xl p-5 mb-4 items-center" style={shadowStyles.sm}>
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: preStatus.color + '20' }}
              >
                <Ionicons name={preStatus.icon as any} size={32} color={preStatus.color} />
              </View>
              <Text className="text-base font-bold text-gray-900">{preStatus.label}</Text>
            </View>
          ) : null}

          {/* Store Info */}
          {order.stores?.name && (
            <View className="bg-white rounded-2xl p-4 mb-4 flex-row items-center" style={shadowStyles.sm}>
              <View className="bg-gray-100 w-10 h-10 rounded-xl items-center justify-center mr-3">
                <Ionicons name="storefront-outline" size={20} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">{order.stores.name}</Text>
                <Text className="text-xs text-gray-400">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleDateString('es', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Order Items */}
          <View className="bg-white rounded-2xl p-4 mb-4" style={shadowStyles.sm}>
            <Text className="text-sm font-bold text-gray-900 mb-3">Items del Pedido</Text>
            {order.order_items?.map((item) => (
              <View key={item.id} className="flex-row items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <View className="flex-row items-center flex-1">
                  <Text className="text-sm text-gray-500 w-8">{item.quantity}x</Text>
                  <Text className="text-sm text-gray-900 flex-1">{item.products?.name || 'Producto'}</Text>
                </View>
                {item.unit_price && (
                  <Text className="text-sm font-medium text-gray-700">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Payment Summary */}
          <View className="bg-white rounded-2xl p-4 mb-4" style={shadowStyles.sm}>
            <Text className="text-sm font-bold text-gray-900 mb-3">Resumen de Pago</Text>
            {order.payment_method && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-gray-500">Metodo</Text>
                <Text className="text-sm text-gray-700">{paymentLabels[order.payment_method] || order.payment_method}</Text>
              </View>
            )}
            {order.discount_amount && order.discount_amount > 0 ? (
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-gray-500">Descuento</Text>
                <Text className="text-sm text-green-600">-${order.discount_amount.toFixed(2)}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between pt-2 border-t border-gray-100">
              <Text className="text-base font-bold text-gray-900">Total</Text>
              <Text className="text-base font-bold text-papola-blue">${order.total_amount.toFixed(2)}</Text>
            </View>
            {order.amount_in_ves ? (
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-gray-400">En bolivares</Text>
                <Text className="text-xs text-gray-500">Bs. {order.amount_in_ves.toFixed(2)}</Text>
              </View>
            ) : null}
          </View>

          {/* Delivery Address */}
          {order.delivery_address ? (
            <View className="bg-white rounded-2xl p-4 mb-4 flex-row items-start" style={shadowStyles.sm}>
              <Ionicons name="location-outline" size={20} color="#6b7280" style={{ marginTop: 2 }} />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-gray-900 mb-1">Direccion de Entrega</Text>
                <Text className="text-sm text-gray-600">{order.delivery_address}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
