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
  ArrowUpDown
} from 'lucide-react';
import { Satellite, FlowStepItem } from '../types';
import { FlowStepsTimeline } from './FlowStepsTimeline';

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
  // 是否为对话流刚发起的实时任务（决定详情页流程是否需要逐步呈现动画）
  isLive?: boolean;
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

// 详情页流程动画节奏（ms/步），供 App.tsx 估算总耗时以在动画结束后发出对话流结果反馈
export const FLOW_STEP_INTERVAL_MS = 450;
export const GROUND_STAGE_STEP_COUNT = GROUND_STAGE_LABELS.length;
export const ONBOARD_STAGE_STEP_COUNT = ONBOARD_STAGE_LABELS.length;

const toFlowSteps = (labels: string[], errorIndex?: number): FlowStepItem[] =>
  labels.map((label, i) => ({ key: label, label, status: i === errorIndex ? 'error' as const : 'success' as const }));

const RESULT_TABS: { key: string; label: string; filterClass: string }[] = [
  { key: 'l1', label: 'L1数据', filterClass: '' },
  { key: 'cloud', label: '云检测', filterClass: 'hue-rotate-180 saturate-150' },
  { key: 'fire', label: '火灾监测', filterClass: 'hue-rotate-[300deg] saturate-200' },
];
const RESULT_IMAGE_URL = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80';

// 用量统计费用类目（成像/在轨预处理/在轨推理/数据暂存/下传各费用构成明细，颜色与系统统一配色体系一致）
interface UsageCostItem {
  name: string;
  formula: string;
  amount: number;
}
interface UsageCostCategory {
  key: string;
  label: string;
  total: number;
  textClass: string;
  bgClass: string;
  chipTextClass: string;
  chipBgClass: string;
  items: UsageCostItem[];
}
const USAGE_COST_CATEGORIES: UsageCostCategory[] = [
  {
    key: 'imaging',
    label: '成像费',
    total: 1186.0,
    textClass: 'text-blue-600 dark:text-sky-400',
    bgClass: 'bg-blue-600 dark:bg-sky-500',
    chipTextClass: 'text-blue-600 dark:text-sky-400',
    chipBgClass: 'bg-blue-50 dark:bg-sky-500/15',
    items: [
      { name: '任务调度费', formula: '1次 × 200.00元/次 × 1', amount: 200.0 },
      { name: '成像时长费', formula: '240卡·秒 × 2.00元/卡·秒 × 1', amount: 480.0 },
      { name: '侧摆附加费', formula: '1次 × 500.00元/次 × 1', amount: 500.0 },
      { name: '原始数据暂存费', formula: '3GB·h × 2.00元/GB·h × 1', amount: 6.0 },
    ],
  },
  {
    key: 'processing',
    label: '在轨预处理费',
    total: 800.0,
    textClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-600 dark:bg-violet-500',
    chipTextClass: 'text-violet-600 dark:text-violet-400',
    chipBgClass: 'bg-violet-50 dark:bg-violet-500/15',
    items: [
      { name: 'NPU卡时费', formula: '0.05卡时 × 8000.00元/卡时 × 复杂度2 × 功耗1', amount: 800.0 },
    ],
  },
  {
    key: 'inference',
    label: '在轨推理费',
    total: 0.1715,
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-600 dark:bg-amber-500',
    chipTextClass: 'text-amber-600 dark:text-amber-400',
    chipBgClass: 'bg-amber-50 dark:bg-amber-500/15',
    items: [
      { name: '输入token费', formula: '182,400 tokens × 0.50元/百万tokens × 1', amount: 0.076 },
      { name: '输出token费', formula: '38,200 tokens × 2.50元/百万tokens × 1', amount: 0.0955 },
    ],
  },
  {
    key: 'storage',
    label: '数据暂存费',
    total: 6.2,
    textClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-600 dark:bg-emerald-500',
    chipTextClass: 'text-emerald-600 dark:text-emerald-400',
    chipBgClass: 'bg-emerald-50 dark:bg-emerald-500/15',
    items: [
      { name: '热存储费', formula: '1GB·h × 5.00元/GB·h × 1', amount: 5.0 },
      { name: '温存储费', formula: '0.6GB·h × 2.00元/GB·h × 1', amount: 1.2 },
    ],
  },
  {
    key: 'downlink',
    label: '下传费',
    total: 82.5,
    textClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-600 dark:bg-orange-500',
    chipTextClass: 'text-orange-600 dark:text-orange-400',
    chipBgClass: 'bg-orange-50 dark:bg-orange-500/15',
    items: [
      { name: '下传费', formula: '0.55GB × 1500.00元/GB × 1', amount: 82.5 },
    ],
  },
];
const USAGE_COST_TOTAL = USAGE_COST_CATEGORIES.reduce((sum, cat) => sum + cat.total, 0);

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

