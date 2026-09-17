import React, { useMemo } from 'react';
import { 
  X, 
  Satellite as SatelliteIcon, 
  Clock, 
  Radio,
  MapPin
} from 'lucide-react';
import { Satellite } from '../types';

interface SatelliteSplitPanelProps {
  satellites: Satellite[];
  selectedSatelliteId?: string;
  onSelectSatellite?: (sat: Satellite) => void;
  onToggleSatelliteStatus?: (id: string) => void;
  onClose: () => void;
  width: number;
}

export const SatelliteSplitPanel: React.FC<SatelliteSplitPanelProps> = ({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
  onClose,
  width,
}) => {
  // 格式化倒计时时间 mm:ss 或 hh:mm:ss
  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // 解析窗口期计算入境、出境时间与过境时长
  const parseWindowTimes = (sat: Satellite) => {
    let entry = '14:25:30';
    let exit = '14:32:15';
    let duration = '6分45秒';

    if (sat.imagingWindow && sat.imagingWindow.includes('-')) {
      const parts = sat.imagingWindow.split('-').map((s) => s.trim());
      if (parts.length >= 2) {
        entry = parts[0];
        exit = parts[1];

        // 计算时差
        const parseSec = (t: string) => {
          const segs = t.split(':').map(Number);
          if (segs.length === 3) return segs[0] * 3600 + segs[1] * 60 + segs[2];
          if (segs.length === 2) return segs[0] * 60 + segs[1];
          return 0;
        };
        const diffSec = Math.max(0, parseSec(exit) - parseSec(entry));
        if (diffSec > 0) {
          const m = Math.floor(diffSec / 60);
          const s = diffSec % 60;
          duration = m > 0 ? `${m}分${s > 0 ? `${s}秒` : ''}` : `${s}秒`;
        }
      }
    }
    return {
      entry,
      exit,
      duration,
    };
  };

  // 分组数据：已入境卫星在上一组、待入境（已出境）卫星在下一组
  const inboundList = useMemo(() => {
    return satellites
      .filter((s) => s.status === 'in-bound')
      .sort((a, b) => a.countdownSeconds - b.countdownSeconds);
  }, [satellites]);

  const upcomingList = useMemo(() => {
    return satellites
      .filter((s) => s.status === 'upcoming')
      .sort((a, b) => a.countdownSeconds - b.countdownSeconds);
  }, [satellites]);

  return (
    <aside
      id="satellite-split-panel"
      style={{ width: `${width}px` }}
      className="shrink-0 flex flex-col h-full bg-white/80 dark:bg-[#090d19]/80 border border-slate-200/80 dark:border-white/[0.1] rounded-2xl shadow-xl shadow-slate-900/8 dark:shadow-black/50 backdrop-blur-2xl transition-[width] duration-75 relative z-20 overflow-hidden select-none"
    >
      {/* 顶部标题栏 */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-100/90 dark:border-white/[0.06] bg-white/40 dark:bg-white/[0.02] backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50/90 dark:bg-sky-950/70 border border-blue-200/60 dark:border-sky-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400 shrink-0 shadow-2xs">
            <SatelliteIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              卫星列表
            </h2>
          </div>
        </div>

        <button
          id="btn-close-satellite-panel"
          onClick={onClose}
          title="收起悬浮面板"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 卫星列表主体（严格两组区分，只读呈现：卫星名称、出入境状态、出入境倒计时） */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 custom-scrollbar">
        {/* ================= 第一组：已入境卫星（上一组） ================= */}
        <div className="space-y-2">
          {/* 已入境分组标题栏 */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>已入境卫星</span>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/25">
              {inboundList.length} 颗在境
            </span>
          </div>

          {/* 已入境卫星列表 */}
          {inboundList.length > 0 ? (
            <div className="space-y-2">
              {inboundList.map((sat) => {
                const times = parseWindowTimes(sat);
                return (
                  <div
                    key={sat.id}
                    id={`split-sat-${sat.id}`}
                    className="rounded-xl p-3 bg-gradient-to-br from-emerald-50/60 via-white/80 to-white/70 dark:from-emerald-950/25 dark:via-[#0e1526]/80 dark:to-[#0e1526]/70 border border-emerald-300/70 dark:border-emerald-500/30 shadow-xs space-y-2"
                  >
                    {/* 第一行：卫星名称 + 出入境状态 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse shadow-xs shadow-emerald-500/50" />
                        <div className="truncate flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {sat.name}
                          </span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">
                            {sat.code}
                          </span>
                        </div>
                      </div>

                      {/* 出入境状态：已入境 */}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-500/40 shrink-0">
                        已入境
                      </span>
                    </div>

                    {/* 模块一：地面站测控与过境时段卡片 */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-500/25 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                            地面站：<span className="font-bold text-slate-900 dark:text-white">{sat.groundStation}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px]">距离出境</span>
                          <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCountdown(sat.countdownSeconds)}
                          </span>
                        </div>
                      </div>

                      {/* 过境时段：入境 / 出境 / 时长 三字段 */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                        <div className="flex flex-col bg-white/80 dark:bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-300/60 dark:border-emerald-500/25 min-w-0 shadow-2xs">
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] truncate">入境</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                            {times.entry}
                          </span>
                        </div>
                        <div className="flex flex-col bg-white/80 dark:bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-300/60 dark:border-emerald-500/25 min-w-0 shadow-2xs">
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] truncate">出境</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                            {times.exit}
                          </span>
                        </div>
                        <div className="flex flex-col bg-white/80 dark:bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-300/60 dark:border-emerald-500/25 min-w-0 shadow-2xs">
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] truncate">时长</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                            {times.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 模块二：空间遥测（轨道高度、经度、纬度放一行，下方星下点） */}
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-emerald-200/60 dark:border-white/[0.06] space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <div className="flex flex-col bg-slate-50/90 dark:bg-white/[0.03] px-2 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.04] min-w-0">
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate">高度</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 truncate">
                            {sat.altitude.toFixed(3)}km
                          </span>
                        </div>
                        <div className="flex flex-col bg-slate-50/90 dark:bg-white/[0.03] px-2 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.04] min-w-0">
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate">经度</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {sat.subSatellitePoint ? `${sat.subSatellitePoint.lng.toFixed(6)}°` : '--'}
                          </span>
                        </div>
                        <div className="flex flex-col bg-slate-50/90 dark:bg-white/[0.03] px-2 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.04] min-w-0">
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate">纬度</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {sat.subSatellitePoint ? `${sat.subSatellitePoint.lat.toFixed(6)}°` : '--'}
                          </span>
                        </div>
                      </div>

                      {sat.subSatellitePoint && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] shrink-0">星下点:</span>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                            {sat.subSatellitePoint.region}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3.5 text-center rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.06] text-sm text-slate-400">
              暂无已入境卫星
            </div>
          )}
        </div>

        {/* 分组分割线 */}
        <div className="relative py-1 flex items-center justify-center">
          <div className="w-full border-t border-slate-200/80 dark:border-white/[0.08]" />
        </div>

        {/* ================= 第二组：待入境卫星（下一组） ================= */}
        <div className="space-y-2">
          {/* 待入境分组标题栏 */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span>待入境卫星 (已出境)</span>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {upcomingList.length} 颗排队
            </span>
          </div>

          {/* 待入境卫星列表 */}
          {upcomingList.length > 0 ? (
            <div className="space-y-2">
              {upcomingList.map((sat) => {
                const times = parseWindowTimes(sat);
                return (
                  <div
                    key={sat.id}
                    id={`split-sat-${sat.id}`}
                    className="rounded-xl p-3 bg-white/70 dark:bg-[#0e1526]/70 border border-slate-200/80 dark:border-white/[0.06] shadow-xs space-y-2"
                  >
                    {/* 第一行：卫星名称 + 出入境状态 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                        <div className="truncate flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {sat.name}
                          </span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">
                            {sat.code}
                          </span>
                        </div>
                      </div>

                      {/* 出入境状态：已出境 */}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                        已出境
                      </span>
                    </div>

                    {/* 模块一：地面站测控与过境时段卡片 */}
                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Radio className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                            地面站：<span className="font-bold text-slate-900 dark:text-white">{sat.groundStation}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px]">距离入境</span>
                          <span className="font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-sky-400">
                            {formatCountdown(sat.countdownSeconds)}
                          </span>
                        </div>
                      </div>

                      {/* 过境时段：入境 / 出境 / 时长 三字段 */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                        <div className="flex flex-col bg-white dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-slate-200/80 dark:border-white/[0.06] min-w-0 shadow-2xs">
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] truncate">入境</span>
                          <span className="text-slate-700 dark:text-slate-200 font-semibold truncate">
                            {times.entry}
                          </span>
                        </div>
                        <div className="flex flex-col bg-white dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-slate-200/80 dark:border-white/[0.06] min-w-0 shadow-2xs">
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] truncate">出境</span>
                          <span className="text-slate-700 dark:text-slate-200 font-semibold truncate">
                            {times.exit}
                          </span>
                        </div>
                        <div className="flex flex-col bg-white dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-slate-200/80 dark:border-white/[0.06] min-w-0 shadow-2xs">
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] truncate">时长</span>
                          <span className="text-slate-700 dark:text-slate-200 font-semibold truncate">
                            {times.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 模块二：空间遥测（轨道高度、经度、纬度放一行，下方星下点） */}
                    <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-black/30 border border-slate-200/60 dark:border-white/[0.06] space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <div className="flex flex-col bg-white/80 dark:bg-white/[0.03] px-2 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.04] min-w-0">
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate">高度</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                            {sat.altitude.toFixed(3)}km
                          </span>
                        </div>
                        <div className="flex flex-col bg-white/80 dark:bg-white/[0.03] px-2 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.04] min-w-0">
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate">经度</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {sat.subSatellitePoint ? `${sat.subSatellitePoint.lng.toFixed(6)}°` : '--'}
                          </span>
                        </div>
                        <div className="flex flex-col bg-white/80 dark:bg-white/[0.03] px-2 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.04] min-w-0">
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate">纬度</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {sat.subSatellitePoint ? `${sat.subSatellitePoint.lat.toFixed(6)}°` : '--'}
                          </span>
                        </div>
                      </div>

                      {sat.subSatellitePoint && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] shrink-0">星下点:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {sat.subSatellitePoint.region}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.06] text-xs text-slate-400">
              暂无待入境卫星
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

