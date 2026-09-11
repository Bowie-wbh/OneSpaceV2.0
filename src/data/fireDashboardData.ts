import fireLwirPreviewImg from '../assets/3D_1788272998_LWIR_full_preview.jpg';

export type FireStatus = "fire" | "safe";

export interface SatelliteImage {
  url: string;
  caption: string;
  analysis: string;
  captureTime: string;
  lat: number;
  lng: number;
  landType: string;
}

export interface Location {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  status: FireStatus;
  capturedAt: string;
  photoCount: number;
  area: number;
  fireIntensity?: "low" | "medium" | "high" | "extreme";
  affectedArea?: number;
  images: SatelliteImage[];
}

export const locations: Location[] = [
  {
    id: "loc-001",
    name: "亚马逊雨林东部",
    country: "巴西",
    lat: -5.2,
    lng: -55.8,
    status: "fire",
    capturedAt: "2026-09-04 14:32 UTC",
    photoCount: 48,
    area: 12400,
    fireIntensity: "extreme",
    affectedArea: 3840,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "长波红外热成像：3D全景活跃火线（火红高温区域）",
        captureTime: "2026-09-04 14:32",
        lat: -5.20,
        lng: -55.80,
        landType: "热带雨林",
        analysis:
          "星载长波红外 (LWIR) 传感器反演数据确认多处活跃火点，燃烧区域呈不规则扩散态势，受风场影响向周边蔓延。红色高亮区域对应地表温度异常，属极高能量释放区间。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "多光谱与热红外融合：烟羽与热辐射重叠",
        captureTime: "2026-09-04 14:18",
        lat: -5.28,
        lng: -55.86,
        landType: "热带雨林",
        analysis:
          "红外波段烟羽与高温区域高度重叠，植被冠层损毁显著。初步评估受损林区面积约 3840 平方公里。建议立即启动紧急响应协议，优先保护周边缓冲区生态系统。",
      },
    ],
  },
  {
    id: "loc-002",
    name: "加利福尼亚中部山区",
    country: "美国",
    lat: 37.5,
    lng: -119.5,
    status: "fire",
    capturedAt: "2026-09-03 22:17 UTC",
    photoCount: 63,
    area: 8900,
    fireIntensity: "high",
    affectedArea: 1250,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "Sentinel-2 / 星载 LWIR 合成：峡谷火线识别",
        captureTime: "2026-09-03 22:17",
        lat: 37.50,
        lng: -119.50,
        landType: "针叶林",
        analysis:
          "长波红外影像检测到山脊线沿线多个独立火点。红外与短波红外波段合成清晰呈现三条主要火线，火线前沿平均推进速率 200 米/小时。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "热辐射反演：山脊火线推进态势",
        captureTime: "2026-09-03 22:03",
        lat: 37.58,
        lng: -119.44,
        landType: "针叶林",
        analysis:
          "受复杂地形与干燥气候共同作用，火势沿峡谷快速延伸。当前火场面积约 1250 平方公里，燃料层极度干燥，火险等级为最高级别。",
      },
    ],
  },
  {
    id: "loc-003",
    name: "西伯利亚泰加林带",
    country: "俄罗斯",
    lat: 62.0,
    lng: 115.0,
    status: "fire",
    capturedAt: "2026-09-02 08:05 UTC",
    photoCount: 37,
    area: 42000,
    fireIntensity: "medium",
    affectedArea: 6700,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "LWIR 夜间热成像：泥炭阴燃区域",
        captureTime: "2026-09-02 08:05",
        lat: 62.00,
        lng: 115.00,
        landType: "泥炭地",
        analysis:
          "星载热异常监测显示大范围泥炭地持续缓燃。地下阴燃特征明显，热红外波段清晰可见高温区域，地温异常值达 85°C 以上。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "多光谱分析：植被损失评估",
        captureTime: "2026-09-02 07:51",
        lat: 62.08,
        lng: 115.06,
        landType: "针叶林",
        analysis:
          "泥炭层厚度估算约 2–4 米，储碳量巨大，地下阴燃可能持续数月。多时相植被损失对比显示本轮受损面积约 6700 平方公里。",
      },
    ],
  },
  {
    id: "loc-004",
    name: "澳大利亚东南部",
    country: "澳大利亚",
    lat: -36.5,
    lng: 148.5,
    status: "fire",
    capturedAt: "2026-09-04 01:44 UTC",
    photoCount: 29,
    area: 7200,
    fireIntensity: "high",
    affectedArea: 890,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "高分辨率 LWIR 影像：火场边界与烟羽",
        captureTime: "2026-09-04 01:44",
        lat: -36.50,
        lng: 148.50,
        landType: "灌木地",
        analysis:
          "受西北热浪影响，多处林火同步爆发。长波红外遥感影像显示火场边界不规则，火线总长度超过 320 公里，空气质量指数达危险级别。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "NBR 指数：燃烧强度分级图",
        captureTime: "2026-09-04 01:30",
        lat: -36.58,
        lng: 148.56,
        landType: "灌木地",
        analysis:
          "归一化燃烧比（NBR）分析显示高强度燃烧区占总火场面积约 42%，主要集中于山脊背风侧，次生林成为主要燃料。",
      },
    ],
  },
  {
    id: "loc-005",
    name: "刚果盆地中部",
    country: "刚果",
    lat: -1.5,
    lng: 24.0,
    status: "safe",
    capturedAt: "2026-09-01 10:20 UTC",
    photoCount: 44,
    area: 15600,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "长波红外辐射扫描：地表温场平稳",
        captureTime: "2026-09-01 10:20",
        lat: -1.50,
        lng: 24.00,
        landType: "热带雨林",
        analysis:
          "本次巡检未发现活跃火点。长波红外成像显示植被覆盖连续完整，地表温度分布均匀，无明显热辐射异常。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "NDVI 指数图：植被健康状态",
        captureTime: "2026-09-01 10:06",
        lat: -1.58,
        lng: 24.06,
        landType: "热带雨林",
        analysis:
          "植被指数（NDVI）维持在正常范围 0.72–0.85，地表温度分布均匀，无热异常。土壤含水量饱和，短期内火灾风险极低。",
      },
    ],
  },
  {
    id: "loc-006",
    name: "北欧斯堪的纳维亚林区",
    country: "瑞典",
    lat: 63.0,
    lng: 17.0,
    status: "safe",
    capturedAt: "2026-08-30 16:55 UTC",
    photoCount: 21,
    area: 5800,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "长波红外光谱：针叶林热温分布",
        captureTime: "2026-08-30 16:55",
        lat: 63.00,
        lng: 17.00,
        landType: "针叶林",
        analysis:
          "遥感数据显示该区域无明火点，针叶林冠层完整。夏季持续高温导致林下燃料层干燥，局部区域地表温度高于历史同期均值约 3.2°C。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "土壤湿度反演：干旱风险分布",
        captureTime: "2026-08-30 16:41",
        lat: 63.08,
        lng: 17.06,
        landType: "针叶林",
        analysis:
          "土壤湿度反演结果显示部分区域湿度下降至警戒值附近，火险等级评定为中等。建议未来两周内加密监测频次。",
      },
    ],
  },
  {
    id: "loc-007",
    name: "印度尼西亚苏门答腊",
    country: "印度尼西亚",
    lat: 0.5,
    lng: 102.0,
    status: "fire",
    capturedAt: "2026-09-03 05:30 UTC",
    photoCount: 55,
    area: 9300,
    fireIntensity: "extreme",
    affectedArea: 2100,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "LWIR 穿透烟雾识别火场大范围蔓延",
        captureTime: "2026-09-03 05:30",
        lat: 0.50,
        lng: 102.00,
        landType: "泥炭地",
        analysis:
          "长波红外穿透浓烟识别出地下阴燃与地表明火扩展方向，反应泥炭层结构性破坏范围约 2100 平方公里。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "AOD 气溶胶与热红外异常联合图",
        captureTime: "2026-09-03 05:16",
        lat: 0.58,
        lng: 102.06,
        landType: "泥炭地",
        analysis:
          "双重确认泥炭地火灾复燃。烟霾指数（AOD）超过 2.5，属极端严重等级，建议立即启动应急机制。",
      },
    ],
  },
  {
    id: "loc-008",
    name: "加拿大不列颠哥伦比亚省",
    country: "加拿大",
    lat: 52.0,
    lng: -122.0,
    status: "safe",
    capturedAt: "2026-08-28 19:10 UTC",
    photoCount: 33,
    area: 11200,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "LWIR 扫描：降雨后温场恢复",
        captureTime: "2026-08-28 19:10",
        lat: 52.00,
        lng: -122.00,
        landType: "针叶林",
        analysis:
          "连续降雨过后，区域地表湿度与温度恢复至正常水平。长波红外成像无高温异常，新生植被恢复良好。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "短波红外：地表湿度分布",
        captureTime: "2026-08-28 18:56",
        lat: 52.08,
        lng: -121.94,
        landType: "针叶林",
        analysis:
          "短波红外反射率分析显示土壤含水量已回升至季节性正常区间，冬季前的火险窗口期基本结束。",
      },
    ],
  },
  {
    id: "loc-009",
    name: "地中海伊比利亚半岛",
    country: "西班牙",
    lat: 40.0,
    lng: -5.5,
    status: "fire",
    capturedAt: "2026-09-04 11:22 UTC",
    photoCount: 41,
    area: 6100,
    fireIntensity: "medium",
    affectedArea: 450,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "LWIR 多波段解译：火线与烟羽走向",
        captureTime: "2026-09-04 11:22",
        lat: 40.00,
        lng: -5.50,
        landType: "灌木地",
        analysis:
          "夏季热浪与强阵风叠加，卡斯蒂利亚地区多处起火。长波红外遥感识别出三条独立火线，总长约 85 公里。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "火蔓延模拟：48 小时热扩散预测",
        captureTime: "2026-09-04 11:08",
        lat: 40.08,
        lng: -5.44,
        landType: "灌木地",
        analysis:
          "受地形切割影响，空中灭火作业难度较大。火焰蔓延速率约 150 米/小时，48 小时蔓延预测显示受影响面积可能扩大。",
      },
    ],
  },
  {
    id: "loc-010",
    name: "东非埃塞俄比亚高原",
    country: "埃塞俄比亚",
    lat: 9.0,
    lng: 40.5,
    status: "safe",
    capturedAt: "2026-09-02 07:15 UTC",
    photoCount: 18,
    area: 8700,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "长波红外成像：旱季地表温场监控",
        captureTime: "2026-09-02 07:15",
        lat: 9.00,
        lng: 40.50,
        landType: "农业用地",
        analysis:
          "本次覆盖区域无火点，农业用地与草地交错分布。红外温场数据显示植被覆盖度变化与旱季进程吻合。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "土地利用分类与温场监控",
        captureTime: "2026-09-02 07:01",
        lat: 9.08,
        lng: 40.56,
        landType: "农业用地",
        analysis:
          "历史上该区域存在农业焚烧习惯，土地利用分类显示农业用地占区域面积约 58%，建议持续跟踪关注。",
      },
    ],
  },
];

export const stats = {
  monitoringDays: 847,
  capturedRegions: locations.length,
  totalPhotos: locations.reduce((sum, l) => sum + l.photoCount, 0),
  firePoints: locations.filter((l) => l.status === "fire").length,
};
