import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Polygon, useMap } from 'react-leaflet';
import { Polyline } from 'react-leaflet';
import { CesiumGlobe } from './earthDemo/CesiumGlobe';
import { PointMindMapOverlay } from './earthDemo/PointMindMapOverlay';
import { HistoryDataDrawer } from './earthDemo/HistoryDataDrawer';
import { RecordDetailModal } from './earthDemo/RecordDetailModal';
import { DataTypeCategory, HistoryRecord } from '../types/earthDemoTypes';
import { 
  EARTH_OBJECTS, 
  EarthObject, 
  SPATIAL_MARKER_POINTS, 
  SpatialMarkerPoint, 
  smoothClosedRing,
  SATELLITE_CONSTELLATION_ITEMS,
  ConstellationSatelliteItem,
} from '../data/mockRemoteSensingData';
import * as satellite from 'satellite.js';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Layers, 
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Flame, 
  X, 
  Filter, 
  Search, 
  Globe, 
  Globe2,
  Box,
  MapPin,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  Activity,
  Calendar,
  FileText,
  Bot,
  Check,
  RotateCw,
  BarChart3,
  Compass,
  Sun,
  Moon,
  Radio,
  Database,
  Cpu,
  Menu,
  Satellite as SatelliteIcon
} from 'lucide-react';
import { INITIAL_SATELLITES } from '../data/satelliteData';
import { InnovativeAppItem, FlowStepItem, Satellite } from '../types';
import { locations, stats, Location, FireStatus } from '../data/fireDashboardData';
import fireLwirPreviewImg from '../assets/3D_1788272998_LWIR_full_preview.jpg';
import { FlowStepsTimeline } from './FlowStepsTimeline';

interface InnovativeAppViewProps {
  onBackToPlanning: () => void;
  onLaunchApp?: (appName: string) => void;
  customApps?: InnovativeAppItem[];
  selectedApp?: InnovativeAppItem | null;
  onSelectApp?: (app: InnovativeAppItem | null) => void;
  viewMode?: 'split' | 'kanban' | 'chat';
  satellites?: Satellite[];
}

type StatusFilter = 'all' | 'fire' | 'safe';

// ── 2D 空间要素标绘 Marker (与 3D 保持一致：红色火点与琥珀棕古建筑) ───
const _spatialIconCache: Record<string, L.DivIcon> = {};

function createSpatialPointIcon(type: 'fire' | 'building', isSelected: boolean) {
  const key = `${type}-${isSelected}`;
  if (_spatialIconCache[key]) return _spatialIconCache[key];

  const isFire = type === 'fire';
  const innerSize = 10;
  const size = innerSize + 14; // 图标容器尺寸恒定不变，选中态仅通过阴影叠加光圈，不改变任何元素尺寸
  const bgColor = isFire ? '#dc2626' : '#8b4513';
  const ringColor = isFire ? 'rgba(239, 68, 68, 0.55)' : 'rgba(217, 119, 6, 0.55)';
  const shadowColor = isFire ? 'rgba(239, 68, 68, 0.85)' : 'rgba(217, 119, 6, 0.85)';

  const html = `
    <div style="
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      position:relative;
      cursor:pointer;
    ">
      <div style="
        position:absolute;
        width:${innerSize}px;height:${innerSize}px;
        border-radius:50%;
        background:${bgColor};
        border:2px solid #ffffff;
        box-shadow:${isSelected ? `0 0 0 4px ${ringColor}, 0 0 12px ${shadowColor}` : `0 0 6px ${shadowColor}`};
      "></div>
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
  _spatialIconCache[key] = icon;
  return icon;
}

// ── 自定义 Leaflet 地标 Marker 图标 ─────────────────────────────────────────
const _iconCache: Record<string, L.DivIcon> = {};

function createMarkerIcon(status: 'fire' | 'safe', isSelected: boolean) {
  const key = `${status}-${isSelected}`;
  if (_iconCache[key]) return _iconCache[key];

  const isFire = status === 'fire';
  const outer = isSelected ? 28 : 20;
  const ring = isSelected ? 24 : 16;
  const dot = isSelected ? 10 : 7;

  const html = `
    <div style="
      width:${outer}px;height:${outer}px;
      display:flex;align-items:center;justify-content:center;
      position:relative;
      cursor:pointer;
    ">
      <div style="
        position:absolute;
        width:${ring}px;height:${ring}px;
        border-radius:50%;
        border:2.5px solid ${isFire ? '#ff3c3c' : '#22c55e'};
        background:${isFire ? 'rgba(255,60,60,0.22)' : 'rgba(34,197,94,0.18)'};
        box-shadow:0 0 ${isSelected ? 16 : 8}px ${isFire ? 'rgba(255,60,60,0.85)' : 'rgba(34,197,94,0.75)'};
      "></div>
      <div style="
        position:absolute;
        width:${dot}px;height:${dot}px;
        border-radius:50%;
        background:${isFire ? '#ff3c3c' : '#22c55e'};
        box-shadow:0 0 ${isSelected ? 12 : 6}px ${isFire ? '#ff3c3c' : '#22c55e'};
      "></div>
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: '',
    iconSize: [outer, outer],
    iconAnchor: [outer / 2, outer / 2],
    popupAnchor: [0, -(outer / 2 + 4)],
  });
  _iconCache[key] = icon;
  return icon;
}

// ── 每日任务执行完毕时联动地图的红点闪烁标记（一次性动画，用后即焚） ───────────
let _pulseIcon: L.DivIcon | null = null;
function createPulseIcon() {
  if (_pulseIcon) return _pulseIcon;
  const html = `
    <div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(244,63,94,0.55);animation:mapPulseRing 1.1s ease-out infinite;"></div>
      <div style="position:absolute;width:9px;height:9px;border-radius:50%;background:#f43f5e;box-shadow:0 0 8px #f43f5e;"></div>
    </div>
  `;
  _pulseIcon = L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
  return _pulseIcon;
}

// ── 卫星扫幅覆盖多边形顶点计算 ────────────────────────────────────────────────
function footprintCorners(
  lat: number,
  lng: number,
  areaKm2: number,
  rotDeg: number,
  ratio = 1.35
): [number, number][] {
  const side = Math.sqrt(areaKm2);
  const halfH = (side * ratio * 0.5) / 111;
  const halfW = (side * 0.5) / (111 * Math.cos((lat * Math.PI) / 180));
  const r = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return (
    [
      [-halfW, -halfH],
      [halfW, -halfH],
      [halfW, halfH],
      [-halfW, halfH],
    ] as [number, number][]
  ).map(([dx, dy]) => [lat + dx * cos - dy * sin, lng + dx * sin + dy * cos]);
}

// ── 地图飞到指定坐标控制器 ──────────────────────────────────────────────────
function MapFlyTo({ 
  location, 
  targetPoint,
  resetTrigger, 
  resetNorthTrigger,
  onResetDone 
}: { 
  location: Location | null; 
  targetPoint: SpatialMarkerPoint | null;
  resetTrigger: number; 
  resetNorthTrigger?: number;
  onResetDone: () => void 
}) {
  const map = useMap();

  useEffect(() => {
    if (targetPoint) {
      map.flyTo([targetPoint.lat, targetPoint.lng], targetPoint.type === 'fire' ? 14.5 : 16, { duration: 1.2 });
    } else if (location) {
      map.flyTo([location.lat, location.lng], 5, { duration: 1.2 });
    }
  }, [location, targetPoint, map]);

  useEffect(() => {
    if (resetTrigger > 0) {
      // 全球世界地图全景视角
      map.flyTo([20, 15], 2.5, { duration: 1.2 });
      onResetDone();
    }
  }, [resetTrigger, map, onResetDone]);

  useEffect(() => {
    if (resetNorthTrigger && resetNorthTrigger > 0) {
      // 聚焦至监测核心重点目标区域
      map.flyTo([27.9536, 109.6015], 14, { duration: 1.0 });
    }
  }, [resetNorthTrigger, map]);

  return null;
}

// ── 地图缩放与 Resize 监听器 ──────────────────────────────────────────────
function MapZoomObserver({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();

  useEffect(() => {
    // 挂载后多次触发 invalidateSize，确保容器动画和 DOM 稳定后瓦片铺满不留空白
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 50);
    const timer2 = setTimeout(() => map.invalidateSize(), 250);
    const timer3 = setTimeout(() => map.invalidateSize(), 500);

    const handleZoom = () => onZoomChange(map.getZoom());
    map.on('zoomend', handleZoom);

    // 监听 ResizeObserver，确保 MapContainer 尺寸变化（如侧边栏展开/收起、分栏拖拽）时地图自适应 invalidateSize
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      map.off('zoomend', handleZoom);
      resizeObserver.disconnect();
    };
  }, [map, onZoomChange]);

  return null;
}

// ── 2D 地图点位屏幕像素坐标实时追踪器（同步思维导图锚定连线） ───────────────
function MapPointScreenTracker({
  selectedPoint,
  onScreenPositionChange,
}: {
  selectedPoint: SpatialMarkerPoint | null;
  onScreenPositionChange: (pos: { x: number; y: number } | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPoint) {
      onScreenPositionChange(null);
      return;
    }

    const updatePos = () => {
      try {
        // PointMindMapOverlay 与地图容器共享同一父级坐标系，直接使用容器内坐标即可对齐，无需再叠加视口偏移
        const pt = map.latLngToContainerPoint([selectedPoint.lat, selectedPoint.lng]);
        onScreenPositionChange({
          x: pt.x,
          y: pt.y,
        });
      } catch (err) {
        onScreenPositionChange(null);
      }
    };

    updatePos();
    map.on('move', updatePos);
    map.on('zoom', updatePos);
    map.on('viewreset', updatePos);

    return () => {
      map.off('move', updatePos);
      map.off('zoom', updatePos);
      map.off('viewreset', updatePos);
    };
  }, [map, selectedPoint, onScreenPositionChange]);

  return null;
}

// ── 2D 卫星地图 Marker 图标生成 (支持全星座 12 颗计算星 + SCS-04-16，与 3D 视觉和高亮完全一致) ──
const _satelliteIconCache: Record<string, L.DivIcon> = {};

