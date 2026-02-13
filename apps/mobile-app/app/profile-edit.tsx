import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

const GENDER_OPTIONS: { value: NonNullable<Profile['gender']>; label: string }[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
  { value: 'prefer_not_to_say', label: 'Prefiero no decir' },
];

export default function ProfileEditScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Profile['gender']>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setIdentificationNumber(data.identification_number || '');
        setPhoneNumber(data.phone_number || '');
        setDateOfBirth(data.date_of_birth || '');
        setGender(data.gender || undefined);
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    launchImage();
  };

  const launchImage = async () => {
    Alert.alert(
      'Próximamente',
      'Para habilitar la cámara, reconstruye la app con:\nnpx expo run:ios',
    );
  };

  const uploadAvatar = async (uri: string) => {
    if (!userId) return;
    setUploadingAvatar(true);

    try {
      const ext = uri.split('.').pop() || 'jpg';
      const filePath = `${userId}/avatar.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster to force reload
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null,
          identification_number: identificationNumber.trim() || null,
          phone_number: phoneNumber.trim() || null,
          date_of_birth: dateOfBirth.trim() || null,
          gender: gender || null,
        })
        .eq('id', userId);

      if (error) throw error;
      Alert.alert('Listo', 'Tu perfil ha sido actualizado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente y no se puede deshacer. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Contactar soporte',
              'Para eliminar tu cuenta, escríbenos a soporte@papolaapp.com y procesaremos tu solicitud.',
            );
          },
        },
      ]
    );
  };

  // Format date input as DD/MM/YYYY
  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    if (cleaned.length > 4) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    setDateOfBirth(formatted);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#1F29DE" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-gray-100 bg-white">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center mr-2"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">Mi perfil</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#1F29DE" />
          ) : (
            <Text className="text-papola-blue font-bold text-sm">Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
            <View className="relative">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-papola-blue-20 items-center justify-center">
                  <Ionicons name="person" size={40} color="#1F29DE" />
                </View>
              )}
              {uploadingAvatar ? (
                <View className="absolute inset-0 w-24 h-24 rounded-full bg-black/40 items-center justify-center">
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-papola-blue items-center justify-center border-2 border-white">
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text className="text-papola-blue text-xs font-medium mt-2">Cambiar foto</Text>
        </View>

        {/* Form fields */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4">
          {/* Nombre */}
          <View className="mb-4">
            <Text className="text-gray-500 text-xs font-medium mb-1.5 ml-1">Nombre</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
              placeholder="Tu nombre"
              placeholderTextColor="#9ca3af"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>

          {/* Apellido */}
          <View className="mb-4">
            <Text className="text-gray-500 text-xs font-medium mb-1.5 ml-1">Apellido</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
              placeholder="Tu apellido"
              placeholderTextColor="#9ca3af"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

          {/* Número de identificación */}
          <View className="mb-4">
            <Text className="text-gray-500 text-xs font-medium mb-1.5 ml-1">Número de identificación</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
              placeholder="V-12345678"
              placeholderTextColor="#9ca3af"
              value={identificationNumber}
              onChangeText={setIdentificationNumber}
              keyboardType="default"
            />
          </View>

          {/* Teléfono móvil */}
          <View className="mb-4">
            <Text className="text-gray-500 text-xs font-medium mb-1.5 ml-1">Teléfono móvil</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
              placeholder="+58 412 1234567"
              placeholderTextColor="#9ca3af"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Fecha de nacimiento */}
          <View className="mb-4">
            <Text className="text-gray-500 text-xs font-medium mb-1.5 ml-1">Fecha de nacimiento</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#9ca3af"
              value={dateOfBirth}
              onChangeText={handleDateChange}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {/* Género */}
          <View>
            <Text className="text-gray-500 text-xs font-medium mb-2 ml-1">Género</Text>
            <View className="flex-row flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`px-4 py-2.5 rounded-xl border ${
                    gender === option.value
                      ? 'bg-papola-blue border-papola-blue'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onPress={() => setGender(gender === option.value ? undefined : option.value)}
                >
                  <Text
                    className={`text-xs font-medium ${
                      gender === option.value ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Delete account */}
        <TouchableOpacity
          className="mt-8 py-4 items-center"
          onPress={handleDeleteAccount}
        >
          <Text className="text-red-500 text-sm font-medium">Eliminar mi cuenta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
