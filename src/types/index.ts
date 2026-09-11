export type ThemeMode = 'dark' | 'light';

export type MainTabType = 'workspace' | 'achievement-management';

// 统一对话页三种展示模式：对话+看板 | 仅看板 | 仅对话
export type WorkspaceViewMode = 'split' | 'kanban' | 'chat';

// 统一对话页右上角看板筛选：任务管理看板（空）| 健康管理看板 | 创新应用看板
export type WorkspaceKanbanFilter = 'task' | 'health' | 'innovative';

export interface AchievementItem {
  id: string;
  title: string;
  imagingMode: string; // 成像模式: 多光谱推扫 | 热红外反演 | SAR雷达成像 | 高光谱成像 | 全色高分
  satelliteName: string; // 卫星名: 云尖沐曦号 | 之江天目01号 | 天巡者03号 | 天工探索二号
  cameraType: string; // 相机类型: 智能宽幅多光谱相机 | 高分辨率红外热成像仪 | C波段合成孔径雷达 | 高光谱成像仪 | 超高分光学相机
  captureTime: string; // 拍摄时间: e.g. "2026-09-01 10:24:15"
  imageUrl: string; // 图像 URL
  resolution?: string; // 地面分辨率
  location?: string; // 观测地点
  fileSize?: string; // 文件大小
  cloudCoverage?: string; // 云量
  description?: string; // 成果描述
}

export interface Satellite {
  id: string;
  name: string;
  code: string;
  orbitType: string;
  status: 'in-bound' | 'upcoming'; // 已入境 | 待入境
  countdownSeconds: number; // 倒计时秒数
  inboundElapsedSeconds?: number; // 入境已持续秒数（用于一轨成像前1分钟判定）
  groundStation: string; // 建链地面站
  // 一轨成像建链状态机：connecting(建链中) | success(建链成功，可发指令) | failed(建链失败) | expired(可发指令窗口已过期)
  linkState?: 'connecting' | 'success' | 'failed' | 'expired';
  linkStateSeconds?: number; // 建链状态倒计时（建链中的剩余耗时 / 建链成功后可发送指令的剩余秒数）
  maxElevation: number; // 最大过境仰角 (度)
  imagingWindow: string; // 窗口期
  resolution: string; // 地面分辨率
  sensorPayload: string; // 载荷类型
  altitude: number; // 轨道高度 km
  batteryLevel: number; // 电量 %
  tempCore: number; // 核心温度 ℃
  downlinkSpeed: string; // 下传速率 Gbps
}

// 阶段步骤 Key
export type FlowStepKey = string;

export interface FlowStepItem {
  key: FlowStepKey;
  label: string;
  subNote?: string;
  replanTargetIndex?: number; // 重规划回跳目标步骤索引（如回跳到步骤0或步骤3）
  replanTargetLabel?: string; // 重规划回跳目标名称（如“地面任务规划”或“自适应排期”）
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  desc?: string;
  duration?: string;
}

export interface TimeSlotOption {
  id: string;
  timeRange: string;
  satellite: string;
  elevation: number;
  swathWidth: string;
  cloudProbability: string;
  selected?: boolean;
}

export interface StructuredTaskOrder {
  orderId: string;
  targetName: string;
  coordinates: string;
  selectedTime: string;
  satelliteName: string;
  sensorMode: string;
  resolution: string;
  onboardComputing?: string; // 是否在轨计算及模型类型
  startTime?: string;
  endTime?: string;
  priority: '高 (P1)' | '紧急 (P0)' | '普通 (P2)';
  createdTime: string;
}

export interface TaskRequirementDraft {
  payload?: string; // 载荷
  location?: string; // 成像地点
  onboardComputing?: string; // 是否在轨计算及模型类型
  startTime?: string; // 开始时间
  endTime?: string; // 结束时间
  currentField?: 'payload' | 'location' | 'onboardComputing' | 'timeRange' | 'completed'; // 当前需要补充的字段
  options?: string[]; // 当前轮次可选的快捷建议项
}

