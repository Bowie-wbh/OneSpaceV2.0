import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  SpatialMarkerPoint,
  RemoteSensingDataTypeBranch,
  RemoteSensingTableRecord,
  FIRE_DATA_TYPES,
  BUILDING_DATA_TYPES,
} from '../../data/mockRemoteSensingData';
import fireLwirPreviewImg from '../../assets/3D_1788272998_LWIR_full_preview.jpg';
import {
  ChevronRight,
  ChevronDown,
  Waves,
  Radio,
  Eye,
  Flame,
  Sparkles,
  Satellite,
  Building2,
  Database,
  X,
  FileText,
  Activity,
  Maximize2,
} from 'lucide-react';

interface PointMindMapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  point: SpatialMarkerPoint | null;
  screenPos: { x: number; y: number } | null;
  onSelectDataTypeLevel?: (dataType: string, level: string, content: string) => void;
}

// 节点层次数据接口（仅保留 1 级与 2 级）
interface Level2LayoutNode {
  id: string; // `${branchId}-${level.level}`
  level: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
  curvePath: string;
}

interface Level1LayoutNode {
  branch: RemoteSensingDataTypeBranch;
  side: 'left' | 'right';
  isExpanded: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
  curvePath: string;
  children: Level2LayoutNode[];
}

// 遥感数据类型图标与专属副标题映射
const getSensorMeta = (branchId: string, name: string) => {
  const idLower = branchId.toLowerCase();
  const nameLower = name.toLowerCase();

  if (idLower.includes('insar') || nameLower.includes('insar')) {
    return {
      title: 'InSAR',
      subtitle: '干涉雷达形变',
      icon: Waves,
    };
  }
  if (idLower.includes('sar') || nameLower.includes('sar')) {
    return {
      title: 'SAR 雷达',
      subtitle: '全天候微波成像',
      icon: Radio,
    };
  }
  if (idLower.includes('infrared') || nameLower.includes('红外')) {
    return {
      title: '红外遥感',
      subtitle: '热辐射与热异常',
      icon: Flame,
    };
  }
  if (idLower.includes('optical') || nameLower.includes('可见光')) {
    return {
      title: '可见光遥感',
      subtitle: '高分辨率正射影像',
      icon: Eye,
    };
  }
  if (idLower.includes('hyperspectral') || nameLower.includes('高光谱')) {
    return {
      title: '高光谱遥感',
      subtitle: '连续谱段微观诊断',
      icon: Sparkles,
    };
  }
  return {
    title: name,
    subtitle: '多源空间遥感',
    icon: Satellite,
  };
};

