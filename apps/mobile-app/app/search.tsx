import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Store, Product } from '../types';
import { StoreCard } from '../components/StoreCard';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { shadowStyles } from '../styles/shadows';

const CATEGORY_LABELS = [
  'Comida',
  'Estilo de vida',
  'Mercado',
  'Licores',
  'Salud y bienestar',
  'Mascotas',
  'Hogar y Jardín',
  'Tecnología',
  'Entretenimiento',
  'Servicios',
];

interface ProductWithStore extends Product {
  stores?: { id: string; name: string } | null;
}

export default function SearchScreen() {
  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [storeResults, setStoreResults] = useState<Store[]>([]);
  const [productResults, setProductResults] = useState<ProductWithStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (text: string, category: string | null) => {
    if (text.trim().length === 0 && !category) {
      setStoreResults([]);
      setProductResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Build stores query
      let storesQuery = supabase.from('stores').select('*').eq('is_active', true);
      if (text.trim().length > 0) {
        storesQuery = storesQuery.ilike('name', `%${text}%`);
      }
      if (category) {
        storesQuery = storesQuery.ilike('category', `%${category}%`);
      }

      // Build products query
      let productsQuery = supabase
        .from('products')
        .select('*, stores(id, name)')
        .eq('is_available', true);
      if (text.trim().length > 0) {
        productsQuery = productsQuery.ilike('name', `%${text}%`);
      }
      if (category) {
        productsQuery = productsQuery.ilike('category', `%${category}%`);
      }

      const [storesRes, productsRes] = await Promise.all([
        storesQuery.limit(10),
        productsQuery.limit(20),
      ]);

      setStoreResults(storesRes.data || []);
      setProductResults(productsRes.data || []);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(text, activeCategory), 300);
    },
    [search, activeCategory]
  );

  const onSelectCategory = useCallback(
    (cat: string) => {
      const next = activeCategory === cat ? null : cat;
      setActiveCategory(next);
      search(query, next);
    },
    [search, query, activeCategory]
  );

  // Init from route param
  useEffect(() => {
    if (categoryParam) {
      setActiveCategory(categoryParam);
      search('', categoryParam);
    } else {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const totalResults = storeResults.length + productResults.length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Search header */}
      <View className="px-4 py-3 flex-row items-center">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center mr-2"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View
          className="flex-1 flex-row items-center bg-white rounded-xl px-4 py-2.5 border border-gray-100"
          style={shadowStyles.sm}
        >
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            ref={inputRef}
            className="flex-1 ml-2 text-sm text-gray-900"
            placeholder="Buscar tiendas, productos..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={onChangeText}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => onChangeText('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
      >
        {CATEGORY_LABELS.map((cat) => (
          <TouchableOpacity
            key={cat}
            className={`px-4 py-2 rounded-full border ${
              activeCategory === cat
                ? 'bg-papola-blue border-papola-blue'
                : 'bg-white border-gray-200'
            }`}
            onPress={() => onSelectCategory(cat)}
          >
            <Text
              className={`text-xs font-semibold ${
                activeCategory === cat ? 'text-white' : 'text-gray-600'
              }`}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1F29DE" />
        </View>
      ) : !hasSearched ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="search" size={48} color="#d1d5db" />
          <Text className="text-gray-400 text-center mt-3 text-base">
            Busca tiendas y productos
          </Text>
        </View>
      ) : totalResults === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="sad-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 text-center mt-3 text-base">
            No se encontraron resultados
            {query ? ` para "${query}"` : ''}
            {activeCategory ? ` en ${activeCategory}` : ''}
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <>
              {/* Store results */}
              {storeResults.length > 0 && (
                <View className="px-4 mb-4">
                  <Text className="text-lg font-bold text-gray-900 mb-3">Tiendas</Text>
                  {storeResults.map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      onPress={() => router.push(`/store/${store.id}`)}
                    />
                  ))}
                </View>
              )}

              {/* Product results */}
              {productResults.length > 0 && (
                <View className="px-4">
                  <Text className="text-lg font-bold text-gray-900 mb-3">Productos</Text>
                  {productResults.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3 flex-row"
                      style={shadowStyles.sm}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (product.store_id) router.push(`/store/${product.store_id}`);
                      }}
                    >
                      {product.image_url ? (
                        <Image
                          source={{ uri: product.image_url }}
                          className="w-24 h-24"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-24 h-24 bg-papola-blue-20 items-center justify-center">
                          <Ionicons name="cube-outline" size={28} color="#1F29DE" />
                        </View>
                      )}
                      <View className="flex-1 p-3 justify-center">
                        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                          {product.name}
                        </Text>
                        {product.stores && (
                          <View className="flex-row items-center mt-1">
                            <Ionicons name="storefront-outline" size={12} color="#9ca3af" />
                            <Text className="text-xs text-gray-400 ml-1">
                              {product.stores.name}
                            </Text>
                          </View>
                        )}
                        <Text className="text-sm font-bold text-papola-green mt-1">
                          US${product.price.toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}
