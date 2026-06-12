import React, { useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { db } from '../../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const OptionBuilder = ({ productId, stageId, questionId, options, allStages, answerType }) => {
  const { currentUser } = useAuth();
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const isCheckbox = answerType === 'Checkbox';

  const handleAddOption = async (e) => {
    e.preventDefault();
    if (!newOption.trim()) return;

    if (options.length >= 4) {
      toast.error("Maximum 4 options allowed");
      return;
    }

    if (options.includes(newOption.trim())) {
      toast.error("Option already exists");
      return;
    }

    try {
      const updatedStages = allStages.map(s => {
        if (s.id === stageId) {
          const updatedQuestions = (s.questions || []).map(q => {
            if (q.id === questionId) {
              return { ...q, options: [...(q.options || []), newOption.trim()] };
            }
            return q;
          });
          return { ...s, questions: updatedQuestions };
        }
        return s;
      });

      await updateDoc(doc(db, 'admins', currentUser.uid, 'products', productId), {
        stages: updatedStages
      });
      setNewOption('');
    } catch (error) {
      console.error(error);
      toast.error("Failed to add option");
    }
  };

  const handleDeleteOption = async (option) => {
    try {
      const updatedStages = allStages.map(s => {
        if (s.id === stageId) {
          const updatedQuestions = (s.questions || []).map(q => {
            if (q.id === questionId) {
              return { ...q, options: (q.options || []).filter(o => o !== option) };
            }
            return q;
          });
          return { ...s, questions: updatedQuestions };
        }
        return s;
      });

      await updateDoc(doc(db, 'admins', currentUser.uid, 'products', productId), {
        stages: updatedStages
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete option");
    }
  };

  const startEdit = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const saveEdit = async (oldOption) => {
    if (!editValue.trim() || editValue.trim() === oldOption) {
      setEditingIndex(null);
      return;
    }
    
    if (options.includes(editValue.trim())) {
      toast.error("Option already exists");
      return;
    }

    try {
      const updatedStages = allStages.map(s => {
        if (s.id === stageId) {
          const updatedQuestions = (s.questions || []).map(q => {
            if (q.id === questionId) {
              const newOpts = [...(q.options || [])];
              newOpts[editingIndex] = editValue.trim();
              return { ...q, options: newOpts };
            }
            return q;
          });
          return { ...s, questions: updatedQuestions };
        }
        return s;
      });

      await updateDoc(doc(db, 'admins', currentUser.uid, 'products', productId), {
        stages: updatedStages
      });
      setEditingIndex(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update option");
    }
  };

  return (
    <div className="space-y-3.5 pl-6 border-l-2 border-slate-100 dark:border-slate-800">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Choice Options ({options.length}/4)</label>
      
      <div className="space-y-2.5 max-w-md">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-3 group">
            {/* Dynamic Shape Indicator based on question type */}
            <div className={`w-4 h-4 border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 transition-all ${isCheckbox ? 'rounded-md' : 'rounded-full'}`}></div>
            
            {editingIndex === index ? (
              <div className="flex flex-1 items-center gap-2">
                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveEdit(option)}
                />
                <button onClick={() => saveEdit(option)} className="text-green-600 p-1.5 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingIndex(null)} className="text-gray-500 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-between px-3.5 py-2 bg-slate-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-150/50 dark:border-gray-800/80 hover:bg-slate-100/50 dark:hover:bg-gray-900/50 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-snug">{option}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(index, option)} 
                    className="text-blue-500 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    onClick={() => handleDeleteOption(option)} 
                    className="text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {options.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic pl-1">No options defined yet. Add choices below.</p>
        )}
      </div>

      <form onSubmit={handleAddOption} className="flex items-center gap-2 mt-3 max-w-md">
        <input 
          type="text"
          value={newOption}
          onChange={e => setNewOption(e.target.value)}
          placeholder={options.length >= 4 ? "Maximum 4 choices reached" : "Type a new choice option..."}
          disabled={options.length >= 4}
          className="flex-1 px-4 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-900"
        />
        <button 
          type="submit"
          disabled={!newOption.trim() || options.length >= 4}
          className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-xl transition-all disabled:opacity-50 active:scale-95 border border-blue-100/50 dark:border-blue-900/20"
        >
          <Plus size={18} />
        </button>
      </form>
    </div>
  );
};

export default OptionBuilder;
