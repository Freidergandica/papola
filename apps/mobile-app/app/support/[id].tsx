import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSupportMessages, SupportMessage } from '../../hooks/useSupportMessages';

interface TicketDetail {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: '#3b82f6' },
  in_progress: { label: 'En proceso', color: '#f59e0b' },
  resolved: { label: 'Resuelto', color: '#22c55e' },
  closed: { label: 'Cerrado', color: '#6b7280' },
};

export default function SupportChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: ticketData } = await supabase
        .from('support_tickets')
        .select('id, subject, category, status, created_at')
        .eq('id', id)
        .single();

      if (ticketData) setTicket(ticketData);

      const { data: messagesData } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (messagesData) setMessages(messagesData);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleNewMessage = useCallback((msg: SupportMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useSupportMessages(id ?? null, handleNewMessage);

  const sendMessage = async () => {
    if (!text.trim() || !userId || !id || sending) return;
    setSending(true);

    const messageText = text.trim();
    setText('');

    try {
      await supabase
        .from('support_messages')
        .insert({
          ticket_id: id,
          sender_id: userId,
          message: messageText,
        });
    } catch (error) {
      console.error('Error sending message:', error);
      setText(messageText);
    } finally {
      setSending(false);
    }
  };

  const status = ticket ? (statusConfig[ticket.status] || statusConfig.open) : null;
  const isClosed = ticket?.status === 'closed' || ticket?.status === 'resolved';

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator size="large" color="#1F29DE" />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
              {ticket?.subject || 'Soporte'}
            </Text>
          </View>
          {status && (
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: status.color + '20' }}>
              <Text className="text-[10px] font-bold" style={{ color: status.color }}>{status.label}</Text>
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View className="items-center py-8">
                <Ionicons name="chatbubble-ellipses-outline" size={40} color="#d1d5db" />
                <Text className="text-gray-400 text-sm mt-2">Inicio de la conversación</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isOwn = item.sender_id === userId;
              return (
                <View className={`mb-3 max-w-[80%] ${isOwn ? 'self-end' : 'self-start'}`}>
                  {!isOwn && (
                    <Text className="text-[10px] text-gray-400 font-bold mb-0.5 ml-1">Soporte</Text>
                  )}
                  <View
                    className={`px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? 'bg-papola-blue rounded-br-sm'
                        : 'bg-white border border-gray-100 rounded-bl-sm'
                    }`}
                  >
                    <Text className={`text-sm ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                      {item.message}
                    </Text>
                  </View>
                  <Text className={`text-[10px] text-gray-400 mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                    {new Date(item.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />

          {/* Input */}
          {isClosed ? (
            <View className="px-4 py-3 bg-gray-100 border-t border-gray-200">
              <Text className="text-sm text-gray-500 text-center">Esta consulta ha sido {ticket?.status === 'resolved' ? 'resuelta' : 'cerrada'}.</Text>
            </View>
          ) : (
            <View className="flex-row items-end px-4 py-3 bg-white border-t border-gray-100">
              <TextInput
                className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 max-h-24"
                placeholder="Escribe un mensaje..."
                value={text}
                onChangeText={setText}
                multiline
              />
              <TouchableOpacity
                className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${text.trim() ? 'bg-papola-blue' : 'bg-gray-200'}`}
                onPress={sendMessage}
                disabled={!text.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={18} color={text.trim() ? 'white' : '#9ca3af'} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
