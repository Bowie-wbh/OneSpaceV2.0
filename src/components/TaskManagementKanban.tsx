import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Download,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Maximize2,
  X,
  Sparkles,
  Eye,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Check
} from 'lucide-react';
import { Satellite, FlowStepItem } from '../types';
import { FlowStepsTimeline } from './FlowStepsTimeline';
import fireLwirPreviewImg from '../assets/3D_1788272998_LWIR_full_preview.jpg';

export interface PlannedTaskItem {
  id: string;
  satelliteName: string;
  satelliteCode: string;
  groundStation: string;
  timeRange: string;
  isImaging: boolean;
  imagingTypeDesc?: string;
  computingTask: string;
  starMode: '单星' | '多星协同';
  targetLocation?: string;
  taskMode: '一轨成像' | '常规模式';
  payload: string;
  npuHours?: string; // 算力卡时，如 "0.05h"
  tokenUsage?: { input: string; output: string }; // Token消耗，如 { input: '182400tokens', output: '38200tokens' }
  // 是否为对话流刚发起的实时任务（决定详情页流程是否需要逐步呈现动画）
  isLive?: boolean;
  // 进入详情页时是否自动触发全流程回放动画
  autoReplay?: boolean;
  // 实时任务的最终结果：成功 或 失败（未结束/中断前为 undefined）
  outcome?: 'success' | 'failure';
  // 失败原因说明（outcome 为 failure 时展示于对话流）
  failureReason?: string;
  // 失败发生的绝对步骤序号（地面阶段在前，星上阶段在后，从 0 开始）
  failStepIndex?: number;
}

// 地面任务规划阶段（任务进度上半段）
const GROUND_STAGE_LABELS = ['地面模型接收任务', '任务意图解析', '任务包组装与发送', '任务发送成功'];

// 星上处理阶段（任务进度下半段）
const ONBOARD_STAGE_LABELS = [
  '星上模型启动', '任务解析完成', '遥控指令生成', '任务规划完成', '相机成像',
  '成像数据落盘', '云判', '火灾检测', '模型推理完成', '开始落盘到固存',
  '落盘固存完成', '文件启动下传', '文件下传到地面站', '码流文件解析', '模型结果解析', '任务完成',
];

const ALL_STAGE_LABELS = [...GROUND_STAGE_LABELS, ...ONBOARD_STAGE_LABELS];

// 回放倍速选项（包含慢速 0.1x / 0.25x / 0.5x，正常 1x，快速 2x）
export const REPLAY_SPEED_OPTIONS = [0.1, 0.25, 0.5, 1, 2] as const;
export type ReplaySpeed = (typeof REPLAY_SPEED_OPTIONS)[number];
const getReplayInterval = (speed: ReplaySpeed) => Math.round(450 / speed);

// 详情页流程动画节奏（ms/步），供 App.tsx 估算总耗时以在动画结束后发出对话流结果反馈
export const FLOW_STEP_INTERVAL_MS = 450;
export const GROUND_STAGE_STEP_COUNT = GROUND_STAGE_LABELS.length;
export const ONBOARD_STAGE_STEP_COUNT = ONBOARD_STAGE_LABELS.length;

const toFlowSteps = (labels: string[], errorIndex?: number): FlowStepItem[] =>
  labels.map((label, i) => ({ key: label, label, status: i === errorIndex ? 'error' as const : 'success' as const }));

export interface ResultImageItem {
  id: string;
  url: string;
  title: string;
  description: string;
  filterClass?: string;
}

export interface ResultTabConfig {
  key: string;
  label: string;
  images: ResultImageItem[];
}

const RESULT_TABS: ResultTabConfig[] = [
  {
    key: 'l1a_reg',
    label: 'L1A（双波段空间配准）',
    images: [
      {
        id: 'l1a-img-1',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        title: 'L1A 双波段空间配准影像（波段1: 可见光全色/多光谱）',
        description: '可见光通道亚像素级几何纠正与空间重采样，清晰呈现地物纹理与山水轮廓',
      },
      {
        id: 'l1a-img-2',
        url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1600&q=80',
        title: 'L1A 双波段空间配准影像（波段2: 短波红外SWIR）',
        description: '短波红外通道空间几何纠正与配准重叠区特征比对，消除波段间空间几何畸变',
      }
    ]
  },
  {
    key: 'l4_trad',
    label: 'L4（传统火点检测）',
    images: [
      {
        id: 'l4-trad-1',
        url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1600&q=80',
        title: 'L4 传统亮度温差自适应双阈值火点提取成果',
        description: '基于中长波红外辐射传输物理反演算法与上下文自适应阈值提取的高温热异常判定图',
        filterClass: 'hue-rotate-180 saturate-150',
      }
    ]
  },
  {
    key: 'l4_ai',
    label: 'L4（深度学习火点检测）',
    images: [
      {
        id: 'l4-ai-1',
        url: fireLwirPreviewImg,
        title: 'L4 星载深度学习多尺度热红外火点识别',
        description: '星载神经网络对长波红外影像进行热点特征提取，精准识别活跃火线与微弱烟羽阴燃区',
      },
      {
        id: 'l4-ai-2',
        url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1600&q=80',
        title: 'L4 深度学习火场蔓延边界与置信度热图',
        description: '多源注意力机制加权的火势蔓延趋势预测与高温置信度火线定位图层',
        filterClass: 'hue-rotate-[300deg] saturate-200',
      }
    ]
  },
];

