import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Terminal, 
  X, 
  Copy, 
  Check, 
  Send,
  Upload,
  Paperclip,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getSatelliteOverview,
  getSubsystemsForSatellite,
  getAnomaliesForSatellite,
  SystemKey,
  AnomalyItem,
  HealthTimeSpan,
  getCoreTelemetriesForSubsystem,
  TelemetryItem
} from '../data/telemetryAndHealthData';

interface HealthStatusDashboardProps {
  satelliteId?: string;
  satelliteName?: string;
  satelliteCode?: string;
  overviewTimeSpan?: HealthTimeSpan;
}

// 异常详情表格每页展示条数：默认最多 3 条，可通过分页器旁的选择器调整
const ANOMALY_PAGE_SIZE = 3;

// 分页器每页条数可选项
const PAGE_SIZE_OPTIONS = [3, 5, 10, 20];

// 分页器：每页条数选择 + 上一页 / 下一页 + 页码提示（紧凑形式，压缩高度）
const PaginationBar: React.FC<{
  page: number;
  totalPages: number;
  totalCount: number;
  onChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}> = ({ page, totalPages, totalCount, onChange, pageSize, onPageSizeChange }) => {
  if (totalCount === 0) return null;
  return (
    <div className="shrink-0 flex items-center justify-between pt-1.5 mt-0.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">
          共 <span className="font-mono">{totalCount}</span> 条 · <span className="font-mono">{page}</span>/<span className="font-mono">{totalPages}</span>
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="每页条数"
          className="text-[11px] text-slate-400 bg-transparent border border-slate-200 dark:border-white/[0.1] rounded px-1 py-0.5 outline-none hover:border-blue-400 dark:hover:border-sky-400 cursor-pointer transition-colors"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size} className="dark:bg-[#0c101c]">
              {size} 条/页
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="上一页"
          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="下一页"
          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const HealthStatusDashboard: React.FC<HealthStatusDashboardProps> = ({
  satelliteId = 'yj-mx01',
  satelliteName = '云尖沐曦号',
  satelliteCode = 'SCS-04-15',
  overviewTimeSpan: initialOverviewTimeSpan = 'history'
}) => {
  const [overviewTimeSpan, setOverviewTimeSpan] = useState<HealthTimeSpan>(initialOverviewTimeSpan);
  const overview = useMemo(() => getSatelliteOverview(satelliteId, overviewTimeSpan), [satelliteId, overviewTimeSpan]);
  const subsystems = useMemo(() => getSubsystemsForSatellite(satelliteId), [satelliteId]);
  const anomalies = useMemo(() => getAnomaliesForSatellite(satelliteId), [satelliteId]);

  // 根据不同分类统计异常数
  const anomalyCountByClass = useMemo(() => {
    const class1 = anomalies.filter(a => a.classType === 'I').length;
    const class2 = anomalies.filter(a => a.classType === 'II').length;
    const class3 = anomalies.filter(a => a.classType === 'III').length;
    return {
      all: overview.totalAnomalies,
      I: class1,
      II: class2,
      III: class3,
    };
  }, [anomalies, overview.totalAnomalies]);

  // 默认选中有异常的系统或第一个系统
  const [selectedSystemKey, setSelectedSystemKey] = useState<SystemKey>(() => {
    const abnormalSys = subsystems.find(s => !s.isNormal);
    return abnormalSys ? abnormalSys.key : subsystems[0].key;
  });

  // 当卫星切换时，自动选择当前卫星有异常的系统或首个系统
  useEffect(() => {
    const abnormalSys = subsystems.find(s => !s.isNormal);
    const targetKey = abnormalSys ? abnormalSys.key : subsystems[0].key;
    setSelectedSystemKey(targetKey);
    setSelectedClass1Anomaly(null);
    setSelectedClass2Anomaly(null);
  }, [satelliteId, subsystems]);

  const [activeAnomalyTab, setActiveAnomalyTab] = useState<'I' | 'II' | 'III'>('I');
  const [selectedClass1Anomaly, setSelectedClass1Anomaly] = useState<AnomalyItem | null>(null);
  const [selectedClass2Anomaly, setSelectedClass2Anomaly] = useState<AnomalyItem | null>(null);
  const [selectedClass3Anomaly, setSelectedClass3Anomaly] = useState<AnomalyItem | null>(null);

  // II 类异常可编辑表单临时状态：处置措施 与 遥控指令
  // 状态流转：待复核 (amber) -> 确认后 -> 已复核 (sky) -> 模拟星上处理后(约2.5秒) -> 已处置 (emerald)
  const [editableActionMeasure, setEditableActionMeasure] = useState<string>('');
  const [editableTelecommandHex, setEditableTelecommandHex] = useState<string>('');
  const [class2StatusMap, setClass2StatusMap] = useState<Record<string, 'reviewed' | 'resolved'>>({});

  // III 类异常可编辑表单临时状态：处置措施 与 遥控指令
  // 状态流转：待处理 (rose) -> 确认后 -> 已提交 (sky) -> 模拟星上处理后(约2.5秒) -> 已处置 (emerald)
  const [editableActionMeasure3, setEditableActionMeasure3] = useState<string>('');
  const [editableTelecommandHex3, setEditableTelecommandHex3] = useState<string>('');
  const [attachedFiles3, setAttachedFiles3] = useState<File[]>([]);
  const [class3StatusMap, setClass3StatusMap] = useState<Record<string, 'submitted' | 'resolved'>>({});
  const [manualCountOffset, setManualCountOffset] = useState<number>(0);
  const fileInputRef3 = useRef<HTMLInputElement>(null);

  // 打开 II 类弹窗时初始化编辑状态
  const handleOpenClass2Modal = (anom: AnomalyItem) => {
    setSelectedClass2Anomaly(anom);
    setEditableActionMeasure(anom.actionMeasure || '["智算设置NVME启动", "GPU强制待机", "智算GPU上电", "智算恢复EMMC分区", "智算设置EMMC启动", "GPU强制待机", "智算GPU上电"]');
    setEditableTelecommandHex(anom.telecommandHex || '20 E9 11 12 00 11 0F C0 00 00 0E 5F 55 58 D6 A1 31 0D 09 93 55 C1 00 00 17 17 11 0F C0 00 00 0E 5F 55 58 D6 A1 31 0D 09 93 55 C1 00 00 10 10 11 0F C0 00 00 0E 5F 55 6A D6 A1 31 0D 09 93 55 C1 00 00 15 15 11 0F C0 00 00 87 5F 55 7E D6 A1 31 0D 82 93 55 C1 00 00 22 01 2F 68 6F 6D 65 2F 7A 68 69 6A 69 61 5F 72 75 6E 2F 73 79 73 74 65 6D 5F 65 6D 62 65 64 64 65 64 5F 66 6F 6C 64 65 72 2F 73 79 73 74 65 6D 5F 72 65 63 6F 76 65 72 79 2E 73 68 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 40 00 11 0F C0 00 00 0E 5F 55 92 D6 A1 31 0D 09 93 55 C1 00 00 16 16 11 0F C0 00 00 0E 5F 55 A6 D6 A1 31 0D 09 93 55 C1 00 00 10 10 11 0F C0 00 00 0E 5F 55 6A D6 A1 31 0D 09 93 55 C1 00 00 15 15 07 FF AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA');
  };

  const handleConfirmClass2 = () => {
    if (selectedClass2Anomaly) {
      const anomId = selectedClass2Anomaly.id;
      // 1. 点击确认后，状态先变成「已复核」
      setClass2StatusMap(prev => ({ ...prev, [anomId]: 'reviewed' }));
      // 2. 模拟星上处理状态更新后变成「已处置」，人工处置数 + 1
      setTimeout(() => {
        setClass2StatusMap(prev => ({ ...prev, [anomId]: 'resolved' }));
        setManualCountOffset(prev => prev + 1);
      }, 2500);
    }
    setSelectedClass2Anomaly(null);
  };

  // 打开 III 类弹窗时初始化编辑状态
  const handleOpenClass3Modal = (anom: AnomalyItem) => {
    setSelectedClass3Anomaly(anom);
    setEditableActionMeasure3(anom.actionMeasure || '启用辅助相变储热回路与主动温控旁路，重校精瞄准光轴并下发姿态防抖补丁');
    setEditableTelecommandHex3(anom.telecommandHex || '20 E9 13 18 00 11 08 C0 00 00 0C 4A 55 68 D6 A1 22 0E 08 82 44 C2 00 00 18 18 07 FF AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA');
    setAttachedFiles3([]);
  };

  const handleConfirmClass3 = () => {
    if (!editableTelecommandHex3.trim()) {
      alert('遥控指令为必填项，请输入遥控指令！');
      return;
    }
    if (selectedClass3Anomaly) {
      const anomId = selectedClass3Anomaly.id;
      // 1. 点击确认后，状态先变为「已提交」
      setClass3StatusMap(prev => ({ ...prev, [anomId]: 'submitted' }));
      // 2. 模拟星上处理后，变为「已处置」，人工处置数 + 1
      setTimeout(() => {
        setClass3StatusMap(prev => ({ ...prev, [anomId]: 'resolved' }));
        setManualCountOffset(prev => prev + 1);
      }, 2500);
    }
    setSelectedClass3Anomaly(null);
  };

  const handleFileChange3 = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setAttachedFiles3(prev => [...prev, ...files]);
    }
  };

  const handleRemoveFile3 = (index: number) => {
    setAttachedFiles3(prev => prev.filter((_, i) => i !== index));
  };

  // 排序状态控制：'default' | 'asc' | 'desc'
  // II 类：升序（待复核 1 -> 已复核 2 -> 已处置 3） / 降序（已处置 3 -> 已复核 2 -> 待复核 1）
  // III 类：升序（待处理 1 -> 已提交 2 -> 已处置 3） / 降序（已处置 3 -> 已提交 2 -> 待处理 1）
  const [class2SortOrder, setClass2SortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [class3SortOrder, setClass3SortOrder] = useState<'default' | 'asc' | 'desc'>('default');

  const currentSubsystem = subsystems.find((s) => s.key === selectedSystemKey) || subsystems[0];
  // 是否查看全部分系统的异常（点击"共 N 个分系统"胶囊按钮触发）
  const [showAllSubsystems, setShowAllSubsystems] = useState(false);

  // 异常详情分页：I / II / III 类各自独立分页与独立每页条数，卫星切换时重置到第一页
  const [class1Page, setClass1Page] = useState(1);
  const [class2Page, setClass2Page] = useState(1);
  const [class3Page, setClass3Page] = useState(1);
  const [class1PageSize, setClass1PageSize] = useState(ANOMALY_PAGE_SIZE);
  const [class2PageSize, setClass2PageSize] = useState(ANOMALY_PAGE_SIZE);
  const [class3PageSize, setClass3PageSize] = useState(ANOMALY_PAGE_SIZE);
  useEffect(() => {
    setClass1Page(1);
    setClass2Page(1);
    setClass3Page(1);
  }, [satelliteId]);

  // 异常检测模块展示整星全量异常，不与分系统筛选联动
  const class1Anomalies = useMemo(() => {
    return anomalies.filter((a) => a.classType === 'I');
  }, [anomalies]);

  const class2Anomalies = useMemo(() => {
    const list = anomalies.filter((a) => a.classType === 'II');
    if (class2SortOrder === 'default') return list;

    // 权重：待复核 = 1, 已复核 = 2, 已处置 = 3
    const getWeight = (anomId: string) => {
      const st = class2StatusMap[anomId];
      if (st === 'resolved') return 3;
      if (st === 'reviewed') return 2;
      return 1; // 待复核
    };

    return [...list].sort((a, b) => {
      const wa = getWeight(a.id);
      const wb = getWeight(b.id);
      return class2SortOrder === 'asc' ? wa - wb : wb - wa;
    });
  }, [anomalies, class2StatusMap, class2SortOrder]);

  const class3Anomalies = useMemo(() => {
    const list = anomalies.filter((a) => a.classType === 'III');
    if (class3SortOrder === 'default') return list;

    // 权重：待处理 = 1, 已提交 = 2, 已处置 = 3
    const getWeight = (anomId: string) => {
      const st = class3StatusMap[anomId];
      if (st === 'resolved') return 3;
      if (st === 'submitted') return 2;
      return 1; // 待处理
    };

    return [...list].sort((a, b) => {
      const wa = getWeight(a.id);
      const wb = getWeight(b.id);
      return class3SortOrder === 'asc' ? wa - wb : wb - wa;
    });
  }, [anomalies, class3StatusMap, class3SortOrder]);

  // 分页：每页条数可由用户在分页器中调整
  const class1TotalPages = Math.max(1, Math.ceil(class1Anomalies.length / class1PageSize));
  const class2TotalPages = Math.max(1, Math.ceil(class2Anomalies.length / class2PageSize));
  const class3TotalPages = Math.max(1, Math.ceil(class3Anomalies.length / class3PageSize));
  const class1PagedAnomalies = useMemo(
    () => class1Anomalies.slice((class1Page - 1) * class1PageSize, class1Page * class1PageSize),
    [class1Anomalies, class1Page, class1PageSize]
  );
  const class2PagedAnomalies = useMemo(
    () => class2Anomalies.slice((class2Page - 1) * class2PageSize, class2Page * class2PageSize),
    [class2Anomalies, class2Page, class2PageSize]
  );
  const class3PagedAnomalies = useMemo(
    () => class3Anomalies.slice((class3Page - 1) * class3PageSize, class3Page * class3PageSize),
    [class3Anomalies, class3Page, class3PageSize]
  );
  // 核心遥测列表分页：每页条数可由用户在分页器中调整
  const TELEMETRY_PAGE_SIZE = 3;
  const [telemetryPage, setTelemetryPage] = useState(1);
  const [telemetryPageSize, setTelemetryPageSize] = useState(TELEMETRY_PAGE_SIZE);
  // 状态列排序：'default' | 'asc'（正常在前）| 'desc'（不正常在前）
  const [telemetryStatusSortOrder, setTelemetryStatusSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const coreTelemetries = useMemo(() => {
    return getCoreTelemetriesForSubsystem(satelliteId, showAllSubsystems ? undefined : selectedSystemKey);
  }, [satelliteId, showAllSubsystems, selectedSystemKey]);

  const sortedCoreTelemetries = useMemo(() => {
    if (telemetryStatusSortOrder === 'default') return coreTelemetries;
    return [...coreTelemetries].sort((a, b) => {
      const wa = a.isNormal ? 1 : 0;
      const wb = b.isNormal ? 1 : 0;
      return telemetryStatusSortOrder === 'asc' ? wb - wa : wa - wb;
    });
  }, [coreTelemetries, telemetryStatusSortOrder]);

  useEffect(() => {
    setTelemetryPage(1);
  }, [selectedSystemKey, showAllSubsystems, satelliteId]);

  const telemetryTotalPages = Math.max(1, Math.ceil(sortedCoreTelemetries.length / telemetryPageSize));
  const pagedCoreTelemetries = useMemo(
    () => sortedCoreTelemetries.slice((telemetryPage - 1) * telemetryPageSize, telemetryPage * telemetryPageSize),
    [sortedCoreTelemetries, telemetryPage, telemetryPageSize]
  );

  const toggleTelemetryStatusSort = () => {
    setTelemetryStatusSortOrder(prev => (prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default'));
  };


  const toggleClass2Sort = () => {
    setClass2SortOrder(prev => (prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default'));
  };

  const toggleClass3Sort = () => {
    setClass3SortOrder(prev => (prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default'));
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col select-none space-y-3 pb-1 overflow-y-auto custom-scrollbar pr-1">

      {/* 模块一：分系统健康概览（包括：9个系统状态看板 + 核心遥测列表） */}
      <div className="rounded-xl border border-blue-200/50 dark:border-sky-500/20 bg-gradient-to-br from-slate-50/90 via-blue-50/30 to-sky-50/50 dark:from-[#121829]/90 dark:via-[#161f36]/70 dark:to-[#0f172a]/90 p-2.5 sm:p-3 space-y-2 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
              分系统健康概览
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
              更新于 2026-09-09 20:07:28
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAllSubsystems(true)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer border ${
              showAllSubsystems
                ? 'bg-blue-600 dark:bg-sky-500 text-white border-blue-600 dark:border-sky-500'
                : 'bg-white dark:bg-[#121829] text-slate-500 border-slate-200 dark:border-white/[0.08] hover:text-blue-600 dark:hover:text-sky-400 hover:border-blue-300 dark:hover:border-sky-500/40'
            }`}
          >
            全部 9 个分系统
          </button>
        </div>

        {/* 1.1 分系统健康状态：9个系统状态看板（高度自适应，4K自适应放大） */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(105px,1fr))] 2xl:grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-1.5 sm:gap-2 2xl:gap-3 items-stretch">
          {subsystems.map((sys) => {
            const isSelected = selectedSystemKey === sys.key;
            const isAlarm = sys.healthLevel === 'alarm' || sys.statusText === '告警';
            const isAttention = sys.healthLevel === 'attention' || sys.statusText === '关注';

            const statusColorClass = isAlarm
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : isAttention
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-emerald-600 dark:text-emerald-400 font-semibold';

            const indicatorColorClass = isAlarm
              ? 'bg-rose-500'
              : isAttention
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            return (
              <button
                key={sys.key}
                type="button"
                onClick={() => {
                  setSelectedSystemKey(sys.key);
                  setShowAllSubsystems(false);
                  if (sys.anomalyCounts.class3 > 0) setActiveAnomalyTab('III');
                  else if (sys.anomalyCounts.class2 > 0) setActiveAnomalyTab('II');
                  else setActiveAnomalyTab('I');
                }}
                className={`p-2 sm:p-2.5 2xl:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 min-w-[100px] 2xl:min-w-[130px] h-auto ${
                  isSelected && !showAllSubsystems
                    ? 'border-blue-500 bg-blue-50/95 dark:bg-sky-950/60 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#121829] hover:bg-slate-100/80 dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs 2xl:text-base font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {sys.name}
                  </div>
                  <div className={`text-[10px] 2xl:text-sm mt-0.5 2xl:mt-1 whitespace-nowrap ${statusColorClass}`}>
                    {sys.statusText}
                  </div>
                </div>
                <span className={`w-2.5 h-2.5 2xl:w-3.5 2xl:h-3.5 rounded-full shrink-0 ${indicatorColorClass}`} />
              </button>
            );
          })}
        </div>
        {/* 1.2 核心遥测列表（表头：参数代号、参数名称、分系统、状态） */}
        <div className="pt-2 border-t border-blue-100/60 dark:border-white/[0.06] space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              核心遥测列表【{showAllSubsystems ? '全部分系统' : currentSubsystem.name}】
            </span>
            <span className="text-[11px] text-slate-400">
              共 <span className="font-mono font-bold text-blue-600 dark:text-sky-400">{coreTelemetries.length}</span> 项参数
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c101c]/90 overflow-hidden shadow-2xs flex flex-col">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[520px]">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '48%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] text-xs 2xl:text-sm font-bold text-slate-700 dark:text-slate-300">
                  <tr className="h-7 2xl:h-9">
                    <th className="py-1 px-3 whitespace-nowrap">参数代号</th>
                    <th className="py-1 px-3 whitespace-nowrap">参数名称</th>
                    <th className="py-1 px-3 whitespace-nowrap">分系统</th>
                    <th className="py-1 px-3 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={toggleTelemetryStatusSort}
                        title="点击切换排序：正常优先 / 不正常优先"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer group select-none"
                      >
                        <span>状态</span>
                        {telemetryStatusSortOrder === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 stroke-[2.5]" />
                        ) : telemetryStatusSortOrder === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 stroke-[2.5]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs 2xl:text-sm">
                  {pagedCoreTelemetries.length > 0 ? (
                    <>
                      {pagedCoreTelemetries.map((item) => (
                        <tr
                          key={item.id}
                          className="h-7 2xl:h-9 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors whitespace-nowrap"
                        >
                          <td className="py-1 px-3 font-mono font-bold text-blue-600 dark:text-sky-400">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50/80 dark:bg-sky-950/50 border border-blue-200/60 dark:border-sky-500/30">
                              {item.code}
                            </span>
                          </td>
                          <td className="py-1 px-3 font-medium text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                            {item.name}
                          </td>
                          <td className="py-1 px-3 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {item.subsystemName}
                          </td>
                          <td className="py-1 px-3 whitespace-nowrap text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold ${
                                item.isNormal
                                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30'
                                  : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-500/30'
                              }`}
                            >
                              {item.statusText}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* 固定 3 行高度占位，避免数据不足 3 行时高度跳动 */}
                      {Array.from({ length: Math.max(0, telemetryPageSize - pagedCoreTelemetries.length) }).map((_, idx) => (
                        <tr key={`telemetry-empty-${idx}`} className="h-7 2xl:h-9 select-none pointer-events-none">
                          <td colSpan={4} className="py-1 px-3">&nbsp;</td>
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr className="h-21 2xl:h-27">
                      <td colSpan={4} className="py-3 text-center text-slate-400 text-xs 2xl:text-sm whitespace-nowrap">
                        暂无核心遥测数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 pb-0.5">
              <PaginationBar
                page={telemetryPage}
                totalPages={telemetryTotalPages}
                totalCount={coreTelemetries.length}
                onChange={setTelemetryPage}
                pageSize={telemetryPageSize}
                onPageSizeChange={(size) => { setTelemetryPageSize(size); setTelemetryPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 模块二：异常检测（包括：总体数据卡 + 异常详情列表） */}
      <div className="rounded-xl border border-blue-200/50 dark:border-sky-500/20 bg-gradient-to-br from-slate-50/90 via-blue-50/30 to-sky-50/50 dark:from-[#121829]/90 dark:via-[#161f36]/70 dark:to-[#0f172a]/90 p-2.5 sm:p-3 space-y-2 shadow-sm flex flex-col justify-between">
        {/* 2.0 模块二标题：异常检测（右上角有时段分段器下拉：今日 / 本周 / 本月 / 历史） */}
        <div className="shrink-0 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500 shrink-0" />
            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
              异常检测
            </h5>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
              更新于 2026-09-09 20:07:28
            </span>
          </div>
          {/* 右上角：时段分段器 */}
          <div className="relative inline-block">
            <select
              id="select-overview-timespan"
              value={overviewTimeSpan}
              onChange={(e) => setOverviewTimeSpan(e.target.value as HealthTimeSpan)}
              className="appearance-none pl-2 pr-6 py-0.5 text-[11px] font-bold rounded-lg bg-slate-50 dark:bg-[#121829] border border-slate-200 dark:border-white/[0.12] text-slate-800 dark:text-slate-200 outline-none hover:border-blue-400 dark:hover:border-sky-400 focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="today">今日</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="history">历史</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* 2.1 总体数据卡：累计监测 多少天、发现异常 多少个、自动处置 多少个（高度自适应） */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(105px,1fr))] gap-1.5 sm:gap-2 shrink-0 items-stretch">
          {/* 卡片 1：累计监测多少天 */}
          <div className="p-2 sm:p-2.5 2xl:p-3 rounded-xl border border-blue-200/60 dark:border-sky-500/30 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/40 dark:from-[#121829] dark:via-[#161f36] dark:to-[#0f172a] shadow-xs flex items-center justify-between gap-2 min-w-[100px] h-auto overflow-hidden">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] 2xl:text-base font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {overviewTimeSpan === 'today' ? '今日监测' : overviewTimeSpan === 'week' ? '本周监测' : overviewTimeSpan === 'month' ? '本月监测' : '累计监测'}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 sm:mt-1">
                <span className="text-base sm:text-lg 2xl:text-3xl font-extrabold text-blue-600 dark:text-sky-400 font-mono">
                  {overview.daysInOrbit}
                </span>
                <span className="text-[11px] sm:text-xs 2xl:text-base font-bold text-blue-600/80 dark:text-sky-400">天</span>
              </div>
            </div>
          </div>

          {/* 卡片 2：发现异常多少个 */}
          <div className="p-2 sm:p-2.5 2xl:p-3 rounded-xl border border-rose-200/60 dark:border-rose-500/30 bg-gradient-to-br from-rose-50/80 via-white to-pink-50/40 dark:from-[#121829] dark:via-[#22161c] dark:to-[#1a0f14] shadow-xs flex items-center justify-between gap-2 min-w-[100px] h-auto overflow-hidden">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] 2xl:text-base font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                发现异常
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 sm:mt-1">
                <span className="text-base sm:text-lg 2xl:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {anomalyCountByClass.all}
                </span>
                <span className="text-[11px] sm:text-xs 2xl:text-base font-bold text-rose-600/80 dark:text-rose-400">个</span>
              </div>
            </div>
          </div>

          {/* 卡片 3：自动处置多少个 */}
          <div className="p-2 sm:p-2.5 2xl:p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 dark:from-[#121829] dark:via-[#13221b] dark:to-[#0d1a14] shadow-xs flex items-center justify-between gap-2 min-w-[100px] h-auto overflow-hidden">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] 2xl:text-base font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                自动处置
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 sm:mt-1">
                <span className="text-base sm:text-lg 2xl:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {overview.resolvedAnomalies}
                </span>
                <span className="text-[11px] sm:text-xs 2xl:text-base font-bold text-emerald-600/80 dark:text-emerald-400">个</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2.2 异常详情列表：分类 Tab 栏 */}
        <div className="pt-1.5 border-t border-blue-100/60 dark:border-white/[0.06] space-y-1.5">
          <div className="shrink-0 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                异常详情列表
              </span>
              <span className="text-[11px] text-slate-400">
                共 <span className="font-mono font-bold text-blue-600 dark:text-sky-400">
                  {activeAnomalyTab === 'I' ? class1Anomalies.length : activeAnomalyTab === 'II' ? class2Anomalies.length : class3Anomalies.length}
                </span> 条数据
              </span>
            </div>

            {/* I类 / II类 / III类 下方短线滑块标签形式 */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveAnomalyTab('I')}
                className={`relative pb-1.5 text-[10px] sm:text-xs font-bold transition-colors cursor-pointer flex flex-col items-center ${
                  activeAnomalyTab === 'I'
                    ? 'text-blue-600 dark:text-sky-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>I类异常</span>
                {activeAnomalyTab === 'I' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-sky-400 animate-fadeIn" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveAnomalyTab('II')}
                className={`relative pb-1.5 text-[10px] sm:text-xs font-bold transition-colors cursor-pointer flex flex-col items-center ${
                  activeAnomalyTab === 'II'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>II类异常</span>
                {activeAnomalyTab === 'II' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-amber-600 dark:bg-amber-400 animate-fadeIn" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveAnomalyTab('III')}
                className={`relative pb-1.5 text-[10px] sm:text-xs font-bold transition-colors cursor-pointer flex flex-col items-center ${
                  activeAnomalyTab === 'III'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>III类异常</span>
                {activeAnomalyTab === 'III' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-fadeIn" />
                )}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c101c]/90 overflow-hidden shadow-2xs flex flex-col">

        {/* 异常列表：发现时间、异常类型、遥测代号、异常详情、处理状态 */}
        {activeAnomalyTab === 'I' && (
          <>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[580px]">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] text-xs 2xl:text-sm font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap">发现时间</th>
                  <th className="py-2 px-3 whitespace-nowrap">异常类型</th>
                  <th className="py-2 px-3 whitespace-nowrap">遥测代号</th>
                  <th className="py-2 px-3 whitespace-nowrap">异常详情</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">处理状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs 2xl:text-sm">
                {class1PagedAnomalies.length > 0 ? (
                  <>
                    {class1PagedAnomalies.map((anom) => (
                      <tr
                        key={anom.id}
                        className="h-9 2xl:h-11 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors whitespace-nowrap"
                      >
                        <td className="py-1.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap leading-tight">
                          <div>{anom.discoveryTime.split(' ')[0]}</div>
                          <div>{anom.discoveryTime.split(' ')[1]}</div>
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                          <span className="truncate" title={anom.anomalyType}>{anom.anomalyType}</span>
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-blue-600 dark:text-sky-400 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50/80 dark:bg-sky-950/50 border border-blue-200/60 dark:border-sky-500/30">
                            {anom.telemetryCode}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300 font-medium overflow-hidden">
                          <span className="block truncate max-w-[200px]" title={anom.detailSummary}>{anom.detailSummary}</span>
                        </td>
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedClass1Anomaly(anom)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>已处置</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* 固定 3 行占位 */}
                    {Array.from({ length: Math.max(0, class1PageSize - class1PagedAnomalies.length) }).map((_, idx) => (
                      <tr key={`class1-empty-${idx}`} className="h-9 2xl:h-11 select-none pointer-events-none">
                        <td colSpan={5} className="py-1.5 px-3">&nbsp;</td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr className="h-28 2xl:h-34">
                    <td colSpan={5} className="py-4 text-center text-slate-400 text-xs 2xl:text-sm whitespace-nowrap">
                      当前暂无 I 类异常记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 pb-1">
            <PaginationBar
              page={class1Page}
              totalPages={class1TotalPages}
              totalCount={class1Anomalies.length}
              onChange={setClass1Page}
              pageSize={class1PageSize}
              onPageSizeChange={(size) => { setClass1PageSize(size); setClass1Page(1); }}
            />
          </div>
          </>
        )}

        {activeAnomalyTab === 'II' && (
          <>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[580px]">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] text-xs 2xl:text-sm font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap">发现时间</th>
                  <th className="py-2 px-3 whitespace-nowrap">异常类型</th>
                  <th className="py-2 px-3 whitespace-nowrap">遥测代号</th>
                  <th className="py-2 px-3 whitespace-nowrap">异常详情</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={toggleClass2Sort}
                      title="点击切换排序：待复核→已复核→已处置(升序) / 已处置→已复核→待复核(降序)"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer group select-none"
                    >
                      <span>处理状态</span>
                      {class2SortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 stroke-[2.5]" />
                      ) : class2SortOrder === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 stroke-[2.5]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs 2xl:text-sm">
                {class2PagedAnomalies.length > 0 ? (
                  <>
                    {class2PagedAnomalies.map((anom) => (
                      <tr
                        key={anom.id}
                        className="h-9 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors whitespace-nowrap"
                      >
                        <td className="py-1.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap leading-tight">
                          <div>{anom.discoveryTime.split(' ')[0]}</div>
                          <div>{anom.discoveryTime.split(' ')[1]}</div>
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                          <span className="truncate" title={anom.anomalyType}>{anom.anomalyType}</span>
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-500/30">
                            {anom.telemetryCode}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300 font-medium overflow-hidden">
                          <span className="block truncate max-w-[200px]" title={anom.detailSummary}>{anom.detailSummary}</span>
                        </td>
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          {(() => {
                            const status = class2StatusMap[anom.id];
                            if (status === 'resolved') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenClass2Modal(anom)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>已处置</span>
                                </button>
                              );
                            }
                            if (status === 'reviewed') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenClass2Modal(anom)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30 hover:bg-sky-100 cursor-pointer transition-colors shadow-2xs"
                                >
                                  <Terminal className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                  <span>已复核</span>
                                </button>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenClass2Modal(anom)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 hover:bg-amber-100 cursor-pointer transition-colors shadow-2xs"
                              >
                                <Terminal className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>待复核</span>
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                    {/* 固定 3 行占位 */}
                    {Array.from({ length: Math.max(0, class2PageSize - class2PagedAnomalies.length) }).map((_, idx) => (
                      <tr key={`class2-empty-${idx}`} className="h-9 2xl:h-11 select-none pointer-events-none">
                        <td colSpan={5} className="py-1.5 px-3">&nbsp;</td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr className="h-28 2xl:h-34">
                    <td colSpan={5} className="py-4 text-center text-slate-400 text-xs whitespace-nowrap">
                      当前暂无 II 类异常记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 pb-1">
            <PaginationBar
              page={class2Page}
              totalPages={class2TotalPages}
              totalCount={class2Anomalies.length}
              onChange={setClass2Page}
              pageSize={class2PageSize}
              onPageSizeChange={(size) => { setClass2PageSize(size); setClass2Page(1); }}
            />
          </div>
          </>
        )}

        {activeAnomalyTab === 'III' && (
          <>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[580px]">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] text-xs 2xl:text-sm font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap">发现时间</th>
                  <th className="py-2 px-3 whitespace-nowrap">异常类型</th>
                  <th className="py-2 px-3 whitespace-nowrap">遥测代号</th>
                  <th className="py-2 px-3 whitespace-nowrap">异常详情</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={toggleClass3Sort}
                      title="点击切换排序：待处理→已提交→已处置(升序) / 已处置→已提交→待处理(降序)"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer group select-none"
                    >
                      <span>处理状态</span>
                      {class3SortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 stroke-[2.5]" />
                      ) : class3SortOrder === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 stroke-[2.5]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs 2xl:text-sm">
                {class3PagedAnomalies.length > 0 ? (
                  <>
                    {class3PagedAnomalies.map((anom) => (
                      <tr
                        key={anom.id}
                        className="h-9 2xl:h-11 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors whitespace-nowrap"
                      >
                        <td className="py-1.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap leading-tight">
                          <div>{anom.discoveryTime.split(' ')[0]}</div>
                          <div>{anom.discoveryTime.split(' ')[1]}</div>
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                          <span className="truncate" title={anom.anomalyType}>{anom.anomalyType}</span>
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-500/30">
                            {anom.telemetryCode}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300 font-medium overflow-hidden">
                          <span className="block truncate max-w-[200px]" title={anom.detailSummary}>{anom.detailSummary}</span>
                        </td>
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          {(() => {
                            const status = class3StatusMap[anom.id];
                            if (status === 'resolved') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenClass3Modal(anom)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>已处置</span>
                                </button>
                              );
                            }
                            if (status === 'submitted') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenClass3Modal(anom)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30 hover:bg-sky-100 cursor-pointer transition-colors shadow-2xs"
                                >
                                  <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                  <span>已提交</span>
                                </button>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenClass3Modal(anom)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 hover:bg-rose-100 cursor-pointer transition-colors shadow-2xs"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                <span>待处理</span>
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                    {/* 固定 3 行占位 */}
                    {Array.from({ length: Math.max(0, class3PageSize - class3PagedAnomalies.length) }).map((_, idx) => (
                      <tr key={`class3-empty-${idx}`} className="h-9 2xl:h-11 select-none pointer-events-none">
                        <td colSpan={5} className="py-1.5 px-3">&nbsp;</td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr className="h-28 2xl:h-34">
                    <td colSpan={5} className="py-4 text-center text-slate-400 text-xs whitespace-nowrap">
                      当前暂无 III 类异常记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 pb-1">
            <PaginationBar
              page={class3Page}
              totalPages={class3TotalPages}
              totalCount={class3Anomalies.length}
              onChange={setClass3Page}
              pageSize={class3PageSize}
              onPageSizeChange={(size) => { setClass3PageSize(size); setClass3Page(1); }}
            />
          </div>
          </>
        )}
      </div>
      </div>
      </div>

      {/* 弹窗 1：I 类问题 点击【已处置】查看处置记录 */}
      {selectedClass1Anomaly && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn select-none"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c101c] shadow-2xl p-6 space-y-4 text-left font-sans"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">
                    异常处置记录
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass1Anomaly(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-1 font-sans">
              {/* 表单化结构（只读禁用模式），统一规范字体 font-sans，Label 与 Content 分开呈现 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. 分系统 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                    分系统
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedClass1Anomaly.systemName}
                    className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default select-text outline-none"
                  />
                </div>

                {/* 2. 异常 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                    异常
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedClass1Anomaly.anomalyType}
                    className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default select-text outline-none"
                  />
                </div>
              </div>

              {/* 3. 现象 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  现象
                </label>
                <textarea
                  readOnly
                  disabled
                  rows={2}
                  value={selectedClass1Anomaly.symptom || selectedClass1Anomaly.detailSummary}
                  className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default resize-none select-text outline-none leading-relaxed"
                />
              </div>

              {/* 4. 处置措施 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  处置措施
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={selectedClass1Anomaly.actionMeasure || selectedClass1Anomaly.actionRecord?.actionPlan || '发出下电指令'}
                  className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default select-text outline-none"
                />
              </div>

              {/* 5. 遥控指令 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  遥控指令
                </label>
                <textarea
                  readOnly
                  disabled
                  rows={2}
                  value={selectedClass1Anomaly.telecommandHex || '20 E9 10 14 00 11 92 C0 00 00 07 50 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA'}
                  className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default resize-none select-all outline-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 弹窗 2：II 类问题 点击【待复核/待确认】查看待复核记录 */}
      {selectedClass2Anomaly && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn select-none"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c101c] shadow-2xl p-6 space-y-4 text-left font-sans"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">
                    待复核记录
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass2Anomaly(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-1 font-sans">
              {/* 表单化结构：分系统、异常、现象只读；处置措施、遥控指令可编辑 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. 分系统 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                    分系统
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedClass2Anomaly.systemName}
                    className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default select-text outline-none"
                  />
                </div>

                {/* 2. 异常 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                    异常
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedClass2Anomaly.anomalyType}
                    className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default select-text outline-none"
                  />
                </div>
              </div>

              {/* 3. 现象 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  现象
                </label>
                <textarea
                  readOnly
                  disabled
                  rows={2}
                  value={selectedClass2Anomaly.symptom || selectedClass2Anomaly.detailSummary}
                  className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default resize-none select-text outline-none leading-relaxed"
                />
              </div>

              {/* 4. 处置措施 (可编辑) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  处置措施
                </label>
                <textarea
                  rows={3}
                  value={editableActionMeasure}
                  onChange={(e) => setEditableActionMeasure(e.target.value)}
                  placeholder="请输入处置措施"
                  className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-white dark:bg-[#111728] border border-slate-300 dark:border-white/[0.15] text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-blue-500/20 outline-none leading-relaxed transition-all"
                />
              </div>

              {/* 5. 遥控指令 (可编辑) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  遥控指令
                </label>
                <textarea
                  rows={3}
                  value={editableTelecommandHex}
                  onChange={(e) => setEditableTelecommandHex(e.target.value)}
                  placeholder="请输入遥控指令 Hex 码流"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-white dark:bg-[#111728] border border-slate-300 dark:border-white/[0.15] text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-blue-500/20 outline-none leading-relaxed transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setSelectedClass2Anomaly(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmClass2}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 text-sm font-bold transition-all shadow-sm cursor-pointer"
              >
                提交
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 弹窗 3：III 类问题 点击【待处理】查看待处理记录 */}
      {selectedClass3Anomaly && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn select-none"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c101c] shadow-2xl p-6 text-left font-sans"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">
                    待处理记录
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass3Anomaly(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 py-3 font-sans pr-1">
              {/* 表单化结构：分系统、异常、现象、处置建议(分析报告)、遥控指令(必填)、附件上传(可选) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. 分系统 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                    分系统
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedClass3Anomaly.systemName}
                    className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default select-text outline-none"
                  />
                </div>

                {/* 2. 异常 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                    异常
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedClass3Anomaly.anomalyType}
                    className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default select-text outline-none"
                  />
                </div>
              </div>

              {/* 3. 现象 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  现象
                </label>
                <textarea
                  readOnly
                  disabled
                  rows={2}
                  value={selectedClass3Anomaly.symptom || selectedClass3Anomaly.detailSummary}
                  className="w-full px-3.5 py-2 text-sm font-sans rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 cursor-default resize-none select-text outline-none leading-relaxed"
                />
              </div>

              {/* 4. 处置建议 (分析报告) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  处置建议
                </label>
                <div className="rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] overflow-hidden text-xs sm:text-sm select-text shadow-2xs">
                  {/* 报告标题横条 */}
                  <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-white/[0.04] border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {selectedClass3Anomaly.reportData?.reportTitle || '【高风险】804激光通信状态评估报告'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* 评估发现 */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                        <span>评估发现</span>
                      </div>
                      <div className="space-y-2 pl-2">
                        {(selectedClass3Anomaly.reportData?.findings || [
                          '至少一路接收光通道异常：发送处理机路由自测试模式使能遥控指令，排查故障原因；若10G光口故障，则用处理机内部生成的固定帧数据进行激光通信性能测试',
                          '接收光功率低warning：重启',
                          '接收光功率低Alarm：重启',
                          '通道接收端信号丢失告警（RX_LOS）：补发太阳翼展开指令，观察是否显示为展开',
                          '跟瞄软件故障码：方位超软限位、俯仰超软限位、方位电机超速、俯仰电机超速、空指针、方位电机堵转、俯仰电机堵转：重启',
                          '路由传输数据类型状态遥测：业务数据传输状态、对地传输数据传输状态、LVDS图像数据传输状态：方案一：ssh登录路由器，然后去手动清理磁盘空间；方案二：采用ONIE上重装操作系统（Sonic上安装无法清理磁盘空间）'
                        ]).map((finding, idx) => {
                          const splitIdx = finding.indexOf('：');
                          const title = splitIdx !== -1 ? finding.slice(0, splitIdx) : '';
                          const content = splitIdx !== -1 ? finding.slice(splitIdx + 1) : finding;

                          return (
                            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/90 dark:bg-[#0c101c]/60 border border-slate-200/70 dark:border-white/[0.05] text-xs leading-relaxed">
                              <span className="text-slate-400 dark:text-slate-500 font-mono select-none mt-0.5">•</span>
                              <div className="text-slate-700 dark:text-slate-300">
                                {title && <span className="font-semibold text-slate-900 dark:text-slate-100">{title}：</span>}
                                <span>{content}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 行动建议 */}
                    <div className="space-y-2.5 pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                        <span>行动建议</span>
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {(selectedClass3Anomaly.reportData?.actionSuggestions || [
                          '[高优先级] 排查并修复至少一路接收光通道异常',
                          '[高优先级] 处理接收光功率低告警',
                          '[高优先级] 处理通道接收端信号丢失告警',
                          '[高优先级] 重启跟瞄软件故障码',
                          '[高优先级] 执行路由器数据清理或系统重装方案'
                        ]).map((sug, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/90 dark:bg-[#0c101c]/60 border border-slate-200/70 dark:border-white/[0.05] text-xs font-sans text-slate-700 dark:text-slate-300">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                              高优先级
                            </span>
                            <span>{sug.replace(/^\[高优先级\]\s*/, '')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. 遥控指令 (可编辑，必填) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  遥控指令 <span className="text-rose-500 font-normal">* (必填)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={editableTelecommandHex3}
                  onChange={(e) => setEditableTelecommandHex3(e.target.value)}
                  placeholder="请输入遥控指令 Hex 码流（必填）"
                  className={`w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-white dark:bg-[#111728] border ${!editableTelecommandHex3.trim() ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-white/[0.15]'} text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-blue-500/20 outline-none leading-relaxed transition-all`}
                />
              </div>

              {/* 6. 附件上传 (可选) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                  附件上传 <span className="text-slate-400 font-normal">(可选)</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef3}
                  onChange={handleFileChange3}
                  multiple
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef3.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>选择文件上传</span>
                  </button>

                  {attachedFiles3.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200"
                    >
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile3(idx)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] shrink-0">
              <button
                type="button"
                onClick={() => setSelectedClass3Anomaly(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmClass3}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 text-sm font-bold transition-all shadow-sm cursor-pointer"
              >
                提交
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
