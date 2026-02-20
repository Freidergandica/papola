'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Check, CheckCheck } from 'lucide-react'

interface Message {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  created_at: string
  read_at: string | null
}

// Optimistic messages don't have an id yet
interface OptimisticMessage {
  _optimistic: true
  message: string
  created_at: string
}

type DisplayMessage = Message | OptimisticMessage

function isOptimistic(msg: DisplayMessage): msg is OptimisticMessage {
  return '_optimistic' in msg
}

function MessageStatus({ msg }: { msg: DisplayMessage }) {
  if (isOptimistic(msg)) {
    // Sending... single check gray
    return <Check className="h-3 w-3 text-gray-400 inline-block" />
  }
  if (msg.read_at) {
    // Read — double check blue
    return <CheckCheck className="h-3 w-3 text-blue-500 inline-block" />
  }
  // Delivered — double check gray
  return <CheckCheck className="h-3 w-3 text-gray-400 inline-block" />
}

export default function SupportChat({
  ticketId,
  currentUserId,
  initialMessages,
  isClosed,
}: {
  ticketId: string
  currentUserId: string
  initialMessages: Message[]
  isClosed?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingBroadcast = useRef<number>(0)
  const supabase = createClient()

  // Mark other party's messages as read
  const markAsRead = useCallback(async () => {
    const unread = messages.filter(m => m.sender_id !== currentUserId && !m.read_at)
    if (unread.length === 0) return

    await supabase
      .from('support_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('ticket_id', ticketId)
      .neq('sender_id', currentUserId)
      .is('read_at', null)
  }, [ticketId, currentUserId, messages, supabase])

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  // Realtime subscription for new messages + updates + typing
  useEffect(() => {
    const channel = supabase
      .channel(`support-web-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Clear optimistic messages when real message arrives
          setOptimisticMessages([])
          // If from other party, mark as read immediately (we're in the chat)
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from('support_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then()
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          setMessages(prev =>
            prev.map(m => m.id === updated.id ? { ...m, read_at: updated.read_at } : m)
          )
        },
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId !== currentUserId) {
          setIsTyping(true)
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
          typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [ticketId, currentUserId, supabase])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, optimisticMessages, isTyping])

  // Broadcast typing (debounced to 1 per second)
  const broadcastTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingBroadcast.current < 1000) return
    lastTypingBroadcast.current = now

    supabase.channel(`support-web-${ticketId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId },
    })
  }, [ticketId, currentUserId, supabase])

  const handleTextChange = (value: string) => {
    setText(value)
    if (value.trim()) broadcastTyping()
  }

  const sendMessage = async () => {
    if (!text.trim() || sending) return
    setSending(true)

    const messageText = text.trim()
    setText('')

    // Add optimistic message
    const optimistic: OptimisticMessage = {
      _optimistic: true,
      message: messageText,
      created_at: new Date().toISOString(),
    }
    setOptimisticMessages(prev => [...prev, optimistic])

    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: currentUserId,
        message: messageText,
      })

    if (error) {
      console.error('Error sending message:', error)
      setText(messageText)
      setOptimisticMessages([])
    }

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Combine real messages + optimistic
  const displayMessages: DisplayMessage[] = [...messages, ...optimisticMessages]

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {displayMessages.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Inicio de la conversación
          </div>
        )}
        {displayMessages.map((msg, i) => {
          const isOwn = isOptimistic(msg) || msg.sender_id === currentUserId
          const key = isOptimistic(msg) ? `opt-${i}` : msg.id
          return (
            <div key={key} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5 ml-1">Soporte</p>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl ${
                    isOwn
                      ? 'bg-papola-blue text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}>
                  <p className="text-[10px] text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isOwn && <MessageStatus msg={msg} />}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[70%]">
              <p className="text-[10px] text-gray-400 font-medium mb-0.5 ml-1">Soporte</p>
              <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-1">
                  <span className="text-sm">Escribiendo</span>
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">Esta consulta ha sido cerrada.</p>
        </div>
      ) : (
        <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-200 bg-white">
          <textarea
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue max-h-24"
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              text.trim() ? 'bg-papola-blue hover:bg-papola-blue-80 text-white' : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
