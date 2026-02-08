import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Store } from '../../types';
import { StoreCard } from '../../components/StoreCard';
import { router } from 'expo-router';

export default function HomeScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStores();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-4" edges={['top']}>
      <View className="mt-4 mb-6">
        <Text className="text-2xl font-bold text-gray-900">Hola, Freider 👋</Text>
        <Text className="text-gray-500">¿Qué se te antoja hoy?</Text>
      </View>
      
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333ea" />
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoreCard 
              store={item} 
              onPress={() => {
                // TODO: Navigate to store details
                console.log('Selected store:', item.name);
              }} 
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333ea" />
          }
          ListEmptyComponent={
            <View className="mt-8 bg-white p-6 rounded-3xl items-center shadow-sm border border-gray-100">
               <Text className="text-purple-800 font-bold text-lg">Próximamente</Text>
               <Text className="text-gray-500 text-center mt-2">Aún no hay restaurantes disponibles en tu zona.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
