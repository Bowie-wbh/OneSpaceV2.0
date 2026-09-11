import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown, GripVertical, Bot } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SatelliteSplitPanel } from './components/SatelliteSplitPanel';
import { ToolCards } from './components/ToolCards';
import { ChatInputArea } from './components/ChatInputArea';
import { ChatConversation } from './components/ChatConversation';
import { HealthCheckView } from './components/HealthCheckView';
import { InnovativeAppView } from './components/InnovativeAppView';
import { AchievementManagementView } from './components/AchievementManagementView';
import { TaskManagementKanban, PlannedTaskItem, GROUND_STAGE_STEP_COUNT, ONBOARD_STAGE_STEP_COUNT, FLOW_STEP_INTERVAL_MS } from './components/TaskManagementKanban';
import { TimeSeriesUploadModal, TimeSeriesTaskData } from './components/TimeSeriesUploadModal';
import { 
  ThemeMode, 
  MainTabType, 
  WorkspaceViewMode,
  WorkspaceKanbanFilter,
  Satellite, 
  ChatMessage, 
  HistorySession, 
  TimeSlotOption, 
  StructuredTaskOrder,
  TaskRequirementDraft,
  FlowStepItem,
  TimeSeriesDayPlan,
  InnovativeAppItem,
  QAWindowOption,
  AchievementItem
} from './types';
import { INITIAL_ACHIEVEMENTS } from './data/achievementData';
import { 
  INITIAL_SATELLITES, 
  REGULAR_ONBOARD_FLOW_STEPS,
  REGULAR_FLOW_STEPS,
  TIME_SERIES_GROUND_STEPS,
  TIME_SERIES_ONBOARD_STEPS,
  HIGH_RISK_LOCATIONS,
  INITIAL_FLOW_STEPS, 
  INITIAL_HISTORY_SESSIONS, 
  SAMPLE_RESULT_IMAGES 
} from './data/satelliteData';

// 统一对话页打招呼推荐问题（整合任务规划/健康管理/创新应用三类场景）
const WORKSPACE_SUGGESTED_PROMPTS = [
  '开启林火监测任务',
  '帮我评估一下星载路由系统最近十天的状态',
  '安排明天下午宁波港口的观测任务，并检测是否有火灾',
];

// 一轨成像/常规成像任务的结束判定：模拟成功/失败结果及失败原因，供任务动画结束后向对话流反馈
const TASK_FAILURE_REASONS = [
  '云层遮挡导致目标区域成像质量不达标',
  '卫星侧摆机构响应超时，未能在有效窗口内完成姿态调整',
  '星上存储器写入异常，成像数据落盘失败',
  '下传链路信噪比骤降，数据传输中断',
];

const decideTaskOutcome = (totalSteps: number): { outcome: 'success' | 'failure'; failStepIndex?: number; failureReason?: string } => {
  if (Math.random() >= 0.2) return { outcome: 'success' };
  return {
    outcome: 'failure',
    failStepIndex: Math.floor(Math.random() * totalSteps),
    failureReason: TASK_FAILURE_REASONS[Math.floor(Math.random() * TASK_FAILURE_REASONS.length)],
  };
};

// 一轨成像入境建链状态机参数：入境瞬间开始建链，建链后成功可发指令 60s，失败则不可点
const LINK_CONNECTING_SECONDS = 5;
const LINK_COMMAND_WINDOW_SECONDS = 60;
const LINK_SUCCESS_PROBABILITY = 0.75;

// 每秒推进单颗卫星的出入境倒计时与建链状态机
const tickSatellite = (sat: Satellite): Satellite => {
  if (sat.countdownSeconds <= 1) {
    const nextStatus = sat.status === 'in-bound' ? 'upcoming' : 'in-bound';
    const enteringInbound = nextStatus === 'in-bound';
    return {
      ...sat,
      status: nextStatus,
      countdownSeconds: enteringInbound ? 420 : 3600,
      inboundElapsedSeconds: 0,
      linkState: enteringInbound ? 'connecting' : undefined,
      linkStateSeconds: enteringInbound ? LINK_CONNECTING_SECONDS : undefined,
    };
  }

  if (sat.status !== 'in-bound') {
    return {
      ...sat,
      countdownSeconds: sat.countdownSeconds - 1,
      inboundElapsedSeconds: 0,
    };
  }

  const inboundElapsedSeconds = (sat.inboundElapsedSeconds ?? 0) + 1;

  if (sat.linkState === 'connecting') {
    const remaining = (sat.linkStateSeconds ?? LINK_CONNECTING_SECONDS) - 1;
    if (remaining <= 0) {
      const success = Math.random() < LINK_SUCCESS_PROBABILITY;
      // 60S 指令窗口需扣除本次建链已耗费的时间，剩余才是可发指令的时长
      const commandWindowRemaining = Math.max(0, LINK_COMMAND_WINDOW_SECONDS - inboundElapsedSeconds);
      return {
        ...sat,
        countdownSeconds: sat.countdownSeconds - 1,
        inboundElapsedSeconds,
        linkState: success ? 'success' : 'failed',
        linkStateSeconds: success ? commandWindowRemaining : 0,
      };
    }
    return {
      ...sat,
      countdownSeconds: sat.countdownSeconds - 1,
      inboundElapsedSeconds,
      linkStateSeconds: remaining,
    };
  }

  if (sat.linkState === 'success') {
    const remaining = Math.max(0, (sat.linkStateSeconds ?? 0) - 1);
    return {
      ...sat,
      countdownSeconds: sat.countdownSeconds - 1,
      inboundElapsedSeconds,
      linkState: remaining <= 0 ? 'expired' : 'success',
      linkStateSeconds: remaining,
    };
  }

  return {
    ...sat,
    countdownSeconds: sat.countdownSeconds - 1,
    inboundElapsedSeconds,
  };
};

