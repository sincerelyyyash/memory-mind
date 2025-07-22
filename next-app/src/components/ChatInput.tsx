'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      adjustTextareaHeight();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur w-full">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 w-full">
        <motion.form
          onSubmit={handleSubmit}
          className={`relative bg-zinc-900/50 rounded-2xl border transition-all duration-200 w-full ${
            isFocused ? 'border-zinc-600 shadow-lg shadow-zinc-900/50' : 'border-zinc-800'
          }`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-end space-x-2 sm:space-x-3 p-3 sm:p-4 w-full">
            {/* Text Input */}
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={disabled ? "Please wait..." : "Message AI..."}
                disabled={disabled}
                rows={1}
                className="w-full bg-transparent text-zinc-200 placeholder-zinc-500 resize-none border-none outline-none text-sm sm:text-base leading-relaxed overflow-hidden"
                style={{ 
                  minHeight: '20px',
                  maxHeight: '120px'
                }}
              />
            </div>

            {/* Send Button */}
            <motion.button
              type="submit"
              disabled={!canSend}
              className={`p-2 sm:p-3 rounded-xl transition-all duration-200 flex-shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center ${
                canSend
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600'
                  : 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800'
              }`}
              whileTap={canSend ? { scale: 0.95 } : {}}
              whileHover={canSend ? { scale: 1.02 } : {}}
            >
              <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
            </motion.button>
          </div>

          {/* Character count indicator (optional) */}
          {message.length > 500 && (
            <div className="absolute bottom-2 right-14 sm:right-20 text-xs text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded text-[10px] sm:text-xs">
              {message.length}/2000
            </div>
          )}
        </motion.form>

        {/* Help text */}
        <motion.p 
          className="text-xs text-zinc-500 text-center mt-2 sm:mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Press Enter to send, Shift+Enter for new line
        </motion.p>
      </div>
    </div>
  );
}; 