import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CloudSun,
  X,
  ChevronDown,
  Calendar,
  Plane,
  Thermometer,
  Cloud,
  Wind,
  CloudRain,
  Sun,
  CloudLightning,
  Sparkles,
} from 'lucide-react';

export interface AirportWeatherItem {
  id: string;
  name: string;
  shortName: string;
  code: string;
  city: string;
  province: string;
  lng: number;
  lat: number;
  elevation: number;
  baseTemp: number;
  baseCloud: number;
  baseWind: number;
  baseRain: number;
}

export const AIRPORT_WEATHER_LIST: AirportWeatherItem[] = [
  {
    id: 'airport-urc',
    name: '新疆乌鲁木齐地窝堡国际机场',
    shortName: '乌鲁木齐机场',
    code: 'URC / ZWWW',
    city: '乌鲁木齐',
    province: '新疆维吾尔自治区',
    lng: 87.4742,
    lat: 43.9073,
    elevation: 648,
    baseTemp: 18,
    baseCloud: 20,
    baseWind: 3.6,
    baseRain: 0,
  },
  {
    id: 'airport-khg',
    name: '新疆喀什徕宁国际机场',
    shortName: '喀什机场',
    code: 'KHG / ZWSH',
    city: '喀什',
    province: '新疆维吾尔自治区',
    lng: 75.9802,
    lat: 39.5429,
    elevation: 1380,
    baseTemp: 22,
    baseCloud: 15,
    baseWind: 4.0,
    baseRain: 0,
  },
  {
    id: 'airport-yin',
    name: '新疆伊宁机场',
    shortName: '伊宁机场',
    code: 'YIN / ZWYN',
    city: '伊宁',
    province: '新疆维吾尔自治区',
    lng: 81.3303,
    lat: 43.9558,
    elevation: 670,
    baseTemp: 16,
    baseCloud: 35,
    baseWind: 2.8,
    baseRain: 0.4,
  },
  {
    id: 'airport-aat',
    name: '新疆阿勒泰雪都机场',
    shortName: '阿勒泰机场',
    code: 'AAT / ZWAT',
    city: '阿勒泰',
    province: '新疆维吾尔自治区',
    lng: 88.0844,
    lat: 47.7506,
    elevation: 750,
    baseTemp: 12,
    baseCloud: 45,
    baseWind: 3.2,
    baseRain: 1.2,
  },
  {
    id: 'airport-pkx',
    name: '北京大兴国际机场',
    shortName: '北京大兴机场',
    code: 'PKX / ZBAD',
    city: '北京',
    province: '北京市',
    lng: 116.4105,
    lat: 39.5098,
    elevation: 30,
    baseTemp: 20,
    baseCloud: 25,
    baseWind: 2.5,
    baseRain: 0,
  },
  {
    id: 'airport-pvg',
    name: '上海浦东国际机场',
    shortName: '上海浦东机场',
    code: 'PVG / ZSPD',
    city: '上海',
    province: '上海市',
    lng: 121.8052,
    lat: 31.1434,
    elevation: 4,
    baseTemp: 24,
    baseCloud: 60,
    baseWind: 4.8,
    baseRain: 2.8,
  },
  {
    id: 'airport-can',
    name: '广州白云国际机场',
    shortName: '广州白云机场',
    code: 'CAN / ZGGG',
    city: '广州',
    province: '广东省',
    lng: 113.3088,
    lat: 23.3924,
    elevation: 15,
    baseTemp: 28,
    baseCloud: 70,
    baseWind: 3.0,
    baseRain: 4.5,
  },
  {
    id: 'airport-tfu',
    name: '成都天府国际机场',
    shortName: '成都天府机场',
    code: 'TFU / ZUTF',
    city: '成都',
    province: '四川省',
    lng: 104.4447,
    lat: 30.3175,
    elevation: 440,
    baseTemp: 21,
    baseCloud: 75,
    baseWind: 1.8,
    baseRain: 1.5,
  },
  {
    id: 'airport-xiy',
    name: '西安咸阳国际机场',
    shortName: '西安咸阳机场',
    code: 'XIY / ZLXY',
    city: '西安',
    province: '陕西省',
    lng: 108.7516,
    lat: 34.4471,
    elevation: 479,
    baseTemp: 19,
    baseCloud: 40,
    baseWind: 2.2,
    baseRain: 0.2,
  },
  {
    id: 'airport-lxa',
    name: '拉萨贡嘎国际机场',
    shortName: '拉萨贡嘎机场',
    code: 'LXA / ZULS',
    city: '拉萨',
    province: '西藏自治区',
    lng: 90.9119,
    lat: 29.2978,
    elevation: 3570,
    baseTemp: 13,
    baseCloud: 30,
    baseWind: 5.5,
    baseRain: 0.1,
  },
  {
    id: 'airport-hgh',
    name: '杭州萧山国际机场',
    shortName: '杭州萧山机场',
    code: 'HGH / ZSHC',
    city: '杭州',
    province: '浙江省',
    lng: 120.4344,
    lat: 30.2295,
    elevation: 7,
    baseTemp: 23,
    baseCloud: 55,
    baseWind: 3.2,
    baseRain: 1.6,
  },
  {
    id: 'airport-szx',
    name: '深圳宝安国际机场',
    shortName: '深圳宝安机场',
    code: 'SZX / ZGSZ',
    city: '深圳',
    province: '广东省',
    lng: 113.8107,
    lat: 22.6393,
    elevation: 4,
    baseTemp: 29,
    baseCloud: 65,
    baseWind: 3.8,
    baseRain: 3.2,
  },
];

