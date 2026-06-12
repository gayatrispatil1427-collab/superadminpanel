import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  CheckSquare,
  CircleDot,
  AlignLeft,
  Type,
  Layers,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart2,
  Calendar,
  Hash
} from 'lucide-react';

// Helper: render stored answer cleanly
const renderAnswer = (question) => {
  const { answerType, answer } = question;

  if (!answer && answer !== 0 && answer !== false) {
    return (
      <span className="text-slate-400 dark:text-slate-500 italic text-sm">
        — No answer yet —
      </span>
    );
  }

  switch (answerType) {
    case 'Short Answer':
    case 'Short Answer Numeric':
    case 'Paragraph':
    case 'Date':
    case 'Time':
    case 'Date and Time':
      return (
        <span className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed">
          {answer}
        </span>
      );

    case 'Multiple Choice':
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {(Array.isArray(answer) ? answer : [answer]).map((val, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800/30"
            >
              <CircleDot size={11} />
              {val}
            </span>
          ))}
        </div>
      );

    case 'Checkbox':
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {(Array.isArray(answer) ? answer : [answer]).map((val, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-800/30"
            >
              <CheckSquare size={11} />
              {val}
            </span>
          ))}
        </div>
      );

    case 'Dropdown Menu':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-800/30">
          <ChevronDown size={11} />
          {answer}
        </span>
      );

    default:
      return <span className="text-slate-600 dark:text-slate-300 text-sm">{String(answer)}</span>;
  }
};

// Helper: check if a question has been answered
const isAnswered = (question) => {
  const { answer } = question;
  if (!answer && answer !== 0 && answer !== false) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === 'string') return answer.trim() !== '';
  return true;
};

// Stage progress stats
const getStageStats = (questions) => {
  if (!questions || questions.length === 0) return { total: 0, answered: 0, required: 0, requiredAnswered: 0 };
  const total = questions.length;
  const answered = questions.filter(q => isAnswered(q)).length;
  const required = questions.filter(q => q.required).length;
  const requiredAnswered = questions.filter(q => q.required && isAnswered(q)).length;
  return { total, answered, required, requiredAnswered };
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'Short Answer': return <Type size={12} />;
    case 'Short Answer Numeric': return <Hash size={12} />;
    case 'Paragraph': return <AlignLeft size={12} />;
    case 'Multiple Choice': return <CircleDot size={12} />;
    case 'Checkbox': return <CheckSquare size={12} />;
    case 'Dropdown Menu': return <ChevronDown size={12} />;
    case 'Date': return <Calendar size={12} />;
    case 'Time': return <Clock size={12} />;
    case 'Date and Time': return <Calendar size={12} />;
    default: return <MessageSquare size={12} />;
  }
};

// Individual Stage Q&A Card
const StageQACard = ({ stage, index }) => {
  const [isOpen, setIsOpen] = useState(index === 0); // first stage open by default
  const questions = stage.questions || [];
  const stats = getStageStats(questions);
  const progressPct = stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0;

  const allComplete = stats.total > 0 && stats.answered === stats.total;
  const hasRequiredPending = stats.required > 0 && stats.requiredAnswered < stats.required;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${
        allComplete
          ? 'border-green-200 dark:border-green-900/50 bg-white dark:bg-gray-800'
          : hasRequiredPending
          ? 'border-amber-200 dark:border-amber-900/50 bg-white dark:bg-gray-800'
          : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800'
      }`}
    >
      {/* Stage Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-left"
      >
        {/* Step number badge */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
            allComplete
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800/30'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
          }`}
        >
          {allComplete ? <CheckCircle2 size={18} /> : index + 1}
        </div>

        {/* Stage info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {stage.stageName}
            </h4>
            {allComplete && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-extrabold rounded-md uppercase tracking-wider border border-green-200/50 dark:border-green-800/30">
                Complete
              </span>
            )}
            {hasRequiredPending && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-extrabold rounded-md uppercase tracking-wider border border-amber-200/50 dark:border-amber-800/30 flex items-center gap-1">
                <AlertCircle size={9} /> Pending Required
              </span>
            )}
          </div>

          {/* Mini progress bar */}
          {stats.total > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 max-w-[160px] h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allComplete ? 'bg-green-500' : progressPct > 50 ? 'bg-blue-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {stats.answered}/{stats.total} answered
              </span>
            </div>
          )}
        </div>

        {/* Toggle arrow */}
        <div className="text-slate-400 shrink-0">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Q&A Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-slate-100 dark:border-slate-800"
          >
            <div className="p-5 space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No questions configured for this stage.</p>
                </div>
              ) : (
                questions.map((q, qIndex) => {
                  const answered = isAnswered(q);
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all ${
                        answered
                          ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'
                          : 'bg-amber-50/40 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'
                      }`}
                    >
                      {/* Question header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">
                              Q{qIndex + 1}.
                            </span>
                            <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                              {q.questionTitle}
                            </span>
                            {q.required && (
                              <span className="text-rose-500 font-bold text-sm select-none">*</span>
                            )}
                          </div>

                          {q.description && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 pl-7 leading-relaxed">
                              {q.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Type badge */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50">
                            {getTypeIcon(q.answerType)}
                            <span>{q.answerType}</span>
                          </span>
                          {/* Answered indicator */}
                          {answered ? (
                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                          ) : (
                            <Clock size={14} className="text-amber-500 shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Answer display */}
                      <div className="pl-7">
                        {renderAnswer(q)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Overall Summary Stats Bar
const SummaryStatsBar = ({ stages }) => {
  const allQuestions = stages.flatMap(s => s.questions || []);
  const totalQ = allQuestions.length;
  const answeredQ = allQuestions.filter(q => isAnswered(q)).length;
  const requiredQ = allQuestions.filter(q => q.required).length;
  const requiredAnswered = allQuestions.filter(q => q.required && isAnswered(q)).length;
  const overallPct = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 border border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-blue-400" />
        <span className="text-white font-bold text-sm uppercase tracking-wider">Overall Q&A Progress</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="text-2xl font-black text-white">{stages.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Total Stages</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="text-2xl font-black text-white">{totalQ}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Total Questions</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="text-2xl font-black text-green-400">{answeredQ}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Answered</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="text-2xl font-black text-amber-400">{requiredQ - requiredAnswered}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Required Pending</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-slate-400 font-semibold">Completion</span>
          <span className="text-[11px] text-white font-black">{overallPct}%</span>
        </div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              overallPct === 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : overallPct > 60
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

// Main export
const StageQAPanel = ({ stages }) => {
  if (!stages || stages.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <Layers size={32} className="mx-auto mb-3 text-slate-350 dark:text-slate-600" />
        <p className="text-slate-500 dark:text-slate-400 font-semibold">No stages added yet.</p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Add stages using the "Add Stage" button above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SummaryStatsBar stages={stages} />
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <StageQACard key={stage.id} stage={stage} index={index} />
        ))}
      </div>
    </div>
  );
};

export default StageQAPanel;
