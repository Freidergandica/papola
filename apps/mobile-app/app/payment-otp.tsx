import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { apiPost } from '../lib/api';
import { shadowStyles } from '../styles/shadows';

const RESEND_COOLDOWN = 60;

export default function PaymentOtpScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    customerId: string;
    phone: string;
    cedula: string;
    banco: string;
    bancoName: string;
    monto: string;
    totalUsd: string;
    exchangeRate: string;
  }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Enviar OTP al montar
  useEffect(() => {
    sendOtp();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendCooldown]);

  const sendOtp = async () => {
    setOtpSending(true);
    setError(null);

    try {
      const result = await apiPost<{ success: boolean; message: string; code?: string }>(
        '/payments/c2p/generate-otp',
        {
          order_id: params.orderId,
          phone: params.phone,
          cedula: params.cedula,
          banco: params.banco,
          monto: params.monto,
        },
      );

      if (result.success) {
        setOtpSent(true);
        setResendCooldown(RESEND_COOLDOWN);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError('No se pudo enviar el código. Intenta de nuevo.');
    }

    setOtpSending(false);
  };

  const handleCharge = async () => {
    if (otp.length !== 8) {
      Alert.alert('Código incompleto', 'El código debe ser de 8 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiPost<{ success: boolean; reference?: string; message: string; code?: string }>(
        '/payments/c2p/charge',
        {
          order_id: params.orderId,
          phone: params.phone,
          cedula: params.cedula,
          banco: params.banco,
          monto: params.monto,
          otp,
        },
      );

      if (result.success) {
        setSuccess(true);
        setReference(result.reference || null);
      } else {
        setError(result.message);
        setOtp('');
      }
    } catch (err: any) {
      setError('Error al procesar el pago. Intenta de nuevo.');
      setOtp('');
    }

    setLoading(false);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar pago',
      '¿Estás seguro que deseas cancelar?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiPost(`/orders/${params.orderId}/cancel`, {
                customer_id: params.customerId,
              });
            } catch {}
            try { router.dismissAll(); } catch {}
            router.replace('/(tabs)/orders');
          },
        },
      ],
    );
  };

  const maskedPhone = params.phone
    ? `${params.phone.slice(0, 4)}-***-${params.phone.slice(-2)}`
    : '';

  // Pantalla de éxito
  if (success) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <SafeAreaView className="flex-1 bg-white justify-center px-6" edges={['top']}>
          <View className="items-center mb-8">
            <View className="bg-green-100 p-6 rounded-full">
              <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mt-4">Pago exitoso!</Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">
              Tu pedido está siendo procesado
            </Text>
          </View>

          <View className="bg-gray-50 rounded-2xl p-5 mb-6" style={shadowStyles.sm}>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-500">Total USD</Text>
              <Text className="text-sm font-medium text-gray-700">${params.totalUsd}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-500">Total Bs.</Text>
              <Text className="text-sm font-medium text-gray-700">Bs. {params.monto}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-500">Banco</Text>
              <Text className="text-sm font-medium text-gray-700">{params.bancoName}</Text>
            </View>
            {reference && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Referencia</Text>
                <Text className="text-sm font-bold text-papola-blue">{reference}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            className="bg-green-500 py-4 rounded-2xl items-center"
            style={shadowStyles.blue}
            onPress={() => {
              try { router.dismissAll(); } catch {}
              router.replace('/(tabs)/orders');
            }}
          >
            <Text className="text-white font-bold text-lg">Ver mis pedidos</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 px-6 justify-center">
          {/* Icon */}
          <View className="items-center mb-6">
            <View className="bg-papola-blue-20 p-5 rounded-full">
              <Ionicons name="keypad" size={48} color="#1F29DE" />
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Ingresa el código
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-8">
            {otpSent
              ? `Enviamos un código de 8 dígitos al teléfono ${maskedPhone}`
              : otpSending
                ? 'Enviando código...'
                : 'Preparando envío del código...'}
          </Text>

          {/* Order details */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-6">
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-gray-500">Monto a cobrar</Text>
              <Text className="text-sm font-bold text-papola-blue">Bs. {params.monto}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-gray-500">Banco</Text>
              <Text className="text-sm text-gray-700">{params.bancoName} ({params.banco})</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Total USD</Text>
              <Text className="text-sm text-gray-700">${params.totalUsd}</Text>
            </View>
          </View>

          {/* OTP Input */}
          <View className="mb-4">
            <TextInput
              className="border-2 border-gray-300 rounded-2xl px-6 py-4 text-center text-2xl font-bold tracking-[8px]"
              placeholder="00000000"
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 8))}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus={otpSent}
            />
          </View>

          {/* Error */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Resend */}
          <TouchableOpacity
            className="items-center mb-6"
            onPress={sendOtp}
            disabled={resendCooldown > 0 || otpSending}
          >
            <Text className={`text-sm font-medium ${resendCooldown > 0 ? 'text-gray-400' : 'text-papola-blue'}`}>
              {otpSending
                ? 'Enviando...'
                : resendCooldown > 0
                  ? `Reenviar código (${resendCooldown}s)`
                  : 'Reenviar código'}
            </Text>
          </TouchableOpacity>

          {/* Confirm button */}
          <TouchableOpacity
            className={`py-4 rounded-2xl items-center ${otp.length === 8 ? 'bg-papola-blue' : 'bg-gray-300'}`}
            style={otp.length === 8 ? shadowStyles.blue : undefined}
            onPress={handleCharge}
            disabled={loading || otp.length !== 8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Confirmar pago</Text>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity className="py-3 items-center mt-2" onPress={handleCancel}>
            <Text className="text-red-500 font-medium text-sm">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
