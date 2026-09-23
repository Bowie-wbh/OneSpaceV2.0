import { Satellite, FlowStepItem, HistorySession } from '../types';
import { SATELLITE_CONSTELLATION_ITEMS } from './mockRemoteSensingData';

// 初始卫星列表（与 3D 地球空间星座 SATELLITE_CONSTELLATION_ITEMS 完全一致的数据集）
export const INITIAL_SATELLITES: Satellite[] = SATELLITE_CONSTELLATION_ITEMS.map((item, idx) => {
  // 默认 SCS-04-16 云尖沐曦号为已入境首选星，其余按不同倒计时排队待入境
  const isInbound = item.id === 'scs-04-16' || item.code === 'SCS-04-16';
  
  const groundStations = [
    '喀什 1002-X/S',
    '密云 1308-X/Ka',
    '三亚 1105-Ka',
    '佳木斯 1402-X/Ka',
    '七台河 1201-X/Ka',
    '酒泉 1001-X/Ka',
    '西安 1503-X/S',
  ];
  const station = groundStations[idx % groundStations.length];

  // 预设计算窗口与倒计时
  const countdowns = [
    320, 680, 1140, 1560, 1980, 2400, 2820, 3240, 3660, 4080, 4500, 4920, 5340, 402
  ];
  const countdown = isInbound ? 402 : (countdowns[idx] || (idx + 1) * 450);

  // 估算轨道高度 (约 500 ~ 545 km)
  const altitudes = [
    512.42, 514.18, 513.65, 518.32, 520.45, 517.88, 
    522.15, 519.34, 524.60, 521.82, 526.40, 523.15, 
    535.80, 538.20, 502.418
  ];
  const altitude = altitudes[idx] || 515.0;

  // 对应载荷描述
  let payloadDesc = item.payload.aiCompute + ' 边缘AI算力 + 激光通信';
  if (item.id === 'scs-04-16') {
    payloadDesc = '智能宽幅多光谱相机 + 边缘AI加速模组 (248 TOPS)';
  } else if (item.id === 'scs-03-14') {
    payloadDesc = '高光谱成像仪 (30m) + 大容量固存';
  } else if (item.id === 'scs-04-15') {
    payloadDesc = '星载气象辐射计 (50m) + 强对流预警模型';
  }

  // 对应地面分辨率
  let resolutionDesc = '0.5m 全色 / 2.0m 多光谱';
  if (item.id === 'scs-03-14') resolutionDesc = '30m 高光谱通道';
  else if (item.id === 'scs-04-15') resolutionDesc = '50m 气象多通道';
  else if (item.id === 'scs-01-06' || item.id === 'scs-01-09') resolutionDesc = '1.0m C波段 SAR 雷达';

  return {
    id: item.id,
    name: item.name,
    code: item.code,
    orbitType: '极地太阳同步轨道 (SSO)',
    status: isInbound ? 'in-bound' : 'upcoming',
    countdownSeconds: countdown,
    inboundElapsedSeconds: isInbound ? 35 : 0,
    groundStation: station,
    maxElevation: Number((58 + (idx * 3.7) % 32).toFixed(1)),
    imagingWindow: isInbound ? '14:25:30 - 14:32:15' : `14:${String((30 + idx * 4) % 60).padStart(2, '0')}:00 - 14:${String((37 + idx * 4) % 60).padStart(2, '0')}:30`,
    resolution: resolutionDesc,
    sensorPayload: payloadDesc,
    altitude,
    batteryLevel: 90 + (idx % 8),
    tempCore: Number((16.5 + (idx * 0.7) % 5).toFixed(1)),
    downlinkSpeed: item.payload.laserSpeed || '10 Gbps',
    subSatellitePoint: { region: '中国及邻近海域', lng: 110.25, lat: 28.5 },
    subSatelliteBase: { lng: 110.25, lat: 28.5 },
    noradId: item.noradId,
    line1: item.line1,
    line2: item.line2,
  };
});


// 1. 常规模式 - 地面模型处理流程阶段步骤（第 5 步）
export const REGULAR_GROUND_FLOW_STEPS: FlowStepItem[] = [
  { key: 'gm_1_recv', label: '地面模型接收任务', status: 'pending', desc: '接收用户确认的结构化任务单' },
  { key: 'gm_2_intent_parse', label: '任务意图解析', status: 'pending', desc: '深度语义解析与时空窗口匹配' },
  { key: 'gm_3_pkg_assemble', label: '任务包组装与发送', status: 'pending', desc: '生成标准遥控指令帧包并上行' },
  { key: 'gm_4_pkg_sent', label: '任务发送成功', status: 'pending', desc: '地面测控站完成上注' }
];

