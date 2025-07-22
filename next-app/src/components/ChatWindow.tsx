import { useEffect, useRef } from 'react';
import { Message as MessageComponent } from './Message';
import { Message as MessageType } from '@/types/message';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';

interface ChatWindowProps {
  messages: MessageType[];
  isLoading?: boolean;
  streamingMessage?: string;
}

export const ChatWindow = ({ 
  messages, 
  isLoading = false,
  streamingMessage 
}: ChatWindowProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-6 w-full">
        {messages.length === 0 && !streamingMessage && !isLoading && (
          <motion.div 
            className="flex items-center justify-center h-full min-h-[50vh] sm:min-h-[60vh] w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center max-w-xs sm:max-w-md px-4 w-full">
              <motion.div 
                className="w-14 h-14 sm:w-16 sm:h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-zinc-700"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Bot size={24} className="text-zinc-400 sm:w-8 sm:h-8" />
              </motion.div>
              <motion.h2 
                className="text-lg sm:text-2xl font-semibold text-zinc-100 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Hello! I&apos;m your AI assistant with memory capabilities.
              </motion.h2>
              <motion.p 
                className="text-zinc-400 leading-relaxed text-sm sm:text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                I&apos;m an AI assistant with memory capabilities. I&apos;ll remember our conversations and learn about you over time to provide more personalized help.
              </motion.p>
            </div>
          </motion.div>
        )}
        
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="w-full"
            >
              <MessageComponent message={message} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Streaming Message */}
        <AnimatePresence>
          {streamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-3 sm:py-6 w-full"
            >
              <div className="flex space-x-3 sm:space-x-4 w-full">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 border border-zinc-700">
                  <Bot size={14} className="text-zinc-400 sm:w-4 sm:h-4" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap break-words text-zinc-200 leading-relaxed text-sm sm:text-base word-break">
                      {streamingMessage}
                      <motion.span
                        className="inline-block w-2 h-4 sm:w-3 sm:h-5 bg-zinc-400 ml-1 rounded-sm"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && !streamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-3 sm:py-6 w-full"
            >
              <div className="flex space-x-3 sm:space-x-4 w-full">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 border border-zinc-700">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  >
                    <Bot size={14} className="text-zinc-400 sm:w-4 sm:h-4" />
                  </motion.div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-500 rounded-full"
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1.5,
                            delay: i * 0.2
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-zinc-400 text-xs sm:text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}; 