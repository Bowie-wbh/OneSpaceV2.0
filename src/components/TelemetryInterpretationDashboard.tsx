import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown,
  Layers,
  Clock,
  Filter
} from 'lucide-react';
import { 
  getTelemetryDataForSatellite, 
  TelemetryChannelGroup 
} from '../data/telemetryAndHealthData';

interface TelemetryInterpretationDashboardProps {
  satelliteId?: string;
  satelliteName?: string;
  satelliteCode?: string;
}

export const TelemetryInterpretationDashboard: React.FC<TelemetryInterpretationDashboardProps> = ({
  satelliteId = 'yj-mx01',
  satelliteName = '云尖沐曦号',
  satelliteCode = 'SCS-04-15',
}) => {
  // 1. 系统筛选下拉：全部系统 / 各分系统
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  // 2. 时间筛选下拉：2026-9-3 18:30 / 2026-8-6 18:30 / 2026-8-1 18:30 / 最近24小时 / 最近7天
  const [timeFilter, setTimeFilter] = useState<string>('latest');
  // 3. 标签筛选：是否正常（全部 / 正常 / 不正常）
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'abnormal'>('all');

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const d = new Date();
      setLastRefreshTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`);
      setIsRefreshing(false);
    }, 300);
  };

  // 根据当前卫星与时间筛选动态加载遥测分组数据
  const rawGroups = useMemo(() => {
    return getTelemetryDataForSatellite(satelliteId, timeFilter);
  }, [satelliteId, timeFilter, lastRefreshTime]);

  // 全量扁平数据统计
  const allItems = useMemo(() => rawGroups.flatMap(g => g.items), [rawGroups]);
  const stats = useMemo(() => {
    const total = allItems.length;
    const abnormal = allItems.filter(i => !i.isNormal).length;
    const normal = total - abnormal;
    return { total, normal, abnormal };
  }, [allItems]);

  // 按系统与状态过滤
  const filteredGroups = useMemo(() => {
    return rawGroups.map((group) => {
      if (selectedSystem !== 'all' && group.key !== selectedSystem) {
        return null;
      }

      const items = group.items.filter((item) => {
        if (statusFilter === 'normal') return item.isNormal;
        if (statusFilter === 'abnormal') return !item.isNormal;
        return true;
      });

      if (items.length === 0 && statusFilter !== 'all') return null;

      return {
        ...group,
        items
      };
    }).filter(Boolean) as TelemetryChannelGroup[];
  }, [rawGroups, selectedSystem, statusFilter]);

  return (
    <div className="w-full flex flex-col select-none space-y-3 pb-6">
      {/* 第一行：左侧下拉筛选（系统、时间） + 右侧标签筛选 */}
      <div className="shrink-0 flex items-center justify-between gap-3 bg-slate-50/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-xl p-3 shadow-2xs min-w-[580px]">
        {/* 第一行左侧：下拉筛选（系统、时间） */}
        <div className="flex items-center gap-3 shrink-0">
          {/* 系统下拉筛选 */}
          <div className="flex items-center gap-2">

            <div className="relative inline-block">
              <select
                id="select-telemetry-system"
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-white/[0.12] text-slate-800 dark:text-slate-200 outline-none hover:border-blue-400 dark:hover:border-sky-400 focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer shadow-2xs transition-colors"
              >
                <option value="all">全部系统</option>
                <option value="EPSA1">A-BUS 电源主</option>
                <option value="EPSA2">A-BUS 电源备</option>
                <option value="EPSB1">B-BUS 电源主</option>
                <option value="EPSB2">B-BUS 电源备</option>
                <option value="OBC">星务计算机</option>
                <option value="ADCS">姿控快包</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 时间下拉筛选 */}
          <div className="flex items-center gap-2">

            <div className="relative inline-block">
              <select
                id="select-telemetry-time"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-white/[0.12] text-slate-800 dark:text-slate-200 outline-none hover:border-blue-400 dark:hover:border-sky-400 focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer shadow-2xs transition-colors"
              >
                <option value="latest">实时数据</option>
                <option value="10m">2026-9-3 18:03</option>
                <option value="1h">2026-9-3 14:03</option>
                <option value="24h">2026-9-3 12:03</option>
                <option value="7d">2026-9-3 10:30</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* 第一行右侧：标签筛选（是否正常） */}
        <div className="flex items-center gap-2 shrink-0">


          {/* 筛选标签区 */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0c101c] p-1 rounded-lg border border-slate-200 dark:border-white/[0.1]">
            {/* 全部 */}
            <button
              type="button"
              id="tag-filter-all"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-bold inline-flex items-center justify-center leading-none transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              <span className="leading-none flex items-center justify-center">全部 ({stats.total})</span>
            </button>

            {/* 正常 (绿色，无闪烁) */}
            <button
              type="button"
              id="tag-filter-normal"
              onClick={() => setStatusFilter('normal')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 leading-none transition-all cursor-pointer ${
                statusFilter === 'normal'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'normal' ? 'bg-white' : 'bg-emerald-500'}`} />
              <span className="leading-none flex items-center justify-center">正常 ({stats.normal})</span>
            </button>

            {/* 不正常 (红色，无闪烁) */}
            <button
              type="button"
              id="tag-filter-abnormal"
              onClick={() => setStatusFilter('abnormal')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 leading-none transition-all cursor-pointer ${
                statusFilter === 'abnormal'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'abnormal' ? 'bg-white' : 'bg-rose-500'}`} />
              <span className="leading-none flex items-center justify-center">不正常 ({stats.abnormal})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 下方依次平铺：
          1. A-BUS 电源主通道（EPSA1）
          2. A-BUS 电源备份通道（EPSA2）
          3. B-BUS 电源主通道（EPSB1）
          4. B-BUS 电源备份通道（EPSB2）
          5. 星务计算机（OBC）
          6. 姿控快包（ADCS）
      */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const hasAbnormal = group.items.some((i) => !i.isNormal);
            const abnormalCount = group.items.filter((i) => !i.isNormal).length;

            return (
              <div
                key={group.key}
                id={`telemetry-group-${group.key}`}
                className="rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0c101c]/95 shadow-2xs overflow-hidden"
              >
                {/* 监测表单标题栏 */}
                <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* 状态静态指示灯：正常绿色、不正常红色，无闪烁 */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        hasAbnormal ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      {group.title}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 font-medium">
                      共 <span className="font-mono">{group.items.length}</span> 项
                    </span>
                  </div>
                </div>

                {/* 监测表单表格：固定列宽实现所有分组表单列严格对齐 */}
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse font-sans table-fixed min-w-[980px]">
                    <colgroup>
                      <col style={{ width: '70px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '330px' }} />
                      <col style={{ width: '180px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '110px' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <th className="py-2.5 px-4 text-center whitespace-nowrap">序号</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">参数代号</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">参数名称</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">判读依据</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">实时遥测值</th>
                        <th className="py-2.5 px-4 text-center whitespace-nowrap">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs sm:text-sm font-sans">
                      {group.items.map((item) => (
                        <tr
                          key={item.code}
                          className={`transition-colors ${
                            !item.isNormal
                              ? 'bg-rose-50/60 hover:bg-rose-50/90 dark:bg-rose-950/20 dark:hover:bg-rose-950/35 border-l-4 border-l-rose-500'
                              : 'hover:bg-slate-50/70 dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* 序号 */}
                          <td className="py-2.5 px-4 text-center font-mono text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {item.id}
                          </td>

                          {/* 参数代号 */}
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08]">
                              {item.code}
                            </span>
                          </td>

                          {/* 参数名称 */}
                          <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200 truncate whitespace-nowrap">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate" title={item.name}>{item.name}</span>
                            </div>
                          </td>

                          {/* 判读依据 */}
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            <span>{item.basis || '--'}</span>
                          </td>

                          {/* 实时遥测值 */}
                          <td className="py-2.5 px-4 font-mono font-bold whitespace-nowrap">
                            <span
                              className={
                                !item.isNormal
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }
                            >
                              {item.value}
                            </span>
                          </td>

                          {/* 状态 */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            {item.isNormal ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>正常</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>异常</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c101c] p-12 text-center text-slate-400 text-sm sm:text-base">
            未检索到符合筛选条件的遥测参数
          </div>
        )}
      </div>
    </div>
  );
};