export const PointMindMapOverlay: React.FC<PointMindMapOverlayProps> = ({
  isOpen,
  onClose,
  point,
  screenPos,
  onSelectDataTypeLevel,
}) => {
  if (!isOpen || !point) return null;

  // 获取该点位关联的数据类型分支
  const branches: RemoteSensingDataTypeBranch[] = useMemo(() => {
    if (point.dataTypes && point.dataTypes.length > 0) {
      return point.dataTypes;
    }
    return point.type === 'fire' ? FIRE_DATA_TYPES : BUILDING_DATA_TYPES;
  }, [point]);

  // 1级展开状态：默认展开一级（点击后再展开对应二级处理级别）
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(() => new Set());

  // 当前选中的二级处理级别（点击二级卡片后，在画布中下方展示其结构化数据列表）
  const [selectedLevel2, setSelectedLevel2] = useState<{
    branchName: string;
    level: string;
    content: string;
    subDetails: string[];
    records: RemoteSensingTableRecord[];
  } | null>(null);

  // 点击列表中某一条记录，弹窗展示图片与遥感图文详情
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<{
    record: RemoteSensingTableRecord;
    branchName: string;
    level: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    setSelectedLevel2(null);
    setSelectedRecordDetail(null);
  }, [point.id]);

  // 切换一级分支展开/收起（二级处理级别点击后展开）
  const toggleType = (id: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 容器尺寸与中心点计算：必须以本组件所在容器（与 CesiumGlobe/2D 地图共享的同一父级定位容器）
  // 的实际渲染尺寸为基准，而非浏览器窗口尺寸——两者在存在侧边栏、顶部栏、圆角面板等布局时
  // 并不等宽等高，若沿用 window 尺寸做限幅/布局计算，会导致思维导图圆点与实际选中点位错位。
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const screenWidth = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const screenHeight = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight : 800);

  const originX = screenPos ? Math.max(40, Math.min(screenPos.x, screenWidth - 40)) : screenWidth * 0.5;
  const originY = screenPos ? Math.max(80, Math.min(screenPos.y, screenHeight - 80)) : screenHeight * 0.5;

  // 火苗/古建筑触点相对于圆点的可拖拽偏移量（切换点位时重置为默认展开位置）
  const [iconOffset, setIconOffset] = useState<{ dx: number; dy: number }>({ dx: 130, dy: -120 });
  const dragInfoRef = useRef<{ startMouseX: number; startMouseY: number; startDx: number; startDy: number } | null>(null);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    setIconOffset({ dx: 130, dy: -120 });
  }, [point.id]);

  const handleIconWindowMouseMove = useCallback((e: MouseEvent) => {
    const info = dragInfoRef.current;
    if (!info) return;
    const deltaX = e.clientX - info.startMouseX;
    const deltaY = e.clientY - info.startMouseY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      wasDraggingRef.current = true;
    }
    setIconOffset({ dx: info.startDx + deltaX, dy: info.startDy + deltaY });
  }, []);

  const handleIconWindowMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleIconWindowMouseMove);
    window.removeEventListener('mouseup', handleIconWindowMouseUp);
    dragInfoRef.current = null;
  }, [handleIconWindowMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleIconWindowMouseMove);
      window.removeEventListener('mouseup', handleIconWindowMouseUp);
    };
  }, [handleIconWindowMouseMove, handleIconWindowMouseUp]);

  const handleIconMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    wasDraggingRef.current = false;
    dragInfoRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startDx: iconOffset.dx,
      startDy: iconOffset.dy,
    };
    window.addEventListener('mousemove', handleIconWindowMouseMove);
    window.addEventListener('mouseup', handleIconWindowMouseUp);
  }, [iconOffset, handleIconWindowMouseMove, handleIconWindowMouseUp]);

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    onClose();
  }, [onClose]);

  // 可拖拽的火苗/古建筑触点屏幕坐标（思维导图各级分支均从此触点生长）
  const iconX = Math.max(50, Math.min(originX + iconOffset.dx, screenWidth - 50));
  const iconY = Math.max(60, Math.min(originY + iconOffset.dy, screenHeight - 60));

  // 统一的精致卡片尺寸规范（根据屏幕与容器分辨率在 2k 以下屏幕自适应缩小，防止重叠）
  const is2kOrAbove = screenWidth >= 2000 && screenHeight >= 1200;
  const isCompact = screenWidth < 1440;

  const nodeW1 = is2kOrAbove ? 186 : isCompact ? 142 : 158; // 一级卡片宽度
  const nodeH1 = is2kOrAbove ? 52 : isCompact ? 40 : 44;   // 一级卡片高度
  const nodeW2 = is2kOrAbove ? 216 : isCompact ? 156 : 178; // 二级卡片宽度
  const nodeH2 = is2kOrAbove ? 40 : isCompact ? 32 : 36;   // 二级卡片高度

  const gap1 = is2kOrAbove ? 72 : isCompact ? 42 : 52;     // 地球圆点到1级节点的引出间距
  const gap2 = is2kOrAbove ? 44 : isCompact ? 26 : 34;     // 1级卡片到2级卡片的层级间隙

  const verticalItemGap = is2kOrAbove ? 12 : isCompact ? 7 : 9; // 同级卡片垂直间距

  // 计算多级树状拓扑布局
  const layoutTree: Level1LayoutNode[] = useMemo(() => {
    const total = branches.length;
    if (total === 0) return [];

    const leftSpace = iconX;
    const rightSpace = screenWidth - iconX;
    const minRequiredSideSpace = nodeW1 + gap1 + 40;

    // 分流策略：依据点位左右空间分配分支
    let leftCount = 0;
    let rightCount = 0;
    if (leftSpace >= minRequiredSideSpace && rightSpace >= minRequiredSideSpace) {
      leftCount = Math.floor(total / 2);
      rightCount = total - leftCount;
    } else if (rightSpace >= minRequiredSideSpace) {
      leftCount = 0;
      rightCount = total;
    } else {
      leftCount = total;
      rightCount = 0;
    }

    const leftBranches = branches.slice(0, leftCount);
    const rightBranches = branches.slice(leftCount);

    const calcSide = (sideBranches: RemoteSensingDataTypeBranch[], side: 'left' | 'right'): Level1LayoutNode[] => {
      if (sideBranches.length === 0) return [];

      // 1. 计算每个一级分支内部由于二级展开所占用的总高度
      interface BranchMeasure {
        branch: RemoteSensingDataTypeBranch;
        isExpanded: boolean;
        totalHeight: number;
        level2Items: typeof sideBranches[0]['levels'];
      }

      const measures: BranchMeasure[] = sideBranches.map((b) => {
        const isExp = expandedTypes.has(b.id);
        if (!isExp) {
          return {
            branch: b,
            isExpanded: false,
            totalHeight: nodeH1,
            level2Items: [],
          };
        }

        const sumLvl2 =
          b.levels.length * nodeH2 + Math.max(0, b.levels.length - 1) * verticalItemGap;
        const totalH = Math.max(nodeH1, sumLvl2);

        return {
          branch: b,
          isExpanded: true,
          totalHeight: totalH,
          level2Items: b.levels,
        };
      });

      // 2. 侧边整体垂直居中锚定保护
      const sideTotalHeight =
        measures.reduce((acc, m) => acc + m.totalHeight, 0) +
        Math.max(0, measures.length - 1) * verticalItemGap;

      const minTop = 80;
      const maxBottom = screenHeight - 70;
      let sideCenterY = iconY;
      if (sideCenterY - sideTotalHeight / 2 < minTop) {
        sideCenterY = minTop + sideTotalHeight / 2;
      } else if (sideCenterY + sideTotalHeight / 2 > maxBottom) {
        sideCenterY = maxBottom - sideTotalHeight / 2;
      }

      let currentTop = sideCenterY - sideTotalHeight / 2;

      // 3. 计算坐标与贝塞尔引导光纤线
      return measures.map((m) => {
        const b = m.branch;
        const bTop = currentTop;
        const bHeight = m.totalHeight;
        currentTop += bHeight + verticalItemGap;

        const bCenterY = bTop + bHeight / 2;

        // 一级节点水平定位
        let x1: number;
        let c1StartX = iconX;
        let c1StartY = iconY;
        let c1EndX: number;
        let c1EndY = bCenterY;

        if (side === 'left') {
          x1 = iconX - gap1 - nodeW1;
          c1EndX = x1 + nodeW1; // 连至卡片右侧对接点
        } else {
          x1 = iconX + gap1;
          c1EndX = x1; // 连至卡片左侧对接点
        }

        const cx1a = side === 'left' ? c1StartX - gap1 * 0.55 : c1StartX + gap1 * 0.55;
        const cx1b = side === 'left' ? c1EndX + gap1 * 0.45 : c1EndX - gap1 * 0.45;
        const curvePath1 = `M ${c1StartX} ${c1StartY} C ${cx1a} ${c1StartY}, ${cx1b} ${c1EndY}, ${c1EndX} ${c1EndY}`;

        // 二级节点布局（当一级展开时向外水平延伸）
        const level2Nodes: Level2LayoutNode[] = [];
        if (m.isExpanded && m.level2Items.length > 0) {
          let lvl2Top = bTop;
          const x2 = side === 'left' ? x1 - gap2 - nodeW2 : x1 + nodeW1 + gap2;
          const lvl1AttachX = side === 'left' ? x1 : x1 + nodeW1;
          const lvl1AttachY = bCenterY;

          m.level2Items.forEach((lvl) => {
            const l2Height = nodeH2;
            const l2CenterY = lvl2Top + l2Height / 2;
            lvl2Top += l2Height + verticalItemGap;

            const l2AttachX = side === 'left' ? x2 + nodeW2 : x2;
            const cx2a = side === 'left' ? lvl1AttachX - gap2 * 0.5 : lvl1AttachX + gap2 * 0.5;
            const cx2b = side === 'left' ? l2AttachX + gap2 * 0.4 : l2AttachX - gap2 * 0.4;
            const curvePath2 = `M ${lvl1AttachX} ${lvl1AttachY} C ${cx2a} ${lvl1AttachY}, ${cx2b} ${l2CenterY}, ${l2AttachX} ${l2CenterY}`;

            level2Nodes.push({
              id: `${b.id}-${lvl.level}`,
              level: lvl.level,
              content: lvl.content,
              x: x2,
              y: l2CenterY - nodeH2 / 2,
              width: nodeW2,
              height: nodeH2,
              centerY: l2CenterY,
              curvePath: curvePath2,
            });
          });
        }

        return {
          branch: b,
          side,
          isExpanded: m.isExpanded,
          x: x1,
          y: bCenterY - nodeH1 / 2,
          width: nodeW1,
          height: nodeH1,
          centerY: bCenterY,
          curvePath: curvePath1,
          children: level2Nodes,
        };
      });
    };

    const leftNodes = calcSide(leftBranches, 'left');
    const rightNodes = calcSide(rightBranches, 'right');

    return [...leftNodes, ...rightNodes];
  }, [branches, expandedTypes, iconX, iconY, screenWidth, screenHeight]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-30 overflow-hidden font-sans select-none">
      {/* SVG 树形分支连线画布 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="branchGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 中心圆点脉冲光环 */}
        <circle
          cx={originX}
          cy={originY}
          r="9"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeOpacity="0.45"
          className="animate-ping"
        />
        <circle
          cx={originX}
          cy={originY}
          r="5"
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth="1.5"
        />

        {/* 圆点 -> 火苗/古建筑触点引出线 */}
        <line
          x1={originX}
          y1={originY}
          x2={iconX}
          y2={iconY}
          stroke="#38bdf8"
          strokeWidth="4"
          strokeOpacity="0.18"
          filter="url(#branchGlow)"
        />
        <line
          x1={originX}
          y1={originY}
          x2={iconX}
          y2={iconY}
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeOpacity="0.85"
          strokeDasharray="5 4"
        />

        {/* 渲染树状延伸连线（纯净统一的天蓝高科技光纤） */}
        {layoutTree.map((lvl1) => (
          <g key={`group-lvl1-${lvl1.branch.id}`}>
            {/* 1级主干连线：圆点 -> 1级卡片 */}
            <path
              d={lvl1.curvePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeOpacity="0.18"
              filter="url(#branchGlow)"
            />
            <path
              d={lvl1.curvePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.8"
              strokeOpacity="0.85"
            />

            {/* 2级连线：1级卡片 -> 2级处理级别卡片 */}
            {lvl1.children.map((lvl2) => (
              <g key={`group-lvl2-${lvl2.id}`}>
                <path
                  d={lvl2.curvePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeOpacity="0.15"
                  filter="url(#branchGlow)"
                />
                <path
                  d={lvl2.curvePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.4"
                  strokeOpacity="0.75"
                />
              </g>
            ))}
          </g>
        ))}
      </svg>

      {/* 中心交互触点（可拖拽的火苗/古建筑触点：思维导图各级分支跟随其位置生长） */}
      <div
        onMouseDown={handleIconMouseDown}
        onClick={handleIconClick}
        className="absolute z-40 pointer-events-auto -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group select-none"
        style={{ left: `${iconX}px`, top: `${iconY}px` }}
        title={`${point.name}（可拖拽移动 / 点击收起思维导图）`}
      >
        {/* 外圈高亮脉冲光圈 */}
        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl border shadow-2xl transition-all duration-300 group-hover:scale-110 ${
          point.type === 'fire'
            ? 'bg-gradient-to-br from-red-600/90 via-orange-600/85 to-slate-900/90 border-red-400 shadow-[0_0_24px_rgba(239,68,68,0.7)]'
            : 'bg-gradient-to-br from-amber-700/90 via-yellow-800/85 to-slate-900/90 border-amber-400 shadow-[0_0_24px_rgba(217,119,6,0.7)]'
        }`}>
          {/* 扩散波纹动画 */}
          <span className={`absolute inset-0 rounded-2xl animate-ping opacity-60 pointer-events-none ${
            point.type === 'fire' ? 'bg-red-500/40' : 'bg-amber-500/40'
          }`} />

          {/* 图标：火苗或古建筑 */}
          {point.type === 'fire' ? (
            <Flame className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-pulse" />
          ) : (
            <Building2 className="w-6 h-6 text-amber-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
          )}
        </div>

        {/* 下方目标名称小徽章 */}
        <div className="absolute top-[52px] whitespace-nowrap px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-slate-700/80 shadow-lg text-[10px] font-bold text-slate-100 backdrop-blur-md pointer-events-none">
          {point.name}
        </div>
      </div>

      {/* 3. 交互式思维导图节点层 */}
      {layoutTree.map((lvl1) => {
        const meta = getSensorMeta(lvl1.branch.id, lvl1.branch.name);

        return (
          <React.Fragment key={`nodes-${lvl1.branch.id}`}>
            {/* 一级卡片：统一玻璃质感高科技卡片 */}
            <div
              onClick={() => toggleType(lvl1.branch.id)}
              className={`absolute pointer-events-auto rounded-2xl px-3.5 py-2.5 bg-black/55 backdrop-blur-2xl shadow-2xl transition-all duration-200 hover:scale-[1.025] cursor-pointer flex items-center justify-between gap-3 group border ${
                lvl1.isExpanded
                  ? 'border-cyan-400/70 shadow-cyan-500/20 ring-1 ring-cyan-400/30'
                  : 'border-white/15 hover:border-slate-500/80 shadow-black/40'
              }`}
              style={{
                left: `${lvl1.x}px`,
                top: `${lvl1.y}px`,
                width: `${lvl1.width}px`,
                height: `${lvl1.height}px`,
              }}
              title={lvl1.isExpanded ? '点击收起处理级别' : '点击展开处理级别 (L1~L4)'}
            >
              {/* 卡片内侧微弱色彩光晕渐变背景 */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-tr from-cyan-500/10 via-transparent to-indigo-500/10 opacity-70 group-hover:opacity-100 transition-opacity" />

              {/* 连线内侧微小对接点 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 border border-white shadow-[0_0_8px_#38bdf8]"
                style={{
                  [lvl1.side === 'left' ? 'right' : 'left']: '-4px',
                }}
              />

              {/* 左侧：名称与副标题 */}
              <div className="flex items-center gap-2.5 min-w-0 z-10">
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white tracking-wide truncate">
                      {meta.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300/80 truncate leading-tight mt-0.5 font-normal">
                    {meta.subtitle}
                  </span>
                </div>
              </div>

              {/* 右侧：展开胶囊徽章 */}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all flex-shrink-0 z-10 border ${
                lvl1.isExpanded
                  ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                  : 'bg-slate-800/70 text-slate-300 border-slate-700/60 group-hover:border-slate-500'
              }`}>
                <span>{lvl1.branch.levels.length}级</span>
                {lvl1.isExpanded ? (
                  <ChevronDown className="w-3 h-3 transition-transform" />
                ) : (
                  <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
            </div>

            {/* 二级卡片：点击一级展开的 L1~L4 处理级别（统一玻璃质感半透明设计） */}
            {lvl1.children.map((lvl2) => {
              const isSelected = selectedLevel2?.branchName === lvl1.branch.name && selectedLevel2?.level === lvl2.level;
              return (
                <div
                  key={`node-lvl2-${lvl2.id}`}
                  onClick={() => {
                    const targetLevel = lvl1.branch.levels.find((lv) => lv.level === lvl2.level);
                    onSelectDataTypeLevel?.(lvl1.branch.name, lvl2.level, lvl2.content);
                    setSelectedLevel2({
                      branchName: lvl1.branch.name,
                      level: lvl2.level,
                      content: lvl2.content,
                      subDetails: targetLevel?.subDetails ?? [],
                      records: targetLevel?.records ?? [
                        {
                          time: '2026-09-10 10:24:05',
                          location: point.name,
                          lng: `${point.lng.toFixed(2)}°E`,
                          lat: `${point.lat.toFixed(2)}°N`,
                          landType: point.type === 'fire' ? '针叶林' : '建筑用地',
                          source: point.details.satellite || '云尖沐曦号',
                        },
                        {
                          time: '2026-09-10 06:15:30',
                          location: point.name,
                          lng: `${point.lng.toFixed(2)}°E`,
                          lat: `${point.lat.toFixed(2)}°N`,
                          landType: point.type === 'fire' ? '针叶林' : '古建群落',
                          source: '之江天目01号',
                        },
                      ],
                    });
                  }}
                  className={`absolute pointer-events-auto rounded-xl px-3 py-2 backdrop-blur-2xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 group ${
                    isSelected
                      ? 'bg-cyan-950/75 border-2 border-cyan-400 shadow-[0_0_18px_rgba(56,189,248,0.45)] scale-[1.03]'
                      : 'bg-black/55 hover:bg-black/65 border border-white/15 hover:border-cyan-400/60 shadow-xl hover:scale-[1.02]'
                  }`}
                  style={{
                    left: `${lvl2.x}px`,
                    top: `${lvl2.y}px`,
                    width: `${lvl2.width}px`,
                    height: `${lvl2.height}px`,
                  }}
                  title={`${lvl2.level}: ${lvl2.content}`}
                >
                  {/* 连线对接端微小锚点 */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border transition-all ${
                      isSelected
                        ? 'bg-cyan-300 border-white shadow-[0_0_6px_#38bdf8] scale-125'
                        : 'bg-cyan-400 border-white'
                    }`}
                    style={{
                      [lvl1.side === 'left' ? 'right' : 'left']: '-3px',
                    }}
                  />

                  <div className="flex items-center gap-2.5 min-w-0 z-10">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950 shadow-sm font-extrabold'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      }`}
                    >
                      {lvl2.level}
                    </span>
                    <span
                      className={`text-[11px] truncate font-medium transition-colors ${
                        isSelected ? 'text-cyan-100 font-bold' : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {lvl2.content}
                    </span>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* 二级数据列表面板：点击二级处理级别后，放置在左下角工具栏右侧，半透明毛玻璃，在 2k 以下屏幕自适应更紧凑，避免遮挡左下角按钮 */}
      {selectedLevel2 && (
        <div className="absolute left-16 sm:left-20 bottom-3 sm:bottom-4 pointer-events-auto z-40 w-[480px] lg:w-[540px] 2xl:w-[620px] max-w-[calc(100vw-6rem)] rounded-xl sm:rounded-2xl bg-black/60 border border-white/15 backdrop-blur-2xl shadow-2xl animate-fadeIn overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/15 bg-white/[0.04]">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Database className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex-shrink-0">
                {selectedLevel2.level}
              </span>
              <span className="text-xs font-bold text-white truncate">
                {selectedLevel2.branchName} · {selectedLevel2.content}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLevel2(null)}
              className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-44 sm:max-h-52 2xl:max-h-60 overflow-y-auto custom-scrollbar">
            {selectedLevel2.records && selectedLevel2.records.length > 0 ? (
              <table className="w-full text-left text-[11px] 2xl:text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] 2xl:text-[11px] text-slate-400">
                    <th className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2 font-medium whitespace-nowrap">时间</th>
                    <th className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2 font-medium whitespace-nowrap">地点</th>
                    <th className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2 font-medium whitespace-nowrap">经度</th>
                    <th className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2 font-medium whitespace-nowrap">纬度</th>
                    <th className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2 font-medium whitespace-nowrap">土地类型</th>
                    <th className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2 font-medium whitespace-nowrap">数据来源（卫星）</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {selectedLevel2.records.map((item, idx) => (
                    <tr
                      key={`${selectedLevel2.level}-${idx}`}
                      onClick={() => {
                        setSelectedRecordDetail({
                          record: item,
                          branchName: selectedLevel2.branchName,
                          level: selectedLevel2.level,
                          content: selectedLevel2.content,
                        });
                      }}
                      className="hover:bg-cyan-500/10 cursor-pointer transition-colors text-[10px] 2xl:text-[11px] text-slate-200 group/row"
                      title="点击查看遥感影像详情与反演分析"
                    >
                      <td className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2.5 font-mono text-slate-300 whitespace-nowrap group-hover/row:text-cyan-200">{item.time}</td>
                      <td className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2.5 text-white font-medium whitespace-nowrap group-hover/row:text-cyan-100">{item.location}</td>
                      <td className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2.5 font-mono text-slate-300 whitespace-nowrap">{item.lng}</td>
                      <td className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2.5 font-mono text-slate-300 whitespace-nowrap">{item.lat}</td>
                      <td className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[9px] 2xl:text-[10px]">
                          {item.landType}
                        </span>
                      </td>
                      <td className="px-2.5 2xl:px-3.5 py-1.5 2xl:py-2.5 text-cyan-300 font-medium whitespace-nowrap flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <Satellite className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{item.source}</span>
                        </div>
                        <span className="text-[9px] 2xl:text-[10px] text-slate-400 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-0.5">
                          详情 <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-[10px] 2xl:text-[11px] text-slate-400 text-center py-3 sm:py-4">暂无数据记录</div>
            )}
          </div>
        </div>
      )}
      {/* 3. 点击表格行弹出的遥感图片图文详情分析弹窗 (通过 createPortal 挂载到 document.body 顶层) */}
      {selectedRecordDetail && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn pointer-events-auto select-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRecordDetail(null);
            }
          }}
        >
          <div className="relative w-full max-w-md sm:max-w-2xl max-h-[90vh] bg-[#0c101c]/95 border border-white/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-y-auto flex flex-col text-left">
            {/* Header 顶栏 */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-white/[0.03] shrink-0 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shrink-0">
                  {selectedRecordDetail.level}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-100 truncate">
                    {selectedRecordDetail.record.location} · {selectedRecordDetail.branchName} · {selectedRecordDetail.content}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedRecordDetail.record.time} · {selectedRecordDetail.record.lng}, {selectedRecordDetail.record.lat}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="关闭详情"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 内容区：左图右文版式 */}
            <div className="flex flex-col sm:flex-row sm:min-h-0">
              {/* 左侧遥感图片 */}
              <div className="relative sm:w-1/2 shrink-0 aspect-square sm:aspect-auto sm:min-h-[260px] bg-slate-950 overflow-hidden group border-b sm:border-b-0 sm:border-r border-white/10">
                <img
                  src={selectedRecordDetail.record.imageUrl || fireLwirPreviewImg}
                  alt={selectedRecordDetail.record.caption || selectedRecordDetail.record.location}
                  className="w-full h-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.18)_3px,rgba(0,0,0,0.18)_4px)]" />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent">
                  <span className="text-[11px] font-mono text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{selectedRecordDetail.record.caption || `${selectedRecordDetail.record.location} · 遥感影像`}</span>
                  </span>
                </div>
              </div>

              {/* 右侧统计指标 */}
              <div className="flex-1 min-w-0 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">拍摄时间</span>
                    <span className="text-xs font-bold text-slate-200 truncate font-mono">
                      {selectedRecordDetail.record.time}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">数据来源</span>
                    <span className="text-xs font-bold text-cyan-300 truncate flex items-center gap-1">
                      <Satellite className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{selectedRecordDetail.record.source}</span>
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">是否有火点</span>
                    <span className={`text-xs font-bold truncate flex items-center gap-1 ${
                      selectedRecordDetail.record.hasFire ?? (point.type === 'fire' && selectedRecordDetail.level === 'L4')
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedRecordDetail.record.hasFire ?? (point.type === 'fire' && selectedRecordDetail.level === 'L4')
                          ? 'bg-rose-500 animate-pulse'
                          : 'bg-emerald-400'
                      }`} />
                      <span>
                        {selectedRecordDetail.record.hasFire !== undefined
                          ? (selectedRecordDetail.record.hasFire ? '有火情 (已识别)' : '未发现火点')
                          : (point.type === 'fire' && selectedRecordDetail.level === 'L4' ? '有火情 (已识别)' : '未发现火点')}
                      </span>
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">火情面积</span>
                    <span className="text-xs font-bold text-amber-300 truncate font-mono">
                      {selectedRecordDetail.record.fireArea || (
                        (selectedRecordDetail.record.hasFire ?? (point.type === 'fire' && selectedRecordDetail.level === 'L4'))
                          ? '13.2 km²'
                          : '0 km²'
                      )}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">土地类型</span>
                    <span className="text-xs font-bold text-sky-300 truncate">
                      {selectedRecordDetail.record.landType}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">地理坐标</span>
                    <span className="text-xs font-bold text-slate-200 truncate font-mono">
                      {selectedRecordDetail.record.lng}, {selectedRecordDetail.record.lat}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 font-mono">
                    <Activity className="w-3.5 h-3.5" />
                    <span>智能解译分析</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedRecordDetail.record.analysis || `${selectedRecordDetail.record.location}在轨观测完成，星载模型已完成数据校准与特征目标定位反演。`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
