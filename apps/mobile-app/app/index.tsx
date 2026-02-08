import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('¡Registro exitoso!', 'Por favor revisa tu correo para confirmar tu cuenta.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-center px-8">
      <View className="items-center mb-12">
        <Text className="text-5xl font-bold text-purple-600 tracking-tighter">Papola</Text>
        <Text className="text-gray-500 mt-2 text-lg">Tu comida, al instante</Text>
      </View>

      <View className="gap-y-4">
        <View>
          <Text className="text-gray-700 font-medium mb-2 ml-1">Correo Electrónico</Text>
          <TextInput 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base"
            placeholder="hola@papola.app"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-gray-700 font-medium mb-2 ml-1">Contraseña</Text>
          <TextInput 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          className="bg-purple-600 py-4 rounded-2xl items-center shadow-lg shadow-purple-200 mt-4 active:bg-purple-700 flex-row justify-center"
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">{isSignUp ? 'Registrarse' : 'Iniciar Sesión'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity className="items-center mt-4" onPress={() => setIsSignUp(!isSignUp)}>
           <Text className="text-gray-500 text-sm">
             {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
           </Text>
        </TouchableOpacity>

        {!isSignUp && (
          <TouchableOpacity className="items-center mt-2">
             <Text className="text-gray-400 text-sm">¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View className="absolute bottom-10 left-0 right-0 items-center">
         <Text className="text-gray-400 text-sm">v1.0.0 Alpha</Text>
      </View>
    </SafeAreaView>
  );
}
