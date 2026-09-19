import { CategoryInfo, HistoryRecord, DataTypeCategory } from '../types/earthDemoTypes';

export interface EarthObject {
  id: string;
  name: string;
  englishName: string;
  category: string;
  lng: number;
  lat: number;
  height: number;
  desc: string;
  heading: number;
  pitch: number;
  range: number;
}

// 监测核心区域对象（聚焦湖南凤凰古城重点文保空间体系）
export const EARTH_OBJECTS: EarthObject[] = [
  {
    id: 'fenghuang',
    name: '凤凰古城',
    englishName: 'Fenghuang Ancient Town',
    category: '国家历史文化名城 · 传统聚落与木构群',
    lng: 109.6015,
    lat: 27.9536,
    height: 285,
    desc: '位于湖南省湘西土家族苗族自治州，沱江穿城而过，虹桥石拱风雨楼与两岸水上吊脚楼群构成典型的山地峡谷聚落空间。',
    heading: 12,
    pitch: -40,
    range: 2200,
  },
  {
    id: 'hongqiao',
    name: '虹桥风雨楼',
    englishName: 'Hongqiao Covered Bridge',
    category: '古建重点标定 · 双孔卧波木构石拱桥',
    lng: 109.6042,
    lat: 27.9525,
    height: 282,
    desc: '始建于明洪武初年，上层为两层木构歇山顶楼阁，下层为二孔石拱红砂岩桥，常年承受沱江激流冲击与游客动荷载。',
    heading: 350,
    pitch: -45,
    range: 850,
  },
  {
    id: 'diaojiaolou',
    name: '沱江吊脚楼群',
    englishName: 'Tuojiang Diaojiaolou Stilt Houses',
    category: '临江国家级传统木结构民居聚落',
    lng: 109.6028,
    lat: 27.9548,
    height: 280,
    desc: '依崖而建的苗汉传统水上穿斗式木构吊脚楼，常年处于高湿与水汽腐蚀环境，抗风抗火监测等级高。',
    heading: 45,
    pitch: -42,
    range: 1100,
  },
];

export const FENGHUANG_COORDS = {
  lng: 109.6015, // 默认坐标设为湖南凤凰古城核心
  lat: 27.9536,
  height: 285,
};

export const FENGHUANG_LANDMARKS = [
  { name: '凤凰古城核心区', lng: 109.6015, lat: 27.9536, desc: '国家历史文化名城，古城核心保护带' },
  { name: '虹桥风雨楼', lng: 109.6042, lat: 27.9525, desc: '明代卧波木构石拱双层廊桥' },
  { name: '沱江吊脚楼群', lng: 109.6028, lat: 27.9548, desc: '临江苗汉传统依崖水上木构吊脚楼' },
  { name: '北门古城楼与跳岩', lng: 109.6002, lat: 27.9560, desc: '明代古城防御中枢与沱江跳岩水陆枢纽' },
  { name: '南华山国家森林生态区', lng: 109.5945, lat: 27.9485, desc: '古城南部天然森林生态屏障与重点防火区' },
  { name: '万名塔风水古塔', lng: 109.6055, lat: 27.9520, desc: '沱江沙湾北岸六角砖木仿古风水宝塔' },
];

export type MarkerType = 'fire' | 'building';

export interface RemoteSensingTableRecord {
  time: string;
  location: string;
  lng: string | number;
  lat: string | number;
  landType: string;
  source: string;
  imageUrl?: string;
  caption?: string;
  hasFire?: boolean;
  fireArea?: string;
  temperature?: string;
  frp?: string;
  analysis?: string;
  confidence?: string;
}

export interface RemoteSensingLevelItem {
  level: string; // e.g. 'L1', 'L2', 'L3', 'L4'
  content: string; // e.g. '几何校正'
  subDetails?: string[]; // 具体的算法、处理参数与产物形式 (下一级延伸节点)
  records?: RemoteSensingTableRecord[]; // 结构化时序记录（时间、地点、经度、纬度、土地类型、数据来源）
}

export interface RemoteSensingDataTypeBranch {
  id: string;
  name: string; // e.g. 'SAR', '红外', '可见光', '高光谱', 'InSAR'
  color: string;
  levels: RemoteSensingLevelItem[];
}

export interface SpatialMarkerPoint {
  id: string;
  type: MarkerType;
  name: string;
  categoryName: string;
  lng: number;
  lat: number;
  height: number;
  desc: string;
  earthObjectId: string;
  firePolygons?: number[][][]; // 不规则火区多边形经纬度集合 [[[lng, lat], [lng, lat], ...], ...]
  dataTypes?: RemoteSensingDataTypeBranch[];
  details: {
    tag: string;
    subTag: string;
    confidence?: string;
    temperature?: string;
    frp?: string;
    satellite?: string;
    metrics: { label: string; value: string }[];
  };
}

// 使用 Chaikin 割角算法将折线火区多边形平滑为圆润的闭合曲线（迭代次数越多越圆滑）
export function smoothClosedRing<T extends [number, number]>(points: T[], iterations = 3): T[] {
  let ring: [number, number][] = points.map((p) => [p[0], p[1]]);
  for (let iter = 0; iter < iterations; iter += 1) {
    const next: [number, number][] = [];
    const len = ring.length;
    for (let i = 0; i < len; i += 1) {
      const p0 = ring[i];
      const p1 = ring[(i + 1) % len];
      next.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25]);
      next.push([p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]);
    }
    ring = next;
  }
  return ring as T[];
}

// 火点检测点位标准遥感数据类型与数据处理级别 (一级数据: 红外; 二级数据: L1几何校正、L2云检测、L4 火灾检测)
export const FIRE_DATA_TYPES: RemoteSensingDataTypeBranch[] = [
  {
    id: 'infrared',
    name: '红外',
    color: '#ef4444',
    levels: [
      {
        level: 'L1',
        content: '几何校正',
        subDetails: ['黑体定标参数校准', '热红外波段响应函数', '像元粗定位与姿态纠偏'],
        records: [
          {
            time: '2026-09-10 10:24:05',
            location: '南华山国家森林区',
            lng: '109.59°E',
            lat: '27.95°N',
            landType: '针叶林',
            source: '云尖沐曦号',
            caption: '南华山国家森林区 · L1几何校正红外辐射校准图',
            temperature: '345.0 K (71.8 ℃)',
            frp: '13.2 MW',
            confidence: '94% 高置信度',
            analysis: '完成星地几何精校正与黑体绝对定标，消除姿态微颤动像元漂移，热红外亮温反演精度优于 0.5K。',
          },
          {
            time: '2026-09-10 06:15:30',
            location: '南华山北坡观测区',
            lng: '109.59°E',
            lat: '27.95°N',
            landType: '针叶林',
            source: '之江天目01号',
            caption: '南华山北坡观测区 · 热红外波段响应校正图',
            temperature: '312.4 K (39.2 ℃)',
            confidence: '96% 稳定',
            analysis: '清晨过境热红外定标正常，地表温差轮廓平滑，微米级重采样已校核。',
          },
          {
            time: '2026-09-09 22:40:12',
            location: '南华山林冠区',
            lng: '109.60°E',
            lat: '27.94°N',
            landType: '次生阔叶林',
            source: '天工探索二号',
            caption: '南华山林冠区 · 夜间红外粗定位与姿态纠偏图',
            temperature: '298.6 K (25.4 ℃)',
            confidence: '98% 正常',
            analysis: '夜间红外成像基底温场均匀，像元定位偏差小于0.2像元。',
          },
        ],
      },
      {
        level: 'L2',
        content: '云检测',
        subDetails: ['单通道辐射传输算法', 'MODTRAN水汽吸收补偿', '云雾与阴影自动掩膜'],
        records: [
          {
            time: '2026-09-10 10:24:05',
            location: '南华山国家森林区',
            lng: '109.59°E',
            lat: '27.95°N',
            landType: '针叶林',
            source: '云尖沐曦号',
            caption: '南华山国家森林区 · L2单通道云雾与水汽自动掩膜图',
            temperature: '345.0 K (71.8 ℃)',
            confidence: '云量 < 1%',
            analysis: '星载NPU边缘云判完成，林区上空无厚云阻挡，MODTRAN水汽补偿后火点热源信号清晰无衰减。',
          },
          {
            time: '2026-09-10 06:15:30',
            location: '南华山北坡观测区',
            lng: '109.59°E',
            lat: '27.95°N',
            landType: '针叶林',
            source: '之江天目01号',
            caption: '南华山北坡 · 山间晨雾与阴影自适应掩膜图',
            temperature: '312.4 K (39.2 ℃)',
            confidence: '薄雾 5%',
            analysis: '有效滤除峡谷晨雾热辐射衰减干扰，保留真实地表林分热异常反射。',
          },
          {
            time: '2026-09-09 22:40:12',
            location: '南华山林冠区',
            lng: '109.60°E',
            lat: '27.94°N',
            landType: '次生阔叶林',
            source: '天巡者03号',
            caption: '南华山林冠区 · 夜间云雪双通道特征识别图',
            temperature: '298.6 K (25.4 ℃)',
            confidence: '晴空无云',
            analysis: '夜间全波段云判结果显示晴空，热红外数据有效度达到 99.8%。',
          },
        ],
      },
      {
        level: 'L4',
        content: '火灾检测',
        subDetails: ['多指标森林火险综合研判', '热辐射功率(FRP)动态曲线', '火点蔓延时序图谱与动态预警'],
        records: [
          {
            time: '2026-09-10 10:24:05',
            location: '南华山国家森林区',
            lng: '109.59°E',
            lat: '27.95°N',
            landType: '针叶林',
            source: '云尖沐曦号 (FY-4B)',
            caption: '南华山国家森林火情 · LWIR长波红外热异常与火点蔓延反演图',
            hasFire: true,
            fireArea: '13.2 km²',
            temperature: '345.0 K (71.8 ℃)',
            frp: '13.2 MW',
            confidence: '94% 紧急警报',
            analysis: '星载长波红外（LWIR）检测到南华山林冠区突发增温，疑似背阴山林落叶暗燃，受东北风影响存在向古城蔓延风险，建议立即响应。',
          },
          {
            time: '2026-09-10 06:15:30',
            location: '南华山北坡观测区',
            lng: '109.59°E',
            lat: '27.95°N',
            landType: '针叶林',
            source: '之江天目01号',
            caption: '南华山北坡 · FRP动态热辐射功率监测图',
            hasFire: true,
            fireArea: '4.5 km²',
            temperature: '318.5 K (45.3 ℃)',
            frp: '4.5 MW',
            confidence: '82% 早期微热',
            analysis: '北坡背阴林区检测到微弱局部热异常升温迹象，热辐射功率呈缓慢上升态势。',
          },
          {
            time: '2026-09-09 22:40:12',
            location: '南华山林冠区',
            lng: '109.60°E',
            lat: '27.94°N',
            landType: '次生阔叶林',
            source: '天工探索二号',
            caption: '南华山林冠区 · 夜间红外热态势基底对比图',
            hasFire: false,
            fireArea: '0 km²',
            temperature: '298.6 K (25.4 ℃)',
            frp: '0.0 MW',
            confidence: '未发现火点',
            analysis: '夜间地表热场基底平稳，未检出明火或阴燃等显著热异常。',
          },
        ],
      },
    ],
  },
];

