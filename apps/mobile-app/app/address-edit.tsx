import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { AddressPicker } from '../components/AddressPicker';
import { supabase } from '../lib/supabase';
import { UserAddress } from '../types';
import { shadowStyles } from '../styles/shadows';

const LABEL_OPTIONS = ['Casa', 'Trabajo', 'Otro'];

export default function AddressEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [label, setLabel] = useState('Casa');
  const [customLabel, setCustomLabel] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [reference, setReference] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<UserAddress | null>(null);

  useEffect(() => {
    if (!id) return;
    loadAddress(id);
  }, [id]);

  const loadAddress = async (addressId: string) => {
    const { data } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('id', addressId)
      .single();

    if (data) {
      const addr = data as UserAddress;
      setExisting(addr);
      setAddress(addr.address);
      setCoords({ latitude: addr.latitude, longitude: addr.longitude });
      setReference(addr.reference || '');
      setIsPrimary(addr.is_primary);

      if (LABEL_OPTIONS.includes(addr.label)) {
        setLabel(addr.label);
      } else {
        setLabel('Otro');
        setCustomLabel(addr.label);
      }
    }
  };

  const handleAddressSelect = useCallback(
    (result: { address: string; latitude: number; longitude: number }) => {
      setAddress(result.address);
      setCoords({ latitude: result.latitude, longitude: result.longitude });
    },
    []
  );

  const handleSave = async () => {
    const finalLabel = label === 'Otro' ? (customLabel.trim() || 'Otro') : label;

    if (!address.trim()) {
      Alert.alert('Error', 'Selecciona una ubicación en el mapa.');
      return;
    }

    if (!coords) {
      Alert.alert('Error', 'Mueve el mapa para seleccionar una ubicación.');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión.');
        setSaving(false);
        return;
      }

      const payload = {
        user_id: user.id,
        label: finalLabel,
        address: address.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        reference: reference.trim() || null,
        is_primary: isPrimary,
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('user_addresses')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_addresses')
          .insert(payload);

        if (error) throw error;
      }

      router.back();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'No se pudo guardar la dirección.');
    }

    setSaving(false);
  };

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
            <Text className="text-lg font-bold ml-2">
              {isEditing ? 'Editar dirección' : 'Nueva dirección'}
            </Text>
          </View>

          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {/* Map */}
            <View className="mt-4 mb-4">
              <AddressPicker
                onAddressSelect={handleAddressSelect}
                initialAddress={existing?.address}
                initialLatitude={existing?.latitude}
                initialLongitude={existing?.longitude}
              />
            </View>

            {/* Label selector */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-gray-900 mb-2">Etiqueta</Text>
              <View className="flex-row gap-2">
                {LABEL_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    className={`px-4 py-2 rounded-full border ${
                      label === opt
                        ? 'bg-papola-blue border-papola-blue'
                        : 'bg-white border-gray-200'
                    }`}
                    onPress={() => setLabel(opt)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        label === opt ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {label === 'Otro' && (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-sm mt-2"
                  placeholder="Nombre personalizado (ej. Gym, Universidad)"
                  value={customLabel}
                  onChangeText={setCustomLabel}
                />
              )}
            </View>

            {/* Reference */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-gray-900 mb-2">Referencia (opcional)</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm"
                placeholder="ej. Portón azul, piso 3"
                value={reference}
                onChangeText={setReference}
              />
            </View>

            {/* Primary toggle */}
            <TouchableOpacity
              className="flex-row items-center mb-6"
              onPress={() => setIsPrimary(!isPrimary)}
            >
              <View className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                isPrimary ? 'bg-papola-blue border-papola-blue' : 'border-gray-300'
              }`}>
                {isPrimary && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text className="text-sm text-gray-700 ml-3 font-medium">Dirección principal</Text>
            </TouchableOpacity>

            <View className="h-4" />
          </ScrollView>

          {/* Save button */}
          <View className="px-4 pb-6 pt-3 bg-white border-t border-gray-100">
            <TouchableOpacity
              className="bg-papola-blue py-4 rounded-2xl items-center"
              style={shadowStyles.blue}
              onPress={handleSave}
              disabled={saving}
            >
              <Text className="text-white font-bold text-lg">
                {saving ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
