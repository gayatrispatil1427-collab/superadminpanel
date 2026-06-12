import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Edit2, Trash2, Package, X, Eye,
  ChevronDown, Users, Calendar, HelpCircle, ArrowLeft,
  FileText, ToggleLeft, ToggleRight, Save, Search, Check, Clock,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { db } from '../../firebase/config';
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import StageQuestionBuilder, { makeQuestion, ConfirmDialog } from './components/StageQuestionBuilder';

/**
 * Firestore path:
 *   /admins/{adminId}/products/{productId}/stages/{stageId}
 *     - stageName, stageDescription, stageOrder, status, questions[], assignedEmployeeIds[], assignedEmployeeNames[], assignedEmployeeId, assignedEmployeeName, createdAt, updatedAt
 */

/* ─── Interactive Question Preview ─── */
const InteractiveQuestionPreview = ({ q, idx }) => {
  const [textVal, setTextVal] = useState(() => 
    q.hasDefaultValue && q.defaultValue !== undefined && q.defaultValue !== null ? String(q.defaultValue) : ''
  );
  const [mcVal, setMcVal] = useState(() => 
    q.hasDefaultValue && q.defaultValue ? (Array.isArray(q.defaultValue) ? q.defaultValue[0] || '' : String(q.defaultValue)) : ''
  );
  const [checkboxVal, setCheckboxVal] = useState(() => 
    q.hasDefaultValue && q.defaultValue ? (Array.isArray(q.defaultValue) ? q.defaultValue : [q.defaultValue]) : []
  );
  const [dropdownVal, setDropdownVal] = useState(() => 
    q.hasDefaultValue && q.defaultValue ? (Array.isArray(q.defaultValue) ? q.defaultValue[0] || '' : String(q.defaultValue)) : ''
  );

  useEffect(() => {
    setTextVal(q.hasDefaultValue && q.defaultValue !== undefined && q.defaultValue !== null ? String(q.defaultValue) : '');
    setMcVal(q.hasDefaultValue && q.defaultValue ? (Array.isArray(q.defaultValue) ? q.defaultValue[0] || '' : String(q.defaultValue)) : '');
    setCheckboxVal(q.hasDefaultValue && q.defaultValue ? (Array.isArray(q.defaultValue) ? q.defaultValue : [q.defaultValue]) : []);
    setDropdownVal(q.hasDefaultValue && q.defaultValue ? (Array.isArray(q.defaultValue) ? q.defaultValue[0] || '' : String(q.defaultValue)) : '');
  }, [q]);

  const toggleCheckbox = (opt) => {
    if (checkboxVal.includes(opt)) {
      setCheckboxVal(checkboxVal.filter(v => v !== opt));
    } else {
      setCheckboxVal([...checkboxVal, opt]);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">Q{idx + 1}.</span>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="font-semibold text-slate-800 dark:text-white text-sm">
              {q.questionTitle || 'Untitled'}{q.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            {q.description && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                {q.description}
              </p>
            )}
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {q.answerType === 'Paragraph' ? 'Long Answer' : q.answerType === 'Dropdown Menu' ? 'Dropdown' : q.answerType}
            </span>
          </div>

          {/* Interactive controls based on question type */}
          <div className="space-y-2 max-w-md">
            {q.answerType === 'Short Answer' && (
              <input
                type="text"
                value={textVal}
                onChange={e => setTextVal(e.target.value)}
                placeholder="Type short answer here..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium"
              />
            )}

            {q.answerType === 'Short Answer Numeric' && (
              <input
                type="number"
                value={textVal}
                onChange={e => setTextVal(e.target.value)}
                placeholder="Enter number here..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium"
              />
            )}

            {q.answerType === 'Paragraph' && (
              <textarea
                value={textVal}
                onChange={e => setTextVal(e.target.value)}
                placeholder="Type long paragraph answer here..."
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium resize-none"
              />
            )}

            {q.answerType === 'Multiple Choice' && (q.options || []).map((opt, i) => (
              <div 
                key={i} 
                onClick={() => setMcVal(opt)}
                className="flex items-center gap-2.5 cursor-pointer select-none py-1 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded px-1.5 transition-all"
              >
                <div className={`w-4 h-4 border rounded-full flex items-center justify-center transition-all ${
                  mcVal === opt ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {mcVal === opt && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                </div>
                <span className={`text-xs ${mcVal === opt ? 'text-blue-600 font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'}`}>{opt}</span>
              </div>
            ))}

            {q.answerType === 'Checkbox' && (q.options || []).map((opt, i) => {
              const isChecked = checkboxVal.includes(opt);
              return (
                <div 
                  key={i} 
                  onClick={() => toggleCheckbox(opt)}
                  className="flex items-center gap-2.5 cursor-pointer select-none py-1 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded px-1.5 transition-all"
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
                    isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isChecked && <Check size={10} strokeWidth={4} />}
                  </div>
                  <span className={`text-xs ${isChecked ? 'text-blue-600 font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'}`}>{opt}</span>
                </div>
              );
            })}

            {q.answerType === 'Dropdown Menu' && (
              <div className="relative">
                <select
                  value={dropdownVal}
                  onChange={e => setDropdownVal(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-300 font-semibold cursor-pointer appearance-none"
                >
                  <option value="" disabled>Select Choice Option</option>
                  {(q.options || []).map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-455 dark:text-slate-555">
                  <ChevronDown size={13} />
                </div>
              </div>
            )}

            {q.answerType === 'Date' && (
              <input
                type="date"
                value={textVal}
                onChange={e => setTextVal(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium"
              />
            )}

            {q.answerType === 'Time' && (
              <input
                type="time"
                value={textVal}
                onChange={e => setTextVal(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium"
              />
            )}

            {q.answerType === 'Date and Time' && (
              <input
                type="datetime-local"
                value={textVal}
                onChange={e => setTextVal(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white font-medium"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── View Questions Panel ─── */
const ViewQuestionsPanel = ({ stage, onClose }) => {
  const questions = stage?.questions || [];
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-105 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye size={18} className="text-blue-500" />
                Questions — {stage.stageName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><X size={18} /></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {questions.length === 0 ? (
              <div className="py-12 text-center">
                <HelpCircle size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-400">No Questions Added Yet</p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <InteractiveQuestionPreview key={q.id} q={q} idx={idx} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-b-2xl">
            <button 
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-705 hover:bg-slate-105 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                toast.success("Preview response submitted successfully!");
                onClose();
              }}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-750 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95"
            >
              Submit
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* ─── Stage Form (Full-page builder) ─── */
const StageForm = ({ editingStage, selectedProduct, employees, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    stageName: editingStage?.stageName || '',
    stageDescription: editingStage?.stageDescription || '',
    stageOrder: editingStage?.stageOrder || '',
    status: editingStage?.status || 'Active',
    questions: editingStage?.questions || [],
    assignedEmployeeIds: editingStage?.assignedEmployeeIds || (editingStage?.assignedEmployeeId ? [editingStage.assignedEmployeeId] : []),
  });

  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (!form.stageName || !form.stageName.trim()) {
        return toast.error('Stage Name is required');
      }
      // Validate questions
      for (const q of form.questions) {
        const qTitle = q.questionTitle || q.title || '';
        const qType = q.answerType || q.type || 'Short Answer';
        
        if (!qTitle.trim()) {
          return toast.error('All questions must have a title');
        }
        
        const hasOptions = ['Multiple Choice', 'Dropdown Menu', 'Dropdown'].includes(qType);
        if (hasOptions && (!q.options || q.options.length < 2)) {
          return toast.error(`"${qTitle}" (${qType === 'Dropdown Menu' || qType === 'Dropdown' ? 'Dropdown' : qType}) requires at least 2 options`);
        }
      }
      onSave(form);
    } catch (err) {
      console.error('Error validation stage:', err);
      toast.error('An error occurred while saving the stage');
    }
  };

  // Filter employees for this product only (including those with no product assigned, i.e., All Products)
  const productEmployees = (employees || []).filter(emp => !emp.productId || emp.productId === selectedProduct?.id);

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-205 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingStage ? 'Edit Stage' : 'Create New Stage'}
            </h2>
            {selectedProduct && (
              <p className="text-xs text-slate-405 mt-0.5 flex items-center gap-1">
                <Package size={11} className="text-amber-505" />
                {selectedProduct.productName}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-95">
            <Save size={15} /> {editingStage ? 'Update Stage' : 'Save Stage'}
          </button>
        </div>
      </div>

      {/* Stage Details Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <FileText size={15} className="text-amber-500" /> Stage Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Name */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stage Name <span className="text-red-500">*</span></label>
            <input
              value={form.stageName}
              onChange={e => setForm({ ...form, stageName: e.target.value })}
              placeholder="e.g. Pre-Installation Survey"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 dark:text-white font-semibold transition-all"
            />
          </div>

          {/* Stage Sequence */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stage Sequence</label>
            <input
              type="number"
              min="1"
              value={form.stageOrder}
              onChange={e => setForm({ ...form, stageOrder: parseInt(e.target.value, 10) || '' })}
              placeholder="e.g. 1"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 dark:text-white font-semibold transition-all"
            />
          </div>

          {/* Assigned Employees (Multi-Select) */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Employees</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-705 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-805 dark:text-white font-semibold text-left flex items-center justify-between"
              >
                <span className="truncate">
                  {form.assignedEmployeeIds && form.assignedEmployeeIds.length > 0
                    ? `${form.assignedEmployeeIds.length} Employee(s) Selected`
                    : '-- Unassigned (All Employees) --'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              
              {isEmployeeDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsEmployeeDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto p-2 space-y-1">
                    {productEmployees.map(emp => {
                      const isChecked = form.assignedEmployeeIds?.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            const currentIds = form.assignedEmployeeIds || [];
                            if (currentIds.includes(emp.id)) {
                              setForm({
                                ...form,
                                assignedEmployeeIds: currentIds.filter(id => id !== emp.id)
                              });
                            } else {
                              setForm({
                                ...form,
                                assignedEmployeeIds: [...currentIds, emp.id]
                              });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            readOnly
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 w-4 h-4 pointer-events-none"
                          />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {emp.name} ({emp.role})
                          </span>
                        </div>
                      );
                    })}
                    {productEmployees.length === 0 && (
                      <div className="text-xs text-slate-400 p-2 text-center">
                        No employees found for this product.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Status</label>
            <div className="flex items-center gap-3 h-[46px]">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: form.status === 'Active' ? 'Inactive' : 'Active' })}
                className="flex items-center gap-2"
              >
                {form.status === 'Active'
                  ? <ToggleRight size={32} className="text-emerald-500" />
                  : <ToggleLeft size={32} className="text-slate-300 dark:text-slate-655" />
                }
                <span className={`text-sm font-bold ${form.status === 'Active' ? 'text-emerald-600' : 'text-slate-405'}`}>{form.status}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Description <span className="text-slate-305 dark:text-slate-650">(Optional)</span></label>
          <textarea
            value={form.stageDescription}
            onChange={e => setForm({ ...form, stageDescription: e.target.value })}
            placeholder="Describe what this stage covers..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 dark:text-white font-medium transition-all resize-none"
          />
        </div>
      </div>

      {/* Question Builder Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <StageQuestionBuilder
          questions={form.questions}
          onChange={qs => setForm({ ...form, questions: qs })}
        />
      </div>
    </div>
  );
};

/* ─── Stage Card ─── */
const StageCard = ({ stage, index, totalStages, onEdit, onDelete, onViewQuestions, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop }) => {
  const qCount = (stage.questions || []).length;
  const createdDate = stage.createdAt?.toDate
    ? stage.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  // Determine current display names of assigned employees
  const displayNames = stage.assignedEmployeeNames && stage.assignedEmployeeNames.length > 0
    ? stage.assignedEmployeeNames.join(', ')
    : (stage.assignedEmployeeName || '');

  return (
    <motion.div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="cursor-move bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-202 dark:border-slate-700 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-655 transition-all group overflow-hidden"
    >
      {/* Accent bar */}
      <div className={`h-1 ${stage.status === 'Active' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-slate-205 dark:bg-slate-700'}`} />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-amber-105 dark:bg-amber-900/30 text-amber-700 dark:text-amber-404 text-sm font-extrabold flex items-center justify-center shrink-0">
              {stage.stageOrder || '#'}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{stage.stageName}</h3>
              {displayNames && (
                <p className="text-xs text-blue-650 dark:text-blue-400 font-semibold mt-0.5 flex items-center gap-1">
                  <Users size={11} /> {displayNames}
                </p>
              )}
              {stage.stageDescription && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">{stage.stageDescription}</p>
              )}
            </div>
          </div>
          <span className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
            stage.status === 'Active'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-450'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-550 dark:text-slate-400'
          }`}>
            {stage.status}
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5">
            <HelpCircle size={13} />
            <span className="font-bold">{qCount}</span> Question{qCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {createdDate}
          </span>
        </div>

        {/* Questions preview */}
        {qCount > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1.5">
            {stage.questions.slice(0, 3).map((q, i) => (
              <div key={q.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="truncate font-medium text-slate-600 dark:text-slate-300">{q.questionTitle || 'Untitled'}</span>
                <span className="ml-auto shrink-0 text-slate-400 font-medium">{q.answerType === 'Paragraph' ? 'Long Answer' : q.answerType === 'Dropdown Menu' ? 'Dropdown' : q.answerType}</span>
              </div>
            ))}
            {qCount > 3 && <p className="text-[11px] text-slate-400 pl-7">+{qCount - 3} more…</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => onViewQuestions(stage)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-xl transition-all"
          >
            <Eye size={14} /> View Questions
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move Up"
          >
            <ArrowUp size={15} />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalStages - 1}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move Down"
          >
            <ArrowDown size={15} />
          </button>
          <button
            onClick={() => onEdit(stage)}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
            title="Edit Stage"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(stage)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-550 dark:hover:bg-red-900/20 rounded-xl transition-all"
            title="Delete Stage"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const SuperAdminStages = () => {
  const location = useLocation();
  const [admins, setAdmins]           = useState([]);
  const [selectedAdminId]             = useState(location.state?.adminId || '');
  const [products, setProducts]       = useState([]);
  const [selectedProductId]           = useState(location.state?.productId || '');
  const [stages, setStages]           = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // UI state
  const [view, setView]                       = useState('list'); // 'list' | 'form'
  const [editingStage, setEditingStage]       = useState(null);   // null = create, obj = edit
  const [viewingQuestions, setViewingQuestions] = useState(null);
  const [deleteTarget, setDeleteTarget]       = useState(null);
  const [isManageSeqOpen, setIsManageSeqOpen] = useState(false);
  const [tempStages, setTempStages]           = useState([]);

  /* ── Firestore listeners ── */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), snap => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedAdminId) { setProducts([]); return; }
    const unsub = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'products'),
      snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [selectedAdminId]);

  useEffect(() => {
    if (!selectedAdminId || !selectedProductId) { setStages([]); return; }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'products', selectedProductId, 'stages'),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
        setStages(list);
        setLoading(false);
      },
      err => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, [selectedAdminId, selectedProductId]);

  // Load employees under selected admin
  useEffect(() => {
    if (!selectedAdminId) { setEmployees([]); return; }
    const unsub = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'employees'),
      snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [selectedAdminId]);

  /* ── Handlers ── */
  const openCreate = () => {
    if (!selectedProductId) return toast.error('Please go back and select a product first');
    setEditingStage(null);
    setView('form');
  };

  const openEdit = (stage) => {
    setEditingStage(stage);
    setView('form');
  };

  const handleSave = async (formData) => {
    setSaving(true);
    const basePath = ['admins', selectedAdminId, 'products', selectedProductId, 'stages'];
    
    // Map employee IDs to names
    const assignedIds = formData.assignedEmployeeIds || [];
    const assignedNames = assignedIds.map(id => {
      const emp = employees.find(e => e.id === id);
      return emp ? emp.name : '';
    }).filter(Boolean);

    const payload = {
      stageName: formData.stageName,
      stageDescription: formData.stageDescription || '',
      status: formData.status,
      questions: formData.questions,
      assignedEmployeeIds: assignedIds,
      assignedEmployeeNames: assignedNames,
      // Keep single assignment values for backward compatibility
      assignedEmployeeId: assignedIds[0] || '',
      assignedEmployeeName: assignedNames.join(', ') || '',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingStage) {
        const seqVal = formData.stageOrder !== '' ? parseInt(formData.stageOrder, 10) : (editingStage.stageOrder || stages.length + 1);
        await updateDoc(doc(db, ...basePath, editingStage.id), {
          ...payload,
          stageOrder: seqVal
        });
        toast.success('Stage updated successfully');
      } else {
        const seqVal = formData.stageOrder !== '' ? parseInt(formData.stageOrder, 10) : (stages.length + 1);
        const newId = 'stage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        await setDoc(doc(db, ...basePath, newId), {
          ...payload,
          stageOrder: seqVal,
          createdAt: serverTimestamp(),
        });
        toast.success('Stage created successfully');
      }
      setView('list');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save stage');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'admins', selectedAdminId, 'products', selectedProductId, 'stages', deleteTarget.id));
      toast.success('Stage deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete stage');
    }
    setDeleteTarget(null);
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIndex === targetIndex) return;

    const newStages = [...stages];
    const [draggedStage] = newStages.splice(sourceIndex, 1);
    newStages.splice(targetIndex, 0, draggedStage);

    try {
      const batch = writeBatch(db);
      newStages.forEach((s, idx) => {
        batch.update(doc(db, 'admins', selectedAdminId, 'products', selectedProductId, 'stages', s.id), {
          stageOrder: idx + 1
        });
      });
      await batch.commit();
      toast.success('Sequence updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update stage sequence');
    }
  };

  const handleMoveStage = async (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newStages = [...stages];
    
    // Swap
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    try {
      const batch = writeBatch(db);
      newStages.forEach((s, idx) => {
        batch.update(doc(db, 'admins', selectedAdminId, 'products', selectedProductId, 'stages', s.id), {
          stageOrder: idx + 1
        });
      });
      await batch.commit();
      toast.success('Stage moved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to move stage');
    }
  };

  const openManageSequence = () => {
    setTempStages(stages.map(s => ({ ...s })));
    setIsManageSeqOpen(true);
  };

  const handleTempOrderChange = (id, newOrder) => {
    setTempStages(prev => prev.map(s => s.id === id ? { ...s, stageOrder: parseInt(newOrder, 10) || 0 } : s));
  };

  const handleSaveBulkSequence = async () => {
    const sorted = [...tempStages].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
    try {
      const batch = writeBatch(db);
      sorted.forEach((s, idx) => {
        batch.update(doc(db, 'admins', selectedAdminId, 'products', selectedProductId, 'stages', s.id), {
          stageOrder: idx + 1
        });
      });
      await batch.commit();
      toast.success('Bulk sequence updated successfully!');
      setIsManageSeqOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save bulk sequence');
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const filteredStages = stages.filter(s =>
    s.stageName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Render: Form View ── */
  if (view === 'form') {
    return (
      <StageForm
        editingStage={editingStage}
        selectedProduct={selectedProduct}
        employees={employees}
        onSave={handleSave}
        onCancel={() => setView('list')}
        saving={saving}
      />
    );
  }

  /* ── Render: List View ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="text-amber-550" /> Stage Management
          </h2>
          {selectedProduct && (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <Package size={13} className="text-amber-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300">{selectedProduct.productName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          {stages.length > 0 && (
            <div className="relative flex-1 sm:flex-initial">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search stages..."
                className="w-full sm:w-48 pl-9 pr-3 py-2.5 bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-700 dark:text-white transition-all"
              />
            </div>
          )}
          {stages.length > 0 && (
            <button
              onClick={openManageSequence}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-250 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 shrink-0 border border-slate-200 dark:border-slate-600"
            >
              Manage Sequence
            </button>
          )}
          <button
            onClick={openCreate}
            disabled={!selectedProductId}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus size={16} /> Create Stage
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Loading stages...</p>
        </div>
      ) : !selectedProductId ? (
        <div className="py-16 text-center text-slate-400 dark:text-slate-505 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Layers size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">No product selected</p>
          <p className="text-sm mt-1">Go to Products and click "Stages" on a product.</p>
        </div>
      ) : filteredStages.length === 0 && searchQuery ? (
        <div className="py-14 text-center text-slate-400 bg-white dark:bg-slate-805 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Search size={40} className="mx-auto mb-2 opacity-30" />
          <p className="font-semibold">No stages match "{searchQuery}"</p>
        </div>
      ) : stages.length === 0 ? (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Layers size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">No stages yet</p>
          <p className="text-sm mt-1 mb-4">Click "Create Stage" to build your first stage.</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            <Plus size={16} /> Create Stage
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStages.map((stage, idx) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={idx}
              totalStages={filteredStages.length}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onViewQuestions={setViewingQuestions}
              onMoveUp={handleMoveStage}
              onMoveDown={handleMoveStage}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
            />
          ))}
        </div>
      )}

      {/* View Questions Panel */}
      {viewingQuestions && (
        <ViewQuestionsPanel stage={viewingQuestions} onClose={() => setViewingQuestions(null)} />
      )}

      {/* Bulk Sequence Management Modal */}
      {isManageSeqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsManageSeqOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-amber-505" />
                  Manage Stage Sequence
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Define custom orders for your stages below.</p>
              </div>
              <button onClick={() => setIsManageSeqOpen(false)} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><X size={18} /></button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {tempStages.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-55 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white truncate pr-4">{s.stageName}</span>
                  <input
                    type="number"
                    min="1"
                    value={s.stageOrder || ''}
                    onChange={e => handleTempOrderChange(s.id, e.target.value)}
                    className="w-16 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-700 rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-b-2xl">
              <button 
                onClick={() => setIsManageSeqOpen(false)}
                className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-705 hover:bg-slate-105 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveBulkSequence}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-750 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95"
              >
                Save Sequence
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Stage"
        message={`Are you sure you want to delete "${deleteTarget?.stageName}"? All questions in this stage will be permanently removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default SuperAdminStages;
