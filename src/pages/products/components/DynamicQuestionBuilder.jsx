import React, { useState, useEffect } from 'react';
import { 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronDown, 
  Plus,
  HelpCircle,
  AlignLeft,
  CheckSquare,
  Type,
  CircleDot,
  Calendar,
  Clock,
  Hash
} from 'lucide-react';
import { db } from '../../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const answerTypes = [
  'Short Answer',
  'Short Answer Numeric',
  'Paragraph',
  'Multiple Choice',
  'Checkbox',
  'Dropdown Menu',
  'Date',
  'Time',
  'Date and Time',
  'uniqueAlphanumeric12',
  'dateString',
  'currentDate'
];

const getTypeIcon = (type) => {
  switch (type) {
    case 'Short Answer':
      return <Type size={15} />;
    case 'Short Answer Numeric':
      return <Hash size={15} />;
    case 'Paragraph':
      return <AlignLeft size={15} />;
    case 'Multiple Choice':
      return <CircleDot size={15} />;
    case 'Checkbox':
      return <CheckSquare size={15} />;
    case 'Dropdown Menu':
      return <ChevronDown size={15} />;
    case 'Date':
      return <Calendar size={15} />;
    case 'Time':
      return <Clock size={15} />;
    case 'Date and Time':
      return <Calendar size={15} />;
    case 'uniqueAlphanumeric12':
      return <Hash size={15} />;
    case 'dateString':
      return <Calendar size={15} />;
    case 'currentDate':
      return <Clock size={15} />;
    default:
      return <HelpCircle size={15} />;
  }
};

const getTypeBadgeClass = (type) => {
  switch (type) {
    case 'Short Answer':
      return 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/30';
    case 'Short Answer Numeric':
      return 'bg-orange-50 dark:bg-orange-955/20 text-orange-700 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/30';
    case 'Paragraph':
      return 'bg-purple-50 dark:bg-purple-955/20 text-purple-700 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/30';
    case 'Multiple Choice':
      return 'bg-blue-50 dark:bg-blue-955/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30';
    case 'Checkbox':
      return 'bg-indigo-50 dark:bg-indigo-955/20 text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30';
    case 'Dropdown Menu':
      return 'bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30';
    case 'Date':
      return 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30';
    case 'Time':
      return 'bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30';
    case 'Date and Time':
      return 'bg-violet-50 dark:bg-violet-955/20 text-violet-700 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/30';
    case 'uniqueAlphanumeric12':
      return 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-900/30';
    case 'dateString':
      return 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30';
    case 'currentDate':
      return 'bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30';
    default:
      return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800';
  }
};

