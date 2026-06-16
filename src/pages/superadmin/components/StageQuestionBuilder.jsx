import React, { useState } from 'react';
import {
  Plus, Edit2, Trash2, Check, X, ChevronDown,
  HelpCircle, AlignLeft, Type, CircleDot, GripVertical,
  ToggleLeft, ToggleRight, CheckSquare, Calendar, Clock, Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const QUESTION_TYPES = [
  { label: 'Short Answer', value: 'Short Answer', icon: Type, color: 'teal' },
  { label: 'Short Answer Numeric', value: 'Short Answer Numeric', icon: Hash, color: 'orange' },
  { label: 'Long Answer', value: 'Paragraph', icon: AlignLeft, color: 'purple' },
  { label: 'Multiple Choice', value: 'Multiple Choice', icon: CircleDot, color: 'blue' },
  { label: 'Checkbox', value: 'Checkbox', icon: CheckSquare, color: 'indigo' },
  { label: 'Dropdown', value: 'Dropdown Menu', icon: ChevronDown, color: 'amber' },
  { label: 'Date', value: 'Date', icon: Calendar, color: 'emerald' },
  { label: 'Time', value: 'Time', icon: Clock, color: 'rose' },
  { label: 'Date & Time', value: 'Date and Time', icon: Calendar, color: 'violet' },
  { label: 'Unique Alphanumeric (12)', value: 'uniqueAlphanumeric12', icon: Hash, color: 'cyan' },
  { label: 'Date String', value: 'dateString', icon: Calendar, color: 'emerald' },
  { label: 'Current Date', value: 'currentDate', icon: Clock, color: 'rose' },
];

const getIcon = (value) => {
  const found = QUESTION_TYPES.find(t => t.value === value);
  return found ? found.icon : HelpCircle;
};

const getLabel = (value) => {
  const found = QUESTION_TYPES.find(t => t.value === value);
  return found ? found.label : value;
};
const getISODateValue = (str) => {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const getColorConfig = (value) => {
  const colors = {
    'Short Answer': { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200/50 dark:border-teal-800/30' },
    'Short Answer Numeric': { bg: 'bg-orange-50 dark:bg-orange-955/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200/50 dark:border-orange-850/30' },
    'Paragraph': { bg: 'bg-purple-50 dark:bg-purple-955/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200/50 dark:border-purple-800/30' },
    'Multiple Choice': { bg: 'bg-blue-50 dark:bg-blue-955/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200/50 dark:border-blue-800/30' },
    'Checkbox': { bg: 'bg-indigo-50 dark:bg-indigo-955/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200/50 dark:border-indigo-800/30' },
    'Dropdown Menu': { bg: 'bg-amber-50 dark:bg-amber-955/20', text: 'text-amber-705 dark:text-amber-400', border: 'border-amber-200/50 dark:border-amber-900/30' },
    'Date': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-800/30' },
    'Time': { bg: 'bg-rose-50 dark:bg-rose-955/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200/50 dark:border-rose-800/30' },
    'Date and Time': { bg: 'bg-violet-50 dark:bg-violet-955/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200/50 dark:border-violet-800/30' },
    'uniqueAlphanumeric12': { bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200/50 dark:border-cyan-900/30' },
    'dateString': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-800/30' },
    'currentDate': { bg: 'bg-rose-50 dark:bg-rose-955/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200/50 dark:border-rose-800/30' },
  };
  return colors[value] || colors['Short Answer'];
};

export const makeQuestion = () => ({
  id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
  questionTitle: '',
  description: '',
  answerType: 'Short Answer',
  required: true,
  hasDefaultValue: false,
  defaultValue: '',
  options: [],
});

const hasOptionsType = (value) => ['Multiple Choice', 'Dropdown Menu', 'Checkbox'].includes(value);

/* ─── Delete Confirmation Modal ─── */
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        >
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">Delete</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

/* ─── Single Question Edit Form ─── */
const QuestionEditForm = ({ question, onSave, onCancel, onDelete }) => {
  const [form, setForm] = useState({
    questionTitle: question.questionTitle || '',
    description: question.description || '',
    answerType: question.answerType || 'Short Answer',
    required: question.required !== undefined ? question.required : true,
    hasDefaultValue: question.hasDefaultValue || false,
    defaultValue: question.defaultValue || '',
    options: question.options || [],
  });
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleTypeChange = (newType) => {
    let opts = [...form.options];
    if (hasOptionsType(newType) && opts.length < 2) {
      opts = ['Option 1', 'Option 2'];
    }
    if (!hasOptionsType(newType)) {
      opts = [];
    }
    setForm({ ...form, answerType: newType, options: opts });
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, `Option ${form.options.length + 1}`] });
  };

  const updateOption = (idx, val) => {
    const opts = [...form.options];
    opts[idx] = val;
    setForm({ ...form, options: opts });
  };

  const removeOption = (idx) => {
    if (form.options.length <= 2) return toast.error('Minimum 2 options required');
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  };

  const handleSave = () => {
    if (!form.questionTitle.trim()) return toast.error('Question title is required');
    if (hasOptionsType(form.answerType) && form.options.length < 2) {
      return toast.error(`${getLabel(form.answerType)} requires at least 2 options`);
    }
    const hasEmpty = form.options.some(o => !o.trim());
    if (hasEmpty) return toast.error('Option values cannot be empty');
    const initialAnswer = question.answer || (form.hasDefaultValue ? form.defaultValue : '');
    onSave({ ...question, ...form, answer: initialAnswer });
  };

  const IconComp = getIcon(form.answerType);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-l-blue-500 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden"
      >
        <div className="p-5 space-y-4">
          {/* Title + Type Row */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Question Title</label>
              <input
                autoFocus
                value={form.questionTitle}
                onChange={e => setForm({ ...form, questionTitle: e.target.value })}
                placeholder="Enter your question..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 dark:text-white font-semibold transition-all"
              />
            </div>
            <div className="w-full md:w-52 space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Type</label>
              <div className="relative">
                <select
                  value={form.answerType}
                  onChange={e => handleTypeChange(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 dark:text-white font-bold cursor-pointer appearance-none transition-all"
                >
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><IconComp size={15} /></div>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><ChevronDown size={14} /></div>
              </div>
            </div>
          </div>

          {/* Description field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Description / Help Text (Optional)</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Verify serial key on side panel..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
            />
          </div>

          {/* Options Builder */}
          {hasOptionsType(form.answerType) && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Options ({form.options.length})
              </label>
              <div className="space-y-2 max-w-lg">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3 group">
                    {form.answerType === 'Multiple Choice'
                      ? <div className="w-4.5 h-4.5 border-2 border-slate-300 dark:border-slate-600 rounded-full shrink-0" />
                      : form.answerType === 'Checkbox'
                      ? <div className="w-4.5 h-4.5 border-2 border-slate-300 dark:border-slate-600 rounded shrink-0" />
                      : <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">{idx + 1}.</span>
                    }
                    <input
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-xl transition-all"
                >
                  <Plus size={14} /> Add Option
                </button>
              </div>
            </div>
          )}

          {/* Predefined Default Answer Section */}
          {form.hasDefaultValue && (
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Predefined Default Answer
              </label>
              {(form.answerType === 'Short Answer' || form.answerType === 'Paragraph') && (
                form.answerType === 'Short Answer' ? (
                  <input
                    value={form.defaultValue}
                    onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                    placeholder="Enter default answer..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                  />
                ) : (
                  <textarea
                    value={form.defaultValue}
                    onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                    placeholder="Enter default answer..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all resize-none"
                  />
                )
              )}
              {form.answerType === 'Short Answer Numeric' && (
                <input
                  type="number"
                  value={form.defaultValue}
                  onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                  placeholder="Enter default number..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                />
              )}
              {(form.answerType === 'Multiple Choice' || form.answerType === 'Dropdown Menu') && (
                <div className="relative max-w-md">
                  <select
                    value={form.defaultValue}
                    onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-850 dark:text-slate-355 dark:text-white font-semibold cursor-pointer appearance-none"
                  >
                    <option value="">Select Option as Default...</option>
                    {form.options.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              )}
              {form.answerType === 'Checkbox' && (
                <div className="flex flex-wrap gap-3 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-w-lg">
                  {form.options.map((opt, i) => {
                    const isChecked = Array.isArray(form.defaultValue) 
                      ? form.defaultValue.includes(opt)
                      : (form.defaultValue || '').split(',').map(s => s.trim()).includes(opt);
                    
                    const handleCheck = () => {
                      let currentArr = Array.isArray(form.defaultValue)
                        ? [...form.defaultValue]
                        : (form.defaultValue ? form.defaultValue.split(',').map(s => s.trim()) : []);
                      
                      if (currentArr.includes(opt)) {
                        currentArr = currentArr.filter(v => v !== opt);
                      } else {
                        currentArr.push(opt);
                      }
                      setForm({ ...form, defaultValue: currentArr });
                    };

                    return (
                      <label key={i} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={handleCheck}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-750 dark:text-slate-300">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {form.answerType === 'Date' && (
                <input
                  type="date"
                  value={form.defaultValue}
                  onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                />
              )}
              {form.answerType === 'dateString' && (
                <input
                  type="date"
                  value={form.defaultValue}
                  onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                />
              )}
              {form.answerType === 'uniqueAlphanumeric12' && (
                <input
                  type="text"
                  maxLength={12}
                  value={form.defaultValue}
                  onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                  placeholder="Enter default 12-char alphanumeric value (optional)..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                />
              )}
              {form.answerType === 'currentDate' && (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  Current Date questions automatically capture and display the current date and time on load. No default value configuration is required.
                </div>
              )}
              {form.answerType === 'Time' && (
                <input
                  type="time"
                  value={form.defaultValue}
                  onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                />
              )}
              {form.answerType === 'Date and Time' && (
                <input
                  type="datetime-local"
                  value={form.defaultValue}
                  onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium transition-all"
                />
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, required: !form.required })}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                {form.required
                  ? <ToggleRight size={28} className="text-blue-600" />
                  : <ToggleLeft size={28} className="text-slate-300 dark:text-slate-600" />
                }
                <span className={`text-xs font-bold uppercase tracking-wide ${form.required ? 'text-blue-600' : 'text-slate-400'}`}>Required</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, hasDefaultValue: !form.hasDefaultValue, defaultValue: !form.hasDefaultValue ? form.defaultValue : '' })}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                {form.hasDefaultValue
                  ? <ToggleRight size={28} className="text-blue-600" />
                  : <ToggleLeft size={28} className="text-slate-300 dark:text-slate-600" />
                }
                <span className={`text-xs font-bold uppercase tracking-wide ${form.hasDefaultValue ? 'text-blue-600' : 'text-slate-400'}`}>Default Value</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDeleteConfirm(true)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
              <div className="w-px h-6 bg-slate-100 dark:bg-slate-700" />
              <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
              <button type="button" onClick={handleSave} className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md active:scale-95">
                <Check size={14} /> Done
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Question"
        message="Are you sure you want to delete this question? This cannot be undone."
        onConfirm={() => { setDeleteConfirm(false); onDelete(question.id); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
};

/* ─── Single Question View Card ─── */
const QuestionViewCard = ({ question, index, onEdit, onDelete }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const IconComp = getIcon(question.answerType);
  const colors = getColorConfig(question.answerType);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
      >
        <div className="p-4 sm:p-5 flex gap-4">
          {/* Left: grip + number */}
          <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
            <GripVertical size={14} className="text-slate-200 dark:text-slate-700" />
            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">Q{index + 1}</span>
          </div>

          {/* Middle: content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start flex-wrap gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                {question.questionTitle || <span className="italic text-slate-400">Untitled question</span>}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </h4>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold border select-none ${colors.bg} ${colors.text} ${colors.border}`}>
                <IconComp size={11} />
                <span className="uppercase tracking-wider">{getLabel(question.answerType)}</span>
              </span>
              {question.hasDefaultValue && question.defaultValue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-extrabold border border-slate-200 dark:border-slate-700 uppercase tracking-wider select-none">
                  Default: {Array.isArray(question.defaultValue) ? question.defaultValue.join(', ') : String(question.defaultValue)}
                </span>
              )}
            </div>

            {question.description && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium leading-relaxed">
                {question.description}
              </p>
            )}

            {/* Show options for MC / Checkbox / Dropdown */}
            {hasOptionsType(question.answerType) && question.options?.length > 0 && (
              <div className="pl-1 space-y-1">
                {question.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {question.answerType === 'Multiple Choice'
                      ? <div className="w-3 h-3 border-[1.5px] border-slate-300 dark:border-slate-600 rounded-full shrink-0" />
                      : question.answerType === 'Checkbox'
                      ? <div className="w-3 h-3 border-[1.5px] border-slate-300 dark:border-slate-600 rounded shrink-0" />
                      : <span className="font-bold text-slate-400 w-4 text-right shrink-0">{i + 1}.</span>
                    }
                    <span className="font-medium">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Placeholder for text / date / time types */}
            {(question.answerType === 'Short Answer' || question.answerType === 'Short Answer Numeric') && (
              <div className="w-full max-w-xs h-8 border-b border-dashed border-slate-200 dark:border-slate-700 flex items-center text-slate-350 dark:text-slate-500 text-xs">
                {question.answerType === 'Short Answer Numeric' ? 'Enter a number...' : ''}
              </div>
            )}
            {question.answerType === 'Paragraph' && (
              <div className="w-full max-w-md h-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg" />
            )}
            {question.answerType === 'Date' && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-medium">
                <Calendar size={13} /> Select Date...
              </div>
            )}
            {question.answerType === 'dateString' && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-medium">
                <Calendar size={13} /> Select Date String...
              </div>
            )}
            {question.answerType === 'uniqueAlphanumeric12' && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-medium">
                <Hash size={13} /> Generate Unique 12-char Alphanumeric...
              </div>
            )}
            {question.answerType === 'currentDate' && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-medium bg-slate-50 dark:bg-slate-900/50">
                <Clock size={13} /> Auto-captures Current Date & Time
              </div>
            )}
            {question.answerType === 'Time' && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-medium">
                <Clock size={13} /> Select Time...
              </div>
            )}
            {question.answerType === 'Date and Time' && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-medium">
                <Calendar size={13} /> Select Date & Time...
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start">
            <button onClick={() => onEdit(question)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" title="Edit"><Edit2 size={15} /></button>
            <button onClick={() => setDeleteConfirm(true)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" title="Delete"><Trash2 size={15} /></button>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Question"
        message="Are you sure you want to delete this question? This cannot be undone."
        onConfirm={() => { setDeleteConfirm(false); onDelete(question.id); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
};

/* ─── Main Question Builder ─── */
const StageQuestionBuilder = ({ questions, onChange }) => {
  const [editingId, setEditingId] = useState(null);

  const addQuestion = () => {
    const q = makeQuestion();
    onChange([...questions, q]);
    setEditingId(q.id);
  };

  const saveQuestion = (updatedQ) => {
    onChange(questions.map(q => q.id === updatedQ.id ? updatedQ : q));
    setEditingId(null);
  };

  const deleteQuestion = (id) => {
    onChange(questions.filter(q => q.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const cancelEdit = (q) => {
    if (!q.questionTitle.trim()) {
      deleteQuestion(q.id);
    } else {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Questions</span>
          {questions.length > 0 && (
            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {questions.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-xl transition-all"
        >
          <Plus size={14} /> Add Question
        </button>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {questions.map((q, idx) =>
            editingId === q.id ? (
              <QuestionEditForm
                key={q.id}
                question={q}
                onSave={saveQuestion}
                onCancel={() => cancelEdit(q)}
                onDelete={deleteQuestion}
              />
            ) : (
              <QuestionViewCard
                key={q.id}
                question={q}
                index={idx}
                onEdit={(q) => setEditingId(q.id)}
                onDelete={deleteQuestion}
              />
            )
          )}
        </AnimatePresence>

        {questions.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <HelpCircle size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-400 dark:text-slate-500">No Questions Added Yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Click "Add Question" to start building your stage.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { ConfirmDialog };
export default StageQuestionBuilder;
