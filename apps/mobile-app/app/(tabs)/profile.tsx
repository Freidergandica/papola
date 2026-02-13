import { View, Text, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { shadowStyles } from '../../styles/shadows';

const comingSoon = () => Alert.alert('Próximamente', 'Esta función estará disponible pronto.');

const MENU_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
  { icon: 'person-outline', label: 'Perfil', onPress: () => router.push('/profile-edit') },
  { icon: 'location-outline', label: 'Mis direcciones', onPress: () => router.push('/addresses') },
  { icon: 'receipt-outline', label: 'Historial de mis órdenes', onPress: () => router.push('/(tabs)/orders') },
  { icon: 'help-circle-outline', label: 'Ayuda', onPress: comingSoon },
  { icon: 'document-text-outline', label: 'Políticas de privacidad', onPress: comingSoon },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? null);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const displayName = profile?.full_name || email?.split('@')[0] || 'Usuario';
  const displayEmail = email || profile?.email || '';

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#1F29DE" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Header with profile info ── */}
        <View className="bg-papola-blue rounded-b-3xl px-5 pt-6 pb-8">
          <View className="flex-row items-center">
            {/* Avatar */}
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-16 h-16 rounded-full border-2 border-white"
              />
            ) : (
              <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center border-2 border-white/50">
                <Ionicons name="person" size={28} color="#fff" />
              </View>
            )}

            {/* Name & email */}
            <View className="flex-1 ml-4">
              <Text className="text-white text-lg font-bold">{displayName}</Text>
              <Text className="text-white/70 text-sm mt-0.5">{displayEmail}</Text>
              <TouchableOpacity className="mt-1" onPress={() => router.push('/profile-edit')}>
                <Text className="text-white/90 text-xs font-medium underline">Ver perfil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Menu options ── */}
        <View className="mx-4 mt-6 bg-white rounded-2xl border border-gray-100" style={shadowStyles.sm}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center px-4 py-4 ${
                index < MENU_ITEMS.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              activeOpacity={0.6}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon} size={22} color="#374151" />
              <Text className="flex-1 text-gray-800 text-sm font-medium ml-3">{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Store owner CTA ── */}
        <TouchableOpacity
          className="mx-4 mt-5 bg-papola-blue rounded-2xl px-5 py-4 flex-row items-center"
          style={shadowStyles.blue}
          activeOpacity={0.8}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
            tintColor="#fff"
          />
          <View className="flex-1 ml-3">
            <Text className="text-white text-sm font-bold">¿Tienes una tienda?</Text>
            <Text className="text-white/70 text-xs">Agrégala aquí</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* ── Logout ── */}
        <TouchableOpacity
          className="mx-4 mt-6 py-4 items-center border-t border-gray-200"
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Text className="text-red-500 font-semibold text-sm">Cerrar sesión</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
