'use client';

import { useState, useEffect } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { FactsSidebar } from '@/components/FactsSidebar';
import { Message } from '@/types/message';
import { Fact } from '@/types/fact';
import { nanoid } from 'nanoid';
import { motion, AnimatePresence } from 'framer-motion';
import { getMemoryContext } from '@/lib/mcp';
import { Menu, X, Brain, RotateCcw } from 'lucide-react';

// Constants for localStorage keys
const USER_ID_KEY = 'townsquare-memory-user-id';
const SESSION_NAME_KEY = 'townsquare-memory-session-name';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [showFactsSidebar, setShowFactsSidebar] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [sessionName, setSessionName] = useState<string>('');
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Initialize or restore user session
  useEffect(() => {
    const initializeSession = () => {
      // Try to restore existing user ID from localStorage
      let storedUserId = '';
      let storedSessionName = '';
      
      if (typeof window !== 'undefined') {
        storedUserId = localStorage.getItem(USER_ID_KEY) || '';
        storedSessionName = localStorage.getItem(SESSION_NAME_KEY) || '';
      }

      if (!storedUserId) {
        // Create new user ID if none exists
        storedUserId = nanoid();
        storedSessionName = `Session ${new Date().toLocaleDateString()}`;
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_ID_KEY, storedUserId);
          localStorage.setItem(SESSION_NAME_KEY, storedSessionName);
        }
        
        console.log(`🆕 Created new session: ${storedUserId}`);
      } else {
        console.log(`🔄 Restored existing session: ${storedUserId}`);
      }

      setUserId(storedUserId);
      setSessionName(storedSessionName);
      setIsSessionLoaded(true);
    };

    initializeSession();
  }, []);

  // Load existing messages and facts when session is ready
  useEffect(() => {
    if (!isSessionLoaded || !userId) return;

    const loadData = async () => {
      try {
        console.log(`📥 Loading data for user: ${userId}`);
        
        // Load messages
        const messagesResponse = await fetch(`/api/chat?userId=${userId}`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          const formattedMessages = messagesData.messages.map((msg: {
            id: string;
            userId: string;
            content: string;
            role: 'user' | 'assistant';
            timestamp: string;
          }) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(formattedMessages);
          console.log(`📨 Loaded ${formattedMessages.length} messages`);
        }

        // Load facts
        await loadFacts();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [isSessionLoaded, userId]);

  const loadFacts = async () => {
    if (!userId) return;
    
    try {
      const memoryContext = await getMemoryContext(userId);
      setFacts(memoryContext.facts || []);
      console.log(`Loaded ${memoryContext.facts?.length || 0} facts`);
    } catch (error) {
      console.error('Error loading facts:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!userId) return;

    // Add user message to UI immediately
    const userMessage: Message = {
      id: nanoid(),
      userId,
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          content,
          role: 'user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      setIsLoading(false);
      let fullAssistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                // Stream is complete
                const assistantMessage: Message = {
                  id: nanoid(),
                  userId,
                  content: fullAssistantMessage,
                  role: 'assistant',
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingMessage('');
                
                // Reload facts after each exchange
                setTimeout(() => loadFacts(), 1000);
                return;
              } else {
                // Accumulate streaming content
                fullAssistantMessage += data.content;
                setStreamingMessage(fullAssistantMessage);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setStreamingMessage('');
      
      // Add error message
      const errorMessage: Message = {
        id: nanoid(),
        userId,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleFactUpdate = async () => {
    await loadFacts();
  };

  const handleNewSession = () => {
    if (typeof window !== 'undefined') {
      // Clear current session
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(SESSION_NAME_KEY);
      
      // Reload the page to start fresh
      window.location.reload();
    }
  };

  const handleUpdateSessionName = (newName: string) => {
    setSessionName(newName);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_NAME_KEY, newName);
    }
  };

  // Don't render until session is loaded
  if (!isSessionLoaded) {
    return (
      <div className="flex h-screen bg-zinc-950 text-zinc-50 items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header */}
        <motion.div 
          className="bg-zinc-900/50 backdrop-blur border-b border-zinc-800 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1 overflow-hidden">
              <button
                onClick={() => setShowFactsSidebar(!showFactsSidebar)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors duration-200 flex-shrink-0"
              >
                <Menu size={18} className="sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-sm sm:text-lg font-semibold text-zinc-100 truncate">AI Chat with Memory</h1>
                <p className="text-xs sm:text-sm text-zinc-400 truncate">
                  {sessionName} • Memory-enhanced AI assistant
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
              {/* Desktop facts button */}
              <button
                onClick={() => setShowFactsSidebar(true)}
                className="hidden sm:flex items-center space-x-2 text-xs text-zinc-400 bg-zinc-800/50 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-700/50 transition-colors whitespace-nowrap"
              >
                <Brain size={16} />
                <span>{facts.length} facts remembered</span>
              </button>
              {/* Mobile facts button */}
              <button
                onClick={() => setShowFactsSidebar(true)}
                className="sm:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors relative flex-shrink-0"
                title="View Memory"
              >
                <Brain size={16} />
                {facts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-zinc-600 text-zinc-200 text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {facts.length > 9 ? '9+' : facts.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleNewSession}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors flex-shrink-0"
                title="Start new session"
              >
                <RotateCcw size={14} className="sm:w-4 sm:h-4" />
              </button>
              <div className="hidden md:block text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded text-[10px] whitespace-nowrap">
                ID: {userId.slice(0, 6)}...
              </div>
            </div>
          </div>
        </motion.div>

        {/* Session Info Banner */}
        {messages.length === 0 && (
          <motion.div
            className="bg-zinc-900/30 border-b border-zinc-800 px-3 sm:px-6 py-2 sm:py-3 flex-shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
              <div className="text-xs sm:text-sm text-zinc-300 min-w-0">
                {facts.length > 0 
                  ? `Welcome back! I remember ${facts.length} things about you.`
                  : 'This is a persistent session - I\'ll remember our conversation across tabs and sessions.'
                }
              </div>
              <button
                onClick={() => setShowFactsSidebar(true)}
                className="text-xs text-zinc-400 hover:text-zinc-300 underline self-start sm:self-auto flex-shrink-0"
              >
                View Memory
              </button>
            </div>
          </motion.div>
        )}

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto min-h-0"> 
          <ChatWindow 
            messages={messages}
            isLoading={isLoading}
            streamingMessage={streamingMessage}
          />
        </div>

        {/* Chat Input */}
        <div className="flex-shrink-0">
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={isLoading || streamingMessage.length > 0}
          />
        </div>
      </div>

      {/* Facts Sidebar */}
      <AnimatePresence>
        {showFactsSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFactsSidebar(false)}
              className="fixed inset-0 bg-zinc-950/70 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm sm:w-80 md:w-96 bg-zinc-900/95 backdrop-blur border-l border-zinc-800 z-50 p-3 sm:p-4 rounded-l-xl sm:rounded-l-2xl overflow-hidden"
            >
              <div className="p-3 sm:p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold">Memory Bank</h2>
                  <button
                    onClick={() => setShowFactsSidebar(false)}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Persistent memory for {sessionName}
                </p>
                <div className="text-xs text-zinc-500 mt-2 bg-zinc-800/50 px-2 py-1 rounded text-[10px] sm:text-xs">
                  Session ID: {userId}
                </div>
              </div>
              <FactsSidebar 
                facts={facts}
                userId={userId}
                onFactUpdate={handleFactUpdate}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 