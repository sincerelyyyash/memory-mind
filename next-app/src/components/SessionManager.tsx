'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Plus, Clock, Brain } from 'lucide-react';

interface SessionManagerProps {
  onSelectSession: (userId: string, sessionName: string) => void;
  onCreateSession: (sessionName: string) => void;
  currentSession?: {
    userId: string;
    sessionName: string;
    factsCount: number;
    lastUsed: Date;
  };
}

export const SessionManager = ({ 
  onSelectSession, 
  onCreateSession, 
  currentSession 
}: SessionManagerProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      onCreateSession(newSessionName.trim());
      setNewSessionName('');
      setShowCreateForm(false);
    }
  };

  const handleContinueSession = () => {
    if (currentSession) {
      onSelectSession(currentSession.userId, currentSession.sessionName);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <User size={32} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">Welcome to AI Chat with Memory</h1>
          <p className="text-gray-400">Your memory-enhanced AI assistant</p>
        </div>

        {/* Current Session Option */}
        {currentSession && (
          <motion.div
            className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Continue Session</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Brain size={16} />
                <span>{currentSession.factsCount} facts</span>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="font-medium text-gray-200 mb-1">{currentSession.sessionName}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock size={12} />
                <span>Last used: {currentSession.lastUsed.toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ID: {currentSession.userId.slice(0, 8)}...
              </p>
            </div>
            
            <button
              onClick={handleContinueSession}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-200"
            >
              Continue This Session
            </button>
          </motion.div>
        )}

        {/* Create New Session */}
        <motion.div
          className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-lg font-medium mb-4">Start New Session</h3>
          
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 py-3 rounded-lg transition-all duration-200 border border-gray-600"
            >
              <Plus size={18} />
              <span>Create New Session</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g., Work Project, Personal Chat, Learning..."
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-400 focus:outline-none transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSession();
                    if (e.key === 'Escape') setShowCreateForm(false);
                  }}
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim()}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-all duration-200"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewSessionName('');
                  }}
                  className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Start Option */}
        {!currentSession && (
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={() => onCreateSession(`Session ${new Date().toLocaleDateString()}`)}
              className="text-gray-400 hover:text-gray-300 text-sm underline transition-colors"
            >
              Or start with default session
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}; 