// 2. 常规模式 - 星上处理标准流程阶段步骤（第 7 步：正常流）
export const REGULAR_ONBOARD_FLOW_STEPS: FlowStepItem[] = [
  { key: 'ob_1_start', label: '星上模型启动', status: 'pending', desc: '星载AI计算单元唤醒' },
  { key: 'ob_2_task_parsed', label: '任务解析完成', status: 'pending', desc: '星上任务调度器装载指令' },
  { key: 'ob_3_planning_done', label: '任务规划完成', status: 'pending', desc: '星上瞬时姿态与成像解算' },
  { key: 'ob_4_telecommand_gen', label: '遥控指令生成', status: 'pending', desc: '载荷微秒级动作时钟生成' },
  { key: 'ob_5_camera_imaging', label: '相机成像', status: 'pending', desc: '高分多光谱相机推扫曝光' },
  { key: 'ob_6_data_recording', label: '成像数据落盘', status: 'pending', desc: '原始像元数据直写高速固存' },
  { key: 'ob_7_cloud_eval', label: '云判', status: 'pending', desc: '星载NPU边缘云雪快速评估' },
  { key: 'ob_8_fire_detect', label: '火灾检测', status: 'pending', desc: '红外多波段火斑与烟雾特征反演' },
  { key: 'ob_9_model_inferred', label: '模型推理完成', status: 'pending', desc: '完成目标定位与火险等级判定' },
  { key: 'ob_10_storage_start', label: '开始落盘到固存', status: 'pending', desc: '打包成果矢量与切片准备落盘' },
  { key: 'ob_11_storage_done', label: '落盘固存完成', status: 'pending', desc: '解译成果写入高速固存' },
  { key: 'ob_12_downlink_start', label: '文件启动下传', status: 'pending', desc: '测控数传窗口握手建立' },
  { key: 'ob_13_downlink_ground', label: '文件下传到地面站', status: 'pending', desc: '高速数传直传对地接收站' },
  { key: 'ob_14_stream_parsed', label: '码流文件解析', status: 'pending', desc: '地面站完成解密解调与帧同步' },
  { key: 'ob_15_result_parsed', label: '模型结果解析', status: 'pending', desc: '生成高精图层与火灾态势报告' },
  { key: 'ob_16_task_complete', label: '任务完成', status: 'pending', desc: '常规星地任务完整闭环' }
];

// 3. 常规模式 - 星上处理重规划流程阶段步骤（第 7 步：落盘失败重规划流）
export const REGULAR_ONBOARD_REPLAN_FLOW_STEPS: FlowStepItem[] = [
  { key: 'obr_1_start', label: '星上模型启动', status: 'pending', desc: '星载AI计算单元唤醒' },
  { key: 'obr_2_task_parsed', label: '任务解析完成', status: 'pending', desc: '星上任务调度器装载指令' },
  { key: 'obr_3_planning_done', label: '任务规划完成', status: 'pending', desc: '星上瞬时姿态与成像解算' },
  { key: 'obr_4_telecommand_gen1', label: '遥控指令生成', status: 'pending', desc: '载荷微秒级动作时钟生成' },
  { key: 'obr_5_camera_imaging1', label: '相机成像', status: 'pending', desc: '首次推扫曝光' },
  { key: 'obr_6_recording_fail', label: '成像数据落盘失败', status: 'pending', desc: '固存写入校验异常，触发重规划' },
  { key: 'obr_7_task_replan', label: '任务重规划', status: 'pending', desc: '自适应重分配高速缓存与曝光窗口' },
  { key: 'obr_8_telecommand_gen2', label: '遥控指令生成', status: 'pending', desc: '重新生成动作时钟序列' },
  { key: 'obr_9_camera_imaging2', label: '相机成像', status: 'pending', desc: '二次补拍推扫成像并成功落盘' },
  { key: 'obr_10_cloud_eval', label: '云判', status: 'pending', desc: '星载NPU边缘云雪快速评估' },
  { key: 'obr_11_fire_detect', label: '火灾检测', status: 'pending', desc: '红外多波段火斑与烟雾特征反演' },
  { key: 'obr_12_model_inferred', label: '模型推理完成', status: 'pending', desc: '完成目标定位与火险等级判定' },
  { key: 'obr_13_storage_start', label: '开始落盘到固存', status: 'pending', desc: '打包成果矢量与切片准备落盘' },
  { key: 'obr_14_storage_done', label: '落盘固存完成', status: 'pending', desc: '解译成果写入高速固存' },
  { key: 'obr_15_downlink_start', label: '文件启动下传', status: 'pending', desc: '测控数传窗口握手建立' },
  { key: 'obr_16_downlink_ground', label: '文件下传到地面站', status: 'pending', desc: '高速数传直传对地接收站' },
  { key: 'obr_17_stream_parsed', label: '码流文件解析', status: 'pending', desc: '地面站完成解密解调与帧同步' },
  { key: 'obr_18_result_parsed', label: '模型结果解析', status: 'pending', desc: '生成高精图层与火灾态势报告' },
  { key: 'obr_19_task_complete', label: '任务完成', status: 'pending', desc: '重规划后任务成功闭环' }
];