// 古建筑点位标准遥感数据类型与数据处理级别 (一级数据: 红外)
export const BUILDING_DATA_TYPES: RemoteSensingDataTypeBranch[] = [
  {
    id: 'infrared',
    name: '红外',
    color: '#ef4444',
    levels: [
      {
        level: 'L1',
        content: '几何校正',
        subDetails: ['辐射亮温绝对量化校准', '探测器盲元补偿与增益标定', '像元微米级几何重采样'],
        records: [
          {
            time: '2026-09-10 16:30:15',
            location: '凤凰古城核心区',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '古建群落',
            source: '云尖沐曦号',
            caption: '凤凰古城核心区 · L1几何重采样与辐射绝对校准图',
            temperature: '302.1 K (28.9 ℃)',
            confidence: '99% 极优',
            analysis: '古城核心木构建筑群微米级几何配准完成，消除密集屋面投影畸变。',
          },
          {
            time: '2026-09-10 10:24:00',
            location: '古城核心保护带',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '明清木构',
            source: '之江天目01号',
            caption: '古城保护带 · 探测器盲元补偿与增益标定图',
            temperature: '300.4 K (27.2 ℃)',
            confidence: '98% 正常',
            analysis: '红外传感器增益一致性良好，建筑物边缘温差分辨清晰。',
          },
          {
            time: '2026-09-09 18:50:22',
            location: '沱江两岸建筑带',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '木构聚落',
            source: '天工探索二号',
            caption: '沱江沿岸吊脚楼群 · 黄昏红外亮温定量图',
            temperature: '299.2 K (26.0 ℃)',
            confidence: '99% 正常',
            analysis: '吊脚楼木结构与临水区域温差基底反演准确，符合黄昏降温规律。',
          },
        ],
      },
      {
        level: 'L2',
        content: '云检测',
        subDetails: ['大气辐射传输模型校正', '云雾及阴影热辐射抑制掩膜', '地表温差特征识别'],
        records: [
          {
            time: '2026-09-10 16:30:15',
            location: '凤凰古城核心区',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '古建群落',
            source: '云尖沐曦号',
            caption: '凤凰古城 · 大气辐射传输模型修正与阴影掩膜图',
            temperature: '302.1 K (28.9 ℃)',
            confidence: '无云',
            analysis: '精准剔除山地斜坡阴影与水体蒸发水汽干扰，还原古建屋面真实温场。',
          },
          {
            time: '2026-09-10 10:24:00',
            location: '古城核心保护带',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '明清木构',
            source: '之江天目01号',
            caption: '古城核心带 · 晴空云雪掩膜结果图',
            temperature: '300.4 K (27.2 ℃)',
            confidence: '晴空 100%',
            analysis: '保护区上空晴朗无遮挡，建筑屋顶马头墙与歇山顶温差反差鲜明。',
          },
          {
            time: '2026-09-09 18:50:22',
            location: '沱江两岸建筑带',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '木构聚落',
            source: '天巡者03号',
            caption: '沱江沿岸 · 水汽吸收自动补偿图',
            temperature: '299.2 K (26.0 ℃)',
            confidence: '有效补偿',
            analysis: '沱江水汽蒸发通道吸收补偿准确，木结构受潮温场衰减抑制率达到95%以上。',
          },
        ],
      },
      {
        level: 'L4',
        content: '火灾检测',
        subDetails: ['配电线路接触不良发热告警', '重点木结构超温早期预警', '古建火险秒级红外热成像态势监控'],
        records: [
          {
            time: '2026-09-10 16:30:15',
            location: '凤凰古城核心区',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '古建群落',
            source: '云尖沐曦号',
            caption: '古建群落 · 重点木结构早期超温态势监控图',
            temperature: '302.1 K (28.9 ℃)',
            frp: '0.0 MW',
            confidence: '安全正常',
            analysis: '凤凰古城核心区明清木结构建筑群红外温度分布均匀，无配电线路异常过热点，古建防火态势安全。',
          },
          {
            time: '2026-09-10 10:24:00',
            location: '古城核心保护带',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '明清木构',
            source: '之江天目01号',
            caption: '古城核心保护带 · 电气发热排查红外热像图',
            temperature: '300.4 K (27.2 ℃)',
            confidence: '无过热点',
            analysis: '排查木构内部与廊道穿线区域，未发现由于接触不良引起的微热累积。',
          },
          {
            time: '2026-09-09 18:50:22',
            location: '沱江两岸建筑带',
            lng: '109.60°E',
            lat: '27.95°N',
            landType: '木构聚落',
            source: '天工探索二号',
            caption: '沱江吊脚楼群 · 秒级红外热态势基线图',
            temperature: '299.2 K (26.0 ℃)',
            confidence: '态势平稳',
            analysis: '吊脚楼密集木构区夜间温度回落正常，无人员违规明火用电异常。',
          },
        ],
      },
    ],
  },
];
// ── 空间遥感与计算卫星星座定义 (12 颗计算星 + SCS-04-16，真实 TLE 惯性坐标动力学解算) ──
export interface ConstellationSatelliteItem {
  id: string;
  code: string;
  name: string;
  noradId: string;
  line1: string;
  line2: string;
  payload: {
    aiCompute: string;
    routeSpeed: string;
    laserSpeed: string;
    infraredResolution: string;
  };
  models: { name: string; version: string }[];
  dataStats: { sceneCount: number; sizeGB: number };
  usage: { gpu: number; cpu: number; disk: number };
}