// 用量统计数据模型（仅统计各环节用量消耗：成像/在轨预处理/在轨推理/数据暂存/数据下传）
interface UsageMetricItem {
  label: string;
  value: string;
  unit: string;
}
interface UsageMetricCategory {
  key: string;
  label: string;
  textClass: string;
  bgClass: string;
  cardBgGradient: string;
  cardBorderClass: string;
  items: UsageMetricItem[];
}
const USAGE_METRIC_CATEGORIES: UsageMetricCategory[] = [
  {
    key: 'imaging',
    label: '成像',
    textClass: 'text-sky-500 dark:text-sky-400',
    bgClass: 'bg-sky-500',
    cardBgGradient: 'bg-sky-500/[0.04] dark:bg-sky-500/[0.06] hover:bg-sky-500/[0.08]',
    cardBorderClass: 'border-sky-500/20 dark:border-sky-500/30 hover:border-sky-500/40',
    items: [
      { label: '任务调度次数', value: '1', unit: '次' },
      { label: '侧摆次数', value: '1', unit: '次' },
      { label: '数据暂存', value: '3', unit: 'GB·h' },
      { label: '成像时长', value: '240', unit: '卡·秒' },
    ],
  },
  {
    key: 'processing',
    label: '在轨预处理',
    textClass: 'text-purple-500 dark:text-purple-400',
    bgClass: 'bg-purple-500',
    cardBgGradient: 'bg-purple-500/[0.04] dark:bg-purple-500/[0.06] hover:bg-purple-500/[0.08]',
    cardBorderClass: 'border-purple-500/20 dark:border-purple-500/30 hover:border-purple-500/40',
    items: [
      { label: 'GPU卡时', value: '0.05', unit: 'h' },
    ],
  },
  {
    key: 'inference',
    label: '在轨推理',
    textClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500',
    cardBgGradient: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.08]',
    cardBorderClass: 'border-amber-500/20 dark:border-amber-500/30 hover:border-amber-500/40',
    items: [
      { label: '输入token', value: '182,400', unit: 'tokens' },
      { label: '输出token', value: '38,200', unit: 'tokens' },
    ],
  },
  {
    key: 'storage',
    label: '数据暂存',
    textClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-500',
    cardBgGradient: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] hover:bg-emerald-500/[0.08]',
    cardBorderClass: 'border-emerald-500/20 dark:border-emerald-500/30 hover:border-emerald-500/40',
    items: [
      { label: '热存储', value: '1', unit: 'GB·h' },
      { label: '温存储', value: '0.6', unit: 'GB·h' },
    ],
  },
  {
    key: 'downlink',
    label: '数据下传',
    textClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-500',
    cardBgGradient: 'bg-orange-500/[0.04] dark:bg-orange-500/[0.06] hover:bg-orange-500/[0.08]',
    cardBorderClass: 'border-orange-500/20 dark:border-orange-500/30 hover:border-orange-500/40',
    items: [
      { label: '下传数据量', value: '0.55', unit: 'GB' },
    ],
  },
];

