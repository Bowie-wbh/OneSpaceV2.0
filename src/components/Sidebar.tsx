import React, { useState } from 'react';
import { 
  FolderCheck,
  Search, 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  X,
  User
} from 'lucide-react';
import { MainTabType, ThemeMode, HistorySession } from '../types';

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  historySessions: HistorySession[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isExpanded,
  onToggleExpand,
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  historySessions,
  selectedSessionId,
  onSelectSession,
  onNewChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredSessions = historySessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      id="onespace-sidebar"
      className={`shrink-0 h-[calc(100vh-24px)] my-auto ml-3 transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded 
          ? 'w-64 sm:w-72 bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-2xl rounded-2xl p-3 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.8)]' 
          : 'w-14 sm:w-16 p-2 items-center'
      }`}
    >
      {isExpanded ? (
        /* ================= 展开状态 ================= */
        <div className="flex flex-col h-full justify-between">
          {/* 上半部分 */}
          <div className="flex flex-col min-h-0 space-y-3">
            {/* 1. LOGO 区：文字 logo 为：021模型|OneSpace（不要图标）、展开收起按钮 */}
            <div className="flex items-center justify-between px-1.5 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-baseline gap-1 select-none font-sans">
                <span className="text-lg font-black tracking-wide bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent font-sans">
                  021模型
                </span>
                <span className="text-slate-300 dark:text-slate-600 font-light text-base mx-0.5 font-sans">
                  |
                </span>
                <span className="text-[15px] font-bold tracking-normal bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent font-sans">
                  OneSpace
                </span>
              </div>
              <button
                id="btn-collapse-sidebar"
                onClick={onToggleExpand}
                title="收起侧边栏"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* 2. 核心菜单区：对话（整合任务规划、健康管理、创新应用）、成果管理 */}
            <nav className="space-y-1">
              <button
                id="nav-workspace"
                onClick={() => onSelectTab('workspace')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'workspace'
                    ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span>对话</span>
              </button>

              <button
                id="nav-achievement-management"
                onClick={() => onSelectTab('achievement-management')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'achievement-management'
                    ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
              >
                <FolderCheck className="w-4 h-4 flex-shrink-0" />
                <span>成果管理</span>
              </button>
            </nav>

            {/* 3. 对话历史区：搜索与下拉筛选、对话历史列表，自动延伸充满剩余空间 */}
            <div className="flex flex-col flex-1 min-h-0 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              {/* 历史头部：标题、类型下拉筛选与搜索按钮 */}
              <div className="flex items-center justify-between px-1 mb-2 shrink-0">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  对话历史
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-sidebar-search-toggle"
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    title="搜索对话"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 展开的搜索框 */}
              {isSearchOpen && (
                <div className="relative mb-2 px-0.5 animate-fadeIn shrink-0">
                  <input
                    type="text"
                    placeholder="搜索历史任务..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-6 py-1.5 text-sm rounded-xl bg-slate-100 dark:bg-[#121829] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-sky-400"
                    autoFocus
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* 对话历史列表：自适应充满剩余空间，超出时滚轮 */}
              <div 
                id="sidebar-history-list"
                className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
              >
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => {
                    const isSelected = selectedSessionId === session.id;

                    return (
                      <button
                        key={session.id}
                        id={`session-item-${session.id}`}
                        onClick={() => onSelectSession(session.id)}
                        className={`w-full text-left p-2 rounded-xl text-sm transition-all flex items-start gap-2 relative group/item ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300 font-semibold border border-blue-200/80 dark:border-sky-500/30 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-sm flex items-center gap-1.5">
                            <span className="truncate">{session.title}</span>
                          </p>
                          <span className="text-xs text-slate-400 dark:text-slate-400 mt-0.5 block font-mono">
                            {session.timestamp}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-400">
                    暂无历史记录
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. 设置区：占最下方一行位置，包括头像和用户名，黑夜/白昼UI模式切换按钮 */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between px-1">
            {/* 头像和用户名 */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.12] flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-2xs flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  长管·李明
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-400 truncate">
                  OneSpace 指控中枢
                </p>
              </div>
            </div>

            {/* 黑夜/白昼UI模式切换按钮（月亮太阳图标，点击白天再点击黑夜） */}
            <button
              id="btn-toggle-theme-expanded"
              onClick={onToggleTheme}
              title={theme === 'dark' ? '切换为白天模式' : '切换为黑夜模式'}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors flex-shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ================= 收起状态 ================= */
        /* 下方为胶囊悬浮侧边栏，包含展开按钮、任务规划、健康管理、创新应用、搜索以及黑白切换按钮 */
        <div className="flex flex-col items-center h-full justify-between py-1">
          {/* 中间胶囊悬浮功能列表（移入了黑夜/白昼切换按钮，形成统一胶囊导航） */}
          <div className="flex flex-col items-center gap-3 p-1.5 rounded-full bg-white/90 dark:bg-[#0c101c]/90 border border-slate-200 dark:border-white/[0.08] shadow-sm">
            {/* 1. 展开按钮 */}
            <button
              id="btn-expand-sidebar"
              onClick={onToggleExpand}
              title="展开侧边栏"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* 2. 对话 图标（整合任务规划、健康管理、创新应用） */}
            <button
              id="btn-collapsed-workspace"
              onClick={() => onSelectTab('workspace')}
              title="对话"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'workspace'
                  ? 'bg-blue-600 text-white dark:bg-sky-400 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* 5. 成果管理 图标 */}
            <button
              id="btn-collapsed-achievement-management"
              onClick={() => onSelectTab('achievement-management')}
              title="成果管理"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'achievement-management'
                  ? 'bg-blue-600 text-white dark:bg-sky-400 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
              }`}
            >
              <FolderCheck className="w-4 h-4" />
            </button>

            {/* 5. 搜索历史记录 图标 */}
            <button
              id="btn-collapsed-search"
              onClick={() => {
                onToggleExpand();
                setIsSearchOpen(true);
              }}
              title="搜索历史记录"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* 6. 黑夜/白昼切换按钮（放入胶囊内部） */}
            <button
              id="btn-toggle-theme-collapsed"
              onClick={onToggleTheme}
              title={theme === 'dark' ? '白天模式' : '黑夜模式'}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>

          {/* 底部占位保持对称平衡 */}
          <div className="w-9 h-9" />
        </div>
      )}
    </aside>
  );
};
