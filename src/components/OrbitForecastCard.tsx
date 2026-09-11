import React, { useState, useEffect } from 'react';
import { Satellite as SatelliteIcon, X, Radio, ArrowUpRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { Satellite } from '../types';

interface OrbitForecastCardProps {
  satellites: Satellite[];
  onToggleSatelliteStatus: (id: string) => void;
  onClose?: () => void;
}

export const OrbitForecastCard: React.FC<OrbitForecastCardProps> = ({
  satellites: propSatellites,
  onToggleSatelliteStatus,
  onClose,
}) => {
  const [satellites, setSatellites] = useState<Satellite[]>(propSatellites);

  useEffect(() => {
    setSatellites(propSatellites);
  }, [propSatellites]);

  // 实时倒计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setSatellites((prev) =>
        prev.map((sat) => {
          if (sat.countdownSeconds <= 1) {
            const nextStatus = sat.status === 'upcoming' ? 'in-bound' : 'upcoming';
            return {
              ...sat,
              status: nextStatus,
              countdownSeconds: nextStatus === 'in-bound' ? 420 : 3600,
              inboundElapsedSeconds: nextStatus === 'in-bound' ? 0 : 0,
            };
          }
          return {
            ...sat,
            countdownSeconds: sat.countdownSeconds - 1,
            inboundElapsedSeconds: sat.status === 'in-bound' ? (sat.inboundElapsedSeconds ?? 0) + 1 : 0,
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div 
      id="orbit-forecast-popup-card"
      className="w-full max-w-2xl mx-auto mb-4 rounded-2xl p-4 sm:p-5 border transition-all duration-300
        bg-white/95 dark:bg-[#0c101c]/95 
        border-slate-200/90 dark:border-white/[0.08] 
        shadow-[0_10px_35px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-fadeIn"
    >
      {/* 头部标题与关闭按钮 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-3.5 h-3.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-sky-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400 relative" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            在轨预报监控 (Orbit Forecast)
          </h2>
        </div>

        {onClose && (
          <button
            id="btn-close-orbit-card"
            onClick={onClose}
            title="关闭轨道预报卡"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 卫星列表：呈现卫星名称、倒计时，自适应卫星数 */}
      <div className="space-y-2">
        {satellites.map((sat) => {
          const isInbound = sat.status === 'in-bound';
          return (
            <div
              key={sat.id}
              id={`forecast-sat-${sat.id}`}
              className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/70 dark:bg-[#111728]/70 border-slate-200/70 dark:border-white/[0.06] hover:border-blue-300 dark:hover:border-white/[0.15] transition-all"
            >
              {/* 卫星名称与状态 */}
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isInbound ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {sat.name}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isInbound 
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' 
                        : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]'
                    }`}>
                      {isInbound ? '已入境 (IN-BOUND)' : '待入境 (UPCOMING)'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    载荷：{sat.sensorPayload} • 窗口期：{sat.imagingWindow}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    建链地面站：{sat.groundStation}
                  </p>
                </div>
              </div>

              {/* 倒计时与入境状态切换模拟 */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {isInbound ? '入境倒计时' : '下次入境'}
                  </span>
                  <span className={`text-xs sm:text-sm font-mono font-bold ${
                    isInbound ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {formatCountdown(sat.countdownSeconds)}
                  </span>
                </div>

                {/* 快捷切换入境模拟状态按钮（辅助用户测试一轨成像的入境条件） */}
                <button
                  id={`btn-toggle-status-${sat.id}`}
                  onClick={() => onToggleSatelliteStatus(sat.id)}
                  title={isInbound ? '切换为待入境状态测试' : '切换为入境状态测试'}
                  className="px-2 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161e33] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors flex items-center gap-1"
                >
                  <span>{isInbound ? '置为待入境' : '置为入境'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
