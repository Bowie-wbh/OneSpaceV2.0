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
  taskId: string;
  photoCount: number;
  area: number;
  fireIntensity?: "low" | "medium" | "high" | "extreme";
  affectedArea?: number;
  images: SatelliteImage[];
}

export const locations: Location[] = [
  // ── 有火点区域 ────────────────────────────────────────────────────────
  {
    id: "loc-001",
    name: "俄勒冈/爱达荷边界",
    country: "美国",
    lat: 44.52,
    lng: -117.15,
    status: "fire",
    capturedAt: "2026/9/2 1:19",
    taskId: "TASK_20260901075107",
    photoCount: 48,
    area: 12400,
    fireIntensity: "extreme",
    affectedArea: 3840,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "长波红外热成像：俄勒冈/爱达荷边界活跃火线识别",
        captureTime: "2026/9/2 1:19",
        lat: 44.52,
        lng: -117.15,
        landType: "山地针叶林/灌木林",
        analysis:
          "星载长波红外 (LWIR) 传感器反演数据确认俄勒冈与爱达荷交界林区多处活跃火点，燃烧区域沿山脊线蔓延扩散，地温异常值显著，属极高能量释放区间。",
      },
      {
        url: fireLwirPreviewImg,
        caption: "多光谱与热红外融合：火线蔓延态势与烟羽反演",
        captureTime: "2026/9/2 1:05",
        lat: 44.58,
        lng: -117.22,
        landType: "山地针叶林/灌木林",
        analysis:
          "红外波段烟羽与高温区域高度重叠，山地植被冠层损毁显著。初步评估受损林区面积约 3840 平方公里，已触发自主告警机制。",
      },
    ],
  },

  // ── 无火点巡查区域 ────────────────────────────────────────────────────
  {
    id: "loc-002",
    name: "南下加利福尼亚州",
    country: "墨西哥",
    lat: 26.05,
    lng: -111.67,
    status: "safe",
    capturedAt: "2026/9/1 1:21:47",
    taskId: "TASK_20260831025249",
    photoCount: 32,
    area: 8600,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "长波红外辐射扫描：干旱灌木林温场平稳",
        captureTime: "2026/9/1 1:21:47",
        lat: 26.05,
        lng: -111.67,
        landType: "干旱灌木林/山地林区",
        analysis:
          "本次过境巡查未发现活跃火点。长波红外成像显示干旱林区地表温度分布均匀，无热辐射异常，火险等级处于安全受控状态。",
      },
    ],
  },
  {
    id: "loc-003",
    name: "西北地区·大奴湖以东",
    country: "加拿大",
    lat: 62.50,
    lng: -110.50,
    status: "safe",
    capturedAt: "2026/9/1 14:30",
    taskId: "TASK_20260901075106",
    photoCount: 28,
    area: 15200,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "泰加林带热红外扫描：地表温场基底监测",
        captureTime: "2026/9/1 14:30",
        lat: 62.50,
        lng: -110.50,
        landType: "泰加针叶林带",
        analysis:
          "大奴湖以东泰加林带地表温场平稳，红外通道未见异常增温与烟羽迹象，地表湿润度维持在季节安全区间。",
      },
    ],
  },
  {
    id: "loc-004",
    name: "法国·吉伦特/朗德(Bordeaux地区)",
    country: "法国",
    lat: 44.60,
    lng: -0.80,
    status: "safe",
    capturedAt: "2026/9/2 14:30:28",
    taskId: "TASK_20260901075106",
    photoCount: 36,
    area: 6800,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "朗德松林遥感巡查：热红外与植被冠层监测",
        captureTime: "2026/9/2 14:30:28",
        lat: 44.60,
        lng: -0.80,
        landType: "朗德松林/温带针叶林",
        analysis:
          "波尔多及朗德森林区红外反演正常，无明火与高温阴燃点，植被冠层指数健康度良好。",
      },
    ],
  },
  {
    id: "loc-005",
    name: "中非共和国·西南部旱季草原火",
    country: "中非共和国",
    lat: 4.50,
    lng: 16.50,
    status: "safe",
    capturedAt: "2026/9/7 4:36",
    taskId: "TASK_20260906025954",
    photoCount: 42,
    area: 18400,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "热带稀树草原巡检：热异常排查",
        captureTime: "2026/9/7 4:36",
        lat: 4.50,
        lng: 16.50,
        landType: "热带稀树草原",
        analysis:
          "西南部旱季草场区域巡检无突发明火，背景热辐射平稳，未见大范围过火蔓延迹象。",
      },
    ],
  },
  {
    id: "loc-006",
    name: "朝鲜",
    country: "朝鲜",
    lat: 40.00,
    lng: 127.50,
    status: "safe",
    capturedAt: "2026/9/8 21:48",
    taskId: "TASK_20260908080300",
    photoCount: 24,
    area: 5400,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "山地林区夜间红外扫描：温场平稳无热点",
        captureTime: "2026/9/8 21:48",
        lat: 40.00,
        lng: 127.50,
        landType: "温带针阔混交林",
        analysis:
          "夜间红外通道扫描显示山林区域温场基底均匀，植被覆盖完整，未见火情异常。",
      },
    ],
  },
  {
    id: "loc-007",
    name: "缅甸",
    country: "缅甸",
    lat: 21.00,
    lng: 96.00,
    status: "safe",
    capturedAt: "2026/9/14 19:05",
    taskId: "TASK_20260914010731",
    photoCount: 30,
    area: 7800,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "热带季雨林红外监测：林冠温场扫描",
        captureTime: "2026/9/14 19:05",
        lat: 21.00,
        lng: 96.00,
        landType: "热带季雨林",
        analysis:
          "热带季雨林区红外温场稳定，无地表热辐射异常与烟雾聚集，巡查结果为安全。",
      },
    ],
  },
  {
    id: "loc-008",
    name: "俄罗斯",
    country: "俄罗斯",
    lat: 56.50,
    lng: 120.00,
    status: "safe",
    capturedAt: "2026/9/15 6:41",
    taskId: "TASK_20260914010732",
    photoCount: 45,
    area: 24000,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "远东针叶林巡检：地表温度与湿度反演",
        captureTime: "2026/9/15 6:41",
        lat: 56.50,
        lng: 120.00,
        landType: "远东落叶松林带",
        analysis:
          "远东泰加针叶林带长波红外成像未见热异常，林区湿度适中，火险等级低。",
      },
    ],
  },
  {
    id: "loc-009",
    name: "老挝",
    country: "老挝",
    lat: 18.20,
    lng: 103.50,
    status: "safe",
    capturedAt: "2026/9/15 18:58",
    taskId: "TASK_20260914010733",
    photoCount: 22,
    area: 6200,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "山地热带雨林夜间红外成像：地温无异常",
        captureTime: "2026/9/15 18:58",
        lat: 18.20,
        lng: 103.50,
        landType: "山地热带雨林",
        analysis:
          "老挝山地林区红外通道成像正常，无热源异常响应，火情监测结果安全。",
      },
    ],
  },
  {
    id: "loc-010",
    name: "哈密市伊吾县",
    country: "中国",
    lat: 43.25,
    lng: 94.70,
    status: "safe",
    capturedAt: "2026/9/16 8:13",
    taskId: "TASK_20260915081909",
    photoCount: 26,
    area: 9800,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "东天山伊吾林区扫描：山地胡杨林温场监测",
        captureTime: "2026/9/16 8:13",
        lat: 43.25,
        lng: 94.70,
        landType: "山地胡杨与天然林",
        analysis:
          "新疆哈密市伊吾县林区地表温场平稳，未发现火险异常点，生态屏障监测正常。",
      },
    ],
  },
  {
    id: "loc-011",
    name: "刚果共和国",
    country: "刚果共和国",
    lat: -0.80,
    lng: 15.50,
    status: "safe",
    capturedAt: "2026/9/19 0:55",
    taskId: "TASK_20260918075003",
    photoCount: 38,
    area: 16500,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "刚果盆地雨林红外扫描：连续冠层温场稳定",
        captureTime: "2026/9/19 0:55",
        lat: -0.80,
        lng: 15.50,
        landType: "刚果盆地热带雨林",
        analysis:
          "刚果盆地热带雨林冠层连续完整，地表温度基底均匀，无活跃火点与暗燃热异常。",
      },
    ],
  },
  {
    id: "loc-012",
    name: "俄罗斯",
    country: "俄罗斯",
    lat: 60.50,
    lng: 100.50,
    status: "safe",
    capturedAt: "2026/9/19 11:00",
    taskId: "TASK_20260918075004",
    photoCount: 40,
    area: 32000,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "中西伯利亚泰加林巡查：大范围红外热像扫描",
        captureTime: "2026/9/19 11:00",
        lat: 60.50,
        lng: 100.50,
        landType: "西伯利亚针叶林带",
        analysis:
          "中西伯利亚泰加林带长波红外扫描未见异常热源，地表温场与历史同期均值吻合。",
      },
    ],
  },
  {
    id: "loc-013",
    name: "广东省茂名市化州市",
    country: "中国",
    lat: 21.66,
    lng: 110.64,
    status: "safe",
    capturedAt: "2026/9/20 18:26",
    taskId: "TASK_20260920011329",
    photoCount: 20,
    area: 4600,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "粤西林区红外巡查：植被温场基准监测",
        captureTime: "2026/9/20 18:26",
        lat: 21.66,
        lng: 110.64,
        landType: "亚热带常绿阔叶林",
        analysis:
          "广东省茂名市化州市林区红外反演正常，无野外火源与秸秆焚烧热点，安全受控。",
      },
    ],
  },
  {
    id: "loc-014",
    name: "和田地区于田县",
    country: "中国",
    lat: 36.85,
    lng: 81.66,
    status: "safe",
    capturedAt: "2026/9/20 20:06",
    taskId: "TASK_20260920084505",
    photoCount: 25,
    area: 8900,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "塔里木盆地南缘防风林扫描：温场红外监测",
        captureTime: "2026/9/20 20:06",
        lat: 36.85,
        lng: 81.66,
        landType: "绿洲外围防风固沙林",
        analysis:
          "新疆和田地区于田县绿洲林带红外扫描未见热异常，夜间温度平稳，无火情隐患。",
      },
    ],
  },
  {
    id: "loc-015",
    name: "印度尼西亚-伊李安查亚省",
    country: "印度尼西亚",
    lat: -4.20,
    lng: 138.00,
    status: "safe",
    capturedAt: "2026/9/21 4:42",
    taskId: "TASK_20260920084506",
    photoCount: 35,
    area: 13800,
    images: [
      {
        url: fireLwirPreviewImg,
        caption: "伊里安查亚热带雨林扫描：热带泥炭与林冠监测",
        captureTime: "2026/9/21 4:42",
        lat: -4.20,
        lng: 138.00,
        landType: "伊里安查亚热带雨林",
        analysis:
          "印度尼西亚伊里安查亚省雨林泥炭层长波红外扫描正常，无复燃与阴燃热点，火险等级正常。",
      },
    ],
  },
];

export const stats = {
  monitoringDays: 847,
  completedTasks: 16,
  capturedRegions: locations.length,
  totalPhotos: 16,
  firePoints: locations.filter((l) => l.status === "fire").length,
};
