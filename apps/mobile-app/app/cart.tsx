import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCart } from '../context/CartContext';

export default function CartScreen() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  const handleCheckout = () => {
    // TODO: Implement Checkout
    console.log('Proceed to Checkout');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
           <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Mi Carrito</Text>
        <TouchableOpacity onPress={clearCart} className="p-2">
           <Text className="text-red-500 font-medium">Limpiar</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
           <View className="bg-gray-100 p-6 rounded-full mb-4">
             <Ionicons name="cart-outline" size={48} color="#9ca3af" />
           </View>
           <Text className="text-xl font-bold text-gray-900 text-center">Tu carrito está vacío</Text>
           <Text className="text-gray-500 text-center mt-2">¡Agrega algunos platos deliciosos para comenzar!</Text>
           <TouchableOpacity 
             className="mt-8 bg-purple-600 px-8 py-3 rounded-full"
             onPress={() => router.back()}
           >
             <Text className="text-white font-bold">Explorar Restaurantes</Text>
           </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <View className="flex-row items-center mb-6 bg-white">
                {item.image_url && (
                   <Image 
                     source={{ uri: item.image_url }} 
                     className="w-16 h-16 rounded-xl bg-gray-100 mr-4"
                   />
                )}
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{item.name}</Text>
                  <Text className="text-purple-600 font-bold mt-1">${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
                
                <View className="flex-row items-center bg-gray-100 rounded-lg">
                   <TouchableOpacity 
                     className="p-2"
                     onPress={() => updateQuantity(item.id, item.quantity - 1)}
                   >
                     <Ionicons name="remove" size={16} color="black" />
                   </TouchableOpacity>
                   <Text className="font-bold text-gray-900 px-2">{item.quantity}</Text>
                   <TouchableOpacity 
                     className="p-2"
                     onPress={() => updateQuantity(item.id, item.quantity + 1)}
                   >
                     <Ionicons name="add" size={16} color="black" />
                   </TouchableOpacity>
                </View>
              </View>
            )}
          />
          
          <View className="border-t border-gray-100 p-6 bg-white shadow-lg">
            <View className="flex-row justify-between mb-2">
               <Text className="text-gray-500">Subtotal</Text>
               <Text className="text-gray-900 font-bold">${total.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between mb-6">
               <Text className="text-gray-500">Envío</Text>
               <Text className="text-green-600 font-bold">Gratis</Text>
            </View>
            
            <View className="flex-row justify-between mb-6 pt-4 border-t border-gray-100">
               <Text className="text-xl font-bold text-gray-900">Total</Text>
               <Text className="text-2xl font-bold text-purple-600">${total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              className="bg-purple-600 py-4 rounded-2xl items-center shadow-lg shadow-purple-200"
              onPress={handleCheckout}
            >
              <Text className="text-white font-bold text-lg">Realizar Pedido</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