function createSatelliteConstellationIcon(sat: ConstellationSatelliteItem, isSelected: boolean) {
  const cacheKey = `${sat.id}-${isSelected ? 'sel' : 'norm'}`;
  if (_satelliteIconCache[cacheKey]) return _satelliteIconCache[cacheKey];

  const isMain = sat.id === 'scs-04-16';
  const mainColor = isSelected ? '#38bdf8' : (isMain ? '#38bdf8' : '#0ea5e9');
  const glowColor = isSelected ? 'rgba(56,189,248,0.7)' : (isMain ? 'rgba(56,189,248,0.45)' : 'rgba(14,165,233,0.3)');
  const borderStyle = isSelected ? '2px solid #38bdf8' : '1.5px solid rgba(56,189,248,0.7)';
  const bgStyle = isSelected ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.85)';
  const size = isSelected ? 36 : (isMain ? 32 : 28);
  const iconBoxSize = isSelected ? 26 : (isMain ? 22 : 20);

  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      ${isSelected || isMain ? `<div style="position:absolute;width:${size - 4}px;height:${size - 4}px;border-radius:50%;background:${glowColor};filter:blur(3px);animation:pulse 2s infinite;"></div>` : ''}
      <div style="position:absolute;width:${iconBoxSize}px;height:${iconBoxSize}px;border-radius:7px;background:${bgStyle};border:${borderStyle};display:flex;align-items:center;justify-content:center;box-shadow:0 0 ${isSelected ? 12 : 6}px ${glowColor};transition:all 0.2s;">
        <svg xmlns="http://www.w3.org/2000/svg" width="${iconBoxSize - 10}" height="${iconBoxSize - 10}" viewBox="0 0 24 24" fill="none" stroke="${mainColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 7 9 3 5 7l4 4"/>
          <path d="m17 11 4 4-4 4-4-4"/>
          <path d="m8 12 4 4 6-6-4-4Z"/>
          <path d="m16 8 3-3"/>
          <path d="M9 21a6 6 0 0 0-6-6"/>
        </svg>
      </div>
      ${isSelected || isMain ? `
      <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:1px 5px;border-radius:4px;background:rgba(15,23,42,0.9);border:1px solid ${isSelected ? '#38bdf8' : 'rgba(56,189,248,0.4)'};color:${isSelected ? '#38bdf8' : '#e0f2fe'};font-size:10px;font-weight:bold;font-family:monospace;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,0.5);">
        ${sat.code}
      </div>` : ''}
    </div>
  `;

  const divIcon = L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  _satelliteIconCache[cacheKey] = divIcon;
  return divIcon;
}

// 依据真实 SGP4 轨道动力学模型计算单个卫星在当前瞬间参考系下的 2D 投影折线段
function calculateSatelliteGroundTrack(satItem: ConstellationSatelliteItem, currentTime = new Date()): [number, number][][] {
  try {
    const satrec = satellite.twoline2satrec(satItem.line1, satItem.line2);
    if (satrec.error) return [];
    const meanMotionRevPerDay = satrec.no * (1440 / (2 * Math.PI));
    const orbitalPeriodMinutes = 1440 / meanMotionRevPerDay;
    const sampleCount = 240;
    const gmst = satellite.gstime(currentTime);

    const segments: [number, number][][] = [];
    let currentSegment: [number, number][] = [];
    let prevLng: number | null = null;

    for (let i = 0; i <= sampleCount; i++) {
      const t = new Date(currentTime.getTime() + (i / sampleCount) * orbitalPeriodMinutes * 60000);
      const pv = satellite.propagate(satrec, t);
      if (!pv.position || typeof pv.position === 'boolean') continue;
      const geodetic = satellite.eciToGeodetic(pv.position, gmst);
      const lng = satellite.degreesLong(geodetic.longitude);
      const lat = satellite.degreesLat(geodetic.latitude);

      // 跨越 +/- 180° 日界线时断开航带折线，避免横穿整张地图的拉线伪影
      if (prevLng !== null && Math.abs(lng - prevLng) > 180) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }

      currentSegment.push([lat, lng]);
      prevLng = lng;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  } catch (err) {
    console.error('Error calculating satellite ground track:', err);
    return [];
  }
}

// 依据实时时钟计算任意卫星当前惯性坐标星位经纬度
function getSatelliteCurrentPosition(satItem: ConstellationSatelliteItem, currentTime = new Date()): { lat: number; lng: number } | null {
  try {
    const satrec = satellite.twoline2satrec(satItem.line1, satItem.line2);
    if (satrec.error) return null;
    const pv = satellite.propagate(satrec, currentTime);
    if (pv.position && typeof pv.position !== 'boolean') {
      const gmst = satellite.gstime(currentTime);
      const geodetic = satellite.eciToGeodetic(pv.position, gmst);
      return {
        lat: satellite.degreesLat(geodetic.latitude),
        lng: satellite.degreesLong(geodetic.longitude),
      };
    }
  } catch (err) {
    console.error('Error computing satellite position:', err);
  }
  return null;
}

// ── 遥感图文详情弹窗组件 ───────────────────────────────────────────────────
interface DetailModalProps {
  location: Location;
  onClose: () => void;
  initialIndex?: number;
}

const intensityConfig = {
  low: { label: '低度', color: '#f59e0b' },
  medium: { label: '中度', color: '#f97316' },
  high: { label: '高度', color: '#ef4444' },
  extreme: { label: '极端', color: '#dc2626' },
};

function DetailModal({ location, onClose, initialIndex = 0 }: DetailModalProps) {
  const [idx] = useState(initialIndex);

  const isFire = location.status === 'fire';
  const intensity = location.fireIntensity && intensityConfig[location.fireIntensity];
  const slide = location.images[idx];

  const coordStr = `${Math.abs(slide.lat).toFixed(2)}°${slide.lat >= 0 ? 'N' : 'S'}, ${Math.abs(slide.lng).toFixed(2)}°${slide.lng >= 0 ? 'E' : 'W'}`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md sm:max-w-3xl max-h-[92vh] bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-y-auto flex flex-col transition-all"
      >
        {/* 1. Header 顶栏 */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#111728]/80 shrink-0 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                isFire ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
              }`}
            />
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                {location.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {location.country} · {coordStr}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. 左图右文版式：左侧图片，右侧统计指标 + 一句话描述 */}
        <div className="flex flex-col sm:flex-row sm:flex-1 sm:min-h-0">
          <div className="relative sm:w-2/5 shrink-0 aspect-square bg-slate-950 overflow-hidden group border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-white/[0.06]">
            <img
              src={fireLwirPreviewImg}
              alt={slide.caption}
              className="w-full h-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
            />
            {/* Scanline grid overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.12)_3px,rgba(0,0,0,0.12)_4px)]" />

            {/* Caption banner */}
            <div className="absolute bottom-0 left-0 right-0 p-3.5 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent">
              <span className="text-xs font-mono font-medium text-slate-200 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{slide.caption}</span>
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 sm:overflow-y-auto">
            {/* 3. 统计指标卡片：拍摄时间、地点、经度、纬度、土地类型、火情状态、火情面积 */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06]">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#121828] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">拍摄时间</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {slide.captureTime}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#121828] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">地点</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {location.name}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#121828] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">经度</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-mono">
                  {slide.lng.toFixed(2)}°
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#121828] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">纬度</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-mono">
                  {slide.lat.toFixed(2)}°
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#121828] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">土地类型</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {slide.landType}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#121828] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">火情状态</span>
                <span className={`text-xs font-bold ${isFire ? 'text-rose-500' : 'text-emerald-500'} truncate`}>
                  {isFire ? (intensity ? `有火情 (${intensity.label})` : '有火情') : '未发现火点'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#121828] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono">火情面积</span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 truncate">
                  {isFire && location.affectedArea ? `${location.affectedArea.toLocaleString()} km²` : '—'}
                </span>
              </div>
            </div>

            {/* 4. 一句话描述 */}
            <div className="p-5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 font-mono">
                <Activity className="w-3.5 h-3.5" />
                <span>一句话描述</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {slide.analysis}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 影像覆盖记录列表面板：点击地图覆盖区域后从底部拉出，支持按拍摄时间排序与分页 ────────────
interface ImageListPanelProps {
  location: Location;
  onClose: () => void;
  onSelectImage: (index: number) => void;
}

const IMAGE_LIST_PAGE_SIZE_OPTIONS = [5, 10, 20];

function ImageListPanel({ location, onClose, onSelectImage }: ImageListPanelProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(IMAGE_LIST_PAGE_SIZE_OPTIONS[0]);

  // 切换地点时恢复默认分页设置，避免沿用上一个地点的每页条数选择
  useEffect(() => {
    setPage(1);
    setPageSize(IMAGE_LIST_PAGE_SIZE_OPTIONS[0]);
  }, [location]);

  const sortedImages = useMemo(() => {
    const withIndex = location.images.map((img, index) => ({ img, index }));
    withIndex.sort((a, b) =>
      sortOrder === 'asc'
        ? a.img.captureTime.localeCompare(b.img.captureTime)
        : b.img.captureTime.localeCompare(a.img.captureTime)
    );
    return withIndex;
  }, [location, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedImages.length / pageSize));
  const pagedImages = sortedImages.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 animate-fadeIn flex justify-center">
      <div className="mx-3 mb-3 w-full max-w-2xl rounded-2xl bg-[#0c101c]/55 border border-white/[0.08] shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${location.status === 'fire' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {location.name} · 影像覆盖记录（{location.images.length}）
            </h4>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-400">
                <th
                  className="px-3 py-2 text-left font-semibold cursor-pointer select-none"
                  onClick={() => { setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); setPage(1); }}
                >
                  <span className="inline-flex items-center gap-1">
                    拍摄时间
                    {sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </span>
                </th>
                <th className="px-3 py-2 text-left font-semibold">地点</th>
                <th className="px-3 py-2 text-left font-semibold">经度</th>
                <th className="px-3 py-2 text-left font-semibold">纬度</th>
                <th className="px-3 py-2 text-left font-semibold">土地类型</th>
              </tr>
            </thead>
            <tbody>
              {pagedImages.map(({ img, index }) => (
                <tr
                  key={index}
                  onClick={() => onSelectImage(index)}
                  className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-slate-300">{img.captureTime}</td>
                  <td className="px-3 py-2 text-slate-300">{location.name}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{img.lng.toFixed(2)}°</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{img.lat.toFixed(2)}°</td>
                  <td className="px-3 py-2 text-slate-300">{img.landType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页器：与健康管理看板保持一致的紧凑样式（每页条数选择 + 上一页/下一页 + 页码提示） */}
        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              共 <span className="font-mono">{sortedImages.length}</span> 条 · <span className="font-mono">{page}</span>/<span className="font-mono">{totalPages}</span>
            </span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              aria-label="每页条数"
              className="text-[11px] text-slate-400 bg-transparent border border-white/[0.1] rounded px-1 py-0.5 outline-none hover:border-sky-400 cursor-pointer transition-colors"
            >
              {IMAGE_LIST_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} className="bg-[#0c101c]">
                  {size} 条/页
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="上一页"
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="下一页"
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 侧边栏地点搜索下拉框 ───────────────────────────────────────────────────────
function LocationSearch({
  locations,
  selectedLocation,
  onSelectLocation,
}: {
  locations: Location[];
  selectedLocation: string | null;
  onSelectLocation: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLoc = locations.find((l) => l.id === selectedLocation);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q)
    );
  }, [query, locations]);

  const updateCoords = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 下拉面板通过 Portal 挂载到 body，需在展开期间持续跟随触发按钮位置（滚动/窗口变化）
  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handle = () => updateCoords();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [open]);

  function handleOpen() {
    updateCoords();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-sky-400/50 transition-all cursor-pointer text-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedLoc ? (
            <>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  selectedLoc.status === 'fire' ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                }`}
              />
              <span className="truncate font-semibold text-slate-200">
                {selectedLoc.name}
              </span>
            </>
          ) : (
            <span className="text-slate-400">全部拍摄地点</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
          className="rounded-xl bg-[#0c101c]/95 border border-sky-500/30 shadow-2xl overflow-hidden z-[1000] animate-fadeIn backdrop-blur-2xl"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0 bg-white/5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索地点或国家..."
              className="flex-1 bg-transparent outline-none text-xs text-slate-200 placeholder:text-slate-400 font-sans"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-200">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-48 sm:max-h-56 overflow-y-auto divide-y divide-white/[0.06]">
            <button
              onClick={() => {
                onSelectLocation(null);
                setOpen(false);
                setQuery('');
              }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                !selectedLocation
                  ? 'bg-sky-500/15 text-sky-400 font-bold'
                  : 'text-slate-300 hover:bg-white/[0.05]'
              }`}
            >
              全部地点
            </button>

            {results.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">无匹配地点</div>
            ) : (
              results.map((loc) => {
                const active = selectedLocation === loc.id;
                const isFire = loc.status === 'fire';
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      onSelectLocation(loc.id);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      active
                        ? isFire
                          ? 'bg-rose-500/15 text-rose-400 font-bold'
                          : 'bg-emerald-500/15 text-emerald-400 font-bold'
                        : 'text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isFire ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="truncate flex-1">{loc.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">{loc.country}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── 执行周期筛选下拉框 ───────────────────────────────────────────────────────
interface PeriodOption {
  value: string;
  label: string;
}

function PeriodSelect({
  options,
  selected,
  onSelect,
}: {
  options: PeriodOption[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selectedOption = options.find((o) => o.value === selected);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] hover:border-sky-400 dark:hover:border-sky-400/50 transition-all cursor-pointer text-xs"
      >
        <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
          {selectedOption?.label ?? '全部周期'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200 dark:border-sky-500/30 shadow-2xl overflow-hidden z-50 animate-fadeIn backdrop-blur-2xl max-h-48 sm:max-h-56 overflow-y-auto divide-y divide-slate-100/60 dark:divide-white/[0.04]">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                selected === opt.value
                  ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 数字滚动动画：数值变化时从旧值平滑滚动过渡到新值 ───────────────────────────
function AnimatedNumber({ value, formatter }: { value: number; formatter?: (n: number) => string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    if (startValue === endValue) return;

    const duration = 700;
    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (endValue - startValue) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = endValue;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{formatter ? formatter(displayValue) : displayValue}</>;
}

// ── 折叠式子模块容器：监控卡内部各模块共用的可收起分区 ─────────────────────────
function MonitorSection({
  label,
  badge,
  open,
  onToggle,
  children,
}: {
  label: string;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-white/[0.08] first:border-t-0">
      <button
        onClick={onToggle}
        className="group w-full flex items-center justify-between px-3 py-2.5 2xl:px-3.5 2xl:py-3 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer text-left select-none"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-1 h-3 rounded-full transition-all duration-200 ${open ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]' : 'bg-transparent group-hover:bg-white/20'}`} />
          <span className="text-[12px] 2xl:text-[13px] font-semibold text-slate-200 group-hover:text-white tracking-wide transition-colors truncate">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {badge}
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5 transition-all">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-0 text-sky-400' : '-rotate-90'}`} />
          </div>
        </div>
      </button>
      {open && <div className="px-3 pb-3 2xl:px-3.5 2xl:pb-3.5 space-y-1.5 2xl:space-y-2 animate-fadeIn">{children}</div>}
    </div>
  );
}

// ── 监控卡：整合空间要素筛选、统计总量、地点筛选、当前任务/进度同步四大模块，整体与分模块均可收起 ──
interface MonitorCardProps {
  title: string;
  status: '未开始' | '进行中' | '已结束';
  capturedRegions: number;
  totalPhotos: number;
  firePoints: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  executedDays: number;
  locations: Location[];
  sync: ProgressSyncState | null;
  spatialPoints: SpatialMarkerPoint[];
  showFireSpatial: boolean;
  showBuildingSpatial: boolean;
  onToggleFireSpatial: () => void;
  onToggleBuildingSpatial: () => void;
  selectedSpatialPointId: string | null;
  onSelectSpatialPoint: (point: SpatialMarkerPoint | null) => void;
  monitorActiveTab?: 'spatial' | 'satellite';
  onMonitorTabChange?: (tab: 'spatial' | 'satellite') => void;
}

function MonitorCard({
  title,
  status,
  capturedRegions,
  totalPhotos,
  firePoints,
  startDate,
  endDate,
  totalDays,
  executedDays,
  locations,
  sync,
  spatialPoints,
  showFireSpatial,
  showBuildingSpatial,
  onToggleFireSpatial,
  onToggleBuildingSpatial,
  selectedSpatialPointId,
  onSelectSpatialPoint,
  selectedSatelliteId,
  onSelectSatelliteId,
  monitorActiveTab,
  onMonitorTabChange,
}: MonitorCardProps & { selectedSatelliteId?: string; onSelectSatelliteId?: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState<'spatial' | 'satellite'>('spatial');
  const activeTab = monitorActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: 'spatial' | 'satellite') => {
    setInternalActiveTab(tab);
    onMonitorTabChange?.(tab);
  };

  const [isSpatialCategoryOpen, setIsSpatialCategoryOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isCycleOpen, setIsCycleOpen] = useState(false);

  // 卫星看板内部状态
  const [isSatOpen, setIsSatOpen] = useState(false);
  const [coordOpen, setCoordOpen] = useState(true);
  const [payloadOpen, setPayloadOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(true);
  const [usageOpen, setUsageOpen] = useState(true);

  const satId = selectedSatelliteId || 'scs-04-16';
  const activeSatellite = SATELLITE_DASHBOARD_LIST.find((s) => s.id === satId) ?? SATELLITE_DASHBOARD_LIST[0];

  // 卫星轨道经纬度与高度：基于真实 TLE 实时解算大地坐标系参数（经度、纬度、高度）
  const [orbitPos, setOrbitPos] = useState<{ lng: number; lat: number; height: number }>({
    lng: 0, lat: 0, height: 0,
  });

  useEffect(() => {
    const targetSat = SATELLITE_DASHBOARD_LIST.find((s) => s.id === satId) ?? SATELLITE_DASHBOARD_LIST[0];
    const satrec = satellite.twoline2satrec(targetSat.line1, targetSat.line2);
    const update = () => {
      const now = new Date();
      const pv = satellite.propagate(satrec, now);
      if (pv.position && typeof pv.position !== 'boolean') {
        const gmst = satellite.gstime(now);
        const geodetic = satellite.eciToGeodetic(pv.position, gmst);
        setOrbitPos({
          lng: satellite.degreesLong(geodetic.longitude),
          lat: satellite.degreesLat(geodetic.latitude),
          height: geodetic.height, // 单位 km
        });
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [satId]);

  // 回看过往执行周期：默认只有当前周期，另模拟 2 个已完成的历史周期供筛选
  const cycleOptions = useMemo(() => {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const list: { id: string; label: string; startDate: string; endDate: string; totalDays: number }[] = [
      { id: 'current', label: '当前执行周期', startDate, endDate, totalDays },
    ];
    const anchor = startDate ? new Date(startDate) : new Date();
    if (!Number.isNaN(anchor.getTime())) {
      const cycleLen = totalDays > 0 ? totalDays : 5;
      for (let i = 1; i <= 2; i++) {
        const end = new Date(anchor);
        end.setDate(end.getDate() - cycleLen * i - (i - 1));
        const start = new Date(end);
        start.setDate(start.getDate() - cycleLen + 1);
        list.push({
          id: `past-${i}`,
          label: `历史周期（${fmt(start)} ~ ${fmt(end)}）`,
          startDate: fmt(start),
          endDate: fmt(end),
          totalDays: cycleLen,
        });
      }
    }
    return list;
  }, [startDate, endDate, totalDays]);

  // 面板默认展示：当前有执行中/同步中的任务时默认看当前周期，否则默认回看最近一个历史周期的进度；没有历史周期则保持当前（空状态）
  const [selectedCycleId, setSelectedCycleId] = useState(() => (
    (status === '进行中' || sync) ? 'current' : (cycleOptions[1]?.id ?? 'current')
  ));
  const selectedCycle = cycleOptions.find((c) => c.id === selectedCycleId) ?? cycleOptions[0];
  const isPastCycle = selectedCycleId !== 'current';

  useEffect(() => {
    setSelectedDay(null);
  }, [selectedCycleId]);

  const isRunning = status === '进行中';
  const currentDay = sync?.day ?? null;
  const dayCount = isPastCycle ? selectedCycle.totalDays : Math.max(executedDays, currentDay ?? 0);
  const activeDay = isPastCycle ? (selectedDay ?? selectedCycle.totalDays) : (selectedDay ?? currentDay ?? 1);
  const macroStepIndex = !sync ? -1 : sync.receiving ? 0 : sync.cycleFinished ? 4 : sync.planGenerated ? 2 : 1;
  const stepStatus = (idx: number): ProgressStepStatus => (idx < macroStepIndex ? 'done' : idx === macroStepIndex ? 'current' : 'pending');

  const firePointsCount = spatialPoints.filter((p) => p.type === 'fire').length;
  const buildingPointsCount = spatialPoints.filter((p) => p.type === 'building').length;
  const activeSpatialCategory: 'fire' | 'building' = showFireSpatial ? 'fire' : 'building';

  // 地点搜索面板只展示当前分类下地图上实际存在的点位
  const spatialLocationOptions: Location[] = useMemo(() => spatialPoints
    .filter((p) => p.type === activeSpatialCategory)
    .map((p) => ({
      id: p.id,
      name: p.name,
      country: p.categoryName,
      lat: p.lat,
      lng: p.lng,
      status: p.type === 'fire' ? 'fire' : 'safe',
      capturedAt: '',
      photoCount: 0,
      area: 0,
      images: [],
    } as Location)), [spatialPoints, activeSpatialCategory]);

  // 切换空间要素分类：保证林火/古建筑互斥显示
  const handleSelectSpatialCategory = (category: 'fire' | 'building') => {
    if (category === 'fire') {
      if (!showFireSpatial) onToggleFireSpatial();
      if (showBuildingSpatial) onToggleBuildingSpatial();
    } else {
      if (!showBuildingSpatial) onToggleBuildingSpatial();
      if (showFireSpatial) onToggleFireSpatial();
    }
    setIsSpatialCategoryOpen(false);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-8 h-8 sm:w-9 sm:h-9 2xl:w-10 2xl:h-10 rounded-xl bg-[#0c101c]/80 border border-white/15 flex items-center justify-center text-cyan-300 shadow-2xl backdrop-blur-2xl hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:scale-105 transition-all duration-200 cursor-pointer group"
        title="展开空间要素与卫星数据面板"
      >
        <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
      </button>
    );
  }

  return (
    <div className="w-60 sm:w-64 lg:w-72 2xl:w-80 max-h-[calc(100vh-4.5rem)] sm:max-h-[calc(100vh-5.5rem)] 2xl:max-h-[calc(100vh-6rem)] bg-black/60 border border-white/15 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col text-left select-none animate-fadeIn relative z-30 overflow-hidden">
      {/* Panel Header: 顶栏汉堡包 Tab 切换与折叠按钮 */}
      <div className="p-2 px-2.5 2xl:p-2.5 2xl:px-3 border-b border-white/10 bg-white/5 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl shrink-0">
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg 2xl:rounded-xl bg-black/40 border border-white/10">
          <button
            onClick={() => setActiveTab('spatial')}
            className={`flex items-center gap-1 2xl:gap-1.5 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md 2xl:rounded-lg text-[11px] 2xl:text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'spatial'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Layers className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
            <span>空间要素</span>
          </button>

          <button
            onClick={() => setActiveTab('satellite')}
            className={`flex items-center gap-1 2xl:gap-1.5 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md 2xl:rounded-lg text-[11px] 2xl:text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'satellite'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <SatelliteIcon className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
            <span>卫星数据</span>
          </button>
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="折叠面板"
        >
          <ChevronRight className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
        </button>
      </div>

      <div className="overflow-y-auto">
        {activeTab === 'spatial' ? (
          <div>
            {/* 模块零：空间要素 —— 全球林火巡查 / 古建筑分类下拉筛选 */}
            <div className="p-2.5 2xl:p-3.5 border-t border-white/10 first:border-t-0">
          <div className="relative">
            <button
              onClick={() => setIsSpatialCategoryOpen((v) => !v)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 2xl:px-3 2xl:py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeSpatialCategory === 'fire'
                  ? 'bg-gradient-to-r from-rose-500/18 via-rose-950/20 to-transparent border-rose-500/30'
                  : 'bg-gradient-to-r from-amber-500/18 via-amber-950/20 to-transparent border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-2 2xl:gap-2.5">
                <span
                  className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 border-white shadow-md flex-shrink-0 ${
                    activeSpatialCategory === 'fire' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-[#8b4513] shadow-amber-700/50'
                  }`}
                />
                <span className="text-[11px] 2xl:text-xs font-bold text-white">
                  {activeSpatialCategory === 'fire' ? '全球林火自主巡查' : '古建筑'}
                </span>
                <span className="text-[9px] 2xl:text-[10px] text-slate-400 font-mono">
                  {activeSpatialCategory === 'fire' ? firePointsCount : buildingPointsCount} 处
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-slate-400 transition-transform ${isSpatialCategoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSpatialCategoryOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-10 bg-black/90 border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => handleSelectSpatialCategory('fire')}
                  className={`w-full flex items-center gap-2 2xl:gap-2.5 px-2.5 py-2 2xl:px-3 2xl:py-2.5 text-left text-[11px] 2xl:text-xs font-semibold transition-colors cursor-pointer ${
                    activeSpatialCategory === 'fire' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 rounded-full bg-rose-500 border-2 border-white flex-shrink-0" />
                  <span>林火巡查</span>
                  <span className="ml-auto text-[9px] 2xl:text-[10px] text-slate-500 font-mono">{firePointsCount}</span>
                </button>
                <button
                  onClick={() => handleSelectSpatialCategory('building')}
                  className={`w-full flex items-center gap-2 2xl:gap-2.5 px-2.5 py-2 2xl:px-3 2xl:py-2.5 text-left text-[11px] 2xl:text-xs font-semibold transition-colors cursor-pointer ${
                    activeSpatialCategory === 'building' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 rounded-full bg-[#8b4513] border-2 border-white flex-shrink-0" />
                  <span>古建筑</span>
                  <span className="ml-auto text-[9px] 2xl:text-[10px] text-slate-500 font-mono">{buildingPointsCount}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 模块一：总量 —— 累计监测、已拍摄地区、已拍摄照片 */}
        <div className="p-2.5 2xl:p-3.5 border-t border-white/10">
          <div className="grid grid-cols-3 gap-1.5 2xl:gap-2">
            {[
              {
                label: '累计监测',
                value: executedDays,
                unit: '天',
                dot: 'bg-violet-400 shadow-[0_0_6px_#a78bfa]',
                valColor: 'text-slate-100',
                bgGradient: 'bg-gradient-to-b from-violet-500/18 via-violet-950/20 to-transparent border-violet-500/30'
              },
              {
                label: '已拍摄地区',
                value: capturedRegions,
                unit: '处',
                dot: 'bg-sky-400 shadow-[0_0_6px_#38bdf8]',
                valColor: 'text-slate-100',
                bgGradient: 'bg-gradient-to-b from-sky-500/18 via-sky-950/20 to-transparent border-sky-500/30'
              },
              {
                label: '已拍摄照片',
                value: totalPhotos,
                formatter: (n: number) => n.toLocaleString(),
                unit: '张',
                dot: 'bg-blue-400 shadow-[0_0_6px_#60a5fa]',
                valColor: 'text-slate-100',
                bgGradient: 'bg-gradient-to-b from-blue-500/18 via-blue-950/20 to-transparent border-blue-500/30'
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`aspect-square p-1.5 2xl:p-2 rounded-lg 2xl:rounded-xl border flex flex-col items-center justify-center gap-0.5 2xl:gap-1 text-center backdrop-blur-md transition-all ${item.bgGradient}`}
              >
                <div className={`text-xs 2xl:text-base font-bold font-mono leading-tight ${item.valColor}`}>
                  <AnimatedNumber value={item.value} formatter={item.formatter} />
                </div>
                <span className="text-[9px] 2xl:text-[10px] text-slate-400 leading-tight">{item.unit}</span>
                <span className="text-[9px] 2xl:text-[10px] font-medium text-slate-300 leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 模块二：筛选区 —— 地点搜索（仅展示地图上实际存在的点位） */}
        <div className="p-2.5 2xl:p-3.5 border-t border-white/10 space-y-1.5 2xl:space-y-2">
          <LocationSearch
            locations={spatialLocationOptions}
            selectedLocation={selectedSpatialPointId}
            onSelectLocation={(id) => {
              if (!id) { onSelectSpatialPoint(null); return; }
              const point = spatialPoints.find((p) => p.id === id) || null;
              onSelectSpatialPoint(point);
            }}
          />
        </div>

        {/* 模块三：当前任务 —— 当前执行周期 + 进度同步（默认今日，支持按天筛选）；默认展示，无任务/无历史周期时显示空状态，可折叠 */}
        <MonitorSection
          label="当前任务"
          badge={isRunning && !sync?.cycleFinished ? (
            <span className="px-1.5 2xl:px-2 py-0.5 rounded-full text-[9px] 2xl:text-[10px] font-bold bg-sky-400/20 text-sky-200 border border-sky-400/40">执行中</span>
          ) : undefined}
          open={taskOpen}
          onToggle={() => setTaskOpen((v) => !v)}
        >
          {/* 时间周期筛选：默认当前执行周期，可回看历史周期的执行进度 */}
          <div className="relative">
            <button
              onClick={() => setIsCycleOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-1.5 2xl:gap-2 px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl bg-white/5 border border-white/10 hover:border-sky-400/50 transition-all cursor-pointer text-[11px] 2xl:text-xs"
            >
              <span className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                <Calendar className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-sky-400 shrink-0" />
                <span className="truncate font-semibold text-slate-200">{selectedCycle.label}</span>
              </span>
              <ChevronDown className={`w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-slate-400 shrink-0 transition-transform ${isCycleOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCycleOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-10 bg-black/90 border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                {cycleOptions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCycleId(c.id); setIsCycleOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 2xl:px-3 2xl:py-2 text-left text-[11px] 2xl:text-xs font-semibold transition-colors cursor-pointer ${
                      c.id === selectedCycleId ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className="text-[9px] 2xl:text-[10px] text-slate-500 font-mono shrink-0">{c.totalDays}天</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isPastCycle ? (
            <div className="space-y-1 2xl:space-y-1.5">
              <div className="text-xs 2xl:text-sm font-bold text-white font-mono">{selectedCycle.startDate} ~ {selectedCycle.endDate}</div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full shadow-[0_0_6px_#34d399] bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-end">
                <span className="text-[11px] 2xl:text-xs font-bold font-mono text-emerald-300">
                  已完成 {selectedCycle.totalDays}/{selectedCycle.totalDays} 天
                </span>
              </div>
            </div>
          ) : isRunning ? (
            <div className="space-y-1 2xl:space-y-1.5">
              <div className="text-xs 2xl:text-sm font-bold text-white font-mono">{startDate} ~ {endDate}</div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className={`h-full rounded-full shadow-[0_0_6px_#38bdf8] transition-all ${
                    sync?.cycleFinished ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, (activeDay / Math.max(1, totalDays)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-end">
                <span className={`text-[11px] 2xl:text-xs font-bold font-mono ${sync?.cycleFinished ? 'text-emerald-300' : 'text-sky-300'}`}>
                  {sync?.cycleFinished ? '已完成' : '已执行'} {activeDay}/{totalDays} 天
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] 2xl:text-xs font-semibold text-slate-300">当前无任务</span>
            </div>
          )}

          {(isPastCycle || isRunning) && (
          <div className="pt-2 mt-1 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">进度同步</span>
              {(isPastCycle || sync) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedDay(Math.max(1, activeDay - 1))}
                  disabled={activeDay <= 1}
                  className="w-4 h-4 flex items-center justify-center rounded text-sky-300 disabled:text-slate-600 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40 min-w-[44px] text-center">
                  第<AnimatedNumber value={activeDay} />天
                </span>
                <button
                  onClick={() => setSelectedDay(Math.min(dayCount, activeDay + 1))}
                  disabled={activeDay >= dayCount}
                  className="w-4 h-4 flex items-center justify-center rounded text-sky-300 disabled:text-slate-600 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              )}
            </div>

            {isPastCycle ? (
              <div className="space-y-1.5 2xl:space-y-2">
                {(() => {
                  const detail = buildPastCycleDayDetail(selectedCycle.startDate, activeDay, locations);
                  return (
                    <>
                      <ProgressStepSection index={0} label="接收拍摄需求" status="done">
                        <div className="space-y-1 2xl:space-y-1.5">
                          {detail.locations.map((l) => (
                            <div key={l.name} className="flex items-center justify-between gap-2 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
                              <span className="flex items-center gap-1 2xl:gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-200 truncate">{l.name}</span>
                              </span>
                              <span className="text-[9px] 2xl:text-[10px] font-mono text-sky-300 shrink-0">{l.lng}, {l.lat}</span>
                            </div>
                          ))}
                        </div>
                      </ProgressStepSection>

                      <ProgressStepSection index={1} label="生成任务规划" status="done">
                        <div className="space-y-1 2xl:space-y-1.5">
                          <span className="inline-block px-1.5 2xl:px-2 py-0.5 rounded-full text-[9px] 2xl:text-[10px] font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/25">已生成</span>
                          <div className="rounded-lg border border-white/10 overflow-hidden">
                            {detail.planTable.map((row) => (
                              <div key={row.time + row.location} className="flex items-center justify-between gap-2 px-2 py-1 2xl:px-2.5 2xl:py-1.5 odd:bg-white/[0.03] even:bg-transparent">
                                <span className="text-[9px] 2xl:text-[10px] font-mono text-sky-300 shrink-0">{row.time}</span>
                                <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-200 truncate text-right">{row.location}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ProgressStepSection>

                      <ProgressStepSection index={2} label="每天执行步骤同步" status="done">
                        <div className="space-y-1 2xl:space-y-1.5">
                          <div className="text-[9px] 2xl:text-[10px] font-bold text-slate-500 uppercase tracking-wide px-0.5">
                            第{activeDay}天任务已执行完成
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">地面模型规划</span>
                            <span className={progressStageBadgeClass(PROGRESS_GROUND_STEPS.length, PROGRESS_GROUND_STEPS.length)}>
                              {progressStageLabel(PROGRESS_GROUND_STEPS.length, PROGRESS_GROUND_STEPS.length)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">星上任务执行</span>
                            <span className={progressStageBadgeClass(PROGRESS_ONBOARD_STEPS.length, PROGRESS_ONBOARD_STEPS.length)}>
                              {progressStageLabel(PROGRESS_ONBOARD_STEPS.length, PROGRESS_ONBOARD_STEPS.length)}
                            </span>
                          </div>
                        </div>
                      </ProgressStepSection>

                      <ProgressStepSection index={3} label="本周期任务执行完毕" status="done">
                        <span className="text-[10px] 2xl:text-[11px] font-medium text-emerald-400">
                          全部执行天数已完成，任务周期结束。
                        </span>
                      </ProgressStepSection>
                    </>
                  );
                })()}
              </div>
            ) : !sync ? (
              <div className="p-2.5 2xl:p-3 rounded-xl border border-dashed border-white/15 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 animate-pulse" />
                <span className="text-[11px] 2xl:text-xs font-semibold text-slate-400">正在接收拍摄需求…</span>
              </div>
            ) : (
            <div className="space-y-1.5 2xl:space-y-2">
                {activeDay === sync.day ? (
                  <div className="space-y-1.5 2xl:space-y-2">
                    <ProgressStepSection key={`step0-${stepStatus(0)}`} index={0} label="接收拍摄需求" status={stepStatus(0)}>
                      <div className={`space-y-1 2xl:space-y-1.5 ${stepStatus(0) === 'current' ? 'animate-pulse' : ''}`}>
                        {sync.locations.map((l) => (
                          <div key={l.name} className="flex items-center justify-between gap-2 px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <span className="flex items-center gap-1 2xl:gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                              <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-200 truncate">{l.name}</span>
                            </span>
                            <span className="text-[9px] 2xl:text-[10px] font-mono text-sky-300 shrink-0">{l.lng}, {l.lat}</span>
                          </div>
                        ))}
                      </div>
                    </ProgressStepSection>

                    <ProgressStepSection key={`step1-${stepStatus(1)}`} index={1} label="生成任务规划" status={stepStatus(1)}>
                      <div className="space-y-1 2xl:space-y-1.5">
                        <span className={`inline-block px-1.5 2xl:px-2 py-0.5 rounded-full text-[9px] 2xl:text-[10px] font-bold border ${
                          sync.planGenerated
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}>
                          {sync.planGenerated ? '已生成' : '规划中…'}
                        </span>
                        {sync.planGenerated && sync.planTable && (
                          <div className="rounded-lg border border-white/10 overflow-hidden">
                            {sync.planTable.map((row) => (
                              <div key={row.time + row.location} className="flex items-center justify-between gap-2 px-2 py-1 2xl:px-2.5 2xl:py-1.5 odd:bg-white/[0.03] even:bg-transparent">
                                <span className="text-[9px] 2xl:text-[10px] font-mono text-sky-300 shrink-0">{row.time}</span>
                                <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-200 truncate text-right">{row.location}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </ProgressStepSection>

                    <ProgressStepSection key={`step2-${stepStatus(2)}`} index={2} label="每天执行步骤同步" status={stepStatus(2)}>
                      <div className="space-y-1 2xl:space-y-1.5">
                        <div className="text-[9px] 2xl:text-[10px] font-bold text-slate-500 uppercase tracking-wide px-0.5">
                          正在执行【第{sync.day}天】任务
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
                          <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">地面模型规划</span>
                          <span className={progressStageBadgeClass(sync.groundStepIndex, PROGRESS_GROUND_STEPS.length)}>
                            {progressStageLabel(sync.groundStepIndex, PROGRESS_GROUND_STEPS.length)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
                          <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">星上任务执行</span>
                          <span className={progressStageBadgeClass(sync.onboardStepIndex, PROGRESS_ONBOARD_STEPS.length)}>
                            {progressStageLabel(sync.onboardStepIndex, PROGRESS_ONBOARD_STEPS.length)}
                          </span>
                        </div>
                      </div>
                    </ProgressStepSection>

                    <ProgressStepSection key={`step3-${stepStatus(3)}`} index={3} label="本周期任务执行完毕" status={stepStatus(3)}>
                      <span className="text-[10px] 2xl:text-[11px] font-medium text-emerald-400">
                        全部执行天数已完成，任务周期结束。
                      </span>
                    </ProgressStepSection>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1.5 2xl:px-2.5 2xl:py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] 2xl:text-[11px] font-semibold text-emerald-400">第{activeDay}天任务已执行完成</span>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </MonitorSection>
      </div>
    ) : (
      <SatelliteDashboardCard selectedId={satId} onSelectId={onSelectSatelliteId || (() => {})} hideContainer />
    )}
  </div>
</div>
);
}

// ── 卫星数据看板：与星座全量数据 SATELLITE_CONSTELLATION_ITEMS 同步 ──
const SATELLITE_DASHBOARD_LIST: ConstellationSatelliteItem[] = SATELLITE_CONSTELLATION_ITEMS;

function SatelliteDashboardCard({
  selectedId,
  onSelectId,
  hideContainer,
}: {
  selectedId: string;
  onSelectId: (id: string) => void;
  hideContainer?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isSatOpen, setIsSatOpen] = useState(false);
  const [coordOpen, setCoordOpen] = useState(true);
  const [payloadOpen, setPayloadOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(true);
  const [usageOpen, setUsageOpen] = useState(true);

  const activeSatellite = SATELLITE_DASHBOARD_LIST.find((s) => s.id === selectedId) ?? SATELLITE_DASHBOARD_LIST[0];

  // 卫星轨道经纬度与高度：基于真实 TLE 实时解算大地坐标系参数（经度、纬度、高度）
  const [orbitPos, setOrbitPos] = useState<{ lng: number; lat: number; height: number }>({
    lng: 0, lat: 0, height: 0,
  });

  useEffect(() => {
    const targetSat = SATELLITE_DASHBOARD_LIST.find((s) => s.id === selectedId) ?? SATELLITE_DASHBOARD_LIST[0];
    const satrec = satellite.twoline2satrec(targetSat.line1, targetSat.line2);
    const update = () => {
      const now = new Date();
      const pv = satellite.propagate(satrec, now);
      if (pv.position && typeof pv.position !== 'boolean') {
        const gmst = satellite.gstime(now);
        const geodetic = satellite.eciToGeodetic(pv.position, gmst);
        setOrbitPos({
          lng: satellite.degreesLong(geodetic.longitude),
          lat: satellite.degreesLat(geodetic.latitude),
          height: geodetic.height, // 单位 km
        });
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [selectedId]);

  if (collapsed && !hideContainer) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-1.5 2xl:gap-2 px-2.5 py-2 2xl:px-3.5 2xl:py-2.5 rounded-xl sm:rounded-2xl bg-black/60 border border-white/15 text-slate-100 shadow-xl backdrop-blur-xl hover:border-sky-400 transition-all cursor-pointer text-[11px] 2xl:text-xs font-bold"
        title="展开卫星数据看板"
      >
        <ChevronRight className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-sky-500" />
        <SatelliteIcon className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-sky-400 shrink-0" />
        <span>卫星数据</span>
      </button>
    );
  }

  const innerPanel = (
    <div className="overflow-y-auto divide-y divide-white/10">
        {/* 卫星下拉筛选（默认 SCS-04-16） */}
        <div className="p-2.5 2xl:p-3.5 border-t border-white/10 first:border-t-0">
          <div className="relative">
            <button
              onClick={() => setIsSatOpen((v) => !v)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 2xl:px-3 2xl:py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSatOpen
                  ? 'border-sky-400 bg-sky-500/15 shadow-[0_0_0_3px_rgba(56,189,248,0.15)]'
                  : 'border-sky-400/50 bg-sky-500/10 hover:border-sky-400/80 hover:bg-sky-500/15'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex items-center justify-center w-2 h-2 shrink-0">
                  {selectedId === 'scs-04-16' && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
                  )}
                  <span className="relative w-2 h-2 rounded-full bg-sky-400 shadow shadow-sky-400/50" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] 2xl:text-xs font-bold text-slate-100 truncate">{activeSatellite.code}</span>
                    {selectedId === 'scs-04-16' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">实时</span>
                    )}
                  </div>
                  <div className="text-[9px] 2xl:text-[10px] text-slate-400 truncate">{activeSatellite.name}</div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-slate-400 shrink-0 transition-transform ${isSatOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSatOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] rounded-xl border border-white/15 bg-[#0c101c] shadow-xl overflow-hidden z-10 animate-fadeIn">
                {SATELLITE_DASHBOARD_LIST.map((s) => {
                  const isSelected = selectedId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { onSelectId(s.id); setIsSatOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 2xl:px-3 2xl:py-2 text-left text-[11px] 2xl:text-xs transition-colors cursor-pointer border-l-2 ${
                        isSelected
                          ? 'bg-sky-500/15 text-sky-300 border-sky-400'
                          : 'text-slate-300 border-transparent hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className={`font-bold ${isSelected ? 'text-sky-300' : ''}`}>{s.code}</span>
                        <span className="ml-2 text-[9px] 2xl:text-[10px] text-slate-400">{s.name}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-sky-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 轨道信息 (经度、纬度、高度) */}
        <MonitorSection
          label="轨道信息"
          open={coordOpen}
          onToggle={() => setCoordOpen((v) => !v)}
        >
          <div className="grid grid-cols-2 gap-1.5 2xl:gap-2">
            <div className="px-2 py-1.5 2xl:px-2.5 2xl:py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[9px] 2xl:text-[10px] text-slate-400">经度</div>
              <div className="text-[11px] 2xl:text-xs font-bold text-slate-100 font-mono">
                {Math.abs(orbitPos.lng).toFixed(2)}° {orbitPos.lng >= 0 ? 'E' : 'W'}
              </div>
            </div>
            <div className="px-2 py-1.5 2xl:px-2.5 2xl:py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[9px] 2xl:text-[10px] text-slate-400">纬度</div>
              <div className="text-[11px] 2xl:text-xs font-bold text-slate-100 font-mono">
                {Math.abs(orbitPos.lat).toFixed(2)}° {orbitPos.lat >= 0 ? 'N' : 'S'}
              </div>
            </div>
            <div className="col-span-2 px-2 py-1.5 2xl:px-2.5 2xl:py-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[9px] 2xl:text-[10px] text-slate-400">高度</div>
                <div className="text-[11px] 2xl:text-xs font-bold text-slate-100 font-mono">{orbitPos.height.toFixed(1)} km</div>
              </div>
              <span className="text-[9px] 2xl:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
                实时轨道
              </span>
            </div>
          </div>
        </MonitorSection>

        {/* 载荷信息 */}
        <MonitorSection
          label="载荷信息"
          open={payloadOpen}
          onToggle={() => setPayloadOpen((v) => !v)}
        >
          <div className="space-y-1 2xl:space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">智算算力</span>
              <span className="text-[10px] 2xl:text-[11px] font-bold text-sky-400 font-mono">{activeSatellite.payload.aiCompute}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">路由单口速率</span>
              <span className="text-[10px] 2xl:text-[11px] font-bold text-sky-400 font-mono">{activeSatellite.payload.routeSpeed}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">激光通信速率</span>
              <span className="text-[10px] 2xl:text-[11px] font-bold text-sky-400 font-mono">{activeSatellite.payload.laserSpeed}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 2xl:px-2.5 2xl:py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">红外载荷分辨率</span>
              <span className="text-[10px] 2xl:text-[11px] font-bold text-sky-400 font-mono">{activeSatellite.payload.infraredResolution}</span>
            </div>
          </div>
        </MonitorSection>

        {/* 模型情况 */}
        <MonitorSection
          label="模型情况"
          badge={<span className="text-[9px] 2xl:text-[10px] font-bold text-slate-400">{activeSatellite.models.length} 个</span>}
          open={modelOpen}
          onToggle={() => setModelOpen((v) => !v)}
        >
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-2 px-2 py-1 2xl:px-2.5 2xl:py-1.5 bg-white/5 text-[9px] 2xl:text-[10px] font-bold text-slate-400">
              <span>名称</span>
              <span>版本</span>
            </div>
            <div className="divide-y divide-white/5">
              {activeSatellite.models.map((m) => (
                <div key={m.name} className="grid grid-cols-[1fr_auto] gap-2 px-2 py-1 2xl:px-2.5 2xl:py-1.5">
                  <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-200 truncate">{m.name}</span>
                  <span className="text-[10px] 2xl:text-[11px] font-mono text-slate-400">{m.version}</span>
                </div>
              ))}
            </div>
          </div>
        </MonitorSection>

        {/* 资源占用 */}
        <MonitorSection
          label="资源占用"
          open={usageOpen}
          onToggle={() => setUsageOpen((v) => !v)}
        >
          <div className="space-y-1.5 2xl:space-y-2.5">
            {[
              { label: 'GPU 占用', value: activeSatellite.usage.gpu, colorClass: 'bg-sky-500' },
              { label: 'CPU 占用', value: activeSatellite.usage.cpu, colorClass: 'bg-violet-500' },
              { label: '磁盘用量', value: activeSatellite.usage.disk, colorClass: 'bg-amber-500' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-0.5 2xl:mb-1">
                  <span className="text-[10px] 2xl:text-[11px] font-semibold text-slate-300">{row.label}</span>
                  <span className="text-[10px] 2xl:text-[11px] font-bold text-slate-100 font-mono">{row.value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full ${row.colorClass}`} style={{ width: `${row.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </MonitorSection>
      </div>
  );

  if (hideContainer) {
    return innerPanel;
  }

  return (
    <div className="w-60 sm:w-64 lg:w-72 2xl:w-80 max-h-[calc(100vh-4.5rem)] sm:max-h-[calc(100vh-5.5rem)] 2xl:max-h-[calc(100vh-6rem)] bg-black/60 border border-white/15 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col text-left select-none animate-fadeIn relative z-30 overflow-hidden">
      <div className="p-2.5 px-3 2xl:p-3.5 2xl:px-4 border-b border-white/10 bg-white/5 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl shrink-0">
        <div className="flex items-center gap-1.5 2xl:gap-2">
          <SatelliteIcon className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-sky-400 shrink-0" />
          <span className="font-bold text-[11px] 2xl:text-xs text-slate-100">卫星数据</span>
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="折叠面板"
        >
          <ChevronLeft className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
        </button>
      </div>

      {innerPanel}
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>

    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}

// ── 对话区任务进度消息类型与渲染 ──────────────────────────────────────────────
interface DashboardChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  stages?: string[];
  stagesTitle?: string;
  table?: { time: string; location: string }[];
  processSteps?: string[];
  resultImage?: string;
  locationPills?: string[];
  dateOptions?: { label: string; startDate: string; endDate: string }[];
  currentStepIndex?: number;
  confirmChoice?: boolean;
  analysisResult?: {
    location: string;
    locationType: string;
    fireDetected: boolean;
    area?: number;
    image?: string;
  };
}

// 根据地点名称推断地表类型（仅用于演示性展示）
function getLocationType(name: string): string {
  if (name.includes('雨林') || name.includes('盆地') || name.includes('苏门答腊')) return '热带雨林';
  if (name.includes('泰加林') || name.includes('林区') || name.includes('不列颠哥伦比亚')) return '针叶林带';
  if (name.includes('山区') || name.includes('高原')) return '山地林区';
  if (name.includes('半岛')) return '地中海灌木林';
  return '森林';
}

// 将文字步骤标签转换为 FlowStepsTimeline 所需的步骤数据（均视为已完成）
function toFlowSteps(labels: string[]): FlowStepItem[] {
  return labels.map((label) => ({ key: label, label, status: 'success' }));
}

// 进度同步模块：地面 4 步 + 星上 17 步（含火情分析、分析完毕）
const PROGRESS_GROUND_STEPS = ['地面模型接收任务', '任务意图解析', '任务包组装与发送', '任务发送成功'];
const PROGRESS_ONBOARD_STEPS = [
  '星上模型启动', '任务解析完成', '任务规划完成', '遥控指令生成', '相机成像', '成像数据落盘',
  '云判', '火灾检测', '模型推理完成', '开始落盘到固存', '落盘固存完成', '文件启动下传',
  '文件下传到地面站', '码流文件解析', '模型结果解析', '火情分析', '分析完毕',
];

interface ProgressSyncState {
  day: number;
  locations: { name: string; lng: number; lat: number }[];
  planGenerated: boolean;
  planTable?: { time: string; location: string }[];
  groundStepIndex: number; // -1 = 未开始
  onboardStepIndex: number; // -1 = 未开始
  fireDetected?: boolean;
  cycleFinished?: boolean; // 本周期（全部执行天数）任务是否已执行完毕
  receiving?: boolean; // 刚接收到拍摄需求尚未开始规划的短暂阶段，用于驱动闪烁动效
}

type ProgressStepStatus = 'done' | 'current' | 'pending';
const PROGRESS_STEP_ORDINALS = ['一', '二', '三', '四'];

// 阶段进度徽标：未开始 / 进行中 (n/N) / 全部完成
function progressStageLabel(stepIndex: number, total: number): string {
  if (stepIndex < 0) return '未开始';
  if (stepIndex >= total) return '全部完成';
  return `进行中 (${stepIndex}/${total})`;
}
function progressStageBadgeClass(stepIndex: number, total: number): string {
  const base = 'px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0';
  if (stepIndex < 0) return `${base} bg-white/[0.04] text-slate-500 border-white/[0.08]`;
  if (stepIndex >= total) return `${base} bg-emerald-500/15 text-emerald-400 border-emerald-500/25`;
  return `${base} bg-sky-950/40 text-sky-400 border-sky-500/20`;
}

// 为历史周期的某一天生成一份确定性（基于日期+天数）的已完成任务详情，用于回看过往执行进度
function buildPastCycleDayDetail(cycleStartDate: string, day: number, pool: Location[]) {
  if (pool.length === 0) {
    return { locations: [] as { name: string; lng: number; lat: number }[], planTable: [] as { time: string; location: string }[] };
  }
  const seed = (cycleStartDate.split('-').reduce((acc, n) => acc + Number(n), 0) + day) % pool.length;
  const picked = [pool[seed], pool[(seed + 1) % pool.length]].filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i);
  const dayLocations = picked.map((l) => ({ name: l.name, lng: l.lng, lat: l.lat }));
  const planTable = dayLocations.map((l, i) => ({ time: `0${8 + i * 2}:00`, location: l.name }));
  return { locations: dayLocations, planTable };
}

// 进度同步四大流程中的单个步骤：可折叠，进行中默认展开，完成后自动收起（点击可再次查看详情）
function ProgressStepSection({
  index,
  label,
  status,
  children,
}: {
  index: number;
  label: string;
  status: ProgressStepStatus;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(status === 'current' || (status === 'done' && index === 3));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer select-none hover:opacity-90"
      >
        {status === 'done' ? (
          <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-white stroke-[3]" />
          </div>
        ) : status === 'current' ? (
          <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shrink-0 ring-2 ring-sky-400/30">
            <RotateCw className="w-3 h-3 text-white stroke-[2.5] animate-spin" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-slate-400 font-bold text-[10px] font-mono shrink-0">
            {index + 1}
          </div>
        )}
        <span className={`text-[11px] font-bold flex-1 ${status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
          第{PROGRESS_STEP_ORDINALS[index]}步 · {label}
        </span>
        {status !== 'pending' && (
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        )}
      </div>
      {expanded && status !== 'pending' && (
        <div className="px-2.5 pb-2.5 pt-0.5 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}

// 拍摄时间/拍摄地点任务规划表（与任务规划对话区卡片风格保持一致）
export function ScheduleTable({ rows }: { rows: { time: string; location: string }[] }) {
  return (
    <div className="w-full rounded-2xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-sm backdrop-blur-xl my-2.5 overflow-hidden">
      <div className="px-3.5 sm:px-4 pt-3.5 pb-2 flex items-center gap-2">
        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">任务规划</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400 border border-blue-200/40 dark:border-sky-500/20 font-medium">
          已生成
        </span>
      </div>
      <table className="w-full text-[11px] sm:text-xs border-t border-slate-100 dark:border-white/[0.06]">
        <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400">
          <tr>
            <th className="text-left font-semibold px-3.5 sm:px-4 py-2">拍摄时间</th>
            <th className="text-left font-semibold px-3.5 sm:px-4 py-2">拍摄地点</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {rows.map((r) => (
            <tr key={r.time + r.location} className="text-slate-700 dark:text-slate-300">
              <td className="px-3.5 sm:px-4 py-2 font-mono">{r.time}</td>
              <td className="px-3.5 sm:px-4 py-2">{r.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 火情分析结果卡片：图片 + 地点/地点类型/是否发现火情/火情面积
export function FireAnalysisResultCard({ result }: { result: { location: string; locationType: string; fireDetected: boolean; area?: number; image?: string; } }) {
  return (
    <div className="w-full rounded-2xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-sm backdrop-blur-xl my-2.5 overflow-hidden">
      {result.image && (
        <img src={result.image} alt={result.location} className="w-full h-40 sm:h-48 object-cover" />
      )}
      <div className="p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">火情分析结果</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              result.fireDetected
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20'
            }`}
          >
            {result.fireDetected ? '发现火情' : '未发现火情'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500">地点</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{result.location}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500">地点类型</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{result.locationType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500">是否发现火情</span>
            <span className={`font-semibold ${result.fireDetected ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {result.fireDetected ? '是' : '否'}
            </span>
          </div>
          {result.fireDetected && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-500">火情面积</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">{result.area ?? '—'} 公顷</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 主组件：InnovativeAppView ──────────────────────────────────────────────────
export const InnovativeAppView: React.FC<InnovativeAppViewProps> = ({
  onBackToPlanning,
  customApps = [],
  selectedApp: externalSelectedApp,
  onSelectApp,
  viewMode = 'split',
  satellites,
}) => {
  // 看板内嵌对话区状态（自带简易问答，不依赖任务规划全局对话）
  const [dashboardMessages, setDashboardMessages] = useState<DashboardChatMessage[]>([]);
  // 看板顶部统计数字，随任务进度同步联动增长（数字变化时通过 AnimatedNumber 滚动过渡）
  const [dashboardStats, setDashboardStats] = useState({
    capturedRegions: stats.capturedRegions,
    totalPhotos: stats.totalPhotos,
    firePoints: stats.firePoints,
  });
  // 左侧独立浮动的“进度同步”模块状态（与嵌入式对话内容并行展示，展示为流程步骤）
  const [progressSync, setProgressSync] = useState<ProgressSyncState | null>(null);
  // 看板区上方中间的短暂提示消息（如接收到高风险地点拍摄需求时弹出）
  const [topToast, setTopToast] = useState<string | null>(null);
  // 每日任务执行完毕时，在地图对应经纬度处短暂闪烁的红点标记
  const [pulseMarkers, setPulseMarkers] = useState<{ lat: number; lng: number }[]>([]);
  const [dashboardInputText, setDashboardInputText] = useState('');
  const [showDashboardScrollToBottom, setShowDashboardScrollToBottom] = useState(false);
  const dashboardChatScrollRef = useRef<HTMLDivElement>(null);
  const dashboardTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 开始/中断任务的多轮对话流程状态
  const [chatFlow, setChatFlow] = useState<
    | { type: 'idle' }
    | { type: 'awaiting_dates' }
    | { type: 'awaiting_start_confirm'; startDate: string; endDate: string }
    | { type: 'awaiting_interrupt_confirm' }
  >({ type: 'idle' });

  // 对话区/看板区可拖拽分割状态（与其他分栏页面拖拽效果保持一致）
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(380);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const dashboardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!dashboardContainerRef.current) return;
      const rect = dashboardContainerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const minWidth = 200;
      const maxWidth = Math.max(300, rect.width - 360);
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setChatPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsDraggingSplitter(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  useEffect(() => {
    if (!dashboardContainerRef.current || viewMode !== 'split') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const totalWidth = entry.contentRect.width;
        if (totalWidth <= 0) return;
        const minKanbanWidth = 360;
        const maxAllowedChatWidth = Math.max(200, totalWidth - minKanbanWidth - 12);

        setChatPanelWidth(prev => {
          if (prev > maxAllowedChatWidth) return maxAllowedChatWidth;
          return prev;
        });
      }
    });

    observer.observe(dashboardContainerRef.current);
    return () => observer.disconnect();
  }, [viewMode]);

  // 输入框随内容自动增高（与健康管理对话区一致）
  useEffect(() => {
    if (dashboardTextareaRef.current) {
      dashboardTextareaRef.current.style.height = 'auto';
      const scrollHeight = dashboardTextareaRef.current.scrollHeight;
      dashboardTextareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [dashboardInputText]);

  const handleDashboardChatScroll = () => {
    if (!dashboardChatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = dashboardChatScrollRef.current;
    setShowDashboardScrollToBottom(scrollHeight - scrollTop - clientHeight > 120);
  };

  const scrollDashboardChatToBottom = (smooth = true) => {
    if (dashboardChatScrollRef.current) {
      dashboardChatScrollRef.current.scrollTo({
        top: dashboardChatScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    if (dashboardMessages.length > 0) {
      const timer = setTimeout(() => {
        if (!showDashboardScrollToBottom) {
          scrollDashboardChatToBottom(true);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [dashboardMessages, showDashboardScrollToBottom]);

  // 从文本中提取形如 2026-09-05 / 2026/9/5 的日期，统一格式化为 YYYY-MM-DD
  const extractDates = (text: string): string[] => {
    const matches = text.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/g) || [];
    return matches.map((m) => {
      const [y, mo, d] = m.split(/[-/]/).map(Number);
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
  };

  // 生成从今天起算的几组推荐监测周期（供快捷选择）
  const buildDateOptions = (): { label: string; startDate: string; endDate: string }[] => {
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date();
    const addDays = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };
    return [
      { label: '未来 7 天', startDate: fmt(today), endDate: fmt(addDays(6)) },
      { label: '未来 14 天', startDate: fmt(today), endDate: fmt(addDays(13)) },
      { label: '未来 30 天', startDate: fmt(today), endDate: fmt(addDays(29)) },
    ];
  };

  const handleSendDashboardMessage = (text: string) => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const userMsg = { id: 'dash-user-' + Date.now(), role: 'user' as const, content: trimmed };
    setDashboardMessages(prev => [...prev, userMsg]);
    setDashboardInputText('');
    if (dashboardTextareaRef.current) {
      dashboardTextareaRef.current.style.height = 'auto';
    }

    const reply = (content: string, extra?: Partial<DashboardChatMessage>) => {
      setTimeout(() => {
        setDashboardMessages(prev => [...prev, { id: 'dash-asst-' + Date.now() + Math.random(), role: 'assistant' as const, content, ...extra }]);
      }, 600);
    };

    const isConfirm = /确认|好的|是的|同意|可以/.test(trimmed) && !/取消/.test(trimmed);
    const isCancel = /取消|不要|算了/.test(trimmed);

    // 开始任务流程：等待用户提供开始/结束日期
    if (chatFlow.type === 'awaiting_dates') {
      const dates = extractDates(trimmed);
      if (dates.length >= 2) {
        const [startDate, endDate] = dates;
        setChatFlow({ type: 'awaiting_start_confirm', startDate, endDate });
        reply(`好的，任务周期为 ${startDate} ~ ${endDate}，确认发起「${selectedApp?.title ?? '监测'}」任务吗？`, { confirmChoice: true });
      } else {
        reply('请提供完整的开始日期和结束日期，例如：2026-09-05 至 2026-09-11。');
      }
      return;
    }

    // 开始任务流程：等待用户最终确认
    if (chatFlow.type === 'awaiting_start_confirm') {
      if (isConfirm) {
        const { startDate, endDate } = chatFlow;
        const totalDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
        if (selectedApp) {
          handleSelectApp({ ...selectedApp, startDate, endDate, totalDays, executedDays: 0, status: '进行中' });
        }
        setChatFlow({ type: 'idle' });
        reply(`任务已发起，当前周期：${startDate} ~ ${endDate}（已执行 0/${totalDays} 天）。`);
        // 任务发起后自动同步首日执行进展
        setTimeout(() => runProgressSyncFlow(1), 1400);
      } else if (isCancel) {
        setChatFlow({ type: 'idle' });
        reply('已取消，任务未发起。');
      } else {
        reply('请回复"确认"以发起任务，或回复"取消"。');
      }
      return;
    }

    // 中断任务流程：等待用户确认是否中断
    if (chatFlow.type === 'awaiting_interrupt_confirm') {
      if (isConfirm) {
        if (selectedApp) {
          handleSelectApp({ ...selectedApp, status: '已结束' });
        }
        setChatFlow({ type: 'idle' });
        reply('当前任务已中断。');
      } else if (isCancel) {
        setChatFlow({ type: 'idle' });
        reply('好的，任务继续进行中。');
      } else {
        reply('请回复"确认"以中断任务，或回复"取消"。');
      }
      return;
    }

    // 开始任务的触发入口
    if (trimmed.includes('开启') && (trimmed.includes('监测') || trimmed.includes('任务'))) {
      if (selectedApp?.status === '进行中') {
        reply(`当前任务正在进行，时间从 ${selectedApp.startDate} 到 ${selectedApp.endDate}。`);
      } else {
        setChatFlow({ type: 'awaiting_dates' });
        reply('好的，请提供本次监测任务的开始日期和结束日期（例如：2026-09-05 至 2026-09-11）。', { dateOptions: buildDateOptions() });
      }
      return;
    }

    // 中断任务的触发入口
    if (trimmed.includes('中断') && trimmed.includes('任务')) {
      if (selectedApp?.status === '进行中') {
        setChatFlow({ type: 'awaiting_interrupt_confirm' });
        reply('当前任务可中断，是否确认中断？', { confirmChoice: true });
      } else {
        reply('当前并无任务');
      }
      return;
    }

    // 任务进度同步的触发入口
    if (trimmed.includes('进展') || trimmed.includes('进度')) {
      if (selectedApp?.status === '进行中') {
        runProgressSyncFlow((selectedApp.executedDays ?? 0) + 1);
      } else {
        reply('当前并无任务');
      }
      return;
    }

    reply('已收到您的问题，正在结合当前监测看板数据进行分析，请查看右侧/看板区最新火情研判结果。');
  };

  // 任务进度同步对话流：地面任务规划 → 阶段步骤 → 星上下传 → 星上处理流程 → 成果同步
  const runProgressSyncFlow = (day: number) => {
    // 复用同一条消息 id 时原地更新内容，避免同一阶段出现重复的"进行中/已完成"两条消息
    const pushMsg = (id: string, partial: Omit<DashboardChatMessage, 'id' | 'role'>, delay: number) => {
      setTimeout(() => {
        setDashboardMessages(prev => {
          const idx = prev.findIndex((m) => m.id === id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { id, role: 'assistant', ...partial };
            return next;
          }
          return [...prev, { id, role: 'assistant', ...partial }];
        });
      }, delay);
    };

    const uid = (suffix: string) => `dash-asst-${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}`;
    const planningMsgId = uid('planning');
    const downlinkMsgId = uid('downlink');

    // 令指定消息的流程步骤逐步点亮，而非一次性全部显示为已完成
    const runStepsProgressively = (messageId: string, totalSteps: number, stepInterval: number) => {
      let currentIdx = 0;
      const interval = setInterval(() => {
        currentIdx += 1;
        setDashboardMessages(prev => prev.map((m) => (m.id === messageId ? { ...m, currentStepIndex: currentIdx } : m)));
        if (currentIdx >= totalSteps) clearInterval(interval);
      }, stepInterval);
    };

    // 令左侧独立的进度同步面板对应字段逐步点亮（与聊天区域的动画并行）
    const runPanelProgress = (field: 'groundStepIndex' | 'onboardStepIndex', totalSteps: number, stepInterval: number) => {
      let idx = 0;
      const interval = setInterval(() => {
        idx += 1;
        setProgressSync(prev => (prev ? { ...prev, [field]: idx } : prev));
        if (idx >= totalSteps) clearInterval(interval);
      }, stepInterval);
    };

    const customLocations = [
      { name: '江西省上饶市婺源县', lng: 118.1104, lat: 29.3168, locationType: '山地林区', fireDetected: true, area: 12.8, image: locations.find(l => l.status === 'fire')?.images?.[0]?.url || fireLwirPreviewImg },
      { name: '越南', lng: 107.3092, lat: 21.324, locationType: '热带雨林', fireDetected: false, area: 0, image: locations.find(l => l.status === 'safe')?.images?.[0]?.url },
      { name: '朝鲜', lng: 128.9606, lat: 41.9096, locationType: '针叶林带', fireDetected: false, area: 0, image: locations.find(l => l.status === 'safe')?.images?.[0]?.url },
      { name: '俄罗斯', lng: 122.8761, lat: 53.6871, locationType: '针叶林带', fireDetected: true, area: 34.5, image: locations.find(l => l.status === 'fire')?.images?.[0]?.url || fireLwirPreviewImg },
    ];

    const locationPills = customLocations.map((l) => `${l.name}（${l.lng}，${l.lat}）`);

    // 依据当前任务开始日期推算第 day 天对应的实际拍摄日期
    const baseDate = selectedApp?.startDate ? new Date(selectedApp.startDate) : new Date();
    const shotDate = new Date(baseDate);
    shotDate.setDate(shotDate.getDate() + (day - 1));
    const shotDateStr = `${shotDate.getFullYear()}-${String(shotDate.getMonth() + 1).padStart(2, '0')}-${String(shotDate.getDate()).padStart(2, '0')}`;

    let t = 0;
    pushMsg(uid('need'), { 
      content: `已接收到林科院 ${customLocations.length} 个高风险地点拍摄需求：\n${customLocations.map(l => `■ ${l.name}（${l.lng}，${l.lat}）`).join('\n')}`,
      locationPills 
    }, t += 400);

    setProgressSync({
      day,
      locations: customLocations.map((l) => ({ name: l.name, lng: l.lng, lat: l.lat })),
      planGenerated: false,
      groundStepIndex: -1,
      onboardStepIndex: -1,
      receiving: true,
    });

    setTimeout(() => {
      setTopToast(`接收到 ${customLocations.length} 个高风险地点拍摄需求`);
      setTimeout(() => setTopToast(null), 3200);
    }, t);

    pushMsg(planningMsgId, { content: '正在生成任务规划……' }, t += 1000);
    setTimeout(() => setProgressSync(prev => (prev ? { ...prev, receiving: false } : prev)), t);

    const table = customLocations.map((l, i) => ({
      time: `${shotDateStr} ${String(9 + i * 2).padStart(2, '0')}:${i % 2 === 0 ? '15' : '40'}`,
      location: l.name,
    }));
    pushMsg(planningMsgId, { content: '已生成任务规划，详情如下：', table }, t += 1100);
    setTimeout(() => setProgressSync(prev => (prev ? { ...prev, planGenerated: true, planTable: table } : prev)), t);

    const stages = ['地面模型接收任务', '任务意图解析', '任务包组装与发送', '任务发送成功'];
    const stageMsgId = uid('stage');
    pushMsg(stageMsgId, { content: `正在进行第${day}天任务规划，同步“阶段步骤”：`, stages, stagesTitle: `第${day}天任务规划`, currentStepIndex: 0 }, t += 1000);
    setTimeout(() => runStepsProgressively(stageMsgId, stages.length, 550), t);
    setTimeout(() => runPanelProgress('groundStepIndex', PROGRESS_GROUND_STEPS.length, 550), t);

    pushMsg(downlinkMsgId, { content: '等待星上结果下传………' }, t += stages.length * 550 + 700);

    const processSteps = [
      '星上模型启动', '任务解析完成', '遥控指令生成', '任务规划完成', '相机成像', '成像数据落盘',
      '云判', '火灾检测', '模型推理完成', '开始落盘到固存', '落盘固存完成', '文件启动下传',
      '文件下传到地面站', '码流文件解析', '模型结果解析', '任务完成',
    ];
    const resultImage = customLocations[0]?.image;
    pushMsg(downlinkMsgId, { content: '星上所有结果下传后，解析日志，呈现星上处理流程：', processSteps, resultImage, currentStepIndex: 0 }, t += 1500);
    setTimeout(() => runStepsProgressively(downlinkMsgId, processSteps.length, 220), t);
    setTimeout(() => runPanelProgress('onboardStepIndex', PROGRESS_ONBOARD_STEPS.length, 220), t);

    pushMsg(uid('synced'), { content: '结果已同步至成果管理页。' }, t += 900);

    const analysisMsgId = uid('analysis');
    pushMsg(analysisMsgId, { content: '正在进行火情分析……' }, t += 700);

    const primaryLocation = customLocations[0];
    const analysisResult = primaryLocation
      ? {
          location: primaryLocation.name,
          locationType: primaryLocation.locationType,
          fireDetected: primaryLocation.fireDetected,
          area: primaryLocation.area,
          image: primaryLocation.image,
        }
      : undefined;
    pushMsg(analysisMsgId, { content: '已完成火情分析，结果如下：', analysisResult }, t += 1400);
    setTimeout(() => {
      const cycleFinished = selectedApp ? day >= selectedApp.totalDays : false;
      setProgressSync(prev => (prev ? {
        ...prev,
        fireDetected: primaryLocation?.fireDetected,
        cycleFinished,
      } : prev));
      // 当天任务执行完毕：联动地图，在对应经纬度处短暂闪烁红点提示
      setPulseMarkers(customLocations.map((l) => ({ lat: l.lat, lng: l.lng })));
      setTimeout(() => setPulseMarkers([]), 2600);
      // 当天任务执行完毕：累计监测天数、地区、照片、发现火点同步滚动 +1（AnimatedNumber 负责滚动过渡）
      setDashboardStats(prev => ({
        capturedRegions: prev.capturedRegions + 1,
        totalPhotos: prev.totalPhotos + 1,
        firePoints: prev.firePoints + 1,
      }));
      if (selectedApp) {
        // 用本次调用的 day（而非闭包中可能已过期的 selectedApp.executedDays）计算累计天数，避免连续多天自动推进时数值卡在初始值
        handleSelectApp({ ...selectedApp, executedDays: Math.min(selectedApp.totalDays, day) });
        // 未到达总周期天数时，自动推进下一天同步，演示完整 7 天周期效果
        if (!cycleFinished) {
          setTimeout(() => runProgressSyncFlow(day + 1), 1800);
        }
      }
    }, t);
  };

  // 默认预设应用卡片（初始状态为未开始，供用户通过对话流发起任务）
  const defaultPresetApps: InnovativeAppItem[] = [
    {
      id: 'app-preset-1',
      title: '全球火险监测',
      startDate: '2026-09-05',
      endDate: '2026-09-11',
      totalDays: 7,
      executedDays: 0,
      source: '全球火险监测',
      status: '未开始',
      cooperatingUnit: '中国林业科学院',
    },
  ];

  const allApps = [...customApps, ...defaultPresetApps];

  const [internalSelectedApp, setInternalSelectedApp] = useState<InnovativeAppItem | null>(null);
  const selectedApp = externalSelectedApp !== undefined ? externalSelectedApp : internalSelectedApp;

  const handleSelectApp = (app: InnovativeAppItem | null) => {
    if (onSelectApp) {
      onSelectApp(app);
    }
    setInternalSelectedApp(app);
  };
  const activeSatellites = satellites && satellites.length > 0 ? satellites : INITIAL_SATELLITES;


  // 统一对话页“看板”模式下无需应用列表层，直接进入第一个应用的详情看板
  useEffect(() => {
    if (viewMode === 'kanban' && !selectedApp && allApps.length > 0) {
      handleSelectApp(allApps[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedApp, allApps.length]);

  // 任务开始执行（进行中且尚未同步过任何一天）时，自动触发首日进度同步，
  // 无论任务是通过本面板内嵌对话，还是通过统一对话页发起
  const autoSyncedAppKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedApp || selectedApp.status !== '进行中') return;
    const key = `${selectedApp.id}-${selectedApp.startDate}`;
    if (autoSyncedAppKeyRef.current === key) return;
    autoSyncedAppKeyRef.current = key;
    setProgressSync(null);
    const timer = setTimeout(() => runProgressSyncFlow(1), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApp?.id, selectedApp?.status, selectedApp?.startDate]);

  // 看板过滤与地图交互状态
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalLocation, setModalLocation] = useState<Location | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState<number>(0);
  const [tableLocation, setTableLocation] = useState<Location | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(2.5);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // 3D / 2D 维度模式切换（'3d' 三维仿真地球 | '2d' 平面遥感地图）
  const [viewDimension, setViewDimension] = useState<'3d' | '2d'>('3d');

  // 3D 地球视角与数据交互状态 (整合自 earth-demo-main)
  const [currentEarthObject, setCurrentEarthObject] = useState<EarthObject>(EARTH_OBJECTS[0]);
  const [isFocusedOnFenghuang, setIsFocusedOnFenghuang] = useState<boolean>(false);
  const [isMindMapOpen, setIsMindMapOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<DataTypeCategory | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [activeFootprint, setActiveFootprint] = useState<HistoryRecord | null>(null);
  // 默认仅展示林火巡查点位（与空间要素筛选下拉的互斥单选逻辑保持一致，避免古建筑点位默认叠加显示）
  const [showFire3D, setShowFire3D] = useState<boolean>(true);
  const [showBuilding3D, setShowBuilding3D] = useState<boolean>(false);
  const [selectedSpatialPoint, setSelectedSpatialPoint] = useState<SpatialMarkerPoint | null>(null);
  const [targetFlyPoint, setTargetFlyPoint] = useState<SpatialMarkerPoint | null>(null);
  const [pointScreenPos, setPointScreenPos] = useState<{ x: number; y: number } | null>(null);
  // 卫星数据看板当前展示的卫星：地球（2D/3D）上点击卫星图标或看板下拉筛选均可切换
  const [selectedSatelliteCode, setSelectedSatelliteCode] = useState<string>('scs-04-16');
  // 右上角监控卡当前激活的子 Tab（'spatial' 空间要素 | 'satellite' 卫星数据）
  const [monitorActiveTab, setMonitorActiveTab] = useState<'spatial' | 'satellite'>('spatial');

  // 处理点击卫星时的统一联动逻辑：设置当前卫星并自动切换到「卫星数据」看板
  const handleSelectSatellite = useCallback((satId: string) => {
    setSelectedSatelliteCode(satId);
    setMonitorActiveTab('satellite');
  }, []);

  // 2D 昼夜光照切换（改变地图样式滤镜）
  const [isDaylight2D, setIsDaylight2D] = useState<boolean>(true);
  const [resetNorthTrigger2D, setResetNorthTrigger2D] = useState<number>(0);

  // 2D 视图下的实时时钟驱动（每秒更新一次 2D 卫星位置与当前惯性参考系下的轨道投影）
  const [currentSatClock, setCurrentSatClock] = useState<Date>(() => new Date());
  useEffect(() => {
    if (viewDimension !== '2d') return;
    const timer = setInterval(() => {
      setCurrentSatClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [viewDimension]);

  // 3D 地球镜头飞抵拉近
  const handleFenghuangArrive = useCallback(() => {
    setIsFocusedOnFenghuang(true);
  }, []);

  // 3D 地球返回全球视角
  const handleResetGlobal3D = useCallback(() => {
    setIsFocusedOnFenghuang(false);
    setIsMindMapOpen(false);
    setIsDrawerOpen(false);
    setSelectedSpatialPoint(null);
    setPointScreenPos(null);
  }, []);

  // 3D 要素筛选面板选中点位飞行
  const handleSelectSpatialPoint = (point: SpatialMarkerPoint) => {
    setSelectedSpatialPoint(point);
    setTargetFlyPoint(point);
    setIsMindMapOpen(true);
  };

  // 3D 思维导图分类点击
  const handleSelectCategory = (category: DataTypeCategory) => {
    setSelectedCategory(category);
    setIsDrawerOpen(true);
  };

  // 3D 脚印叠置/取消叠置
  const handleOverlayFootprint = (record: HistoryRecord) => {
    if (activeFootprint?.id === record.id) {
      setActiveFootprint(null);
    } else {
      setActiveFootprint(record);
    }
  };

  const filteredLocations = useMemo(() => {
    if (statusFilter === 'all') return locations;
    return locations.filter((l) => l.status === statusFilter);
  }, [statusFilter]);

  const visibleLocations = useMemo(() => {
    if (!selectedId) return filteredLocations;
    return filteredLocations.filter((l) => l.id === selectedId);
  }, [filteredLocations, selectedId]);

  const focusedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) || null,
    [selectedId]
  );

  // 状态 Badge 样式
  const getStatusBadge = (status: '未开始' | '进行中' | '已结束') => {
    switch (status) {
      case '进行中':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-bold">
            <span>进行中</span>
          </span>
        );
      case '未开始':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>未开始</span>
          </span>
        );
      case '已结束':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.1] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>已结束</span>
          </span>
        );
    }
  };

  // ── 如果用户点击了某个应用卡片，进入“创新应用展示看板” ─────────────────────────
  if (selectedApp) {
    const showChat = viewMode === 'split' || viewMode === 'chat';
    const showKanban = viewMode === 'split' || viewMode === 'kanban';

    return (
      <div id="innovative-app-dashboard-wrapper" ref={dashboardContainerRef} className="w-full h-full min-h-0 flex flex-row animate-fadeIn">
        {/* 对话区（split / chat 视图下展示） */}
        {showChat && (
          <div
            style={viewMode === 'split' ? { width: `${chatPanelWidth}px` } : undefined}
            className={`${viewMode === 'split' ? 'h-full shrink-0' : 'flex-1 h-full'} min-h-0 flex flex-col overflow-hidden relative`}
          >
            <div ref={dashboardChatScrollRef} onScroll={handleDashboardChatScroll} className="flex-1 overflow-y-auto w-full flex flex-col px-2 sm:px-4 py-3 relative">
              {dashboardMessages.length === 0 ? (
                <div className="flex-1 my-auto flex flex-col justify-center items-center text-center py-8 space-y-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50/90 dark:bg-sky-950/70 border border-blue-200/80 dark:border-sky-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400 shadow-md">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div className="space-y-2 max-w-lg mx-auto">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      您好，我是OneSpace，可以帮您安排「{selectedApp.title}」任务，您可以跟我说：
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button type="button" onClick={() => handleSendDashboardMessage('开启林火巡查任务')} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111728] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/45 transition-all cursor-pointer shadow-2xs">
                        开启林火巡查任务
                      </button>
                      <button type="button" onClick={() => handleSendDashboardMessage('中断林火巡查任务')} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111728] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/45 transition-all cursor-pointer shadow-2xs">
                        中断林火巡查任务
                      </button>
                      <button type="button" onClick={() => handleSendDashboardMessage('同步进度')} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111728] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/45 transition-all cursor-pointer shadow-2xs">
                        同步进度
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-6 pb-6">
                  {dashboardMessages.map(msg => (
                    <div key={msg.id} className={`flex items-start w-full ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`rounded-2xl p-3.5 sm:p-4 transition-all text-left ${msg.role === 'assistant' ? 'w-full bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 shadow-sm' : 'max-w-[85%] bg-blue-600 text-white shadow-md shadow-blue-900/20'}`}>
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        {msg.confirmChoice &&
                          msg.id === dashboardMessages[dashboardMessages.length - 1]?.id &&
                          (chatFlow.type === 'awaiting_start_confirm' || chatFlow.type === 'awaiting_interrupt_confirm') && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSendDashboardMessage('确认')}
                                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-sm"
                              >
                                确认
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendDashboardMessage('取消')}
                                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111728] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/45 transition-colors cursor-pointer"
                              >
                                取消
                              </button>
                            </div>
                          )}
                        {msg.locationPills && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {msg.locationPills.map((p) => (
                              <span key={p} className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.dateOptions &&
                          msg.id === dashboardMessages[dashboardMessages.length - 1]?.id &&
                          chatFlow.type === 'awaiting_dates' && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {msg.dateOptions.map((opt) => (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => handleSendDashboardMessage(`${opt.startDate} 至 ${opt.endDate}`)}
                                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111728] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/45 transition-all cursor-pointer shadow-2xs"
                                >
                                  {opt.label}（{opt.startDate} 至 {opt.endDate}）
                                </button>
                              ))}
                            </div>
                          )}
                        {msg.stages && (
                          <FlowStepsTimeline
                            steps={toFlowSteps(msg.stages)}
                            currentStepIndex={msg.currentStepIndex ?? 0}
                            title={msg.stagesTitle || '地面大模型解析'}
                          />
                        )}
                        {msg.table && <ScheduleTable rows={msg.table} />}
                        {msg.processSteps && (
                          <FlowStepsTimeline
                            steps={toFlowSteps(msg.processSteps)}
                            currentStepIndex={msg.currentStepIndex ?? 0}
                            title="星上任务自主执行"
                            collapsible
                            defaultExpanded={false}
                            resultImage={msg.resultImage}
                          />
                        )}
                        {msg.analysisResult && <FireAnalysisResultCard result={msg.analysisResult} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 pt-1 pb-3 px-2 sm:px-4 w-full relative">
              {showDashboardScrollToBottom && (
                <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <button
                    onClick={() => scrollDashboardChatToBottom(true)}
                    title="回到最近对话"
                    className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#0f172a] hover:bg-blue-50 dark:hover:bg-sky-950/80 border border-slate-200 dark:border-sky-400/25 text-blue-600 dark:text-sky-400 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer group"
                  >
                    <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />
                  </button>
                </div>
              )}

              <div className="max-w-3xl mx-auto flex items-center gap-2">
                <div className="flex-1 flex items-center rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-sm hover:border-blue-400 dark:hover:border-white/[0.2] focus-within:border-blue-500 dark:focus-within:border-sky-400 transition-all px-4 py-2">
                  <textarea
                    ref={dashboardTextareaRef}
                    value={dashboardInputText}
                    onChange={(e) => setDashboardInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendDashboardMessage(dashboardInputText);
                      }
                    }}
                    placeholder="向我提问监测看板数据 (Shift+Enter 换行)..."
                    className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none min-h-[24px] max-h-44 overflow-y-auto leading-relaxed py-1"
                    rows={1}
                  />
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSendDashboardMessage(dashboardInputText)}
                      disabled={!dashboardInputText.trim()}
                      className={`w-8 h-8 rounded-full p-0 flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer ${dashboardInputText.trim() ? 'bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 shadow-blue-500/20' : 'bg-slate-100 dark:bg-[#151b2e] text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                      title="发送指令"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 可调节拖拽轴（仅 split 视图下显示） */}
        {viewMode === 'split' && (
          <div
            onMouseDown={(e) => { e.preventDefault(); setIsDraggingSplitter(true); }}
            onDoubleClick={() => {
              if (dashboardContainerRef.current) {
                setChatPanelWidth(Math.round(dashboardContainerRef.current.getBoundingClientRect().width * 0.32));
              } else {
                setChatPanelWidth(380);
              }
            }}
            title="按住左右拖动调整两侧大小，双击恢复默认"
            className="group relative w-3 h-full shrink-0 cursor-col-resize flex items-center justify-center select-none z-30"
          >
            <div className={`w-[2px] h-full rounded-full transition-all duration-200 pointer-events-none ${
              isDraggingSplitter
                ? 'bg-gradient-to-b from-transparent via-blue-500 to-transparent dark:via-sky-400 opacity-100 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-transparent group-hover:via-blue-500/80 group-hover:to-transparent dark:group-hover:via-sky-400/80 group-hover:shadow-[0_0_6px_rgba(59,130,246,0.4)]'
            }`} />
          </div>
        )}

        {/* 看板区（split / kanban 视图下展示） */}
        {showKanban && (
          <div id="innovative-app-dashboard" className="flex-1 h-full min-h-0 flex flex-col animate-fadeIn text-left select-none relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-950 shadow-lg">
        {/* 1.5 顶部居中提示：接收到高风险地点拍摄需求时短暂弹出，加强视觉冲击力 */}
        {topToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className="animate-toast-pop animate-toast-ring flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-sky-500/95 border-2 border-sky-300/70 text-white shadow-[0_0_24px_rgba(56,189,248,0.65)] backdrop-blur-xl text-sm font-bold">
              <Flame className="w-4 h-4 text-white animate-bounce" />
              <span>{topToast}</span>
            </div>
          </div>
        )}

        {/* 2. 右上角整合汉堡包导航抽屉：整合空间要素筛选、监控分析与卫星数据看板 */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20">
          <MonitorCard
            title={selectedApp.title}
            status={selectedApp.status}
            capturedRegions={dashboardStats.capturedRegions}
            totalPhotos={dashboardStats.totalPhotos}
            firePoints={dashboardStats.firePoints}
            startDate={selectedApp.startDate}
            endDate={selectedApp.endDate}
            totalDays={selectedApp.totalDays}
            executedDays={selectedApp.executedDays ?? (selectedApp.status === '已结束' ? selectedApp.totalDays : selectedApp.status === '未开始' ? 0 : 2)}
            locations={locations}
            sync={progressSync}
            spatialPoints={SPATIAL_MARKER_POINTS}
            showFireSpatial={showFire3D}
            showBuildingSpatial={showBuilding3D}
            onToggleFireSpatial={() => setShowFire3D(!showFire3D)}
            onToggleBuildingSpatial={() => setShowBuilding3D(!showBuilding3D)}
            selectedSpatialPointId={selectedSpatialPoint?.id || null}
            onSelectSpatialPoint={(point: SpatialMarkerPoint | null) => {
              if (point) handleSelectSpatialPoint(point);
              else setSelectedSpatialPoint(null);
            }}
            selectedSatelliteId={selectedSatelliteCode}
            onSelectSatelliteId={handleSelectSatellite}
            monitorActiveTab={monitorActiveTab}
            onMonitorTabChange={setMonitorActiveTab}
          />
        </div>

        {/* ── 3D 仿真地球遥感视图（整合 earth-demo-main）───────────────────────── */}
        {viewDimension === '3d' && (
          <div className="w-full h-full relative z-0">
            <CesiumGlobe
              onFenghuangClick={handleFenghuangArrive}
              onResetGlobal={handleResetGlobal3D}
              isFocusedOnFenghuang={isFocusedOnFenghuang}
              selectedRecord={selectedRecord}
              activeFootprint={activeFootprint}
              isMindMapOpen={isMindMapOpen}
              onToggleMindMap={(open) => setIsMindMapOpen(typeof open === 'boolean' ? open : !isMindMapOpen)}
              currentEarthObject={currentEarthObject}
              showFire={showFire3D}
              showBuilding={showBuilding3D}
              selectedPointId={selectedSpatialPoint?.id || null}
              onSelectPoint={(point) => setSelectedSpatialPoint(point)}
              targetFlyPoint={targetFlyPoint}
              onPointScreenPositionChange={setPointScreenPos}
              viewDimension={viewDimension}
              onToggleDimension={() => setViewDimension('2d')}
              selectedSatelliteId={selectedSatelliteCode}
              onSelectSatellite={handleSelectSatellite}
            />

            {/* 地球放大后从小圆点延伸出的空间遥感数据处理级别思维导图 */}
            {isMindMapOpen && selectedSpatialPoint && (
              <PointMindMapOverlay
                isOpen={isMindMapOpen}
                point={selectedSpatialPoint}
                screenPos={pointScreenPos}
                onClose={() => setIsMindMapOpen(false)}
                onSelectDataTypeLevel={(dataType, level, content) => {
                  console.log('Selected data type level:', dataType, level, content);
                }}
              />
            )}

            {/* 右侧拉出历史数据列表抽屉 */}
            <HistoryDataDrawer
              isOpen={isDrawerOpen && selectedCategory !== null}
              onClose={() => setIsDrawerOpen(false)}
              currentCategory={selectedCategory || 'optical'}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectRecord={(rec) => setSelectedRecord(rec)}
              onOverlayFootprint={handleOverlayFootprint}
              activeFootprintRecordId={activeFootprint?.id}
            />

            {/* 历史数据详细分析与时序曲线弹窗 */}
            <RecordDetailModal
              record={selectedRecord}
              onClose={() => setSelectedRecord(null)}
              onOverlayFootprint={handleOverlayFootprint}
              isFootprintActive={activeFootprint?.id === selectedRecord?.id}
            />
          </div>
        )}

        {/* ── 2D 平面遥感监测视图（与 3D 视图保持要素与控制条一致）──────────────────── */}
        {viewDimension === '2d' && (
          <div className="w-full h-full relative z-0">
            {/* 快捷交互操作条 (2D 控制：3D/2D切换 / 全景视角 / 昼夜光照 / 正北重置，左上角垂直纵排，与 3D 视图保持完全一致) */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-col gap-2 pointer-events-auto">
              {/* 3D / 2D 视图切换按钮 */}
              <button
                id="btn-toggle-dimension-2d"
                onClick={() => setViewDimension('3d')}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 rounded-xl backdrop-blur-xl shadow-2xl transition-all duration-200 hover:scale-105 cursor-pointer group text-white font-bold text-xs"
                title="切换至 3D 仿真地球视窗"
              >
                <span className="text-emerald-400 font-extrabold text-sm font-mono tracking-tighter group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                  2D
                </span>
              </button>

              {/* 返回全景视角 (全图) */}
              <button
                id="btn-fly-global-2d"
                onClick={() => {
                  setSelectedSpatialPoint(null);
                  setSelectedId(null);
                  setResetTrigger((prev) => prev + 1);
                }}
                title="返回全景视角"
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-xl backdrop-blur-xl shadow-2xl transition-all duration-200 hover:scale-105 cursor-pointer group"
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              </button>

              {/* 昼夜/滤镜光照切换 */}
              <button
                id="btn-toggle-lighting-2d"
                onClick={() => setIsDaylight2D(!isDaylight2D)}
                title={isDaylight2D ? '开启夜视对比模式' : '开启全日标准模式'}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded-xl text-slate-300 hover:text-white backdrop-blur-xl transition-all duration-200 hover:scale-105 shadow-2xl cursor-pointer group"
              >
                {isDaylight2D ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300 group-hover:drop-shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
                )}
              </button>

              {/* 正北/聚焦核心区重置 */}
              <button
                id="btn-reset-north-2d"
                onClick={() => {
                  setResetNorthTrigger2D((prev) => prev + 1);
                }}
                title="重置视角聚焦核心区"
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/60 rounded-xl text-slate-300 hover:text-white backdrop-blur-xl transition-all duration-200 hover:scale-105 shadow-2xl cursor-pointer group"
              >
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 group-hover:drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
              </button>
            </div>

            <MapContainer
              key="2d-leaflet-map-container"
              center={[20, 15]}
              zoom={2.5}
              minZoom={2}
              maxZoom={18}
              zoomControl={false}
              attributionControl={false}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#020617',
                filter: isDaylight2D ? 'none' : 'brightness(0.72) contrast(1.2) saturate(0.85) hue-rotate(200deg)',
                transition: 'filter 0.5s ease',
              }}
              className="w-full h-full relative z-0"
            >
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Esri World Imagery"
                maxZoom={19}
              />
              <MapFlyTo
                location={focusedLocation}
                targetPoint={targetFlyPoint}
                resetTrigger={resetTrigger}
                resetNorthTrigger={resetNorthTrigger2D}
                onResetDone={() => setSelectedId(null)}
              />
              <MapZoomObserver onZoomChange={setCurrentZoom} />
              <MapPointScreenTracker
                selectedPoint={selectedSpatialPoint}
                onScreenPositionChange={setPointScreenPos}
              />

              {/* 2D 视图下的全星座卫星空间惯性轨道投影折线与星位 Marker (与 3D 地球完全一致的数据源与动力学解算) */}
              {SATELLITE_CONSTELLATION_ITEMS.map((satItem) => {
                const isSelected = satItem.id === selectedSatelliteCode || satItem.code.toLowerCase() === (selectedSatelliteCode || '').toLowerCase();
                const isMain = satItem.id === 'scs-04-16';
                const trackSegments = calculateSatelliteGroundTrack(satItem, currentSatClock);
                const satPos = getSatelliteCurrentPosition(satItem, currentSatClock);

                return (
                  <React.Fragment key={`sat-2d-${satItem.id}`}>
                    {/* 卫星地面投影折线 */}
                    {trackSegments.map((segment, sIdx) => (
                      <Polyline
                        key={`sat-track-${satItem.id}-${sIdx}`}
                        positions={segment}
                        pathOptions={{
                          color: isSelected ? '#38bdf8' : (isMain ? '#38bdf8' : '#0ea5e9'),
                          weight: isSelected ? 2.2 : (isMain ? 1.6 : 1.2),
                          dashArray: isSelected ? '8 5' : (isMain ? '8 6' : '4 6'),
                          opacity: isSelected ? 0.95 : (isMain ? 0.65 : 0.35),
                        }}
                      />
                    ))}

                    {/* 卫星星体 Marker */}
                    {satPos && (
                      <Marker
                        position={[satPos.lat, satPos.lng]}
                        icon={createSatelliteConstellationIcon(satItem, isSelected)}
                        eventHandlers={{
                          click: () => handleSelectSatellite(satItem.id),
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* 2D 地图上叠置的遥感历史脚印多边形 */}
              {activeFootprint && activeFootprint.footprint && (
                <Polygon
                  positions={activeFootprint.footprint.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#38bdf8',
                    weight: 2,
                    opacity: 0.9,
                    fillColor: '#0284c7',
                    fillOpacity: 0.22,
                    dashArray: '6 4',
                  }}
                />
              )}

              {/* 2D 视图空间要素标绘：与 3D 完全一致的数据源 (火点 & 古建筑) */}
              {SPATIAL_MARKER_POINTS.map((point) => {
                const isFire = point.type === 'fire';
                if (isFire && !showFire3D) return null;
                if (!isFire && !showBuilding3D) return null;
                const isSelected = selectedSpatialPoint?.id === point.id;

                return (
                  <React.Fragment key={`spatial-marker-${point.id}`}>
                    {/* 火点不规则火区发光多边形 */}
                    {isFire && point.firePolygons && point.firePolygons.map((polyCoords, polyIdx) => {
                      const latLngs = polyCoords.map(([lng, lat]) => [lat, lng] as [number, number]);
                      const roundedLatLngs = smoothClosedRing(latLngs);
                      return (
                        <Polygon
                          key={`fire-poly-${point.id}-${polyIdx}`}
                          positions={roundedLatLngs}
                          pathOptions={{
                            color: '#ea580c',
                            weight: 1.5,
                            opacity: 0.95,
                            fillColor: '#f97316',
                            fillOpacity: 0.28,
                          }}
                          eventHandlers={{
                            click: () => {
                              handleSelectSpatialPoint(point);
                            },
                          }}
                        />
                      );
                    })}

                    {/* 标绘点 Marker */}
                    <Marker
                      position={[point.lat, point.lng]}
                      icon={createSpatialPointIcon(point.type, isSelected)}
                      eventHandlers={{
                        click: () => {
                          handleSelectSpatialPoint(point);
                        },
                      }}
                    />
                  </React.Fragment>
                );
              })}

              {/* 每日任务执行完毕的地图联动提示：对应经纬度短暂闪烁红点，动画结束后自动移除 */}
              {pulseMarkers.map((p, i) => (
                <Marker key={`pulse-${i}-${p.lat}-${p.lng}`} position={[p.lat, p.lng]} icon={createPulseIcon()} interactive={false} />
              ))}
            </MapContainer>

            {/* 2D 视图下的思维导图弹出层 */}
            {isMindMapOpen && selectedSpatialPoint && (
              <PointMindMapOverlay
                isOpen={isMindMapOpen}
                point={selectedSpatialPoint}
                screenPos={pointScreenPos}
                onClose={() => setIsMindMapOpen(false)}
                onSelectDataTypeLevel={(dataType, level, content) => {
                  console.log('Selected data type level:', dataType, level, content);
                }}
              />
            )}

            {/* 2D 视图下的历史数据列表抽屉 */}
            <HistoryDataDrawer
              isOpen={isDrawerOpen && selectedCategory !== null}
              onClose={() => setIsDrawerOpen(false)}
              currentCategory={selectedCategory || 'optical'}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectRecord={(rec) => setSelectedRecord(rec)}
              onOverlayFootprint={handleOverlayFootprint}
              activeFootprintRecordId={activeFootprint?.id}
            />

            {/* 2D 视图下的历史数据详情分析弹窗 */}
            <RecordDetailModal
              record={selectedRecord}
              onClose={() => setSelectedRecord(null)}
              onOverlayFootprint={handleOverlayFootprint}
              isFootprintActive={activeFootprint?.id === selectedRecord?.id}
            />
        </div>
      )}
    </div>
  )}
</div>
);
}

  // ── 默认应用卡片列表视图 ───────────────────────────────────────────────────────
  return (
    <div id="innovative-app-view" className="w-full h-full overflow-y-auto p-4 sm:p-6 text-left select-none animate-fadeIn bg-transparent text-slate-800 dark:text-slate-100 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
      {/* 应用卡片网格列表 (铺满全宽) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-5 w-full">
        {allApps.map((app) => {
          return (
            <div
              key={app.id}
              onClick={() => handleSelectApp(app)}
              className="group rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c101c]/95 hover:border-sky-400 dark:hover:border-sky-400/60 overflow-hidden flex flex-col transition-all cursor-pointer shadow-2xs hover:shadow-md dark:shadow-none hover:-translate-y-0.5"
            >
              {/* 1. 森林火情图 */}
              <div className="w-full aspect-video overflow-hidden bg-slate-950">
                <img
                  src={fireLwirPreviewImg}
                  alt={app.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                {/* 2. 标题 & 3. 合作单位 */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                    {app.title}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    合作单位: {app.cooperatingUnit}
                  </p>
                </div>

                {/* 4. 进入看板按钮 */}
                <div className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-50 group-hover:bg-sky-50 dark:bg-[#131b2e] dark:group-hover:bg-sky-500/20 text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-300 text-xs font-bold transition-colors flex items-center justify-between">
                  <span>进入看板</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

