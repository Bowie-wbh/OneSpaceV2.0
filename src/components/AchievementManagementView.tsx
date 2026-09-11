import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Download, 
  Maximize2, 
  X, 
  Calendar, 
  Camera, 
  Layers, 
  Satellite as SatelliteIcon, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { AchievementItem } from '../types';
import { INITIAL_ACHIEVEMENTS, IMAGING_MODES, SATELLITE_NAMES, TIME_RANGES } from '../data/achievementData';

interface AchievementManagementViewProps {
  onBackToPlanning?: () => void;
  achievements?: AchievementItem[];
}

export const AchievementManagementView: React.FC<AchievementManagementViewProps> = ({
  achievements = INITIAL_ACHIEVEMENTS
}) => {
  // 筛选状态
  const [selectedMode, setSelectedMode] = useState<string>('全部成像模式');
  const [selectedSatellite, setSelectedSatellite] = useState<string>('全部卫星');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('全部时间');

  // 大图弹窗 modal 状态
  const [activeItem, setActiveItem] = useState<AchievementItem | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // 过滤成果列表
  const filteredAchievements = useMemo(() => {
    return achievements.filter((item) => {
      // 1. 成像模式筛选
      if (selectedMode !== '全部成像模式' && item.imagingMode !== selectedMode) {
        return false;
      }
      // 2. 卫星名筛选
      if (selectedSatellite !== '全部卫星' && item.satelliteName !== selectedSatellite) {
        return false;
      }
      // 3. 拍摄时间筛选
      if (selectedTimeRange !== '全部时间') {
        if (selectedTimeRange === '近24小时') {
          // 假设当前时间 2026-09-02，筛选包含 2026-09-02 或 2026-09-01
          if (!item.captureTime.startsWith('2026-09-02') && !item.captureTime.startsWith('2026-09-01')) {
            return false;
          }
        } else if (selectedTimeRange === '近7天') {
          // 全部数据都在近 7 天内
        } else if (selectedTimeRange === '近30天') {
          // 全部数据都在近 30 天内
        } else {
          // 具体日期判定（如 2026-09-01）
          if (!item.captureTime.startsWith(selectedTimeRange)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [selectedMode, selectedSatellite, selectedTimeRange]);

  // 重置筛选
  const handleResetFilters = () => {
    setSelectedMode('全部成像模式');
    setSelectedSatellite('全部卫星');
    setSelectedTimeRange('全部时间');
  };

  // 模拟并触发图像下载
  const handleDownloadImage = (e: React.MouseEvent, item: AchievementItem) => {
    e.stopPropagation();
    
    // 创建虚拟链接触发下载
    const link = document.createElement('a');
    link.href = item.imageUrl;
    const cleanFileName = `${item.satelliteName}_${item.imagingMode}_${item.captureTime.replace(/[: ]/g, '_')}.jpg`;
    link.download = cleanFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 提示框
    setDownloadSuccessToast(`正在下载成果：${item.title}`);
    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden bg-transparent text-slate-800 dark:text-slate-100">
      {/* 顶部筛选栏（透明底色全宽布局） */}
      <div className="shrink-0 px-4 pt-2 pb-3 sm:px-6 bg-transparent w-full">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 三大下拉筛选栏：成像模式、卫星名、拍摄时间 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* 1. 成像模式筛选 */}
            <div className="relative">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-[#121829] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition-colors"
              >
                {IMAGING_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 卫星名筛选 */}
            <div className="relative">
              <select
                value={selectedSatellite}
                onChange={(e) => setSelectedSatellite(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-[#121829] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition-colors"
              >
                {SATELLITE_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. 拍摄时间筛选 */}
            <div className="relative">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-[#121829] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition-colors"
              >
                {TIME_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 右侧：统计及重置按钮 */}
          <div className="flex items-center justify-between md:justify-end gap-3 self-center pb-0.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              共 <span className="text-blue-600 dark:text-sky-400 font-bold">{filteredAchievements.length}</span> 份成果
            </span>
            {(selectedMode !== '全部成像模式' || selectedSatellite !== '全部卫星' || selectedTimeRange !== '全部时间') && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast 提示框 */}
      {downloadSuccessToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{downloadSuccessToast}</span>
        </div>
      )}

      {/* 图像卡片网格区域（铺满整个内容区） */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        <div className="w-full">
          {filteredAchievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-5 w-full">
              {filteredAchievements.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveItem(item)}
                  className="group relative flex flex-col rounded-2xl bg-white dark:bg-[#0c101c] border border-slate-200/90 dark:border-white/[0.08] overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-400/60 dark:hover:border-sky-400/50 transition-all duration-300 cursor-pointer"
                >
                  {/* 图像容器与 Hover 效果 */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950/80">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 group-hover:opacity-90 transition-opacity duration-300" />
                    
                    {/* 最新下传 Badge */}
                    {item.id.startsWith('ach-new-') && (
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500 text-white shadow-sm animate-pulse">
                          最新下传
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 基本信息展示区 (地点、卫星、相机、时间) */}
                  <div className="p-4 flex flex-col justify-between flex-1 space-y-2.5">
                    <div className="space-y-2 text-xs">
                      {/* 地点 */}
                      <div className="flex items-start justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          地点
                        </span>
                        <span className="font-medium text-right truncate text-slate-800 dark:text-slate-200" title={item.location || '观测成果'}>
                          {item.location || '观测成果'}
                        </span>
                      </div>

                      {/* 卫星 */}
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          卫星
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.satelliteName}
                        </span>
                      </div>

                      {/* 相机 */}
                      <div className="flex items-start justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          相机
                        </span>
                        <span className="font-medium text-right truncate text-slate-800 dark:text-slate-200" title={item.cameraType}>
                          {item.cameraType}
                        </span>
                      </div>

                      {/* 时间 */}
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          时间
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.captureTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center text-slate-400">
                <Filter className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                未找到匹配的成果图像
              </p>
              <p className="text-xs text-slate-400">
                尝试调整筛选条件（成像模式、卫星名或拍摄时间）
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                重置所有筛选
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= 大图与详情 Modal 弹窗 ================= */}
      {activeItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveItem(null)}
        >
          <div 
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col lg:flex-row rounded-3xl bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 左侧大图展示区 */}
            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] lg:min-h-[520px] overflow-hidden group">
              <img
                src={activeItem.imageUrl}
                alt={activeItem.title}
                className="max-w-full max-h-[70vh] lg:max-h-[85vh] object-contain select-none"
              />
            </div>

            {/* 右侧基本信息与下载区 */}
            <div className="w-full lg:w-96 p-6 flex flex-col justify-between space-y-6 bg-white dark:bg-[#0c101c] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/[0.08]">
              <div className="space-y-5">
                {/* 成果标题 */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {activeItem.title}
                  </h2>
                </div>

                {/* 基本信息表格 */}
                <div className="space-y-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-4 border border-slate-200/80 dark:border-white/[0.06] text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">成像模式</span>
                    <span className="font-bold text-blue-600 dark:text-sky-400">{activeItem.imagingMode}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">卫星</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeItem.satelliteName}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">相机</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{activeItem.cameraType}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">时间</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{activeItem.captureTime}</span>
                  </div>

                  {activeItem.resolution && (
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/[0.06]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">空间分辨率</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{activeItem.resolution}</span>
                    </div>
                  )}

                  {activeItem.cloudCoverage && (
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/[0.06]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">云量</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{activeItem.cloudCoverage}</span>
                    </div>
                  )}

                  {activeItem.fileSize && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">数据文件体积</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{activeItem.fileSize}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 下载大图 Action 按钮 */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={(e) => handleDownloadImage(e, activeItem)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>下载成果包</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  支持高清 JPG 预览图与 GeoTIFF 矢量影像包下载
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
