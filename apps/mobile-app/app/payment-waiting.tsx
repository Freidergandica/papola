import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useOrderUpdates } from '../hooks/useOrderUpdates';
import { apiPost } from '../lib/api';
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
    customerId: string;
    amountVes: string;
    cedula: string;
    totalUsd: string;
    exchangeRate: string;
  }>();

  const [currentStatus, setCurrentStatus] = useState<PaymentStatus>('pending_payment');
  const [secondsLeft, setSecondsLeft] = useState(EXPIRATION_SECONDS);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const copyToClipboard = async (value: string, field: string) => {
    await Clipboard.setStringAsync(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, []);

  // Realtime status updates
  const handleStatusChange = useCallback((newStatus: string) => {
    const validStatuses: PaymentStatus[] = ['pending_payment', 'authorized', 'accepted', 'expired'];
    if (validStatuses.includes(newStatus as PaymentStatus)) {
      setCurrentStatus(newStatus as PaymentStatus);
    }
    if (newStatus === 'accepted' || newStatus === 'expired') {
      clearTimer();
    }
  }, []);

  useOrderUpdates(params.orderId ?? null, handleStatusChange);

  // Handle client-side expiration
  useEffect(() => {
    if (secondsLeft === 0 && currentStatus === 'pending_payment') {
      setCurrentStatus('expired');
    }
  }, [secondsLeft, currentStatus]);

  const handleCancel = () => {
    Alert.alert(
      'Cancelar pago',
      '¿Estás seguro que deseas cancelar este pedido?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await apiPost(`/orders/${params.orderId}/cancel`, {
                customer_id: params.customerId,
              });
              clearTimer();
              setCurrentStatus('expired');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar el pedido');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const isCancelled = currentStatus === 'expired';
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
    if (isSuccess) return 'done';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
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

          {/* Destination Account Card */}
          {!isFinished && (
            <View className="bg-papola-blue/5 border border-papola-blue/20 rounded-2xl p-5 mb-4" style={shadowStyles.sm}>
              <Text className="text-xs font-bold text-papola-blue mb-3 uppercase">Enviar Pago Móvil a</Text>
              <TouchableOpacity className="flex-row justify-between items-center mb-2" onPress={() => copyToClipboard('04242697770', 'phone')}>
                <Text className="text-sm text-gray-500">Teléfono</Text>
                <View className="flex-row items-center">
                  <Text className="text-sm font-bold text-gray-900 mr-2">0424-2697770</Text>
                  <Ionicons name={copiedField === 'phone' ? 'checkmark-circle' : 'copy-outline'} size={16} color={copiedField === 'phone' ? '#22c55e' : '#9ca3af'} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row justify-between items-center mb-2" onPress={() => copyToClipboard('15368907', 'cedula')}>
                <Text className="text-sm text-gray-500">Cédula</Text>
                <View className="flex-row items-center">
                  <Text className="text-sm font-bold text-gray-900 mr-2">V-15368907</Text>
                  <Ionicons name={copiedField === 'cedula' ? 'checkmark-circle' : 'copy-outline'} size={16} color={copiedField === 'cedula' ? '#22c55e' : '#9ca3af'} />
                </View>
              </TouchableOpacity>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-gray-500">Banco</Text>
                <Text className="text-sm font-bold text-gray-900">R4 Micro Financiero (0169)</Text>
              </View>
              <TouchableOpacity className="flex-row justify-between items-center" onPress={() => copyToClipboard(params.amountVes || '', 'amount')}>
                <Text className="text-sm text-gray-500">Monto exacto</Text>
                <View className="flex-row items-center">
                  <Text className="text-lg font-bold text-papola-blue mr-2">Bs. {params.amountVes}</Text>
                  <Ionicons name={copiedField === 'amount' ? 'checkmark-circle' : 'copy-outline'} size={16} color={copiedField === 'amount' ? '#22c55e' : '#9ca3af'} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Instructions */}
          {!isFinished && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
              <Text className="text-xs font-bold text-yellow-700 mb-2 uppercase">Instrucciones de pago</Text>
              <View className="flex-row mb-1.5">
                <Text className="text-yellow-600 text-xs font-bold mr-1.5">1.</Text>
                <Text className="text-xs text-yellow-800 flex-1">Ingresa tu cédula de identidad al realizar la transacción, de esta forma detectaremos tu pago en nuestra cuenta.</Text>
              </View>
              <View className="flex-row mb-1.5">
                <Text className="text-yellow-600 text-xs font-bold mr-1.5">2.</Text>
                <Text className="text-xs text-yellow-800 flex-1">Tu pago se verificará automáticamente. Asegúrate que los datos coincidan exactamente.</Text>
              </View>
              <View className="flex-row">
                <Text className="text-yellow-600 text-xs font-bold mr-1.5">3.</Text>
                <Text className="text-xs text-yellow-800 flex-1">El monto a transferir debe ser igual o mayor a <Text className="font-bold">Bs. {params.amountVes}</Text>.</Text>
              </View>
            </View>
          )}

          {/* Order Details Card */}
          <View className="bg-gray-50 rounded-2xl p-5 mb-6" style={shadowStyles.sm}>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-500">Total USD</Text>
              <Text className="text-sm font-medium text-gray-700">${params.totalUsd}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-500">Tu cédula</Text>
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

          {/* Action Buttons */}
          {isFinished ? (
            <TouchableOpacity
              className={`py-4 rounded-2xl items-center ${isSuccess ? 'bg-green-500' : 'bg-papola-blue'}`}
              style={shadowStyles.blue}
              onPress={() => {
                try { router.dismissAll(); } catch {}
                router.replace('/(tabs)/orders');
              }}
            >
              <Text className="text-white font-bold text-lg">Ver mis pedidos</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="py-3 items-center"
              onPress={handleCancel}
              disabled={cancelling || currentStatus !== 'pending_payment'}
            >
              <Text className="text-red-500 font-medium text-sm">
                {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
