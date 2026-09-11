import React, { useState } from 'react';
import { 
  X, 
  CalendarRange, 
  Clock, 
  AlertCircle,
  Flame
} from 'lucide-react';

export interface TimeSeriesTaskData {
  taskTitle: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  source: string;
}

interface TimeSeriesUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TimeSeriesTaskData) => void;
}

export const TimeSeriesUploadModal: React.FC<TimeSeriesUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [source, setSource] = useState('林科院林火监测');
  const [startDate, setStartDate] = useState('2026-09-05');
  const [endDate, setEndDate] = useState('2026-09-11');
  const [errorMsg, setErrorMsg] = useState('');

  // 需求来源列表（目前只有林科院林火监测，预留后续增加）
  const sourcesOptions = [
    { key: '林科院林火监测', label: '林科院林火监测' }
  ];

  // 自动统计天数
  const calculateDays = (sStr: string, eStr: string): number => {
    if (!sStr || !eStr) return 1;
    const start = new Date(sStr);
    const end = new Date(eStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const totalDays = calculateDays(startDate, endDate);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setErrorMsg('请选择完整的开始时间和结束时间');
      return;
    }
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setErrorMsg('结束时间不能早于开始时间');
      return;
    }

    onSubmit({
      taskTitle: source,
      startDate,
      endDate,
      totalDays,
      source,
    });
    onClose();
  };

  return (
    <div 
      id="modal-timeseries-config"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden p-5 sm:p-6 space-y-5 text-left transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9.5 h-9.5 rounded-xl bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                长时序监测任务配置
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                配置周期性无人监测与在轨计算任务
              </p>
            </div>
          </div>
          <button
            id="btn-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单主体 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. 选择需求来源 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              选择需求来源 <span className="text-rose-500">*</span>
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-white/[0.1] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-all font-medium cursor-pointer"
            >
              {sourcesOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 2. 填写开始时间、结束时间（自动统计几天） */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                监测周期（开始时间 - 结束时间） <span className="text-rose-500">*</span>
              </label>
              {/* 自动统计天数 */}
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[11px] font-bold border border-sky-200 dark:border-sky-500/30">
                <Clock className="w-3 h-3" />
                <span>自动统计：共 {totalDays} 天</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400">开始时间</span>
                <input
                  id="input-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-white/[0.1] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400">结束时间</span>
                <input
                  id="input-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-white/[0.1] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 底部按钮：确认 & 取消 */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              id="btn-timeseries-confirm"
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
