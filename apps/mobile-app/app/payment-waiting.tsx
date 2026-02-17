import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useOrderUpdates } from '../hooks/useOrderUpdates';
import { shadowStyles } from '../styles/shadows';

const EXPIRATION_SECONDS = 5 * 60;

type PaymentStatus = 'pending_payment' | 'authorized' | 'accepted' | 'expired';

const steps: { status: PaymentStatus; label: string }[] = [
  { status: 'pending_payment', label: 'Esperando pago' },
  { status: 'authorized', label: 'Pago detectado' },
  { status: 'accepted', label: 'Pago confirmado' },
];

export default function PaymentWaitingScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    amountVes: string;
    cedula: string;
    totalUsd: string;
    exchangeRate: string;
  }>();

  const [currentStatus, setCurrentStatus] = useState<PaymentStatus>('pending_payment');
  const [secondsLeft, setSecondsLeft] = useState(EXPIRATION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // Realtime status updates
  const handleStatusChange = useCallback((newStatus: string) => {
    const validStatuses: PaymentStatus[] = ['pending_payment', 'authorized', 'accepted', 'expired'];
    if (validStatuses.includes(newStatus as PaymentStatus)) {
      setCurrentStatus(newStatus as PaymentStatus);
    }
    if (newStatus === 'accepted' || newStatus === 'expired') {
      clearInterval(timerRef.current);
    }
  }, []);

  useOrderUpdates(params.orderId ?? null, handleStatusChange);

  // Handle client-side expiration
  useEffect(() => {
    if (secondsLeft === 0 && currentStatus === 'pending_payment') {
      setCurrentStatus('expired');
    }
  }, [secondsLeft, currentStatus]);

  const isFinished = currentStatus === 'accepted' || currentStatus === 'expired';
  const isSuccess = currentStatus === 'accepted';
  const isExpired = currentStatus === 'expired';

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const getStepState = (stepStatus: PaymentStatus) => {
    const statusOrder: PaymentStatus[] = ['pending_payment', 'authorized', 'accepted'];
    const currentIdx = statusOrder.indexOf(currentStatus);
    const stepIdx = statusOrder.indexOf(stepStatus);

    if (isExpired) return 'expired';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 px-6 justify-center">
          {/* Status Icon */}
          <View className="items-center mb-8">
            {isSuccess ? (
              <View className="bg-green-100 p-6 rounded-full">
                <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
              </View>
            ) : isExpired ? (
              <View className="bg-red-100 p-6 rounded-full">
                <Ionicons name="close-circle" size={64} color="#ef4444" />
              </View>
            ) : (
              <View className="bg-blue-100 p-6 rounded-full">
                <Ionicons name="time" size={64} color="#3b82f6" />
              </View>
            )}

            <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
              {isSuccess
                ? 'Pago confirmado!'
                : isExpired
                  ? 'Pago expirado'
                  : 'Esperando tu pago'}
            </Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">
              {isSuccess
                ? 'Tu pedido está siendo procesado'
                : isExpired
                  ? 'El tiempo para pagar ha expirado'
                  : 'Realiza tu Pago Móvil con los datos a continuación'}
            </Text>
          </View>

          {/* Payment Info Card */}
          <View className="bg-gray-50 rounded-2xl p-5 mb-6" style={shadowStyles.sm}>
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm text-gray-500">Monto en Bs.</Text>
              <Text className="text-lg font-bold text-gray-900">Bs. {params.amountVes}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm text-gray-500">Total USD</Text>
              <Text className="text-sm font-medium text-gray-700">${params.totalUsd}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm text-gray-500">Cédula</Text>
              <Text className="text-sm font-medium text-gray-700">{params.cedula}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Tasa</Text>
              <Text className="text-sm text-gray-500">1 USD = {params.exchangeRate} Bs.</Text>
            </View>
          </View>

          {/* Countdown */}
          {!isFinished && (
            <View className="items-center mb-6">
              <Text className="text-3xl font-bold text-papola-blue">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </Text>
              <Text className="text-xs text-gray-400 mt-1">Tiempo restante para pagar</Text>
            </View>
          )}

          {/* Progress Steps */}
          <View className="mb-8">
            {steps.map((step, index) => {
              const state = getStepState(step.status);
              return (
                <View key={step.status} className="flex-row items-center mb-4">
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      state === 'done'
                        ? 'bg-green-500'
                        : state === 'active'
                          ? 'bg-papola-blue'
                          : state === 'expired'
                            ? 'bg-red-400'
                            : 'bg-gray-200'
                    }`}
                  >
                    {state === 'done' ? (
                      <Ionicons name="checkmark" size={16} color="white" />
                    ) : (
                      <Text className="text-white font-bold text-xs">{index + 1}</Text>
                    )}
                  </View>
                  <Text
                    className={`ml-3 text-sm font-medium ${
                      state === 'done'
                        ? 'text-green-600'
                        : state === 'active'
                          ? 'text-papola-blue'
                          : state === 'expired'
                            ? 'text-red-500'
                            : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </Text>
                  {state === 'active' && !isExpired && (
                    <View className="ml-2 bg-papola-blue-20 rounded-full px-2 py-0.5">
                      <Text className="text-papola-blue text-[10px] font-bold">EN CURSO</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Action Button */}
          {isFinished && (
            <TouchableOpacity
              className={`py-4 rounded-2xl items-center ${isSuccess ? 'bg-green-500' : 'bg-papola-blue'}`}
              style={shadowStyles.blue}
              onPress={() => router.replace('/(tabs)/orders')}
            >
              <Text className="text-white font-bold text-lg">Ver mis pedidos</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}