export const SATELLITE_CONSTELLATION_ITEMS: ConstellationSatelliteItem[] = [
  {
    id: 'scs-01-01',
    code: 'SCS-01-01',
    name: '01计算星',
    noradId: '63981',
    line1: '1 63981U 25100A   26064.24611520  .00021542  00000-0  96234-3 0  9995',
    line2: '2 63981  97.3752 139.3524 0009512 318.4521  41.5832 15.20705124 44821',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '轻量化目标检测', version: 'v3.5.0' },
      { name: '云判与去雾模型', version: 'v2.1.2' },
    ],
    dataStats: { sceneCount: 142, sizeGB: 388.5 },
    usage: { gpu: 64, cpu: 42, disk: 55 },
  },
  {
    id: 'scs-01-02',
    code: 'SCS-01-02',
    name: '02计算星',
    noradId: '63982',
    line1: '1 63982U 25100E   26064.24685120  .00020815  00000-0  94512-3 0  9998',
    line2: '2 63982  97.3735 139.3245 0009241 322.1845  37.8521 15.20691245 44828',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '智能热源解译', version: 'v4.0.1' },
      { name: '正射几何校正', version: 'v1.8.0' },
    ],
    dataStats: { sceneCount: 126, sizeGB: 329.4 },
    usage: { gpu: 58, cpu: 39, disk: 48 },
  },
  {
    id: 'scs-01-03',
    code: 'SCS-01-03',
    name: '03计算星',
    noradId: '63984',
    line1: '1 63984U 25100C   26064.25142100  .00021894  00000-0  97851-3 0  9992',
    line2: '2 63984  97.3761 140.1254 0010521 312.6582  47.3851 15.22514285 44874',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '林火应急识别', version: 'v3.2.0' },
      { name: '高分辨率分割', version: 'v2.0.4' },
    ],
    dataStats: { sceneCount: 118, sizeGB: 310.2 },
    usage: { gpu: 61, cpu: 44, disk: 52 },
  },
  {
    id: 'scs-01-04',
    code: 'SCS-01-04',
    name: '04计算星',
    noradId: '63988',
    line1: '1 63988U 25100G   26064.24707416  .00020428  00000-0  93048-3 0  9994',
    line2: '2 63988  97.3774 140.6647 0011742 316.9302  43.1017 15.25556921 44915',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '火点快速聚类', version: 'v2.8.4' },
      { name: '多谱段融合模型', version: 'v1.6.0' },
    ],
    dataStats: { sceneCount: 135, sizeGB: 362.1 },
    usage: { gpu: 70, cpu: 48, disk: 62 },
  },
  {
    id: 'scs-01-05',
    code: 'SCS-01-05',
    name: '05计算星',
    noradId: '63992',
    line1: '1 63992U 25100L   26064.24522188  .00022641  00000-0  10288-2 0  9993',
    line2: '2 63992  97.3744 139.4188 0009838 302.6179  57.4106 15.20726064 44818',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '水体与植被分类', version: 'v3.1.0' },
      { name: '边缘智能过滤', version: 'v2.3.1' },
    ],
    dataStats: { sceneCount: 104, sizeGB: 275.8 },
    usage: { gpu: 49, cpu: 36, disk: 43 },
  },
  {
    id: 'scs-01-06',
    code: 'SCS-01-06',
    name: '06计算星',
    noradId: '63991',
    line1: '1 63991U 25100K   26064.24482161  .00022392  00000-0  10187-2 0  9999',
    line2: '2 63991  97.3715 139.3067 0009951 330.1217  29.9449 15.20684463 44826',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: 'SAR成像去噪', version: 'v1.9.4' },
      { name: '形变反演解算', version: 'v2.2.0' },
    ],
    dataStats: { sceneCount: 112, sizeGB: 298.0 },
    usage: { gpu: 54, cpu: 40, disk: 46 },
  },
  {
    id: 'scs-01-07',
    code: 'SCS-01-07',
    name: '07计算星',
    noradId: '63983',
    line1: '1 63983U 25100B   26064.27476028  .00031702  00000-0  99745-3 0  9991',
    line2: '2 63983  97.3721 141.2842 0008820 307.0714  52.9721 15.32853313 44965',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '红外火情极速检测', version: 'v4.1.0' },
      { name: '地面站协同分发', version: 'v1.4.2' },
    ],
    dataStats: { sceneCount: 148, sizeGB: 412.3 },
    usage: { gpu: 72, cpu: 51, disk: 66 },
  },
  {
    id: 'scs-01-08',
    code: 'SCS-01-08',
    name: '08计算星',
    noradId: '63987',
    line1: '1 63987U 25100F   26064.24707416  .00020428  00000-0  93048-3 0  9993',
    line2: '2 63987  97.3716 139.3022 0009052 315.7362  44.3148 15.20670090 44834',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '多源要素重构', version: 'v2.5.0' },
      { name: '夜光与热红外协同', version: 'v1.7.1' },
    ],
    dataStats: { sceneCount: 122, sizeGB: 320.5 },
    usage: { gpu: 56, cpu: 37, disk: 47 },
  },
  {
    id: 'scs-01-09',
    code: 'SCS-01-09',
    name: '09计算星',
    noradId: '63990',
    line1: '1 63990U 25100J   26064.16800794  .00039440  00000-0  12806-2 0  9997',
    line2: '2 63990  97.3706 140.7408 0006228 300.1851  59.8774 15.31813665 44907',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '古建筑形变监测', version: 'v3.0.2' },
      { name: 'InSAR相位解缠', version: 'v2.6.4' },
    ],
    dataStats: { sceneCount: 156, sizeGB: 435.0 },
    usage: { gpu: 76, cpu: 53, disk: 70 },
  },
  {
    id: 'scs-01-10',
    code: 'SCS-01-10',
    name: '10计算星',
    noradId: '63993',
    line1: '1 63993U 25100M   26064.15907400  .00043505  00000-0  13858-2 0  9996',
    line2: '2 63993  97.3739 140.8797 0007942 315.6969  44.3637 15.32395963 44918',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '全天候火灾预警', version: 'v3.8.0' },
      { name: '高光谱特征提取', version: 'v2.1.0' },
    ],
    dataStats: { sceneCount: 160, sizeGB: 448.2 },
    usage: { gpu: 78, cpu: 55, disk: 72 },
  },
  {
    id: 'scs-01-11',
    code: 'SCS-01-11',
    name: '11计算星',
    noradId: '63989',
    line1: '1 63989U 25100H   26064.13705862  .00040698  00000-0  13104-2 0  9991',
    line2: '2 63989  97.3763 140.9965 0007302 302.8449  57.2089 15.32070645 44921',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '时序遥感超分辨率', version: 'v3.4.1' },
      { name: '极速目标提取', version: 'v2.0.0' },
    ],
    dataStats: { sceneCount: 145, sizeGB: 395.7 },
    usage: { gpu: 69, cpu: 46, disk: 59 },
  },
  {
    id: 'scs-01-12',
    code: 'SCS-01-12',
    name: '12计算星',
    noradId: '63985',
    line1: '1 63985U 25100D   26064.18334074  .00014969  00000-0  48123-3 0  9997',
    line2: '2 63985  97.3743 140.8584 0005924 293.4556  66.6063 15.32340018 44923',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '100 m' },
    models: [
      { name: '多源灾害综合分析', version: 'v3.6.0' },
      { name: '高通量数据落盘', version: 'v2.4.5' },
    ],
    dataStats: { sceneCount: 150, sizeGB: 418.6 },
    usage: { gpu: 71, cpu: 49, disk: 64 },
  },
  {
    id: 'scs-03-14',
    code: 'SCS-03-14',
    name: '彩云高光谱01星',
    noradId: 'A0145',
    line1: '1 A0145U 26170C   26260.97722690  .00001716  00000-0  11633-3 0  9996',
    line2: '2 A0145  97.5575 266.8554 0017086  88.0366 272.2819 15.07673034  8442',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '30 m' },
    models: [
      { name: '高光谱特征反演', version: 'v3.1.0' },
      { name: '植被与矿产识别', version: 'v2.4.2' },
      { name: '大气校正模型', version: 'v1.8.0' },
    ],
    dataStats: { sceneCount: 168, sizeGB: 462.5 },
    usage: { gpu: 74, cpu: 52, disk: 68 },
  },
  {
    id: 'scs-04-15',
    code: 'SCS-04-15',
    name: '星火传明气象卫星',
    noradId: 'A0145',
    line1: '1 A0145U 26170C   26260.97722690  .00001716  00000-0  11633-3 0  9996',
    line2: '2 A0145  97.5575 266.8554 0017086  88.0366 272.2819 15.07673034  8442',
    payload: { aiCompute: '256 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '50 m' },
    models: [
      { name: '云图降水反演', version: 'v4.0.2' },
      { name: '强对流风暴预警', version: 'v3.5.1' },
      { name: '海温与辐射反演', version: 'v2.0.0' },
    ],
    dataStats: { sceneCount: 154, sizeGB: 420.8 },
    usage: { gpu: 66, cpu: 47, disk: 60 },
  },
  {
    id: 'scs-04-16',
    code: 'SCS-04-16',
    name: '云尖沐曦号',
    noradId: 'SCS-04-16',
    line1: '1 A0146U 26170D   26258.45368718  .00001470  00000-0  10013-3 0  9992',
    line2: '2 A0146  97.5574 264.3793 0016697  96.5992 263.7138 15.07721651  8062',
    payload: { aiCompute: '248 TOPS', routeSpeed: '10 Gbps', laserSpeed: '100 Gbps', infraredResolution: '120 m' },
    models: [
      { name: '云检测模型', version: 'v3.2.1' },
      { name: '火灾检测模型', version: 'v2.8.0' },
      { name: '几何校正模型', version: 'v1.5.4' },
    ],
    dataStats: { sceneCount: 128, sizeGB: 342.6 },
    usage: { gpu: 68, cpu: 45, disk: 57 },
  },
];


// 空间要素标绘：火点检测 (红色小圆点) 与 建筑群 (棕色小圆点)
export const SPATIAL_MARKER_POINTS: SpatialMarkerPoint[] = [
  // 凤凰古城区域 - 建筑群
  {
    id: 'bldg-fenghuang-core',
    type: 'building',
    name: '凤凰古城核心区',
    categoryName: '国家历史文化名城核心区',
    lng: 109.6015,
    lat: 27.9536,
    height: 285,
    desc: '国家历史文化名城核心区，沱江穿城而过，古城墙与明清古民居群交相辉映。',
    earthObjectId: 'fenghuang',
    details: {
      tag: '重点文保核心区',
      subTag: '古城核心保护区',
      metrics: [
        { label: '保护级别', value: '国家历史文化名城' },
        { label: '核心面积', value: '1.8 平方公里' },
        { label: '建筑群落', value: '明清木构院落群' },
        { label: '形变监控', value: '微毫米级稳定' },
      ],
    },
  },
  {
    id: 'bldg-fenghuang-diaojiao',
    type: 'building',
    name: '沱江沿岸木构吊脚楼群',
    categoryName: '传统聚落建筑群',
    lng: 109.6028,
    lat: 27.9548,
    height: 288,
    desc: '沿沱江两岸依崖悬挑的传统水上木结构民居群，湘西传统营造技艺活化石。',
    earthObjectId: 'fenghuang',
    details: {
      tag: '国家级文保组群',
      subTag: '悬挑式木构吊脚楼',
      metrics: [
        { label: '建筑体量', value: '86 栋临水连缀群' },
        { label: '材质特性', value: '杉木穿斗木构' },
        { label: '监测重点', value: '洪汛冲刷与木腐霉变' },
      ],
    },
  },
  {
    id: 'bldg-fenghuang-hongqiao',
    type: 'building',
    name: '虹桥风雨楼石木建筑群',
    categoryName: '历史廊桥建筑群',
    lng: 109.6042,
    lat: 27.9525,
    height: 284,
    desc: '始建于明代，下层双孔红砂岩厚墩石拱，上层二层歇山顶木构楼阁。',
    earthObjectId: 'fenghuang',
    details: {
      tag: '重点文物建筑',
      subTag: '石拱廊桥木构双层',
      metrics: [
        { label: '跨度跨径', value: '双孔卧波净跨24m' },
        { label: '结构形式', value: '红砂岩拱券+木构阁' },
        { label: '文保级别', value: '省级重点文物' },
      ],
    },
  },
  {
    id: 'bldg-fenghuang-beimen',
    type: 'building',
    name: '北门古城楼古城墙群',
    categoryName: '军事防御古建筑群',
    lng: 109.6002,
    lat: 27.9560,
    height: 290,
    desc: '明代壁垒森严的古城防御中枢，青石垛口与歇山重檐木构城楼屹立江畔。',
    earthObjectId: 'fenghuang',
    details: {
      tag: '古代城防建筑',
      subTag: '红砂岩基石+木构箭楼',
      metrics: [
        { label: '城垣延展', value: '1,200 米明代城垛' },
        { label: '楼阁形制', value: '重檐歇山木作' },
      ],
    },
  },
  {
    id: 'bldg-fenghuang-wanming',
    type: 'building',
    name: '万名塔砖木风水古塔',
    categoryName: '重点古建宝塔',
    lng: 109.6055,
    lat: 27.9520,
    height: 286,
    desc: '屹立沱江北岸沙湾，六方七级砖木仿古风水宝塔，塔身挺拔秀丽，与虹桥相映生辉。',
    earthObjectId: 'fenghuang',
    details: {
      tag: '重点历史景观',
      subTag: '六方七级仿古风水塔',
      metrics: [
        { label: '塔身形制', value: '六方七级楼阁式' },
        { label: '建筑高度', value: '22.9 米' },
        { label: '保护级别', value: '沙湾风貌核心控制' },
      ],
    },
  },
  {
    id: 'bldg-fenghuang-chaoyang',
    type: 'building',
    name: '朝阳宫古建筑院落群',
    categoryName: '传统祠堂院落群',
    lng: 109.6035,
    lat: 27.9505,
    height: 292,
    desc: '清代典型湘西宗祠戏台建筑群，四合院式木雕飞檐与风火马头墙精湛规整。',
    earthObjectId: 'fenghuang',
    details: {
      tag: '古建重点院落',
      subTag: '四合院戏楼木作雕刻',
      metrics: [
        { label: '建筑面积', value: '2,100 m²' },
        { label: '特色构件', value: '镂空金漆木雕' },
      ],
    },
  },

  // 凤凰古城区域 - 火点检测
  {
    id: 'fire-fenghuang-nanhua',
    type: 'fire',
    name: '南华山国家森林火点',
    categoryName: '卫星遥感热异常点',
    lng: 109.5945,
    lat: 27.9485,
    height: 380,
    desc: '南华山林冠区卫星红外通道突发增温，疑似背阴山林落叶暗燃。',
    earthObjectId: 'fenghuang',
    firePolygons: [
      [
        [109.5932, 27.9498],
        [109.5940, 27.9506],
        [109.5949, 27.9502],
        [109.5958, 27.9509],
        [109.5966, 27.9501],
        [109.5962, 27.9492],
        [109.5971, 27.9488],
        [109.5968, 27.9479],
        [109.5959, 27.9473],
        [109.5948, 27.9469],
        [109.5938, 27.9474],
        [109.5930, 27.9482],
        [109.5925, 27.9491],
        [109.5932, 27.9498],
      ],
      [
        [109.5965, 27.9468],
        [109.5974, 27.9472],
        [109.5982, 27.9466],
        [109.5979, 27.9458],
        [109.5970, 27.9454],
        [109.5961, 27.9460],
        [109.5965, 27.9468],
      ],
      [
        [109.5918, 27.9502],
        [109.5926, 27.9508],
        [109.5931, 27.9503],
        [109.5925, 27.9497],
        [109.5918, 27.9502],
      ],
    ],
    details: {
      tag: '🔥 森林重点火警',
      subTag: '热异常点编号: FH-2026-F01',
      confidence: '94% 高度警示',
      temperature: '345.0 K (71.8 ℃)',
      frp: '13.2 MW',
      satellite: 'FY-4B AGRI',
      metrics: [
        { label: '所属区域', value: '南华山国家森林公园' },
        { label: '探测亮温', value: '345.0 K (71.8 ℃)' },
        { label: '风向影响', value: '东北风向古城蔓延风险' },
      ],
    },
  },
  {
    id: 'fire-fenghuang-xishan',
    type: 'fire',
    name: '喜鹊坡山林可疑火点',
    categoryName: '红外火情排查点',
    lng: 109.5975,
    lat: 27.9592,
    height: 340,
    desc: '无人机机载红外热像仪巡护捕获的高温像素点，邻近山地林缘。',
    earthObjectId: 'fenghuang',
    firePolygons: [
      [
        [109.5962, 27.9602],
        [109.5971, 27.9608],
        [109.5980, 27.9603],
        [109.5989, 27.9610],
        [109.5996, 27.9601],
        [109.5991, 27.9591],
        [109.5985, 27.9583],
        [109.5974, 27.9579],
        [109.5966, 27.9584],
        [109.5959, 27.9593],
        [109.5962, 27.9602],
      ],
      [
        [109.6002, 27.9612],
        [109.6009, 27.9616],
        [109.6015, 27.9610],
        [109.6008, 27.9604],
        [109.6002, 27.9612],
      ],
      [
        [109.5952, 27.9576],
        [109.5960, 27.9579],
        [109.5965, 27.9573],
        [109.5958, 27.9568],
        [109.5952, 27.9576],
      ],
    ],
    details: {
      tag: '🔥 山林热点排查',
      subTag: '热异常点编号: FH-2026-F02',
      confidence: '86% 待实地核',
      temperature: '337.5 K (64.3 ℃)',
      frp: '6.8 MW',
      satellite: '机载红外热像仪',
      metrics: [
        { label: '探测方式', value: '高空热成像无人机' },
        { label: '林分类型', value: '杉木人工纯林' },
      ],
    },
  },
  {
    id: 'fire-fenghuang-tuojiang',
    type: 'fire',
    name: '沱江下游林缘热异常点',
    categoryName: '气象卫星热异常监测',
    lng: 109.6110,
    lat: 27.9580,
    height: 300,
    desc: '风云三号E星微光与红外通道双重确认的热异常，位于峡谷农林交界处。',
    earthObjectId: 'fenghuang',
    firePolygons: [
      [
        [109.6095, 27.9592],
        [109.6105, 27.9598],
        [109.6115, 27.9594],
        [109.6126, 27.9601],
        [109.6135, 27.9592],
        [109.6130, 27.9582],
        [109.6138, 27.9575],
        [109.6128, 27.9569],
        [109.6118, 27.9565],
        [109.6106, 27.9570],
        [109.6098, 27.9578],
        [109.6095, 27.9592],
      ],
      [
        [109.6082, 27.9568],
        [109.6090, 27.9573],
        [109.6096, 27.9566],
        [109.6089, 27.9560],
        [109.6082, 27.9568],
      ],
      [
        [109.6142, 27.9605],
        [109.6151, 27.9610],
        [109.6158, 27.9603],
        [109.6150, 27.9598],
        [109.6142, 27.9605],
      ],
    ],
    details: {
      tag: '🔥 农林交界火点',
      subTag: '热异常点编号: FH-2026-F03',
      confidence: '89% 警报',
      temperature: '342.1 K (68.9 ℃)',
      frp: '9.5 MW',
      satellite: 'FY-3E MERSI-LL',
      metrics: [
        { label: '卫星型号', value: '风云三号E星 (FY-3E)' },
        { label: '地表温度', value: '342.1 K (68.9 ℃)' },
      ],
    },
  },
];