export function App() {
  // 主题模式 (dark / light)
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // 当前菜单标签：'workspace'（统一对话页，整合任务规划/健康管理/创新应用）| 'achievement-management'
  const [activeTab, setActiveTab] = useState<MainTabType>('workspace');
  // 统一对话页展示模式：对话+看板 | 仅看板 | 仅对话
  const [workspaceViewMode, setWorkspaceViewMode] = useState<WorkspaceViewMode>('split');
  // 统一对话页看板筛选：任务管理看板 | 健康管理看板 | 创新应用看板（默认初次进入任务管理看板）
  const [workspaceKanbanFilter, setWorkspaceKanbanFilter] = useState<WorkspaceKanbanFilter>('task');
  // 统一对话页对话区可调节宽度（split 模式下生效）
  const [workspaceChatPanelWidth, setWorkspaceChatPanelWidth] = useState<number>(460);
  const [isDraggingWorkspaceSplitter, setIsDraggingWorkspaceSplitter] = useState<boolean>(false);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);
  // 侧边栏展开/折叠状态
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);
  // 卫星列表 (初始包含入境与待入境卫星星座)
  const [satellites, setSatellites] = useState<Satellite[]>(INITIAL_SATELLITES);
  // 当前选中的卫星（联动健康管理遥测与状态）
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string>(INITIAL_SATELLITES[0].id);
  const selectedSatellite = satellites.find(s => s.id === selectedSatelliteId) || satellites[0];
  // 卫星状态分割面板展开状态
  const [isOrbitForecastOpen, setIsOrbitForecastOpen] = useState<boolean>(false);
  // 卫星分割面板可调节宽度（默认 380px）
  const [satellitePanelWidth, setSatellitePanelWidth] = useState<number>(380);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const mainBodyRef = useRef<HTMLDivElement>(null);

  // 左右拖拽调整宽度
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainBodyRef.current) return;
      const rect = mainBodyRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      const minWidth = 280;
      // 动态计算最大宽度，确保左侧主视窗/看板至少保留 600px 空间，防止拖拽时覆盖或过度压缩看板
      const maxAllowedWidth = Math.max(300, rect.width - 600);
      const maxWidth = Math.min(650, maxAllowedWidth);
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSatellitePanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // 统一对话页左右拖拽调整对话区/看板区宽度（仅 split 展示模式下生效）
  useEffect(() => {
    if (!isDraggingWorkspaceSplitter) return;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!workspaceContainerRef.current) return;
      const rect = workspaceContainerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const minWidth = 320;
      const maxWidth = Math.max(360, rect.width - 360);
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWorkspaceChatPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsDraggingWorkspaceSplitter(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWorkspaceSplitter]);
  
  // 任务规划/健康管理/创新应用统一对话列表
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // 成果管理列表数据
  const [achievements, setAchievements] = useState<AchievementItem[]>(INITIAL_ACHIEVEMENTS);
  // 输入框预填充
  const [prefillPrompt, setPrefillPrompt] = useState<string>('');
  // 生成状态
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // 一轨成像任务发起后锁定输入框，禁止继续对话
  const [isChatLocked, setIsChatLocked] = useState<boolean>(false);
  // 一轨成像对话流注入到任务管理看板的任务
  const [singleOrbitInjectedTask, setSingleOrbitInjectedTask] = useState<PlannedTaskItem | null>(null);
  // “查看”按钮点击计数器：每次递增强制任务管理看板重新跳转到对应任务详情页
  const [taskFocusRequestId, setTaskFocusRequestId] = useState(0);
  // 长时序任务配置弹窗
  const [isTimeSeriesModalOpen, setIsTimeSeriesModalOpen] = useState<boolean>(false);
  // 创新应用展区动态新增的应用卡片与当前选中进看板的应用
  const [customApps, setCustomApps] = useState<InnovativeAppItem[]>([]);
  const [selectedInnovativeApp, setSelectedInnovativeApp] = useState<InnovativeAppItem | null>(null);
  // 对话历史会话
  const [historySessions, setHistorySessions] = useState<HistorySession[]>(INITIAL_HISTORY_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  // 动态创建的历史会话对应的对话内容快照（用于切换会话后可还原，非预置演示会话）
  const [sessionMessagesMap, setSessionMessagesMap] = useState<Record<string, ChatMessage[]>>({});

  // 每次对话内容变化时，将其快照保存到当前选中的会话上，便于切换回该会话时还原
  useEffect(() => {
    if (selectedSessionId) {
      setSessionMessagesMap(prev => ({ ...prev, [selectedSessionId]: messages }));
    }
  }, [messages, selectedSessionId]);

  // 对话流滚动容器与“回到最近对话”状态
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);

  // 流式打字定时器与延迟定时器 Ref（用于支持用户点击中断按钮时立即终止生成）
  const activeStreamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamPendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 中断当前正在进行的流式文本/报告生成
  const handleStopGenerating = () => {
    if (activeStreamPendingTimeoutRef.current) {
      clearTimeout(activeStreamPendingTimeoutRef.current);
      activeStreamPendingTimeoutRef.current = null;
    }
    if (activeStreamIntervalRef.current) {
      clearInterval(activeStreamIntervalRef.current);
      activeStreamIntervalRef.current = null;
    }
    setIsGenerating(false);
  };

  const scrollToBottom = (smooth = true) => {
    if (conversationContainerRef.current) {
      conversationContainerRef.current.scrollTo({
        top: conversationContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  const handleScroll = () => {
    if (!conversationContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = conversationContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollToBottom(isScrolledUp);
  };

  // 当新增消息或生成响应时自动滚动到底部（若用户未主动向上滚动浏览历史）
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        if (!showScrollToBottom) {
          scrollToBottom(true);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [messages, isGenerating]);

  // 同步 theme 到 document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  // 切换白天/黑夜主题
  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // 全局卫星出入境倒计时与前 1 分钟入境计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setSatellites((prev) => prev.map(tickSatellite));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 切换卫星入境/待入境状态（用于测试一轨成像的入境黄金窗口条件）
  const handleToggleSatelliteStatus = (satId: string) => {
    setSatellites(prev => prev.map(s => {
      if (s.id === satId) {
        const nextStatus = s.status === 'in-bound' ? 'upcoming' : 'in-bound';
        const enteringInbound = nextStatus === 'in-bound';
        return {
          ...s,
          status: nextStatus,
          countdownSeconds: enteringInbound ? 380 : 3200,
          inboundElapsedSeconds: 0,
          linkState: enteringInbound ? 'connecting' : undefined,
          linkStateSeconds: enteringInbound ? LINK_CONNECTING_SECONDS : undefined,
        };
      }
      return s;
    }));
  };

  // 动态创建或更新历史会话记录
  const handleCreateHistorySession = (title: string, type: 'task-planning' | 'health-check') => {
    if (selectedSessionId) {
      setHistorySessions(prev => prev.map(s => {
        if (s.id === selectedSessionId) {
          return { ...s, messageCount: s.messageCount + 1 };
        }
        return s;
      }));
      return;
    }

    const cleanTitle = title.trim();
    const displayTitle = cleanTitle.length > 16 ? cleanTitle.slice(0, 16) + '...' : cleanTitle;
    const newId = `sess-${type === 'health-check' ? 'hc' : 'tp'}-${Date.now()}`;
    
    const newSession: HistorySession = {
      id: newId,
      title: displayTitle || (type === 'health-check' ? '健康诊断分析' : '任务规划成像'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateGroup: '今日',
      messageCount: 1,
      type: type,
    };

    setHistorySessions(prev => [newSession, ...prev]);
    setSelectedSessionId(newId);
  };

  // 新建对话
  const handleNewChat = () => {
    setMessages([]);
    setSelectedSessionId(null);
    setPrefillPrompt('');
    setIsChatLocked(false);
    setSingleOrbitInjectedTask(null);
  };

  // 选择历史会话
  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const session = historySessions.find(s => s.id === sessionId);
    if (!session) return;

    // 载入历史示范会话
    if (sessionId === 'sess-5') {
      setActiveTab('workspace');
      setWorkspaceViewMode('split');
      setWorkspaceKanbanFilter('task');
      setSingleOrbitInjectedTask({
        id: 'TASK-REG-HIST-1',
        satelliteName: '之江天目01号',
        satelliteCode: 'ZJ-TM-01',
        groundStation: '常规任务地面站',
        timeRange: '2026-09-10 11:00:12 ~ 11:08:30',
        isImaging: true,
        imagingTypeDesc: '高分多光谱推扫成像',
        computingTask: '无',
        starMode: '单星',
        targetLocation: '北京城区（116.4°E, 39.9°N）',
        taskMode: '常规模式',
        payload: '可见光/多光谱',
        isLive: false,
        outcome: 'success',
      });
      setTaskFocusRequestId(id => id + 1);
      setMessages([
        {
          id: 'hist-user-5',
          role: 'user',
          content: '规划北京城区高分多光谱推扫成像任务',
          timestamp: '11:00',
          mode: 'regular',
        },
        {
          id: 'hist-asst-5',
          role: 'assistant',
          content: '当前任务已完成。详细流程与结果请查看看板区任务详情。',
          timestamp: '11:08',
          mode: 'regular',
        }
      ]);
    } else if (sessionId === 'sess-5-fail') {
      setActiveTab('workspace');
      setWorkspaceViewMode('split');
      setWorkspaceKanbanFilter('task');
      setSingleOrbitInjectedTask({
        id: 'TASK-REG-HIST-1F',
        satelliteName: '之江天目01号',
        satelliteCode: 'ZJ-TM-01',
        groundStation: '常规任务地面站',
        timeRange: '2026-09-10 11:15:40 ~ 11:20:10',
        isImaging: true,
        imagingTypeDesc: '高分多光谱推扫成像',
        computingTask: '无',
        starMode: '单星',
        targetLocation: '上海城区（121.47°E, 31.23°N）',
        taskMode: '常规模式',
        payload: '可见光/多光谱',
        isLive: false,
        outcome: 'failure',
        failStepIndex: 2,
        failureReason: '卫星侧摆机构响应超时，未能在有效窗口内完成姿态调整',
      });
      setTaskFocusRequestId(id => id + 1);
      setMessages([
        {
          id: 'hist-user-5f',
          role: 'user',
          content: '规划上海城区高分多光谱推扫成像任务',
          timestamp: '11:15',
          mode: 'regular',
        },
        {
          id: 'hist-asst-5f',
          role: 'assistant',
          content: '任务失败：卫星侧摆机构响应超时，未能在有效窗口内完成姿态调整。详情请查看看板区任务详情。',
          timestamp: '11:20',
          mode: 'regular',
        }
      ]);
    } else if (sessionId === 'sess-1') {
      setActiveTab('workspace');
      setWorkspaceViewMode('split');
      setWorkspaceKanbanFilter('task');
      setSingleOrbitInjectedTask({
        id: 'TASK-SO-HIST-1',
        satelliteName: '云尖沐曦号',
        satelliteCode: 'SCS-04-15',
        groundStation: '一轨即时成像地面站',
        timeRange: '2026-09-10 10:24:05 ~ 10:32:20',
        isImaging: true,
        imagingTypeDesc: '一轨即时应急成像与火灾检测',
        computingTask: '火灾检测',
        starMode: '单星',
        targetLocation: '之江实验室（120.09°E, 30.29°N）',
        taskMode: '一轨成像',
        payload: '红外',
        isLive: false,
        outcome: 'success',
      });
      setTaskFocusRequestId(id => id + 1);
      setMessages([
        {
          id: 'hist-user-1',
          role: 'user',
          content: '拍摄之江实验室一轨即时成像，并进行全自动火灾检测',
          timestamp: '10:24',
          mode: 'single_orbit',
        },
        {
          id: 'hist-asst-1',
          role: 'assistant',
          content: '当前任务已完成。详细流程与结果请查看看板区任务详情。',
          timestamp: '10:32',
          mode: 'single_orbit',
        }
      ]);
    } else if (sessionId === 'sess-1-fail') {
      setActiveTab('workspace');
      setWorkspaceViewMode('split');
      setWorkspaceKanbanFilter('task');
      setSingleOrbitInjectedTask({
        id: 'TASK-SO-HIST-1F',
        satelliteName: '云尖沐曦号',
        satelliteCode: 'SCS-04-15',
        groundStation: '一轨即时成像地面站',
        timeRange: '2026-09-10 10:38:12 ~ 10:40:55',
        isImaging: true,
        imagingTypeDesc: '一轨即时应急成像与火灾检测',
        computingTask: '火灾检测',
        starMode: '单星',
        targetLocation: '西湖景区（120.15°E, 30.25°N）',
        taskMode: '一轨成像',
        payload: '红外',
        isLive: false,
        outcome: 'failure',
        failStepIndex: 9,
        failureReason: '星上存储器写入异常，成像数据落盘失败',
      });
      setTaskFocusRequestId(id => id + 1);
      setMessages([
        {
          id: 'hist-user-1f',
          role: 'user',
          content: '拍摄西湖景区一轨即时成像，并进行全自动火灾检测',
          timestamp: '10:38',
          mode: 'single_orbit',
        },
        {
          id: 'hist-asst-1f',
          role: 'assistant',
          content: '任务失败：星上存储器写入异常，成像数据落盘失败。详情请查看看板区任务详情。',
          timestamp: '10:40',
          mode: 'single_orbit',
        }
      ]);
    } else if (sessionId === 'sess-fire-1') {
      // “林火监测”对话记录呈现在主对话区，具体流程步骤统一在看板区（创新应用监控卡）呈现
      setActiveTab('workspace');
      setWorkspaceViewMode('split');
      setWorkspaceKanbanFilter('innovative');

      const fireApp: InnovativeAppItem = {
        id: 'app-preset-1',
        title: '全球火险监测',
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        totalDays: 7,
        executedDays: 3,
        source: '全球火险监测',
        status: '进行中',
        cooperatingUnit: '中国林业科学院',
      };
      setSelectedInnovativeApp(fireApp);
      setCustomApps([fireApp]);

      setMessages([
        {
          id: 'hist-fire-user-1',
          role: 'user',
          content: '开启林火监测任务',
          timestamp: '09:40',
          mode: 'time_series',
        },
        {
          id: 'hist-fire-asst-1',
          role: 'assistant',
          thinkingProcess: '1. 截获林火监测任务开启意图。\n2. 引导用户输入监测任务起止日期。',
          content: '好的，请提供本次监测任务的**开始日期**和**结束日期**（例如：`2026-09-05` 至 `2026-09-11`）。',
          timestamp: '09:40',
          mode: 'time_series',
        },
        {
          id: 'hist-fire-user-2',
          role: 'user',
          content: '2026-09-01 至 2026-09-07',
          timestamp: '09:41',
          mode: 'time_series',
        },
        {
          id: 'hist-fire-asst-2',
          role: 'assistant',
          thinkingProcess: '1. 解析任务周期：2026-09-01 至 2026-09-07\n2. 校验星载相机资源与轨道过境时段。\n3. 生成启动确认指令。',
          content: '好的，任务周期为 **2026-09-01 ~ 2026-09-07**，确认发起「全球火险监测」任务吗？',
          timestamp: '09:41',
          mode: 'time_series',
          confirmChoice: true,
          isActionConfirmed: true,
        },
        {
          id: 'hist-fire-user-3',
          role: 'user',
          content: '确认',
          timestamp: '09:42',
          mode: 'time_series',
        },
        {
          id: 'hist-fire-asst-3',
          role: 'assistant',
          thinkingProcess: '1. 任务正式立项并更新看板：全球火险监测\n2. 周期：2026-09-01 至 2026-09-07（共 7 天）\n3. 启动自动化感知与林科院高风险点拍摄需求接收...',
          content: '任务已发起，当前周期：**2026-09-01 ~ 2026-09-07**（已执行 0/7 天）。\n看板区监测面板已同步更新为执行中状态。',
          timestamp: '09:42',
          mode: 'time_series',
          showGoToAppButton: true,
        },
      ]);
    } else {
      setActiveTab('workspace');
      setWorkspaceViewMode('split');
      setWorkspaceKanbanFilter(session.type === 'health-check' ? 'health' : 'task');
      // 动态创建的会话（如健康管理问答）需还原其对应对话内容
      setMessages(sessionMessagesMap[sessionId] || []);
    }
  };

  // 自然语言智能要素提取器：支持从用户的自由输入中抽取载荷、地点、在轨计算模型和时间
  const parseRequirementsFromText = (userInputText: string, currentDraft: TaskRequirementDraft = {}): TaskRequirementDraft => {
    const draft: TaskRequirementDraft = { ...currentDraft };
    const text = userInputText.trim();
    const lower = text.toLowerCase();

    // 1. 提取载荷
    if (/光学|多光谱|高分|可见光|全色|相机/i.test(text)) {
      draft.payload = '高分多光谱光学相机 (0.5m全色/2m多光谱)';
    } else if (/红外|热红外|热成像|测温/i.test(text)) {
      draft.payload = '高分辨率红外热成像仪 (热红外测温)';
    } else if (/sar|雷达|微波|合成孔径/i.test(text)) {
      draft.payload = 'C波段合成孔径雷达 (SAR 全天候)';
    } else if (/双载荷|全载荷/i.test(text)) {
      draft.payload = '多光谱相机 + 红外热成像仪 (双载荷同步)';
    } else if (currentDraft.currentField === 'payload' && text.length > 0) {
      draft.payload = text;
    }

    // 2. 提取地点
    if (text.includes('北京')) {
      draft.location = '北京市核心城区及周边 (39.9042°N, 116.4074°E)';
    } else if (text.includes('西湖')) {
      draft.location = '杭州西湖核心风景名胜区 (30.2435°N, 120.1415°E)';
    } else if (text.includes('千岛湖')) {
      draft.location = '千岛湖生态保护与水体监测区 (29.6042°N, 119.0528°E)';
    } else if (text.includes('之江')) {
      draft.location = '之江实验室核心园区及周边 (30.2741°N, 119.9823°E)';
    } else if (text.includes('宁波') || text.includes('港口')) {
      draft.location = '宁波舟山港口及周边水域 (29.8821°N, 121.5642°E)';
    } else if (text.includes('上海')) {
      draft.location = '上海市核心城区及外滩 (31.2304°N, 121.4737°E)';
    } else if (text.includes('广州') || text.includes('深圳') || text.includes('大湾区')) {
      draft.location = '粤港澳大湾区核心水网 (22.5431°N, 114.0579°E)';
    } else if (currentDraft.currentField === 'location' && text.length > 0) {
      draft.location = text.includes('(') ? text : `${text} (30.2741°N, 119.9823°E)`;
    } else if (!draft.location) {
      // 提取输入文本中的地名（去掉常见动词与语气词）
      const cleanLoc = text.replace(/^(请|帮我|立即|安排|执行|拍摄|观测|监测|使用|在|用)+/g, '').replace(/【[^】]*】/g, '').replace(/(高分|多光谱|红外|雷达|相机|的照片|的任务|的图像)/g, '').trim();
      if (cleanLoc.length >= 2 && cleanLoc.length <= 20) {
        draft.location = `${cleanLoc} (39.9042°N, 116.4074°E)`;
      }
    }

    // 3. 提取在轨计算需求与算法模型
    if (/不计算|不用算|不需要|直接下传|无需|不进行/i.test(text)) {
      draft.onboardComputing = '不需要在轨计算：原始码流直接对地下传';
    } else if (/火灾|火情|热点|火斑/i.test(text)) {
      draft.onboardComputing = '需要在轨计算：星载轻量化云雪快筛 + 红外火灾检测模型';
    } else if (/水体|水质|富营养|藻华|叶绿素/i.test(text)) {
      draft.onboardComputing = '需要在轨计算：水体富营养化与叶绿素反演模型';
    } else if (/变化|建筑|道路/i.test(text)) {
      draft.onboardComputing = '需要在轨计算：高分建筑与道路变化检测模型';
    } else if (/在轨计算|计算|模型|是/i.test(text) && !draft.onboardComputing) {
      draft.onboardComputing = '需要在轨计算：星载轻量化云雪快筛 + 红外火灾检测模型';
    } else if (currentDraft.currentField === 'onboardComputing' && text.length > 0) {
      draft.onboardComputing = text;
    }

    // 4. 提取时间
    if (/明天|今天|后天|小时|窗口|周期|\d{4}-\d{2}-\d{2}|\d{1,2}[:点时]/i.test(text)) {
      if (text.includes('至') || text.includes('到') || text.includes('~')) {
        const parts = text.split(/至|到|~/);
        draft.startTime = parts[0].trim() || '2026-09-01 08:00:00';
        draft.endTime = parts[1]?.trim() || '2026-09-02 18:00:00';
      } else if (text.includes('明天')) {
        draft.startTime = '2026-09-02 08:00:00';
        draft.endTime = '2026-09-02 18:00:00';
      } else if (text.includes('今天') || text.includes('下午')) {
        draft.startTime = '2026-09-01 12:00:00';
        draft.endTime = '2026-09-01 18:00:00';
      } else {
        draft.startTime = '2026-09-01 08:00:00';
        draft.endTime = '2026-09-02 18:00:00';
      }
    } else if (currentDraft.currentField === 'timeRange' && text.length > 0) {
      if (text.includes('至')) {
        const parts = text.split('至');
        draft.startTime = parts[0].trim();
        draft.endTime = parts[1].trim();
      } else {
        draft.startTime = '2026-09-01 08:00:00';
        draft.endTime = '2026-09-02 18:00:00';
      }
    }

    return draft;
  };

  // =========================================================================
  // 核心业务流程 4：问答模式（智能解答“什么时间/哪颗卫星/什么载荷能拍摄某地”并提供直达方案）
  // =========================================================================
  const handleQAFlow = (userText: string) => {
    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'qa',
    };

    setMessages(prev => [...prev, newUserMsg]);

    // 智能提取问答中的目标地名
    let targetLocation = '北京';
    if (userText.includes('北京')) targetLocation = '北京';
    else if (userText.includes('西湖')) targetLocation = '杭州西湖';
    else if (userText.includes('千岛湖')) targetLocation = '千岛湖';
    else if (userText.includes('之江')) targetLocation = '之江实验室';
    else if (userText.includes('宁波') || userText.includes('港口')) targetLocation = '宁波舟山港';
    else if (userText.includes('上海')) targetLocation = '上海';
    else if (userText.includes('广州') || userText.includes('深圳')) targetLocation = '大湾区';
    else {
      const match = userText.match(/(?:拍摄|观测|监测|看|拍)([\u4e00-\u9fa5a-zA-Z0-9]+)/);
      if (match && match[1]) {
        targetLocation = match[1].replace(/[？?吗呢的]/g, '').trim() || '目标区域';
      }
    }

    const qaWindowOptions: QAWindowOption[] = [
      {
        id: 'qa-win-1',
        satelliteName: '云尖沐曦号',
        satelliteCode: 'YJ-MX-01',
        timeRange: '2026-09-01 10:24:15 - 10:31:00',
        payload: '智能宽幅多光谱相机 + 边缘AI加速模组',
        resolution: '0.5m 全色 / 2.0m 多光谱',
        maxElevation: 78.5,
        swathWidth: '25 km 宽幅',
      },
      {
        id: 'qa-win-2',
        satelliteName: '之江天目01号',
        satelliteCode: 'ZJ-TM-01',
        timeRange: '2026-09-01 14:28:10 - 14:35:40',
        payload: '高分辨率红外热成像仪',
        resolution: '0.75m 高分光学 / 热红外测温',
        maxElevation: 64.2,
        swathWidth: '20 km',
      },
      {
        id: 'qa-win-3',
        satelliteName: '天工探索二号',
        satelliteCode: 'TG-02',
        timeRange: '2026-09-02 09:18:30 - 09:25:00',
        payload: '合成孔径雷达 (SAR) 载荷',
        resolution: '1.0m C波段雷达 (全天候/穿透云雾)',
        maxElevation: 71.0,
        swathWidth: '35 km',
      },
      {
        id: 'qa-win-4',
        satelliteName: '天巡者03号',
        satelliteCode: 'TX-03',
        timeRange: '2026-09-02 15:45:15 - 15:52:00',
        payload: '高光谱成像仪 + 大容量固存',
        resolution: '0.5m 超高分相机 (高光谱地物反演)',
        maxElevation: 58.6,
        swathWidth: '22 km',
      }
    ];

    const thinking = `1. 用户意图识别：目标区域【${targetLocation}】星地时空轨道窗口与载荷可用性问答查询。
2. 动力学与星座几何解算：
   - 检索未来 48 小时在轨星座覆盖拓扑（云尖沐曦号、之江天目01号、天工探索二号、天巡者03号）。
   - 过滤过境仰角 > 50° 的有效观测几何窗口，匹配光学、红外与微波雷达等对应载荷。
3. 生成结构化回答：列出推荐的拍摄时间、对应卫星名称与配备载荷，并提供直达任务规划的能力。`;

    const content = `经星地轨道动力学与在轨星座几何视场综合解算，未来 48 小时内共有 **4 次优质过境窗口** 可对【${targetLocation}】进行成像观测：

1. **最佳首选（光学高分）**：
   • **时间**：2026-09-01 10:24:15 - 10:31:00
   • **卫星**：云尖沐曦号 (YJ-MX-01)
   • **载荷**：智能宽幅多光谱相机 (0.5m全色/2.0m多光谱)，最大过境仰角 **78.5°**

2. **热红外测温窗口**：
   • **时间**：2026-09-01 14:28:10 - 14:35:40
   • **卫星**：之江天目01号 (ZJ-TM-01)
   • **载荷**：高分辨率红外热成像仪 (0.75m高分光学/热成像)，最大过境仰角 **64.2°**

3. **全天候雷达窗口（穿透云雾）**：
   • **时间**：2026-09-02 09:18:30 - 09:25:00
   • **卫星**：天工探索二号 (TG-02)
   • **载荷**：C波段合成孔径雷达 (SAR 1.0m)，最大过境仰角 **71.0°**

4. **超高光谱精细解译窗口**：
   • **时间**：2026-09-02 15:45:15 - 15:52:00
   • **卫星**：天巡者03号 (TX-03)
   • **载荷**：高光谱成像仪 (0.5m超高分相机)，最大过境仰角 **58.6°**

您可直接点击下方方案卡片快速启动对应任务规划，或输入其他需求继续咨询。`;

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        thinking,
        content,
        mode: 'qa',
        qaTargetLocation: targetLocation,
        qaWindowOptions,
      });
    }, 200);
  };

  // 从问答卡片中直接发起该方案的任务规划
  const handleStartPlanFromQA = (location: string, option?: QAWindowOption) => {
    const promptText = option 
      ? `使用【${option.satelliteName}】在【${option.timeRange.split(' ')[0]}】拍摄【${location}】，载荷选用【${option.payload.split(' ')[0]}】`
      : `拍摄${location}`;
    handleRegularFlow(promptText);
  };

  // =========================================================================
  // 核心业务流程：健康管理模式（星载分系统健康诊断与遥测评估，整合自原“健康管理”对话）
  // =========================================================================
  const handleHealthCheckFlow = (userText: string) => {
    handleCreateHistorySession(userText, 'health-check');
    setWorkspaceKanbanFilter('health');

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newUserMsg]);

    let thinking = `正在调用星载遥测数据库，对指定分系统及时间序列进行深度特征提取与健康状态评估...`;
    let content = '';

    if (userText.includes('蓄电池') || userText.includes('平衡')) {
      thinking = `已提取最近10天能源分系统蓄电池单体电压、充放电电流及温度遥测序列。\n- 单体电压极差统计分析...\n- 荷电状态(SOC)均衡度评估...`;
      content = `【蓄电池平衡分析报告（最近10天）】\n\n1. **总体评估**：蓄电池组整体健康度良好（SOH = 97.5%），无单体严重衰减现象。\n2. **电压极差**：最大单体电压差值维持在 \`14.2 mV\` 以内（阈值 < 25mV），处于安全合规区间。\n3. **平衡状态**：第7天至第9天光照阴影交替期间，串联单体3#出现微弱压差偏移（约 8.5mV），BMS已自动触发主动均衡充电。\n4. **建议**：建议在下次轨道过境时进行一次例行脉冲校准，无需人工干预。`;
    } else if (userText.includes('路由') || userText.includes('状态')) {
      thinking = `正在调用星载时序遥测数据库 (ClickHouse)...\n- 加载评估周期：2026-07-22 ～ 2026-07-31\n- 提取星载路由系统 22 项核心指标时序数据\n- 评估 CPU/内存/磁盘占用率分布及异常事件\n- 关联 Q01 原始告警与同窗时序异常比对\n- 计算健康度评分 (65.5/100) 及评分置信度...`;
      content = `**评估周期**：2026-07-22 ～ 2026-07-31

**实际数据覆盖**：2026-07-22 02:21:25 ～ 2026-07-27 02:26:58

| 健康评分 | 健康状态 | 风险等级 | 数据覆盖率 | 评分置信度 |
| :---: | :---: | :---: | :---: | :---: |
| **65.5 / 100** | **需关注** | **中** | **13.6%** | **低** |

ClickHouse 同窗核心遥测总体判读：健康评分 **65.5 / 100**，原始返回 22/22 项；可判读 3/22 项；满足评分门槛 3/22 项；风险等级 **中**。

### 二、关键遥测项总结

| 参数名称 | 遥测代号 | 遥测定义 | 取值分布 | 正常比例 |
| :--- | :--- | :--- | :--- | :--- |
| CPU占用率 | TML006 | CPU 占用率（%） | 4.0 ～ 87.0 | 96.6%（485/502） |
| 内存占用率 | TML007 | 内存占用率（%） | 26.0 ～ 27.0 | 100.0%（502/502） |
| 磁盘占用率 | TML008 | 磁盘占用率（%） | 52.0 | 0.0%（0/502） |
| 自检状态 | TML013 | 0=正常,1~4=Docker异常,5=容器个数异常,6=启动时间异常 | — | — |
| 最后一次上注文件状态 | TML017 | 0=正常执行 | 0.0（502） | — |
| 管理口状态 | TML021 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet1状态 | TML022 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet2状态 | TML029 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet4状态 | TML036 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet5状态 | TML043 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet6状态 | TML050 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet7状态 | TML057 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet8状态 | TML064 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet9状态 | TML071 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet10状态 | TML078 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet12状态 | TML085 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet13状态 | TML092 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet14状态 | TML099 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet15状态 | TML106 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet16状态 | TML113 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet17状态 | TML120 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet18状态 | TML127 | 0=开启,1=关闭,2=未知 | — | — |

### 三、状态变化趋势

#### 3.1 系统资源趋势
三张折线趋势图

#### 3.2 路由运行与端口状态矩阵
路由运行与端口状态矩阵

### 四、异常提醒与分析

| 参数名称 | 遥测代号 | 异常类型 | 发生次数 | 原始时间 |
| :--- | :--- | :--- | :--- | :--- |
| CPU占用率 | TML006 | Q01｜严重 | 1 | 2026-07-23 14:08:19.189000 |
| CPU占用率 | TML006 | ClickHouse｜同窗时序异常 | 17 | — |
| 磁盘占用率 | TML008 | ClickHouse｜同窗时序异常 | 502 | — |

> 异常证据来源说明：\`Q01\` 提供原始异常事件，\`ClickHouse\` 提供健康结论和同窗异常证据；两类证据分列展示，Q01 不参与健康评分计算。

### 五、风险评估

| 风险维度 | 评估结果 |
| :--- | :--- |
| 异常严重度 | 高 |
| 健康评分口径 | ClickHouse 同窗核心遥测 |
| ClickHouse 时序完整性 | 原始返回 22/22 项；可判读 3/22 项；满足评分门槛 3/22 项；缺失/不可读：TML013、TML021、TML022、TML029、TML036、TML043、TML050、TML057、TML064、TML071、TML078、TML085、TML092、TML099、TML106、TML113、TML120、TML127、TML017 |
| 数据完整性 | ClickHouse 原始返回：22/22 项；可判读：3/22 项；满足评分门槛：3/22 项。 |
| 综合风险 | 中 |

### 六、建议与结论

**建议**
- 建议按既定周期持续观测星载路由关键遥测变化。
- 建议复核本周期评分、异常事件来源及可用遥测记录。
- 建议在后续同一评估时间窗持续观测星载路由遥测状态。

**结论**
- 综合风险 中；健康结论基于 ClickHouse 同窗核心遥测；原始返回 22/22 项；可判读 3/22 项；满足评分门槛 3/22 项。

**评分置信度说明**
本报告覆盖率口径：已按权威规则评价指标占比：已按权威规则完成评价的指标，占全部纳入评估指标的比例。

| 条件 | 评分置信度 |
| :--- | :--- |
| 无可评分证据或评分未生成 | 未评价 |
| 覆盖率小于 50% | 低 |
| 覆盖率 50%（含）至 80%（不含） | 中 |
| 覆盖率 80%（含）及以上 | 高 |`;
    } else {
      const targetSat = selectedSatellite?.name || '云尖沐曦号';
      thinking = `正在对 ${targetSat} 进行全系统遥测综合健康体检...\n- 载荷分系统、姿轨控分系统、能源分系统横向对比...`;
      content = `【卫星综合健康诊断报告】\n\n- **目标卫星**：${targetSat}\n- **在轨天数**：168 天\n- **当前诊断结果**：卫星各分系统运行参数均在设计nominal范围内。\n- **自检结论**：系统整体健康度 **优 (Normal)**，未发现Ⅱ级及以上在轨异常。`;
    }

    activeStreamPendingTimeoutRef.current = setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        thinking,
        content,
      });
    }, 200);
  };

  // =========================================================================
  // 核心业务流程 1：常规模式（多轮对话驱动逐步补全要素，支持自由自然语言输入）
  // =========================================================================
  // （1）用户输入自然语言，如：帮我拍摄之江实验室
  // （2）模型通过多轮对话方式逐步让用户补全信息（支持自然语言回复或快捷选择）：
  //      ① 选用载荷 -> ② 成像地点 -> ③ 是否要在轨计算及模型 -> ④ 任务起止时间
  const handleRegularFlow = (userText: string) => {
    setWorkspaceKanbanFilter('task');

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'regular',
    };

    setMessages(prev => [...prev, newUserMsg]);

    setTimeout(() => {
      // 智能解析用户第一句输入中已经包含的信息
      const parsedDraft = parseRequirementsFromText(userText, {});
      const targetName = userText.replace(/^(请|帮我|立即|安排|执行|拍摄|观测|监测)/g, '').trim() || '目标区域';

      if (!parsedDraft.location) {
        parsedDraft.location = `${targetName} (30.2741° N, 119.9823° E)`;
      }

      // 判断下一个待补全要素
      if (!parsedDraft.payload) {
        parsedDraft.currentField = 'payload';
        parsedDraft.options = [
          '高分多光谱光学相机 (0.5m全色/2m多光谱)',
          '高分辨率红外热成像仪 (热红外测温)',
          '多光谱相机 + 红外热成像仪 (双载荷同步)',
          'C波段合成孔径雷达 (SAR 全天候)'
        ];

        const thinking = `1. 多轮对话意图解析：用户提出观测需求【${targetName}】。
2. 要素完整性检查：
   - 载荷类型：[待补全]
   - 成像地点：【${parsedDraft.location}】
   - 在轨计算需求：[待补全]
   - 任务起止时间：[待补全]
3. 决策：地点已明确为【${parsedDraft.location}】，首轮向用户确认所选用的载荷类型。`;

        const content = `收到您关于【${parsedDraft.location || targetName}】的观测规划需求！\n请问本次任务您希望使用哪种**载荷类型**？（支持直接自然语言输入描述，如“用高分光学相机”等）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: parsedDraft,
        });
      } else if (!parsedDraft.location) {
        parsedDraft.currentField = 'location';
        parsedDraft.options = [
          '北京市核心城区及周边 (39.9042°N, 116.4074°E)',
          '之江实验室核心园区及周边 (30.2741°N, 119.9823°E)',
          '杭州西湖核心风景名胜区 (30.2435°N, 120.1415°E)',
          '千岛湖生态保护与水体监测区 (29.6042°N, 119.0528°E)',
          '宁波舟山港口及周边水域 (29.8821°N, 121.5642°E)'
        ];

        const thinking = `1. 多轮对话意图解析：用户已指定载荷【${parsedDraft.payload}】。
2. 要素完整性检查：
   - 载荷类型：【${parsedDraft.payload}】
   - 成像地点：[待补全]
   - 在轨计算需求：[待补全]
   - 任务起止时间：[待补全]
3. 决策：推进确认具体的成像地点或地理坐标。`;

        const content = `已记录选用载荷为 **${parsedDraft.payload}**。\n请确认本次任务的具体**成像地点**或目标地理坐标（支持自由自然语言输入）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: parsedDraft,
        });
      } else if (!parsedDraft.onboardComputing) {
        parsedDraft.currentField = 'onboardComputing';
        parsedDraft.options = [
          '需要在轨计算：星载轻量化云雪快筛 + 红外火灾检测模型',
          '需要在轨计算：水体富营养化与叶绿素反演模型',
          '需要在轨计算：高分建筑与道路变化检测模型',
          '不需要在轨计算：原始码流直接对地下传'
        ];

        const thinking = `1. 多轮对话意图解析：用户已指定载荷【${parsedDraft.payload}】与地点【${parsedDraft.location}】。
2. 要素完整性检查：推进确认是否需要在轨智能计算及算法模型。`;

        const content = `已记录选用载荷为 **${parsedDraft.payload}**，地点为 **${parsedDraft.location}**。\n请问该任务**是否需要在轨计算**？如果需要，请指定算法模型（支持自由输入自然语言回复）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: parsedDraft,
        });
      } else if (!parsedDraft.startTime) {
        parsedDraft.currentField = 'timeRange';
        parsedDraft.options = [
          '2026-09-01 08:00:00 至 2026-09-02 18:00:00 (近48小时)',
          '2026-09-01 12:00:00 至 2026-09-01 18:00:00 (今日下午窗口)',
          '2026-09-02 08:00:00 至 2026-09-03 20:00:00 (未来3天窗口)',
          '2026-09-01 00:00:00 至 2026-09-07 23:59:59 (本周长周期)'
        ];

        const thinking = `1. 多轮对话意图解析：载荷、地点及在轨计算需求已明确。
2. 要素完整性检查：推进确认任务观测起止时间窗口。`;

        const content = `请指定本次任务的**开始时间与结束时间**范围（支持自然语言如“明天下午”、“9月1日到2日”等）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: parsedDraft,
        });
      } else {
        // 用户第一句就已经提供了全部要素
        parsedDraft.currentField = 'completed';
        const thinking = `1. 用户输入中已完整提取全量任务要素（载荷、地点、在轨计算、时段）。
2. 列出全量要素清单，让用户确认后启动可行性分析。`;
        const content = `5 项任务关键要素已全部识别完毕！请确认以下任务要素信息是否准确无误：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_review',
          requirementDraft: parsedDraft,
        });
      }
    }, 250);
  };

  // 多轮对话：逐步引导推进字段补全（支持输入框自然语言自由输入 或 点击快捷选项）
  const handleProcessRequirementStep = (userInputText: string) => {
    // 获取当前正在进行要素补全的消息
    const lastReqMsg = [...messages].reverse().find(m => m.regularStage === 'requirement_completion');
    const prevDraft: TaskRequirementDraft = lastReqMsg?.requirementDraft || {
      location: '之江实验室园区 (30.2741° N, 119.9823° E)',
      currentField: 'payload'
    };

    // 智能从用户的自然语言或选项中提取信息
    const updatedDraft = parseRequirementsFromText(userInputText, prevDraft);

    // 标记上一条消息完成
    setMessages(prev => prev.map(m => {
      if (m.regularStage === 'requirement_completion') {
        return { ...m, isActionConfirmed: true };
      }
      return m;
    }));

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userInputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'regular',
    };

    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      // 1. 检查是否还缺 载荷
      if (!updatedDraft.payload) {
        updatedDraft.currentField = 'payload';
        updatedDraft.options = [
          '高分多光谱光学相机 (0.5m全色/2m多光谱)',
          '高分辨率红外热成像仪 (热红外测温)',
          '多光谱相机 + 红外热成像仪 (双载荷同步)',
          'C波段合成孔径雷达 (SAR 全天候)'
        ];

        const thinking = `1. 多轮对话意图解析：目标成像地点已锁定为【${updatedDraft.location}】。
2. 推进下一要素检查：选用载荷类型。
3. 提示用户输入所需载荷或选择快捷载荷类型。`;

        const content = `已设定成像地点为 **${updatedDraft.location}**。\n请问本次任务您希望使用哪种**载荷类型**？（支持直接自然语言输入描述，如“用高分光学相机”等）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: updatedDraft,
        });
      }
      // 2. 检查是否还缺 地点（仅在地点确实为空时才询问）
      else if (!updatedDraft.location) {
        updatedDraft.currentField = 'location';
        updatedDraft.options = [
          '北京市核心城区及周边 (39.9042°N, 116.4074°E)',
          '之江实验室核心园区及周边 (30.2741°N, 119.9823°E)',
          '杭州西湖核心风景名胜区 (30.2435°N, 120.1415°E)',
          '千岛湖生态保护与水体监测区 (29.6042°N, 119.0528°E)',
          '宁波舟山港口及周边水域 (29.8821°N, 121.5642°E)'
        ];

        const thinking = `1. 自然语言解析已录入载荷：【${updatedDraft.payload || userInputText}】。
2. 推进下一要素检查：成像地点。
3. 提示用户输入地点名称、经纬度或选择快捷区域。`;

        const content = `已记录选用载荷为 **${updatedDraft.payload || userInputText}**。\n请确认本次任务的具体**成像地点**或目标地理坐标（支持自由自然语言输入）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: updatedDraft,
        });
      }
      // 3. 检查是否还缺 在轨计算及模型
      else if (!updatedDraft.onboardComputing) {
        updatedDraft.currentField = 'onboardComputing';
        updatedDraft.options = [
          '需要在轨计算：星载轻量化云雪快筛 + 红外火灾检测模型',
          '需要在轨计算：水体富营养化与叶绿素反演模型',
          '需要在轨计算：高分建筑与道路变化检测模型',
          '不需要在轨计算：原始码流直接对地下传'
        ];

        const thinking = `1. 自然语言解析已确认载荷【${updatedDraft.payload}】与地点【${updatedDraft.location}】。
2. 推进下一要素检查：是否需要在轨智能计算及算法模型类型。
3. 提示用户输入计算需求或选择星载 AI 模型。`;

        const content = `已记录载荷为 **${updatedDraft.payload}**，成像地点为 **${updatedDraft.location}**。\n请问该任务**是否需要在轨计算**？如果需要，请指定算法模型（支持自由输入自然语言回复）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: updatedDraft,
        });
      }
      // 4. 检查是否还缺 时间范围
      else if (!updatedDraft.startTime) {
        updatedDraft.currentField = 'timeRange';
        updatedDraft.options = [
          '2026-09-01 08:00:00 至 2026-09-02 18:00:00 (近48小时)',
          '2026-09-01 12:00:00 至 2026-09-01 18:00:00 (今日下午窗口)',
          '2026-09-02 08:00:00 至 2026-09-03 20:00:00 (未来3天窗口)',
          '2026-09-01 00:00:00 至 2026-09-07 23:59:59 (本周长周期)'
        ];

        const thinking = `1. 自然语言解析已录入在轨计算模式：【${updatedDraft.onboardComputing}】。
2. 推进最终要素检查：任务观测起止时间窗口。
3. 提示用户输入时间范围（如明天、后天、特定时段等）。`;

        const content = `已配置在轨计算方案为 **${updatedDraft.onboardComputing}**。\n最后，请指定本次任务的**开始时间与结束时间**范围（支持自然语言如“明天”、“今天下午”等）：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_completion',
          requirementDraft: updatedDraft,
        });
      }
      // 5. 全部要素补齐 -> 列出全量要素清单让用户确认
      else {
        if (!updatedDraft.startTime) {
          updatedDraft.startTime = '2026-09-01 08:00:00';
          updatedDraft.endTime = '2026-09-02 18:00:00';
        }

        updatedDraft.currentField = 'completed';

        const thinking = `1. 5 要素通过自然语言多轮交互已全量收集完毕：
   - 选用载荷：${updatedDraft.payload}
   - 成像地点：${updatedDraft.location}
   - 在轨计算模型：${updatedDraft.onboardComputing}
   - 任务起止时间：${updatedDraft.startTime} ～ ${updatedDraft.endTime}
2. 规则要求：全量列出要素清单，待用户确认后，再启动星地轨道动力学与气象可行性解算。`;

        const content = `5 项任务关键要素已全部收集完毕！请确认以下任务要素信息是否准确无误：`;

        streamAssistantResponse({
          messageId: asstMsgId,
          thinking,
          content,
          mode: 'regular',
          regularStage: 'requirement_review',
          requirementDraft: updatedDraft,
        });
      }
    }, 250);
  };

  // 用户确认全量任务要素后，触发可行性解算：可行则返回可选时段方案，不可行则流程终止
  const handleConfirmRequirementsReady = (messageId: string) => {
    if (messageId === 'confirm-innovative-start') {
      handleInnovativeTaskFlow('确认');
      return;
    }
    if (messageId === 'cancel-innovative-start') {
      handleInnovativeTaskFlow('取消');
      return;
    }
    if (messageId.startsWith('cancel-requirement:')) {
      const targetId = messageId.replace('cancel-requirement:', '');
      setMessages(prev => prev.map(m => (m.id === targetId ? { ...m, isActionConfirmed: true, isActionCancelled: true } : m)));

      const userMsgId = 'msg-' + Date.now();
      const asstMsgId = 'msg-' + (Date.now() + 1);

      setMessages(prev => [...prev, {
        id: userMsgId,
        role: 'user',
        content: '取消本次任务规划',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: 'regular',
      }]);

      setTimeout(() => {
        streamAssistantResponse({
          messageId: asstMsgId,
          thinking: '用户取消了本次任务要素确认，任务规划流程已终止。',
          content: '好的，已为您取消本次任务规划，流程已终止。如需重新发起，请描述新的观测需求。',
          mode: 'regular',
        });
      }, 200);
      return;
    }

    // 标记上一条要素确认消息已确认
    let confirmedDraft: TaskRequirementDraft = {};
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        confirmedDraft = msg.requirementDraft || {};
        return { ...msg, isActionConfirmed: true };
      }
      return msg;
    }));

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: '确认上述任务要素信息，开始可行性分析与轨道方案解算',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'regular',
    };

    setMessages(prev => [...prev, userMsg]);

    const activeSat = satellites[0]; // 云尖沐曦号

    // 可行性判定规则：目标区域超出星座覆盖范围（境外/极地/远洋）判定为不可行
    const isOutOfCoverage = /境外|海外|南极|北极|太平洋|大西洋|印度洋/i.test(confirmedDraft.location || '');

    if (isOutOfCoverage) {
      const infeasibleThinking = `1. 提取经用户最终确认的 5 项任务要素：目标区域=${confirmedDraft.location}。
2. 星历轨道与几何视场可行性解算：
   - 现有星座（云尖沐曦号 / 天巡者03号等）轨道倾角与回归周期无法覆盖该区域。
   - 在设定的任务起止时间窗内，无满足最低过境仰角要求的可用窗口。
3. 综合可行性判定：【不可行 (INFEASIBLE)】。终止本次任务规划流程。`;

      const infeasibleContent = `很抱歉，经星地轨道动力学与几何视场联合解算，该任务**【不可行】**：\n目标区域【${confirmedDraft.location}】超出现有星座覆盖范围，在您指定的时间窗口内无可用过境卫星。\n本次任务规划流程已终止，您可以重新描述任务需求或调整观测区域后再次尝试。`;

      setTimeout(() => {
        streamAssistantResponse({
          messageId: asstMsgId,
          thinking: infeasibleThinking,
          content: infeasibleContent,
          mode: 'regular',
        });
      }, 200);
      return;
    }

    const thinking = `1. 提取经用户最终确认的 5 项任务要素。
2. 星历轨道与几何视场可行性解算：
   - 执行卫星：云尖沐曦号 (SSO 太阳同步轨道，降交点 10:30)
   - 目标重访：在设定时间窗内存在 2 组最佳高仰角过境窗口 (78.5° 与 64.2°)
   - 侧摆角需求：+4.8° / -6.2° (处于反作用飞轮安全力矩包络内)
   - 气象预报：ECMWF 数值预报云量均 < 8%，满足无云高分推扫要求
3. 综合可行性判定：【完全可行 (FEASIBLE)】。生成 2 组优选方案供用户选择。`;

    const content = `经星地轨道动力学、载荷侧摆包络与气象云量联合解算，该任务**【完全可行】**！为您生成以下可选时段方案，请选择：`;

    const timeSlotOptions: TimeSlotOption[] = [
      {
        id: 'slot-1',
        timeRange: '2026-09-01 14:28:30 (优选主窗口)',
        satellite: activeSat.name,
        elevation: 78.5,
        swathWidth: '25 km 宽幅',
        cloudProbability: '< 5%',
        selected: true,
      },
      {
        id: 'slot-2',
        timeRange: '2026-09-02 10:15:20 (次选备用窗口)',
        satellite: activeSat.name,
        elevation: 64.2,
        swathWidth: '25 km 宽幅',
        cloudProbability: '< 8%',
        selected: false,
      }
    ];

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        thinking,
        content,
        mode: 'regular',
        regularStage: 'time_selection',
        timeSlotOptions,
        requirementDraft: confirmedDraft,
      });
    }, 200);
  };

  // （4）用户选择方案后，模型生成结构化任务单，让用户确认。
  const handleConfirmTimeSlot = (messageId: string, slot: TimeSlotOption) => {
    // 标记上一条消息的时段已选定，并取出用户前面已补全确认的任务要素
    let confirmedDraft: TaskRequirementDraft = {};
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.timeSlotOptions) {
        confirmedDraft = msg.requirementDraft || {};
        return {
          ...msg,
          isActionConfirmed: true,
          timeSlotOptions: msg.timeSlotOptions.map(opt => ({
            ...opt,
            selected: opt.id === slot.id
          }))
        };
      }
      return msg;
    }));

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: `已选定方案：${slot.timeRange}（${slot.satellite}）`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'regular',
    };

    setMessages(prev => [...prev, userMsg]);

    // 从成像地点文本中提取经纬度坐标（若无坐标则回退默认之江实验室坐标）
    const coordMatch = (confirmedDraft.location || '').match(/([\d.]+°\s*[NS],?\s*[\d.]+°\s*[EW])/i);
    const targetName = (confirmedDraft.location || '之江实验室及周边林区').replace(/\s*\([^)]*\)\s*/g, '').trim();
    const coordinates = coordMatch ? coordMatch[1] : '30.2741° N, 119.9823° E';

    const thinking = `1. 提取用户选定方案：${slot.timeRange}，执行星=${slot.satellite}。
2. 绑定任务要素：目标=${targetName}，坐标=${coordinates}，载荷=${confirmedDraft.payload}，在轨计算=${confirmedDraft.onboardComputing}。
3. 封装结构化任务单流水号：TASK-YJ-20260901-089，优先级=高 (P1)。
4. 提示用户进行最终确认。`;

    const content = `已为您生成【结构化任务单】，请核对并确认：`;

    const structuredOrder: StructuredTaskOrder = {
      orderId: 'TASK-YJ-20260901-089',
      targetName,
      coordinates,
      selectedTime: slot.timeRange,
      satelliteName: slot.satellite,
      sensorMode: confirmedDraft.payload || '高分多光谱推扫 + 红外同步测温',
      resolution: '0.5m 全色 / 2.0m 多光谱',
      onboardComputing: confirmedDraft.onboardComputing || '是（星载边缘云判 + 红外火灾检测模型）',
      startTime: confirmedDraft.startTime,
      endTime: confirmedDraft.endTime,
      priority: '高 (P1)',
      createdTime: new Date().toLocaleString(),
    };

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        thinking,
        content,
        mode: 'regular',
        regularStage: 'task_order_review',
        structuredOrder,
        requirementDraft: confirmedDraft,
      });
    }, 200);
  };

  // （5）用户确认结构化任务单后，发给地面模型，之后用“阶段步骤”的流程图形式呈现地面模型处理过程：
  //      地面模型接收任务 ➔ 任务意图解析 ➔ 任务包组装与发送 ➔ 任务发送成功
  // （7）星上所有结果下传后，解析日志，呈现星上处理流程（含成像数据落盘失败任务重规划分支演示）
  const handleConfirmTaskOrder = (messageId: string) => {
    if (messageId.startsWith('cancel-task-order:')) {
      const targetId = messageId.replace('cancel-task-order:', '');
      setMessages(prev => prev.map(m => (m.id === targetId ? { ...m, isActionConfirmed: true, isActionCancelled: true } : m)));

      const userMsgId = 'msg-' + Date.now();
      const asstMsgId = 'msg-' + (Date.now() + 1);

      setMessages(prev => [...prev, {
        id: userMsgId,
        role: 'user',
        content: '取消本次任务规划',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: 'regular',
      }]);

      setTimeout(() => {
        streamAssistantResponse({
          messageId: asstMsgId,
          thinking: '用户取消了结构化任务单确认，任务规划流程已终止。',
          content: '好的，已为您取消本次任务规划，流程已终止。如需重新发起，请描述新的观测需求。',
          mode: 'regular',
        });
      }, 200);
      return;
    }

    // 标记上一条消息的任务单已确认，并取出结构化任务单与要素草稿
    let confirmedOrder: StructuredTaskOrder | undefined;
    let confirmedDraft: TaskRequirementDraft = {};
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        confirmedOrder = msg.structuredOrder;
        confirmedDraft = msg.requirementDraft || {};
        return {
          ...msg,
          isActionConfirmed: true,
        };
      }
      return msg;
    }));

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: '确认结构化任务单，立即发起任务',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'regular',
    };

    setMessages(prev => [...prev, userMsg]);

    const thinking = `1. 结构化任务单 ${confirmedOrder?.orderId} 已经用户最终确认。
2. 交由地面模型完成任务解析、打包组装与上注，任务正式发起。
3. 提示用户到任务管理看板页跟踪地面任务规划与星上处理进度。`;

    const content = '任务已发起，请在右侧任务管理看板页查看执行进度。';

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        thinking,
        content,
        mode: 'regular',
        showGoToTaskButton: true,
        onFinish: () => {
          if (confirmedOrder) {
            launchRegularTask(confirmedOrder, confirmedDraft);
          }
        }
      });
    }, 200);
  };

  // 确认任务单后发起常规任务：跳转任务管理看板对应详情页，地面任务规划逐步呈现，星上处理流程默认折叠且直接呈现完成状态
  const launchRegularTask = (order: StructuredTaskOrder, draft: TaskRequirementDraft) => {
    const activeSat = satellites.find(s => s.name === order.satelliteName) || satellites[0];
    // 常规任务详情页仅地面阶段实时动画呈现，失败也只会发生在地面规划阶段内
    const { outcome, failStepIndex, failureReason } = decideTaskOutcome(GROUND_STAGE_STEP_COUNT);

    const newTask: PlannedTaskItem = {
      id: order.orderId,
      satelliteName: order.satelliteName,
      satelliteCode: activeSat.code,
      groundStation: '常规任务地面站',
      timeRange: `${order.startTime || ''} ~ ${order.endTime || ''}`,
      isImaging: true,
      imagingTypeDesc: order.sensorMode,
      computingTask: order.onboardComputing || '无',
      starMode: '单星',
      targetLocation: order.targetName,
      taskMode: '常规模式',
      payload: order.sensorMode,
      isLive: true,
      outcome,
      failStepIndex,
      failureReason,
    };

    setSingleOrbitInjectedTask(newTask);
    setWorkspaceKanbanFilter('task');
    setWorkspaceViewMode(prev => (prev === 'chat' ? 'split' : prev));
    setIsChatLocked(true);

    // 动画结束（成功走完地面全部步骤，或失败在对应步骤处冻结）后，向对话流反馈结果并解锁输入框
    const animatedSteps = outcome === 'failure' ? Math.min((failStepIndex ?? 0) + 1, GROUND_STAGE_STEP_COUNT) : GROUND_STAGE_STEP_COUNT;
    setTimeout(() => {
      const feedbackMsgId = 'msg-' + Date.now();
      streamAssistantResponse({
        messageId: feedbackMsgId,
        content: outcome === 'failure' ? `任务失败：${failureReason}。` : '当前任务已完成。',
        mode: 'regular',
      });
      setIsChatLocked(false);
    }, animatedSteps * FLOW_STEP_INTERVAL_MS + 300);

    // 星上处理流程默认直接呈现完成状态，成果同步追加到【成果管理】页面（任务失败时不生成成果）
    if (outcome === 'success') {
      if (selectedSessionId) {
        setHistorySessions(prev => prev.map(s => {
          if (s.id === selectedSessionId) {
            return { ...s, hasResultBadge: true };
          }
          return s;
        }));
      }

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const locName = draft.location || order.targetName || '宁波舟山港口及周边水域';
      const cleanTitleName = locName.split(' ')[0] || '宁波舟山港';

      const newAch: AchievementItem = {
        id: 'ach-new-' + Date.now(),
        title: `${cleanTitleName}红外热成像与火情监测成果`,
        imagingMode: '热红外反演',
        satelliteName: order.satelliteName,
        cameraType: order.sensorMode,
        captureTime: nowStr,
        imageUrl: SAMPLE_RESULT_IMAGES.fireDetection,
        resolution: order.resolution || '0.5m',
        location: locName,
        fileSize: '46.8 MB',
        cloudCoverage: '0.5%',
      };

      setAchievements(prev => [newAch, ...prev]);
    }
  };

  // 兼容辅助
  const handleConfirmPlanAndUpload = (messageId: string) => {
    handleConfirmTaskOrder(messageId);
  };


  // 通用打字机流式呈现工具函数：逐字输出思考过程与正文内容，完成后挂载结构化数据/交互卡片
  const streamAssistantResponse = ({
    messageId,
    thinking = '',
    content = '',
    mode,
    regularStage,
    timeSlotOptions,
    structuredOrder,
    requirementDraft,
    onboardFlowType,
    timeSeriesStage,
    timeSeriesPlans,
    activeDayIndex,
    flowSteps,
    currentStepIndex,
    resultImage,
    fireDetected,
    fireHotspots,
    qaTargetLocation,
    qaWindowOptions,
    showGoToAppButton,
    showGoToAchievementButton,
    showGoToTaskButton,
    isOnboardFlowPending,
    timeSeriesHighRiskLocations,
    confirmChoice,
    table,
    analysisResult,
    quickReplyOptions,
    onFinish,
  }: {
    messageId: string;
    thinking?: string;
    content?: string;
    mode?: 'regular' | 'single_orbit' | 'time_series' | 'qa';
    regularStage?: 'requirement_completion' | 'requirement_review' | 'time_selection' | 'task_order_review' | 'ground_model_flow' | 'onboard_model_flow' | 'plan_review' | 'execution_flow';
    timeSlotOptions?: TimeSlotOption[];
    structuredOrder?: StructuredTaskOrder;
    requirementDraft?: TaskRequirementDraft;
    onboardFlowType?: 'normal' | 'replanning';
    timeSeriesStage?: 'template_ready' | 'plan_list_review' | 'day_executing';
    timeSeriesPlans?: TimeSeriesDayPlan[];
    activeDayIndex?: number;
    flowSteps?: FlowStepItem[];
    currentStepIndex?: number;
    resultImage?: string;
    fireDetected?: boolean;
    fireHotspots?: { x: number; y: number; temp: string; area: string }[];
    qaTargetLocation?: string;
    qaWindowOptions?: QAWindowOption[];
    showGoToAppButton?: boolean;
    showGoToAchievementButton?: boolean;
    showGoToTaskButton?: boolean;
    isOnboardFlowPending?: boolean;
    timeSeriesHighRiskLocations?: { name: string; lng: number; lat: number }[];
    confirmChoice?: boolean;
    table?: { time: string; location: string }[];
    analysisResult?: {
      location: string;
      locationType: string;
      fireDetected: boolean;
      area?: number;
      image?: string;
    };
    quickReplyOptions?: string[];
    onFinish?: () => void;
  }) => {
    // 初始空消息入队
    const asstMsg: ChatMessage = {
      id: messageId,
      role: 'assistant',
      thinkingProcess: '',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    if (activeStreamIntervalRef.current) {
      clearInterval(activeStreamIntervalRef.current);
      activeStreamIntervalRef.current = null;
    }
    if (activeStreamPendingTimeoutRef.current) {
      clearTimeout(activeStreamPendingTimeoutRef.current);
      activeStreamPendingTimeoutRef.current = null;
    }

    setMessages(prev => [...prev, asstMsg]);
    setIsGenerating(true);

    let thinkingCharIndex = 0;
    let contentCharIndex = 0;
    const thinkingTotal = thinking.length;
    const contentTotal = content.length;

    const streamInterval = setInterval(() => {
      // 1. 打字机逐字输出思考过程
      if (thinkingCharIndex < thinkingTotal) {
        // 每次前进一步 2~4 个字符（兼顾打字机质感与响应速度）
        const step = Math.min(3, thinkingTotal - thinkingCharIndex);
        thinkingCharIndex += step;
        const currentThinking = thinking.slice(0, thinkingCharIndex);

        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              thinkingProcess: currentThinking,
            };
          }
          return msg;
        }));
      }
      // 2. 思考过程完成后，打字机逐字输出正文内容
      else if (contentCharIndex < contentTotal) {
        const step = Math.min(2, contentTotal - contentCharIndex);
        contentCharIndex += step;
        const currentContent = content.slice(0, contentCharIndex);

        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              thinkingProcess: thinking || undefined,
              content: currentContent,
            };
          }
          return msg;
        }));
      }
      // 3. 完成全部打字输出
      else {
        clearInterval(streamInterval);
        if (activeStreamIntervalRef.current === streamInterval) {
          activeStreamIntervalRef.current = null;
        }
        setIsGenerating(false);

        // 流式打字完成后挂载后续阶段的交互/卡片
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              thinkingProcess: thinking || undefined,
              content,
              regularStage,
              timeSlotOptions,
              structuredOrder,
              requirementDraft,
              onboardFlowType,
              timeSeriesStage,
              timeSeriesPlans,
              activeDayIndex,
              flowSteps,
              currentStepIndex,
              resultImage,
              fireDetected,
              fireHotspots,
              qaTargetLocation,
              qaWindowOptions,
              showGoToAppButton,
              showGoToAchievementButton,
              showGoToTaskButton,
              isOnboardFlowPending,
              timeSeriesHighRiskLocations,
              confirmChoice,
              table,
              analysisResult,
              quickReplyOptions,
            };
          }
          return msg;
        }));

        if (onFinish) {
          onFinish();
        }
      }
    }, 20); // 20ms 打字机平滑频率

    activeStreamIntervalRef.current = streamInterval;
  };

  // 阶段步骤流程图递进执行器（支持任意模式与真实步骤序列）
  const runFlowSteps = (
    messageId: string, 
    stepsTemplate: FlowStepItem[] = REGULAR_FLOW_STEPS, 
    onFinishImage?: string
  ) => {
    let currentIdx = 0;
    const totalSteps = stepsTemplate.length;

    const interval = setInterval(() => {
      currentIdx += 1;
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const updatedSteps = stepsTemplate.map((s, i) => {
            if (i < currentIdx) return { ...s, status: 'success' as const };
            if (i === currentIdx) return { ...s, status: 'running' as const };
            return { ...s, status: 'pending' as const };
          });

          return {
            ...msg,
            flowSteps: updatedSteps,
            currentStepIndex: currentIdx,
            resultImage: currentIdx >= totalSteps ? (onFinishImage || SAMPLE_RESULT_IMAGES.fireDetection) : undefined,
            fireDetected: currentIdx >= totalSteps,
          };
        }
        return msg;
      }));

      if (currentIdx >= totalSteps) {
        clearInterval(interval);
      }
    }, 650);
  };

  // =========================================================================
  // 核心业务流程 2：一轨模式业务逻辑（多轮对话驱动）
  // =========================================================================
  // （1）只有卫星入境时的前一分钟才能点击，超时不可点击（ToolCards 中已做入境前 1 分钟校验）
  // （2）点击后仅预填指令文案，实际卫星数量判定与分支在用户发送指令后进行
  const handleSelectSingleOrbit = () => {
    const eligibleSatellites = satellites.filter(s => s.status === 'in-bound' && s.linkState === 'success');

    if (eligibleSatellites.length === 0) {
      return;
    }

    setPrefillPrompt('请立即拍照，并检测火灾');
  };

  // 将新发起的一轨成像任务注入任务管理看板，并自动切换看板区展示与锁定输入框
  const launchSingleOrbitTask = (sat: Satellite) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const endDate = new Date(now.getTime() + 8 * 60 * 1000);
    const endStr = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:${pad(endDate.getSeconds())}`;
    // 一轨成像详情页地面+星上均实时动画呈现，失败可能发生在任一阶段
    const totalSteps = GROUND_STAGE_STEP_COUNT + ONBOARD_STAGE_STEP_COUNT;
    const { outcome, failStepIndex, failureReason } = decideTaskOutcome(totalSteps);

    const newTask: PlannedTaskItem = {
      id: 'TASK-SO-' + Date.now(),
      satelliteName: sat.name,
      satelliteCode: sat.code,
      groundStation: '一轨即时成像地面站',
      timeRange: `${startStr} ~ ${endStr}`,
      isImaging: true,
      imagingTypeDesc: '一轨即时应急成像与火灾检测',
      computingTask: '火灾检测',
      starMode: '单星',
      targetLocation: '待定',
      taskMode: '一轨成像',
      payload: sat.sensorPayload,
      isLive: true,
      outcome,
      failStepIndex,
      failureReason,
    };

    setSingleOrbitInjectedTask(newTask);
    setWorkspaceKanbanFilter('task');
    setWorkspaceViewMode(prev => (prev === 'chat' ? 'split' : prev));
    setIsChatLocked(true);

    // 动画结束（成功走完全部步骤，或失败在对应步骤处冻结）后，向对话流反馈结果并解锁输入框
    const animatedSteps = outcome === 'failure' ? Math.min((failStepIndex ?? 0) + 1, totalSteps) : totalSteps;
    setTimeout(() => {
      const feedbackMsgId = 'msg-' + Date.now();
      streamAssistantResponse({
        messageId: feedbackMsgId,
        content: outcome === 'failure' ? `任务失败：${failureReason}。` : '当前任务已完成。',
        mode: 'single_orbit',
      });
      setIsChatLocked(false);
    }, animatedSteps * FLOW_STEP_INTERVAL_MS + 300);
  };

  // （3）用户发送指令后，依据当前处于窗口期的在线卫星数量分流：单星直接发起，多星则引导选择
  const handleSingleOrbitFlow = (userText: string) => {
    setWorkspaceKanbanFilter('task');

    const eligibleSatellites = satellites.filter(s => s.status === 'in-bound' && s.linkState === 'success');

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'single_orbit',
    };
    setMessages(prev => [...prev, newUserMsg]);

    if (eligibleSatellites.length > 1) {
      // 多颗卫星在线：引导用户以推荐问题胶囊形式选择执行卫星
      const satNames = eligibleSatellites.map(s => `“${s.name}”`).join('、');
      setTimeout(() => {
        streamAssistantResponse({
          messageId: asstMsgId,
          content: `检测到${satNames}都处于任务执行窗口期，请选择执行任务的卫星。`,
          mode: 'single_orbit',
          quickReplyOptions: eligibleSatellites.map(s => s.name),
        });
      }, 200);
      return;
    }

    // 仅 1 颗卫星在线（或无入境窗口卫星时兜底取当前入境卫星）：直接发起任务
    const activeSat = eligibleSatellites[0] || satellites.find(s => s.status === 'in-bound') || satellites[0];
    setSelectedSatelliteId(activeSat.id);
    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        content: `检测到“${activeSat.name}”处于任务执行窗口期，发起一轨成像任务，任务进度请到任务看板区查看。`,
        mode: 'single_orbit',
        showGoToTaskButton: true,
        onFinish: () => {
          launchSingleOrbitTask(activeSat);
        }
      });
    }, 200);
  };

  // 用户在多星选择胶囊中点击某颗卫星后，作为用户消息发送并继续发起任务
  const handleSelectSingleOrbitQuickReply = (messageId: string, satName: string) => {
    if (satName === '中断任务' || satName === '开启任务') {
      // 林火监测「进度同步」推荐的快捷操作：复用创新应用状态机，走中断/开启对话流
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, isActionConfirmed: true } : m)));
      handleInnovativeTaskFlow(satName);
      return;
    }

    const sat = satellites.find(s => s.name === satName);
    if (!sat) return;

    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, isActionConfirmed: true } : m)));
    setSelectedSatelliteId(sat.id);

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: satName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'single_orbit',
    }]);

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        content: `发起“${satName}”的一轨成像任务，请在右侧任务管理看板页查看执行进度。`,
        mode: 'single_orbit',
        showGoToTaskButton: true,
        onFinish: () => {
          launchSingleOrbitTask(sat);
        }
      });
    }, 200);
  };

  // =========================================================================
  // 核心业务流程 3：长时序模式流程（全流程严格对齐 6 步机制）
  // =========================================================================
  // （1）用户点击长时序监测卡片 -> 弹出上传任务表入口模态框（输入任务标题、上传excel入口）
  const handleSelectTimeSeries = () => {
    setIsTimeSeriesModalOpen(true);
  };

  const handleUploadTimeSeriesFile = () => {
    setIsTimeSeriesModalOpen(true);
  };

  // 点击长时序监测任务卡片弹窗确认后：
  // 1. 自动在创新应用展示区创建应用卡片（任务名称同需求来源、开始-结束时间/共几天、已执行几天、状态）
  // 2. 新增对话历史记录
  // 3. 模型回复：任务已启动，正在接收需求信息，结果请到创新应用页面查看+查看按钮
  // 4. 接收到 4 个高风险地点信息
  // 5. 地面模型开始任务规划：给出每天拍摄地点的计划
  const handleSubmitTimeSeriesTask = (data: TimeSeriesTaskData) => {
    // 新增任务规划对话记录
    const sessionTitle = data.source ? `${data.source}长时序监测` : '长时序监测任务';
    handleCreateHistorySession(sessionTitle, 'task-planning');

    // 自动在创新应用展区新增应用卡片
    const newAppCard: InnovativeAppItem = {
      id: 'app-custom-' + Date.now(),
      title: data.source,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      executedDays: 1,
      source: data.source,
      status: '进行中',
      isCustom: true,
    };
    setCustomApps(prev => [newAppCard, ...prev]);

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: `【长时序监测任务】立项申请：${data.source}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'time_series',
    };

    const thinking = `1. 提取长时序监测任务配置参数：
   - 需求来源：${data.source}
   - 监测周期：${data.startDate} 至 ${data.endDate}（共 ${data.totalDays} 天）
2. 自动化感知与需求接收：
   - 接收解析得到 4 个高风险监测目标地点（江西省上饶市婺源县、越南、朝鲜、俄罗斯）。
   - 地面模型开始任务规划，分配每日过境采集窗口。
3. 生成每日排期计划并引导跟进。`;

    const dayPlans: TimeSeriesDayPlan[] = [
      { dayIndex: 1, date: '2026-09-01', targetTime: '10:24:12 - 10:28:45', targetLocation: '江西省上饶市婺源县', coordinates: '29.3168°N, 118.1104°E', satellite: '云尖沐曦号', status: 'ready' },
      { dayIndex: 2, date: '2026-09-02', targetTime: '11:15:30 - 11:20:00', targetLocation: '越南', coordinates: '21.3240°N, 107.3092°E', satellite: '天巡者03号', status: 'pending_confirm' },
      { dayIndex: 3, date: '2026-09-03', targetTime: '10:48:10 - 10:52:35', targetLocation: '朝鲜', coordinates: '41.9096°N, 128.9606°E', satellite: '云尖沐曦号', status: 'pending_confirm' },
      { dayIndex: 4, date: '2026-09-04', targetTime: '14:32:00 - 14:36:18', targetLocation: '俄罗斯', coordinates: '53.6871°N, 122.8761°E', satellite: '天巡者03号', status: 'pending_confirm' },
    ];

    const content = `任务已启动，正在接收需求信息，结果请到创新应用页面查看`;

    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        thinking,
        content,
        mode: 'time_series',
        showGoToAppButton: true,
        timeSeriesHighRiskLocations: HIGH_RISK_LOCATIONS,
        timeSeriesStage: 'plan_list_review',
        timeSeriesPlans: dayPlans,
      });
    }, 200);
  };

  // 用户选择取消长时序计划
  const handleCancelTimeSeriesPlan = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, isActionConfirmed: true };
      }
      return msg;
    }));

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: '取消本次长时序监测规划排期',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'time_series',
    };

    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        content: '已取消长时序排期。如需重新规划，可随时点击【长时序监测】上传新任务表。',
        mode: 'time_series',
      });
    }, 200);
  };

  // 每天任务执行的通用流程
  const runTimeSeriesDayExecution = (messageId: string, dayIndex: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, isActionConfirmed: true };
      }
      return msg;
    }));

    const targets: Record<number, { location: string; sat: string; time: string; img: string; fire: boolean }> = {
      1: { location: '江西省上饶市婺源县', sat: '云尖沐曦号', time: '10:24:12 - 10:28:45', img: SAMPLE_RESULT_IMAGES.fireDetection, fire: true },
      2: { location: '越南', sat: '天巡者03号', time: '11:15:30 - 11:20:00', img: SAMPLE_RESULT_IMAGES.earthSatellite, fire: false },
      3: { location: '朝鲜', sat: '云尖沐曦号', time: '10:48:10 - 10:52:35', img: SAMPLE_RESULT_IMAGES.urbanSatellite, fire: false },
      4: { location: '俄罗斯', sat: '天巡者03号', time: '14:32:00 - 14:36:18', img: SAMPLE_RESULT_IMAGES.earthSatellite, fire: false },
    };

    const cur = targets[dayIndex] || targets[1];

    const userMsgId = 'msg-' + Date.now();
    const asstExecMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: dayIndex === 1 
        ? '确认长时序监测规划，发起首日（Day 1）任务'
        : `确认并下发今日 Day ${dayIndex} 观测任务（${cur.location}）`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'time_series',
    };

    setMessages(prev => [...prev, userMsg]);

    const groundSteps = TIME_SERIES_GROUND_STEPS.map(s => ({ ...s, status: 'success' as const }));
    const onboardSteps = TIME_SERIES_ONBOARD_STEPS.map(s => ({ ...s, status: 'success' as const }));

    const thinkingInitial = `1. 地面模型开始 Day ${dayIndex} 任务规划：\n   - 接收任务与意图解析\n   - 组装测控包并成功上行注数至地面站\n2. 指令已注入【${cur.sat}】并触发星上自动调度\n3. 等待星上在轨计算与对地下传...`;

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstExecMsgId,
        thinking: thinkingInitial,
        content: '等待星上结果下传.........',
        mode: 'time_series',
        flowSteps: groundSteps,
        currentStepIndex: groundSteps.length,
        isOnboardFlowPending: true,
        onFinish: () => {
          // 星上所有结果下传后（1.8秒延迟），替换内容，呈现折叠的星上流程，成果同步到成果管理页面
          setTimeout(() => {
            const finalContent = `【Day ${dayIndex} 任务执行完成】${cur.location}高风险区遥感观测已闭环，成果已完成下传并同步至成果管理页面。`;

            // 同步添加到成果管理页面数据
            const newAch: AchievementItem = {
              id: 'ach-ts-' + Date.now(),
              title: `${cur.location}高风险火情遥感检测`,
              satelliteName: cur.sat,
              imagingMode: '长时序模式',
              captureTime: `2026-09-0${dayIndex} ${cur.time.split(' - ')[0]}`,
              cameraType: '高分辨率红外热成像仪',
              resolution: '0.3m',
              fileSize: '85.2 MB',
              imageUrl: cur.img,
              location: cur.location,
              description: `长时序 Day ${dayIndex} 星载边缘计算与红外热成像分析成果。`,
            };
            setAchievements(prev => [newAch, ...prev]);

            setMessages(prev => prev.map(m => {
              if (m.id === asstExecMsgId) {
                return {
                  ...m,
                  content: finalContent,
                  isOnboardFlowPending: false,
                  onboardFlowSteps: onboardSteps,
                  resultImage: cur.img,
                  fireDetected: cur.fire,
                  showGoToAchievementButton: true,
                  fireHotspots: cur.fire ? [
                    { x: 42, y: 38, temp: '382℃ (异常热点)', area: `${cur.location}核心区` },
                    { x: 58, y: 64, temp: '165℃ (中度热点)', area: `${cur.location}外围区` }
                  ] : undefined
                };
              }
              return m;
            }));

            // 若有下一天，提示下一步确认
            const nextDay = dayIndex + 1;
            if (nextDay <= 4) {
              const nextTarget = targets[nextDay];
              const nextDayMsgId = 'msg-' + (Date.now() + 2);

              const dayPlans: TimeSeriesDayPlan[] = [
                { dayIndex: 1, date: '2026-09-01', targetTime: '10:24:12 - 10:28:45', targetLocation: '江西省上饶市婺源县', coordinates: '29.3168°N, 118.1104°E', satellite: '云尖沐曦号', status: 'completed' },
                { dayIndex: 2, date: '2026-09-02', targetTime: '11:15:30 - 11:20:00', targetLocation: '越南', coordinates: '21.3240°N, 107.3092°E', satellite: '天巡者03号', status: nextDay > 2 ? 'completed' : 'ready' },
                { dayIndex: 3, date: '2026-09-03', targetTime: '10:48:10 - 10:52:35', targetLocation: '朝鲜', coordinates: '41.9096°N, 128.9606°E', satellite: '云尖沐曦号', status: nextDay > 3 ? 'completed' : 'ready' },
                { dayIndex: 4, date: '2026-09-04', targetTime: '14:32:00 - 14:36:18', targetLocation: '俄罗斯', coordinates: '53.6871°N, 122.8761°E', satellite: '天巡者03号', status: nextDay > 4 ? 'completed' : 'ready' },
              ];

              setTimeout(() => {
                streamAssistantResponse({
                  messageId: nextDayMsgId,
                  content: `Day ${dayIndex} 任务已完成！长时序第 ${nextDay} 天（Day ${nextDay}）观测任务已就绪：${nextTarget.location}，请确认并发起新任务：`,
                  mode: 'time_series',
                  timeSeriesStage: 'day_executing',
                  timeSeriesPlans: dayPlans,
                  activeDayIndex: nextDay,
                });
              }, 400);
            } else {
              const finishMsgId = 'msg-' + (Date.now() + 2);
              setTimeout(() => {
                streamAssistantResponse({
                  messageId: finishMsgId,
                  content: '🎉 祝贺！长时序多日连续高风险目标监测计划全部天次（Day 1 ~ Day 4）已全部圆满完成，所有遥感与解译成果已同步至成果管理页面。',
                  mode: 'time_series',
                });
              }, 400);
            }
          }, 1800);
        }
      });
    }, 200);
  };

  const handleConfirmTimeSeriesPlan = (messageId: string) => {
    runTimeSeriesDayExecution(messageId, 1);
  };

  const handleExecuteTimeSeriesDay = (messageId: string, dayIndex: number) => {
    runTimeSeriesDayExecution(messageId, dayIndex);
  };

  // 多轮对话上下文智能响应生成器（支持思考过程与正文逐行流式呈现）
  const handleContextualMultiTurnResponse = (userText: string) => {
    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);

    let replyContent = '';
    let thinking = '';
    const text = userText.toLowerCase();

    if (text.includes('火') || text.includes('分析') || text.includes('结果') || text.includes('坐标') || text.includes('情况') || text.includes('严重')) {
      thinking = `1. 上下文召回：检索当前任务的遥感成果与红外辐射反演数据。\n2. 异常热斑定位：提取两组热异常像元簇，反演亮温阈值（68.5℃）。\n3. 蔓延趋势与影响评估：结合地面风场数据，评估东北向弱扩散，生成火情研判通报。`;
      replyContent = '根据最新星载边缘解算与红外反演数据：\n• 火灾异常点：共识别到 2 处主要热异常火斑（30.2741° N, 119.9823° E）\n• 核心表面测温：68.5 ℃\n• 影响面积估算：约 120 ㎡\n• 扩散态势：受风速影响呈东北向弱扩散，已自动生成林草防火应急通告单，建议通知属地应急部门。';
    } else if (text.includes('状态') || text.includes('电量') || text.includes('温度') || text.includes('健康') || text.includes('卫星')) {
      thinking = `1. 查询卫星遥测遥信总线：读取星载电源分系统、热控分系统与姿控分系统最新遥测包。\n2. 健康度评估：蓄电池 92% 充足，核心载荷温度 21.4℃ 正常，三轴稳定度优于指标，链路通畅。`;
      replyContent = '当前【云尖沐曦号】在轨遥测健康度指标良好：\n• 轨道参数：500 km 太阳同步轨道 (SSO)\n• 蓄电池剩余电量：92% (充足状态)\n• 核心处理载荷温度：21.4 ℃ (稳定)\n• 姿态稳定度：0.003°/s (指向精度优于 0.05°)\n• 下传信道：X频段高速链路待命 (1.2 Gbps)';
    } else if (text.includes('调整') || text.includes('修改') || text.includes('参数') || text.includes('角度') || text.includes('摆角')) {
      thinking = `1. 解析参数修改指令：提取侧摆角微调、相机增益档位与存储分区指令。\n2. 轨道几何安全性校核：验证微调摆角在安全力矩范围内，封装为上行参数补丁帧。`;
      replyContent = '已根据您的多轮指令调整星载任务参数：\n• 侧摆机动角微调至：+3.2°\n• 传感器增益档位：Level 2\n• 星载存储分区：Bank-A (高速预留区)\n指令已在星载任务队列中生效，将在下一次过境窗口按新参数执行。';
    } else if (text.includes('下载') || text.includes('导出') || text.includes('报告') || text.includes('简报')) {
      thinking = `1. 汇总当前会话全要素数据：时标、遥测、多光谱高清成图与火斑矢量。\n2. 生成结构化综合研判报告并关联下载链路。`;
      replyContent = '已为您生成《TASK-YJ-20260901_星地全流程研判报告.pdf》，包含：\n✓ 10 阶段全流程时标数据及遥测回放\n✓ 0.5m 多光谱高清遥感成图\n✓ 星载红外热斑提取坐标及矢量图层\n您可直接点击上方结果卡片中的【结果下载】进行离线分析。';
    } else if (text.includes('拍') || text.includes('监测') || text.includes('观测') || text.includes('任务')) {
      handleRegularFlow(userText);
      return;
    } else {
      thinking = `1. 语义意图理解：识别用户常规问答或通用调度指令。\n2. 维护对话上下文状态并给出精准引导。`;
      replyContent = `收到指令：“${userText}”。\nOneSpace 智能管控中枢已将该交互记录至本轮会话上下文中。支持继续下发姿轨微调、时序排期追加、遥测状态查询或火情应急报告生成等指令。`;
    }

    setTimeout(() => {
      streamAssistantResponse({
        messageId: asstMsgId,
        thinking,
        content: replyContent,
      });
    }, 200);
  };

  // 统一对话区创新应用任务对话状态机
  const [innovativeFlowState, setInnovativeFlowState] = useState<
    | { type: 'idle' }
    | { type: 'awaiting_dates' }
    | { type: 'awaiting_start_confirm'; startDate: string; endDate: string }
    | { type: 'awaiting_interrupt_confirm' }
  >({ type: 'idle' });

  // 处理统一对话流中创新应用（林火监测任务）开始/中断/进度同步等全流程
  const handleInnovativeTaskFlow = (text: string) => {
    handleCreateHistorySession(text, 'task-planning');
    setWorkspaceKanbanFilter('innovative');
    setWorkspaceViewMode(prev => (prev === 'chat' ? 'split' : prev));

    const userMsgId = 'msg-' + Date.now();
    const asstMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'time_series',
    };
    setMessages(prev => [...prev, userMsg]);

    const trimmed = text.trim();
    const isConfirm = /确认|好的|是的|同意|可以|confirm-innovative-start/.test(trimmed) && !/取消/.test(trimmed);
    const isCancel = /取消|不要|算了|cancel-innovative-start/.test(trimmed);

    // 1. 等待日期
    if (innovativeFlowState.type === 'awaiting_dates') {
      const dates = (trimmed.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/g) || []).map(m => {
        const [y, mo, d] = m.split(/[-/]/).map(Number);
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      });

      if (dates.length >= 2) {
        const [startDate, endDate] = dates;
        setInnovativeFlowState({ type: 'awaiting_start_confirm', startDate, endDate });
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            thinking: `1. 解析任务周期：${startDate} 至 ${endDate}\n2. 校验星载相机资源与轨道过境时段。\n3. 生成启动确认指令。`,
            content: `好的，任务周期为 **${startDate} ~ ${endDate}**，确认发起「全球火险监测」任务吗？`,
            mode: 'time_series',
            confirmChoice: true,
          });
        }, 200);
      } else {
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '请提供完整的开始日期和结束日期，例如：2026-09-05 至 2026-09-11。',
            mode: 'time_series',
          });
        }, 200);
      }
      return;
    }

    // 2. 等待发起确认
    if (innovativeFlowState.type === 'awaiting_start_confirm') {
      if (isConfirm) {
        const { startDate, endDate } = innovativeFlowState;
        const totalDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
        
        const activeApp: InnovativeAppItem = {
          id: 'app-preset-1',
          title: '全球火险监测',
          startDate,
          endDate,
          totalDays,
          executedDays: 0,
          source: '全球火险监测',
          status: '进行中',
          cooperatingUnit: '中国林业科学院',
        };
        setSelectedInnovativeApp(activeApp);
        setCustomApps([activeApp]);
        setInnovativeFlowState({ type: 'idle' });

        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            thinking: `1. 任务正式立项并更新看板：全球火险监测\n2. 周期：${startDate} 至 ${endDate}（共 ${totalDays} 天）\n3. 启动自动化感知与林科院高风险点拍摄需求接收...`,
            content: `任务已发起，当前周期：**${startDate} ~ ${endDate}**（已执行 0/${totalDays} 天）。\n看板区监测面板已同步更新为执行中状态。`,
            mode: 'time_series',
            showGoToAppButton: true,
          });
        }, 200);
      } else if (isCancel) {
        setInnovativeFlowState({ type: 'idle' });
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '已取消，任务未发起。',
            mode: 'time_series',
          });
        }, 200);
      } else {
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '请回复“确认”以发起任务，或回复“取消”。',
            mode: 'time_series',
          });
        }, 200);
      }
      return;
    }
    // 3. 中断任务等待确认
    if (innovativeFlowState.type === 'awaiting_interrupt_confirm') {
      if (isConfirm) {
        if (selectedInnovativeApp) {
          setSelectedInnovativeApp({ ...selectedInnovativeApp, status: '已结束' });
        }
        setInnovativeFlowState({ type: 'idle' });
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '当前任务已中断。看板状态已置为已结束。',
            mode: 'time_series',
          });
        }, 200);
      } else if (isCancel) {
        setInnovativeFlowState({ type: 'idle' });
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '好的，任务继续进行中。',
            mode: 'time_series',
          });
        }, 200);
      } else {
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '请回复“确认”以中断任务，或回复“取消”。',
            mode: 'time_series',
          });
        }, 200);
      }
      return;
    }

    // 4. 用户输入：开启林火监测任务
    if (trimmed.includes('开启') && (trimmed.includes('林火') || trimmed.includes('监测') || trimmed.includes('任务'))) {
      if (selectedInnovativeApp?.status === '进行中') {
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: `当前任务正在进行，时间从 **${selectedInnovativeApp.startDate}** 到 **${selectedInnovativeApp.endDate}**。`,
            mode: 'time_series',
          });
        }, 200);
      } else {
        setInnovativeFlowState({ type: 'awaiting_dates' });
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            thinking: `1. 截获林火监测任务开启意图。\n2. 引导用户输入监测任务起止日期。`,
            content: '好的，请提供本次监测任务的**开始日期**和**结束日期**（例如：`2026-09-05` 至 `2026-09-11`）。',
            mode: 'time_series',
          });
        }, 200);
      }
      return;
    }

    // 5. 用户输入：中断任务
    if (trimmed.includes('中断') && (trimmed.includes('任务') || trimmed.includes('林火') || trimmed.includes('监测'))) {
      if (selectedInnovativeApp?.status === '进行中') {
        setInnovativeFlowState({ type: 'awaiting_interrupt_confirm' });
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '当前任务可中断，是否确认中断？',
            mode: 'time_series',
            confirmChoice: true,
          });
        }, 200);
      } else {
        setTimeout(() => {
          streamAssistantResponse({
            messageId: asstMsgId,
            content: '当前并无任务',
            mode: 'time_series',
          });
        }, 200);
      }
      return;
    }

    // 6. 用户输入：林火监测任务 / 同步进度 / 任务进度 —— 简版进度反馈，具体流程步骤统一在看板区“进度同步”栏呈现
    if (selectedInnovativeApp?.status === '进行中') {
      const executedDays = selectedInnovativeApp.executedDays ?? 0;
      setTimeout(() => {
        streamAssistantResponse({
          messageId: asstMsgId,
          content: `当前任务正在进行中，周期：**${selectedInnovativeApp.startDate} ~ ${selectedInnovativeApp.endDate}**（已执行 ${executedDays}/${selectedInnovativeApp.totalDays} 天）。`,
          mode: 'time_series',
          quickReplyOptions: ['中断任务', '开启任务'],
        });
      }, 200);
    } else {
      setTimeout(() => {
        streamAssistantResponse({
          messageId: asstMsgId,
          content: '当前并无任务。',
          mode: 'time_series',
          quickReplyOptions: ['开启任务'],
        });
      }, 200);
    }
    return;
  };

  const handleSendMessage = (text: string, attachments?: File[]) => {
    if (isChatLocked) return;
    if (!text.trim() && (!attachments || attachments.length === 0)) return;

    if (attachments && attachments.length > 0) {
      const file = attachments[0];
      handleCreateHistorySession(text.trim() || file.name.replace(/\.[^/.]+$/, ""), 'task-planning');
      handleSubmitTimeSeriesTask({
        taskTitle: text.trim() || file.name.replace(/\.[^/.]+$/, ""),
        startDate: '2026-09-05',
        endDate: '2026-09-11',
        totalDays: 7,
        source: '林科院林火监测',
      });
      return;
    }

    const isHealthIntent = /蓄电池|电池平衡|姿轨控|健康评估|健康诊断|健康度|健康管理|遥测健康|星载路由系统|路由系统.*状态|分系统状态|卫星.*健康/i.test(text);

    if (isHealthIntent) {
      handleHealthCheckFlow(text);
      return;
    }

    // 识别创新应用意图或处于创新应用状态机中
    const isInnovativeIntent = /开启.*林火|林火监测|全球火险|林火.*任务|创新应用|中断.*任务|中断.*林火|中断.*监测|同步.*进度|任务.*进度/i.test(text);
    // 状态机非 idle 时，仅当输入内容像是在延续该流程（日期/确认/取消）才继续拦截，
    // 避免用户中途切换成无关的常规任务需求时被误判为创新应用流程的后续回复
    const looksLikeInnovativeContinuation = innovativeFlowState.type === 'awaiting_dates'
      ? /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text)
      : innovativeFlowState.type !== 'idle' && /确认|好的|是的|同意|可以|取消|不要|算了/.test(text);

    if (isInnovativeIntent || looksLikeInnovativeContinuation) {
      handleInnovativeTaskFlow(text);
      return;
    }
    if (innovativeFlowState.type !== 'idle') {
      // 用户已转向其他明确意图，重置创新应用状态机，避免持续拦截后续消息
      setInnovativeFlowState({ type: 'idle' });
    }

    handleCreateHistorySession(text, 'task-planning');

    const lower = text.toLowerCase();
    const hasPendingRequirement = messages.some(m => m.regularStage === 'requirement_completion' && !m.isActionConfirmed);
    const pendingReviewMsg = messages.find(m => m.regularStage === 'requirement_review' && !m.isActionConfirmed);

    if (hasPendingRequirement) {
      // 正在进行多轮要素补全，直接进入多轮会话状态机处理
      handleProcessRequirementStep(text);
      return;
    }

    if (pendingReviewMsg) {
      // 正在等待确认任务要素清单，用户直接输入文字确认并继续
      handleConfirmRequirementsReady(pendingReviewMsg.id);
      return;
    }

    const isQAIntent = /什么时间|何时|几点|什么时候|哪些卫星|什么卫星|哪颗卫星|什么载荷|哪些载荷|能否拍摄|可以拍摄.*吗|能拍.*吗|能否观测|几时/i.test(text);

    if (isQAIntent) {
      handleQAFlow(text);
      return;
    }

    if (lower.includes('长时序') || lower.includes('多日') || lower.includes('周期') || lower.includes('连续')) {
      handleUploadTimeSeriesFile();
    } else if (lower.includes('一轨即时') || lower.includes('单轨即时') || lower.includes('黄金窗口') || lower.includes('请立即拍照')) {
      handleSingleOrbitFlow(text);
    } else if (messages.length === 0 || lower.includes('拍') || lower.includes('监测') || lower.includes('观测') || lower.includes('任务') || lower.includes('安排') || lower.includes('宁波') || lower.includes('火灾')) {
      handleRegularFlow(text);
    } else {
      handleContextualMultiTurnResponse(text);
    }
  };

  // 统一对话页对话流公共回调（任务规划/健康管理/创新应用所有对话流均整合于此）
  const chatConversationHandlers = {
    onConfirmTimeSlot: handleConfirmTimeSlot,
    onConfirmTaskOrder: handleConfirmTaskOrder,
    onConfirmPlanAndUpload: handleConfirmPlanAndUpload,
    onUploadTimeSeriesFile: handleUploadTimeSeriesFile,
    onConfirmTimeSeriesPlan: handleConfirmTimeSeriesPlan,
    onCancelTimeSeriesPlan: handleCancelTimeSeriesPlan,
    onExecuteTimeSeriesDay: handleExecuteTimeSeriesDay,
    onSelectQuickReply: handleSelectSingleOrbitQuickReply,
    onSelectRequirementOption: handleProcessRequirementStep,
    onConfirmRequirementsReady: handleConfirmRequirementsReady,
    onStartPlanFromQA: handleStartPlanFromQA,
    onGoToInnovativeApp: () => {
      setWorkspaceKanbanFilter('innovative');
      setWorkspaceViewMode(prev => (prev === 'chat' ? 'split' : prev));
      if (customApps.length > 0) {
        setSelectedInnovativeApp(customApps[0]);
      }
    },
    onGoToAchievementManagement: () => {
      setActiveTab('achievement-management');
    },
    onGoToTaskManagement: () => {
      setWorkspaceKanbanFilter('task');
      setWorkspaceViewMode(prev => (prev === 'chat' ? 'split' : prev));
      setTaskFocusRequestId(id => id + 1);
    },
  };

  // 打招呼与推荐问题（对话+看板 / 仅对话 两种模式共用）
  const renderGreetingSuggestions = (titleClassName: string) => (
    <div className="space-y-2">
      <h2 className={titleClassName}>请问有什么可以帮到您？</h2>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {WORKSPACE_SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrefillPrompt(p)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111728] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/40 transition-all cursor-pointer shadow-2xs"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );

  // “对话+看板”模式对话区：样式与健康管理原对话区保持一致（较窄面板、紧凑滚动区）
  const renderCompactChatArea = () => (
    <div className="flex-1 flex flex-col min-h-0 w-full h-full relative overflow-hidden">
      <div ref={conversationContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto w-full flex flex-col px-2 sm:px-4 py-3 relative">
        {messages.length === 0 ? (
          <div className="flex-1 my-auto flex flex-col justify-center items-center text-center py-8 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 dark:bg-sky-950/70 border border-blue-200/80 dark:border-sky-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400 shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-lg mx-auto">
              {renderGreetingSuggestions('text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug')}
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6 pb-6">
            <ChatConversation messages={messages} {...chatConversationHandlers} />
          </div>
        )}
      </div>
      <div className="shrink-0 pt-1 pb-3 px-2 sm:px-4 w-full relative">
        {showScrollToBottom && (
          <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none z-20">
            <button
              onClick={() => scrollToBottom(true)}
              title="回到最近对话"
              className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#0f172a] hover:bg-blue-50 dark:hover:bg-sky-950/80 border border-slate-200 dark:border-sky-400/25 text-blue-600 dark:text-sky-400 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer group"
            >
              <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="w-full mb-1">
            <ToolCards
              satellites={satellites}
              onSelectSingleOrbit={handleSelectSingleOrbit}
            />
          </div>
        )}
        <ChatInputArea
          onSendMessage={handleSendMessage}
          onStopGenerating={handleStopGenerating}
          onNewChat={handleNewChat}
          isGenerating={isGenerating}
          prefillPrompt={prefillPrompt}
          onClearPrefill={() => setPrefillPrompt('')}
          disabled={isChatLocked}
        />
      </div>
    </div>
  );

  // “仅对话”模式对话区：样式与任务规划原对话区保持一致（居中大标题、工具卡）
  const renderFullChatArea = () => (
    messages.length === 0 ? (
      <div className="flex-1 overflow-y-auto w-full flex flex-col justify-center items-center text-center my-auto py-8 sm:py-12 space-y-6 px-3 sm:px-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <div className="space-y-4 max-w-xl mx-auto px-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 dark:bg-sky-950/70 border border-blue-200/80 dark:border-sky-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400 shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            {renderGreetingSuggestions('text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug')}
          </div>

          <div className="w-full px-2 pt-1">
            <div className="w-full max-w-3xl mx-auto mb-1">
              <ToolCards
                satellites={satellites}
                onSelectSingleOrbit={handleSelectSingleOrbit}
              />
            </div>
            <ChatInputArea
              onSendMessage={handleSendMessage}
              onStopGenerating={handleStopGenerating}
              onNewChat={handleNewChat}
              isGenerating={isGenerating}
              prefillPrompt={prefillPrompt}
              onClearPrefill={() => setPrefillPrompt('')}
              disabled={isChatLocked}
            />
          </div>
        </div>
      </div>
    ) : (
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div 
          ref={conversationContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto w-full relative"
        >
          <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 space-y-4">
            <ChatConversation messages={messages} {...chatConversationHandlers} />
          </div>
        </div>

        <div className="shrink-0 pt-1 pb-3 w-full px-3 sm:px-6 relative">
          {showScrollToBottom && (
            <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none z-20">
              <button
                id="btn-scroll-to-recent"
                onClick={() => scrollToBottom(true)}
                className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center bg-white/95 dark:bg-[#0f172a]/95 hover:bg-blue-50 dark:hover:bg-sky-950/80 border border-slate-200/90 dark:border-sky-400/25 text-blue-600 dark:text-sky-400 shadow-lg shadow-blue-900/15 dark:shadow-black/50 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
                title="回到最近对话"
              >
                <ArrowDown className="w-4 h-4 text-blue-600 dark:text-sky-400 group-hover:translate-y-0.5 transition-transform duration-200" />
              </button>
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <ChatInputArea
              onSendMessage={handleSendMessage}
              onStopGenerating={handleStopGenerating}
              onNewChat={handleNewChat}
              isGenerating={isGenerating}
              prefillPrompt={prefillPrompt}
              onClearPrefill={() => setPrefillPrompt('')}
              disabled={isChatLocked}
            />
          </div>
        </div>
      </div>
    )
  );

  // “任务管理看板”暂无数据的空态占位
  const renderTaskKanbanPlaceholder = () => (
    <div className="flex-1 h-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.1] bg-white/60 dark:bg-[#0c101c]/60 text-center p-8">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 dark:text-slate-500">
        <Bot className="w-6 h-6" />
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">任务管理看板暂无数据</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">敬请期待，任务规划相关的看板内容后续将在此处呈现</p>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f7fb] dark:bg-[#070a12] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 antialiased ambient-glow relative">
      {/* ========================================================================= */}
      {/* 1. 左侧侧边栏 */}
      {/* ========================================================================= */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded(!isSidebarExpanded)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        historySessions={historySessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />

      {/* ========================================================================= */}
      {/* 2. 右侧主内容区 */}
      {/* ========================================================================= */}
      <main 
        id="onespace-main-content"
        className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative pr-0"
      >
        {/* 内容区底色渐变光晕背景层 (深色模式下强化光晕色彩与立体感) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none opacity-80 dark:opacity-100">
          {/* 顶部中央至右侧大光晕：青蓝电光色 */}
          <div className="absolute -top-28 right-0 w-[560px] h-[440px] rounded-full bg-gradient-to-br from-cyan-400/10 via-blue-600/8 to-transparent dark:from-cyan-400/22 dark:via-blue-500/18 blur-[110px] animate-glow-pulse" />
          
          {/* 中间核心交互区柔光光晕：空天科技天蓝/紫蓝 */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[640px] h-[400px] rounded-full bg-gradient-to-tr from-sky-400/8 via-indigo-500/6 to-transparent dark:from-sky-400/18 dark:via-indigo-500/15 blur-[120px] animate-glow-shift" />
          
          {/* 底部左侧冷色调卫星智控光晕 */}
          <div className="absolute bottom-4 left-6 w-[420px] h-[320px] rounded-full bg-gradient-to-tr from-indigo-500/8 via-sky-400/6 to-transparent dark:from-indigo-600/16 dark:via-sky-400/12 blur-[100px]" />
          
          {/* 底部右侧边缘光斑：极光青绿 */}
          <div className="absolute -bottom-20 right-10 w-[460px] h-[350px] rounded-full bg-gradient-to-tl from-teal-400/8 via-blue-500/6 to-transparent dark:from-teal-400/18 dark:via-blue-600/14 blur-[110px] animate-glow-pulse" />
        </div>

        {/* 顶部标题栏与统一对话页展示模式切换/看板筛选导航 */}
        <div className="relative z-10 px-3 pt-2">
          <Header
            activeSatelliteCount={satellites.length}
            isOrbitForecastOpen={isOrbitForecastOpen}
            onToggleOrbitForecast={() => setIsOrbitForecastOpen(!isOrbitForecastOpen)}
            activeTab={activeTab}
            isSidebarExpanded={isSidebarExpanded}
            workspaceViewMode={workspaceViewMode}
            onWorkspaceViewModeChange={setWorkspaceViewMode}
            workspaceKanbanFilter={workspaceKanbanFilter}
            onWorkspaceKanbanFilterChange={setWorkspaceKanbanFilter}
          />
        </div>

        {/* 主内容区域与可调节分割面板 */}
        <div 
          ref={mainBodyRef}
          className="flex-1 flex flex-row min-h-0 relative z-10 w-full overflow-hidden items-start px-3 pb-3"
        >
          {/* 左侧主视窗（统一对话页 / 成果管理） */}
          <div className={`flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden relative ${isOrbitForecastOpen ? 'mr-3' : ''}`}>
            {/* 根据核心菜单 Tab 呈现内容 */}
            {activeTab === 'achievement-management' && (
              <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden">
                <AchievementManagementView 
                  onBackToPlanning={() => setActiveTab('workspace')}
                  achievements={achievements}
                />
              </div>
            )}

            {activeTab === 'workspace' && (
              <div ref={workspaceContainerRef} className="flex-1 flex flex-row min-h-0 w-full h-full overflow-hidden">
                {/* 对话区：对话+看板 / 仅对话 模式下展示 */}
                {(workspaceViewMode === 'split' || workspaceViewMode === 'chat') && (
                  <div
                    style={workspaceViewMode === 'split' ? { width: `${workspaceChatPanelWidth}px` } : undefined}
                    className={`${workspaceViewMode === 'split' ? 'h-full shrink-0 flex flex-col mr-3' : 'flex-1 h-full flex flex-col'} min-h-0 overflow-hidden`}
                  >
                    {workspaceViewMode === 'split' ? renderCompactChatArea() : renderFullChatArea()}
                  </div>
                )}

                {/* 中间可拖拽分割栏（仅“对话+看板”模式下显示） */}
                {workspaceViewMode === 'split' && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); setIsDraggingWorkspaceSplitter(true); }}
                    onDoubleClick={() => {
                      if (workspaceContainerRef.current) {
                        setWorkspaceChatPanelWidth(Math.round(workspaceContainerRef.current.getBoundingClientRect().width * 0.4));
                      } else {
                        setWorkspaceChatPanelWidth(460);
                      }
                    }}
                    title="按住左右拖动调整两侧大小，双击恢复默认"
                    className="group relative -ml-3 w-3 h-full shrink-0 cursor-col-resize flex items-center justify-center select-none z-30"
                  >
                    <div className={`w-[2px] h-full rounded-full transition-all duration-200 pointer-events-none ${
                      isDraggingWorkspaceSplitter
                        ? 'bg-gradient-to-b from-transparent via-blue-500 to-transparent dark:via-sky-400 opacity-100 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                        : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-transparent group-hover:via-blue-500/80 group-hover:to-transparent dark:group-hover:via-sky-400/80 group-hover:shadow-[0_0_6px_rgba(59,130,246,0.4)]'
                    }`} />
                  </div>
                )}

                {/* 看板区：对话+看板 / 仅看板 模式下展示，按右上角筛选导航切换任务管理/健康管理/创新应用看板 */}
                {(workspaceViewMode === 'split' || workspaceViewMode === 'kanban') && (
                  <div className="flex-1 h-full min-w-[360px] min-h-[480px] overflow-hidden">
                    {workspaceKanbanFilter === 'task' && (
                      <TaskManagementKanban
                        satellites={satellites}
                        selectedSatelliteId={selectedSatelliteId}
                        onSelectSatellite={setSelectedSatelliteId}
                        injectedTask={singleOrbitInjectedTask}
                        focusRequestId={taskFocusRequestId}
                      />
                    )}

                    {workspaceKanbanFilter === 'health' && (
                      <HealthCheckView 
                        satellites={satellites}
                        selectedSatellite={selectedSatellite}
                        onSelectSatellite={setSelectedSatelliteId}
                        onOpenSatelliteList={() => setIsOrbitForecastOpen(true)}
                        viewMode="kanban"
                      />
                    )}

                    {workspaceKanbanFilter === 'innovative' && (
                      <InnovativeAppView 
                        onBackToPlanning={() => setActiveTab('workspace')}
                        customApps={customApps}
                        selectedApp={selectedInnovativeApp}
                        onSelectApp={setSelectedInnovativeApp}
                        viewMode="kanban"
                        onLaunchApp={(appName) => {
                          setWorkspaceViewMode(prev => (prev === 'kanban' ? 'split' : prev));
                          setPrefillPrompt(`帮我启动【${appName}】任务规划与星载算法下发`);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 中间可拖拽分割栏 (Resizer Divider: 细轴 + 中间到两端渐变透明，鼠标悬浮呈现拖拽指针) */}
          {isOrbitForecastOpen && (
            <div
              id="satellite-split-resizer"
              onMouseDown={handleSplitterMouseDown}
              onDoubleClick={() => setSatellitePanelWidth(380)}
              title="按住左右拖动调整宽度，双击恢复默认"
              className="group relative -ml-3 w-3 h-full shrink-0 cursor-col-resize flex items-center justify-center select-none z-30"
            >
              {/* 细轴指示线：从中间到上下两端渐变透明 */}
              <div 
                className={`w-[2px] h-full rounded-full transition-all duration-300 pointer-events-none ${
                  isDraggingSplitter
                    ? 'bg-gradient-to-b from-transparent via-blue-500 to-transparent dark:via-sky-400 opacity-100 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                    : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-transparent group-hover:via-blue-500/80 group-hover:to-transparent dark:group-hover:via-sky-400/80 group-hover:shadow-[0_0_6px_rgba(59,130,246,0.4)]'
                }`}
              />
            </div>
          )}

          {/* 右侧卫星在轨状态分割面板 (Split Panel) */}
          {isOrbitForecastOpen && (
            <SatelliteSplitPanel
              satellites={satellites}
              selectedSatelliteId={selectedSatelliteId}
              onSelectSatellite={(sat) => setSelectedSatelliteId(sat.id)}
              width={satellitePanelWidth}
              onToggleSatelliteStatus={handleToggleSatelliteStatus}
              onClose={() => setIsOrbitForecastOpen(false)}
            />
          )}
        </div>
      </main>

      {/* 长时序任务上传与标题配置模态框 */}
      <TimeSeriesUploadModal
        isOpen={isTimeSeriesModalOpen}
        onClose={() => setIsTimeSeriesModalOpen(false)}
        onSubmit={handleSubmitTimeSeriesTask}
      />
    </div>
  );
}

export default App;
