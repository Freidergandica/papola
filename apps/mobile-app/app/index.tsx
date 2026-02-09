import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

export default function LoginScreen() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [waitingForOtp, setWaitingForOtp] = useState(false);

  // Email/Password Auth
  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('¡Registro exitoso!', 'Por favor revisa tu correo para confirmar tu cuenta.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Phone Auth (OTP)
  const handlePhoneLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });
      if (error) throw error;
      setWaitingForOtp(true);
      Alert.alert('Código enviado', 'Revisa tus mensajes de texto.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Social Auth
  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    try {
      const redirectUrl = Linking.createURL('/(tabs)/home');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
        <View className="items-center mb-10">
          <Text className="text-5xl font-bold text-purple-600 tracking-tighter">Papola</Text>
          <Text className="text-gray-500 mt-2 text-lg">Tu comida, al instante</Text>
        </View>

        {/* Auth Method Tabs */}
        <View className="flex-row bg-gray-100 p-1 rounded-xl mb-8">
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${authMethod === 'email' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => { setAuthMethod('email'); setWaitingForOtp(false); }}
          >
            <Text className={`font-medium ${authMethod === 'email' ? 'text-purple-600' : 'text-gray-500'}`}>Correo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${authMethod === 'phone' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setAuthMethod('phone')}
          >
            <Text className={`font-medium ${authMethod === 'phone' ? 'text-purple-600' : 'text-gray-500'}`}>Teléfono</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-y-4">
          {authMethod === 'email' ? (
            <>
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
                className="bg-purple-600 py-4 rounded-2xl items-center shadow-lg shadow-purple-200 mt-2 active:bg-purple-700"
                onPress={handleEmailAuth}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{isSignUp ? 'Registrarse' : 'Iniciar Sesión'}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {!waitingForOtp ? (
                <View>
                  <Text className="text-gray-700 font-medium mb-2 ml-1">Número de Teléfono</Text>
                  <TextInput 
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base"
                    placeholder="+57 300 123 4567"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity 
                    className="bg-purple-600 py-4 rounded-2xl items-center shadow-lg shadow-purple-200 mt-6 active:bg-purple-700"
                    onPress={handlePhoneLogin}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Enviar Código</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text className="text-gray-700 font-medium mb-2 ml-1">Código de Verificación</Text>
                  <TextInput 
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base text-center tracking-widest font-bold"
                    placeholder="000000"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity 
                    className="bg-purple-600 py-4 rounded-2xl items-center shadow-lg shadow-purple-200 mt-6 active:bg-purple-700"
                    onPress={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Verificar y Entrar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity className="items-center mt-4" onPress={() => setWaitingForOtp(false)}>
                     <Text className="text-purple-600 font-medium">Cambiar número</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {authMethod === 'email' && (
            <TouchableOpacity className="items-center mt-2" onPress={() => setIsSignUp(!isSignUp)}>
              <Text className="text-gray-500 text-sm">
                {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </Text>
            </TouchableOpacity>
          )}

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-4 text-gray-400 text-sm">O continúa con</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <View className="flex-row justify-center gap-x-6">
            <TouchableOpacity 
              className="w-14 h-14 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm"
              onPress={() => handleSocialAuth('google')}
            >
              <FontAwesome name="google" size={24} color="#DB4437" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-14 h-14 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm"
              onPress={() => handleSocialAuth('facebook')}
            >
              <FontAwesome name="facebook" size={24} color="#4267B2" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="items-center mt-10">
           <Text className="text-gray-300 text-xs">Al continuar, aceptas nuestros Términos y Condiciones</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
