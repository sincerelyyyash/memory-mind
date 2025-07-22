'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Brain, Zap, Clock, User } from 'lucide-react';

// Constants for localStorage keys
const USER_ID_KEY = 'ai-chat-with-memory-user-id';
const SESSION_NAME_KEY = 'ai-chat-with-memory-session-name';

export default function HomePage() {
  const router = useRouter();
  const [existingSession, setExistingSession] = useState<{
    userId: string;
    sessionName: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = () => {
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem(USER_ID_KEY);
        const sessionName = localStorage.getItem(SESSION_NAME_KEY);
        
        if (userId && sessionName) {
          setExistingSession({ userId, sessionName });
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    // Auto-redirect if no existing session after 3 seconds
    if (!isLoading && !existingSession) {
      const timer = setTimeout(() => {
        router.push('/chat');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [router, isLoading, existingSession]);

  const handleContinueSession = () => {
    router.push('/chat');
  };

  const handleNewSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(SESSION_NAME_KEY);
    }
    router.push('/chat');
  };

  const handleStartChat = () => {
    router.push('/chat');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-zinc-700"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <MessageCircle size={32} className="text-zinc-400 sm:w-10 sm:h-10" />
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-neutral-50 dark:to-neutral-400 bg-opacity-5 text-center py-2 mb-4 sm:mb-6 px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            AI Chat with Memory
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-zinc-400 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Experience conversations that remember. Built with Next.js, Gemini 2.5 Flash, and MCP for persistent memory.
          </motion.p>

          {/* Session Options */}
          {existingSession ? (
            <motion.div
              className="mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="bg-zinc-900/50 rounded-2xl p-4 sm:p-6 border border-zinc-800 mb-6 max-w-md mx-auto backdrop-blur-sm">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">Existing Session Found</h3>
                </div>
                
                <div className="text-center mb-6">
                  <p className="font-medium text-zinc-200 mb-1">{existingSession.sessionName}</p>
                  <p className="text-sm text-zinc-500">
                    ID: {existingSession.userId.slice(0, 8)}...
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={handleContinueSession}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium px-6 py-3 sm:py-4 rounded-xl transition-all duration-200 border border-zinc-700 hover:border-zinc-600 text-sm sm:text-base"
                  >
                    Continue Session
                  </button>
                  <button
                    onClick={handleNewSession}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium px-6 py-3 sm:py-4 rounded-xl transition-all duration-200 border border-zinc-800 hover:border-zinc-700 text-sm sm:text-base"
                  >
                    Start New Session
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.button
                onClick={handleStartChat}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-all duration-200 text-base sm:text-lg border border-zinc-700 hover:border-zinc-600"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Your First Chat
              </motion.button>
            </motion.div>
          )}

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="bg-zinc-900/50 rounded-2xl p-4 sm:p-6 border border-zinc-800 backdrop-blur-sm">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 text-zinc-100">Persistent Memory</h3>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">I remember facts about you across sessions and browser tabs</p>
            </div>
            <div className="bg-zinc-900/50 rounded-2xl p-4 sm:p-6 border border-zinc-800 backdrop-blur-sm">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 text-zinc-100">Real-time Streaming</h3>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">Watch responses appear token by token like AI</p>
            </div>
            <div className="bg-zinc-900/50 rounded-2xl p-4 sm:p-6 border border-zinc-800 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 text-zinc-100">Session Continuity</h3>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">Resume conversations exactly where you left off</p>
            </div>
          </motion.div>

          {!existingSession && (
            <motion.p
              className="text-zinc-500 text-xs sm:text-sm mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              Redirecting to chat in 3 seconds...
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
