import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '../../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import DynamicQuestionBuilder from './DynamicQuestionBuilder';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const StageAccordion = ({ productId, stage, index, totalStages, allStages, adminEmployees, onDelete, onUpdate, onMoveUp, onMoveDown }) => {
  const { currentUser, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stageName, setStageName] = useState(stage.stageName);
  
  const questions = stage.questions || [];
  const isEmployee = userData?.role === 'employee';
  const targetAdminId = isEmployee ? userData.adminId : currentUser?.uid;

  const handleSaveStageName = () => {
    onUpdate(stageName);
    setIsEditing(false);
  };

  const handleToggleEmployee = async (emp) => {
    if (isEmployee) return;
    try {
      const currentIds = stage.assignedEmployeeIds || (stage.assignedEmployeeId ? [stage.assignedEmployeeId] : []);
      let newIds;
      if (currentIds.includes(emp.id)) {
        newIds = currentIds.filter(id => id !== emp.id);
      } else {
        newIds = [...currentIds, emp.id];
      }
      
      const newNames = newIds.map(id => {
        const found = (adminEmployees || []).find(e => e.id === id);
        return found ? found.name : '';
      }).filter(Boolean);

      await updateDoc(doc(db, 'admins', targetAdminId, 'products', productId, 'stages', stage.id), {
        assignedEmployeeIds: newIds,
        assignedEmployeeNames: newNames,
        assignedEmployeeId: newIds[0] || '',
        assignedEmployeeName: newNames.join(', ') || '',
        updatedAt: new Date().toISOString()
      });
      toast.success(`Updated assignments for ${stage.stageName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update assignments");
    }
  };

  const handleAddQuestion = async () => {
    if (isEmployee) return;
    try {
      const newQuestion = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        questionTitle: 'New Question',
        description: '',
        required: false,
        hasDefaultValue: false,
        defaultValue: '',
        answerType: 'Short Answer',
        options: [],
        createdAt: new Date().toISOString()
      };

      const updatedQuestions = [...(stage.questions || []), newQuestion];

      await updateDoc(doc(db, 'admins', targetAdminId, 'products', productId, 'stages', stage.id), {
        questions: updatedQuestions
      });
      toast.success("Question added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add question");
    }
  };

  // Determine current display names of assigned employees
  const displayNames = stage.assignedEmployeeNames && stage.assignedEmployeeNames.length > 0
    ? stage.assignedEmployeeNames.join(', ')
    : (stage.assignedEmployeeName || '');

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.01)] ${
        isOpen 
          ? 'border-blue-200 dark:border-blue-900/50 shadow-md shadow-blue-500/5 border-l-4 border-l-blue-600' 
          : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 border-l-4 border-l-gray-300 dark:border-l-gray-700 hover:border-l-blue-500 dark:hover:border-l-blue-500'
      }`}
    >
      <div 
        className="px-5 py-4 flex items-center justify-between cursor-pointer"
        onClick={() => !isEditing && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Step Indicator */}
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm border border-blue-100/50 dark:border-blue-800/30 select-none text-sm">
            {index + 1}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input 
                type="text" 
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                className="px-3 py-1.5 border border-blue-300 dark:border-blue-800 rounded-xl text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveStageName()}
              />
              <button 
                onClick={handleSaveStageName} 
                className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-xs font-medium px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-650 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white select-none">
                {stage.stageName}
              </h4>
              <div className="flex items-center gap-2.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium select-none">
                <span>{questions.length} {questions.length === 1 ? 'Question' : 'Questions'} configured</span>
                {displayNames && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-bold">
                      Assigned: {displayNames}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
          {!isEmployee && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move Up"
              >
                <ArrowUp size={15} />
              </button>
              <button 
                onClick={() => onMoveDown(index)}
                disabled={index === totalStages - 1}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move Down"
              >
                <ArrowDown size={15} />
              </button>
            </div>
          )}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all border active:scale-95 shadow-sm ${
              isOpen 
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                : 'bg-blue-50 dark:bg-blue-955 text-blue-650 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 hover:bg-blue-100'
            }`}
          >
            {isOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-905/10"
          >
            <div className="p-6 space-y-6">
              
              {/* Assigned Employees Selector (only visible to admins) */}
              {!isEmployee && (
                <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                  <h6 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Users size={14} /> Assign Employees to Stage
                  </h6>
                  <div className="flex flex-wrap gap-2">
                    {(adminEmployees || []).map(emp => {
                      const isAssigned = stage.assignedEmployeeIds?.includes(emp.id) || stage.assignedEmployeeId === emp.id;
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleToggleEmployee(emp)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isAssigned
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-450 border-slate-205 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned || false}
                            readOnly
                            className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3 h-3 pointer-events-none"
                          />
                          {emp.name}
                        </button>
                      );
                    })}
                    {(adminEmployees || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic">No employees are assigned to this product yet.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h5 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-550">
                  Checking List Fields
                </h5>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-550">
                  <p className="font-semibold text-sm">No checklist fields configured yet</p>
                  <p className="text-xs text-gray-400 mt-1">Superadmin has not added any checklist fields to this stage yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, qIndex) => (
                    <DynamicQuestionBuilder 
                      key={question.id}
                      productId={productId}
                      stageId={stage.id}
                      question={question}
                      index={qIndex}
                      allStages={allStages}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StageAccordion;
