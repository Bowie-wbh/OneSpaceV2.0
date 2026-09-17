import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpRight,
} from 'lucide-react';
import { SpatialMarkerPoint, MarkerType } from '../../data/mockRemoteSensingData';

interface SpatialFilterPanelProps {
  points: SpatialMarkerPoint[];
  showFire: boolean;
  showBuilding: boolean;
  onToggleFire: () => void;
  onToggleBuilding: () => void;
  selectedPointId: string | null;
  onSelectPoint: (point: SpatialMarkerPoint) => void;
  onOpenMindMap?: () => void;
  isMindMapOpen?: boolean;
}

const DEFAULT_VISIBLE_COUNT = 10;

export const SpatialFilterPanel: React.FC<SpatialFilterPanelProps> = ({
  points,
  showFire,
  showBuilding,
  onToggleFire,
  onToggleBuilding,
  selectedPointId,
  onSelectPoint,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MarkerType>('fire');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const firePoints = points.filter((p) => p.type === 'fire');
  const buildingPoints = points.filter((p) => p.type === 'building');

  // 切换分类时，仅在地球上保留当前所选类别的标点
  const handleSelectCategory = (category: MarkerType) => {
    setActiveCategory(category);
    setIsCategoryOpen(false);
    setSearchText('');
    if (category === 'fire') {
      if (!showFire) onToggleFire();
      if (showBuilding) onToggleBuilding();
    } else {
      if (!showBuilding) onToggleBuilding();
      if (showFire) onToggleFire();
    }
  };

  // 首次挂载时确保仅显示默认分类 (林火监测)
  useEffect(() => {
    if (!showFire) onToggleFire();
    if (showBuilding) onToggleBuilding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryPoints = activeCategory === 'fire' ? firePoints : buildingPoints;

  const filteredPoints = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return categoryPoints;
    return categoryPoints.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.details.tag.toLowerCase().includes(keyword)
    );
  }, [categoryPoints, searchText]);

  // 无搜索关键词时默认仅展示前 10 条，搜索时展示全部匹配结果
  const displayedPoints = searchText.trim()
    ? filteredPoints
    : filteredPoints.slice(0, DEFAULT_VISIBLE_COUNT);

  const isFireCategory = activeCategory === 'fire';

  return (
    <div className="absolute bottom-4 right-4 z-20 pointer-events-auto flex flex-col items-end gap-2 text-white font-sans max-w-xs sm:max-w-sm w-full">
      <div className="w-full bg-black/55 border border-white/15 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden transition-all duration-300">
        {/* 顶部标题栏 */}
        <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Filter className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold tracking-wider text-slate-100">空间要素筛选</span>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isCollapsed ? '展开筛选面板' : '折叠筛选面板'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-3.5 space-y-3">
            {/* 分类下拉筛选：林火监测 / 古建筑 */}
            <div className="relative">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isFireCategory
                    ? 'bg-gradient-to-r from-rose-500/18 via-rose-950/20 to-transparent border-rose-500/30'
                    : 'bg-gradient-to-r from-amber-500/18 via-amber-950/20 to-transparent border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-4 h-4 rounded-full border-2 border-white shadow-md flex-shrink-0 ${
                      isFireCategory ? 'bg-rose-500 shadow-rose-500/50' : 'bg-[#8b4513] shadow-amber-700/50'
                    }`}
                  />
                  <span className="text-xs font-bold text-white">
                    {isFireCategory ? '林火监测' : '古建筑'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {categoryPoints.length} 处
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isCategoryOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-10 bg-black/90 border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                  <button
                    onClick={() => handleSelectCategory('fire')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      isFireCategory ? 'bg-rose-500/20 text-rose-300' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white flex-shrink-0" />
                    <span>林火监测</span>
                    <span className="ml-auto text-[10px] text-slate-500 font-mono">{firePoints.length}</span>
                  </button>
                  <button
                    onClick={() => handleSelectCategory('building')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      !isFireCategory ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-[#8b4513] border-2 border-white flex-shrink-0" />
                    <span>古建筑</span>
                    <span className="ml-auto text-[10px] text-slate-500 font-mono">{buildingPoints.length}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索监测地区名称或标签"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-400/60 transition-colors"
              />
            </div>

            {/* 已监测地区列表 */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {displayedPoints.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">未找到匹配的监测地区</div>
              ) : (
                displayedPoints.map((point) => {
                  const isSelected = point.id === selectedPointId;

                  return (
                    <button
                      key={point.id}
                      onClick={() => onSelectPoint(point)}
                      className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? isFireCategory
                            ? 'bg-rose-500/15 border-rose-500/60 shadow-lg shadow-rose-500/15'
                            : 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-900/15'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border-2 border-white flex-shrink-0 shadow-sm transition-transform ${
                            isFireCategory
                              ? 'bg-rose-500 shadow-rose-500/40 group-hover:scale-110'
                              : 'bg-[#8b4513] shadow-amber-800/40 group-hover:scale-110'
                          }`}
                        />
                        <div className="truncate">
                          <div className="font-semibold text-slate-200 text-xs truncate group-hover:text-white">
                            {point.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{point.details.tag}</div>
                        </div>
                      </div>

                      <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0 ml-2" />
                    </button>
                  );
                })
              )}
            </div>

            {!searchText.trim() && filteredPoints.length > DEFAULT_VISIBLE_COUNT && (
              <p className="text-center text-[10px] text-slate-500">
                默认展示前 {DEFAULT_VISIBLE_COUNT} 条，共 {filteredPoints.length} 处，可搜索查看更多
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
