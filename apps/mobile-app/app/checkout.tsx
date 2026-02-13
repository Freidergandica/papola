import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCart } from '../context/CartContext';
import { useAddress } from '../context/AddressContext';
import { supabase } from '../lib/supabase';
import { shadowStyles } from '../styles/shadows';
import { AddressPicker } from '../components/AddressPicker';

type PaymentMethod = 'pago_movil' | 'c2p' | 'cash';

export default function CheckoutScreen() {
  const { items, total, appliedDeal, discountAmount, clearCart, applyDeal } = useCart();
  const { selectedAddress, effectiveLocation } = useAddress();
  const [address, setAddress] = useState(effectiveLocation?.address || '');
  const [deliveryCoords, setDeliveryCoords] = useState<{ latitude: number; longitude: number } | null>(
    effectiveLocation ? { latitude: effectiveLocation.latitude, longitude: effectiveLocation.longitude } : null
  );
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pago_movil');
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    const { data } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency_pair', 'USD_VES')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (data) setExchangeRate(data.rate);
  };

  const handleAddressSelect = useCallback(
    (result: { address: string; latitude: number; longitude: number }) => {
      setAddress(result.address);
      setDeliveryCoords({ latitude: result.latitude, longitude: result.longitude });
    },
    []
  );

  const finalTotal = Math.max(0, total - discountAmount);
  const totalVES = finalTotal * exchangeRate;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);

    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('coupon_code', couponCode.toUpperCase())
        .eq('is_active', true)
        .eq('is_approved', true)
        .single();

      if (error || !data) {
        Alert.alert('Cupón inválido', 'El código ingresado no es válido o ha expirado.');
        setCouponLoading(false);
        return;
      }

      if (data.ends_at && new Date(data.ends_at) < new Date()) {
        Alert.alert('Cupón expirado', 'Este cupón ya ha expirado.');
        setCouponLoading(false);
        return;
      }

      if (data.min_order_amount && total < data.min_order_amount) {
        Alert.alert('Pedido mínimo', `El pedido mínimo para este cupón es $${data.min_order_amount}.`);
        setCouponLoading(false);
        return;
      }

      applyDeal(data);
      Alert.alert('Cupón aplicado', `Descuento de ${data.discount_type === 'percentage' ? data.discount_value + '%' : '$' + data.discount_value} aplicado.`);
    } catch {
      Alert.alert('Error', 'No se pudo validar el cupón.');
    }
    setCouponLoading(false);
  };

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Dirección requerida', 'Por favor ingresa tu dirección de entrega.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para realizar un pedido.');
        setSubmitting(false);
        return;
      }

      const orderItems = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          store_id: items[0]?.store_id,
          delivery_address: address,
          delivery_latitude: deliveryCoords?.latitude ?? null,
          delivery_longitude: deliveryCoords?.longitude ?? null,
          payment_method: paymentMethod,
          payment_currency: 'USD',
          exchange_rate: exchangeRate,
          amount_in_ves: totalVES,
          deal_id: appliedDeal?.id || null,
          discount_amount: discountAmount,
          total_amount: finalTotal,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Insert order items
      const itemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        ...item,
      }));

      await supabase.from('order_items').insert(itemsToInsert);

      clearCart();
      Alert.alert(
        'Pedido realizado',
        'Tu pedido ha sido creado exitosamente. Recibirás actualizaciones sobre su estado.',
        [{ text: 'Ver mis pedidos', onPress: () => router.replace('/(tabs)/orders') }],
      );
    } catch (error) {
      console.error('Order error:', error);
      Alert.alert('Error', 'No se pudo crear el pedido. Intenta de nuevo.');
    }

    setSubmitting(false);
  };

  const paymentMethods: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'pago_movil', label: 'Pago Móvil', icon: 'phone-portrait-outline' },
    { key: 'c2p', label: 'C2P', icon: 'card-outline' },
    { key: 'cash', label: 'Efectivo', icon: 'cash-outline' },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-lg font-bold ml-2">Checkout</Text>
          </View>

          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {/* Order Summary */}
            <View className="mt-4 mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">Resumen del pedido</Text>
              {items.map(item => (
                <View key={item.id} className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">
                    {item.quantity}x {item.name}
                  </Text>
                  <Text className="text-gray-900 font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Coupon */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-900 mb-2">Cupón de descuento</Text>
              <View className="flex-row">
                <TextInput
                  className="flex-1 border border-gray-300 rounded-l-xl px-4 py-3 text-sm"
                  placeholder="Ingresa tu código"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  className="bg-papola-blue px-4 rounded-r-xl items-center justify-center"
                  onPress={applyCoupon}
                  disabled={couponLoading}
                >
                  <Text className="text-white font-bold text-sm">
                    {couponLoading ? '...' : 'Aplicar'}
                  </Text>
                </TouchableOpacity>
              </View>
              {appliedDeal && (
                <Text className="text-green-600 text-xs mt-1 font-medium">
                  Cupón "{appliedDeal.title}" aplicado: -${discountAmount.toFixed(2)}
                </Text>
              )}
            </View>

            {/* Delivery Address */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-900 mb-2">Dirección de entrega</Text>
              <AddressPicker
                onAddressSelect={handleAddressSelect}
                initialAddress={effectiveLocation?.address}
                initialLatitude={effectiveLocation?.latitude}
                initialLongitude={effectiveLocation?.longitude}
              />
            </View>

            {/* Payment Method */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-900 mb-3">Método de pago</Text>
              {paymentMethods.map(method => (
                <TouchableOpacity
                  key={method.key}
                  className={`flex-row items-center p-4 rounded-xl mb-2 border ${
                    paymentMethod === method.key
                      ? 'border-papola-blue bg-papola-blue-20'
                      : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => setPaymentMethod(method.key)}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={22}
                    color={paymentMethod === method.key ? '#1F29DE' : '#9ca3af'}
                  />
                  <Text
                    className={`ml-3 font-medium ${
                      paymentMethod === method.key ? 'text-papola-blue' : 'text-gray-600'
                    }`}
                  >
                    {method.label}
                  </Text>
                  {paymentMethod === method.key && (
                    <Ionicons name="checkmark-circle" size={20} color="#1F29DE" className="ml-auto" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Display */}
            <View className="bg-gray-50 rounded-2xl p-4 mb-6">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500">Subtotal</Text>
                <Text className="text-gray-900 font-medium">${total.toFixed(2)}</Text>
              </View>
              {discountAmount > 0 && (
                <View className="flex-row justify-between mb-1">
                  <Text className="text-green-600">Descuento</Text>
                  <Text className="text-green-600 font-medium">-${discountAmount.toFixed(2)}</Text>
                </View>
              )}
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500">Envío</Text>
                <Text className="text-green-600 font-medium">Gratis</Text>
              </View>
              <View className="border-t border-gray-200 mt-2 pt-2">
                <View className="flex-row justify-between">
                  <Text className="text-lg font-bold text-gray-900">Total USD</Text>
                  <Text className="text-lg font-bold text-papola-blue">${finalTotal.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-sm text-gray-500">Total Bs. (tasa BCV)</Text>
                  <Text className="text-sm font-bold text-gray-700">Bs. {totalVES.toFixed(2)}</Text>
                </View>
                <Text className="text-[10px] text-gray-400 mt-1">
                  Tasa: 1 USD = {exchangeRate} Bs.
                </Text>
              </View>
            </View>

            <View className="h-4" />
          </ScrollView>

          {/* Confirm Button */}
          <View className="px-4 pb-6 pt-3 bg-white border-t border-gray-100">
            <TouchableOpacity
              className="bg-papola-blue py-4 rounded-2xl items-center"
              style={shadowStyles.blue}
              onPress={handlePlaceOrder}
              disabled={submitting}
            >
              <Text className="text-white font-bold text-lg">
                {submitting ? 'Procesando...' : `Confirmar Pedido · $${finalTotal.toFixed(2)}`}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