export type WeatherMetricType = 'temp' | 'cloud' | 'wind' | 'rain';

interface HourlyDataPoint {
  hour: number;
  timeLabel: string;
  temp: number; // ℃
  cloud: number; // %
  wind: number; // m/s
  rain: number; // mm
  condition: string;
}

interface WeatherForecastBarProps {
  onClose: () => void;
  onSelectAirport: (airport: AirportWeatherItem) => void;
  selectedAirport?: AirportWeatherItem | null;
}

// 基于今天 2026-09-22 动态生成包含今天的未来 15 天日期
function generateFuture15Days() {
  const baseDate = new Date(2026, 8, 22); // 2026-09-22
  const days: { dateStr: string; label: string; weekday: string; isToday: boolean }[] = [];
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  for (let i = 0; i < 15; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const weekday = weekNames[d.getDay()];
    const label = i === 0 ? `今天 (${mm}/${dd})` : i === 1 ? `明天 (${mm}/${dd})` : `${mm}/${dd} ${weekday}`;
    days.push({ dateStr, label, weekday, isToday: i === 0 });
  }
  return days;
}

// 确定性生成所选机场与日期的 24 小时逐小时气象数据
function generateHourlyForecast(airport: AirportWeatherItem, dateStr: string): HourlyDataPoint[] {
  const dayOffset = (new Date(dateStr).getTime() - new Date('2026-09-22').getTime()) / (1000 * 3600 * 24);
  const airportSeed = (airport.lng * 10 + airport.lat * 5 + dayOffset * 7) % 100;

  const points: HourlyDataPoint[] = [];

  for (let h = 0; h < 24; h++) {
    // 昼夜温差拟合：14:00~15:00 最高，05:00~06:00 最低
    const diurnalCurve = Math.sin(((h - 8) / 24) * Math.PI * 2);
    const dayVariation = (airportSeed % 5) - 2;
    const temp = Math.round((airport.baseTemp + diurnalCurve * 6.5 + dayVariation + Math.sin(h * 1.5) * 0.4) * 10) / 10;

    // 云量拟合 (%)
    const cloudRaw = airport.baseCloud + Math.sin((h + dayOffset * 2) * 0.6) * 25 + ((airportSeed + h * 3) % 15);
    const cloud = Math.max(0, Math.min(100, Math.round(cloudRaw)));

    // 10米风速 (m/s)
    const windRaw = airport.baseWind + Math.cos((h - 12) * 0.4) * 1.8 + Math.sin(h * 0.8) * 0.6;
    const wind = Math.max(0.4, Math.round(windRaw * 10) / 10);

    // 降雨 (mm)
    let rain = 0;
    if (cloud > 65 && airport.baseRain > 0.5) {
      const rainRaw = (Math.sin((h - 10) * 0.8) + 1) * 0.5 * (airport.baseRain * 1.4);
      rain = Math.max(0, Math.round(rainRaw * 10) / 10);
    }

    // 天气状况
    let condition = '晴朗';
    if (rain > 3.0) condition = '中雨';
    else if (rain > 0.1) condition = '小雨';
    else if (cloud > 75) condition = '阴天';
    else if (cloud > 30) condition = '多云';

    points.push({
      hour: h,
      timeLabel: `${String(h).padStart(2, '0')}:00`,
      temp,
      cloud,
      wind,
      rain,
      condition,
    });
  }

  return points;
}

