import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const handleLogout = () => {
    // TODO: Logout logic
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-4">
       <View className="items-center mt-10">
          <View className="w-24 h-24 bg-purple-100 rounded-full items-center justify-center mb-4">
            <Text className="text-3xl">👤</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">Usuario Demo</Text>
          <Text className="text-gray-500">usuario@papola.app</Text>
       </View>

       <View className="mt-10">
          <TouchableOpacity 
            className="bg-red-50 py-4 rounded-xl items-center"
            onPress={handleLogout}
          >
            <Text className="text-red-600 font-bold">Cerrar Sesión</Text>
          </TouchableOpacity>
       </View>
    </SafeAreaView>
  );
}
