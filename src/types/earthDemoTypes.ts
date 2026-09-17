export type DataTypeCategory = 
  | 'building'    // 建筑轮廓
  | 'heritage'    // 遗产档案
  | 'landcover'   // 土地覆盖
  | 'hydrology'   // 水文
  | 'groundwater' // 地下水
  | 'geology'     // 地质
  | 'terrain'     // 地形
  | 'dem'         // DEM
  | 'insar'       // InSAR
  | 'sar'         // SAR
  | 'optical'     // 光学
  | 'infrared'    // 红外影像
  | 'fire';       // 火灾监测

export interface CategoryInfo {
  id: DataTypeCategory;
  name: string;
  shortName: string;
  englishName: string;
  iconName: string;
  color: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  count: number;
  latestUpdate: string;
  status: 'optimal' | 'attention' | 'safe';
  statusText: string;
  description: string;
  subBranches: string[];
  metricsSummary: {
    label: string;
    value: string;
  }[];
}

export interface HistoryRecord {
  id: string;
  categoryId: DataTypeCategory;
  title: string;
  date: string;
  time: string;
  sensor: string;
  platformType: '卫星遥感' | '无人机航测' | '地面物联传感' | '雷达干涉';
  resolution: string;
  bandsOrChannel: string;
  dataLevel: string;
  cloudCover?: string;
  status: 'normal' | 'warning' | 'alert' | 'safe';
  statusLabel: string;
  summary: string;
  anomalyLocation?: string;
  inspector: string;
  previewGradient: string;
  previewUrl?: string;
  footprint: {
    lat: number;
    lng: number;
  }[];
  keyMetrics: {
    label: string;
    value: string;
    unit?: string;
    status?: 'normal' | 'warn';
  }[];
  trendData: {
    time: string;
    value: number;
    baseline?: number;
    threshold?: number;
    unit: string;
  }[];
  details: {
    coordinates: string;
    fileSize: string;
    format: string;
    coordinateSystem: string;
    qualityScore: string;
  };
}