export interface TimeSeriesDayPlan {
  dayIndex: number;
  date: string;
  targetTime: string; // 什么时间
  targetLocation: string; // 拍摄哪个地点
  coordinates: string;
  satellite: string; // 哪颗卫星
  status: 'pending_confirm' | 'ready' | 'completed' | 'in_progress';
  resultImage?: string;
  fireDetected?: boolean;
}

export interface QAWindowOption {
  id: string;
  satelliteName: string;
  satelliteCode: string;
  timeRange: string;
  payload: string;
  resolution: string;
  maxElevation: number;
  swathWidth?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  thinkingProcess?: string; // 模型的思考推理过程
  mode?: 'regular' | 'single_orbit' | 'time_series' | 'qa';
  isActionConfirmed?: boolean;
  isActionCancelled?: boolean; // 用户点击了取消按钮，流程已终止
  // 问答模式特定数据
  qaTargetLocation?: string;
  qaWindowOptions?: QAWindowOption[];
  // 常规模式特定阶段
  regularStage?: 
    | 'requirement_completion' // (2) 补全信息引导
    | 'requirement_review'     // (2.5) 补齐要素全列出让用户确认
    | 'time_selection'          // (3) 返回可选方案
    | 'task_order_review'       // (4) 生成结构化任务单
    | 'ground_model_flow'       // (5) 地面模型处理过程阶段步骤
    | 'onboard_model_flow'      // (7) 星上处理流程阶段步骤（含重规划分支）
    | 'plan_review'             // 辅助查看规划
    | 'execution_flow';         // 兼容
  timeSlotOptions?: TimeSlotOption[];
  structuredOrder?: StructuredTaskOrder;
  requirementDraft?: TaskRequirementDraft;
  onboardFlowType?: 'normal' | 'replanning'; // 星上正常流程 或 落盘失败重规划流程
  // 一轨模式阶段
  singleOrbitStage?: 'satellite_selection' | 'flow_executing' | 'completed';
  satelliteOptions?: Satellite[];
  selectedSatelliteId?: string;
  // 通用推荐问题胶囊选项（点击后作为用户消息自动发送，如一轨成像多卫星选择）
  quickReplyOptions?: string[];
  // 长时序模式阶段
  timeSeriesStage?: 'template_ready' | 'plan_list_review' | 'day_executing' | 'completed';
  timeSeriesPlans?: TimeSeriesDayPlan[];
  activeDayIndex?: number;
  timeSeriesHighRiskLocations?: { name: string; lng: number; lat: number }[];
  showGoToAppButton?: boolean;
  showGoToAchievementButton?: boolean;
  // 任务发起完成后，引导用户跳转至任务管理看板对应任务详情区
  showGoToTaskButton?: boolean;
  onboardFlowSteps?: FlowStepItem[];
  isOnboardFlowPending?: boolean;
  // 10 步流程图数据
  flowSteps?: FlowStepItem[];
  currentStepIndex?: number;
  resultImage?: string;
  fireDetected?: boolean;
  fireHotspots?: { x: number; y: number; temp: string; area: string }[];
  confirmChoice?: boolean;
  table?: { time: string; location: string }[];
  analysisResult?: {
    location: string;
    locationType: string;
    fireDetected: boolean;
    area?: number;
    image?: string;
  };
  attachments?: {
    name: string;
    size: string;
    type: string;
  }[];
}

export interface HistorySession {
  id: string;
  title: string;
  timestamp: string;
  dateGroup: '今日' | '昨日' | '更早';
  messageCount: number;
  type?: 'task-planning' | 'health-check' | 'innovative';
  hasResultBadge?: boolean;
}

export interface InnovativeAppItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  executedDays?: number;
  source: string;
  status: '未开始' | '进行中' | '已结束';
  desc?: string;
  isCustom?: boolean;
  cooperatingUnit?: string;
}

