import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrdersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text className="text-xl font-bold text-gray-800">Mis Pedidos</Text>
      <Text className="text-gray-500 mt-2">Aún no has realizado pedidos.</Text>
    </SafeAreaView>
  );
}