// 严格对应参考图中 11 大围绕核心地球对象的数据节点 (及 linked assets count)
export const CATEGORIES_DATA: Record<DataTypeCategory, CategoryInfo> = {
  // 1. 建筑轮廓 (1 assets linked)
  building: {
    id: 'building',
    name: '建筑轮廓',
    shortName: '建筑轮廓',
    englishName: 'Building Footprint & BIM',
    iconName: 'Building2',
    color: '#38bdf8',
    gradient: 'from-sky-500 to-blue-600',
    borderColor: 'border-sky-500/50',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    count: 1,
    latestUpdate: '2026-09-10 16:30',
    status: 'optimal',
    statusText: '轮廓高精提取完成',
    description: '空载无人机厘米级倾斜摄影与车载移动激光扫描，精确提取古塔/古建筑三维矢量屋檐轮廓、立面木构挑梁与保护缓冲区边界。',
    subBranches: ['3D矢量轮廓高精Mesh模型', '古建木构立面倾斜正射立面图', '建筑高程剖面图', '保护红线冲突实时比对'],
    metricsSummary: [
      { label: '轮廓提取精度', value: '±0.03m' },
      { label: '构件矢量模型', value: 'LOD 3.0' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 2. 遗产档案 (1 assets linked)
  heritage: {
    id: 'heritage',
    name: '遗产档案',
    shortName: '遗产档案',
    englishName: 'Heritage Archive & Spatial Cadastre',
    iconName: 'Library',
    color: '#a855f7',
    gradient: 'from-purple-500 to-violet-600',
    borderColor: 'border-purple-500/50',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    count: 1,
    latestUpdate: '2026-09-08 09:15',
    status: 'optimal',
    statusText: '国家文物红线归档',
    description: '包含国家级重点文保单位保护区划（本体、绝对保护区、建设控制地带）空间图层矢量、四有档案全数字化测绘与修缮监测记录。',
    subBranches: ['国家级文保保护红线空间图斑', '历代大修修缮档案三维叠合', '本体微损毁评估历史台账', '文保法定管控指标库'],
    metricsSummary: [
      { label: '法定保护级别', value: '全国重点文保' },
      { label: '空间坐标系', value: 'CGCS2000' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 3. 土地覆盖 (1 assets linked)
  landcover: {
    id: 'landcover',
    name: '土地覆盖',
    shortName: '土地覆盖',
    englishName: 'Land Cover & Vegetation Matrix',
    iconName: 'Map',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/50',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    count: 1,
    latestUpdate: '2026-09-06 14:20',
    status: 'optimal',
    statusText: '生态覆盖健康',
    description: '基于多光谱遥感解译的周边土地利用与林木覆被，监测月轮山生态植被健康、硬化铺装演变与周边缓冲带违规侵占风险。',
    subBranches: ['10米级高精土地覆被分类图', '林木覆盖度 NDVI 反演产品', '周边地表不透水面时序变化', '生态缓冲区入侵告警'],
    metricsSummary: [
      { label: '林木绿化率', value: '78.4%' },
      { label: '解译总体精度', value: '92.6%' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 4. 水文 (2 assets linked)
  hydrology: {
    id: 'hydrology',
    name: '水文',
    shortName: '水文',
    englishName: 'Hydrology & River Dynamics',
    iconName: 'Waves',
    color: '#0ea5e9',
    gradient: 'from-sky-400 to-cyan-600',
    borderColor: 'border-sky-400/50',
    glowColor: 'rgba(14, 165, 233, 0.4)',
    count: 2,
    latestUpdate: '2026-09-11 01:45',
    status: 'optimal',
    statusText: '潮位与流速在控',
    description: '水岸沿线江流动力学遥感与多波束声呐水深反演，实时感知大江大潮水位、流速冲刷、迎水坡面淘蚀与回水漩涡对古建基底的影响。',
    subBranches: ['雷达波非接触式潮位遥测', '钱塘江/沱江流速与冲刷监测', '水下基座冲蚀声呐测深云图', '洪峰过境浸润线动态推演'],
    metricsSummary: [
      { label: '实时潮位高程', value: '4.85m (安全)' },
      { label: '最大流速', value: '2.1 m/s' },
      { label: '关联资产', value: '2 assets linked' },
    ],
  },

  // 5. 地下水 (1 assets linked)
  groundwater: {
    id: 'groundwater',
    name: '地下水',
    shortName: '地下水',
    englishName: 'Groundwater Table & Pore Pressure',
    iconName: 'Droplet',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500/50',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    count: 1,
    latestUpdate: '2026-09-10 18:00',
    status: 'optimal',
    statusText: '水压渗透稳定',
    description: '深层孔隙水压力计与地质雷达（GPR）地下暗流探测，分析江水入渗、承压水水位涨落对砖石塔基与木桩嵌固力的长期潜蚀机理。',
    subBranches: ['深孔孔隙水压力时序阵列', '地下潜水水位埋深动水梯度', 'GPR 地质雷达古基渗水空洞探测', '土体含水率饱和度剖面'],
    metricsSummary: [
      { label: '地下潜水位', value: '-3.42m' },
      { label: '孔隙水压力', value: '38.5 kPa' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 6. 地质 (2 assets linked)
  geology: {
    id: 'geology',
    name: '地质',
    shortName: '地质',
    englishName: 'Geology & Geotechnical Stability',
    iconName: 'Layers',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-yellow-600',
    borderColor: 'border-amber-500/50',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    count: 2,
    latestUpdate: '2026-09-09 11:30',
    status: 'optimal',
    statusText: '基岩持力层稳固',
    description: '工程地质岩土力学与活动断裂带探测，评估古建筑持力地基沉降承载力、基岩节理裂隙发育及崩塌滑坡地质灾害隐患。',
    subBranches: ['古建地基持力层岩土力学分析', '后山岩体节理裂隙走向雷达测绘', '微震动与环境振动监测', '滑坡深层水平位移测斜仪阵列'],
    metricsSummary: [
      { label: '持力层岩性', value: '弱风化砂岩' },
      { label: '极限承载力', value: '450 kPa' },
      { label: '关联资产', value: '2 assets linked' },
    ],
  },

  // 7. 地形 (2 assets linked)
  terrain: {
    id: 'terrain',
    name: '地形',
    shortName: '地形',
    englishName: 'Terrain Morphology & Slope',
    iconName: 'Mountain',
    color: '#84cc16',
    gradient: 'from-lime-500 to-emerald-600',
    borderColor: 'border-lime-500/50',
    glowColor: 'rgba(132, 204, 22, 0.4)',
    count: 2,
    latestUpdate: '2026-09-07 15:45',
    status: 'optimal',
    statusText: '边坡坡形稳定',
    description: '大比例尺微地貌坡度坡向解析与地表水汇流分析，识别山体冲沟侵蚀、后背坡面滑塌与周边微地形变化。',
    subBranches: ['1:1000 高精等高线微地形 DLG', '地形坡度坡向地貌风险剖面', '地表径流冲刷汇流网络模型', '坡脚挡土墙形变检测'],
    metricsSummary: [
      { label: '古塔基底坡度', value: '4.2° (平缓)' },
      { label: '后山平均坡角', value: '28.5°' },
      { label: '关联资产', value: '2 assets linked' },
    ],
  },

  // 8. DEM (1 assets linked)
  dem: {
    id: 'dem',
    name: 'DEM',
    shortName: 'DEM',
    englishName: 'Digital Elevation Model (DEM/DSM)',
    iconName: 'Activity',
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-600',
    borderColor: 'border-pink-500/50',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    count: 1,
    latestUpdate: '2026-09-08 17:10',
    status: 'optimal',
    statusText: '0.2米高精点云格网',
    description: '机载 LiDAR 航测获取的 0.2米级高精度数字表面模型（DSM）与裸地数字高程模型（DTM），精准还原地表绝对高程。',
    subBranches: ['0.2m 格网精细 DTM 裸地高程', '包含林冠建筑高精 DSM 模型', '历时高程差分沉降蚀蚀图', '局部高程剖面极值提取'],
    metricsSummary: [
      { label: '垂直绝对精度', value: '±0.05m' },
      { label: '格网空间分辨率', value: '0.2m' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 9. InSAR (1 assets linked)
  insar: {
    id: 'insar',
    name: 'InSAR',
    shortName: 'InSAR',
    englishName: 'Interferometric SAR Surface Deformation',
    iconName: 'Radio',
    color: '#6366f1',
    gradient: 'from-indigo-500 to-blue-600',
    borderColor: 'border-indigo-500/50',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    count: 1,
    latestUpdate: '2026-09-10 03:22',
    status: 'optimal',
    statusText: '毫米级微位移在控',
    description: '永久散射体雷达差分干涉测量（PS-InSAR），提供毫米级精度的地表形变与塔体不均匀沉降长时序时空反演。',
    subBranches: ['PS-InSAR 沿视线向形变速率场', '塔体倾斜角与年沉降速率曲线', '相干点密集时序解缠报告', '沉降梯度异常自动报警'],
    metricsSummary: [
      { label: '位移检测精度', value: '±1.1 mm/yr' },
      { label: '年沉降速率', value: '-0.3 mm/a' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 10. SAR (1 assets linked)
  sar: {
    id: 'sar',
    name: 'SAR',
    shortName: 'SAR',
    englishName: 'Synthetic Aperture Radar Amplitude',
    iconName: 'Satellite',
    color: '#14b8a6',
    gradient: 'from-teal-500 to-emerald-600',
    borderColor: 'border-teal-500/50',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    count: 1,
    latestUpdate: '2026-09-09 23:40',
    status: 'optimal',
    statusText: '后向散射相干稳定',
    description: '星载高分三号及哨兵一号微波雷达强度影像，不受夜间、雨雾云遮挡影响，探测地表粗糙度、湿度及强角反射器回波。',
    subBranches: ['GF-3 1米聚束单偏振强度图', 'Sentinel-1 双极化 (VV+VH) 融合', '地表雷达相干性斑点滤波产品', '微波介电常数含湿反演'],
    metricsSummary: [
      { label: '成像极化模式', value: 'VV + VH' },
      { label: '波段特征', value: 'C波段 5.4GHz' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 11. 光学 (1 assets linked)
  optical: {
    id: 'optical',
    name: '光学',
    shortName: '光学',
    englishName: 'High-Resolution Optical Sensing',
    iconName: 'Scan',
    color: '#0284c7',
    gradient: 'from-sky-500 to-cyan-600',
    borderColor: 'border-sky-500/50',
    glowColor: 'rgba(2, 132, 199, 0.4)',
    count: 1,
    latestUpdate: '2026-09-08 11:20',
    status: 'optimal',
    statusText: '0.5米真彩色无云',
    description: '高分辨率遥感卫星与航测正射真彩色融合影像，清晰展现古迹建筑外表纹理、地表景观格局及周边环境真实面貌。',
    subBranches: ['GF-2 0.8米全色多光谱正射融合', '低空无人机真彩色正射航测图', '地表可见光谱段反射率矫正', '多期高清时序历史对比图'],
    metricsSummary: [
      { label: '空间分辨率', value: '0.8m 全色' },
      { label: '云量覆盖率', value: '0.0%' },
      { label: '关联资产', value: '1 assets linked' },
    ],
  },

  // 补充类别 (兼容原有系统)
  infrared: {
    id: 'infrared',
    name: '红外影像',
    shortName: '红外影像',
    englishName: 'Thermal Infrared Sensing',
    iconName: 'Flame',
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-600',
    borderColor: 'border-orange-500/50',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    count: 1,
    latestUpdate: '2026-09-07 22:30',
    status: 'safe',
    statusText: '夜间热敏正常',
    description: '星载与机载热红外辐射计，实时反演古建筑表面与周边夜间地表温度，排查古建电气与内部隐蔽热源。',
    subBranches: ['Landsat-9 TIRS 辐射温度反演', '低空热红外热力学巡检图'],
    metricsSummary: [
      { label: '热敏灵敏度', value: '< 50mK' },
      { label: '测温范围', value: '-20℃ ~ 150℃' },
    ],
  },
  fire: {
    id: 'fire',
    name: '火灾监测',
    shortName: '火灾监测',
    englishName: 'Fire Early Warning & Risk',
    iconName: 'ShieldAlert',
    color: '#ef4444',
    gradient: 'from-red-500 to-rose-600',
    borderColor: 'border-red-500/50',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    count: 1,
    latestUpdate: '2026-09-10 14:15',
    status: 'safe',
    statusText: '一级低火险',
    description: '空天地协同火情实时监控网，整合风云四号热异常探测与古建筑木构烟感温感物联网络。',
    subBranches: ['卫星热异常像素扫描预警', '木构耐火指数物联感知'],
    metricsSummary: [
      { label: '火险等级', value: 'I级 (低)' },
      { label: '探头在线率', value: '100%' },
    ],
  },
};

// 严格支撑 11 类节点的 15 景关联资产记录 (总数 exact 15 assets linked)
export const MOCK_HISTORY_RECORDS: HistoryRecord[] = [
  // 1. 建筑轮廓 (1 record)
  {
    id: 'BLD-20260910-01',
    categoryId: 'building',
    title: '凤凰古城吊脚楼群与虹桥风雨楼三维高精BIM轮廓矢量',
    date: '2026-09-10',
    time: '16:30:15 CST',
    sensor: 'DJI M350 RTK + Zenmuse L2 激光雷达',
    platformType: '无人机航测',
    resolution: '0.02m 空间分辨率',
    bandsOrChannel: '3D LiDAR Point Cloud + Vector DXF',
    dataLevel: 'Level 3 精细BIM矢量模型',
    cloudCover: '0.0%',
    status: 'normal',
    statusLabel: '高精轮廓提取完成',
    summary: '完成沱江吊脚楼群木构架与虹桥风雨楼石木结构的三维矢量轮廓测绘，绝对空间坐标误差小于1.5厘米，已完成历史文化名城核心区空间红线核准。',
    inspector: '湖南省文物考古研究院·古建筑保护所',
    previewGradient: 'from-sky-950 via-slate-900 to-blue-950',
    footprint: [
      { lat: 27.9560, lng: 109.6000 },
      { lat: 27.9560, lng: 109.6060 },
      { lat: 27.9510, lng: 109.6060 },
      { lat: 27.9510, lng: 109.6000 },
    ],
    keyMetrics: [
      { label: '轮廓拟合误差', value: '±1.2cm', status: 'normal' },
      { label: '特征角点数', value: '1,280 个', status: 'normal' },
      { label: '模型级别', value: 'LOD 3.0', status: 'normal' },
    ],
    trendData: [
      { time: '05月', value: 99.1, baseline: 95, unit: '结构轮廓拟合率(%)' },
      { time: '06月', value: 99.4, baseline: 95, unit: '结构轮廓拟合率(%)' },
      { time: '07月', value: 99.5, baseline: 95, unit: '结构轮廓拟合率(%)' },
      { time: '08月', value: 99.7, baseline: 95, unit: '结构轮廓拟合率(%)' },
      { time: '09月', value: 99.8, baseline: 95, unit: '结构轮廓拟合率(%)' },
    ],
    details: {
      coordinates: '109.6015°E, 27.9536°N',
      fileSize: '3.45 GB',
      format: 'Shapefile / LAS / IFC (BIM)',
      coordinateSystem: 'CGCS2000 / 3度分带 37带',
      qualityScore: '99.6 (极优)',
    },
  },

  // 2. 遗产档案 (1 record)
  {
    id: 'HER-20260908-01',
    categoryId: 'heritage',
    title: '全国重点文物保护单位·法定空间保护区划档案',
    date: '2026-09-08',
    time: '09:15:20 CST',
    sensor: '国家文物局文保红线数据库',
    platformType: '地面物联传感',
    resolution: '1:500 规程底图',
    bandsOrChannel: '矢量保护空间多边形 (Cadastre Polygon)',
    dataLevel: '国家级法定规划成果',
    status: 'normal',
    statusLabel: '红线区划受控',
    summary: '涵盖凤凰古城核心保护区、虹桥风雨楼、沱江两岸水上吊脚楼群及南华山风貌建设控制带，法定文保空间图斑无重叠冲突。',
    inspector: '国家文物保护空间信息联合实验室',
    previewGradient: 'from-purple-950 via-slate-900 to-violet-950',
    footprint: [
      { lat: 27.9580, lng: 109.5980 },
      { lat: 27.9580, lng: 109.6080 },
      { lat: 27.9490, lng: 109.6080 },
      { lat: 27.9490, lng: 109.5980 },
    ],
    keyMetrics: [
      { label: '本体保护面积', value: '4,650 ㎡', status: 'normal' },
      { label: '建控地带面积', value: '32.4 公顷', status: 'normal' },
      { label: '空间冲突告警', value: '0 处 (合规)', status: 'normal' },
    ],
    trendData: [
      { time: '2022', value: 100, baseline: 100, unit: '法定档案完备度(%)' },
      { time: '2023', value: 100, baseline: 100, unit: '法定档案完备度(%)' },
      { time: '2024', value: 100, baseline: 100, unit: '法定档案完备度(%)' },
      { time: '2025', value: 100, baseline: 100, unit: '法定档案完备度(%)' },
      { time: '2026', value: 100, baseline: 100, unit: '法定档案完备度(%)' },
    ],
    details: {
      coordinates: '109.6015°E, 27.9536°N',
      fileSize: '480 MB',
      format: 'GeoJSON / GeoPackage',
      coordinateSystem: 'CGCS2000',
      qualityScore: '100 (法定权威认证)',
    },
  },

  // 3. 土地覆盖 (1 record)
  {
    id: 'LND-20260906-01',
    categoryId: 'landcover',
    title: '哨兵二号 / 高分影像 10米级土地覆被与绿化植被图',
    date: '2026-09-06',
    time: '14:20:00 CST',
    sensor: 'Sentinel-2A MSI + GF-6 WFV',
    platformType: '卫星遥感',
    resolution: '10m 格网',
    bandsOrChannel: '10 Bands (VNIR + SWIR)',
    dataLevel: 'Level 2 专题解译分类',
    cloudCover: '0.4%',
    status: 'normal',
    statusLabel: '植被长势茂密优良',
    summary: '月轮山及钱塘江岸土地覆盖监测：林木绿化覆盖占比达78.4%，建筑不透水地表面积稳定无向保护红线蔓延迹象，NDVI均值0.84。',
    inspector: '中国科学院空天信息创新研究院',
    previewGradient: 'from-emerald-950 via-slate-900 to-teal-950',
    footprint: [
      { lat: 30.2100, lng: 120.1180 },
      { lat: 30.2100, lng: 120.1400 },
      { lat: 30.1880, lng: 120.1400 },
      { lat: 30.1880, lng: 120.1180 },
    ],
    keyMetrics: [
      { label: '林地覆被率', value: '78.4%', status: 'normal' },
      { label: '植被健康指数', value: '0.84 NDVI', status: 'normal' },
      { label: '水土流失风险', value: '微度 / 安全', status: 'normal' },
    ],
    trendData: [
      { time: '04月', value: 0.78, baseline: 0.75, unit: '植被指数(NDVI)' },
      { time: '05月', value: 0.81, baseline: 0.75, unit: '植被指数(NDVI)' },
      { time: '06月', value: 0.85, baseline: 0.75, unit: '植被指数(NDVI)' },
      { time: '07月', value: 0.86, baseline: 0.75, unit: '植被指数(NDVI)' },
      { time: '08月', value: 0.84, baseline: 0.75, unit: '植被指数(NDVI)' },
    ],
    details: {
      coordinates: '120.1294°E, 30.1986°N',
      fileSize: '820 MB',
      format: 'GeoTIFF (Cloud Optimized)',
      coordinateSystem: 'CGCS2000',
      qualityScore: '96.8 (优)',
    },
  },

  // 4. 水文 (2 records)
  {
    id: 'HYD-20260911-01',
    categoryId: 'hydrology',
    title: '沱江汛期水位流速与虹桥桥墩水力冲刷雷达实时监测',
    date: '2026-09-11',
    time: '01:45:10 CST',
    sensor: '高频微波雷达水位计 + 水下多普勒ADCP',
    platformType: '地面物联传感',
    resolution: '1mm 水位精度 / 0.01m/s 流速',
    bandsOrChannel: '26GHz 连续波雷达 + 声学多普勒',
    dataLevel: 'Level 1 实时高频水文测验',
    status: 'normal',
    statusLabel: '沱江水位平稳在控',
    summary: '沱江凤凰古城水文站实时监控：当前水位284.15米（警戒水位286.00米），洪峰过境最大流速1.8m/s，对虹桥石拱基础与沿江木构吊脚楼柱脚无结构性水力冲击冲刷。',
    inspector: '湖南省水文水资源勘测中心·湘西分中心',
    previewGradient: 'from-blue-950 via-cyan-900 to-slate-900',
    footprint: [
      { lat: 27.9570, lng: 109.5990 },
      { lat: 27.9570, lng: 109.6070 },
      { lat: 27.9500, lng: 109.6070 },
      { lat: 27.9500, lng: 109.5990 },
    ],
    keyMetrics: [
      { label: '实时水位', value: '284.15m', status: 'normal' },
      { label: '警戒水位差', value: '+1.85m 安全', status: 'normal' },
      { label: '平均流速', value: '1.42 m/s', status: 'normal' },
    ],
    trendData: [
      { time: '20:00', value: 283.8, baseline: 284.0, threshold: 286.0, unit: '水位(m)' },
      { time: '22:00', value: 284.0, baseline: 284.0, threshold: 286.0, unit: '水位(m)' },
      { time: '00:00', value: 284.2, baseline: 284.0, threshold: 286.0, unit: '水位(m)' },
      { time: '01:00', value: 284.15, baseline: 284.0, threshold: 286.0, unit: '水位(m)' },
    ],
    details: {
      coordinates: '109.6042°E, 27.9525°N',
      fileSize: '128 MB',
      format: 'TimeSeries NetCDF / JSON',
      coordinateSystem: 'CGCS2000',
      qualityScore: '99.4 (优)',
    },
  },
  {
    id: 'HYD-20260828-02',
    categoryId: 'hydrology',
    title: '沱江沿江消落带冲刷声呐测深与吊脚楼基础扫测云图',
    date: '2026-08-28',
    time: '10:30:00 CST',
    sensor: '多波束测深仪 (MBES) + 侧扫声呐',
    platformType: '地面物联传感',
    resolution: '0.05m 水深分辨率',
    bandsOrChannel: '400kHz 高频声学束',
    dataLevel: 'Level 2 水下微地形三维网格',
    status: 'normal',
    statusLabel: '岸坡基础坚实无掏空',
    summary: '针对沱江两岸吊脚楼水下悬挑木柱桩基及虹桥分水尖冲蚀进行全覆盖声呐扫测，未见水下掏空凹坑，基岩承载持力层完整致密。',
    inspector: '交通运输部水运工程科学研究院',
    previewGradient: 'from-sky-950 via-teal-900 to-slate-900',
    footprint: [
      { lat: 27.9565, lng: 109.6010 },
      { lat: 27.9565, lng: 109.6060 },
      { lat: 27.9515, lng: 109.6060 },
      { lat: 27.9515, lng: 109.6010 },
    ],
    keyMetrics: [
      { label: '岸坡最大冲深', value: '< 0.12m', status: 'normal' },
      { label: '桩基固结率', value: '99.1%', status: 'normal' },
      { label: '冲淤平衡态', value: '微淤积 (稳定)', status: 'normal' },
    ],
    trendData: [
      { time: '2024', value: -0.04, baseline: 0, unit: '年冲淤高差(m)' },
      { time: '2025', value: +0.02, baseline: 0, unit: '年冲淤高差(m)' },
      { time: '2026', value: +0.01, baseline: 0, unit: '年冲淤高差(m)' },
    ],
    details: {
      coordinates: '109.6028°E, 27.9548°N',
      fileSize: '1.85 GB',
      format: 'XYZ Gridded Bathymetry + GeoTIFF',
      coordinateSystem: 'CGCS2000',
      qualityScore: '98.9 (优)',
    },
  },

  // 5. 地下水 (1 record)
  {
    id: 'GWT-20260910-01',
    categoryId: 'groundwater',
    title: '南华山麓-沱江两岸深孔孔隙水压力计阵列与地下水位动态图',
    date: '2026-09-10',
    time: '18:00:25 CST',
    sensor: '智能压阻式渗压计 (Vibrating Wire Piezometer)',
    platformType: '地面物联传感',
    resolution: '0.01 kPa 水压灵敏度',
    bandsOrChannel: '深井 15m / 30m 双层水头传感器',
    dataLevel: 'Level 1 实时地下水压监测',
    status: 'normal',
    statusLabel: '动水压力稳定在安全区间',
    summary: '古城沿江基底钻孔多点渗压测定：地下水位稳定在-2.85米，承压水水头未出现骤升异常，有效保障临江木构建筑群与石质拱券持力层稳定。',
    inspector: '湖南大学土木工程学院·地质工程研究所',
    previewGradient: 'from-cyan-950 via-slate-900 to-blue-950',
    footprint: [
      { lat: 27.9570, lng: 109.5995 },
      { lat: 27.9570, lng: 109.6055 },
      { lat: 27.9510, lng: 109.6055 },
      { lat: 27.9510, lng: 109.5995 },
    ],
    keyMetrics: [
      { label: '埋深水头', value: '-2.85m', status: 'normal' },
      { label: '孔隙水压力', value: '38.5 kPa', status: 'normal' },
      { label: '年波动幅度', value: '0.45m (极小)', status: 'normal' },
    ],
    trendData: [
      { time: '05月', value: 38.1, baseline: 38.0, unit: '孔隙水压(kPa)' },
      { time: '06月', value: 39.2, baseline: 38.0, unit: '孔隙水压(kPa)' },
      { time: '07月', value: 38.8, baseline: 38.0, unit: '孔隙水压(kPa)' },
      { time: '08月', value: 38.4, baseline: 38.0, unit: '孔隙水压(kPa)' },
      { time: '09月', value: 38.5, baseline: 38.0, unit: '孔隙水压(kPa)' },
    ],
    details: {
      coordinates: '109.6015°E, 27.9536°N',
      fileSize: '95 MB',
      format: 'CSV / NetCDF TimeSeries',
      coordinateSystem: 'CGCS2000',
      qualityScore: '99.5 (优)',
    },
  },

  // 6. 地质 (2 records)
  {
    id: 'GEO-20260909-01',
    categoryId: 'geology',
    title: '古塔基底地质构造稳定性与微震动响应分析',
    date: '2026-09-09',
    time: '11:30:00 CST',
    sensor: '三向超低频加速度传感测震计 + 宽频带地震仪',
    platformType: '地面物联传感',
    resolution: '0.0001 Gal 微震灵敏度',
    bandsOrChannel: 'X-Y-Z 三轴地壳脉动',
    dataLevel: 'Level 2 地壳稳定性评价',
    status: 'normal',
    statusLabel: '持力地基沉降承载力强',
    summary: '基岩持力层为白垩系砂岩，极限承载力达450kPa。环境地脉动卓越周期0.18s，钱塘江潮水及远距离交通震动未引起塔体共振。',
    inspector: '中国地震局地质研究所',
    previewGradient: 'from-amber-950 via-slate-900 to-stone-900',
    footprint: [
      { lat: 30.2020, lng: 120.1260 },
      { lat: 30.2020, lng: 120.1330 },
      { lat: 30.1950, lng: 120.1330 },
      { lat: 30.1950, lng: 120.1260 },
    ],
    keyMetrics: [
      { label: '地基持力层', value: '白垩系红砂岩', status: 'normal' },
      { label: '卓越脉动周期', value: '0.18s', status: 'normal' },
      { label: '环境震动有效值', value: '0.008 mm/s', status: 'normal' },
    ],
    trendData: [
      { time: '04月', value: 0.007, baseline: 0.01, unit: '基底振速(mm/s)' },
      { time: '05月', value: 0.008, baseline: 0.01, unit: '基底振速(mm/s)' },
      { time: '06月', value: 0.009, baseline: 0.01, unit: '基底振速(mm/s)' },
      { time: '07月', value: 0.008, baseline: 0.01, unit: '基底振速(mm/s)' },
      { time: '08月', value: 0.008, baseline: 0.01, unit: '基底振速(mm/s)' },
    ],
    details: {
      coordinates: '120.1294°E, 30.1986°N',
      fileSize: '420 MB',
      format: 'MiniSEED / SEG-Y / HDF5',
      coordinateSystem: 'CGCS2000',
      qualityScore: '99.1 (优)',
    },
  },
  {
    id: 'GEO-20260815-02',
    categoryId: 'geology',
    title: '月轮山后坡深层水平位移与滑动破裂面探测',
    date: '2026-08-15',
    time: '15:10:40 CST',
    sensor: '固定式高精度数字测斜仪 (Inclinometer Probe)',
    platformType: '地面物联传感',
    resolution: '±0.02 mm/m 倾斜度',
    bandsOrChannel: '30米深孔双向导槽',
    dataLevel: 'Level 1 边坡深部形变监测',
    status: 'normal',
    statusLabel: '山体无深部滑移迹象',
    summary: '后山月轮山30米测斜导管数据显示，全深度内年累计水平位移小于0.4mm，未形成连续剪切破裂面，山体总体维持极高稳定性。',
    inspector: '浙江有色地利岩土工程勘察院',
    previewGradient: 'from-yellow-950 via-amber-950 to-slate-900',
    footprint: [
      { lat: 30.2030, lng: 120.1240 },
      { lat: 30.2030, lng: 120.1290 },
      { lat: 30.1980, lng: 120.1290 },
      { lat: 30.1980, lng: 120.1240 },
    ],
    keyMetrics: [
      { label: '深层最大位移', value: '0.38mm', status: 'normal' },
      { label: '滑动安全系数', value: 'Fs = 2.45', status: 'normal' },
      { label: '边坡稳定评级', value: 'I级 (安全)', status: 'normal' },
    ],
    trendData: [
      { time: '2023', value: 0.15, baseline: 0.5, unit: '深部累计位移(mm)' },
      { time: '2024', value: 0.22, baseline: 0.5, unit: '深部累计位移(mm)' },
      { time: '2025', value: 0.31, baseline: 0.5, unit: '深部累计位移(mm)' },
      { time: '2026', value: 0.38, baseline: 0.5, unit: '深部累计位移(mm)' },
    ],
    details: {
      coordinates: '120.1265°E, 30.2010°N',
      fileSize: '150 MB',
      format: 'Inclinometer Log (DAT) / CSV',
      coordinateSystem: 'CGCS2000',
      qualityScore: '98.8 (优)',
    },
  },

  // 7. 地形 (2 records)
  {
    id: 'TER-20260907-01',
    categoryId: 'terrain',
    title: '凤凰古城核心区 1:1000 数字线划微地貌地形图 (DLG)',
    date: '2026-09-07',
    time: '15:45:20 CST',
    sensor: '航空遥感航摄仪 + 差分RTK实测',
    platformType: '无人机航测',
    resolution: '0.05m 平面测图精度',
    bandsOrChannel: '微地貌矢量等高距 0.5m',
    dataLevel: '国家基本比例尺地形图成果',
    status: 'normal',
    statusLabel: '微地形等高线清晰平顺',
    summary: '精准记录古城街巷、石板路、明城墙、沱江跳岩、码头石阶及两岸等高线微地貌，地表排水坡度顺畅，防洪排涝通道畅通。',
    inspector: '湖南省自然资源厅测绘遥感院',
    previewGradient: 'from-lime-950 via-slate-900 to-emerald-950',
    footprint: [
      { lat: 27.9580, lng: 109.5980 },
      { lat: 27.9580, lng: 109.6080 },
      { lat: 27.9490, lng: 109.6080 },
      { lat: 27.9490, lng: 109.5980 },
    ],
    keyMetrics: [
      { label: '等高线间距', value: '0.5m', status: 'normal' },
      { label: '高程闭合差', value: '±2.4cm', status: 'normal' },
      { label: '排水流向坡降', value: '2.8%', status: 'normal' },
    ],
    trendData: [
      { time: '2022', value: 99.2, baseline: 95, unit: '地形保真度(%)' },
      { time: '2024', value: 99.5, baseline: 95, unit: '地形保真度(%)' },
      { time: '2026', value: 99.8, baseline: 95, unit: '地形保真度(%)' },
    ],
    details: {
      coordinates: '109.6015°E, 27.9536°N',
      fileSize: '650 MB',
      format: 'AutoCAD DWG / Shapefile',
      coordinateSystem: 'CGCS2000',
      qualityScore: '99.7 (优)',
    },
  },
  {
    id: 'TER-20260819-02',
    categoryId: 'terrain',
    title: '南华山国家森林公园古城后背山体微地形坡度坡向稳定性分级',
    date: '2026-08-19',
    time: '11:20:00 CST',
    sensor: 'GIS 空间水文与地貌分析引擎',
    platformType: '地面物联传感',
    resolution: '0.5m 坡度栅格',
    bandsOrChannel: 'Slope & Aspect Raster',
    dataLevel: 'Level 2 地形衍生分析图',
    status: 'normal',
    statusLabel: '山体坡度分布平稳',
    summary: '南华山山体坡度分析：古城阶地坡度3.5°极平坦，后山斜坡平均26.5°，坡向正北偏东（俯瞰沱江），未见局部大于45°的陡坡剪切滑移隐患。',
    inspector: '中国地质大学（武汉）地貌所',
    previewGradient: 'from-emerald-950 via-lime-950 to-slate-900',
    footprint: [
      { lat: 27.9570, lng: 109.5930 },
      { lat: 27.9570, lng: 109.6020 },
      { lat: 27.9470, lng: 109.6020 },
      { lat: 27.9470, lng: 109.5930 },
    ],
    keyMetrics: [
      { label: '台基平均坡度', value: '3.5°', status: 'normal' },
      { label: '主要坡向', value: '北坡 (25°)', status: 'normal' },
      { label: '高陡边坡面积', value: '0 ㎡', status: 'normal' },
    ],
    trendData: [
      { time: '2023', value: 26.5, baseline: 26.5, unit: '后山平均坡度(度)' },
      { time: '2024', value: 26.5, baseline: 26.5, unit: '后山平均坡度(度)' },
      { time: '2025', value: 26.4, baseline: 26.5, unit: '后山平均坡度(度)' },
      { time: '2026', value: 26.5, baseline: 26.5, unit: '后山平均坡度(度)' },
    ],
    details: {
      coordinates: '109.5945°E, 27.9485°N',
      fileSize: '380 MB',
      format: 'GeoTIFF Float32',
      coordinateSystem: 'CGCS2000',
      qualityScore: '98.5 (优)',
    },
  },

  // 8. DEM (1 record)
  {
    id: 'DEM-20260908-01',
    categoryId: 'dem',
    title: '空载激光雷达 0.2米 数字高程模型 (DEM / DTM)',
    date: '2026-09-08',
    time: '17:10:00 CST',
    sensor: 'Riegl VUX-1UAV 激光雷达扫描仪',
    platformType: '无人机航测',
    resolution: '0.20m 格网高程',
    bandsOrChannel: '单波段 32位 绝对高程值',
    dataLevel: 'DTM 裸地面模型',
    cloudCover: '0.0%',
    status: 'normal',
    statusLabel: '高程格网精度达毫米级',
    summary: '过滤高大植被与古城密集民居屋顶遮挡，精准构建南华山与沱江峡谷裸地表面三维高程模型，古城核心区绝对海拔高程标定为285.20米。',
    inspector: '国家基础地理信息中心',
    previewGradient: 'from-pink-950 via-slate-900 to-rose-950',
    footprint: [
      { lat: 27.9600, lng: 109.5950 },
      { lat: 27.9600, lng: 109.6100 },
      { lat: 27.9450, lng: 109.6100 },
      { lat: 27.9450, lng: 109.5950 },
    ],
    keyMetrics: [
      { label: '高程中误差', value: '±0.038m', status: 'normal' },
      { label: '古城核心标高', value: '285.20m', status: 'normal' },
      { label: '激光点密度', value: '185 pts/m²', status: 'normal' },
    ],
    trendData: [
      { time: '04月', value: 285.20, baseline: 285.20, unit: '核心区标高(m)' },
      { time: '05月', value: 285.20, baseline: 285.20, unit: '核心区标高(m)' },
      { time: '06月', value: 285.19, baseline: 285.20, unit: '核心区标高(m)' },
      { time: '07月', value: 285.20, baseline: 285.20, unit: '核心区标高(m)' },
      { time: '08月', value: 285.20, baseline: 285.20, unit: '核心区标高(m)' },
    ],
    details: {
      coordinates: '109.6015°E, 27.9536°N',
      fileSize: '1.92 GB',
      format: 'GeoTIFF / USGS DEM / BIL',
      coordinateSystem: 'CGCS2000 / 1985国家高程基准',
      qualityScore: '99.8 (极优)',
    },
  },

  // 9. InSAR (1 record)
  {
    id: 'INS-20260910-01',
    categoryId: 'insar',
    title: 'Sentinel-1 & TSX 时序 PS-InSAR 凤凰古城与木构群微形变反演',
    date: '2026-09-10',
    time: '03:22:45 CST',
    sensor: 'Sentinel-1 SAR C波段 + TerraSAR-X X波段',
    platformType: '雷达干涉',
    resolution: '毫米级微位移精度 (±1.1mm)',
    bandsOrChannel: 'PS-InSAR 时序永久散射体',
    dataLevel: 'Level 3 形变速率场',
    status: 'normal',
    statusLabel: '年沉降速率在允许范围内',
    summary: '近5年共86景SAR干涉对反演：古城核心区建筑群及南华山山脚基底年均形变速率为-0.28 mm/a，属于微小弹性形变，未见不均匀沉降异常。',
    inspector: '同济大学测绘与地理信息学院·空间对地观测中心',
    previewGradient: 'from-indigo-950 via-slate-900 to-blue-950',
    footprint: [
      { lat: 27.9620, lng: 109.5930 },
      { lat: 27.9620, lng: 109.6130 },
      { lat: 27.9430, lng: 109.6130 },
      { lat: 27.9430, lng: 109.5930 },
    ],
    keyMetrics: [
      { label: '建筑年沉降率', value: '-0.28 mm/a', status: 'normal' },
      { label: '相干散射点密度', value: '480 pts/km²', status: 'normal' },
      { label: '不均匀沉降梯度', value: '< 0.05 mm/m', status: 'normal' },
    ],
    trendData: [
      { time: '2022', value: -0.10, baseline: 0, threshold: -5.0, unit: '累计视向位移(mm)' },
      { time: '2023', value: -0.28, baseline: 0, threshold: -5.0, unit: '累计视向位移(mm)' },
      { time: '2024', value: -0.55, baseline: 0, threshold: -5.0, unit: '累计视向位移(mm)' },
      { time: '2025', value: -0.84, baseline: 0, threshold: -5.0, unit: '累计视向位移(mm)' },
      { time: '2026', value: -1.12, baseline: 0, threshold: -5.0, unit: '累计视向位移(mm)' },
    ],
    details: {
      coordinates: '109.6015°E, 27.9536°N',
      fileSize: '2.10 GB',
      format: 'NetCDF / Shapefile (Deformation Points)',
      coordinateSystem: 'CGCS2000',
      qualityScore: '99.5 (优)',
    },
  },

  // 10. SAR (1 record)
  {
    id: 'SAR-20260909-01',
    categoryId: 'sar',
    title: '高分三号 1米超精细条带雷达单偏振/全极化SAR影像',
    date: '2026-09-09',
    time: '23:40:12 CST',
    sensor: 'GF-3 C-SAR 合成孔径雷达',
    platformType: '卫星遥感',
    resolution: '1.0m 空间分辨率',
    bandsOrChannel: 'C波段 VV/VH 双极化',
    dataLevel: 'Level 1B 单视复数 (SLC)',
    cloudCover: '穿透云雾 100%',
    status: 'normal',
    statusLabel: '微波雷达后向散射强且稳定',
    summary: '夜间全天时穿透多云天气成像：凤凰古城连绵木构吊脚楼与虹桥呈现典型角反射特征，沱江水面镜面反射低回波，峡谷水陆轮廓边缘清晰。',
    inspector: '自然资源部空间海洋与对地观测遥感中心',
    previewGradient: 'from-teal-950 via-slate-900 to-cyan-950',
    footprint: [
      { lat: 27.9650, lng: 109.5900 },
      { lat: 27.9650, lng: 109.6180 },
      { lat: 27.9400, lng: 109.6180 },
      { lat: 27.9400, lng: 109.5900 },
    ],
    keyMetrics: [
      { label: '雷达入射角', value: '38.4°', status: 'normal' },
      { label: '雷达波段', value: 'C波段 (5.4GHz)', status: 'normal' },
      { label: '等效视数 (ENL)', value: '3.8 (斑点噪声低)', status: 'normal' },
    ],
    trendData: [
      { time: '04月', value: 0.88, baseline: 0.85, unit: '雷达相干度' },
      { time: '05月', value: 0.90, baseline: 0.85, unit: '雷达相干度' },
      { time: '06月', value: 0.89, baseline: 0.85, unit: '雷达相干度' },
      { time: '07月', value: 0.91, baseline: 0.85, unit: '雷达相干度' },
      { time: '08月', value: 0.92, baseline: 0.85, unit: '雷达相干度' },
    ],
    details: {
      coordinates: '109.6015°E, 27.9536°N',
      fileSize: '3.12 GB',
      format: 'GeoTIFF / HDF5 / CEOS',
      coordinateSystem: 'CGCS2000',
      qualityScore: '98.9 (优)',
    },
  },

  // 11. 光学 (1 record)
  {
    id: 'OPT-20260908-01',
    categoryId: 'optical',
    title: '高分二号 0.8米 全色多光谱真彩色融合正射影像',
    date: '2026-09-08',
    time: '11:20:18 CST',
    sensor: 'GF-2 PMS1 空间高分相机',
    platformType: '卫星遥感',
    resolution: '0.8m 全色 / 3.2m 多光谱',
    bandsOrChannel: 'Band 1-4 (RGB + 近红外)',
    dataLevel: 'Level 2A 正射产品 (DOM)',
    cloudCover: '0.0% 无云',
    status: 'normal',
    statusLabel: '真彩清晰无云',
    summary: '覆盖湖南湘西凤凰古城、沱江两岸吊脚楼、虹桥风雨楼及南华山风景区，全色与多光谱Gram-Schmidt融合，古城青瓦木构与两岸跳岩轮廓清晰锐利。',
    inspector: '中国资源卫星应用中心',
    previewGradient: 'from-blue-950 via-sky-900 to-slate-900',
    footprint: [
      { lat: 27.9680, lng: 109.5880 },
      { lat: 27.9680, lng: 109.6200 },
      { lat: 27.9380, lng: 109.6200 },
      { lat: 27.9380, lng: 109.5880 },
    ],
    keyMetrics: [
      { label: '空间分辨率', value: '0.8m', status: 'normal' },
      { label: '太阳高度角', value: '58.2°', status: 'normal' },
      { label: '辐射定标精度', value: '99.1%', status: 'normal' },
    ],
    trendData: [
      { time: '04月', value: 85, baseline: 80, unit: '绿化植被反射指数(NDVI)' },
      { time: '05月', value: 88, baseline: 80, unit: '绿化植被反射指数(NDVI)' },
      { time: '06月', value: 91, baseline: 80, unit: '绿化植被反射指数(NDVI)' },
      { time: '07月', value: 92, baseline: 80, unit: '绿化植被反射指数(NDVI)' },
      { time: '08月', value: 90, baseline: 80, unit: '绿化植被反射指数(NDVI)' },
    ],
    details: {
      coordinates: '120.1294°E, 30.1986°N',
      fileSize: '1.75 GB',
      format: 'GeoTIFF / COG',
      coordinateSystem: 'CGCS2000 / 3度分带 40带',
      qualityScore: '99.4 (优)',
    },
  },

  // 补充兼容记录
  {
    id: 'INF-20260907-01',
    categoryId: 'infrared',
    title: 'Landsat-9 TIRS 热红外地表温度反演与夜间巡检图',
    date: '2026-09-07',
    time: '22:30:00 CST',
    sensor: 'TIRS-2 热红外传感器',
    platformType: '卫星遥感',
    resolution: '100m 空间分辨率 (重采样至30m)',
    bandsOrChannel: 'Band 10 (10.60 - 11.19 µm)',
    dataLevel: 'Level 2 地表温度 LST (℃)',
    cloudCover: '0.0%',
    status: 'normal',
    statusLabel: '夜间古建表面无热异常',
    summary: '反演月轮山林区与古建筑夜间温度场，砖木古塔表面温差均匀，无违规电热聚集与异常温升。',
    inspector: '遥感红外探测实验室',
    previewGradient: 'from-amber-950 via-orange-950 to-slate-900',
    footprint: [
      { lat: 30.2100, lng: 120.1150 },
      { lat: 30.2100, lng: 120.1450 },
      { lat: 30.1850, lng: 120.1450 },
      { lat: 30.1850, lng: 120.1150 },
    ],
    keyMetrics: [
      { label: '塔身平均温度', value: '24.2 ℃', status: 'normal' },
      { label: '水体冷岛差值', value: '-2.8 ℃', status: 'normal' },
    ],
    trendData: [
      { time: '04月', value: 18.2, baseline: 20, unit: '地表平均温度(℃)' },
      { time: '06月', value: 26.5, baseline: 20, unit: '地表平均温度(℃)' },
      { time: '08月', value: 31.2, baseline: 20, unit: '地表平均温度(℃)' },
      { time: '09月', value: 24.2, baseline: 20, unit: '地表平均温度(℃)' },
    ],
    details: {
      coordinates: '120.1294°E, 30.1986°N',
      fileSize: '410 MB',
      format: 'GeoTIFF',
      coordinateSystem: 'CGCS2000',
      qualityScore: '98.5 (优)',
    },
  },
  {
    id: 'FIR-20260910-01',
    categoryId: 'fire',
    title: '风云四号热异常与景区木构防火物联网联动监测',
    date: '2026-09-10',
    time: '14:15:00 CST',
    sensor: 'FY-4B AGRI + 微型烟感温感LoRa传感网',
    platformType: '地面物联传感',
    resolution: '2km 星载热像 / 秒级物联报警',
    bandsOrChannel: '3.7µm 中红外亮温通道',
    dataLevel: 'Level 1 实时火险等级预警',
    status: 'normal',
    statusLabel: '一级安全低火险',
    summary: '空天地协同火险感知：星载无热异常像素，木构外廊48处温感与火焰光电感应探头全部正常在线。',
    inspector: '国家文物局·安全消防预警中心',
    previewGradient: 'from-rose-950 via-red-950 to-slate-900',
    footprint: [
      { lat: 30.2030, lng: 120.1250 },
      { lat: 30.2030, lng: 120.1340 },
      { lat: 30.1940, lng: 120.1340 },
      { lat: 30.1940, lng: 120.1250 },
    ],
    keyMetrics: [
      { label: '火险预警等级', value: 'I级 (安全)', status: 'normal' },
      { label: '物联探头在线率', value: '100%', status: 'normal' },
    ],
    trendData: [
      { time: '05月', value: 1, baseline: 1, threshold: 3, unit: '火险等级(级)' },
      { time: '06月', value: 1, baseline: 1, threshold: 3, unit: '火险等级(级)' },
      { time: '07月', value: 2, baseline: 1, threshold: 3, unit: '火险等级(级)' },
      { time: '08月', value: 2, baseline: 1, threshold: 3, unit: '火险等级(级)' },
      { time: '09月', value: 1, baseline: 1, threshold: 3, unit: '火险等级(级)' },
    ],
    details: {
      coordinates: '120.1294°E, 30.1986°N',
      fileSize: '85 MB',
      format: 'JSON / GeoJSON Alert Stream',
      coordinateSystem: 'CGCS2000',
      qualityScore: '99.9 (极优)',
    },
  },
];
