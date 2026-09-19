import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  FileText, 
  Send, 
  Sparkles, 
  ArrowRight, 
  Upload, 
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Flame,
  Download,
  Satellite as SatelliteIcon,
  User,
  Radio,
  Cpu,
  Bot,
  BrainCircuit,
  LayoutGrid,
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { InnovativeAppItem, FlowStepItem, ChatMessage, TimeSlotOption, StructuredTaskOrder, TimeSeriesDayPlan, Satellite } from '../types';
import { ScheduleTable, FireAnalysisResultCard } from './InnovativeAppView';
import { FlowStepsTimeline } from './FlowStepsTimeline';
import { MarkdownMessageContent } from './HealthCheckView';

const PLAN_LABELS = ['一', '二', '三', '四', '五'];

// 思考过程可折叠组件：思考生成中展开，思考完毕（正文开始生成或已完成）后自动收起
const ThinkingBlock: React.FC<{ thinking: string; isGeneratingContent?: boolean }> = ({ 
  thinking, 
  isGeneratingContent = false 
}) => {
  // 当正文已有内容（即思考过程完毕）时默认收起；若用户手动点击展开/收起则保留用户状态
  const [userToggled, setUserToggled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isGeneratingContent);

  useEffect(() => {
    if (!userToggled) {
      setIsExpanded(!isGeneratingContent);
    }
  }, [isGeneratingContent, userToggled]);

  const handleToggle = () => {
    setUserToggled(true);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden text-xs transition-all">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-white/[0.03] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <BrainCircuit className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ${!isGeneratingContent ? 'opacity-70' : 'animate-pulse text-sky-500/70'}`} />
          <span className="font-medium text-slate-600 dark:text-slate-400">思考过程</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500 font-sans">
            {isGeneratingContent ? '已深度思考' : '思考中...'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400/80 dark:text-slate-500">
          <span>{isExpanded ? '收起' : '展开'}</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 py-2 border-t border-slate-100 dark:border-white/[0.04] text-[11px] sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-mono whitespace-pre-wrap bg-slate-50/25 dark:bg-black/10 animate-fadeIn">
          {thinking}
        </div>
      )}
    </div>
  );
};