// 兼容别名
export const REGULAR_FLOW_STEPS: FlowStepItem[] = REGULAR_ONBOARD_FLOW_STEPS;

// 2. 一轨模式真实任务执行流程（全流程严格对齐 20 个关键节点）
export const SINGLE_ORBIT_FLOW_STEPS: FlowStepItem[] = [
  { key: 'so_1_ground_recv', label: '地面模型接收任务', status: 'pending', desc: '接收用户一轨火情应急指令' },
  { key: 'so_2_intent_parse', label: '任务意图解析', status: 'pending', desc: '快速语义解析与观测目标匹配' },
  { key: 'so_3_pkg_assemble', label: '任务包组装与发送', status: 'pending', desc: '秒级生成直通遥控注数包并上行' },
  { key: 'so_4_pkg_sent', label: '任务发送成功', status: 'pending', desc: '地面测控站完成高速指令上注' },
  { key: 'so_5_onboard_start', label: '星上模型启动', status: 'pending', desc: '唤醒星载AI加速与任务调度' },
  { key: 'so_6_task_parsed', label: '任务解析完成', status: 'pending', desc: '星上任务管理器解析上注指令' },
  { key: 'so_7_planning_done', label: '任务规划完成', status: 'pending', desc: '瞬时姿态侧摆与成像时钟解算' },
  { key: 'so_8_telecommand_gen', label: '遥控指令生成', status: 'pending', desc: '星上载荷动作时钟帧生成' },
  { key: 'so_9_camera_imaging', label: '相机成像', status: 'pending', desc: '宽幅多光谱相机推扫曝光成像' },
  { key: 'so_10_data_recording', label: '成像数据落盘', status: 'pending', desc: '高速固存实时写入原始数据' },
  { key: 'so_11_cloud_eval', label: '云判', status: 'pending', desc: '星载边缘AI快速评估云雪覆盖' },
  { key: 'so_12_fire_detect', label: '火灾检测', status: 'pending', desc: '红外波段热异常与烟雾目标反演' },
  { key: 'so_13_model_inferred', label: '模型推理完成', status: 'pending', desc: '完成目标定位与火险等级评定' },
  { key: 'so_14_storage_start', label: '开始落盘到固存', status: 'pending', desc: '打包成果矢量与切片准备落盘' },
  { key: 'so_15_storage_done', label: '落盘固存完成', status: 'pending', desc: '解译成果写入高速固存' },
  { key: 'so_16_downlink_start', label: '文件启动下传', status: 'pending', desc: '利用当前入境测控窗口启动对地下传' },
  { key: 'so_17_downlink_ground', label: '文件下传到地面站', status: 'pending', desc: '高速数传直通地面站' },
  { key: 'so_18_stream_parsed', label: '码流文件解析', status: 'pending', desc: '地面解密解调并解析数据码流' },
  { key: 'so_19_result_parsed', label: '模型结果解析', status: 'pending', desc: '生成火灾告警矢量与遥感仿真图' },
  { key: 'so_20_task_complete', label: '任务完成', status: 'pending', desc: '一轨即时成像与火灾检测任务闭环' }
];

// 3. 长时序监测模式真实任务执行流程：地面4步 + 星上16步
export const TIME_SERIES_GROUND_STEPS: FlowStepItem[] = [
  { key: 'ts_gm_1_recv', label: '地面模型接收任务', status: 'pending', desc: '接收长时序监测自动化需求' },
  { key: 'ts_gm_2_parse', label: '任务意图解析', status: 'pending', desc: '提取高风险区域与周期性时空特征' },
  { key: 'ts_gm_3_package', label: '任务包组装与发送', status: 'pending', desc: '组装测控指令包并注数上行' },
  { key: 'ts_gm_4_send_success', label: '任务发送成功', status: 'pending', desc: '地面测控站完成上注与握手确认' },
];