export const WeatherForecastBar: React.FC<WeatherForecastBarProps> = ({
  onClose,
  onSelectAirport,
  selectedAirport: propSelectedAirport,
}) => {
  const futureDays = useMemo(() => generateFuture15Days(), []);
  const [selectedDate, setSelectedDate] = useState<string>(futureDays[0].dateStr);

  // 默认新疆乌鲁木齐机场
  const [selectedAirport, setSelectedAirport] = useState<AirportWeatherItem>(
    propSelectedAirport || AIRPORT_WEATHER_LIST[0]
  );

  useEffect(() => {
    if (propSelectedAirport) {
      setSelectedAirport(propSelectedAirport);
    }
  }, [propSelectedAirport]);

  const [activeMetric, setActiveMetric] = useState<WeatherMetricType>('temp');
  const [isAirportOpen, setIsAirportOpen] = useState<boolean>(false);
  const [isDateOpen, setIsDateOpen] = useState<boolean>(false);
  const [airportSearch, setAirportSearch] = useState<string>('');

  const [hoveredHour, setHoveredHour] = useState<HourlyDataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const barContainerRef = useRef<HTMLDivElement>(null);

  const airportDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (airportDropdownRef.current && !airportDropdownRef.current.contains(e.target as Node)) {
        setIsAirportOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setIsDateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 逐小时气象数据
  const hourlyData = useMemo(() => {
    return generateHourlyForecast(selectedAirport, selectedDate);
  }, [selectedAirport, selectedDate]);

  // 计算当前指标极值与均值
  const metricStats = useMemo(() => {
    const values = hourlyData.map((d) => d[activeMetric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    return { min, max, avg };
  }, [hourlyData, activeMetric]);

  const filteredAirports = useMemo(() => {
    const q = airportSearch.trim().toLowerCase();
    if (!q) return AIRPORT_WEATHER_LIST;
    return AIRPORT_WEATHER_LIST.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q)
    );
  }, [airportSearch]);

  const handleAirportChange = (airport: AirportWeatherItem) => {
    setSelectedAirport(airport);
    setIsAirportOpen(false);
    onSelectAirport(airport);
  };

  const metricTabs: { key: WeatherMetricType; label: string; unit: string; icon: any }[] = [
    { key: 'temp', label: '温度 2t', unit: '℃', icon: Thermometer },
    { key: 'cloud', label: '云量', unit: '%', icon: Cloud },
    { key: 'wind', label: '10米风速', unit: 'm/s', icon: Wind },
    { key: 'rain', label: '降雨', unit: 'mm', icon: CloudRain },
  ];

  // 渲染单小时的天气图标
  const getWeatherIcon = (d: HourlyDataPoint) => {
    if (d.rain > 3.0) return <CloudLightning className="w-3.5 h-3.5 text-amber-300" />;
    if (d.rain > 0) return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
    if (d.cloud > 75) return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
    if (d.cloud > 30) return <CloudSun className="w-3.5 h-3.5 text-sky-300" />;
    return <Sun className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <div
      ref={barContainerRef}
      id="weather-forecast-dashboard-bar"
      className="absolute bottom-3 sm:bottom-4 left-3 sm:left-6 md:left-12 lg:left-16 right-3 sm:right-6 md:right-12 lg:right-16 z-40 rounded-2xl bg-slate-950/45 border border-white/15 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(56,189,248,0.08)] animate-fadeIn text-white font-sans select-none pointer-events-auto"
    >
      {/* 独立绝对定位的关闭按钮：始终锁死在卡片最右上角，无论内部如何折行绝不溢出或错位 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer bg-black/30 border border-white/10"
        title="关闭天气看板"
      >
        <X className="w-4 h-4" />
      </button>

      {/* 顶部控制栏：右侧预留 pr-10 绝不与关闭按钮冲突；小屏或狭窄空间下自动整洁排成两行，宽屏单行展开 */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 pl-3 sm:pl-4 pr-11 sm:pr-12 py-2.5 border-b border-white/10 bg-white/[0.04]">
        {/* 第一组（左侧）：模块标题与地区、日期筛选 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide shrink-0">
            <span className="hidden sm:inline whitespace-nowrap">在轨短临气象预报</span>
            <span className="sm:hidden whitespace-nowrap">气象预报</span>
          </div>

          {/* 地区（机场）下拉筛选 */}
          <div className="relative shrink-0" ref={airportDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsAirportOpen(!isAirportOpen);
                setIsDateOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-sky-400/60 text-xs font-semibold transition-all cursor-pointer text-slate-200 shrink-0"
              title="切换机场并定位"
            >
              <Plane className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="whitespace-nowrap">{selectedAirport.shortName}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isAirportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAirportOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 sm:w-72 max-h-64 rounded-xl bg-[#0c101c]/95 border border-white/15 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden flex flex-col animate-fadeIn">
                <div className="p-2 border-b border-white/10 bg-white/5">
                  <input
                    value={airportSearch}
                    onChange={(e) => setAirportSearch(e.target.value)}
                    placeholder="搜索机场或城市..."
                    className="w-full px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 outline-none focus:border-sky-400"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto max-h-52 divide-y divide-white/[0.06] custom-scrollbar">
                  {filteredAirports.map((airport) => {
                    const isSelected = selectedAirport.id === airport.id;
                    return (
                      <button
                        key={airport.id}
                        type="button"
                        onClick={() => handleAirportChange(airport)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isSelected ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-slate-100 font-medium">{airport.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{airport.city}</span>
                            <span>·</span>
                            <span className="text-sky-400/90">{airport.code}</span>
                          </div>
                        </div>
                        {isSelected && <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 日期筛选（15天） */}
          <div className="relative shrink-0" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsDateOpen(!isDateOpen);
                setIsAirportOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-sky-400/60 text-xs font-semibold transition-all cursor-pointer text-slate-200 shrink-0"
            >
              <Calendar className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="whitespace-nowrap">
                {futureDays.find((d) => d.dateStr === selectedDate)?.label || selectedDate}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDateOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-48 max-h-60 rounded-xl bg-[#0c101c]/95 border border-white/15 shadow-2xl backdrop-blur-2xl z-50 overflow-y-auto divide-y divide-white/[0.06] animate-fadeIn custom-scrollbar">
                {futureDays.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setIsDateOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{d.label}</span>
                      {d.isToday && (
                        <span className="text-[9px] px-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">今日</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 第二组（右侧/第二行）：指标切换胶囊栏（空间不足时自动换到第二行，绝不溢出容器） */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
          {metricTabs.map((tab) => {
            const active = activeMetric === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveMetric(tab.key)}
                title={`${tab.label} (${tab.unit})`}
                className={`flex items-center gap-1 px-2 py-1 sm:py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                  active
                    ? tab.key === 'temp'
                      ? 'bg-gradient-to-r from-amber-500/30 to-rose-500/30 text-amber-200 border border-amber-400/40 shadow-sm'
                      : tab.key === 'cloud'
                      ? 'bg-gradient-to-r from-sky-500/30 to-blue-500/30 text-sky-200 border border-sky-400/40 shadow-sm'
                      : tab.key === 'wind'
                      ? 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 text-teal-200 border border-teal-400/40 shadow-sm'
                      : 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 text-blue-200 border border-blue-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline whitespace-nowrap">{tab.label}</span>
                <span className="hidden 2xl:inline text-[9px] opacity-75 font-mono">({tab.unit})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 逐小时数据网格展示区：小屏保持每小时单元固定最小宽度不挤压，支持鼠标滚轮与横向滑动 */}
      <div
        className="p-2 sm:p-3 overflow-x-auto custom-scrollbar"
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            const el = e.currentTarget;
            if (el.scrollWidth > el.clientWidth) {
              el.scrollLeft += e.deltaY;
            }
          }
        }}
        onScroll={() => {
          if (hoveredHour) {
            setHoveredHour(null);
            setHoverPos(null);
          }
        }}
      >
        {/* 24 小时逐小时数据水平条：采用 flex 布局，小屏单格不压缩（保持 min-w），大屏均分自适应撑满 */}
        <div className="flex w-max min-w-full divide-x divide-white/10">
          {hourlyData.map((d) => {
            const val = d[activeMetric];

            // 依据指标计算百分比高度或强度
            let ratio = 0.5;
            if (activeMetric === 'temp') {
              ratio = Math.max(0.15, Math.min(1, (val - 5) / 30));
            } else if (activeMetric === 'cloud') {
              ratio = Math.max(0.1, val / 100);
            } else if (activeMetric === 'wind') {
              ratio = Math.max(0.1, val / 10);
            } else if (activeMetric === 'rain') {
              ratio = val === 0 ? 0.08 : Math.max(0.2, Math.min(1, val / 8));
            }

            return (
              <div
                key={d.hour}
                onMouseEnter={(e) => {
                  if (barContainerRef.current) {
                    const parentRect = barContainerRef.current.getBoundingClientRect();
                    const itemRect = e.currentTarget.getBoundingClientRect();
                    setHoverPos({
                      x: itemRect.left + itemRect.width / 2 - parentRect.left,
                      y: itemRect.top - parentRect.top,
                    });
                    setHoveredHour(d);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredHour(null);
                  setHoverPos(null);
                }}
                className="group relative flex-1 min-w-[56px] sm:min-w-[64px] shrink-0 flex flex-col items-center justify-between py-2 sm:py-2.5 px-1 hover:bg-white/[0.07] transition-colors cursor-default"
              >
                {/* 1. 指标数值 */}
                <div className="text-[10px] 2xl:text-[11px] font-bold text-slate-100 group-hover:text-sky-300 leading-none pt-0.5">
                  {activeMetric === 'temp' && `${val}℃`}
                  {activeMetric === 'cloud' && `${val}%`}
                  {activeMetric === 'wind' && `${val}m/s`}
                  {activeMetric === 'rain' && `${Number(val).toFixed(1)}mm`}
                </div>

                {/* 2. 微缩可视化图形区：降水采用贯穿亮青蓝横线+向下蓝色渐变区块 */}
                {activeMetric === 'rain' ? (
                  <div className="w-full h-8 sm:h-10 my-1 flex flex-col justify-start relative overflow-hidden">
                    {/* 顶部高亮青蓝贯穿横线 */}
                    <div className="w-full h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] z-10 shrink-0" />
                    {/* 向下的冷蓝/青蓝背景渐变色块 */}
                    <div className="w-full flex-1 bg-gradient-to-b from-cyan-500/35 via-blue-600/20 to-transparent" />
                    {/* 若有实际降水量，自底向上叠加升高的饱满降水柱体 */}
                    {val > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600/60 to-cyan-400/50 transition-all duration-300 pointer-events-none"
                        style={{ height: `${Math.min(100, Math.max(15, (val / 8) * 100))}%` }}
                      />
                    )}
                  </div>
                ) : activeMetric === 'temp' ? (
                  <div className="w-1.5 sm:w-2 h-8 sm:h-10 bg-black/40 rounded-full my-1 flex flex-col justify-end overflow-hidden p-[1px]">
                    <div
                      className={`w-full rounded-full transition-all duration-300 ${
                        val >= 22
                          ? 'bg-gradient-to-t from-amber-400 to-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]'
                          : 'bg-gradient-to-t from-sky-400 to-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                      }`}
                      style={{ height: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-1.5 sm:w-2 h-8 sm:h-10 bg-black/40 rounded-full my-1 flex flex-col justify-end overflow-hidden p-[1px]">
                    <div
                      className={`w-full rounded-full transition-all duration-300 ${
                        activeMetric === 'cloud'
                          ? 'bg-gradient-to-t from-slate-400 to-sky-400'
                          : 'bg-gradient-to-t from-cyan-400 to-teal-400'
                      }`}
                      style={{ height: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                )}

                {/* 3. 时间点 (置于最底部) */}
                <span className="text-[10px] 2xl:text-[11px] font-mono text-slate-400 group-hover:text-slate-200 pb-0.5 whitespace-nowrap">
                  {d.hour}:00
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 悬浮提示 Tooltip（挂载在整个看板顶层，避免被标题栏或横向滚动条截断） */}
      {hoveredHour && hoverPos && (
        <div
          style={{
            left: `${hoverPos.x}px`,
            top: `${hoverPos.y - 8}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="absolute pointer-events-none z-50 bg-[#0c101c]/95 border border-sky-400/40 rounded-xl p-2.5 shadow-2xl backdrop-blur-xl min-w-[130px] text-left animate-fadeIn"
        >
          <div className="text-[10px] font-bold text-sky-300 border-b border-white/10 pb-1 mb-1 font-mono">
            {hoveredHour.timeLabel} · {hoveredHour.condition}
          </div>
          <div className="space-y-0.5 text-[9px] text-slate-300 font-mono">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">气温 (2t):</span>
              <span className="font-bold text-amber-300">{hoveredHour.temp} ℃</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">云量:</span>
              <span className="font-bold text-sky-300">{hoveredHour.cloud} %</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">10m风速:</span>
              <span className="font-bold text-teal-300">{hoveredHour.wind} m/s</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">降水:</span>
              <span className="font-bold text-blue-300">{hoveredHour.rain} mm</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
