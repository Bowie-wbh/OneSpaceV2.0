export interface TelemetryItem {
  id: number;
  code: string;
  name: string;
  basis?: string; // 判读依据
  subsystemKey?: SystemKey;
  subsystemName?: string;
  channelKey?: 'EPSA1' | 'EPSA2' | 'EPSB1' | 'EPSB2' | 'OBC' | 'ADCS';
  channelLabel?: string;
  value: string;
  isNormal: boolean;
  statusText: string;
  description?: string;
  updateTime?: string;
}

export interface TelemetryChannelGroup {
  key: 'EPSA1' | 'EPSA2' | 'EPSB1' | 'EPSB2' | 'OBC' | 'ADCS';
  title: string;
  code: string;
  totalCount: number;
  items: TelemetryItem[];
}

// 9个分系统健康状态定义
export type SystemKey = 
  | 'thermal'      // 热控
  | 'energy'       // 能源
  | 'adcs'         // 姿轨控
  | 'ttc'          // 测控数传
  | 'router'       // 路由
  | 'ai_compute'   // 智算
  | 'cn_ai'        // 国产智算
  | 'ir_camera'    // 红外相机
  | 'laser';       // 激光

export type SubsystemHealthLevel = 'healthy' | 'attention' | 'alarm'; // 健康 | 关注 | 告警

export interface SubsystemStatus {
  key: SystemKey;
  name: string;
  healthLevel: SubsystemHealthLevel; // 'healthy' | 'attention' | 'alarm'
  isNormal: boolean;
  statusText: '健康' | '关注' | '告警';
  anomalyCounts: {
    class1: number;
    class2: number;
    class3: number;
  };
  summary: string;
}

export interface AnomalyItem {
  id: string;
  classType: 'I' | 'II' | 'III';
  systemKey: SystemKey;
  systemName: string;
  discoveryTime: string;
  anomalyType: string;
  telemetryCode: string;
  detailSummary: string;
  symptom?: string; // 异常现象描述
  actionMeasure?: string; // 处置措施
  reportData?: {
    reportTitle: string;
    findings: string[];
    actionSuggestions: string[];
  };
  processStatus: '已处置' | '待复核' | '待处理';
  actionRecord?: {
    handledTime: string;
    actionPlan: string;
    executionLog: string[];
    result: string;
  };
  telecommandHex?: string;
}

