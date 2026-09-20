import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as satellite from 'satellite.js';
import { 
  FENGHUANG_COORDS, 
  FENGHUANG_LANDMARKS, 
  EARTH_OBJECTS, 
  EarthObject,
  SPATIAL_MARKER_POINTS,
  SpatialMarkerPoint,
  MarkerType,
  smoothClosedRing,
  SATELLITE_CONSTELLATION_ITEMS,
  ConstellationSatelliteItem,
} from '../../data/mockRemoteSensingData';
import { HistoryRecord } from '../../types/earthDemoTypes';
import { 
  Globe, 
  Sun, 
  Moon, 
  Compass, 
  Sparkles,
  Flame,
  Building2
} from 'lucide-react';

declare const Cesium: any;

// 生成简洁火点小圆点 Canvas (与 2D 视图配色/选中态完全一致：圆点尺寸恒定，选中态仅叠加光圈与发光)
const createFireMarkerCanvas = (isSelected = false): string => {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;
  const dotRadius = 9.5; // 与 2D 圆点尺寸恒定保持一致，选中态不放大
  const dotColor = '#dc2626';
  const ringColor = 'rgba(239, 68, 68, 0.55)';
  const glowColor = 'rgba(239, 68, 68, 0.85)';

  // 选中态外圈光圈（对应 2D box-shadow 0 0 0 4px 环形高亮）
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cx, cy, dotRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // 发光柔光晕（对应 2D box-shadow 模糊光晕，未选中态更弱）
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isSelected ? 12 : 6;
  ctx.beginPath();
  ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();
  ctx.restore();

  // 纯白高反差细边框
  ctx.beginPath();
  ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  return canvas.toDataURL();
};

// 生成简洁古建筑小圆点 Canvas (与 2D 视图配色/选中态完全一致：圆点尺寸恒定，选中态仅叠加光圈与发光)
const createBuildingMarkerCanvas = (isSelected = false): string => {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;
  const dotRadius = 9.5; // 与 2D 圆点尺寸恒定保持一致，选中态不放大
  const dotColor = '#8b4513';
  const ringColor = 'rgba(217, 119, 6, 0.55)';
  const glowColor = 'rgba(217, 119, 6, 0.85)';

  // 选中态外圈光圈（对应 2D box-shadow 0 0 0 4px 环形高亮）
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cx, cy, dotRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // 发光柔光晕（对应 2D box-shadow 模糊光晕，未选中态更弱）
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isSelected ? 12 : 6;
  ctx.beginPath();
  ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();
  ctx.restore();

  // 纯白高反差细边框
  ctx.beginPath();
  ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  return canvas.toDataURL();
};

// 生成卫星图标 Canvas (极简卫星本体 + 两侧太阳能板，选中状态与火点/建筑标绘统一采用外圈光圈 + 柔光晕视觉语言)
const createSatelliteMarkerCanvas = (isSelected = false): string => {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;
  const color = '#38bdf8';
  const ringColor = 'rgba(56, 189, 248, 0.55)';
  const glowColor = 'rgba(56, 189, 248, 0.85)';
  const bodyRadius = 11; // 卫星本体外接半径，作为选中光圈基准，与火点/建筑标绘尺寸比例保持一致

  // 选中态外圈光圈（与火点/建筑标绘选中态视觉语言保持一致）
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cx, cy, bodyRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isSelected ? 12 : 4;
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);

  // 两侧太阳能板
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.fillRect(-9, -2.5, 5, 5);
  ctx.strokeRect(-9, -2.5, 5, 5);
  ctx.fillRect(4, -2.5, 5, 5);
  ctx.strokeRect(4, -2.5, 5, 5);

  // 连接杆
  ctx.fillRect(-4, -0.75, 8, 1.5);

  // 卫星本体
  ctx.beginPath();
  ctx.rect(-2.5, -2.5, 5, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();

  return canvas.toDataURL();
};

// 卫星真彩色底图图层构建函数（使用 Cesium 1.125 官方标准的 ArcGisMapServerImageryProvider.fromUrl 异步提供器及双重保险备用）
const createSatelliteBaseLayer = () => {
  try {
    if (Cesium.ArcGisMapServerImageryProvider && typeof Cesium.ArcGisMapServerImageryProvider.fromUrl === 'function') {
      const providerPromise = Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        {
          enablePickFeatures: false,
          usePreCachedTilesIfAvailable: true,
        }
      );
      return Cesium.ImageryLayer.fromProviderAsync(providerPromise);
    }
  } catch (err) {
    console.warn('Failed to initialize ArcGisMapServerImageryProvider fromUrl:', err);
  }

  // 备用：基于切片服务模板的卫星影像图层
  const fallbackProvider = new Cesium.UrlTemplateImageryProvider({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maximumLevel: 19,
    credit: '© Esri, Earthstar Geographics',
  });
  return new Cesium.ImageryLayer(fallbackProvider);
};