export const TIME_SERIES_ONBOARD_STEPS: FlowStepItem[] = [
  { key: 'ts_ob_1_start', label: '星上模型启动', status: 'pending', desc: '唤醒星载AI加速与调度系统' },
  { key: 'ts_ob_2_task_parsed', label: '任务解析完成', status: 'pending', desc: '星上任务管理器解析上注指令' },
  { key: 'ts_ob_3_planning_done', label: '任务规划完成', status: 'pending', desc: '瞬时姿态侧摆与成像时钟解算' },
  { key: 'ts_ob_4_telecommand_gen', label: '遥控指令生成', status: 'pending', desc: '载荷微秒级动作时钟生成' },
  { key: 'ts_ob_5_camera_imaging', label: '相机成像', status: 'pending', desc: '高分多光谱/红外载荷推扫曝光' },
  { key: 'ts_ob_6_data_recording', label: '成像数据落盘', status: 'pending', desc: '原始像元数据直写高速固存' },
  { key: 'ts_ob_7_cloud_eval', label: '云判', status: 'pending', desc: '星载NPU边缘云雪快速评估' },
  { key: 'ts_ob_8_fire_detect', label: '火灾检测', status: 'pending', desc: '红外多波段火斑与烟雾特征反演' },
  { key: 'ts_ob_9_model_inferred', label: '模型推理完成', status: 'pending', desc: '完成目标定位与火险等级判定' },
  { key: 'ts_ob_10_storage_start', label: '开始落盘到固存', status: 'pending', desc: '打包成果矢量与切片准备落盘' },
  { key: 'ts_ob_11_storage_done', label: '落盘固存完成', status: 'pending', desc: '解译成果写入高速固存' },
  { key: 'ts_ob_12_downlink_start', label: '文件启动下传', status: 'pending', desc: '测控数传窗口握手建立' },
  { key: 'ts_ob_13_downlink_ground', label: '文件下传到地面站', status: 'pending', desc: '高速数传直传对地接收站' },
  { key: 'ts_ob_14_stream_parsed', label: '码流文件解析', status: 'pending', desc: '地面站完成解密解调与帧同步' },
  { key: 'ts_ob_15_result_parsed', label: '模型结果解析', status: 'pending', desc: '生成高精图层与火灾态势报告' },
  { key: 'ts_ob_16_task_complete', label: '任务完成', status: 'pending', desc: '星地任务完整闭环' }
];

export const TIME_SERIES_FLOW_STEPS: FlowStepItem[] = TIME_SERIES_GROUND_STEPS;

// 长时序监测 4 个高风险目标地点
export const HIGH_RISK_LOCATIONS = [
  { name: '江西省上饶市婺源县', lng: 118.1104, lat: 29.3168 },
  { name: '越南', lng: 107.3092, lat: 21.3240 },
  { name: '朝鲜', lng: 128.9606, lat: 41.9096 },
  { name: '俄罗斯', lng: 122.8761, lat: 53.6871 }
];

// 默认兼容
export const INITIAL_FLOW_STEPS: FlowStepItem[] = REGULAR_FLOW_STEPS;

export const INITIAL_HISTORY_SESSIONS: HistorySession[] = [
  {
    id: 'sess-1',
    title: '云尖沐曦号应急一轨即时成像（成功）',
    timestamp: '10:24',
    dateGroup: '今日',
    messageCount: 3,
    type: 'task-planning',
    hasResultBadge: true,
  },
  {
    id: 'sess-ningbo-1',
    title: '安排明天下午宁波港口观测任务',
    timestamp: '09:29',
    dateGroup: '今日',
    messageCount: 8,
    type: 'task-planning',
    hasResultBadge: true,
  },
  {
    id: 'sess-5-fail',
    title: '上海城区多光谱常规成像规划（失败）',
    timestamp: '11:20',
    dateGroup: '今日',
    messageCount: 2,
    type: 'task-planning',
  },
  {
    id: 'sess-1-fail',
    title: '拍摄西湖应急一轨成像任务（失败）',
    timestamp: '10:40',
    dateGroup: '今日',
    messageCount: 2,
    type: 'task-planning',
  }
];

// 高质量遥感仿真图（带火灾检测热点与高分地貌）
export const SAMPLE_RESULT_IMAGES = {
  fireDetection: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80', // 森林/热点红外遥感
  earthSatellite: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', // 湖泊地貌
  urbanSatellite: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1200&q=80' // 城市之江园区
};
