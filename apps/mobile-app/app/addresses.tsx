import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAddress } from '../context/AddressContext';
import { supabase } from '../lib/supabase';
import { UserAddress } from '../types';
import { shadowStyles } from '../styles/shadows';

function getLabelIcon(label: string): keyof typeof Ionicons.glyphMap {
  switch (label.toLowerCase()) {
    case 'casa':
      return 'home-outline';
    case 'trabajo':
      return 'briefcase-outline';
    default:
      return 'location-outline';
  }
}

export default function AddressesScreen() {
  const { addresses, selectedAddress, fetchAddresses, selectAddress } = useAddress();

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [])
  );

  const handleDelete = (addr: UserAddress) => {
    Alert.alert(
      'Eliminar dirección',
      `¿Estás seguro que deseas eliminar "${addr.label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('user_addresses').delete().eq('id', addr.id);
            fetchAddresses();
          },
        },
      ]
    );
  };

  const handleSelect = (addr: UserAddress) => {
    selectAddress(addr);
    router.back();
  };

  const renderItem = ({ item }: { item: UserAddress }) => {
    const isSelected = selectedAddress?.id === item.id;

    return (
      <TouchableOpacity
        className={`bg-white rounded-2xl p-4 mb-3 border ${
          isSelected ? 'border-papola-blue' : 'border-gray-100'
        }`}
        style={shadowStyles.sm}
        activeOpacity={0.7}
        onPress={() => handleSelect(item)}
      >
        <View className="flex-row items-start">
          <View className={`w-10 h-10 rounded-full items-center justify-center ${
            isSelected ? 'bg-papola-blue-20' : 'bg-gray-100'
          }`}>
            <Ionicons
              name={getLabelIcon(item.label)}
              size={20}
              color={isSelected ? '#1F29DE' : '#6b7280'}
            />
          </View>

          <View className="flex-1 ml-3">
            <View className="flex-row items-center">
              <Text className="text-base font-bold text-gray-900">{item.label}</Text>
              {item.is_primary && (
                <View className="ml-2 bg-papola-blue-20 rounded-full px-2 py-0.5">
                  <Text className="text-papola-blue text-[10px] font-bold">Principal</Text>
                </View>
              )}
            </View>
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>
              {item.address}
            </Text>
            {item.reference ? (
              <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                Ref: {item.reference}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center ml-2">
            <TouchableOpacity
              className="p-2"
              onPress={() => router.push({ pathname: '/address-edit', params: { id: item.id } })}
              hitSlop={8}
            >
              <Ionicons name="pencil-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2"
              onPress={() => handleDelete(item)}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-bold ml-2">Mis direcciones</Text>
        </View>

        {addresses.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="location-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-base font-medium mt-4 text-center">
              No tienes direcciones guardadas
            </Text>
            <Text className="text-gray-300 text-sm mt-1 text-center">
              Agrega una dirección para recibir tus pedidos
            </Text>
          </View>
        ) : (
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add button */}
        <View className="px-4 pb-6 pt-3">
          <TouchableOpacity
            className="bg-papola-blue py-4 rounded-2xl items-center flex-row justify-center"
            style={shadowStyles.blue}
            onPress={() => router.push('/address-edit')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text className="text-white font-bold text-base ml-2">Agregar dirección</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