// ── 自定义日期选择器组件（严格统一系统 UI 设计与暗色/亮色配色） ───────────────
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CustomDatePickerProps {
  value: string; // 'YYYY-MM-DD' or 'all'
  onChange: (val: string) => void;
  todayDate: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, todayDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value && value !== 'all' ? new Date(value) : new Date(todayDate);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() || 8); // 8 = 9月 (0-based)

  useEffect(() => {
    if (value && value !== 'all') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // 上个月末尾填充
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: day, isCurrentMonth: false });
    }

    // 当月日期
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    // 下个月开头填充至 35 或 42 格
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remaining = totalSlots - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="选择任务日期"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans border bg-white dark:bg-[#0c101c] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 transition-colors cursor-pointer shadow-2xs"
      >
        <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
        <span className="font-sans">{value === 'all' ? '全部日期' : value}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-2xl backdrop-blur-2xl p-3 animate-fadeIn text-slate-800 dark:text-slate-100 select-none">
          {/* 顶部年月导航 */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200">
              {viewYear}年 {viewMonth + 1}月
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="上个月"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="下个月"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-[10px] font-sans font-semibold text-slate-400 dark:text-slate-500 py-0.5">
                {w}
              </span>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSelected = value === cell.dateStr;
              const isToday = todayDate === cell.dateStr;

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className={`h-7 w-full flex items-center justify-center rounded-lg text-xs font-sans transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-sky-500 text-white font-bold shadow-xs'
                      : cell.isCurrentMonth
                      ? isToday
                        ? 'text-blue-600 dark:text-sky-400 font-bold border border-blue-400/60 dark:border-sky-400/60 hover:bg-blue-50 dark:hover:bg-sky-950/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                      : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>

          {/* 底部快捷操作 */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.06] text-[11px] font-sans">
            <button
              type="button"
              onClick={() => { onChange('all'); setIsOpen(false); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              全部日期
            </button>
            <button
              type="button"
              onClick={() => handleSelectDate(todayDate)}
              className="font-semibold text-blue-600 dark:text-sky-400 hover:underline transition-colors cursor-pointer"
            >
              今日 ({todayDate})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
// 单张成果图大图预览与下载弹窗组件
interface ResultImageModalProps {
  image: ResultImageItem | null;
  tabLabel: string;
  taskId: string;
  onClose: () => void;
  downloadSuccess: boolean;
  onDownload: () => void;
}

const ResultImageModal: React.FC<ResultImageModalProps> = ({
  image,
  tabLabel,
  taskId,
  onClose,
  downloadSuccess,
  onDownload,
}) => {
  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏与关闭按钮 */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 border border-blue-200/80 dark:border-sky-500/30">
              {tabLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>已下载</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>下载此图</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 中间高清大图展示区 */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[65vh] p-2 overflow-hidden select-none">
          <img
            src={image.url}
            alt={tabLabel}
            className={`max-w-full max-h-[62vh] object-contain ${image.filterClass || ''}`}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* 底部信息栏 */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-end text-xs text-slate-600 dark:text-slate-300">
          <span className="text-slate-400 dark:text-slate-500 font-mono">
            任务编号: {taskId}
          </span>
        </div>
      </div>
    </div>
  );
};


interface TaskManagementKanbanProps {
  satellites: Satellite[];
  selectedSatelliteId?: string;
  onSelectSatellite?: (satId: string) => void;
  // 一轨成像对话流发起后注入的任务，注入后自动跳转到其详情页
  injectedTask?: PlannedTaskItem | null;
  // 每次递增时强制重新跳转到 injectedTask 详情页（用于用户已返回列表后再次点击“查看”）
  focusRequestId?: number;
  // 触发对话框与全流程同步回放的回调
  onReplayTask?: (task: PlannedTaskItem, speed?: ReplaySpeed) => void;
  // 回放阶段通知回调：'order' 为到达任务包组装与发送；'done' 为全部流程播放完成且成果展示就绪
  onReplayPhase?: (phase: 'order' | 'done') => void;
  // 跳过回放直接显示全量成果的回调
  onSkipReplay?: () => void;
}

export const TaskManagementKanban: React.FC<TaskManagementKanbanProps> = ({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
  injectedTask,
  focusRequestId,
  onReplayTask,
  onReplayPhase,
  onSkipReplay,
}) => {
  const [filterSatId, setFilterSatId] = useState<string>('all');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<PlannedTaskItem | null>(null);
  const [chatCreatedTasks, setChatCreatedTasks] = useState<PlannedTaskItem[]>([]);
  const [selectedResultTab, setSelectedResultTab] = useState<string>(RESULT_TABS[0].key);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [modalImageItem, setModalImageItem] = useState<ResultImageItem | null>(null);
  const [modalImageTabLabel, setModalImageTabLabel] = useState<string>('');
  const [modalDownloadSuccess, setModalDownloadSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeCostCategory, setActiveCostCategory] = useState<string | null>(USAGE_METRIC_CATEGORIES[0].key);
  const [taskListPage, setTaskListPage] = useState(1);
  const TASK_LIST_PAGE_SIZE_OPTIONS = [10, 20, 50];
  const [taskListPageSize, setTaskListPageSize] = useState(TASK_LIST_PAGE_SIZE_OPTIONS[0]);
  // 任务规划列表的时期筛选：默认仅显示今日任务，留空（'all'）则显示全部历史任务
  const TASK_TODAY_DATE = '2026-09-04';
  const [taskDateFilter, setTaskDateFilter] = useState<string>(TASK_TODAY_DATE);
  // 一轨成像详情页流程逐步呈现进度（地面阶段 / 星上阶段各自当前步数）
  const [groundStepIndex, setGroundStepIndex] = useState(GROUND_STAGE_LABELS.length);
  const [onboardStepIndex, setOnboardStepIndex] = useState(ONBOARD_STAGE_LABELS.length);

  // 回放控制状态（支持历史与实时任务的完整 20 步流程回放）
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [replayCurrentStep, setReplayCurrentStep] = useState(0);
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const introTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const initialTasks: PlannedTaskItem[] = [
    {
      id: 'TASK-SO-HIST-1',
      satelliteName: '云尖沐曦号',
      satelliteCode: 'SCS-04-15',
      groundStation: '一轨即时成像地面站',
      timeRange: '2026-09-04 10:24:05 ~ 10:32:20',
      isImaging: true,
      imagingTypeDesc: '一轨即时应急成像与火灾检测',
      computingTask: '火灾检测',
      starMode: '单星',
      targetLocation: '之江实验室（120.09°E, 30.29°N）',
      taskMode: '一轨成像',
      payload: '红外',
      outcome: 'success',
      npuHours: '0.05h',
      tokenUsage: { input: '182400tokens', output: '38200tokens' },
    },
    {
      id: 'TASK-PL-20260904-01',
      satelliteName: '云尖沐曦号',
      satelliteCode: 'SCS-04-15',
      groundStation: '七台河 1201-X/Ka',
      timeRange: '2026-09-04 15:26:51 ~ 15:35:14',
      isImaging: true,
      imagingTypeDesc: '多光谱对地推扫成像',
      computingTask: '云检测、林火检测',
      starMode: '单星',
      targetLocation: '大兴安岭（124.3°E, 50.2°N）',
      taskMode: '一轨成像',
      payload: '红外',
      npuHours: '0.05h',
      tokenUsage: { input: '182400tokens', output: '38200tokens' },
    },
    {
      id: 'TASK-PL-20260904-02',
      satelliteName: '之江天目01号',
      satelliteCode: 'ZJ-TM-01',
      groundStation: '喀什 1002-X/S',
      timeRange: '2026-09-04 16:10:20 ~ 16:18:45',
      isImaging: true,
      imagingTypeDesc: '高分光学热红外同步观测',
      computingTask: '云检测',
      starMode: '多星协同',
      targetLocation: '塔里木盆地（82.6°E, 40.5°N）',
      taskMode: '一轨成像',
      payload: '可见光/热红外',
      npuHours: '0.04h',
      tokenUsage: { input: '146000tokens', output: '29800tokens' },
    },
    {
      id: 'TASK-PL-20260904-03',
      satelliteName: '天工探索二号',
      satelliteCode: 'TG-02',
      groundStation: '三亚 1105-Ka',
      timeRange: '2026-09-04 17:05:12 ~ 17:14:30',
      isImaging: true,
      imagingTypeDesc: 'SAR全天候条带成像',
      computingTask: '无',
      starMode: '单星',
      targetLocation: '南海（112.3°E, 15.8°N）',
      taskMode: '一轨成像',
      payload: 'SAR',
      npuHours: '0.00h',
      tokenUsage: { input: '0tokens', output: '0tokens' },
    },
    {
      id: 'TASK-PL-20260904-04',
      satelliteName: '天巡者03号',
      satelliteCode: 'TX-03',
      groundStation: '密云 1308-X/Ka',
      timeRange: '2026-09-04 18:22:00 ~ 18:30:15',
      isImaging: false,
      imagingTypeDesc: '例行在轨遥测健康巡检与星务注数',
      computingTask: '无',
      starMode: '多星协同',
      targetLocation: '密云（116.8°E, 40.4°N）',
      taskMode: '常规模式',
      payload: '星务遥测',
      npuHours: '0.00h',
      tokenUsage: { input: '0tokens', output: '0tokens' },
    },
    {
      id: 'TASK-PL-20260904-05',
      satelliteName: '云尖沐曦号',
      satelliteCode: 'SCS-04-15',
      groundStation: '佳木斯 1402-X/Ka',
      timeRange: '2026-09-04 20:15:30 ~ 20:23:50',
      isImaging: true,
      imagingTypeDesc: '长时序夜间微光热成像',
      computingTask: '林火检测',
      starMode: '多星协同',
      targetLocation: '北京（116.4°E, 39.9°N）',
      taskMode: '一轨成像',
      payload: '红外',
      npuHours: '0.06h',
      tokenUsage: { input: '210500tokens', output: '45600tokens' },
    },
  ];

  const stopReplayTimer = () => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (introTimerRef.current) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  };

  const startReplay = (speed: ReplaySpeed = replaySpeed, notifyChat: boolean = false) => {
    stopReplayTimer();
    setIsReplaying(true);
    setIsPaused(false);
    setReplayCurrentStep(0);
    setGroundStepIndex(-1);
    setOnboardStepIndex(-1);

    const isOneOrbitTask = selectedTaskDetail?.id === 'TASK-SO-HIST-1' || (selectedTaskDetail?.taskMode === '一轨成像' && !selectedTaskDetail?.isLive);

    if ((notifyChat || isOneOrbitTask) && selectedTaskDetail && onReplayTask) {
      onReplayTask(selectedTaskDetail, speed);
    }

    const interval = getReplayInterval(speed);
    // 一轨即时模式历史回放：先等对话框前置文字播放完毕（约 2300ms / speed），到达 ack 确认后才启动看板区地面大模型流程
    const introDelay = isOneOrbitTask ? Math.round(2300 / speed) : 0;

    const startStepping = () => {
      const totalSteps = GROUND_STAGE_LABELS.length + ONBOARD_STAGE_LABELS.length;
      let step = 0;

      replayTimerRef.current = setInterval(() => {
        step += 1;
        setReplayCurrentStep(step);

        const groundIndex = Math.min(step, GROUND_STAGE_LABELS.length);
        setGroundStepIndex(groundIndex);

        const onboardStep = step - GROUND_STAGE_LABELS.length;
        setOnboardStepIndex(onboardStep <= 0 ? -1 : Math.min(onboardStep, ONBOARD_STAGE_LABELS.length));

        // 第 3 步（地面大模型到达“任务包组装与发送”环节，即 GROUND_STAGE_LABELS[2] 已解析并正在组装指令）
        if (step === 3) {
          onReplayPhase?.('order');
        }

        if (step >= totalSteps) {
          stopReplayTimer();
          setIsReplaying(false);
          setIsPaused(false);
          // 星上流程全部执行完毕，成果与用量均已呈现后，触发对话框发送完成提示
          introTimerRef.current = setTimeout(() => {
            onReplayPhase?.('done');
          }, Math.round(350 / speed));
        }
      }, interval);
    };

    if (introDelay > 0) {
      introTimerRef.current = setTimeout(() => {
        startStepping();
      }, introDelay);
    } else {
      startStepping();
    }
  };

  const pauseReplay = () => {
    stopReplayTimer();
    setIsPaused(true);
  };

  const resumeReplay = () => {
    stopReplayTimer();
    setIsPaused(false);
    const totalSteps = GROUND_STAGE_LABELS.length + ONBOARD_STAGE_LABELS.length;
    let step = replayCurrentStep;
    const interval = getReplayInterval(replaySpeed);

    replayTimerRef.current = setInterval(() => {
      step += 1;
      setReplayCurrentStep(step);

      const groundIndex = Math.min(step, GROUND_STAGE_LABELS.length);
      setGroundStepIndex(groundIndex);

      const onboardStep = step - GROUND_STAGE_LABELS.length;
      setOnboardStepIndex(onboardStep <= 0 ? -1 : Math.min(onboardStep, ONBOARD_STAGE_LABELS.length));

      if (step === 3) {
        onReplayPhase?.('order');
      }

      if (step >= totalSteps) {
        stopReplayTimer();
        setIsReplaying(false);
        setIsPaused(false);
        introTimerRef.current = setTimeout(() => {
          onReplayPhase?.('done');
        }, Math.round(350 / replaySpeed));
      }
    }, interval);
  };

  const changeReplaySpeed = (newSpeed: ReplaySpeed) => {
    setReplaySpeed(newSpeed);
    if (isReplaying && !isPaused) {
      stopReplayTimer();
      const totalSteps = GROUND_STAGE_LABELS.length + ONBOARD_STAGE_LABELS.length;
      let step = replayCurrentStep;
      const interval = getReplayInterval(newSpeed);

      replayTimerRef.current = setInterval(() => {
        step += 1;
        setReplayCurrentStep(step);

        const groundIndex = Math.min(step, GROUND_STAGE_LABELS.length);
        setGroundStepIndex(groundIndex);

        const onboardStep = step - GROUND_STAGE_LABELS.length;
        setOnboardStepIndex(onboardStep <= 0 ? -1 : Math.min(onboardStep, ONBOARD_STAGE_LABELS.length));

        if (step === 3) {
          onReplayPhase?.('order');
        }

        if (step >= totalSteps) {
          stopReplayTimer();
          setIsReplaying(false);
          setIsPaused(false);
          introTimerRef.current = setTimeout(() => {
            onReplayPhase?.('done');
          }, Math.round(350 / newSpeed));
        }
      }, interval);
    }
  };

  const skipReplayToEnd = () => {
    stopReplayTimer();
    setIsReplaying(false);
    setIsPaused(false);
    const totalSteps = GROUND_STAGE_LABELS.length + ONBOARD_STAGE_LABELS.length;
    setReplayCurrentStep(totalSteps);
    setGroundStepIndex(GROUND_STAGE_LABELS.length);
    setOnboardStepIndex(ONBOARD_STAGE_LABELS.length);
    if (onSkipReplay) {
      onSkipReplay();
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };
    if (isSpeedMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isSpeedMenuOpen]);

  useEffect(() => {
    return () => {
      stopReplayTimer();
    };
  }, []);

  // 对话流触发的一轨成像任务：注入到任务列表顶部，并自动跳转到其详情页；
  // focusRequestId 变化时（如用户返回列表后再次点击“查看”）即使任务未变也强制重新跳转
  useEffect(() => {
    if (!injectedTask) return;
    setChatCreatedTasks(prev => (prev.some(t => t.id === injectedTask.id) ? prev : [injectedTask, ...prev]));
    setSelectedTaskDetail(injectedTask.autoReplay ? { ...injectedTask } : injectedTask);
  }, [injectedTask, focusRequestId]);

  // 任务详情页流程逐步呈现：实时发起的一轨成像任务地面+星上均按步骤动画推进；
  // 实时发起的常规模式任务仅地面任务规划逐步呈现，星上处理流程默认折叠并直接呈现完成状态；其余历史任务直接呈现为已完成
  useEffect(() => {
    stopReplayTimer();
    setIsReplaying(false);
    setIsPaused(false);

    if (!selectedTaskDetail) return;

    if (selectedTaskDetail.autoReplay) {
      startReplay(1, true);
      return;
    }

    const isLiveSingleOrbit = selectedTaskDetail.taskMode === '一轨成像' && selectedTaskDetail.isLive;
    const isLiveRegular = selectedTaskDetail.taskMode === '常规模式' && selectedTaskDetail.isLive;
    // 任务失败时，流程动画推进到失败步骤即冻结，不再继续前进
    const failAt = selectedTaskDetail.outcome === 'failure' ? selectedTaskDetail.failStepIndex : undefined;

    if (isLiveRegular) {
      // 常规任务仅地面阶段实时呈现；若地面阶段规划失败，星上流程视为尚未启动
      setOnboardStepIndex(failAt !== undefined ? 0 : ONBOARD_STAGE_LABELS.length);
      setGroundStepIndex(0);
      const groundFailAt = failAt !== undefined ? Math.min(failAt, GROUND_STAGE_LABELS.length - 1) : undefined;
      let step = 0;
      const timer = setInterval(() => {
        step += 1;
        if (groundFailAt !== undefined && step > groundFailAt) {
          setGroundStepIndex(groundFailAt);
          clearInterval(timer);
          return;
        }
        setGroundStepIndex(Math.min(step, GROUND_STAGE_LABELS.length));
        if (step >= GROUND_STAGE_LABELS.length) clearInterval(timer);
      }, 450);
      return () => clearInterval(timer);
    }

    if (!isLiveSingleOrbit) {
      // 非实时任务（历史记录）直接静态呈现最终结果，失败任务冻结在失败步骤
      if (failAt !== undefined) {
        setGroundStepIndex(Math.min(failAt, GROUND_STAGE_LABELS.length));
        const failedOnboardStep = failAt - GROUND_STAGE_LABELS.length;
        setOnboardStepIndex(failedOnboardStep < 0 ? -1 : failedOnboardStep);
      } else {
        setGroundStepIndex(GROUND_STAGE_LABELS.length);
        setOnboardStepIndex(ONBOARD_STAGE_LABELS.length);
      }
      return;
    }

    setGroundStepIndex(0);
    setOnboardStepIndex(-1); // 星上流程需等地面规划完成后才真正开始
    const totalSteps = GROUND_STAGE_LABELS.length + ONBOARD_STAGE_LABELS.length;
    const combinedFailAt = failAt !== undefined ? Math.min(failAt, totalSteps - 1) : undefined;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      if (combinedFailAt !== undefined && step > combinedFailAt) {
        setGroundStepIndex(Math.min(combinedFailAt, GROUND_STAGE_LABELS.length));
        const failedOnboardStep = combinedFailAt - GROUND_STAGE_LABELS.length;
        setOnboardStepIndex(failedOnboardStep < 0 ? -1 : failedOnboardStep);
        clearInterval(timer);
        return;
      }
      setGroundStepIndex(Math.min(step, GROUND_STAGE_LABELS.length));
      const onboardStep = step - GROUND_STAGE_LABELS.length;
      setOnboardStepIndex(onboardStep <= 0 ? -1 : Math.min(onboardStep, ONBOARD_STAGE_LABELS.length));
      if (step >= totalSteps) clearInterval(timer);
    }, 450);

    return () => clearInterval(timer);
  }, [selectedTaskDetail]);
  // 渲染单个用量卡片块
  const renderMetricCard = (cat: typeof USAGE_METRIC_CATEGORIES[0], colsClass: string = 'grid-cols-2') => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-4 rounded-full ${cat.bgClass}`} />
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">{cat.label}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-sans">{cat.items.length} 项指标</span>
        </div>
        <div className={`grid ${colsClass} gap-2.5`}>
          {cat.items.map((item, i) => (
            <div
              key={i}
              className={`flex flex-col justify-between p-3 rounded-xl border shadow-xs transition-all duration-200 ${cat.cardBgGradient} ${cat.cardBorderClass}`}
            >
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate">{item.label}</span>
              <div className="flex items-baseline gap-1 mt-2.5">
                <span className="font-sans font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-none tracking-tight">
                  {item.value}
                </span>
                <span className={`text-[11px] font-bold font-sans ${cat.textClass}`}>
                  {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染用量统计指标卡片
  const renderUsageMetricsCards = () => {
    const catImaging = USAGE_METRIC_CATEGORIES[0];
    const catProc = USAGE_METRIC_CATEGORIES[1];
    const catInfer = USAGE_METRIC_CATEGORIES[2];
    const catStorage = USAGE_METRIC_CATEGORIES[3];
    const catDown = USAGE_METRIC_CATEGORIES[4];

    return (
      <div className="space-y-4">
        {/* 1. 成像（4项指标横向排布） */}
        {renderMetricCard(catImaging, 'grid-cols-2 sm:grid-cols-4')}

        {/* 2. 在轨预处理 & 在轨推理（并排一行） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderMetricCard(catProc, 'grid-cols-1')}
          {renderMetricCard(catInfer, 'grid-cols-2')}
        </div>

        {/* 3. 数据暂存 & 数据下传（并排一行） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderMetricCard(catStorage, 'grid-cols-2')}
          {renderMetricCard(catDown, 'grid-cols-1')}
        </div>
      </div>
    );
  };


  const totalSatellites = satellites.length;

  const getSatelliteStats = (satId: string) => {
    let hash = 0;
    for (let i = 0; i < satId.length; i++) hash = (hash * 31 + satId.charCodeAt(i)) >>> 0;
    return {
      runningDays: 30 + (hash % 300),
      executedTasks: 50 + (hash % 900),
    };
  };

  const { runningDays, totalExecutedTasks, todayTasks } = useMemo(() => {
    if (filterSatId === 'all') return { runningDays: 168, totalExecutedTasks: 1428, todayTasks: 12 };
    const stats = getSatelliteStats(filterSatId);
    return { runningDays: stats.runningDays, totalExecutedTasks: stats.executedTasks, todayTasks: Math.max(1, Math.round(stats.executedTasks / 50)) };
  }, [filterSatId]);

  const filteredTasks = useMemo(() => {
    return [...chatCreatedTasks, ...initialTasks].filter((task) => {
      const matchSat = filterSatId === 'all' || 
        task.satelliteName.includes(filterSatId) || 
        task.satelliteCode.toLowerCase().includes(filterSatId.toLowerCase()) ||
        (filterSatId === 'yj-mx01' && task.satelliteName.includes('云尖沐曦')) ||
        (filterSatId === 'zj-tm01' && task.satelliteName.includes('之江天目')) ||
        (filterSatId === 'tg-02' && task.satelliteName.includes('天工探索')) ||
        (filterSatId === 'tx-03' && task.satelliteName.includes('天巡者'));

      const matchDate = taskDateFilter === 'all' || task.timeRange.split(' ')[0] === taskDateFilter;

      return matchSat && matchDate;
    });
  }, [filterSatId, taskDateFilter, chatCreatedTasks]);

  // 时间列排序：default 按原始顺序，asc/desc 按开始时间排序
  const [timeSortOrder, setTimeSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const toggleTimeSort = () => {
    setTimeSortOrder((prev) => (prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default'));
  };

  const sortedTasks = useMemo(() => {
    if (timeSortOrder === 'default') return filteredTasks;
    const withTime = [...filteredTasks];
    withTime.sort((a, b) => {
      const timeA = new Date(a.timeRange.split(' ~ ')[0]).getTime();
      const timeB = new Date(b.timeRange.split(' ~ ')[0]).getTime();
      return timeSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
    return withTime;
  }, [filteredTasks, timeSortOrder]);

  useEffect(() => {
    setTaskListPage(1);
  }, [filterSatId, taskDateFilter, timeSortOrder]);

  const taskListTotalPages = Math.max(1, Math.ceil(sortedTasks.length / taskListPageSize));
  const pagedTasks = useMemo(
    () => sortedTasks.slice((taskListPage - 1) * taskListPageSize, taskListPage * taskListPageSize),
    [sortedTasks, taskListPage, taskListPageSize]
  );
  const handleDownloadPackage = () => {
    const currentTab = RESULT_TABS.find((t) => t.key === selectedResultTab) || RESULT_TABS[0];
    const images = currentTab.images;
    // 触发下载该标签下的全套数据成果文件
    images.forEach((img, idx) => {
      setTimeout(() => {
        const element = document.createElement('a');
        element.setAttribute('href', img.url);
        element.setAttribute('download', `OneSpace_${selectedTaskDetail?.id || 'TASK'}_${currentTab.label}_成果包_第${idx + 1}项_${img.title}.jpg`);
        element.setAttribute('target', '_blank');
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }, idx * 200);
    });

    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
    }, 2500);
  };

  const handleDownloadSingleModalImage = (img: ResultImageItem, tabLabel: string) => {
    const element = document.createElement('a');
    element.setAttribute('href', img.url);
    element.setAttribute('download', `OneSpace_${selectedTaskDetail?.id || 'TASK'}_${tabLabel}_${img.title}.jpg`);
    element.setAttribute('target', '_blank');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setModalDownloadSuccess(true);
    setTimeout(() => {
      setModalDownloadSuccess(false);
    }, 2500);
  };
  const renderResultImageCards = (activeImg: ResultImageItem, currentTab: ResultTabConfig, images: ResultImageItem[], safeIdx: number) => {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-black group/img">
        <div 
          className="relative w-full h-56 sm:h-64 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-950"
          onClick={() => {
            setModalImageItem(activeImg);
            setModalImageTabLabel(currentTab.label);
          }}
        >
          <img
            src={activeImg.url}
            alt={activeImg.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105 ${activeImg.filterClass || ''}`}
            referrerPolicy="no-referrer"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center p-3.5 pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/90 text-white text-xs font-bold backdrop-blur-md shadow-md">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>点击放大预览</span>
            </div>
          </div>

          {images.length > 1 && (
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev: number) => (prev > 0 ? prev - 1 : images.length - 1));
                }}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-colors pointer-events-auto cursor-pointer shadow-md"
                title="上一张"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev: number) => (prev < images.length - 1 ? prev + 1 : 0));
                }}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-colors pointer-events-auto cursor-pointer shadow-md"
                title="下一张"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="px-3 py-2 bg-slate-900/90 dark:bg-[#070b14]/95 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-medium">
                第 <strong className="text-sky-400">{safeIdx + 1}</strong> / {images.length} 张图:
              </span>
              <div className="flex items-center gap-1.5">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      safeIdx === i
                        ? 'bg-blue-600 dark:bg-sky-500 text-white shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    图 {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderResultDownloadSection = (task: PlannedTaskItem, taskFailed: boolean) => {
    const isCompleted = onboardStepIndex >= ONBOARD_STAGE_LABELS.length;
    const currentTab = RESULT_TABS.find((t) => t.key === selectedResultTab) || RESULT_TABS[0];
    const images = currentTab.images;
    const safeIdx = selectedImageIndex < images.length ? selectedImageIndex : 0;
    const activeImg = images[safeIdx] || images[0];

    return (
      <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] overflow-hidden mb-1">
        <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500" />
            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">结果下载</h5>
          </div>
          {isCompleted && !taskFailed && (
            <span className="text-[11px] text-slate-400 font-medium font-sans">
              点击图片可弹窗放大查看并下载
            </span>
          )}
        </div>

        {taskFailed ? (
          <div className="p-6 flex items-center justify-center text-xs text-red-500 dark:text-red-400 font-sans">
            任务已失败，无可用结果
          </div>
        ) : !isCompleted ? (
          <div className="p-6 flex items-center justify-center text-xs text-slate-400 font-sans">
            星上处理流程尚未完成，结果生成后将在此处展示
          </div>
        ) : (
          <div className="p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {RESULT_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setSelectedResultTab(tab.key);
                      setSelectedImageIndex(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      selectedResultTab === tab.key
                        ? 'bg-blue-50/90 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 border border-blue-200/90 dark:border-sky-500/30 font-bold shadow-2xs'
                        : 'bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent font-semibold'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleDownloadPackage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                title="打包下载当前分类成果文件包"
              >
                {downloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>已下载</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>下载文件包</span>
                  </>
                )}
              </button>
            </div>

            {renderResultImageCards(activeImg, currentTab, images, safeIdx)}
          </div>
        )}
      </div>
    );
  };



  if (selectedTaskDetail) {
    const task = selectedTaskDetail;
    // 实时一轨任务：地面规划先完成再展开星上流程，引导用户按阶段查看进度
    // 实时常规任务：仅地面任务规划逐步呈现，星上处理流程默认折叠且不参与自动展开
    const isLiveOrbit = task.taskMode === '一轨成像' && !!task.isLive;
    const isLiveRegular = task.taskMode === '常规模式' && !!task.isLive;
    const groundAnimating = isLiveOrbit || isLiveRegular;
    const groundDone = groundStepIndex >= GROUND_STAGE_LABELS.length;
    const onboardStarted = onboardStepIndex >= 0;
    const onboardDone = onboardStepIndex >= ONBOARD_STAGE_LABELS.length;
    const taskFailed = task.outcome === 'failure';
    const failAt = taskFailed ? task.failStepIndex : undefined;
    const groundErrorIndex = failAt !== undefined && failAt < GROUND_STAGE_LABELS.length ? failAt : undefined;
    const onboardErrorIndex = failAt !== undefined && failAt >= GROUND_STAGE_LABELS.length ? failAt - GROUND_STAGE_LABELS.length : undefined;

    return (
      <div id="task-management-kanban" className="w-full h-full flex flex-col min-h-0 text-left select-none animate-fadeIn overflow-hidden">
        <div className="w-full h-full flex flex-col min-h-0 rounded-2xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-sm backdrop-blur-xl overflow-hidden p-4 sm:p-5 gap-4">
          <div className="flex items-center justify-between gap-3 shrink-0 pb-1 border-b border-slate-100/80 dark:border-white/[0.04]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  stopReplayTimer();
                  setIsReplaying(false);
                  setSelectedTaskDetail(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </button>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">任务规划详情</h4>
            </div>

            {/* 回放全过程控制栏 */}
            <div className="flex items-center gap-2 flex-wrap">
              {isReplaying ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/90 dark:bg-sky-950/40 border border-blue-200/80 dark:border-sky-500/30 text-xs shadow-xs animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-sky-400 font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-sky-400"></span>
                    </span>
                    <span>回放中 ({replayCurrentStep}/{ALL_STAGE_LABELS.length})</span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">
                      · {ALL_STAGE_LABELS[Math.min(replayCurrentStep > 0 ? replayCurrentStep - 1 : 0, ALL_STAGE_LABELS.length - 1)]}
                    </span>
                  </div>
                  <div className="h-3 w-[1px] bg-blue-200 dark:bg-sky-500/30 mx-0.5" />
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={resumeReplay}
                      className="p-1 rounded-md text-blue-600 dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
                      title="继续"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseReplay}
                      className="p-1 rounded-md text-blue-600 dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
                      title="暂停"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startReplay(replaySpeed, true)}
                    className="p-1 rounded-md text-blue-600 dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
                    title="重新回放"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* 倍速切换下拉菜单 */}
                  <div className="relative" ref={speedMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsSpeedMenuOpen(prev => !prev)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100/70 dark:bg-sky-900/40 text-blue-600 dark:text-sky-300 hover:bg-blue-200/70 dark:hover:bg-sky-900/80 transition-colors cursor-pointer border border-blue-200/60 dark:border-sky-500/30"
                      title="切换回放倍速"
                    >
                      <span>{replaySpeed}x</span>
                      <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isSpeedMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSpeedMenuOpen && (
                      <div className="absolute top-full mt-1.5 right-0 z-50 w-24 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-xl animate-fadeIn">
                        {REPLAY_SPEED_OPTIONS.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => {
                              changeReplaySpeed(speed);
                              setIsSpeedMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1 text-left font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                              replaySpeed === speed
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <span>{speed}x</span>
                            {replaySpeed === speed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={skipReplayToEnd}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="跳过回放直接查看完成结果"
                  >
                    <SkipForward className="w-3 h-3" />
                    <span>跳过</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {/* 未回放时的倍速预设下拉菜单 */}
                  <div className="relative" ref={speedMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsSpeedMenuOpen(prev => !prev)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200/80 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] text-xs font-mono font-bold transition-colors cursor-pointer"
                      title="设置回放倍速"
                    >
                      <span>{replaySpeed}x</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSpeedMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSpeedMenuOpen && (
                      <div className="absolute top-full mt-1.5 right-0 z-50 w-24 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-xl animate-fadeIn">
                        {REPLAY_SPEED_OPTIONS.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => {
                              changeReplaySpeed(speed);
                              setIsSpeedMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1 text-left font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                              replaySpeed === speed
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <span>{speed}x</span>
                            {replaySpeed === speed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => startReplay(replaySpeed, true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    title="回放任务全流程执行过程"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>回放全过程</span>
                  </button>
                </div>
              )}
            </div>
          </div>


          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
            {/* 基本信息 */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] overflow-hidden">
              <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500" />
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">基本信息</h5>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-sans p-2.5 sm:p-3">
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">任务ID</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.id}</span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">卫星</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.satelliteName}（{task.satelliteCode}）</span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">模式</span>
                  <span className="font-bold text-blue-600 dark:text-sky-400 truncate">{task.taskMode}</span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">算力卡时</span>
                  <span className="font-mono font-bold text-violet-600 dark:text-violet-400 truncate">
                    {task.npuHours ?? (task.computingTask && task.computingTask !== '无' ? '0.05h' : '0.00h')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">Token消耗</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate text-[11px]">
                    入:{task.tokenUsage?.input ?? (task.computingTask && task.computingTask !== '无' ? '182400' : '0')} / 出:{task.tokenUsage?.output ?? (task.computingTask && task.computingTask !== '无' ? '38200' : '0')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">单星/多星</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.starMode}</span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">拍摄地点</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.targetLocation || '—'}</span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">载荷</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.payload}</span>
                </div>

                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">时间</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.timeRange}</span>
                </div>
              </div>
            </div>

            {/* 任务进度 */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] overflow-hidden">
              <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500" />
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">任务进度</h5>
              </div>
              <div className="p-3.5 sm:p-4 space-y-3">
                <FlowStepsTimeline
                  key={groundAnimating || isReplaying ? `ground-${groundDone}-${groundErrorIndex}-${groundStepIndex}` : 'ground-static'}
                  steps={toFlowSteps(GROUND_STAGE_LABELS, groundErrorIndex)}
                  currentStepIndex={groundStepIndex}
                  title="地面大模型解析"
                  collapsible
                  defaultExpanded={groundAnimating || isReplaying ? !groundDone : true}
                />
                <FlowStepsTimeline
                  key={isLiveOrbit || isReplaying ? `onboard-${onboardStarted}-${onboardDone}-${onboardErrorIndex}-${onboardStepIndex}` : 'onboard-static'}
                  steps={toFlowSteps(ONBOARD_STAGE_LABELS, onboardErrorIndex)}
                  currentStepIndex={onboardStepIndex}
                  title="星上任务自主执行"
                  collapsible
                  defaultExpanded={isLiveOrbit || isReplaying ? (onboardStarted && !onboardDone) : true}
                />
              </div>
            </div>

            {/* 结果下载：星上处理流程全部完成后才呈现结果内容 */}
            {renderResultDownloadSection(task, taskFailed)}

            {/* 用量统计：星上处理流程全部完成后才呈现费用构成明细 */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] overflow-hidden mb-1">
              <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500" />
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">用量统计</h5>
              </div>
              {taskFailed ? (
                <div className="p-6 flex items-center justify-center text-xs text-red-500 dark:text-red-400 font-sans">
                  任务已失败，无可用量数据
                </div>
              ) : onboardStepIndex < ONBOARD_STAGE_LABELS.length ? (
                <div className="p-6 flex items-center justify-center text-xs text-slate-400 font-sans">
                  星上处理流程尚未完成，用量统计生成后将在此处展示
                </div>
              ) : (
              <div className="p-3.5 sm:p-4 space-y-4">
                {renderUsageMetricsCards()}
              </div>
              )}
            </div>
          </div>
        </div>

        {/* 单张成果图片大图弹窗 Modal */}
        <ResultImageModal
          image={modalImageItem}
          tabLabel={modalImageTabLabel}
          taskId={task.id}
          onClose={() => setModalImageItem(null)}
          downloadSuccess={modalDownloadSuccess}
          onDownload={() => {
            if (modalImageItem) {
              handleDownloadSingleModalImage(modalImageItem, modalImageTabLabel);
            }
          }}
        />
      </div>

    );
  }

  return (
    <div id="task-management-kanban" className="w-full h-full flex flex-col min-h-0 text-left select-none animate-fadeIn overflow-hidden">
      <div className="w-full h-full flex flex-col min-h-0 rounded-2xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-sm backdrop-blur-xl overflow-hidden p-4 sm:p-5 gap-4">

        {/* 1. 顶部工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 pb-1.5 border-b border-slate-100 dark:border-white/[0.06]">
          <span className="text-xs text-slate-400 hidden sm:inline font-sans">
            共 <strong className="text-blue-600 dark:text-sky-400 font-sans">{filteredTasks.length}</strong> 项未来规划
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative inline-block">
              <select
                id="select-task-satellite-filter"
                value={filterSatId}
                onChange={(e) => {
                  setFilterSatId(e.target.value);
                  if (onSelectSatellite && e.target.value !== 'all') {
                    onSelectSatellite(e.target.value);
                  }
                }}
                className="appearance-none pl-2.5 pr-7 py-0.5 text-[11px] font-bold rounded-lg bg-slate-50 dark:bg-[#121829] border border-slate-200 dark:border-white/[0.12] text-slate-800 dark:text-slate-200 outline-none hover:border-blue-400 dark:hover:border-sky-400 focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer shadow-2xs transition-colors"
              >
                <option value="all" className="dark:bg-[#0c101c] text-slate-900 dark:text-slate-100">全部卫星 ({totalSatellites})</option>
                {satellites.map((sat) => (
                  <option key={sat.id} value={sat.id} className="dark:bg-[#0c101c] text-slate-900 dark:text-slate-100">
                    {sat.name} ({sat.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* 2. 总体数据卡（置顶） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
          <div className="rounded-xl border border-blue-200/60 dark:border-sky-500/30 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/40 dark:from-[#121829] dark:via-[#161f36] dark:to-[#0f172a] p-3.5 shadow-sm flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-bold text-blue-900/70 dark:text-sky-300/80 truncate">卫星总数</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-sky-100 font-mono">{totalSatellites}</span>
              <span className="text-sm font-semibold text-blue-600/70 dark:text-sky-400">个</span>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 dark:from-[#121829] dark:via-[#13221b] dark:to-[#0d1a14] p-3.5 shadow-sm flex flex-col justify-between min-w-0">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-bold text-emerald-900/70 dark:text-emerald-300/80 truncate">已运行</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-emerald-100 font-mono">{runningDays}</span>
              <span className="text-sm font-semibold text-emerald-600/70 dark:text-emerald-400">天</span>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 dark:from-[#121829] dark:via-[#241c14] dark:to-[#18110b] p-3.5 shadow-sm flex flex-col justify-between min-w-0">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-bold text-amber-900/70 dark:text-amber-300/80 truncate">已执行任务</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-950 dark:text-amber-100 font-mono">{totalExecutedTasks}</span>
              <span className="text-sm font-semibold text-amber-600/70 dark:text-amber-400">个</span>
            </div>
          </div>
          <div className="rounded-xl border border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 dark:from-[#121829] dark:via-[#20182c] dark:to-[#130f1c] p-3.5 shadow-sm flex flex-col justify-between min-w-0">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-bold text-purple-900/70 dark:text-purple-300/80 truncate">今日任务</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-purple-950 dark:text-purple-100 font-mono">{todayTasks}</span>
              <span className="text-sm font-semibold text-purple-600/70 dark:text-purple-400">个</span>
            </div>
          </div>
        </div>

        {/* 3. 未来任务规划列表（置底，占据剩余空间） */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] overflow-hidden">
          <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">任务规划</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <CustomDatePicker
                value={taskDateFilter}
                onChange={setTaskDateFilter}
                todayDate={TASK_TODAY_DATE}
              />
              <button
                type="button"
                onClick={() => setTaskDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-sans border transition-colors cursor-pointer ${
                  taskDateFilter === 'all'
                    ? 'bg-blue-600 dark:bg-sky-500 text-white border-blue-600 dark:border-sky-500'
                    : 'bg-white dark:bg-[#0c101c] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.1] hover:text-blue-600 dark:hover:text-sky-400 hover:border-blue-300 dark:hover:border-sky-500/40'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setTaskDateFilter(TASK_TODAY_DATE)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-sans border transition-colors cursor-pointer ${
                  taskDateFilter === TASK_TODAY_DATE
                    ? 'bg-blue-600 dark:bg-sky-500 text-white border-blue-600 dark:border-sky-500'
                    : 'bg-white dark:bg-[#0c101c] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.1] hover:text-blue-600 dark:hover:text-sky-400 hover:border-blue-300 dark:hover:border-sky-500/40'
                }`}
              >
                今日
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
              <thead className="bg-slate-50/90 dark:bg-[#111728]/90 text-slate-500 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">任务ID</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">卫星</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">地面站</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    <button
                      type="button"
                      onClick={toggleTimeSort}
                      className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <span>时间</span>
                      {timeSortOrder === 'default' && <ArrowUpDown size={12} className="opacity-60" />}
                      {timeSortOrder === 'asc' && <ArrowUp size={12} />}
                      {timeSortOrder === 'desc' && <ArrowDown size={12} />}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">单星/多星</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">算力卡时</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Token消耗</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {pagedTasks.map((task) => {
                  const npuDisplay = task.npuHours ?? (task.computingTask && task.computingTask !== '无' ? '0.05h' : '0.00h');
                  const tokenInput = task.tokenUsage?.input ?? (task.computingTask && task.computingTask !== '无' ? '182400tokens' : '0tokens');
                  const tokenOutput = task.tokenUsage?.output ?? (task.computingTask && task.computingTask !== '无' ? '38200tokens' : '0tokens');

                  return (
                    <tr
                      key={task.id}
                      onClick={() => {
                        setSelectedTaskDetail(task);
                        setSelectedResultTab(RESULT_TABS[0].key);
                        setSelectedImageIndex(0);
                        setDownloadSuccess(false);
                        setActiveCostCategory(USAGE_METRIC_CATEGORIES[0].key);
                      }}
                      className="hover:bg-blue-50/40 dark:hover:bg-sky-950/20 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400 font-sans">
                        {task.id}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 font-sans">{task.satelliteName}</div>
                          <div className="text-[11px] text-slate-400 font-sans">{task.satelliteCode}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 font-sans">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{task.groundStation.split(' ')[0]}</div>
                        <div className="text-[11px] text-slate-400">{task.groundStation.split(' ').slice(1).join(' ')}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-sans font-medium text-slate-700 dark:text-slate-300">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{task.timeRange.split(' ')[0]}</div>
                        <div className="text-[11px] text-slate-400">{task.timeRange.split(' ').slice(1).join(' ')}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border font-sans ${task.starMode === '多星协同' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-500/30' : 'bg-blue-50 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300 border-blue-200/60 dark:border-sky-500/30'}`}>
                          {task.starMode === '多星协同' ? '多星' : task.starMode}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-sans font-medium text-slate-700 dark:text-slate-300">
                        {npuDisplay}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-sans text-xs">
                        <div className="space-y-0.5 font-mono">
                          <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                            <span className="text-slate-400 font-sans">输入：</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{tokenInput}</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                            <span className="text-slate-400 font-sans">输出：</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{tokenOutput}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sortedTasks.length > 0 && (
            <div className="shrink-0 flex items-center justify-between px-3.5 sm:px-4 py-2 border-t border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-sans">
                  共 <span className="font-mono">{sortedTasks.length}</span> 条 · <span className="font-mono">{taskListPage}</span>/<span className="font-mono">{taskListTotalPages}</span>
                </span>
                <select
                  value={taskListPageSize}
                  onChange={(e) => { setTaskListPageSize(Number(e.target.value)); setTaskListPage(1); }}
                  aria-label="每页条数"
                  className="text-[11px] text-slate-400 bg-transparent border border-slate-200 dark:border-white/[0.1] rounded px-1 py-0.5 outline-none hover:border-blue-400 dark:hover:border-sky-400 cursor-pointer transition-colors"
                >
                  {TASK_LIST_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size} className="dark:bg-[#0c101c]">
                      {size} 条/页
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={taskListPage <= 1}
                  onClick={() => setTaskListPage((p) => p - 1)}
                  aria-label="上一页"
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={taskListPage >= taskListTotalPages}
                  onClick={() => setTaskListPage((p) => p + 1)}
                  aria-label="下一页"
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