const generateAlphanumeric12 = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getCurrentDateString = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getISODateValue = (str) => {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const DynamicQuestionBuilder = ({ productId, stageId, question, index, allStages }) => {
  const { currentUser, userData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const isEmployee = userData?.role === 'employee';
  const targetAdminId = isEmployee ? userData.adminId : currentUser?.uid;

  const [formData, setFormData] = useState({
    questionTitle: question.questionTitle || '',
    description: question.description || '',
    required: question.required || false,
    hasDefaultValue: question.hasDefaultValue || false,
    defaultValue: question.defaultValue || '',
    answerType: question.answerType || 'Short Answer',
    options: question.options || []
  });

  const getInitialChoice = () => {
    if (Array.isArray(question.answer) && question.answer.length > 0) return question.answer;
    if (question.answer && !Array.isArray(question.answer)) return [question.answer];
    if (question.hasDefaultValue && question.defaultValue) {
      return Array.isArray(question.defaultValue) ? question.defaultValue : [question.defaultValue];
    }
    return [];
  };

  const getInitialCheckboxes = () => {
    if (Array.isArray(question.answer) && question.answer.length > 0) return question.answer;
    if (question.answer && !Array.isArray(question.answer)) return [question.answer];
    if (question.hasDefaultValue && question.defaultValue) {
      return Array.isArray(question.defaultValue) ? question.defaultValue : [question.defaultValue];
    }
    return [];
  };

  const getInitialDropdown = () => {
    if (question.answer) {
      return Array.isArray(question.answer) ? question.answer[0] || '' : String(question.answer);
    }
    if (question.hasDefaultValue && question.defaultValue) {
      return Array.isArray(question.defaultValue) ? question.defaultValue[0] || '' : String(question.defaultValue);
    }
    return '';
  };

  const getInitialText = () => {
    if (question.answerType === 'uniqueAlphanumeric12') {
      if (question.answer !== undefined && question.answer !== null && question.answer !== '') {
        return Array.isArray(question.answer) ? question.answer[0] || '' : String(question.answer);
      }
      return generateAlphanumeric12();
    }
    if (question.answerType === 'currentDate') {
      if (question.answer !== undefined && question.answer !== null && question.answer !== '') {
        return Array.isArray(question.answer) ? question.answer[0] || '' : String(question.answer);
      }
      return getCurrentDateString();
    }

    if (question.answer !== undefined && question.answer !== null && question.answer !== '') {
      return Array.isArray(question.answer) ? question.answer[0] || '' : String(question.answer);
    }
    if (question.hasDefaultValue && question.defaultValue !== undefined && question.defaultValue !== null && question.defaultValue !== '') {
      return Array.isArray(question.defaultValue) ? question.defaultValue[0] || '' : String(question.defaultValue);
    }
    return '';
  };

  // Local interactive states for full working persistent form mode!
  const [selectedChoice, setSelectedChoice] = useState(getInitialChoice);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState(getInitialCheckboxes);
  const [selectedDropdown, setSelectedDropdown] = useState(getInitialDropdown);
  const [textAnswer, setTextAnswer] = useState(getInitialText);

  const answerDep = Array.isArray(question.answer)
    ? question.answer.join(',')
    : String(question.answer || '');

  // Sync state when question mounts, or when format/ID/answer changes, avoiding snapshot race conditions
  useEffect(() => {
    setSelectedChoice(getInitialChoice());
    setSelectedCheckboxes(getInitialCheckboxes());
    setSelectedDropdown(getInitialDropdown());
    setTextAnswer(getInitialText());
  }, [question.id, question.answerType, answerDep, question.defaultValue, question.hasDefaultValue]);

  // If uniqueAlphanumeric12 or currentDate is empty, immediately save the newly generated default/initial value to database
  useEffect(() => {
    if (question.answerType === 'uniqueAlphanumeric12' && (!question.answer || (Array.isArray(question.answer) && question.answer.length === 0))) {
      saveAnswerToDatabase([textAnswer]);
    }
    if (question.answerType === 'currentDate' && (!question.answer || (Array.isArray(question.answer) && question.answer.length === 0))) {
      saveAnswerToDatabase([textAnswer]);
    }
  }, [question.id, question.answerType]);

  const saveAnswerToDatabase = async (newAnswer) => {
    try {
      const currentStage = allStages.find(s => s.id === stageId);
      if (!currentStage || !targetAdminId) return;
      
      const updatedQuestions = (currentStage.questions || []).map(q => {
        if (q.id === question.id) {
          return { ...q, answer: newAnswer };
        }
        return q;
      });

      await updateDoc(doc(db, 'admins', targetAdminId, 'products', productId, 'stages', stageId), {
        questions: updatedQuestions
      });
    } catch (error) {
      console.error("Failed to save answer:", error);
    }
  };

  const handleSelectChoice = (opt) => {
    const newChoices = [opt];
    setSelectedChoice(newChoices);
    saveAnswerToDatabase(newChoices);
  };

  const toggleCheckbox = (opt) => {
    let newCheckboxes;
    if (selectedCheckboxes.includes(opt)) {
      newCheckboxes = selectedCheckboxes.filter(c => c !== opt);
    } else {
      newCheckboxes = [...selectedCheckboxes, opt];
    }
    setSelectedCheckboxes(newCheckboxes);
    saveAnswerToDatabase(newCheckboxes);
  };

  const handleDropdownChange = (val) => {
    setSelectedDropdown(val);
    saveAnswerToDatabase(val);
  };

  // Automatically open edit mode for new questions
  useEffect(() => {
    if (question.questionTitle === 'New Question' && !isEmployee) {
      setIsEditing(true);
    }
  }, [question.questionTitle, isEmployee]);

  const handleTypeChange = (newType) => {
    if (isEmployee) return;
    let updatedOpts = [...formData.options];
    if (['Multiple Choice', 'Checkbox', 'Dropdown Menu'].includes(newType)) {
      if (updatedOpts.length === 0) {
        updatedOpts = ['Option 1', 'Option 2'];
      }
    } else {
      updatedOpts = [];
    }
    setFormData({
      ...formData,
      answerType: newType,
      options: updatedOpts
    });
  };

  const handleAddOptionLocal = () => {
    if (isEmployee) return;
    if (formData.options.length >= 8) {
      toast.error("Maximum 8 options allowed");
      return;
    }
    const nextNum = formData.options.length + 1;
    setFormData({
      ...formData,
      options: [...formData.options, `Option ${nextNum}`]
    });
  };

  const handleUpdateOptionLocal = (idx, value) => {
    if (isEmployee) return;
    const updatedOpts = [...formData.options];
    updatedOpts[idx] = value;
    setFormData({
      ...formData,
      options: updatedOpts
    });
  };

  const handleDeleteOptionLocal = (idx) => {
    if (isEmployee) return;
    const updatedOpts = formData.options.filter((_, i) => i !== idx);
    setFormData({
      ...formData,
      options: updatedOpts
    });
  };

  const handleSave = async () => {
    if (isEmployee) return;
    if (!formData.questionTitle.trim()) {
      toast.error("Question title cannot be empty");
      return;
    }
    try {
      const currentStage = allStages.find(s => s.id === stageId);
      if (!currentStage || !targetAdminId) return;

      const updatedQuestions = (currentStage.questions || []).map(q => {
        if (q.id === question.id) {
          const clearedAnswer = formData.answerType === q.answerType ? (q.answer || '') : '';
          const initialAnswer = clearedAnswer || (formData.hasDefaultValue ? formData.defaultValue : '');
          return { 
            ...q, 
            ...formData, 
            answer: initialAnswer,
            updatedAt: new Date().toISOString() 
          };
        }
        return q;
      });

      await updateDoc(doc(db, 'admins', targetAdminId, 'products', productId, 'stages', stageId), {
        questions: updatedQuestions
      });
      setIsEditing(false);
      toast.success("Question saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save question");
    }
  };

  const handleDelete = async () => {
    if (isEmployee) return;
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const currentStage = allStages.find(s => s.id === stageId);
      if (!currentStage || !targetAdminId) return;

      const updatedQuestions = (currentStage.questions || []).filter(q => q.id !== question.id);

      await updateDoc(doc(db, 'admins', targetAdminId, 'products', productId, 'stages', stageId), {
        questions: updatedQuestions
      });
      toast.success("Question deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete question");
    }
  };

  const hasOptions = ['Multiple Choice', 'Checkbox', 'Dropdown Menu'].includes(formData.answerType);

  if (isEditing && !isEmployee) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-l-4 border-l-blue-600 border border-gray-200 dark:border-gray-700 shadow-md space-y-5 transition-all">
        {/* Row 1: Title Input & Dropdown Selector */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
              Question Title
            </label>
            <input 
              type="text" 
              value={formData.questionTitle}
              onChange={e => setFormData({...formData, questionTitle: e.target.value})}
              placeholder="e.g., What is the capacity of the unit?"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold"
              autoFocus
            />
          </div>
          
          <div className="w-full md:w-56 space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
              Answer Type
            </label>
            <div className="relative">
              <select
                value={formData.answerType}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-bold cursor-pointer appearance-none animate-fade-in"
              >
                {answerTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                {getTypeIcon(formData.answerType)}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Description Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
            Description / Help Text (Optional)
          </label>
          <input 
            type="text" 
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="e.g., Verify model number plate on the rear panel..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-medium text-slate-500 dark:text-slate-400"
          />
        </div>

        {/* Row 2.5: Predefined Default Answer Input */}
        {formData.hasDefaultValue && (
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
              Predefined Default Answer
            </label>
            {(formData.answerType === 'Short Answer' || formData.answerType === 'Paragraph') && (
              formData.answerType === 'Short Answer' ? (
                <input
                  type="text"
                  value={formData.defaultValue}
                  onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="Enter default answer..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold"
                />
              ) : (
                <textarea
                  value={formData.defaultValue}
                  onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="Enter default answer..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold resize-none"
                />
              )
            )}
            {formData.answerType === 'Short Answer Numeric' && (
              <input
                type="number"
                value={formData.defaultValue}
                onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                placeholder="Enter default number..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold"
              />
            )}
            {(formData.answerType === 'Multiple Choice' || formData.answerType === 'Dropdown Menu') && (
              <div className="relative">
                <select
                  value={formData.defaultValue}
                  onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold cursor-pointer appearance-none"
                >
                  <option value="">Select Option as Default...</option>
                  {formData.options.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            )}
            {formData.answerType === 'Checkbox' && (
              <div className="flex flex-wrap gap-3 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl">
                {formData.options.map((opt, i) => {
                  const isChecked = Array.isArray(formData.defaultValue) 
                    ? formData.defaultValue.includes(opt)
                    : (formData.defaultValue || '').split(',').map(s => s.trim()).includes(opt);
                  
                  const handleCheck = () => {
                    let currentArr = Array.isArray(formData.defaultValue)
                      ? [...formData.defaultValue]
                      : (formData.defaultValue ? formData.defaultValue.split(',').map(s => s.trim()) : []);
                    
                    if (currentArr.includes(opt)) {
                      currentArr = currentArr.filter(v => v !== opt);
                    } else {
                      currentArr.push(opt);
                    }
                    setFormData({ ...formData, defaultValue: currentArr });
                  };

                  return (
                    <label key={i} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleCheck}
                        className="rounded border-slate-350 dark:border-slate-705 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {formData.answerType === 'Date' && (
              <input
                type="date"
                value={formData.defaultValue}
                onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold"
              />
            )}
            {formData.answerType === 'Time' && (
              <input
                type="time"
                value={formData.defaultValue}
                onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold"
              />
            )}
            {formData.answerType === 'Date and Time' && (
              <input
                type="datetime-local"
                value={formData.defaultValue}
                onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold"
              />
            )}
            {formData.answerType === 'dateString' && (
              <input
                type="date"
                value={getISODateValue(formData.defaultValue)}
                onChange={e => {
                  if (!e.target.value) {
                    setFormData({ ...formData, defaultValue: '' });
                    return;
                  }
                  const d = new Date(e.target.value);
                  const formatted = d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  setFormData({ ...formData, defaultValue: formatted });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all font-semibold"
              />
            )}
            {(formData.answerType === 'uniqueAlphanumeric12' || formData.answerType === 'currentDate') && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic font-medium p-1 select-none">
                Default value will be automatically generated for this type.
              </p>
            )}
          </div>
        )}

        {/* Row 3: Option Builder (Multiple Choice, Checkbox, Dropdown) */}
        {hasOptions && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
              Answer Options ({formData.options.length})
            </label>
            <div className="space-y-2.5 max-w-xl">
              {formData.options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-3 group">
                  {formData.answerType === 'Checkbox' ? (
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md shrink-0" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-full shrink-0" />
                  )}
                  <input 
                    type="text"
                    value={option}
                    onChange={e => handleUpdateOptionLocal(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-gray-900 dark:text-white transition-all font-medium"
                  />
                  {formData.options.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => handleDeleteOptionLocal(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-all"
                      title="Remove Option"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
              
              {formData.options.length < 8 && (
                <button
                  type="button"
                  onClick={handleAddOptionLocal}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 px-3 py-2 rounded-xl transition-all"
                >
                  <Plus size={14} />
                  <span>Add Option</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Row 4: Footer toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            {/* Required field slide toggle */}
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={formData.required}
                  onChange={e => setFormData({...formData, required: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 dark:after:border-gray-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 select-none">Required Response</span>
            </div>

            {/* Default Value slide toggle */}
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={formData.hasDefaultValue}
                  onChange={e => setFormData({...formData, hasDefaultValue: e.target.checked, defaultValue: e.target.checked ? formData.defaultValue : ''})}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 dark:after:border-gray-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 select-none">Default Value</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button 
              type="button"
              onClick={handleDelete}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
              title="Delete Question"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 hidden sm:block" />
            <button 
              type="button"
              onClick={() => {
                if (question.questionTitle === 'New Question') {
                  handleDelete();
                } else {
                  setIsEditing(false);
                }
              }} 
              className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSave} 
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95"
            >
              <Check size={14} />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 flex flex-col sm:flex-row gap-4 group">
      <div className="flex-1 space-y-3">
        <div>
          <div className="flex items-center flex-wrap gap-3">
            <h6 className="font-bold text-gray-900 dark:text-white text-base leading-snug flex items-center gap-1.5 animate-fade-in">
              <span className="text-blue-600 dark:text-blue-400 font-extrabold">Q{index + 1}.</span>
              <span>{question.questionTitle}</span>
              {question.required && <span className="text-rose-500 select-none ml-0.5">*</span>}
            </h6>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold border select-none transition-all ${getTypeBadgeClass(question.answerType)}`}>
              {getTypeIcon(question.answerType)}
              <span className="uppercase tracking-wider">{question.answerType}</span>
            </span>
            {question.hasDefaultValue && question.defaultValue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 rounded-lg text-[9px] font-extrabold border border-slate-200 dark:border-slate-800 uppercase tracking-wider select-none transition-all">
                Default: {Array.isArray(question.defaultValue) ? question.defaultValue.join(', ') : String(question.defaultValue)}
              </span>
            )}
          </div>
          {question.description && (
            <p className="text-xs text-gray-400 dark:text-gray-505 mt-1 font-medium leading-relaxed">
              {question.description}
            </p>
          )}
        </div>
        
        {/* Interactive Premium Form Fields */}
        <div className="space-y-3.5 max-w-xl pt-1">
          {question.answerType === 'Short Answer' && (
            <div className="w-full max-w-md">
              <input
                type="text"
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                onBlur={() => saveAnswerToDatabase(textAnswer)}
                placeholder="Type short answer here..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-medium placeholder-slate-400/70"
              />
            </div>
          )}

          {question.answerType === 'Short Answer Numeric' && (
            <div className="w-full max-w-md">
              <input
                type="number"
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                onBlur={() => saveAnswerToDatabase(e.target.value)}
                placeholder="Enter number here..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-medium placeholder-slate-400/70"
              />
            </div>
          )}

          {question.answerType === 'Paragraph' && (
            <div className="w-full max-w-xl">
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                onBlur={() => saveAnswerToDatabase(textAnswer)}
                placeholder="Type long paragraph answer here..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-medium placeholder-slate-400/70 resize-none"
              />
            </div>
          )}

          {question.answerType === 'Multiple Choice' && (question.options || []).map((opt, i) => (
            <div 
              key={i} 
              onClick={() => handleSelectChoice(opt)}
              className="flex items-center gap-3 cursor-pointer group select-none max-w-md p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all"
            >
              <div className={`w-5 h-5 border-2 rounded-full shrink-0 flex items-center justify-center transition-all duration-200 ${
                selectedChoice.includes(opt) 
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' 
                  : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-500'
              }`}>
                {selectedChoice.includes(opt) && (
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-scale-up" />
                )}
              </div>
              <span className={`text-sm transition-colors ${
                selectedChoice.includes(opt) 
                  ? 'text-blue-600 dark:text-blue-400 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}>{opt}</span>
            </div>
          ))}

          {question.answerType === 'Checkbox' && (question.options || []).map((opt, i) => {
            const isChecked = selectedCheckboxes.includes(opt);
            return (
              <div 
                key={i} 
                onClick={() => toggleCheckbox(opt)}
                className="flex items-center gap-3 cursor-pointer group select-none max-w-md p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all"
              >
                <div className={`w-5 h-5 border-2 rounded-md shrink-0 flex items-center justify-center transition-all duration-150 ${
                  isChecked 
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-500'
                }`}>
                  {isChecked && (
                    <Check size={11} strokeWidth={3.5} />
                  )}
                </div>
                <span className={`text-sm transition-colors ${
                  isChecked 
                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}>{opt}</span>
              </div>
            );
          })}

          {question.answerType === 'Dropdown Menu' && (
            <div className="relative max-w-xs">
              <select
                value={selectedDropdown}
                onChange={e => handleDropdownChange(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
              >
                <option value="" disabled>Select Choice Option</option>
                {(question.options || []).map((opt, idx) => (
                  <option key={idx} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          )}

          {question.answerType === 'Date' && (
            <div className="w-full max-w-xs">
              <input
                type="date"
                value={textAnswer}
                onChange={e => {
                  setTextAnswer(e.target.value);
                  saveAnswerToDatabase(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-medium"
              />
            </div>
          )}

          {question.answerType === 'Time' && (
            <div className="w-full max-w-xs">
              <input
                type="time"
                value={textAnswer}
                onChange={e => {
                  setTextAnswer(e.target.value);
                  saveAnswerToDatabase(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-medium"
              />
            </div>
          )}

          {question.answerType === 'Date and Time' && (
            <div className="w-full max-w-xs">
              <input
                type="datetime-local"
                value={textAnswer}
                onChange={e => {
                  setTextAnswer(e.target.value);
                  saveAnswerToDatabase(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-medium"
              />
            </div>
          )}

          {question.answerType === 'uniqueAlphanumeric12' && (
            <div className="w-full max-w-md flex gap-2">
              <input
                type="text"
                value={textAnswer}
                readOnly
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400 font-mono shadow-sm select-all cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => {
                  const newVal = generateAlphanumeric12();
                  setTextAnswer(newVal);
                  saveAnswerToDatabase(newVal);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
              >
                Regenerate
              </button>
            </div>
          )}

          {question.answerType === 'currentDate' && (
            <div className="w-full max-w-md flex gap-2">
              <input
                type="text"
                value={textAnswer}
                readOnly
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400 font-semibold shadow-sm cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => {
                  const newVal = getCurrentDateString();
                  setTextAnswer(newVal);
                  saveAnswerToDatabase(newVal);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 select-none whitespace-nowrap"
              >
                Update Time
              </button>
            </div>
          )}

          {question.answerType === 'dateString' && (
            <div className="w-full max-w-xs">
              <input
                type="date"
                value={getISODateValue(textAnswer)}
                onChange={e => {
                  if (!e.target.value) {
                    setTextAnswer('');
                    saveAnswerToDatabase('');
                    return;
                  }
                  const d = new Date(e.target.value);
                  const formatted = d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  setTextAnswer(formatted);
                  saveAnswerToDatabase(formatted);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-semibold"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicQuestionBuilder;
