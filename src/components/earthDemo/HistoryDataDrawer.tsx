import React, { useState, useMemo } from 'react';
import { DataTypeCategory, HistoryRecord } from '../../types/earthDemoTypes';
import { CATEGORIES_DATA, MOCK_HISTORY_RECORDS } from '../../data/mockRemoteSensingData';
import { 
  X, 
  Search, 
  Filter, 
  Layers, 
  Calendar, 
  Clock, 
  FileText, 
  ExternalLink, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Eye, 
  Download,
  Sparkles,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';

interface HistoryDataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCategory: DataTypeCategory;
  onSelectCategory: (category: DataTypeCategory) => void;
  onSelectRecord: (record: HistoryRecord) => void;
  onOverlayFootprint: (record: HistoryRecord) => void;
  activeFootprintRecordId?: string | null;
}

export const HistoryDataDrawer: React.FC<HistoryDataDrawerProps> = ({
  isOpen,
  onClose,
  currentCategory,
  onSelectCategory,
  onSelectRecord,
  onOverlayFootprint,
  activeFootprintRecordId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning'>('all');
  const [sortAsc, setSortAsc] = useState(false);

  const categoryInfo = CATEGORIES_DATA[currentCategory];

  // 过滤当类下的历史数据
  const filteredRecords = useMemo(() => {
    return MOCK_HISTORY_RECORDS.filter(record => {
      if (record.categoryId !== currentCategory) return false;
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = record.title.toLowerCase().includes(query);
        const matchesSensor = record.sensor.toLowerCase().includes(query);
        const matchesDate = record.date.includes(query);
        const matchesSummary = record.summary.toLowerCase().includes(query);
        return matchesTitle || matchesSensor || matchesDate || matchesSummary;
      }
      return true;
    }).sort((a, b) => {
      const timeA = new Date(`${a.date} ${a.time.split(' ')[0]}`).getTime();
      const timeB = new Date(`${b.date} ${b.time.split(' ')[0]}`).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [currentCategory, searchQuery, statusFilter, sortAsc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm sm:max-w-md lg:max-w-lg 2xl:max-w-xl bg-slate-900/95 text-white shadow-2xl border-l border-slate-800 backdrop-blur-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      
      {/* 1. 顶部 Header 区域 */}
      <div className="p-3 sm:p-4 2xl:p-5 border-b border-slate-800 flex flex-col gap-2.5 sm:gap-3 flex-shrink-0 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: categoryInfo.color }}
            >
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {categoryInfo.name} · 历史数据档案
                </h2>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                  {filteredRecords.length} 景记录
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                凤凰古城时序监测库 · {categoryInfo.englishName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="关闭侧边抽屉"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 5大分类快速切换 Tab */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {(Object.keys(CATEGORIES_DATA) as DataTypeCategory[]).map((catKey) => {
            const cat = CATEGORIES_DATA[catKey];
            const isActive = currentCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => onSelectCategory(catKey)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 sm:gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{cat.shortName}</span>
                <span className="text-[9px] sm:text-[10px] opacity-75">({cat.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 搜索与筛选工具栏 */}
      <div className="px-3 sm:px-4 2xl:px-5 py-2.5 sm:py-3 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-2.5 sm:gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索卫星传感器、观测日期、成果编号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 sm:pl-9 pr-3 py-1 sm:py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center gap-1.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950/60 border border-slate-800 text-[11px] sm:text-xs text-slate-300 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="all">全部状态</option>
            <option value="normal">优 / 正常</option>
            <option value="warning">警示 / 关注</option>
          </select>

          {/* 时间排序 */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-1 sm:p-1.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1"
            title={sortAsc ? '切换为最新优先' : '切换为最早优先'}
          >
            <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. 历史数据记录列表卡片 */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 2xl:p-5 flex flex-col gap-3 sm:gap-4">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
            <Layers className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mb-2 sm:mb-3" />
            <p className="text-xs sm:text-sm font-medium">暂无符合筛选条件的历史观测数据</p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">请尝试清除关键词或切换分类筛选</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const isFootprintActive = activeFootprintRecordId === record.id;

            return (
              <div
                key={record.id}
                id={`record-card-${record.id}`}
                className={`group rounded-xl sm:rounded-2xl border p-3 sm:p-4 transition-all duration-200 bg-slate-950/50 hover:bg-slate-900/80 ${
                  isFootprintActive
                    ? 'border-sky-400 ring-2 ring-sky-500/25 shadow-lg shadow-sky-500/10'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* 顶部标签行：ID、观测时间、传感器平台 */}
                <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-[10px] sm:text-[11px] font-mono font-medium px-1.5 sm:px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700/60">
                      {record.id}
                    </span>
                    <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {record.platformType}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                      {record.dataLevel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        record.status === 'normal'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {record.status === 'normal' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>{record.statusLabel}</span>
                    </span>
                  </div>
                </div>

                {/* 标题 */}
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition-colors mb-1 sm:mb-1.5">
                  {record.title}
                </h3>

                {/* 传感器与时间信息 */}
                <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-400 mb-2 sm:mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {record.date} {record.time}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="text-slate-500">载荷:</span> {record.sensor}
                  </span>
                </div>

                {/* 简短解译综述 */}
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mb-2.5 sm:mb-3 bg-slate-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-800/60">
                  {record.summary}
                </p>

                {/* 核心指标参数小网格 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-2.5 sm:mb-3.5">
                  {record.keyMetrics.map((metric, mIdx) => (
                    <div key={mIdx} className="bg-slate-900/90 rounded-lg p-1.5 sm:p-2 border border-slate-800/60">
                      <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">{metric.label}</span>
                      <span className={`text-[11px] sm:text-xs font-semibold block truncate ${metric.status === 'warn' ? 'text-amber-400' : 'text-slate-200'}`}>
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 操作操作按钮条 */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 flex-wrap">
                  
                  {/* 叠置在三维地球上 */}
                  <button
                    onClick={() => onOverlayFootprint(record)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isFootprintActive
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                    }`}
                    title="在Cesium三维地球上叠置此期遥感影像的空间观测脚印覆盖区"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{isFootprintActive ? '已在地球叠置' : '三维地球叠置'}</span>
                  </button>

                  {/* 查看详情与曲线分析 */}
                  <button
                    onClick={() => onSelectRecord(record)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-xl text-xs font-medium transition-all ml-auto"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>详情与趋势曲线</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 4. 底部状态与操作说明栏 */}
      <div className="p-3.5 px-5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>点击“三维地球叠置”可即时在古城上方高亮该期影像投影区。</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          Total: {filteredRecords.length} Items
        </span>
      </div>

    </div>
  );
};
