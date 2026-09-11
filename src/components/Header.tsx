import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, Columns2, LayoutDashboard, MessageSquare, ClipboardList, Activity, Globe2 } from 'lucide-react';
import { WorkspaceViewMode, WorkspaceKanbanFilter } from '../types';

interface HeaderProps {
  activeSatelliteCount: number;
  isOrbitForecastOpen: boolean;
  onToggleOrbitForecast: () => void;
  onMobileMenuToggle?: () => void;
  activeTab?: string;
  isSidebarExpanded?: boolean;
  // 统一对话页：展示模式（对话+看板 / 仅看板 / 仅对话）与看板筛选（任务管理 / 健康管理 / 创新应用）
  workspaceViewMode?: WorkspaceViewMode;
  onWorkspaceViewModeChange?: (mode: WorkspaceViewMode) => void;
  workspaceKanbanFilter?: WorkspaceKanbanFilter;
  onWorkspaceKanbanFilterChange?: (filter: WorkspaceKanbanFilter) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSatelliteCount,
  isOrbitForecastOpen,
  onToggleOrbitForecast,
  activeTab,
  isSidebarExpanded = true,
  workspaceViewMode,
  onWorkspaceViewModeChange,
  workspaceKanbanFilter,
  onWorkspaceKanbanFilterChange,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header 
      id="onespace-header"
      className="w-full pb-2.5 flex items-center justify-between z-20"
    >
      {/* 左侧：导航收起时显示“021模型：OneSpace”完整品牌标识，以及 3 种展示模式切换按钮 */}
      <div className="flex items-center gap-3 min-w-0">
        {!isSidebarExpanded && (
          <div className="flex items-baseline gap-1 select-none font-sans shrink-0 animate-fadeIn pl-1">
            <span className="text-lg font-black tracking-wide bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent font-sans">
              021模型
            </span>
            <span className="text-slate-300 dark:text-slate-600 font-light text-base mx-0.5 font-sans">
              :
            </span>
            <span className="text-[15px] font-bold tracking-normal bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent font-sans">
              OneSpace
            </span>
          </div>
        )}

        {activeTab === 'workspace' && onWorkspaceViewModeChange && (
          <div className="flex items-center gap-1">
            <button
              id="workspace-view-mode-split"
              onClick={() => onWorkspaceViewModeChange('split')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                workspaceViewMode === 'split'
                  ? 'bg-blue-600 text-white dark:bg-sky-500 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
              }`}
              title="对话+看板"
            >
              <Columns2 className="w-4 h-4" />
            </button>

            <button
              id="workspace-view-mode-kanban"
              onClick={() => onWorkspaceViewModeChange('kanban')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                workspaceViewMode === 'kanban'
                  ? 'bg-blue-600 text-white dark:bg-sky-500 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
              }`}
              title="仅看板"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>

            <button
              id="workspace-view-mode-chat"
              onClick={() => onWorkspaceViewModeChange('chat')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                workspaceViewMode === 'chat'
                  ? 'bg-blue-600 text-white dark:bg-sky-500 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
              }`}
              title="仅对话"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 右上角：看板筛选导航（任务管理 / 健康管理 / 创新应用）+ 卫星在线胶囊 + 时钟 */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeTab === 'workspace' && workspaceViewMode !== 'chat' && onWorkspaceKanbanFilterChange && (
          <div className="flex items-center gap-1 p-1 rounded-full bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-xs">
            <button
              id="kanban-filter-task"
              onClick={() => onWorkspaceKanbanFilterChange('task')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                workspaceKanbanFilter === 'task'
                  ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="任务管理"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">任务管理</span>
            </button>

            <button
              id="kanban-filter-health"
              onClick={() => onWorkspaceKanbanFilterChange('health')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                workspaceKanbanFilter === 'health'
                  ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="健康管理"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">健康管理</span>
            </button>

            <button
              id="kanban-filter-innovative"
              onClick={() => onWorkspaceKanbanFilterChange('innovative')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                workspaceKanbanFilter === 'innovative'
                  ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="OneEarth太空部分"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">OneEarth太空部分</span>
            </button>
          </div>
        )}

        {/* 胶囊：时钟 + 卫星在线数合并，点击展开卫星列表 */}
        <button
          id="btn-capsule-satellites"
          onClick={onToggleOrbitForecast}
          title="点击查看卫星列表"
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-sm font-mono font-bold transition-all border shadow-xs select-none cursor-pointer ${
            isOrbitForecastOpen
              ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 border-blue-200/90 dark:border-sky-500/30'
              : 'bg-white/95 dark:bg-[#0c101c]/95 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-white/[0.08] hover:border-blue-300 dark:hover:border-white/[0.2] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span>{currentTime || '14:28:35'}</span>
          <span className="w-px h-3.5 bg-slate-200 dark:bg-white/[0.12]" />
          <span className="font-sans font-semibold">{activeSatelliteCount} 颗卫星在线</span>
          {isOrbitForecastOpen ? (
            <ChevronUp className="w-4 h-4 opacity-80" />
          ) : (
            <ChevronDown className="w-4 h-4 opacity-80" />
          )}
        </button>
      </div>
    </header>
  );
};