interface CesiumGlobeProps {
  onFenghuangClick: () => void;
  onResetGlobal?: () => void;
  isFocusedOnFenghuang: boolean;
  selectedRecord: HistoryRecord | null;
  activeFootprint: HistoryRecord | null;
  onClearFootprint?: () => void;
  isMindMapOpen: boolean;
  onToggleMindMap: (open?: boolean) => void;
  currentEarthObject?: EarthObject;
  showFire?: boolean;
  showBuilding?: boolean;
  selectedPointId?: string | null;
  onSelectPoint?: (point: SpatialMarkerPoint) => void;
  targetFlyPoint?: SpatialMarkerPoint | null;
  onPointScreenPositionChange?: (pos: { x: number; y: number } | null) => void;
  viewDimension?: '3d' | '2d';
  onToggleDimension?: () => void;
  onSelectSatellite?: (code: string) => void;
  selectedSatelliteId?: string | null;
}

export const CesiumGlobe: React.FC<CesiumGlobeProps> = ({
  onFenghuangClick,
  onResetGlobal,
  isFocusedOnFenghuang,
  selectedRecord,
  activeFootprint,
  isMindMapOpen,
  onToggleMindMap,
  currentEarthObject = EARTH_OBJECTS[0],
  showFire = true,
  showBuilding = true,
  selectedPointId = null,
  onSelectPoint,
  targetFlyPoint = null,
  onPointScreenPositionChange,
  viewDimension = '3d',
  onToggleDimension,
  onSelectSatellite,
  selectedSatelliteId = 'scs-04-16',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const footprintEntityRef = useRef<any>(null);
  const spatialEntitiesRef = useRef<any[]>([]);
  const firePolygonEntitiesRef = useRef<any[]>([]);
  const isFlyingRef = useRef<boolean>(false);

  // 标绘图标引用 (普通与高亮选中状态)
  const fireNormalUrlRef = useRef<string>('');
  const fireSelectedUrlRef = useRef<string>('');
  const buildingNormalUrlRef = useRef<string>('');
  const buildingSelectedUrlRef = useRef<string>('');

  // 卫星图标引用与实体集合引用 (支持全星座 12 颗计算星 + SCS-04-16)
  const satelliteNormalUrlRef = useRef<string>('');
  const satelliteSelectedUrlRef = useRef<string>('');
  const satelliteEntitiesRef = useRef<{ id: string; code: string; entity: any; orbitEntity: any }[]>([]);

  const [cesiumReady, setCesiumReady] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraAltitude, setCameraAltitude] = useState<string>('18,000 km');
  const [isDaylight, setIsDaylight] = useState<boolean>(true);
  const [internalSelectedSatId, setInternalSelectedSatId] = useState<string>(selectedSatelliteId || 'scs-04-16');

  useEffect(() => {
    if (selectedSatelliteId) {
      setInternalSelectedSatId(selectedSatelliteId);
    }
  }, [selectedSatelliteId]);

  // 状态引用保证事件闭包中获取最新状态
  const isMindMapOpenRef = useRef(isMindMapOpen);
  useEffect(() => {
    isMindMapOpenRef.current = isMindMapOpen;
  }, [isMindMapOpen]);

  const onToggleMindMapRef = useRef(onToggleMindMap);
  useEffect(() => {
    onToggleMindMapRef.current = onToggleMindMap;
  }, [onToggleMindMap]);

  const isFocusedOnFenghuangRef = useRef(isFocusedOnFenghuang);
  useEffect(() => {
    isFocusedOnFenghuangRef.current = isFocusedOnFenghuang;
  }, [isFocusedOnFenghuang]);

  const showFireRef = useRef(showFire);
  useEffect(() => {
    showFireRef.current = showFire;
  }, [showFire]);

  const showBuildingRef = useRef(showBuilding);
  useEffect(() => {
    showBuildingRef.current = showBuilding;
  }, [showBuilding]);

  const selectedPointIdRef = useRef(selectedPointId);
  useEffect(() => {
    selectedPointIdRef.current = selectedPointId;
  }, [selectedPointId]);

  const onSelectPointRef = useRef(onSelectPoint);
  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  const onSelectSatelliteRef = useRef(onSelectSatellite);
  useEffect(() => {
    onSelectSatelliteRef.current = onSelectSatellite;
  }, [onSelectSatellite]);

  const onPointScreenPositionChangeRef = useRef(onPointScreenPositionChange);
  useEffect(() => {
    onPointScreenPositionChangeRef.current = onPointScreenPositionChange;
  }, [onPointScreenPositionChange]);

  const handleFlyToFenghuangRef = useRef<() => void>(() => {});
  const flyToPointRef = useRef<(point: SpatialMarkerPoint, onComplete?: () => void) => void>(() => {});

  // 平滑飞往指定的空间要素标绘点（以目标点为中心直接放大，绝不旋转地球）
  const flyToPoint = useCallback((point: SpatialMarkerPoint, onComplete?: () => void) => {
    if (!viewerRef.current || isFlyingRef.current) return;
    const viewer = viewerRef.current;
    isFlyingRef.current = true;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        point.lng,
        point.lat,
        point.type === 'fire' ? 1800 : 2000
      ),
      orientation: {
        heading: 0.0, // 保持正北朝上，绝不旋转偏航角
        pitch: Cesium.Math.toRadians(-89.5), // 垂直正射俯视，绝不产生倾角晃动
        roll: 0.0,
      },
      duration: 1.4,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      complete: () => {
        isFlyingRef.current = false;
        onFenghuangClick();
        onComplete?.();
      },
      cancel: () => {
        isFlyingRef.current = false;
      },
    });
  }, [onFenghuangClick]);

  useEffect(() => {
    flyToPointRef.current = flyToPoint;
  }, [flyToPoint]);

  // 当外部传入 targetFlyPoint 时触发相机飞行
  useEffect(() => {
    if (targetFlyPoint && cesiumReady) {
      flyToPoint(targetFlyPoint);
    }
  }, [targetFlyPoint, cesiumReady, flyToPoint]);

  // 初始化 Cesium
  useEffect(() => {
    let checkInterval: any = null;
    let attempts = 0;

    const initViewer = () => {
      if (typeof Cesium === 'undefined') {
        if (attempts > 30) {
          setLoadError('未能加载三维地球引擎 (CesiumJS)，请检查网络连接或刷新页面。');
          return;
        }
        attempts++;
        return;
      }

      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }

      if (viewerRef.current || !containerRef.current) return;

      try {
        const esriBaseLayer = createSatelliteBaseLayer();

        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayer: esriBaseLayer,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          infoBox: false,
          selectionIndicator: false,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          skyAtmosphere: new Cesium.SkyAtmosphere(),
        });

        // 监听底图就绪与容错回退
        if (esriBaseLayer && esriBaseLayer.errorEvent) {
          esriBaseLayer.errorEvent.addEventListener((err: any) => {
            console.warn('Esri World Imagery async load failed, fallback to direct tile URL:', err);
            if (viewer && !viewer.isDestroyed()) {
              viewer.imageryLayers.removeAll();
              viewer.imageryLayers.addImageryProvider(
                new Cesium.UrlTemplateImageryProvider({
                  url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                  maximumLevel: 19,
                  credit: '© Esri, Earthstar Geographics',
                })
              );
            }
          });
        }

        viewerRef.current = viewer;

        const scene = viewer.scene;
        const globe = scene.globe;

        globe.enableLighting = true;
        scene.globe.depthTestAgainstTerrain = false;
        scene.highDynamicRange = true;

        scene.screenSpaceCameraController.minimumZoomDistance = 80;
        scene.screenSpaceCameraController.maximumZoomDistance = 35000000;
        // 关键控制：以鼠标为中心直接缩放，降低惯性漂移，禁用倾斜自动旋转
        scene.screenSpaceCameraController.inertiaSpin = 0.05;
        scene.screenSpaceCameraController.inertiaZoom = 0.05;
        scene.screenSpaceCameraController.inertiaTranslate = 0.05;
        scene.screenSpaceCameraController.enableTilt = false;

        // 初始太空全景相机视角（正射垂直俯瞰中国上空，正北朝上）
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(108.0, 26.0, 16000000),
          orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-89.5),
            roll: 0.0,
          },
        });

        // 移除 Cesium 默认的双击斜角旋转事件
        viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // 添加空间要素标绘：火苗(火点检测)与建筑(建筑群)
        addSpatialMarkers(viewer);

        // 添加环绕地球的卫星轨道与实时卫星图标 (SCS-04-16, 基于真实 TLE 根数 SGP4 解算)
        addSatelliteOrbit(viewer);

        // 监听点击事件：
        // 1. 点击火苗标点：拉进到火点位置并通知选中
        // 2. 点击建筑标点：先拉进到对应位置；拉进到位后再次点击，才出现思维导图（再次点击可收起）
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        // 双击任意位置：以鼠标点击处为中心直接正对放大，不旋转角度
        handler.setInputAction((click: any) => {
          if (isFlyingRef.current) return;
          const ray = viewer.camera.getPickRay(click.position);
          const cartesian = viewer.scene.globe.pick(ray, viewer.scene) || viewer.camera.pickEllipsoid(click.position);
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const targetLng = Cesium.Math.toDegrees(cartographic.longitude);
            const targetLat = Cesium.Math.toDegrees(cartographic.latitude);
            const currentHeight = viewer.camera.positionCartographic.height;
            const targetHeight = Math.max(currentHeight * 0.35, 600);

            isFlyingRef.current = true;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(targetLng, targetLat, targetHeight),
              orientation: {
                heading: 0.0,
                pitch: Cesium.Math.toRadians(-89.5),
                roll: 0.0,
              },
              duration: 1.0,
              easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
              complete: () => {
                isFlyingRef.current = false;
              },
              cancel: () => {
                isFlyingRef.current = false;
              },
            });
          }
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        handler.setInputAction((click: any) => {
          if (isFlyingRef.current) return;
          const pickedObject = viewer.scene.pick(click.position);
          if (Cesium.defined(pickedObject) && pickedObject.id) {
            const id = pickedObject.id.id;

            // 匹配空间要素标绘点 (红色火点 / 棕色古建筑) 或点击火区多边形
            let pointId: string | null = null;
            if (typeof id === 'string' && id.startsWith('spatial-marker-')) {
              pointId = id.replace('spatial-marker-', '');
            } else if (typeof id === 'string' && id.startsWith('fire-polygon-')) {
              // 匹配火区多边形 fire-polygon-${firePoint.id}-${polyIdx}
              const parts = id.split('-');
              if (parts.length >= 3) {
                pointId = parts.slice(2, -1).join('-');
              }
            }

            if (pointId) {
              const point = SPATIAL_MARKER_POINTS.find((p) => p.id === pointId);
              if (point) {
                onSelectPointRef.current?.(point);
                if (viewer.scene?.canvas) {
                  // PointMindMapOverlay 与 Cesium 画布容器共享同一父级坐标系，直接使用画布内坐标即可对齐
                  onPointScreenPositionChangeRef.current?.({
                    x: click.position.x,
                    y: click.position.y,
                  });
                }
                const currentHeight = viewer.camera.positionCartographic.height;
                // 若地球当前处于远景太空视角（高度大于 45000 米），以正射垂直视角直接拉近放大
                if (currentHeight > 45000) {
                  flyToPointRef.current(point, () => {
                    // 拉近到位放大后，从小圆点自然延伸出思维导图
                    onToggleMindMapRef.current(true);
                  });
                } else {
                  // 地球放大后：点击同一个选中的点位且导图已展开时收起；否则展开
                  if (selectedPointIdRef.current === point.id && isMindMapOpenRef.current) {
                    onToggleMindMapRef.current(false);
                  } else {
                    onToggleMindMapRef.current(true);
                  }
                }
                return;
              }
            }

            // 匹配卫星图标：切换高亮选中状态，并通知外部卫星数据看板展示该卫星数据
            if (typeof id === 'string' && id.startsWith('satellite-')) {
              const clickedSatId = id.replace('satellite-', '');
              setInternalSelectedSatId(clickedSatId);
              onSelectSatelliteRef.current?.(clickedSatId);
              return;
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // 鼠标悬停标点时显示手型指针
        handler.setInputAction((movement: any) => {
          const pickedObject = viewer.scene.pick(movement.endPosition);
          if (Cesium.defined(pickedObject) && pickedObject.id) {
            const id = pickedObject.id.id;
            if (typeof id === 'string' && (id.startsWith('spatial-marker-') || id.startsWith('satellite-'))) {
              viewer.scene.canvas.style.cursor = 'pointer';
              return;
            }
          }
          viewer.scene.canvas.style.cursor = 'default';
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // 监听相机移动更新高度读数
        viewer.camera.moveEnd.addEventListener(() => {
          if (!viewer || viewer.isDestroyed()) return;
          const height = viewer.camera.positionCartographic.height;
          if (height > 1000000) {
            setCameraAltitude(`${Math.round(height / 1000).toLocaleString()} km`);
          } else {
            setCameraAltitude(`${Math.round(height).toLocaleString()} m`);
          }
        });

        // 实时追踪选中点位在屏幕上的像素坐标，供思维导图连线锚定
        viewer.scene.postRender.addEventListener(() => {
          try {
            if (!viewer || viewer.isDestroyed()) return;
            const currentPointId = selectedPointIdRef.current;
            if (!currentPointId) {
              onPointScreenPositionChangeRef.current?.(null);
              return;
            }
            const pt = SPATIAL_MARKER_POINTS.find((p) => p.id === currentPointId);
            if (!pt) {
              onPointScreenPositionChangeRef.current?.(null);
              return;
            }
            const cartesian = Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, 0);
            const transformFn =
              Cesium.SceneTransforms?.worldToWindowCoordinates ||
              Cesium.SceneTransforms?.wgs84ToWindowCoordinates;
            const canvasPos = transformFn
              ? transformFn.call(Cesium.SceneTransforms, viewer.scene, cartesian)
              : null;

            if (canvasPos && viewer.scene?.canvas) {
              const toPoint = Cesium.Cartesian3.subtract(cartesian, viewer.camera.position, new Cesium.Cartesian3());
              const dot = Cesium.Cartesian3.dot(toPoint, viewer.camera.direction);
              
              // 检查点位是否被地球遮挡（处于地球背面）
              let isOccluded = false;
              try {
                const occluder = new Cesium.EllipsoidalOccluder(
                  viewer.scene.globe.ellipsoid,
                  viewer.camera.position
                );
                isOccluded = !occluder.isPointVisible(cartesian);
              } catch (occlErr) {
                // 如果遮挡器计算失败，回退到 dot 判断
              }

              if (dot > 0 && !isOccluded) {
                // PointMindMapOverlay 与 Cesium 画布容器共享同一父级坐标系，直接使用画布内坐标即可对齐
                onPointScreenPositionChangeRef.current?.({
                  x: canvasPos.x,
                  y: canvasPos.y,
                });
              } else {
                onPointScreenPositionChangeRef.current?.(null);
              }
            } else {
              onPointScreenPositionChangeRef.current?.(null);
            }
          } catch (e) {
            // 忽略逐帧变换计算中的异常，避免阻断 Cesium 主渲染管线
            onPointScreenPositionChangeRef.current?.(null);
          }
        });

        setCesiumReady(true);
      } catch (err: any) {
        console.error('Cesium init error:', err);
        setLoadError('三维地球渲染管线初始化异常: ' + (err?.message || 'WebGL context lost'));
      }
    };

    checkInterval = setInterval(initViewer, 200);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 添加空间标绘实体：火苗图标 (火点检测) 和 建筑图标 (建筑群)
  const addSpatialMarkers = (viewer: any) => {
    fireNormalUrlRef.current = createFireMarkerCanvas(false);
    fireSelectedUrlRef.current = createFireMarkerCanvas(true);
    buildingNormalUrlRef.current = createBuildingMarkerCanvas(false);
    buildingSelectedUrlRef.current = createBuildingMarkerCanvas(true);

    const fireCanvasUrl = fireNormalUrlRef.current;
    const buildingCanvasUrl = buildingNormalUrlRef.current;

    // 遍历添加火苗与古建筑简洁圆点实体 (红色火点，棕色古建筑，简洁纯圆点)
    spatialEntitiesRef.current = SPATIAL_MARKER_POINTS.map((point) => {
      const isFire = point.type === 'fire';
      const iconUrl = isFire ? fireCanvasUrl : buildingCanvasUrl;
      const initialShow = isFire ? showFireRef.current : showBuildingRef.current;

      return viewer.entities.add({
        id: `spatial-marker-${point.id}`,
        name: point.name,
        position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, 0),
        show: initialShow,
        billboard: {
          image: iconUrl,
          width: 26,
          height: 26,
          scaleByDistance: new Cesium.NearFarScalar(1.5e3, 1.6, 2.0e7, 0.75),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        },
      });
    });

    // 遍历添加火点不规则火区多边形实体（黄色/亮橙发光火区，带高对比红色/暗橙色热解轮廓）
    firePolygonEntitiesRef.current = [];
    SPATIAL_MARKER_POINTS.filter((p) => p.type === 'fire' && p.firePolygons && p.firePolygons.length > 0).forEach(
      (firePoint) => {
        firePoint.firePolygons?.forEach((polyCoords, polyIdx) => {
          // 割角平滑为圆润火区轮廓后展平经纬度坐标
          const roundedCoords = smoothClosedRing(polyCoords as [number, number][]);
          const flatDegrees: number[] = [];
          roundedCoords.forEach(([lng, lat]) => {
            flatDegrees.push(lng, lat);
          });

          const polygonPositions = Cesium.Cartesian3.fromDegreesArray(flatDegrees);

          const polyEntity = viewer.entities.add({
            id: `fire-polygon-${firePoint.id}-${polyIdx}`,
            name: `${firePoint.name} - 火区范围`,
            show: showFireRef.current,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(polygonPositions),
              // 与 2D 视图火区配色保持一致 (fillColor #f97316 / color #ea580c)
              material: Cesium.Color.fromCssColorString('#f97316').withAlpha(0.28),
              height: 0,
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString('#ea580c').withAlpha(0.95),
              outlineWidth: 1.5,
            },
            polyline: {
              positions: polygonPositions,
              width: 1.5,
              material: Cesium.Color.fromCssColorString('#ea580c').withAlpha(0.95),
              clampToGround: true,
            },
          });

          firePolygonEntitiesRef.current.push({
            pointId: firePoint.id,
            entity: polyEntity,
          });
        });
      }
    );
  };

  // 添加环绕地球的全星座卫星空间惯性轨道圆环与实时卫星图标 (ECI 地心惯性坐标系动力学解算)
  const addSatelliteOrbit = (viewer: any) => {
    satelliteNormalUrlRef.current = createSatelliteMarkerCanvas(false);
    satelliteSelectedUrlRef.current = createSatelliteMarkerCanvas(true);
    satelliteEntitiesRef.current = [];

    const sampleCount = 180;

    SATELLITE_CONSTELLATION_ITEMS.forEach((satItem) => {
      const satrec = satellite.twoline2satrec(satItem.line1, satItem.line2);
      if (satrec.error) return;

      const meanMotionRevPerDay = satrec.no * (1440 / (2 * Math.PI));
      const orbitalPeriodMinutes = 1440 / meanMotionRevPerDay;

      // 计算当前时刻下的惯性空间轨道环 (在当前瞬间惯性参考系 ECI 下解算整个轨道闭合椭圆，并投影到当前地球视口中)
      const computeInertialOrbitPositions = (currentDate: Date) => {
        const gmst = satellite.gstime(currentDate);
        const positions: any[] = [];
        for (let i = 0; i < sampleCount; i++) {
          const t = new Date(currentDate.getTime() + (i / sampleCount) * orbitalPeriodMinutes * 60000);
          const pv = satellite.propagate(satrec, t);
          if (!pv.position || typeof pv.position === 'boolean') continue;
          const ecf = satellite.eciToEcf(pv.position, gmst);
          positions.push(new Cesium.Cartesian3(ecf.x * 1000, ecf.y * 1000, ecf.z * 1000));
        }
        if (positions.length > 0) {
          positions.push(positions[0]); // 完美平滑闭合轨道圆环
        }
        return positions;
      };

      // 惯性轨道空间圆环
      const orbitEntity = viewer.entities.add({
        id: `satellite-orbit-${satItem.id}`,
        name: `${satItem.code} 惯性空间轨道`,
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            return computeInertialOrbitPositions(new Date());
          }, false),
          width: satItem.id === 'scs-04-16' ? 1.5 : 1.2,
          material: satItem.id === 'scs-04-16'
            ? Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.65)
            : Cesium.Color.fromCssColorString('#0ea5e9').withAlpha(0.35),
          arcType: Cesium.ArcType.NONE,
        },
      });

      // 卫星实时星体位置：基于 ECI 惯性坐标动力学严格解算（不禁用深度测试，使卫星运行到地球背面时被地球球体自然遮挡）
      const satEntity = viewer.entities.add({
        id: `satellite-${satItem.id}`,
        name: satItem.code,
        position: new Cesium.CallbackProperty(() => {
          const now = new Date();
          const pv = satellite.propagate(satrec, now);
          if (!pv.position || typeof pv.position === 'boolean') return undefined;
          const gmst = satellite.gstime(now);
          const ecf = satellite.eciToEcf(pv.position, gmst);
          return new Cesium.Cartesian3(ecf.x * 1000, ecf.y * 1000, ecf.z * 1000);
        }, false),
        billboard: {
          image: satelliteNormalUrlRef.current,
          width: 20,
          height: 20,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        },
        label: {
          text: satItem.code,
          font: '12px sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#e0f2fe'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 14),
          show: false,
        },
      });

      satelliteEntitiesRef.current.push({
        id: satItem.id,
        code: satItem.code,
        entity: satEntity,
        orbitEntity,
      });
    });
  };

  // 根据筛选状态动态控制火点、火区不规则范围与建筑群标点的显隐
  useEffect(() => {
    if (!viewerRef.current || !cesiumReady) return;

    spatialEntitiesRef.current.forEach((entity: any) => {
      const id = entity.id;
      if (typeof id === 'string' && id.startsWith('spatial-marker-')) {
        const pointId = id.replace('spatial-marker-', '');
        const point = SPATIAL_MARKER_POINTS.find((p) => p.id === pointId);
        if (point) {
          if (point.type === 'fire') {
            entity.show = showFire;
          } else if (point.type === 'building') {
            entity.show = showBuilding;
          }
        }
      }
    });

    // 控制火区不规则多边形显隐
    firePolygonEntitiesRef.current.forEach(({ entity }) => {
      entity.show = showFire;
    });
  }, [showFire, showBuilding, cesiumReady]);

  // 根据选中状态高亮标绘图标与放大比例，并高亮火区多边形
  useEffect(() => {
    if (!viewerRef.current || !cesiumReady) return;

    spatialEntitiesRef.current.forEach((entity: any) => {
      const id = entity.id;
      if (typeof id === 'string' && id.startsWith('spatial-marker-')) {
        const pointId = id.replace('spatial-marker-', '');
        const isSelected = pointId === selectedPointId;
        const point = SPATIAL_MARKER_POINTS.find((p) => p.id === pointId);
        if (point && entity.billboard) {
          if (point.type === 'fire') {
            entity.billboard.image = isSelected
              ? fireSelectedUrlRef.current
              : fireNormalUrlRef.current;
          } else {
            entity.billboard.image = isSelected
              ? buildingSelectedUrlRef.current
              : buildingNormalUrlRef.current;
          }
          entity.billboard.scale = 1.0; // 选中态不放大，仅切换为带光圈的选中图标
        }
      }
    });

    // 与 2D 视图保持一致：火区多边形颜色固定，不因选中而变化
    firePolygonEntitiesRef.current.forEach(({ entity }) => {
      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.fromCssColorString('#f97316').withAlpha(0.28);
      }
    });
  }, [selectedPointId, cesiumReady]);

  // 根据选中状态高亮全星座中对应的卫星图标、放大比例并显示编号标签
  useEffect(() => {
    if (!viewerRef.current || !cesiumReady) return;

    satelliteEntitiesRef.current.forEach((satObj) => {
      const isSelected = satObj.id === internalSelectedSatId || satObj.code.toLowerCase() === (internalSelectedSatId || '').toLowerCase();
      if (satObj.entity && satObj.entity.billboard) {
        satObj.entity.billboard.image = isSelected
          ? satelliteSelectedUrlRef.current
          : satelliteNormalUrlRef.current;
        satObj.entity.billboard.scale = isSelected ? 1.3 : 1.0;
        if (satObj.entity.label) {
          satObj.entity.label.show = isSelected;
        }
      }
      if (satObj.orbitEntity && satObj.orbitEntity.polyline) {
        satObj.orbitEntity.polyline.width = isSelected ? 2.0 : 1.2;
        satObj.orbitEntity.polyline.material = isSelected
          ? Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.85)
          : Cesium.Color.fromCssColorString('#0ea5e9').withAlpha(0.28);
      }
    });
  }, [internalSelectedSatId, cesiumReady]);

  // 平滑飞往当前选中的地球对象（直接正射俯视放大，不旋转地球）
  const handleFlyToFenghuang = useCallback(() => {
    if (!viewerRef.current || isFlyingRef.current) return;
    const viewer = viewerRef.current;
    isFlyingRef.current = true;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        currentEarthObject.lng,
        currentEarthObject.lat,
        2200
      ),
      orientation: {
        heading: 0.0, // 严格保持正北朝上，不旋转
        pitch: Cesium.Math.toRadians(-89.5), // 垂直正射俯视，绝不产生倾斜旋转
        roll: 0.0,
      },
      duration: 1.8,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      complete: () => {
        isFlyingRef.current = false;
        onFenghuangClick();
      },
      cancel: () => {
        isFlyingRef.current = false;
      },
    });
  }, [onFenghuangClick, currentEarthObject]);

  useEffect(() => {
    handleFlyToFenghuangRef.current = handleFlyToFenghuang;
  }, [handleFlyToFenghuang]);

  // 返回全球太空视角（同样保持正北朝上垂直俯视，绝不发生旋转）
  const handleFlyToGlobal = () => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    onResetGlobal?.();

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(108.0, 27.0, 17500000),
      orientation: {
        heading: 0.0,
        pitch: Cesium.Math.toRadians(-89.5),
        roll: 0.0,
      },
      duration: 1.8,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      complete: () => {
        onResetGlobal?.();
      },
    });
  };

  // 重置视角为正北朝向垂直俯视
  const handleResetNorth = () => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    const currentPos = viewer.camera.positionCartographic;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(currentPos.longitude, currentPos.latitude, currentPos.height),
      orientation: {
        heading: 0.0,
        pitch: Cesium.Math.toRadians(-89.5),
        roll: 0.0,
      },
      duration: 0.8,
    });
  };

  // 切换昼夜光照
  const toggleLighting = () => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    const newDaylight = !isDaylight;
    viewer.scene.globe.enableLighting = newDaylight;
    setIsDaylight(newDaylight);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 select-none overflow-hidden">
      {/* Cesium 3D 视口容器 */}
      <div 
        ref={containerRef} 
        id="cesium-viewport-container" 
        className="w-full h-full"
      />

      {/* 载入中或错误提示 */}
      {!cesiumReady && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-30 text-white backdrop-blur-sm">
          <div className="w-14 h-14 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium text-sky-200">正在构建三维仿真地球模型...</p>
          <p className="text-xs text-slate-400 mt-2">载入大气层、全球卫星遥感底图与高程地形数据</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-30 text-white p-6 text-center">
          <div className="w-12 h-12 text-rose-400 mb-3">⚠️</div>
          <p className="text-rose-400 font-medium text-lg">{loadError}</p>
          <p className="text-sm text-slate-400 mt-2 max-w-md">网络环境限制或 WebGL 初始化受阻，可点击重试重新加载。</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            刷新重试
          </button>
        </div>
      )}

      {/* 地球底部中间状态标尺 HUD（横向横条展示） */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 sm:gap-5 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-full px-4 py-2 text-xs text-slate-300 shadow-xl whitespace-nowrap max-w-[95vw] overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">相机视高:</span>
          <span className="font-mono text-sky-400 font-medium">{cameraAltitude}</span>
        </div>
        <span className="w-px h-3 bg-slate-700/80" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">标定中心坐标:</span>
          <span className="font-mono text-emerald-400">
            {currentEarthObject.lng.toFixed(4)}°E, {currentEarthObject.lat.toFixed(4)}°N
          </span>
        </div>
        <span className="w-px h-3 bg-slate-700/80" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">空间基准:</span>
          <span className="text-slate-200">CGCS2000 / WGS-84</span>
        </div>
        {activeFootprint && (
          <>
            <span className="w-px h-3 bg-slate-700/80" />
            <div className="flex items-center gap-1.5 text-amber-300 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
              <span className="truncate max-w-[180px] sm:max-w-xs">已叠置: {activeFootprint.title}</span>
            </div>
          </>
        )}
      </div>

      {/* 快捷交互操作条 (地球控制：3D/2D切换 / 全球全景视角 / 昼夜光照 / 正北重置，左上角垂直纵排) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* 隐藏的飞抵探索触发器供外部/卡片静默调用 */}
        <button
          id="btn-fly-fenghuang"
          onClick={handleFlyToFenghuang}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* 3D / 2D 视图切换按钮 */}
        {onToggleDimension && (
          <button
            id="btn-toggle-dimension"
            onClick={onToggleDimension}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 rounded-xl backdrop-blur-xl shadow-2xl transition-all duration-200 hover:scale-105 cursor-pointer group text-white font-bold text-xs"
            title={viewDimension === '3d' ? '切换至 2D 平面地图视窗' : '切换至 3D 仿真地球视窗'}
          >
            {viewDimension === '3d' ? (
              <span className="text-sky-400 font-extrabold text-sm font-mono tracking-tighter group-hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
                3D
              </span>
            ) : (
              <span className="text-emerald-400 font-extrabold text-sm font-mono tracking-tighter group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                2D
              </span>
            )}
          </button>
        )}

        {/* 返回全球视角 */}
        <button
          id="btn-fly-global"
          onClick={handleFlyToGlobal}
          title="返回地球太空全景视角"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-xl backdrop-blur-xl shadow-2xl transition-all duration-200 hover:scale-105 cursor-pointer group"
        >
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        </button>

        {/* 昼夜光照切换 */}
        <button
          id="btn-toggle-lighting"
          onClick={toggleLighting}
          title={isDaylight ? '开启仿真太阳阴影光照' : '开启全日光照'}
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded-xl text-slate-300 hover:text-white backdrop-blur-xl transition-all duration-200 hover:scale-105 shadow-2xl cursor-pointer group"
        >
          {isDaylight ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300 group-hover:drop-shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          )}
        </button>

        {/* 正北重置 */}
        <button
          id="btn-reset-north"
          onClick={handleResetNorth}
          title="重置视角为正北朝向"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/60 rounded-xl text-slate-300 hover:text-white backdrop-blur-xl transition-all duration-200 hover:scale-105 shadow-2xl cursor-pointer group"
        >
          <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 group-hover:drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
        </button>
      </div>
    </div>
  );
};
