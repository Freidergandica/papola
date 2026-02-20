import { View, Text, FlatList, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Deal } from '../../types';
import { DealCard } from '../../components/DealCard';
import { SkeletonDealCard } from '../../components/SkeletonDealCard';
import { router } from 'expo-router';
import { shadowStyles } from '../../styles/shadows';

export default function DealsScreen() {
  const [featuredDeals, setFeaturedDeals] = useState<Deal[]>([]);
  const [flashDeals, setFlashDeals] = useState<Deal[]>([]);
  const [regularDeals, setRegularDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeals = async () => {
    try {
      const now = new Date().toISOString();

      // Featured deals
      const { data: featured } = await supabase
        .from('deals')
        .select('*, stores(id, name, image_url)')
        .eq('is_active', true)
        .eq('is_approved', true)
        .eq('is_featured', true)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(10);

      // Flash deals
      const { data: flash } = await supabase
        .from('deals')
        .select('*, stores(id, name, image_url)')
        .eq('is_active', true)
        .eq('is_approved', true)
        .eq('is_flash_deal', true)
        .gt('ends_at', now)
        .order('ends_at', { ascending: true })
        .limit(10);

      // Regular deals
      const { data: regular } = await supabase
        .from('deals')
        .select('*, stores(id, name, image_url)')
        .eq('is_active', true)
        .eq('is_approved', true)
        .eq('is_featured', false)
        .eq('is_flash_deal', false)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(20);

      setFeaturedDeals(featured || []);
      setFlashDeals(flash || []);
      setRegularDeals(regular || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const handleDealPress = (deal: Deal) => {
    if (deal.store_id) {
      router.push(`/store/${deal.store_id}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 px-4" edges={['top']}>
        <View className="mt-4 mb-6">
          <Text className="text-2xl font-bold text-gray-900">Ofertas</Text>
        </View>
        {/* Skeleton featured */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {[1, 2, 3].map((i) => (
            <SkeletonDealCard key={i} featured />
          ))}
        </ScrollView>
        {/* Skeleton regular */}
        {[1, 2, 3].map((i) => (
          <SkeletonDealCard key={i} />
        ))}
      </SafeAreaView>
    );
  }

  const allEmpty = featuredDeals.length === 0 && flashDeals.length === 0 && regularDeals.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F29DE" />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-4 mt-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900">Ofertas</Text>
          <Text className="text-gray-500">Los mejores descuentos para ti</Text>
        </View>

        {allEmpty ? (
          <View className="mx-4 bg-white p-8 rounded-3xl items-center border border-gray-100" style={shadowStyles.sm}>
            <Text className="text-papola-blue font-bold text-lg">Próximamente</Text>
            <Text className="text-gray-500 text-center mt-2">
              Aún no hay ofertas disponibles. ¡Vuelve pronto!
            </Text>
          </View>
        ) : (
          <>
            {/* Featured Deals Carousel */}
            {featuredDeals.length > 0 && (
              <View className="mb-6">
                <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Destacados</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={featuredDeals}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                  renderItem={({ item }) => (
                    <DealCard deal={item} featured onPress={() => handleDealPress(item)} />
                  )}
                />
              </View>
            )}

            {/* Flash Deals */}
            {flashDeals.length > 0 && (
              <View className="mb-6">
                <View className="px-4 flex-row items-center mb-3">
                  <Text className="text-lg font-bold text-gray-900">Flash Deals</Text>
                  <View className="ml-2 bg-orange-100 rounded-full px-2 py-0.5">
                    <Text className="text-orange-600 text-xs font-bold">TIEMPO LIMITADO</Text>
                  </View>
                </View>
                <View className="px-4">
                  {flashDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} onPress={() => handleDealPress(deal)} />
                  ))}
                </View>
              </View>
            )}

            {/* Regular Deals */}
            {regularDeals.length > 0 && (
              <View className="px-4">
                <Text className="text-lg font-bold text-gray-900 mb-3">Todas las ofertas</Text>
                {regularDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onPress={() => handleDealPress(deal)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