interface TaskManagementKanbanProps {
  satellites: Satellite[];
  selectedSatelliteId?: string;
  onSelectSatellite?: (satId: string) => void;
  // 一轨成像对话流发起后注入的任务，注入后自动跳转到其详情页
  injectedTask?: PlannedTaskItem | null;
  // 每次递增时强制重新跳转到 injectedTask 详情页（用于用户已返回列表后再次点击“查看”）
  focusRequestId?: number;
}

export const TaskManagementKanban: React.FC<TaskManagementKanbanProps> = ({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
  injectedTask,
  focusRequestId,
}) => {
  const [filterSatId, setFilterSatId] = useState<string>('all');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<PlannedTaskItem | null>(null);
  const [chatCreatedTasks, setChatCreatedTasks] = useState<PlannedTaskItem[]>([]);
  const [selectedResultTab, setSelectedResultTab] = useState<string>(RESULT_TABS[0].key);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeCostCategory, setActiveCostCategory] = useState<string | null>(USAGE_COST_CATEGORIES[0].key);
  const [taskListPage, setTaskListPage] = useState(1);
  const TASK_LIST_PAGE_SIZE_OPTIONS = [10, 20, 50];
  const [taskListPageSize, setTaskListPageSize] = useState(TASK_LIST_PAGE_SIZE_OPTIONS[0]);
  // 任务规划列表的时期筛选：默认仅显示今日任务，留空（'all'）则显示全部历史任务
  const TASK_TODAY_DATE = '2026-09-04';
  const [taskDateFilter, setTaskDateFilter] = useState<string>(TASK_TODAY_DATE);
  // 一轨成像详情页流程逐步呈现进度（地面阶段 / 星上阶段各自当前步数）
  const [groundStepIndex, setGroundStepIndex] = useState(GROUND_STAGE_LABELS.length);
  const [onboardStepIndex, setOnboardStepIndex] = useState(ONBOARD_STAGE_LABELS.length);

  const initialTasks: PlannedTaskItem[] = [
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
    },
  ];

  // 对话流触发的一轨成像任务：注入到任务列表顶部，并自动跳转到其详情页；
  // focusRequestId 变化时（如用户返回列表后再次点击“查看”）即使任务未变也强制重新跳转
  useEffect(() => {
    if (!injectedTask) return;
    setChatCreatedTasks(prev => (prev.some(t => t.id === injectedTask.id) ? prev : [injectedTask, ...prev]));
    setSelectedTaskDetail(injectedTask);
  }, [injectedTask, focusRequestId]);

  // 任务详情页流程逐步呈现：实时发起的一轨成像任务地面+星上均按步骤动画推进；
  // 实时发起的常规模式任务仅地面任务规划逐步呈现，星上处理流程默认折叠并直接呈现完成状态；其余历史任务直接呈现为已完成
  useEffect(() => {
    if (!selectedTaskDetail) return;

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
          <div className="flex items-center gap-3 shrink-0 pb-1 border-b border-slate-100/80 dark:border-white/[0.04]">
            <button
              type="button"
              onClick={() => setSelectedTaskDetail(null)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回</span>
            </button>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">任务规划详情</h4>
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
                  <span className="text-slate-400 shrink-0">是否成像</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">{task.isImaging ? '成像' : '非成像'}</span>
                </div>
                <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-slate-400 shrink-0">计算任务</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.computingTask}</span>
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
                  key={groundAnimating ? `ground-${groundDone}-${groundErrorIndex}` : 'ground-static'}
                  steps={toFlowSteps(GROUND_STAGE_LABELS, groundErrorIndex)}
                  currentStepIndex={groundStepIndex}
                  title="地面大模型解析"
                  collapsible
                  defaultExpanded={groundAnimating ? !groundDone : false}
                />
                <FlowStepsTimeline
                  key={isLiveOrbit ? `onboard-${onboardStarted}-${onboardDone}-${onboardErrorIndex}` : 'onboard-static'}
                  steps={toFlowSteps(ONBOARD_STAGE_LABELS, onboardErrorIndex)}
                  currentStepIndex={onboardStepIndex}
                  title="星上任务自主执行"
                  collapsible
                  defaultExpanded={isLiveOrbit ? (onboardStarted && !onboardDone) : false}
                />
              </div>
            </div>

            {/* 结果下载：星上处理流程全部完成后才呈现结果内容 */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] overflow-hidden mb-1">
              <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500" />
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">结果下载</h5>
              </div>
              {taskFailed ? (
                <div className="p-6 flex items-center justify-center text-xs text-red-500 dark:text-red-400 font-sans">
                  任务已失败，无可用结果
                </div>
              ) : onboardStepIndex < ONBOARD_STAGE_LABELS.length ? (
                <div className="p-6 flex items-center justify-center text-xs text-slate-400 font-sans">
                  星上处理流程尚未完成，结果生成后将在此处展示
                </div>
              ) : (
              <div className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {RESULT_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSelectedResultTab(tab.key)}
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
                    onClick={() => {
                      const element = document.createElement('a');
                      element.setAttribute('href', RESULT_IMAGE_URL);
                      element.setAttribute('download', `OneSpace_${task.id}_${RESULT_TABS.find((t) => t.key === selectedResultTab)?.label}.jpg`);
                      element.setAttribute('target', '_blank');
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                      setDownloadSuccess(true);
                      setTimeout(() => setDownloadSuccess(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    {downloadSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已下载</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>下载</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-black max-h-56 sm:max-h-64">
                  <img
                    src={RESULT_IMAGE_URL}
                    alt={RESULT_TABS.find((t) => t.key === selectedResultTab)?.label}
                    className={`w-full h-full object-cover transition-all ${RESULT_TABS.find((t) => t.key === selectedResultTab)?.filterClass || ''}`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              )}
            </div>

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
              <div className="p-3.5 sm:p-4 space-y-3.5">
                {/* 费用构成占比 */}
                <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#121829] p-3 sm:p-3.5">
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">费用构成</span>
                    <div className="text-right leading-none">
                      <span className="text-[10px] text-slate-400 mr-1.5 font-sans">总费用</span>
                      <span className="font-bold text-sm sm:text-base text-blue-600 dark:text-sky-400 tabular-nums">
                        ¥{USAGE_COST_TOTAL.toLocaleString('zh-CN', { minimumFractionDigits: 4 })}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3.5 bg-slate-100 dark:bg-white/[0.04]">
                    {USAGE_COST_CATEGORIES.map((cat) => {
                      const pct = (cat.total / USAGE_COST_TOTAL) * 100;
                      return (
                        <div
                          key={cat.key}
                          className={`${cat.bgClass} rounded-full`}
                          style={{ width: `${pct}%`, minWidth: pct > 0.05 ? '3px' : 0 }}
                          title={`${cat.label} ¥${cat.total.toFixed(4)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                    {USAGE_COST_CATEGORIES.map((cat) => {
                      const pct = (cat.total / USAGE_COST_TOTAL) * 100;
                      return (
                        <div key={cat.key} className="flex items-center gap-2 min-w-0">
                          <span className={`w-1 h-7 rounded-full flex-shrink-0 ${cat.bgClass}`} />
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-sans">{cat.label}</span>
                              <span className={`text-[10px] font-bold tabular-nums ${cat.textClass}`}>{pct.toFixed(1)}%</span>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums leading-tight">
                              ¥{cat.total.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 费用明细：按类目展开查看计费公式 */}
                <div className="space-y-2">
                  {USAGE_COST_CATEGORIES.map((cat) => {
                    const isActive = activeCostCategory === cat.key;
                    return (
                      <div
                        key={cat.key}
                        onClick={() => setActiveCostCategory((prev) => (prev === cat.key ? null : cat.key))}
                        className={`rounded-xl border overflow-hidden transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-[#121829] border-slate-200 dark:border-white/[0.1]'
                            : 'bg-white/70 dark:bg-white/[0.015] border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center justify-between px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-1.5 h-5 rounded-full flex-shrink-0 ${cat.bgClass}`} />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans truncate">{cat.label}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cat.chipBgClass} ${cat.chipTextClass}`}>
                              {cat.items.length} 项
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`text-xs sm:text-sm font-bold tabular-nums ${cat.textClass}`}>¥{cat.total.toFixed(4)}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {isActive && (
                          <div
                            className="border-t border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.04]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cat.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                                <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans shrink-0">
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-1 flex-wrap justify-end min-w-0">
                                  {item.formula.split('×').map((part, pi, arr) => (
                                    <span key={pi} className="flex items-center gap-1">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {part.trim()}
                                      </span>
                                      {pi < arr.length - 1 && <span className="text-[10px] text-slate-300 dark:text-slate-600">×</span>}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums shrink-0 min-w-[5rem] text-right">
                                  ¥{item.amount.toFixed(4)}
                                </span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between px-3.5 py-2">
                              <span className="text-[10px] text-slate-400 font-sans">小计</span>
                              <span className={`text-xs font-bold tabular-nums ${cat.textClass}`}>¥{cat.total.toFixed(4)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          </div>
        </div>

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
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">是否成像</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">是否计算</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">单星/多星</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {pagedTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskDetail(task);
                      setSelectedResultTab(RESULT_TABS[0].key);
                      setDownloadSuccess(false);
                      setActiveCostCategory(USAGE_COST_CATEGORIES[0].key);
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
                      {task.isImaging ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30 text-[11px] font-bold font-sans">
                          <span>是</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.1] text-[11px] font-medium font-sans">
                          <span>否</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {task.computingTask && task.computingTask !== '无' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30 text-[11px] font-bold font-sans">
                          <span>是</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.1] text-[11px] font-medium font-sans">
                          <span>否</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border font-sans ${task.starMode === '多星协同' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-500/30' : 'bg-blue-50 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300 border-blue-200/60 dark:border-sky-500/30'}`}>
                        {task.starMode === '多星协同' ? '多星' : task.starMode}
                      </span>
                    </td>
                  </tr>
                ))}
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