interface ChatConversationProps {
  messages: ChatMessage[];
  onConfirmTimeSlot: (messageId: string, slot: TimeSlotOption) => void;
  onConfirmTaskOrder: (messageId: string) => void;
  onConfirmPlanAndUpload: (messageId: string) => void;
  onUploadTimeSeriesFile: () => void;
  onConfirmTimeSeriesPlan: (messageId: string) => void;
  onCancelTimeSeriesPlan?: (messageId: string) => void;
  onExecuteTimeSeriesDay: (messageId: string, dayIndex: number) => void;
  onSelectSatelliteForSingleOrbit?: (satellite: Satellite) => void;
  onSelectQuickReply?: (messageId: string, optionText: string) => void;
  onSelectRequirementOption?: (optionText: string) => void;
  onConfirmRequirementsReady?: (messageId: string) => void;
  onStartPlanFromQA?: (location: string, option?: import('../types').QAWindowOption) => void;
  onGoToInnovativeApp?: () => void;
  onGoToAchievementManagement?: () => void;
  onGoToTaskManagement?: () => void;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  messages,
  onConfirmTimeSlot,
  onConfirmTaskOrder,
  onConfirmPlanAndUpload,
  onUploadTimeSeriesFile,
  onConfirmTimeSeriesPlan,
  onCancelTimeSeriesPlan,
  onExecuteTimeSeriesDay,
  onSelectSatelliteForSingleOrbit,
  onSelectQuickReply,
  onSelectRequirementOption,
  onConfirmRequirementsReady,
  onStartPlanFromQA,
  onGoToInnovativeApp,
  onGoToAchievementManagement,
  onGoToTaskManagement,
}) => {
  return (
    <div id="chat-conversation-flow" className="space-y-6 w-full pb-6">
      {messages.map((msg) => {
        const isAssistant = msg.role === 'assistant';

        return (
          <div
            key={msg.id}
            id={`message-bubble-${msg.id}`}
            className={`flex flex-col w-full gap-2 ${
              isAssistant ? 'items-start' : 'items-end'
            }`}
          >
            {/* 消息气泡主框体 */}
            <div
              className={`rounded-2xl p-3.5 sm:p-4 transition-all text-left ${
                isAssistant
                  ? 'w-full bg-white/90 dark:bg-[#0c101c]/90 border border-slate-200/90 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 backdrop-blur-xl shadow-sm'
                  : 'max-w-[88%] sm:max-w-[85%] bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-600 dark:to-sky-600 text-white shadow-md shadow-blue-900/20'
              }`}
            >
              {/* 模型思考过程（若有） */}
              {isAssistant && msg.thinkingProcess && (
                <ThinkingBlock 
                  thinking={msg.thinkingProcess} 
                  isGeneratingContent={Boolean(msg.content && msg.content.length > 0)} 
                />
              )}

              {/* 文本内容 */}
              {msg.isOnboardFlowPending ? (
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  <span className="font-mono text-sky-600 dark:text-sky-400 font-bold tracking-wider animate-pulse flex items-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-sky-500 shrink-0" />
                    <span>等待星上结果下传.........</span>
                  </span>
                </div>
              ) : isAssistant ? (
                <div>
                  <MarkdownMessageContent content={msg.content} />
                  {msg.table && <ScheduleTable rows={msg.table} />}
                  {msg.analysisResult && <FireAnalysisResultCard result={msg.analysisResult} />}
                </div>
              ) : (
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}

              {/* 快捷跳转【查看】按钮：模型回复引导至创新应用页面 */}
              {(msg.showGoToAppButton || (isAssistant && msg.content && (msg.content.includes('跟进任务进展') || msg.content.includes('创新应用')))) && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onGoToInnovativeApp}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <span>查看</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 快捷跳转【查看】按钮：任务发起后引导至任务管理看板对应任务详情区 */}
              {msg.showGoToTaskButton && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onGoToTaskManagement}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <span>查看</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 高风险地点卡片 */}
              {msg.timeSeriesHighRiskLocations && msg.timeSeriesHighRiskLocations.length > 0 && (
                <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>接收到 4 个高风险地点：</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                      需求信息接收完成
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {msg.timeSeriesHighRiskLocations.map((loc, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white/90 dark:bg-[#111728]/90 border border-amber-200/80 dark:border-amber-500/20 flex flex-col justify-between shadow-2xs">
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                          <span>地区名称：{loc.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold">
                            高风险
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 mt-1.5 space-y-0.5 bg-slate-50 dark:bg-black/20 p-1.5 rounded-lg border border-slate-100 dark:border-white/[0.04]">
                          <div>中心经度：<span className="text-amber-600 dark:text-amber-400 font-semibold">{loc.lng}</span></div>
                          <div>中心纬度：<span className="text-amber-600 dark:text-amber-400 font-semibold">{loc.lat}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 附件标签 */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap gap-2">
                  {msg.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#151c30] text-xs border border-slate-200 dark:border-white/[0.08] font-mono text-slate-600 dark:text-slate-300"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                      <span>{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【问答模式】地点过境时间、卫星、载荷综合分析卡片 */}
              {/* ========================================================================= */}
              {msg.mode === 'qa' && msg.qaWindowOptions && msg.qaWindowOptions.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <span>【{msg.qaTargetLocation || '目标区域'}】未来推荐拍摄时段与载荷配置：</span>
                    </span>
                    <span className="text-[10px] text-slate-400">点击方案可直接发起任务规划</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {msg.qaWindowOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#111728]/70 hover:border-blue-400 dark:hover:border-sky-400/60 hover:bg-blue-50/30 dark:hover:bg-sky-950/20 transition-all flex flex-col justify-between space-y-2.5 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <SatelliteIcon className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                                <span>{opt.satelliteName}</span>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">({opt.satelliteCode})</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-sky-500/20 text-blue-700 dark:text-sky-300 font-semibold border border-blue-200/60 dark:border-sky-500/30 shrink-0">
                              仰角 {opt.maxElevation}°
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px] bg-white/70 dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-white/[0.04]">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-mono font-medium">
                              <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                              <span>{opt.timeRange}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{opt.payload} ({opt.resolution})</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onStartPlanFromQA?.(msg.qaTargetLocation || '目标区域', opt)}
                          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                        >
                          <span>以此方案发起任务规划</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【一轨模式】多颗在线入境卫星选择卡片 */}
              {/* ========================================================================= */}
              {msg.mode === 'single_orbit' && msg.satelliteOptions && msg.satelliteOptions.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <SatelliteIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>可选在轨入境卫星（前 1 分钟黄金窗口）：</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {msg.isActionConfirmed ? '已锁定卫星，指令已准备就绪' : '点击卫星自动填入指令'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {msg.satelliteOptions.map((sat) => {
                      const isSelected = msg.selectedSatelliteId === sat.id;
                      const remainingSec = sat.linkStateSeconds ?? 0;

                      return (
                        <div
                          key={sat.id}
                          onClick={() => !msg.isActionConfirmed && onSelectSatelliteForSingleOrbit?.(sat)}
                          className={`p-3 rounded-xl border transition-all flex flex-col justify-between select-none ${
                            isSelected
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                              : msg.isActionConfirmed
                                ? 'opacity-50 grayscale bg-slate-50 dark:bg-[#111728]/50 border-slate-200 dark:border-white/[0.04] cursor-not-allowed'
                                : 'bg-slate-50 dark:bg-[#111728]/70 border-slate-200 dark:border-white/[0.06] hover:border-emerald-400 dark:hover:border-emerald-400/60 hover:bg-emerald-50/30 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{sat.name}</span>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">({sat.code})</span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {sat.sensorPayload}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-500/30 shrink-0">
                              余 {remainingSec}s
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                            <span>过境仰角: {sat.maxElevation}°</span>
                            {isSelected ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>已锁定此卫星</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium flex items-center gap-0.5">
                                <span>选择此卫星</span>
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【常规模式】第 (2) 步：通过多轮对话方式逐步让用户补全信息，并提供快捷选项 */}
              {/* ========================================================================= */}
              {msg.regularStage === 'requirement_completion' && msg.requirementDraft && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          { label: '载荷类型', value: msg.requirementDraft.payload },
                          { label: '成像地点', value: msg.requirementDraft.location },
                          { label: '在轨计算模型', value: msg.requirementDraft.onboardComputing },
                          { label: '任务起止时间', value: msg.requirementDraft.startTime ? `${msg.requirementDraft.startTime} 至 ${msg.requirementDraft.endTime || ''}` : undefined },
                        ].map((f, i) => (
                          <tr key={f.label} className={i !== 0 ? 'border-t border-slate-200/70 dark:border-white/[0.06]' : ''}>
                            <td className="px-3 py-2 text-slate-400 w-1/3 align-top whitespace-nowrap">{f.label}</td>
                            <td className={`px-3 py-2 font-medium ${f.value ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{f.value || '待补充...'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【常规模式】第 (2.5) 步：任务要素全列出来，让用户确认后，再继续 */}
              {/* ========================================================================= */}
              {msg.regularStage === 'requirement_review' && msg.requirementDraft && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          { label: '选用载荷', value: msg.requirementDraft.payload },
                          { label: '成像地点', value: msg.requirementDraft.location },
                          { label: '在轨计算及模型', value: msg.requirementDraft.onboardComputing },
                          { label: '任务起止时间', value: `${msg.requirementDraft.startTime} 至 ${msg.requirementDraft.endTime}` },
                        ].map((f, i) => (
                          <tr key={f.label} className={i !== 0 ? 'border-t border-slate-200/70 dark:border-white/[0.06]' : ''}>
                            <td className="px-3 py-2 text-slate-400 w-1/3 align-top whitespace-nowrap">{f.label}</td>
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{f.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【常规模式】第 (3) 步：模型分析出是否可行，并给出可选时间 */}
              {/* ========================================================================= */}
              {msg.regularStage === 'time_selection' && msg.timeSlotOptions && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
                  {msg.timeSlotOptions.map((opt, idx) => (
                    <div key={opt.id} className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden">
                      <div className="px-3 py-1.5 border-b border-slate-200/70 dark:border-white/[0.06] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span>方案{PLAN_LABELS[idx] || idx + 1}</span>
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { label: '时间窗口', value: opt.timeRange },
                            { label: '执行卫星', value: opt.satellite },
                            { label: '过境仰角', value: `${opt.elevation}°` },
                            { label: '幅宽', value: opt.swathWidth },
                            { label: '预测云量', value: opt.cloudProbability },
                          ].map((f, i) => (
                            <tr key={f.label} className={i !== 0 ? 'border-t border-slate-200/70 dark:border-white/[0.06]' : ''}>
                              <td className="px-3 py-2 text-slate-400 w-1/3 align-top whitespace-nowrap">{f.label}</td>
                              <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{f.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【常规模式】第 (4) 步：模型生成结构化任务单 */}
              {/* ========================================================================= */}
              {msg.regularStage === 'task_order_review' && msg.structuredOrder && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          { label: '任务单号', value: msg.structuredOrder.orderId },
                          { label: '拍摄目标', value: msg.structuredOrder.targetName },
                          { label: '目标坐标', value: msg.structuredOrder.coordinates },
                          { label: '执行卫星', value: msg.structuredOrder.satelliteName },
                          { label: '计划拍摄时段', value: msg.structuredOrder.selectedTime },
                          { label: '传感器载荷', value: msg.structuredOrder.sensorMode },
                          { label: '在轨计算模型', value: msg.structuredOrder.onboardComputing || '星载红外火灾反演模型' },
                          { label: '优先级', value: msg.structuredOrder.priority },
                        ].map((f, i) => (
                          <tr key={f.label} className={i !== 0 ? 'border-t border-slate-200/70 dark:border-white/[0.06]' : ''}>
                            <td className="px-3 py-2 text-slate-400 w-1/3 align-top whitespace-nowrap">{f.label}</td>
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{f.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【常规模式】第 (6)~(7) 步：模型进行任务规划，用户确认规划结果、确定发起任务 */}
              {/* ========================================================================= */}
              {msg.regularStage === 'plan_review' && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
                  <div className="rounded-xl p-3.5 bg-blue-50/70 dark:bg-sky-950/20 border border-blue-200 dark:border-sky-500/30 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-sky-300">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <span>姿轨控与相机序列任务规划已解算完成</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                      <li>已解算最佳侧摆机动角：<b>+4.8°</b>，姿态建立耗时 42 秒</li>
                      <li>星载相机曝光参数：增益 Level 2，积分级数 32，双通道实时存储</li>
                      <li>星载火灾 AI 算法模型包已封装至任务指令单 (TaskPack_V4.pkg)</li>
                    </ul>
                  </div>

                  {!msg.isActionConfirmed ? (
                    <button
                      onClick={() => onConfirmPlanAndUpload(msg.id)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-sky-400 dark:to-blue-500 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>确定执行并打包上传任务</span>
                    </button>
                  ) : (
                    <div className="w-full py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>任务包已确认上传下发</span>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【长时序模式】引导上传任务表 */}
              {/* ========================================================================= */}
              {msg.timeSeriesStage === 'template_ready' && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111728] border border-slate-200 dark:border-white/[0.08] text-xs space-y-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      请上传多天/多地监测任务表（支持 .csv / .xlsx / .geojson），或直接载入示范任务规划：
                    </p>
                    {!msg.isActionConfirmed ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={onUploadTimeSeriesFile}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>载入《浙江省核心生态区7日长时序监测表.csv》</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已完成任务表导入</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【长时序模式】规划出每一天、哪颗卫星、什么时间、拍摄哪个地点并让用户确认/取消 */}
              {/* ========================================================================= */}
              {msg.timeSeriesStage === 'plan_list_review' && msg.timeSeriesPlans && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sky-900 dark:text-sky-300">
                      <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      长时序多日多星时空排期计划表：
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/20 font-mono">
                      共 {msg.timeSeriesPlans.length} 个观测日
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {msg.timeSeriesPlans.map((plan) => (
                      <div
                        key={plan.dayIndex}
                        className="p-3 rounded-xl border bg-slate-50 dark:bg-[#111728] border-slate-200 dark:border-white/[0.08] hover:border-sky-300 dark:hover:border-sky-500/30 transition-all text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-mono font-bold text-[11px]">
                              Day {plan.dayIndex}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {plan.targetLocation}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {plan.date}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-white/[0.03] p-2 rounded-lg border border-slate-100 dark:border-white/[0.04]">
                          <div>
                            <span className="text-slate-400 text-[10px] block">执行卫星</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{plan.satellite}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">过境窗口时间</span>
                            <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{plan.targetTime}</span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-slate-400 text-[10px] block">中心坐标</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">{plan.coordinates}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!msg.isActionConfirmed ? (
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        id="btn-cancel-timeseries-plan"
                        onClick={() => onCancelTimeSeriesPlan ? onCancelTimeSeriesPlan(msg.id) : null}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        取消计划
                      </button>
                      <button
                        id="btn-confirm-timeseries-plan"
                        onClick={() => onConfirmTimeSeriesPlan(msg.id)}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>确认计划并立即发起首日任务</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>长时序规划已确认，每日任务按计划调度</span>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【长时序模式】后续每天让用户确认新的任务 */}
              {/* ========================================================================= */}
              {msg.timeSeriesStage === 'day_executing' && msg.timeSeriesPlans && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
                  {(() => {
                    const currentPlan = msg.timeSeriesPlans[(msg.activeDayIndex || 1) - 1] || msg.timeSeriesPlans[0];
                    return (
                      <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-500/30 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-950 dark:text-sky-300 flex items-center gap-1.5 text-sm">
                            <SatelliteIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            今日 Day {msg.activeDayIndex || 1} 任务待确认：{currentPlan?.targetLocation}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-black/20 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-500/20">
                            {currentPlan?.date}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/60 dark:bg-black/20 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/30">
                          <div>
                            <span className="text-slate-400 block text-[10px]">执行卫星</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPlan?.satellite}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">过境观测时间</span>
                            <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">{currentPlan?.targetTime}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">目标中心坐标</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">{currentPlan?.coordinates}</span>
                          </div>
                        </div>

                        {!msg.isActionConfirmed ? (
                          <button
                            id="btn-execute-timeseries-day"
                            onClick={() => onExecuteTimeSeriesDay(msg.id, msg.activeDayIndex || 1)}
                            className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>确认并下发今日 Day {msg.activeDayIndex || 1} 任务</span>
                          </button>
                        ) : (
                          <div className="w-full mt-1.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>今日任务已确认下发并完成结果同步</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 【阶段步骤流程图】常规模式星上结果支持折叠，地面执行与一轨/长时序默认直接展开呈现 */}
              {/* ========================================================================= */}
              {msg.flowSteps && (
                <FlowStepsTimeline
                  steps={msg.flowSteps}
                  currentStepIndex={msg.currentStepIndex || 0}
                  resultImage={msg.resultImage}
                  fireDetected={msg.fireDetected}
                  fireHotspots={msg.fireHotspots}
                  title={msg.mode === 'time_series' ? '地面模型任务规划流程' : undefined}
                  collapsible={msg.regularStage === 'onboard_model_flow'}
                  defaultExpanded={msg.regularStage !== 'onboard_model_flow'}
                  targetTitle={
                    msg.mode === 'single_orbit'
                      ? '一轨即时火灾监测'
                      : msg.mode === 'time_series'
                      ? '长时序高风险监测'
                      : '之江实验室火灾监测'
                  }
                />
              )}

              {/* 星上处理全流程日志（该流程折叠：星上模型启动...任务完成） */}
              {msg.onboardFlowSteps && msg.onboardFlowSteps.length > 0 && !msg.isOnboardFlowPending && (
                <FlowStepsTimeline
                  steps={msg.onboardFlowSteps}
                  currentStepIndex={msg.onboardFlowSteps.length}
                  title="星上处理全流程日志 (16步)"
                  targetTitle="星上处理流程"
                  collapsible={true}
                  defaultExpanded={false}
                />
              )}

              {/* 结果下载 (同步到成果管理页面) */}
              {msg.showGoToAchievementButton && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onGoToAchievementManagement}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-sky-500/15 border border-blue-200 dark:border-sky-500/30 text-blue-700 dark:text-sky-300 hover:bg-blue-100 dark:hover:bg-sky-500/25 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>结果下载 (已同步到成果管理页面)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* 针对当前轮次的推荐问题快捷选项：挂在消息气泡下方，独立于对话框 */}
            {msg.regularStage === 'requirement_completion' && msg.requirementDraft && !msg.isActionConfirmed &&
              msg.requirementDraft.options && msg.requirementDraft.options.length > 0 && (
                <div className="w-full">
                  <div className="flex flex-wrap gap-2">
                    {msg.requirementDraft.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onSelectRequirementOption?.(opt)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 active:scale-95 transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* 创新应用开启/中断确认：挂在消息气泡下方，独立于对话框 */}
            {msg.confirmChoice && !msg.isActionConfirmed && (
              <div className="w-full flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onConfirmRequirementsReady?.('cancel-innovative-start')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/[0.2] hover:bg-slate-50 dark:hover:bg-white/[0.06] active:scale-95 transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmRequirementsReady?.('confirm-innovative-start')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 active:scale-95 transition-all"
                >
                  确认
                </button>
              </div>
            )}

            {/* 要素信息确认/取消：挂在消息气泡下方，独立于对话框 */}
            {msg.regularStage === 'requirement_review' && msg.requirementDraft && !msg.isActionConfirmed && (
              <div className="w-full flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onConfirmRequirementsReady?.('cancel-requirement:' + msg.id)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/[0.2] hover:bg-slate-50 dark:hover:bg-white/[0.06] active:scale-95 transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmRequirementsReady?.(msg.id)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 active:scale-95 transition-all"
                >
                  确认要素信息，开始可行性分析
                </button>
              </div>
            )}

            {/* 时间方案选择：挂在消息气泡下方，独立于对话框 */}
            {msg.regularStage === 'time_selection' && msg.timeSlotOptions && !msg.isActionConfirmed && (
              <div className="w-full flex flex-wrap gap-2">
                {msg.timeSlotOptions.map((opt, idx) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onConfirmTimeSlot(msg.id, opt)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 active:scale-95 transition-all"
                  >
                    方案{PLAN_LABELS[idx] || idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* 任务单确认/取消：挂在消息气泡下方，独立于对话框 */}
            {msg.regularStage === 'task_order_review' && msg.structuredOrder && !msg.isActionConfirmed && (
              <div className="w-full flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onConfirmTaskOrder('cancel-task-order:' + msg.id)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/[0.2] hover:bg-slate-50 dark:hover:bg-white/[0.06] active:scale-95 transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmTaskOrder(msg.id)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 active:scale-95 transition-all"
                >
                  确认任务单，立即发起任务
                </button>
              </div>
            )}

            {/* 通用推荐问题胶囊（如选星快捷选项）：挂在消息气泡下方，选定后即隐藏 */}
            {msg.quickReplyOptions && msg.quickReplyOptions.length > 0 && !msg.isActionConfirmed && (
              <div className="w-full flex flex-wrap gap-2">
                {msg.quickReplyOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onSelectQuickReply?.(msg.id, opt)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 active:scale-95 transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
