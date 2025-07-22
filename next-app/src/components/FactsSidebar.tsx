'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fact } from '@/types/fact';
import { Edit2, Trash2, Save, X, Plus } from 'lucide-react';

interface FactsSidebarProps {
  facts: Fact[];
  userId: string;
  onFactUpdate: () => void;
}

export const FactsSidebar = ({ facts, onFactUpdate }: FactsSidebarProps) => {
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editingFact, setEditingFact] = useState<Partial<Fact>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleEdit = (fact: Fact) => {
    setEditingFactId(fact.id);
    setEditingFact({
      subject: fact.subject,
      predicate: fact.predicate,
      object: fact.object,
    });
  };

  const handleSave = async (factId: string) => {
    try {
      const response = await fetch('/api/facts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factId,
          ...editingFact,
        }),
      });

      if (response.ok) {
        setEditingFactId(null);
        setEditingFact({});
        onFactUpdate();
      } else {
        const errorData = await response.json();
        alert(`Failed to update fact: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating fact:', error);
      alert('Error updating fact');
    }
  };

  const handleDelete = async (factId: string) => {
    setIsDeleting(factId);
    try {
      const response = await fetch('/api/facts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factId }),
      });

      if (response.ok) {
        onFactUpdate();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete fact: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting fact:', error);
      alert('Error deleting fact');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancel = () => {
    setEditingFactId(null);
    setEditingFact({});
  };

  const formatPredicate = (predicate: string) => {
    return predicate.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (facts.length === 0) {
    return (
      <div className="p-3 sm:p-4 text-center">
        <div className="text-zinc-400 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Plus size={20} className="opacity-50 sm:w-6 sm:h-6" />
          </div>
          <p className="text-sm font-medium">No memories yet</p>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            Start chatting and I&apos;ll remember important details about you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
      <AnimatePresence>
        {facts.map((fact, index) => (
          <motion.div
            key={fact.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1 }}
            className="bg-zinc-800/50 rounded-xl p-3 sm:p-4 hover:bg-zinc-800/70 transition-colors border border-zinc-700/50"
          >
            {editingFactId === fact.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 font-medium">Subject</label>
                  <input
                    type="text"
                    value={editingFact.subject || ''}
                    onChange={(e) => setEditingFact({ ...editingFact, subject: e.target.value })}
                    className="w-full bg-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 border border-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 font-medium">Relationship</label>
                  <input
                    type="text"
                    value={editingFact.predicate || ''}
                    onChange={(e) => setEditingFact({ ...editingFact, predicate: e.target.value })}
                    className="w-full bg-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 border border-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                    placeholder="e.g., lives_in, works_as, likes"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 font-medium">Value</label>
                  <input
                    type="text"
                    value={editingFact.object || ''}
                    onChange={(e) => setEditingFact({ ...editingFact, object: e.target.value })}
                    className="w-full bg-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 border border-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  />
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => handleSave(fact.id)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
                  >
                    <Save size={14} />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center space-x-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-sm font-semibold text-zinc-200 mb-2">
                      {formatPredicate(fact.predicate)}
                    </div>
                    <div className="text-sm text-zinc-300 leading-relaxed break-words">
                      {fact.object}
                    </div>
                    <div className="text-xs text-zinc-500 mt-3 flex flex-wrap items-center gap-2">
                      <span className="bg-zinc-700/50 px-2 py-1 rounded">
                        {fact.subject}
                      </span>
                      <span>•</span>
                      <span>{fact.timestamp ? new Date(fact.timestamp).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(fact)}
                      className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Edit fact"
                    >
                      <Edit2 size={14} className="text-zinc-400 hover:text-zinc-200" />
                    </button>
                    <button
                      onClick={() => handleDelete(fact.id)}
                      disabled={isDeleting === fact.id}
                      className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Delete fact"
                    >
                      <Trash2 
                        size={14} 
                        className={`text-zinc-400 hover:text-red-400 ${
                          isDeleting === fact.id ? 'animate-pulse' : ''
                        }`} 
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}; 