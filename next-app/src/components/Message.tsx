import { Message as MessageType } from '@/types/message';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
}

export const Message = ({ message }: MessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      className={cn(
        'py-3 sm:py-6 border-b border-zinc-800/50 w-full',
        isUser ? 'bg-zinc-900/20' : 'bg-transparent'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex space-x-3 sm:space-x-4 w-full">
        {/* Avatar */}
        <div className={cn(
          'w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 border',
          isUser 
            ? 'bg-zinc-700 border-zinc-600' 
            : 'bg-zinc-800 border-zinc-700'
        )}>
          {isUser ? (
            <User size={12} className="text-zinc-300 sm:w-4 sm:h-4" />
          ) : (
            <Bot size={12} className="text-zinc-400 sm:w-4 sm:h-4" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm font-medium text-zinc-300">
              {isUser ? 'You' : 'AI'}
            </span>
            <span className="text-xs text-zinc-500 ml-2">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap break-words text-zinc-200 leading-relaxed text-sm sm:text-base overflow-wrap-anywhere">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 