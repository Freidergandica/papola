import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Store, Product, Deal } from '../../types';
import { useCart } from '../../context/CartContext';
import { DealCard } from '../../components/DealCard';
import { shadowStyles } from '../../styles/shadows';
import MapView, { Marker } from 'react-native-maps';

export default function StoreDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  
  const { addItem, items, total } = useCart();

  useEffect(() => {
    if (id) {
      fetchStoreDetails();
    }
  }, [id]);

  const fetchStoreDetails = async () => {
    try {
      // 1. Fetch Store Info
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // 2. Fetch Products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', id)
        .eq('is_available', true);

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // 3. Fetch active deals for this store
      const now = new Date().toISOString();
      const { data: dealsData } = await supabase
        .from('deals')
        .select('*')
        .eq('store_id', id)
        .eq('is_active', true)
        .eq('is_approved', true)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order('is_featured', { ascending: false });

      setDeals(dealsData || []);

    } catch (error) {
      console.error('Error fetching store details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    // Optimistic visual feedback
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 800);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1F29DE" />
      </View>
    );
  }

  if (!store) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Restaurante no encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-papola-blue font-bold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white">
        {/* Header Image */}
        <View className="h-64 relative">
          <Image 
            source={{ uri: store.image_url }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute top-0 left-0 right-0 h-24 bg-black/30" />
          
          <TouchableOpacity 
            onPress={() => router.back()}
            className="absolute top-12 left-4 w-10 h-10 bg-white/90 rounded-full items-center justify-center"
            style={shadowStyles.sm}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 -mt-6 bg-white rounded-t-3xl px-6 pt-8">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-2xl font-bold text-gray-900 flex-1">{store.name}</Text>
            <View className="flex-row items-center bg-green-50 px-3 py-1 rounded-full">
              <Ionicons name="star" size={16} color="#16a34a" />
              <Text className="text-green-700 font-bold ml-1">{store.rating}</Text>
            </View>
          </View>

          <Text className="text-gray-500 mb-6">{store.description}</Text>

          <View className="flex-row items-center space-x-6 mb-8 border-b border-gray-100 pb-6">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color="#1F29DE" />
              <Text className="text-gray-700 ml-2 font-medium">
                {store.delivery_time_min}-{store.delivery_time_max} min
              </Text>
            </View>
            <View className="flex-row items-center ml-6">
              <Ionicons name="bicycle-outline" size={20} color="#1F29DE" />
              <Text className="text-gray-700 ml-2 font-medium">Envío Gratis</Text>
            </View>
          </View>

          {/* Location Map */}
          {store.latitude != null && store.longitude != null && (
            <View className="mb-8">
              <Text className="text-lg font-bold text-gray-900 mb-3">Ubicación</Text>
              <View className="rounded-2xl overflow-hidden" style={shadowStyles.sm}>
                <MapView
                  style={{ width: '100%', height: 180 }}
                  initialRegion={{
                    latitude: store.latitude,
                    longitude: store.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: store.latitude,
                      longitude: store.longitude,
                    }}
                    title={store.name}
                  />
                </MapView>
              </View>
              <TouchableOpacity
                className="flex-row items-center justify-center mt-3 py-2"
                onPress={() => {
                  const url = Platform.select({
                    ios: `maps:0,0?q=${store.latitude},${store.longitude}`,
                    android: `geo:0,0?q=${store.latitude},${store.longitude}(${encodeURIComponent(store.name)})`,
                  });
                  if (url) Linking.openURL(url);
                }}
              >
                <Ionicons name="navigate-outline" size={18} color="#1F29DE" />
                <Text className="text-papola-blue font-bold ml-2">Cómo llegar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Active Deals */}
          {deals.length > 0 && (
            <View className="mb-6">
              <Text className="text-xl font-bold text-gray-900 mb-3">Ofertas</Text>
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </View>
          )}

          <Text className="text-xl font-bold text-gray-900 mb-4">Menú</Text>
          
          {products.map((product) => (
            <TouchableOpacity 
              key={product.id}
              className="flex-row mb-6 bg-white"
              activeOpacity={0.7}
              onPress={() => handleAddToCart(product)}
            >
              <View className="flex-1 pr-4">
                <Text className="text-lg font-bold text-gray-900 mb-1">{product.name}</Text>
                <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>
                  {product.description}
                </Text>
                <Text className="text-papola-blue-80 font-bold">${product.price.toFixed(2)}</Text>
                {addedProductId === product.id && (
                  <Text className="text-green-600 text-xs font-bold mt-1">Agregado al carrito</Text>
                )}
              </View>
              {product.image_url && (
                <View className="relative">
                   <Image
                    source={{ uri: product.image_url }}
                    className="w-24 h-24 rounded-xl bg-gray-100"
                  />
                  <View className={`absolute bottom-0 right-0 rounded-full w-8 h-8 items-center justify-center ${
                    addedProductId === product.id ? 'bg-green-500' : 'bg-papola-blue'
                  }`} style={shadowStyles.sm}>
                    <Ionicons name={addedProductId === product.id ? 'checkmark' : 'add'} size={20} color="white" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          <View className="h-28" /> 
        </ScrollView>

        {/* Floating Cart Button */}
        {cartItemCount > 0 && (
          <View className="absolute bottom-8 left-0 right-0 px-6">
            <TouchableOpacity 
              className="bg-papola-blue py-4 rounded-2xl flex-row items-center justify-between px-6"
              style={shadowStyles.blue}
              onPress={() => router.push('/cart')}
            >
              <View className="flex-row items-center">
                <View className="bg-papola-blue-80 rounded-full w-8 h-8 items-center justify-center mr-3">
                   <Text className="text-white font-bold text-xs">{cartItemCount}</Text>
                </View>
                <Text className="text-white font-bold text-lg">Ver Carrito</Text>
              </View>
              <Text className="text-white font-bold text-lg">${total.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