// 默认基础 6 个监测表单分组数据
export const BASE_TELEMETRY_DATA_GROUPS: TelemetryChannelGroup[] = [
  {
    key: 'EPSA1',
    title: 'A-BUS 电源主通道（EPSA1）',
    code: 'EPSA1',
    totalCount: 15,
    items: [
      { id: 1, code: 'TMEA001', name: '放电开关状态', basis: '开', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '开', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 2, code: 'TMEA002', name: '放电电子开关状态', basis: '关', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '关', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 3, code: 'TMEA003', name: '母线电压遥测', basis: '21V~29.2V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '28.35 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 4, code: 'TMEA004', name: '母线电流遥测', basis: '0A~10A', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '4.18 A', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 5, code: 'TMEA005', name: '蓄电池输出电压遥测', basis: '21V~29.2V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '28.18 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 6, code: 'TMEA006', name: '充放电电流遥测', basis: '-10A~10A', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '+1.32 A', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 7, code: 'TMEA007', name: '太阳阵电流遥测', basis: '0A~14A', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '6.45 A', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 8, code: 'TMEA010', name: 'BAT_TEMP_蓄电池温度主（AD590）', basis: '0℃~30℃', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '18.5 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 9, code: 'TMEA039', name: 'VDC-TM-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '5.02 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 10, code: 'TMEA040', name: 'VDC-OBC-YC', basis: '11V~13V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '12.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 11, code: 'TMEA042', name: 'VDC-TEMP-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '4.98 V', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 12, code: 'TMEA043', name: 'VDC-EPS-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '5.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 13, code: 'TMEA044', name: 'STC-12V-YC', basis: '11V~13V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '12.04 V', isNormal: true, statusText: '正常', updateTime: '14:28:35' },
      { id: 14, code: 'TMEA050', name: 'VDC-OBC-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '4.99 V', isNormal: true, statusText: '正常', updateTime: '14:28:35' },
      { id: 15, code: 'TMEA051', name: 'VDC-OBC-3V3-YC', basis: '2.7V~3.6V', channelKey: 'EPSA1', channelLabel: 'A-BUS 主通道', value: '3.31 V', isNormal: true, statusText: '正常', updateTime: '14:28:35' }
    ]
  },
  {
    key: 'EPSA2',
    title: 'A-BUS 电源备份通道（EPSA2）',
    code: 'EPSA2',
    totalCount: 12,
    items: [
      { id: 1, code: 'TMEA105', name: 'VDC-Z-12V-YC', basis: '11V~13V', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '12.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 2, code: 'TMEA106', name: 'VDC-Z-16V-YC', basis: '4.5V~5.5V', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '5.02 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 3, code: 'TMEA108', name: 'VDC-Z-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '5.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 4, code: 'TMEA109', name: 'GNC-FL-12V-2-YC', basis: '4.5V~5.5V', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '4.98 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 5, code: 'TMEA110', name: 'GNC-12V-YC', basis: '11V~13V', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '12.02 V', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 6, code: 'TMEA111', name: 'GNC-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '4.99 V', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 7, code: 'TMEA133', name: 'AD1_A_星敏a测温主（MF501）', basis: '-20℃~50℃', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '14.2 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 8, code: 'TMEA136', name: 'AD4_A_内部_智算机（G1）电压采集（0-5V）', basis: '', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '3.32 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 9, code: 'TMEA137', name: 'AD5_A_内部_智算机（G1）温度采集（SDNT1608）', basis: '', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '28.4 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 10, code: 'TMEA138', name: 'AD6_A_内部_路由备（R1）电压采集（0-5V）', basis: '', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '3.30 V', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 11, code: 'TMEA139', name: 'AD7_A_内部_路由主（R1）温度采集（SDNT1608）', basis: '-20℃~50℃', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '22.4 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:35' },
      { id: 12, code: 'TMEA141', name: 'UTCA-12V-YC', basis: '11V~13V', channelKey: 'EPSA2', channelLabel: 'A-BUS 备份通道', value: '12.00 V', isNormal: true, statusText: '正常', updateTime: '14:28:35' }
    ]
  },
  {
    key: 'EPSB1',
    title: 'B-BUS 电源主通道（EPSB1）',
    code: 'EPSB1',
    totalCount: 4,
    items: [
      { id: 1, code: 'TMEB040', name: 'VDC-OBC-YC', basis: '0V~0.5V', channelKey: 'EPSB1', channelLabel: 'B-BUS 主通道', value: '0.12 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 2, code: 'TMEB042', name: 'VDC-TEMP-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSB1', channelLabel: 'B-BUS 主通道', value: '4.99 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 3, code: 'TMEB043', name: 'VDC-EPS-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSB1', channelLabel: 'B-BUS 主通道', value: '5.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 4, code: 'TMEB044', name: 'STC-12V-YC', basis: '11V~13V', channelKey: 'EPSB1', channelLabel: 'B-BUS 主通道', value: '12.03 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
    ]
  },
  {
    key: 'EPSB2',
    title: 'B-BUS 电源备份通道（EPSB2）',
    code: 'EPSB2',
    totalCount: 12,
    items: [
      { id: 1, code: 'TMEB105', name: 'VDC-Z-12V-YC', basis: '11V~13V', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '12.02 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 2, code: 'TMEB106', name: 'VDC-Z-16V-YC', basis: '4.5V~5.5V', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '5.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 3, code: 'TMEB108', name: 'VDC-Z-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '5.00 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 4, code: 'TMEB109', name: 'GNC-FL-12V-2-YC', basis: '4.5V~5.5V', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '4.98 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 5, code: 'TMEB110', name: 'GNC-12V-YC', basis: '11V~13V', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '11.99 V', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 6, code: 'TMEB111', name: 'GNC-5V-YC', basis: '4.5V~5.5V', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '5.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 7, code: 'TMEB133', name: 'AD1_B_星敏a测温备（MF501）', basis: '-20℃~50℃', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '14.8 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 8, code: 'TMEB136', name: 'AD4_B_内部_智算机（YX）电压采集（0-5V）', basis: '', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '3.31 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 9, code: 'TMEB137', name: 'AD5_B_内部_智算机（YX）温度采集（SDNT1608）', basis: '', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '24.1 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 10, code: 'TMEB138', name: 'AD6_B_内部_路由主（R1）电压采集（0-5V）', basis: '', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '3.30 V', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 11, code: 'TMEB139', name: 'AD7_B_内部_路由备（R1）温度采集（SDNT1608）', basis: '-20℃~50℃', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '21.8 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:35' },
      { id: 12, code: 'TMEB141', name: 'UTCB-12V-YC', basis: '11V~13V', channelKey: 'EPSB2', channelLabel: 'B-BUS 备份通道', value: '12.02 V', isNormal: true, statusText: '正常', updateTime: '14:28:35' }
    ]
  },
  {
    key: 'OBC',
    title: '星务计算机（OBC）',
    code: 'OBC',
    totalCount: 12,
    items: [
      { id: 1, code: 'TMO001', name: 'MCU供电电压', basis: '2.7V~3.6V', channelKey: 'OBC', channelLabel: '星务计算机', value: '3.31 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 2, code: 'TMO002', name: 'MCU供电电流', basis: '0A~0.5A', channelKey: 'OBC', channelLabel: '星务计算机', value: '0.42 A', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
      { id: 3, code: 'TMO003', name: 'IO驱动芯片供电电压', basis: '2.7V~3.6V', channelKey: 'OBC', channelLabel: '星务计算机', value: '3.30 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 4, code: 'TMO004', name: 'IO驱动芯片供电电流', basis: '0A~0.5A', channelKey: 'OBC', channelLabel: '星务计算机', value: '0.18 A', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
      { id: 5, code: 'TMO005', name: 'MRAM供电电压', basis: '2.7V~3.6V', channelKey: 'OBC', channelLabel: '星务计算机', value: '3.32 V', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 6, code: 'TMO006', name: 'MRAM供电电流', basis: '0A~0.5A', channelKey: 'OBC', channelLabel: '星务计算机', value: '0.25 A', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
      { id: 7, code: 'TMO007', name: 'FLASH供电电压', basis: '2.7V~3.6V', channelKey: 'OBC', channelLabel: '星务计算机', value: '3.29 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 8, code: 'TMO008', name: 'FLASH供电电流', basis: '0A~0.5A', channelKey: 'OBC', channelLabel: '星务计算机', value: '0.31 A', isNormal: true, statusText: '正常', updateTime: '14:28:33' },
      { id: 9, code: 'TMO009', name: '422/CAN芯片供电电压', basis: '2.7V~3.6V', channelKey: 'OBC', channelLabel: '星务计算机', value: '3.30 V', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 10, code: 'TMO010', name: '422/CAN芯片供电电流', basis: '0A~0.5A', channelKey: 'OBC', channelLabel: '星务计算机', value: '0.12 A', isNormal: true, statusText: '正常', updateTime: '14:28:34' },
      { id: 11, code: 'TMO011', name: '扩展串口芯片供电电压', basis: '2.7V~3.6V', channelKey: 'OBC', channelLabel: '星务计算机', value: '3.30 V', isNormal: true, statusText: '正常', updateTime: '14:28:35' },
      { id: 12, code: 'TMO012', name: '扩展串口芯片供电电流', basis: '0A~0.5A', channelKey: 'OBC', channelLabel: '星务计算机', value: '0.08 A', isNormal: true, statusText: '正常', updateTime: '14:28:35' }
    ]
  },
  {
    key: 'ADCS',
    title: '姿控快包（ADCS）',
    code: 'ADCS',
    totalCount: 1,
    items: [
      { id: 1, code: 'TMZS004', name: '工作模式', basis: '常态是业务模式', channelKey: 'ADCS', channelLabel: '姿控快包', value: '业务模式 (标称指向)', isNormal: true, statusText: '正常', updateTime: '14:28:30', description: '常态是业务模式' }
    ]
  }
];

export const TELEMETRY_DATA_GROUPS = BASE_TELEMETRY_DATA_GROUPS;

export type HealthTimeSpan = 'today' | 'week' | 'month' | 'history'; // 今日 | 本周 | 本月 | 历史

export interface SatelliteHealthOverviewData {
  daysInOrbit: number;
  totalAnomalies: number;
  resolvedAnomalies: number;
  manualResolvedAnomalies: number;
}

// 获取各卫星的概览统计（支持按 今日/本周/本月/历史 动态切换数据）
export function getSatelliteOverview(satelliteId: string, timeSpan: HealthTimeSpan = 'history'): SatelliteHealthOverviewData {
  const isHighSpectrum = satelliteId === 'scs-03-14' || satelliteId === 'zj-tm01';
  const isSarRadar = satelliteId === 'scs-01-06' || satelliteId === 'scs-01-09' || satelliteId === 'tg-02';
  const isWeatherSat = satelliteId === 'scs-04-15' || satelliteId === 'tx-03';

  if (timeSpan === 'today') {
    if (isHighSpectrum) {
      return { daysInOrbit: 1, totalAnomalies: 1, resolvedAnomalies: 1, manualResolvedAnomalies: 0 };
    }
    if (isSarRadar) {
      return { daysInOrbit: 1, totalAnomalies: 0, resolvedAnomalies: 0, manualResolvedAnomalies: 0 };
    }
    if (isWeatherSat) {
      return { daysInOrbit: 1, totalAnomalies: 2, resolvedAnomalies: 1, manualResolvedAnomalies: 1 };
    }
    return { daysInOrbit: 1, totalAnomalies: 2, resolvedAnomalies: 1, manualResolvedAnomalies: 1 };
  }

  if (timeSpan === 'week') {
    if (isHighSpectrum) {
      return { daysInOrbit: 7, totalAnomalies: 3, resolvedAnomalies: 2, manualResolvedAnomalies: 1 };
    }
    if (isSarRadar) {
      return { daysInOrbit: 7, totalAnomalies: 1, resolvedAnomalies: 1, manualResolvedAnomalies: 0 };
    }
    if (isWeatherSat) {
      return { daysInOrbit: 7, totalAnomalies: 4, resolvedAnomalies: 3, manualResolvedAnomalies: 1 };
    }
    return { daysInOrbit: 7, totalAnomalies: 4, resolvedAnomalies: 3, manualResolvedAnomalies: 1 };
  }

  if (timeSpan === 'month') {
    if (isHighSpectrum) {
      return { daysInOrbit: 30, totalAnomalies: 5, resolvedAnomalies: 4, manualResolvedAnomalies: 1 };
    }
    if (isSarRadar) {
      return { daysInOrbit: 30, totalAnomalies: 2, resolvedAnomalies: 2, manualResolvedAnomalies: 0 };
    }
    if (isWeatherSat) {
      return { daysInOrbit: 30, totalAnomalies: 9, resolvedAnomalies: 7, manualResolvedAnomalies: 2 };
    }
    return { daysInOrbit: 30, totalAnomalies: 8, resolvedAnomalies: 6, manualResolvedAnomalies: 2 };
  }

  // 默认历史累计
  if (isHighSpectrum) {
    return { daysInOrbit: 245, totalAnomalies: 8, resolvedAnomalies: 6, manualResolvedAnomalies: 2 };
  }
  if (isSarRadar) {
    return { daysInOrbit: 89, totalAnomalies: 3, resolvedAnomalies: 2, manualResolvedAnomalies: 1 };
  }
  if (isWeatherSat) {
    return { daysInOrbit: 310, totalAnomalies: 15, resolvedAnomalies: 12, manualResolvedAnomalies: 3 };
  }
  return { daysInOrbit: 168, totalAnomalies: 12, resolvedAnomalies: 9, manualResolvedAnomalies: 2 };
}

// 获取各卫星专属的遥测分组数据
export function getTelemetryDataForSatellite(satelliteId: string, timeFilter = 'latest'): TelemetryChannelGroup[] {
  return BASE_TELEMETRY_DATA_GROUPS.map(group => {
    const items = group.items.map(item => {
      let isNormal = item.isNormal;
      let statusText = item.statusText;
      let value = item.value;
      let description = item.description;

      const isHighSpectrum = satelliteId === 'scs-03-14' || satelliteId === 'zj-tm01';
      const isSarRadar = satelliteId === 'scs-01-06' || satelliteId === 'scs-01-09' || satelliteId === 'tg-02';
      const isWeatherSat = satelliteId === 'scs-04-15' || satelliteId === 'tx-03';

      if (isHighSpectrum) {
        if (item.code === 'TMEA043') {
          isNormal = true;
          statusText = '正常';
          value = '5.03 V';
          description = undefined;
        } else if (item.code === 'TMEA137') {
          isNormal = true;
          statusText = '正常';
          value = '28.6 ℃';
          description = undefined;
        } else if (item.code === 'TMEB106') {
          isNormal = false;
          statusText = '不正常';
          value = '5.85 V (偏高)';
          description = '备份通道二次降压轻度超标';
        } else if (item.code === 'TMO008') {
          isNormal = false;
          statusText = '不正常';
          value = '0.58 A (偏高)';
          description = 'Flash读写峰值电流偏大';
        }
      } else if (isSarRadar) {
        isNormal = true;
        statusText = '正常';
        if (item.code === 'TMEA043') value = '5.01 V';
        if (item.code === 'TMEA137') value = '23.5 ℃';
        description = undefined;
      } else if (isWeatherSat) {
        if (item.code === 'TMEA043') {
          isNormal = true;
          statusText = '正常';
          value = '5.02 V';
        } else if (item.code === 'TMEA137') {
          isNormal = true;
          statusText = '正常';
          value = '25.2 ℃';
        } else if (item.code === 'TMEB043') {
          isNormal = false;
          statusText = '不正常';
          value = '4.62 V (偏低)';
          description = 'B通道5V供电轻度欠压';
        }
      }

      let updateTime = item.updateTime || '14:28:30';
      if (timeFilter === '10m') updateTime = '10分钟前';
      else if (timeFilter === '1h') updateTime = '1小时前';
      else if (timeFilter === '24h') updateTime = '今天 08:30';
      else if (timeFilter === '7d') updateTime = '3天前';

      return {
        ...item,
        isNormal,
        statusText,
        value,
        description,
        updateTime
      };
    });

    return {
      ...group,
      items
    };
  });
}

// 9个分系统的基础核心遥测字典 (1/2)
const CORE_TELEMETRIES_DICT_PART1: Record<string, TelemetryItem[]> = {
  thermal: [
    { id: 101, code: 'TMTH001', name: '流体回路供液温度', basis: '15℃~28℃', subsystemKey: 'thermal', subsystemName: '热控', value: '21.4 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 102, code: 'TMTH002', name: '辐射制冷板表面温度', basis: '-40℃~10℃', subsystemKey: 'thermal', subsystemName: '热控', value: '-18.5 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 103, code: 'TMTH003', name: '蓄电池组贴片测温1#', basis: '10℃~25℃', subsystemKey: 'thermal', subsystemName: '热控', value: '18.2 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 104, code: 'TMTH004', name: '主载荷舱内壁探头', basis: '15℃~30℃', subsystemKey: 'thermal', subsystemName: '热控', value: '22.0 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ],
  energy: [
    { id: 201, code: 'TMEA003', name: '主电源母线电压遥测', basis: '21V~29.2V', subsystemKey: 'energy', subsystemName: '能源', value: '28.35 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 202, code: 'TMEA004', name: '电源母线总电流遥测', basis: '0A~10A', subsystemKey: 'energy', subsystemName: '能源', value: '4.18 A', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 203, code: 'TMEA005', name: '蓄电池组输出端电压', basis: '21V~29.2V', subsystemKey: 'energy', subsystemName: '能源', value: '28.18 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 204, code: 'TMEA006', name: '充放电实时电流遥测', basis: '-10A~10A', subsystemKey: 'energy', subsystemName: '能源', value: '+1.32 A', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 205, code: 'TMEA007', name: '太阳翼光伏阵列电流', basis: '0A~14A', subsystemKey: 'energy', subsystemName: '能源', value: '6.45 A', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 206, code: 'TMEA043', name: 'VDC-EPS-5V稳压采集', basis: '4.5V~5.5V', subsystemKey: 'energy', subsystemName: '能源', value: '5.01 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ],
  adcs: [
    { id: 301, code: 'TMZS001', name: '三轴姿态角速度模长', basis: '< 0.01°/s', subsystemKey: 'adcs', subsystemName: '姿轨控', value: '0.0028 °/s', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 302, code: 'TMZS002', name: 'X轴反作用飞轮转速', basis: '-5000~5000rpm', subsystemKey: 'adcs', subsystemName: '姿轨控', value: '+2140 rpm', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 303, code: 'TMZS003', name: '星敏A四元数解算指向', basis: '三轴标称', subsystemKey: 'adcs', subsystemName: '姿轨控', value: '对地标称指向', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 304, code: 'TMZS004', name: '姿控系统在轨工作模式', basis: '业务模式', subsystemKey: 'adcs', subsystemName: '姿轨控', value: '业务测控模式', isNormal: true, statusText: '正常', updateTime: '14:28:32' }
  ],
  ttc: [
    { id: 401, code: 'TMTTC001', name: 'X频段应答机接收AGC', basis: '-105~-60dBm', subsystemKey: 'ttc', subsystemName: '测控数传', value: '-78.4 dBm', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 402, code: 'TMTTC002', name: '高速数传发射机射频功率', basis: '38~42dBm', subsystemKey: 'ttc', subsystemName: '测控数传', value: '40.2 dBm', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 403, code: 'TMTTC003', name: '星地数传信道误码率', basis: '< 1e-8', subsystemKey: 'ttc', subsystemName: '测控数传', value: '2.1e-10', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 404, code: 'TMTTC004', name: '应答机载波锁定指示', basis: '锁定', subsystemKey: 'ttc', subsystemName: '测控数传', value: '双向锁定标称', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ]
};
const CORE_TELEMETRIES_DICT_PART2: Record<string, TelemetryItem[]> = {
  router: [
    { id: 501, code: 'TML509', name: '星载路由器CPLD电压', basis: '0V~2.0V', subsystemKey: 'router', subsystemName: '路由', value: '1.80 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 502, code: 'TML511', name: '交换矩阵端口链路状态', basis: '8/8连通', subsystemKey: 'router', subsystemName: '路由', value: '全链路通畅', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 503, code: 'TML513', name: '星间网络动态路由跳数', basis: '1~3跳', subsystemKey: 'router', subsystemName: '路由', value: '2 跳 (低时延)', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 504, code: 'TML515', name: '星地/星间路由丢包率', basis: '< 0.01%', subsystemKey: 'router', subsystemName: '路由', value: '0.000%', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ],
  ai_compute: [
    { id: 601, code: 'TMO001', name: '星载AI主控MCU电压', basis: '2.7V~3.6V', subsystemKey: 'ai_compute', subsystemName: '智算', value: '3.31 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 602, code: 'TMO007', name: '大容量FLASH供电电压', basis: '2.7V~3.6V', subsystemKey: 'ai_compute', subsystemName: '智算', value: '3.29 V', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 603, code: 'TMO008', name: 'FLASH高速读写峰值电流', basis: '0A~0.5A', subsystemKey: 'ai_compute', subsystemName: '智算', value: '0.31 A', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 604, code: 'TMEB136', name: '智算机YX工作采集电压', basis: '3.0V~3.6V', subsystemKey: 'ai_compute', subsystemName: '智算', value: '3.31 V', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ],
  cn_ai: [
    { id: 701, code: 'TMCNAI01', name: '国产NPU加速核供电电压', basis: '0.8V~1.1V', subsystemKey: 'cn_ai', subsystemName: '国产智算', value: '0.95 V', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 702, code: 'TMCNAI02', name: '异构阵列核心工作温度', basis: '-20℃~70℃', subsystemKey: 'cn_ai', subsystemName: '国产智算', value: '38.4 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 703, code: 'TMCNAI03', name: '片上SRAM ECC纠错率', basis: '< 5次/天', subsystemKey: 'cn_ai', subsystemName: '国产智算', value: '0 次/h', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 704, code: 'TMCNAI04', name: '红外火点解译算力负荷', basis: '0%~100%', subsystemKey: 'cn_ai', subsystemName: '国产智算', value: '26.8 %', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ],
  ir_camera: [
    { id: 801, code: 'TMIR001', name: '斯特林深冷机制冷电流', basis: '1.0A~3.5A', subsystemKey: 'ir_camera', subsystemName: '红外相机', value: '2.14 A', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 802, code: 'TMIR002', name: '焦平面探测器工作温度', basis: '75K~80K', subsystemKey: 'ir_camera', subsystemName: '红外相机', value: '77.2 K', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 803, code: 'TMIR003', name: '光学镜头均热罩温度', basis: '18℃~24℃', subsystemKey: 'ir_camera', subsystemName: '红外相机', value: '20.5 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 804, code: 'TMIR004', name: '成像曝光行周期同步脉冲', basis: '同步锁相', subsystemKey: 'ir_camera', subsystemName: '红外相机', value: '标称同步', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ],
  laser: [
    { id: 901, code: 'TMLS001', name: '804激光发射机光功率', basis: '1.2W~2.5W', subsystemKey: 'laser', subsystemName: '激光', value: '1.85 W', isNormal: true, statusText: '正常', updateTime: '14:28:30' },
    { id: 902, code: 'TMLS002', name: '精跟瞄光轴跟踪角残差', basis: '< 2.0μrad', subsystemKey: 'laser', subsystemName: '激光', value: '0.85 μrad', isNormal: true, statusText: '正常', updateTime: '14:28:31' },
    { id: 903, code: 'TMLS003', name: 'EDFA放大器泵浦电流', basis: '200~600mA', subsystemKey: 'laser', subsystemName: '激光', value: '420 mA', isNormal: true, statusText: '正常', updateTime: '14:28:32' },
    { id: 904, code: 'TMLS004', name: '激光发射机本体温度', basis: '15℃~35℃', subsystemKey: 'laser', subsystemName: '激光', value: '24.8 ℃', isNormal: true, statusText: '正常', updateTime: '14:28:33' }
  ]
};

// 获取分系统核心遥测列表（自动适配不同卫星的异常表现）
export function getCoreTelemetriesForSubsystem(satelliteId: string, systemKey?: SystemKey): TelemetryItem[] {
  const result: TelemetryItem[] = [];
  const fullDict: Record<string, TelemetryItem[]> = { ...CORE_TELEMETRIES_DICT_PART1, ...CORE_TELEMETRIES_DICT_PART2 };
  const keys = systemKey ? [systemKey] : (Object.keys(fullDict) as SystemKey[]);

  keys.forEach(k => {
    const list = fullDict[k] || [];
    list.forEach(item => {
      let isNormal = item.isNormal;
      let statusText = item.statusText;
      let value = item.value;

      if (satelliteId === 'tx-03' && item.code === 'TMEA043') {
        isNormal = false;
        statusText = '不正常';
        value = '4.62 V (偏低)';
      } else if (satelliteId === 'zj-tm01' && item.code === 'TMO008') {
        isNormal = false;
        statusText = '不正常';
        value = '0.58 A (偏高)';
      } else if (satelliteId === 'yj-mx01') {
        if (item.code === 'TMLS001') {
          isNormal = false;
          statusText = '不正常';
          value = '1.14 W (预警衰减)';
        } else if (item.code === 'TMLS002') {
          isNormal = false;
          statusText = '不正常';
          value = '2.84 μrad (超标)';
        }
      }

      result.push({
        ...item,
        isNormal,
        statusText,
        value
      });
    });
  });

  return result;
}
// 获取各卫星的分系统状态
export function getSubsystemsForSatellite(satelliteId: string): SubsystemStatus[] {
  const isHighSpectrum = satelliteId === 'scs-03-14' || satelliteId === 'zj-tm01';
  const isSarRadar = satelliteId === 'scs-01-06' || satelliteId === 'scs-01-09' || satelliteId === 'tg-02';
  const isWeatherSat = satelliteId === 'scs-04-15' || satelliteId === 'tx-03';

  if (isSarRadar) {
    return [
      { key: 'thermal', name: '热控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '整星热平衡状态优良，多层隔热层完好' },
      { key: 'energy', name: '能源', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '母线供电稳定，蓄电池满充均衡度 99.2%' },
      { key: 'adcs', name: '姿轨控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '雷达对地指向精度优于 0.005°' },
      { key: 'ttc', name: '测控数传', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '双频段信标锁定可靠，下行误码率 1e-9' },
      { key: 'router', name: '路由', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '星地/星间路由拓扑正常，无丢包' },
      { key: 'ai_compute', name: '智算', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: 'SAR快速成像边缘解译引擎就绪' },
      { key: 'cn_ai', name: '国产智算', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '国产异构加速单元标称运行' },
      { key: 'ir_camera', name: '红外相机', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '辅助红外测温模组处于恒温区' },
      { key: 'laser', name: '激光', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '星间激光通信信标建链成功' }
    ];
  }

  if (isHighSpectrum) {
    return [
      { key: 'thermal', name: '热控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '红外相机深冷温区稳定在 77K' },
      { key: 'energy', name: '能源', healthLevel: 'attention', isNormal: false, statusText: '关注', anomalyCounts: { class1: 1, class2: 0, class3: 0 }, summary: 'B-BUS 备份通道输出电压轻微超标，已切换主路' },
      { key: 'adcs', name: '姿轨控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '极轨太阳同步指向稳定' },
      { key: 'ttc', name: '测控数传', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '数传通道速率 1.2Gbps 标称' },
      { key: 'router', name: '路由', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '星载路由主通道运行稳定' },
      { key: 'ai_compute', name: '智算', healthLevel: 'attention', isNormal: false, statusText: '关注', anomalyCounts: { class1: 0, class2: 1, class3: 0 }, summary: 'Flash读写功耗峰值偶发偏大' },
      { key: 'cn_ai', name: '国产智算', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '红外边缘火点推理正常' },
      { key: 'ir_camera', name: '红外相机', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '高分辨率红外热成像仪工作正常' },
      { key: 'laser', name: '激光', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '激光测距组件状态良好' }
    ];
  }

  if (isWeatherSat) {
    return [
      { key: 'thermal', name: '热控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '热控回路温差平衡良好' },
      { key: 'energy', name: '能源', healthLevel: 'attention', isNormal: false, statusText: '关注', anomalyCounts: { class1: 1, class2: 0, class3: 0 }, summary: 'B通道5V供电轻度欠压，已恢复' },
      { key: 'adcs', name: '姿轨控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '反作用飞轮运转稳定' },
      { key: 'ttc', name: '测控数传', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '1.8Gbps 高速数传通畅' },
      { key: 'router', name: '路由', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '路由转发无误码' },
      { key: 'ai_compute', name: '智算', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '大容量固存管理正常' },
      { key: 'cn_ai', name: '国产智算', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '高光谱在轨解译模块就绪' },
      { key: 'ir_camera', name: '红外相机', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '超高分相机热控完好' },
      { key: 'laser', name: '激光', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '激光测距与通信链路正常' }
    ];
  }

  // 默认云尖沐曦号及各计算星（包含 健康、关注、告警 完整三态示范）
  return [
    { key: 'thermal', name: '热控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '回路温控在轨工况良好，流体回路压力正常' },
    { key: 'energy', name: '能源', healthLevel: 'attention', isNormal: false, statusText: '关注', anomalyCounts: { class1: 5, class2: 5, class3: 5 }, summary: 'A通道瞬态欠压自愈完成，当前电源母线稳定' },
    { key: 'adcs', name: '姿轨控', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '三轴姿态稳定度 0.002°/s，反作用飞轮无抖动' },
    { key: 'ttc', name: '测控数传', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: 'X频段应答机与地面站锁定稳定，下行误码率低于1e-8' },
    { key: 'router', name: '路由', healthLevel: 'attention', isNormal: false, statusText: '关注', anomalyCounts: { class1: 1, class2: 0, class3: 0 }, summary: 'CPLD电压异常已自主处置，路由主通道运行稳定' },
    { key: 'ai_compute', name: '智算', healthLevel: 'attention', isNormal: false, statusText: '关注', anomalyCounts: { class1: 0, class2: 1, class3: 0 }, summary: 'Linux启动异常(emmc启动)，待地面复核并下发恢复指令' },
    { key: 'cn_ai', name: '国产智算', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '云尖沐曦加速器全精度算力模块运行平稳' },
    { key: 'ir_camera', name: '红外相机', healthLevel: 'healthy', isNormal: true, statusText: '健康', anomalyCounts: { class1: 0, class2: 0, class3: 0 }, summary: '斯特林制冷机处于深低温工作点，焦平面阵列成像标称' },
    { key: 'laser', name: '激光', healthLevel: 'alarm', isNormal: false, statusText: '告警', anomalyCounts: { class1: 0, class2: 0, class3: 1 }, summary: '804激光通信终端跟踪抖动与发射功率衰减预警' }
  ];
}

export const SUBSYSTEMS_DATA: SubsystemStatus[] = getSubsystemsForSatellite('scs-04-16');

export const ANOMALIES_DATA: AnomalyItem[] = [
  // I类异常
  {
    id: 'anom-100',
    classType: 'I',
    systemKey: 'router',
    systemName: '路由',
    discoveryTime: '2026-09-01 07:35:10',
    anomalyType: 'CPLD电压异常',
    telemetryCode: 'TML509',
    detailSummary: 'TML509/TML511/TML513/TML515超出正常范围[TML509:[0,2.0] ,TML511:[0,4.0],TML513:[0,2] ,TML515:[0,4.0]',
    symptom: 'TML509/TML511/TML513/TML515超出正常范围[TML509:[0,2.0] ,TML511:[0,4.0],TML513:[0,2] ,TML515:[0,4.0]',
    actionMeasure: '发出下电指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 14 00 11 92 C0 00 00 07 50 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 07:35:12 (耗时 2.0s)',
      actionPlan: '星载自主健康管理引擎触发【路由分系统CPLD异常保护预案】',
      executionLog: [
        '[07:35:10.100] 捕获路由分系统 CPLD 遥测通道异常，TML509/TML511/TML513/TML515 电压采样超限',
        '[07:35:10.450] 星载 FDIR 判定为 CPLD 供电电压异常，进入自主保护流程',
        '[07:35:11.020] 执行处置措施：发出下电指令',
        '[07:35:11.500] 注入遥控指令：20 E9 10 14 00 11 92 C0 00 00 07 50 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
        '[07:35:12.100] 下电完成，通道进入安全受控状态，处置闭环归档'
      ],
      result: '已发出下电指令，CPLD供电异常已安全隔离处置'
    }
  },
  {
    id: 'anom-101',
    classType: 'I',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 08:14:22',
    anomalyType: '电源通道瞬态扰动',
    telemetryCode: 'TMEA043',
    detailSummary: '软件异常复位及瞬态欠压自愈',
    symptom: 'TMEA043采样 4.58V 低于标称阈值 4.85V，出现瞬态欠压',
    actionMeasure: '发出自动切换稳压滤波旁路指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 14 00 11 92 C0 00 00 07 50 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 08:14:25 (耗时 3.2s)',
      actionPlan: '星载自主健康管理引擎触发【预案EPS-AUTO-09】',
      executionLog: [
        '[08:14:22.102] 捕获 TMEA043 瞬态采样 4.58V 低于标称阈值 4.85V',
        '[08:14:22.450] 星载自主故障诊断模块 (FDIR) 识别为瞬态微放电扰动',
        '[08:14:23.010] 自动执行隔离旁路，切入稳压滤波备份单元',
        '[08:14:24.890] 软件寄存器看门狗复位并完成参数回置自愈',
        '[08:14:25.320] 遥测回环校验正常，TMEA043 恢复至 5.01V，闭环归档'
      ],
      result: '自动处置成功，通道已恢复标称供电'
    }
  },
  {
    id: 'anom-105',
    classType: 'I',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 10:02:47',
    anomalyType: '母线电流瞬态尖峰',
    telemetryCode: 'TMEA004',
    detailSummary: '负载切换瞬间母线电流出现短时尖峰，星载软件自动限流',
    symptom: 'TMEA004采样瞬时跳变至 9.6A，超出标称波动区间',
    actionMeasure: '发出限流软启动指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 15 00 11 92 C1 00 00 07 51 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 10:02:49 (耗时 1.6s)',
      actionPlan: '星载自主健康管理引擎触发【预案EPS-AUTO-11】',
      executionLog: [
        '[10:02:47.050] 捕获 TMEA004 瞬时电流尖峰 9.6A',
        '[10:02:47.800] 判定为负载切换瞬态冲击，非持续性故障',
        '[10:02:48.400] 自动执行限流软启动，抑制冲击电流上升率',
        '[10:02:49.200] 电流回落至 4.2A 标称区间，闭环归档'
      ],
      result: '限流处置成功，母线电流恢复标称'
    }
  },
  {
    id: 'anom-106',
    classType: 'I',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 12:48:33',
    anomalyType: '太阳阵电流瞬态波动',
    telemetryCode: 'TMEA007',
    detailSummary: '光照角度瞬时变化导致太阳阵电流短时波动，自主平滑处理',
    symptom: 'TMEA007采样出现 ±1.2A 瞬态波动',
    actionMeasure: '发出MPPT跟踪参数微调指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 15 00 11 92 C1 00 00 07 51 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 12:48:35 (耗时 2.1s)',
      actionPlan: '太阳阵最大功率点跟踪(MPPT)自适应算法触发',
      executionLog: [
        '[12:48:33.200] 检测 TMEA007 电流波动 ±1.2A',
        '[12:48:34.100] MPPT控制器重新搜索最优工作点',
        '[12:48:35.300] 电流稳定在 6.4A 标称值，闭环完成'
      ],
      result: 'MPPT自适应调节成功，太阳阵输出恢复稳定'
    }
  },
  {
    id: 'anom-107',
    classType: 'I',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 14:55:10',
    anomalyType: '蓄电池充放电电流瞬态超调',
    telemetryCode: 'TMEA006',
    detailSummary: '轨道进出阴影瞬间充放电电流短时超调，BMS自主抑制',
    symptom: 'TMEA006采样瞬时达 +9.8A，超出 -10A~10A 边界预警线',
    actionMeasure: '发出充放电斜率限制指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 15 00 11 92 C1 00 00 07 51 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 14:55:12 (耗时 1.9s)',
      actionPlan: '电池管理系统(BMS)充放电斜率限制预案',
      executionLog: [
        '[14:55:10.300] 检测到充放电电流瞬时超调至 +9.8A',
        '[14:55:11.100] BMS自动限制电流变化斜率',
        '[14:55:12.200] 电流回落至 +1.4A 标称区间，闭环归档'
      ],
      result: '充放电电流已恢复标称，蓄电池组安全'
    }
  },
  {
    id: 'anom-108',
    classType: 'I',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 16:20:05',
    anomalyType: '蓄电池温度采集通道瞬态跳变',
    telemetryCode: 'TMEA010',
    detailSummary: 'AD590温度传感器采集链路瞬态噪声干扰，软件滤波剔除',
    symptom: 'TMEA010采样瞬时跳变至 34.2℃，超出 0℃~30℃ 标称范围',
    actionMeasure: '发出采集通道数字滤波复位指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 15 00 11 92 C1 00 00 07 51 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 16:20:07 (耗时 1.7s)',
      actionPlan: '温度采集通道数字滤波复位预案',
      executionLog: [
        '[16:20:05.400] 检测到 TMEA010 瞬时跳变至 34.2℃',
        '[16:20:06.300] 判定为采集链路瞬态噪声干扰',
        '[16:20:07.100] 数字滤波器复位，采样恢复至 18.6℃'
      ],
      result: '温度采集通道恢复正常，蓄电池温控标称'
    }
  },
  {
    id: 'anom-102',
    classType: 'I',
    systemKey: 'thermal',
    systemName: '热控系统',
    discoveryTime: '2026-09-01 09:30:11',
    anomalyType: '电加热片温控回路瞬态波动',
    telemetryCode: 'TMTEMP02',
    detailSummary: '电池舱区域微温差波动，PID调节器自主平滑',
    symptom: 'TMTEMP02 温度检测出现 ±0.8℃ 瞬态波动',
    actionMeasure: '发出加热片功率自适应调节指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 14 00 11 92 C0 00 00 07 50 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 09:30:14 (耗时 2.5s)',
      actionPlan: '热控PID自适应算法触发',
      executionLog: [
        '[09:30:11.200] 电池舱巡检温度微幅波动 ±0.8℃',
        '[09:30:12.110] 启动PID闭环功率微调，增加加热片占空比 4%',
        '[09:30:14.050] 温度稳固在 21.5℃ 标称中心，自愈完成'
      ],
      result: '热控温差已平抑，工作正常'
    }
  },
  {
    id: 'anom-103',
    classType: 'I',
    systemKey: 'adcs',
    systemName: '姿轨控',
    discoveryTime: '2026-09-01 13:22:40',
    anomalyType: '星敏感器瞬态微光干扰',
    telemetryCode: 'TMADCS9',
    detailSummary: '星敏视场杂光瞬态误报，星载算法自动剔除',
    symptom: 'TMADCS9 捕获视场边缘异常高能光斑',
    actionMeasure: '发出滤波屏蔽指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 14 00 11 92 C0 00 00 07 50 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 13:22:43 (耗时 1.8s)',
      actionPlan: '多星敏感器星图识别容错校验',
      executionLog: [
        '[13:22:40.400] 捕捉到视场边缘瞬态高能光斑',
        '[13:22:41.200] 姿控软件通过三轴惯导卡尔曼滤波进行一致性检验',
        '[13:22:43.000] 自动屏蔽异常星图帧，维持姿态稳定度 0.002°/s'
      ],
      result: '姿态指向保持高精度标称'
    }
  },
  {
    id: 'anom-104',
    classType: 'I',
    systemKey: 'ttc',
    systemName: '测控数传',
    discoveryTime: '2026-09-01 15:10:05',
    anomalyType: '应答机AGC增益瞬态跳变',
    telemetryCode: 'TMAGC1',
    detailSummary: '地面注入载波电平瞬态抖动，AGC环路自适应锁定',
    symptom: 'TMTTC_AGC 检测AGC电平跳变 2.1dB',
    actionMeasure: '发出AGC滤波参数置位指令',
    processStatus: '已处置',
    telecommandHex: '20 E9 10 14 00 11 92 C0 00 00 07 50 AA 58 06 92 12 01 01 BC 9F AA AA AA AA AA AA AA AA AA AA AA',
    actionRecord: {
      handledTime: '2026-09-01 15:10:08 (耗时 2.0s)',
      actionPlan: '应答机AGC自动增益控制平滑',
      executionLog: [
        '[15:10:05.100] 检测AGC电平跳变 2.1dB',
        '[15:10:06.500] 启动内部数字滤波器平抑抖动',
        '[15:10:08.000] 链路锁定恢复标称'
      ],
      result: '数传通道闭环恢复正常'
    }
  },
  // II类异常
  {
    id: 'anom-200',
    classType: 'II',
    systemKey: 'ai_compute',
    systemName: '智算',
    discoveryTime: '2026-09-01 10:15:30',
    anomalyType: '"Linux启动异常", "emmc启动"',
    telemetryCode: 'TMZ120',
    detailSummary: '["TMZ120", "TMZ039"] 描述信息？（王聪）',
    symptom: '["TMZ120", "TMZ039"] 描述信息？（王聪）',
    actionMeasure: '["智算设置NVME启动", "GPU强制待机", "智算GPU上电", "智算恢复EMMC分区", "智算设置EMMC启动", "GPU强制待机", "智算GPU上电"]',
    processStatus: '待复核',
    telecommandHex: '20 E9 11 12 00 11 0F C0 00 00 0E 5F 55 58 D6 A1 31 0D 09 93 55 C1 00 00 17 17 11 0F C0 00 00 0E 5F 55 58 D6 A1 31 0D 09 93 55 C1 00 00 10 10 11 0F C0 00 00 0E 5F 55 6A D6 A1 31 0D 09 93 55 C1 00 00 15 15 11 0F C0 00 00 87 5F 55 7E D6 A1 31 0D 82 93 55 C1 00 00 22 01 2F 68 6F 6D 65 2F 7A 68 69 6A 69 61 5F 72 75 6E 2F 73 79 73 74 65 6D 5F 65 6D 62 65 64 64 65 64 5F 66 6F 6C 64 65 72 2F 73 79 73 74 65 6D 5F 72 65 63 6F 76 65 72 79 2E 73 68 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 40 00 11 0F C0 00 00 0E 5F 55 92 D6 A1 31 0D 09 93 55 C1 00 00 16 16 11 0F C0 00 00 0E 5F 55 A6 D6 A1 31 0D 09 93 55 C1 00 00 10 10 11 0F C0 00 00 0E 5F 55 6A D6 A1 31 0D 09 93 55 C1 00 00 15 15 07 FF AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA'
  },
  {
    id: 'anom-201',
    classType: 'II',
    systemKey: 'router',
    systemName: '路由分系统',
    discoveryTime: '2026-09-01 10:45:18',
    anomalyType: '星载路由主备链路心跳丢包',
    telemetryCode: 'TMEA138',
    detailSummary: '路由主备心跳包间隔异常，需地面确认注入系统恢复脚本',
    processStatus: '待复核',
    telecommandHex: '20 E9 11 12 00 11 0F C0 00 00 0E 5F 55 58 D6 A1 31 0D 09 93 55 C1 00 00 17 17 11 0F C0 00 00 0E 5F 55 58 D6 A1 31 0D 09 93 55 C1 00 00 10 10 11 0F C0 00 00 0E 5F 55 6A D6 A1 31 0D 09 93 55 C1 00 00 15 15 11 0F C0 00 00 87 5F 55 7E D6 A1 31 0D 82 93 55 C1 00 00 22 01 2F 68 6F 6D 65 2F 7A 68 69 6A 69 61 5F 72 75 6E 2F 73 79 73 74 65 6D 5F 65 6D 62 65 64 64 65 64 5F 66 6F 6C 64 65 72 2F 73 79 73 74 65 6D 5F 72 65 63 6F 76 65 72 79 2E 73 68 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 40 00 11 0F C0 00 00 0E 5F 55 92 D6 A1 31 0D 09 93 55 C1 00 00 16 16 11 0F C0 00 00 0E 5F 55 A6 D6 A1 31 0D 09 93 55 C1 00 00 10 10 11 0F C0 00 00 0E 5F 55 6A D6 A1 31 0D 09 93 55 C1 00 00 15 15 07 FF AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA'
  },
  {
    id: 'anom-202',
    classType: 'II',
    systemKey: 'ai_compute',
    systemName: '智算分系统',
    discoveryTime: '2026-09-01 14:12:05',
    anomalyType: '高速固存(Flash)写入瞬态峰值电流超限',
    telemetryCode: 'TMOF05',
    detailSummary: '红外反演大数据高负荷并行写入时，NAND闪存阵列母线瞬态压降，待地面注入温控及流控修正补丁',
    processStatus: '待复核',
    telecommandHex: '10 FA 55 AA 00 12 34 88 FF C0 00 01 EE'
  },
  {
    id: 'anom-203',
    classType: 'II',
    systemKey: 'ttc',
    systemName: '测控数传',
    discoveryTime: '2026-09-01 16:50:22',
    anomalyType: 'X频段功放模块反射功率偏高',
    telemetryCode: 'TMPA02',
    detailSummary: '高仰角数传下行期间馈线驻波比偶发劣化，建议进行地面测控闭环校验',
    processStatus: '待复核',
    telecommandHex: '30 BB 12 00 55 66 77 88 00 00 00 FF'
  },
  {
    id: 'anom-204',
    classType: 'II',
    systemKey: 'cn_ai',
    systemName: '国产智算',
    discoveryTime: '2026-09-01 18:30:12',
    anomalyType: '沐曦加速器张量核心算力单元温度偶发偏高',
    telemetryCode: 'TMAI02',
    detailSummary: '火灾边缘红外反演大模型高强度并行推理时，核心温度接近预警阈值，需注入散热调频指令',
    processStatus: '待复核',
    telecommandHex: '55 CC 01 02 03 04 05 06 07 08 09 0A 0B 0C'
  },
  {
    id: 'anom-205',
    classType: 'II',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 19:05:40',
    anomalyType: 'B-BUS备份通道纹波电压偏高',
    telemetryCode: 'TMEB106',
    detailSummary: '备份通道二次降压输出纹波幅值偶发超出标称包络，需地面注入滤波补偿参数',
    processStatus: '待复核',
    telecommandHex: '30 BC 13 02 55 67 78 89 00 00 00 FE'
  },
  {
    id: 'anom-206',
    classType: 'II',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 19:40:12',
    anomalyType: '太阳翼驱动机构(SADA)转动力矩偏大',
    telemetryCode: 'TMSD01',
    detailSummary: '太阳翼跟踪转动时驱动电机力矩偶发偏大，疑似润滑衰减，需地面评估是否降频运行',
    processStatus: '待复核',
    telecommandHex: '30 BC 14 05 22 33 44 55 66 00 00 FD'
  },
  {
    id: 'anom-207',
    classType: 'II',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 20:12:55',
    anomalyType: '蓄电池组均衡电路占空比异常',
    telemetryCode: 'TMBL03',
    detailSummary: '单体均衡电路PWM占空比偏离标定曲线，均衡效率下降，建议地面复核均衡策略参数',
    processStatus: '待复核',
    telecommandHex: '30 BC 15 07 11 22 33 44 55 00 00 FC'
  },
  {
    id: 'anom-208',
    classType: 'II',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 20:48:30',
    anomalyType: '母线滤波电容ESR老化预警',
    telemetryCode: 'TMEA003',
    detailSummary: '母线电压纹波随在轨时长缓慢上升，疑似滤波电容等效串联电阻老化，需持续监测趋势',
    processStatus: '待复核',
    telecommandHex: '30 BC 16 09 66 77 88 99 00 00 00 FB'
  },
  {
    id: 'anom-209',
    classType: 'II',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 21:30:18',
    anomalyType: '充电控制器MPPT跟踪效率下降',
    telemetryCode: 'TMMP02',
    detailSummary: '光照充足条件下太阳阵实际输出功率低于理论最大功率点约6%，MPPT跟踪效率偏低',
    processStatus: '待复核',
    telecommandHex: '30 BC 17 0A 77 88 99 AA 00 00 00 FA'
  },
  // III类异常
  {
    id: 'anom-301',
    classType: 'III',
    systemKey: 'laser',
    systemName: '激光',
    discoveryTime: '2026-09-01 11:20:00',
    anomalyType: '804激光通信终端跟踪抖动与发射功率衰减',
    telemetryCode: 'TMLT01',
    detailSummary: '粗跟踪架两轴抖动方差 42.8μrad(>25μrad)，泵浦激光器温控偏差导致功率衰减至 30.2dBm',
    symptom: 'TMLAST_TRACK 抖动方差 42.8 μrad 超限，TMLAST_PWR 发射功率由 33.0 dBm 衰减至 30.2 dBm',
    reportData: {
      reportTitle: '【高风险】804激光通信状态评估报告',
      findings: [
        '至少一路接收光通道异常：发送处理机路由自测试模式使能遥控指令，排查故障原因；若10G光口故障，则用处理机内部生成的固定帧数据进行激光通信性能测试',
        '接收光功率低warning：重启',
        '接收光功率低Alarm：重启',
        '通道接收端信号丢失告警（RX_LOS）：补发太阳翼展开指令，观察是否显示为展开',
        '跟瞄软件故障码：方位超软限位、俯仰超软限位、方位电机超速、俯仰电机超速、空指针、方位电机堵转、俯仰电机堵转：重启',
        '路由传输数据类型状态遥测：业务数据传输状态、对地传输数据传输状态、LVDS图像数据传输状态：方案一：ssh登录路由器，然后去手动清理磁盘空间；方案二：采用ONIE上重装操作系统（Sonic上安装无法清理磁盘空间）'
      ],
      actionSuggestions: [
        '[高优先级] 排查并修复至少一路接收光通道异常',
        '[高优先级] 处理接收光功率低告警',
        '[高优先级] 处理通道接收端信号丢失告警',
        '[高优先级] 重启跟瞄软件故障码',
        '[高优先级] 执行路由器数据清理或系统重装方案'
      ]
    },
    actionMeasure: '执行804激光通信应急恢复方案与光轴重校准',
    processStatus: '待处理',
    telecommandHex: '20 E9 13 18 00 11 08 C0 00 00 0C 4A 55 68 D6 A1 22 0E 08 82 44 C2 00 00 18 18 07 FF AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA'
  },
  {
    id: 'anom-302',
    classType: 'III',
    systemKey: 'ir_camera',
    systemName: '红外相机',
    discoveryTime: '2026-09-01 17:05:40',
    anomalyType: '斯特林制冷机微振动超标与焦平面温控漂移',
    telemetryCode: 'TMIR09',
    detailSummary: '红外热成像仪制冷机压缩机转速波动，导致微振动谱峰叠加在载荷平台上，需专家联合决策',
    symptom: 'TMIR_STR_9 制冷机振动谱密度超出 0.05g²/Hz，焦平面探测器温度漂移至 82K',
    actionMeasure: '调节制冷机压缩机驱动相角抑制谐波共振，切换备用主动隔振阻尼器',
    processStatus: '待处理',
    telecommandHex: '20 E9 13 20 00 11 0A C0 00 00 08 55 66 77 88 99 AA BB CC DD EE FF 00 11 22 33 44 55 66 77 88 99'
  },
  {
    id: 'anom-303',
    classType: 'III',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 21:15:00',
    anomalyType: '蓄电池组单体压差超限风险',
    telemetryCode: 'TMBV01',
    detailSummary: '光阴影交替周期中串联单体出现持续性压差偏移，需地面联合专家组制定脉冲均衡方案',
    symptom: 'TMEPS_BATT_VOLT 串联单体最大压差达 38.6mV(阈值 25mV)，持续偏离标称曲线',
    actionMeasure: '制定地面脉冲均衡充电预案，设置BMS主动分流放电旁路限制单体过充',
    processStatus: '待处理',
    telecommandHex: '20 E9 13 24 00 11 0C C0 00 00 06 12 34 56 78 90 AB CD EF 00 11 22 33 44 55 66 77 88 99 AA BB'
  },
  {
    id: 'anom-304',
    classType: 'III',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 22:10:05',
    anomalyType: '蓄电池组容量衰减加速预警',
    telemetryCode: 'TMBC01',
    detailSummary: '长期充放电循环统计显示蓄电池组可用容量衰减速率高于设计基线，需地面联合专家组制定延寿策略',
    symptom: 'TMEPS_BATT_CAP 近30天容量衰减率达 0.42%/周期(基线 0.25%/周期)',
    actionMeasure: '制定降充电深度(DOD)运行策略，调整充放电阈值曲线',
    processStatus: '待处理',
    telecommandHex: '20 E9 13 28 00 11 0D C0 00 00 07 22 33 44 55 66 77 88 99 AA BB CC DD EE FF 00 11 22 33 44 55'
  },
  {
    id: 'anom-305',
    classType: 'III',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 22:45:20',
    anomalyType: '太阳翼输出功率长期性衰减趋势',
    telemetryCode: 'TMEA07T',
    detailSummary: '太阳翼输出功率随在轨时长呈缓慢下降趋势，疑似电池片辐照老化，需专家组评估寿命末期功率余量',
    symptom: 'TMEA007_TREND 近90天太阳阵峰值功率下降 3.1%，超出预期辐照老化曲线',
    actionMeasure: '制定负载功率优先级调度预案，延长关键载荷供电裕度',
    processStatus: '待处理',
    telecommandHex: '20 E9 13 2C 00 11 0E C0 00 00 08 33 44 55 66 77 88 99 AA BB CC DD EE FF 00 11 22 33 44 55 66'
  },
  {
    id: 'anom-306',
    classType: 'III',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 23:20:40',
    anomalyType: '均衡采样芯片长期漂移导致SOC估算偏差',
    telemetryCode: 'TMSOC1',
    detailSummary: '电量估算(SOC)与实际放电容量偏差随在轨时长逐步扩大，需地面联合专家组重新标定采样基准',
    symptom: 'TMEPS_SOC 估算偏差累计达 4.8%，超出标称 ±2% 精度要求',
    actionMeasure: '制定地面重标定方案，注入采样基准修正系数',
    processStatus: '待处理',
    telecommandHex: '20 E9 13 30 00 11 0F C0 00 00 09 44 55 66 77 88 99 AA BB CC DD EE FF 00 11 22 33 44 55 66 77'
  },
  {
    id: 'anom-307',
    classType: 'III',
    systemKey: 'energy',
    systemName: '能源系统',
    discoveryTime: '2026-09-01 23:55:12',
    anomalyType: '高温环境下蓄电池内阻持续上升风险',
    telemetryCode: 'TMBR01',
    detailSummary: '高温工况下单体内阻较常温工况持续偏高，存在加速老化风险，需专家组制定热控联合优化方案',
    symptom: 'TMEPS_BATT_RES 高温工况内阻较基线上升 12%，接近寿命预警阈值',
    actionMeasure: '制定热控降温联合方案，评估限制高温工况下充放电倍率',
    processStatus: '待处理',
    telecommandHex: '20 E9 13 34 00 11 10 C0 00 00 0A 55 66 77 88 99 AA BB CC DD EE FF 00 11 22 33 44 55 66 77 88'
  }
];

// 根据卫星获取专属异常列表
export function getAnomaliesForSatellite(satelliteId: string): AnomalyItem[] {
  const isHighSpectrum = satelliteId === 'scs-03-14' || satelliteId === 'zj-tm01';
  const isSarRadar = satelliteId === 'scs-01-06' || satelliteId === 'scs-01-09' || satelliteId === 'tg-02';
  const isWeatherSat = satelliteId === 'scs-04-15' || satelliteId === 'tx-03';

  if (isSarRadar) {
    return [];
  }
  if (isHighSpectrum) {
    return [
      {
        id: 'anom-zj-1',
        classType: 'I',
        systemKey: 'energy',
        systemName: '能源系统',
        discoveryTime: '2026-09-02 09:12:00',
        anomalyType: 'B-BUS备份通道降压波动',
        telemetryCode: 'TMEB106',
        detailSummary: '备份通道降压波动，已自动旁路',
        processStatus: '已处置',
        actionRecord: {
          handledTime: '2026-09-02 09:12:02 (耗时 2.1s)',
          actionPlan: '自主执行备份通道微调',
          executionLog: [
            '[09:12:00.120] 采样 TMEB106 触发微调阈值',
            '[09:12:01.050] 自主平滑电压滤波',
            '[09:12:02.100] 闭环完成'
          ],
          result: '通道恢复标称运行'
        }
      },
      {
        id: 'anom-zj-2',
        classType: 'II',
        systemKey: 'ai_compute',
        systemName: '智算分系统',
        discoveryTime: '2026-09-02 14:05:30',
        anomalyType: 'Flash高速读写峰值电流偏大',
        telemetryCode: 'TMO008',
        detailSummary: '星载固存高负荷写入时电流偏大，待注入流控参数',
        processStatus: '待复核',
        telecommandHex: '10 FA 01 02 00 22 45 88 90 00 FF 12 33'
      }
    ];
  }
  if (isWeatherSat) {
    return [
      {
        id: 'anom-tx-1',
        classType: 'I',
        systemKey: 'energy',
        systemName: '能源系统',
        discoveryTime: '2026-09-02 11:30:15',
        anomalyType: 'B通道5V供电轻度欠压',
        telemetryCode: 'TMEB043',
        detailSummary: '稳压模块瞬态响应自愈',
        processStatus: '已处置',
        actionRecord: {
          handledTime: '2026-09-02 11:30:18 (耗时 3.0s)',
          actionPlan: '星载自主旁路恢复',
          executionLog: ['[11:30:15.000] 检测欠压', '[11:30:18.000] 恢复标称'],
          result: '已自动处置成功'
        }
      }
    ];
  }
  return ANOMALIES_DATA;
}

export const LASER_EVALUATION_REPORT = {
  title: '【高风险】804激光通信状态评估报告',
  targetDevice: '804 卫星激光通信载荷终端 (Laser Terminal 804)',
  evaluateTime: '2026-09-01 11:25:00 UTC+8',
  riskLevel: '高风险 (III类需地面指控与专家联合决策)',
  findings: [
    {
      id: 1,
      name: '粗跟踪机构 (PAT) 角漂移异常',
      desc: '在轨遥测显示，激光粗跟踪架两轴粗跟踪角抖动方差达到 42.8 μrad（超出标称 ≤25 μrad 闭环门限），导致精瞄准光轴进入临界视场边缘。'
    },
    {
      id: 2,
      name: '泵浦激光器温控偏差导致功率衰减',
      desc: '掺铒光纤放大器 (EDFA) 激光泵浦驱动温控实测达到 +31.8℃（偏离最佳工作温区 +3.4℃），发射端光功率由标称 33.0 dBm 衰减至 30.2 dBm (-2.8 dBm 衰减)。'
    },
    {
      id: 3,
      name: '下行通信信噪比劣化与丢包预警',
      desc: '在上一过境站测试中，星地激光链路误码率升高至 1.2×10⁻⁴，预测下一圈过境时存在 60% 概率触发激光数据下传中断或重传降速。'
    }
  ],
  actionSuggestions: [
    {
      id: 1,
      level: '紧急优先级 P0',
      title: '切换热控回路旁路增强控温',
      detail: '下发热控模式切换指令，启用辅助相变储热回路与主动温控旁路，将 EDFA 泵浦模块温度在 10 分钟内回压至 26.5℃ 标称区间。'
    },
    {
      id: 2,
      level: '保障优先级 P1',
      title: '启用微波 X/Ka 频段备份数传通道',
      detail: '将下一圈次过境的林火与高光谱数据流切至 1.2 Gbps 微波双模链路，确保核心解译产品准实时交付，不受激光抖动影响。'
    },
    {
      id: 3,
      level: '校准优先级 P1',
      title: '执行星载光轴自主扫描重定标',
      detail: '在进入下一入境阴影区前，下发重定标注入包，由星载快包执行粗精复合零位回中与星历引导角自适应滤波。'
    },
    {
      id: 4,
      level: '管理优先级 P2',
      title: '生成标准化应急处置工单与专家复核',
      detail: '自动汇编遥测变化特征曲线与参数镜像包，推送至总装研制厂所与指控中枢首席专家席。'
    }
  ]
};
