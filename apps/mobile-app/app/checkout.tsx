import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCart } from '../context/CartContext';
import { useAddress } from '../context/AddressContext';
import { supabase } from '../lib/supabase';
import { apiGet, apiPost } from '../lib/api';
import { shadowStyles } from '../styles/shadows';
import { AddressPicker } from '../components/AddressPicker';
import { VENEZUELAN_BANKS } from '../lib/banks';

type PaymentMethod = 'pago_movil' | 'c2p';

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
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ code: string; name: string } | null>(null);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    try {
      const data = await apiGet<{ rate: number }>('/payments/exchange-rate');
      if (data?.rate) setExchangeRate(data.rate);
    } catch {
      // Fallback: query Supabase directly
      const { data } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('currency_pair', 'USD_VES')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setExchangeRate(data.rate);
    }
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

    const trimmedCedula = cedula.trim();

    if (paymentMethod === 'pago_movil') {
      if (!/^\d{6,10}$/.test(trimmedCedula)) {
        Alert.alert('Cédula requerida', 'Ingresa tu cédula (6-10 dígitos) para que el banco pueda verificar tu pago.');
        return;
      }
    }

    if (paymentMethod === 'c2p') {
      if (!/^\d{6,10}$/.test(trimmedCedula)) {
        Alert.alert('Cédula requerida', 'Ingresa tu cédula (6-10 dígitos).');
        return;
      }
      if (!/^04\d{9}$/.test(phone.trim())) {
        Alert.alert('Teléfono requerido', 'Ingresa tu número de teléfono (11 dígitos, ej: 04121234567).');
        return;
      }
      if (!selectedBank) {
        Alert.alert('Banco requerido', 'Selecciona tu banco.');
        return;
      }
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

      // Ambos métodos crean la orden via API server (pending_payment + expiración)
      const order = await apiPost<{ id: string }>('/orders', {
        customer_id: user.id,
        store_id: items[0]?.store_id,
        delivery_address: address,
        delivery_latitude: deliveryCoords?.latitude ?? null,
        delivery_longitude: deliveryCoords?.longitude ?? null,
        payment_method: paymentMethod,
        payment_currency: 'USD',
        exchange_rate: exchangeRate,
        deal_id: appliedDeal?.id || null,
        payment_id_card: trimmedCedula,
        items: orderItems,
      });

      clearCart();

      if (paymentMethod === 'pago_movil') {
        try { router.dismissAll(); } catch {}
        router.replace({
          pathname: '/payment-waiting',
          params: {
            orderId: order.id,
            customerId: user.id,
            amountVes: totalVES.toFixed(2),
            cedula: trimmedCedula,
            totalUsd: finalTotal.toFixed(2),
            exchangeRate: String(exchangeRate),
          },
        });
      } else {
        // C2P — navegar a pantalla de OTP
        try { router.dismissAll(); } catch {}
        router.replace({
          pathname: '/payment-otp',
          params: {
            orderId: order.id,
            customerId: user.id,
            phone: phone.trim(),
            cedula: `V${trimmedCedula}`,
            banco: selectedBank!.code,
            bancoName: selectedBank!.name,
            monto: totalVES.toFixed(2),
            totalUsd: finalTotal.toFixed(2),
            exchangeRate: String(exchangeRate),
          },
        });
      }
    } catch (error) {
      console.error('Order error:', error);
      Alert.alert('Error', 'No se pudo crear el pedido. Intenta de nuevo.');
    }

    setSubmitting(false);
  };

  const paymentMethods: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'pago_movil', label: 'Pago Móvil', icon: 'phone-portrait-outline' },
    { key: 'c2p', label: 'Pago con Tarjeta', icon: 'card-outline' },
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

            {/* Cedula (both methods) */}
            {(paymentMethod === 'pago_movil' || paymentMethod === 'c2p') && (
              <View className="mb-4">
                <Text className="text-sm font-bold text-gray-900 mb-2">Cédula del pagador</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-sm"
                  placeholder="Ej: 12345678"
                  value={cedula}
                  onChangeText={(text) => setCedula(text.replace(/[^0-9]/g, '').slice(0, 10))}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Text className="text-[10px] text-gray-400 mt-1">
                  {paymentMethod === 'pago_movil'
                    ? 'Requerida para que el banco verifique tu Pago Móvil'
                    : 'Cédula asociada a tu cuenta bancaria'}
                </Text>
              </View>
            )}

            {/* C2P extra fields: phone + bank */}
            {paymentMethod === 'c2p' && (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-bold text-gray-900 mb-2">Teléfono</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-sm"
                    placeholder="Ej: 04121234567"
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 11))}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                  <Text className="text-[10px] text-gray-400 mt-1">
                    Teléfono asociado a tu cuenta bancaria
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-sm font-bold text-gray-900 mb-2">Banco</Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-xl px-4 py-3 flex-row justify-between items-center"
                    onPress={() => setShowBankPicker(true)}
                  >
                    <Text className={`text-sm ${selectedBank ? 'text-gray-900' : 'text-gray-400'}`}>
                      {selectedBank ? `${selectedBank.name} (${selectedBank.code})` : 'Selecciona tu banco'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </>
            )}

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

        {/* Bank Picker Modal */}
        <Modal visible={showBankPicker} animationType="slide" transparent>
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[70%]">
              <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
                <Text className="text-lg font-bold text-gray-900">Selecciona tu banco</Text>
                <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={VENEZUELAN_BANKS}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`flex-row items-center px-5 py-4 border-b border-gray-50 ${
                      selectedBank?.code === item.code ? 'bg-papola-blue-20' : ''
                    }`}
                    onPress={() => {
                      setSelectedBank({ code: item.code, name: item.name });
                      setShowBankPicker(false);
                    }}
                  >
                    <Text className="text-sm text-gray-500 w-12">{item.code}</Text>
                    <Text className="text-sm text-gray-900 flex-1">{item.name}</Text>
                    {selectedBank?.code === item.code && (
                      <Ionicons name="checkmark-circle" size={20} color="#1F29DE" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}
