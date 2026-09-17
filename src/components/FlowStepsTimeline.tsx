import React, { useState } from 'react';
import { 
  Download, 
  Flame, 
  Check, 
  RotateCw,
  ChevronDown,
  ChevronRight,
  X,
  Maximize2,
  CheckCircle2
} from 'lucide-react';
import { FlowStepItem } from '../types';

interface FlowStepsTimelineProps {
  steps: FlowStepItem[];
  currentStepIndex: number;
  resultImage?: string;
  fireDetected?: boolean;
  fireHotspots?: { x: number; y: number; temp: string; area: string }[];
  targetTitle?: string;
  title?: string;
  collapsible?: boolean; // 是否支持折叠展开
  defaultExpanded?: boolean; // 默认是否展开
}

export const FlowStepsTimeline: React.FC<FlowStepsTimelineProps> = ({
  steps,
  currentStepIndex: currentStepIndexProp,
  resultImage,
  fireDetected = true,
  fireHotspots = [
    { x: 42, y: 38, temp: '382℃ (异常热点)', area: '之江核心区' },
    { x: 58, y: 64, temp: '165℃ (中度热点)', area: '之江外围区' }
  ],
  targetTitle = '之江实验室',
  title,
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const handleDownload = () => {
    setDownloadSuccess(true);
    const element = document.createElement('a');
    element.setAttribute('href', resultImage || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80');
    element.setAttribute('download', `OneSpace_${targetTitle}_遥感成果.jpg`);
    element.setAttribute('target', '_blank');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // 若步骤序列中存在失败节点，流程冻结在该节点，不再继续推进
  const errorStepIndex = steps.findIndex((s) => s.status === 'error');
  const hasError = errorStepIndex !== -1;
  const currentStepIndex = hasError ? errorStepIndex : currentStepIndexProp;
  const isAllFinished = !hasError && currentStepIndex >= steps.length;
  const isNotStarted = !hasError && currentStepIndex < 0;

  // 渲染单个紧凑节点（与其余所有节点样式完全一致的蓝色标准流程节点）
  const renderStepNode = (step: FlowStepItem, idx: number) => {
    const isCompleted = idx < currentStepIndex;
    const isCurrent = idx === currentStepIndex;
    const isErrorNode = hasError && idx === errorStepIndex;

    return (
      <div className="flex flex-col items-center justify-start text-center w-full px-0.5 z-10 select-none">
        {/* 紧凑圆圈：纯净蓝色主题 */}
        <div className="relative flex items-center justify-center">
          {isErrorNode ? (
            /* 失败：红色实心圆 + 白色叉号 */
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 dark:bg-red-500 flex items-center justify-center shadow-xs transition-transform duration-200">
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
            </div>
          ) : isCompleted ? (
            /* 已完成：蓝色实心圆 + 白色勾号 */
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 dark:bg-sky-500 flex items-center justify-center shadow-xs transition-transform duration-200">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
            </div>
          ) : isCurrent ? (
            /* 进行中：蓝色实心圆 + 白色旋转循环图标 + 外圈微光 */
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 dark:bg-sky-500 flex items-center justify-center shadow-sm ring-3 ring-blue-500/25 dark:ring-sky-400/30 transition-transform duration-200">
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5] animate-spin" />
            </div>
          ) : (
            /* 未执行：浅灰圆圈 + 灰色数字 */
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 dark:bg-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-[10px] sm:text-xs font-mono">
              {idx + 1}
            </div>
          )}
        </div>

        {/* 节点步骤文字 */}
        <span className={`mt-1.5 text-[10px] sm:text-[11px] text-center font-medium leading-tight line-clamp-2 max-w-[72px] sm:max-w-[84px] ${
          isErrorNode
            ? 'text-red-600 dark:text-red-400 font-semibold'
            : isCompleted || isCurrent
            ? 'text-slate-900 dark:text-slate-100 font-semibold'
            : 'text-slate-400 dark:text-slate-500'
        }`}>
          {step.label}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full rounded-2xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] p-3.5 sm:p-4 space-y-3.5 my-2.5 text-left shadow-sm backdrop-blur-xl transition-all">
      {/* ================= 标题栏 ================= */}
      <div 
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between pb-2 ${
          isExpanded || Boolean(resultImage) ? 'border-b border-slate-100 dark:border-white/[0.06]' : ''
        } ${collapsible ? 'cursor-pointer select-none hover:opacity-90' : ''}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            {title || targetTitle || '任务执行流程'}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            hasError
              ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-500/30'
              : isNotStarted
              ? 'bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/[0.08]'
              : 'bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400 border-blue-200/40 dark:border-sky-500/20'
          }`}>
            {hasError ? '任务失败' : isNotStarted ? '未开始' : isAllFinished ? '全部完成' : <>进行中 (<span className="font-mono">{Math.min(currentStepIndex + 1, steps.length)}/{steps.length}</span>)</>}
          </span>
        </div>

        {collapsible && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-sky-400">
            <span>{isExpanded ? '收起流程图' : '展开流程图'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        )}
      </div>

      {/* ================= 回形流程图（自适应窗口宽度与任意步骤数，折行蛇形回环） ================= */}
      {(!collapsible || isExpanded) && (
        <div className="w-full py-1 animate-fadeIn">
          {Array.from({ length: Math.ceil(steps.length / 4) }).map((_, rowIndex) => {
            const isEven = rowIndex % 2 === 0;
            const baseIdx = rowIndex * 4;
            const hasNextRow = (rowIndex + 1) * 4 < steps.length;

            if (isEven) {
              // 偶数行：从左到右 (0 -> 1 -> 2 -> 3)
              const idx0 = baseIdx + 0;
              const idx1 = baseIdx + 1;
              const idx2 = baseIdx + 2;
              const idx3 = baseIdx + 3;

              return (
                <React.Fragment key={`row-${rowIndex}`}>
                  <div className="relative w-full">
                    {/* 背景水平连线 */}
                    <div className="absolute top-3 sm:top-3.5 left-0 right-0 h-0.5 z-0 pointer-events-none">
                      {idx1 < steps.length && (
                        <div 
                          className={`absolute top-0 left-[12.5%] w-[25%] h-full rounded-full transition-colors duration-300 ${
                            idx0 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                          }`} 
                        />
                      )}
                      {idx2 < steps.length && (
                        <div 
                          className={`absolute top-0 left-[37.5%] w-[25%] h-full rounded-full transition-colors duration-300 ${
                            idx1 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                          }`} 
                        />
                      )}
                      {idx3 < steps.length && (
                        <div 
                          className={`absolute top-0 left-[62.5%] w-[25%] h-full rounded-full transition-colors duration-300 ${
                            idx2 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                          }`} 
                        />
                      )}
                    </div>

                    {/* 节点网格 */}
                    <div className="grid grid-cols-4 w-full">
                      {steps[idx0] ? renderStepNode(steps[idx0], idx0) : <div />}
                      {steps[idx1] ? renderStepNode(steps[idx1], idx1) : <div />}
                      {steps[idx2] ? renderStepNode(steps[idx2], idx2) : <div />}
                      {steps[idx3] ? renderStepNode(steps[idx3], idx3) : <div />}
                    </div>
                  </div>

                  {/* 右侧垂直转折连线 (向下进入下一行) */}
                  {hasNextRow && (
                    <div className="relative w-full h-5 sm:h-6 pointer-events-none">
                      <div 
                        className={`absolute top-0 bottom-0 left-[87.5%] -translate-x-1/2 w-0.5 rounded-full transition-colors duration-300 ${
                          idx3 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                        }`} 
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            } else {
              // 奇数行：从右到左 (7 <- 6 <- 5 <- 4)
              const idx0 = baseIdx + 0; // Col 3 (右侧起始)
              const idx1 = baseIdx + 1; // Col 2
              const idx2 = baseIdx + 2; // Col 1
              const idx3 = baseIdx + 3; // Col 0 (左侧结束)

              return (
                <React.Fragment key={`row-${rowIndex}`}>
                  <div className="relative w-full">
                    {/* 背景水平连线 (从右往左流动) */}
                    <div className="absolute top-3 sm:top-3.5 left-0 right-0 h-0.5 z-0 pointer-events-none">
                      {idx1 < steps.length && (
                        <div 
                          className={`absolute top-0 left-[62.5%] w-[25%] h-full rounded-full transition-colors duration-300 ${
                            idx0 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                          }`} 
                        />
                      )}
                      {idx2 < steps.length && (
                        <div 
                          className={`absolute top-0 left-[37.5%] w-[25%] h-full rounded-full transition-colors duration-300 ${
                            idx1 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                          }`} 
                        />
                      )}
                      {idx3 < steps.length && (
                        <div 
                          className={`absolute top-0 left-[12.5%] w-[25%] h-full rounded-full transition-colors duration-300 ${
                            idx2 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                          }`} 
                        />
                      )}
                    </div>

                    {/* 节点网格（DOM 从左至右渲染 Col 0: idx3, Col 1: idx2, Col 2: idx1, Col 3: idx0） */}
                    <div className="grid grid-cols-4 w-full">
                      {steps[idx3] ? renderStepNode(steps[idx3], idx3) : <div />}
                      {steps[idx2] ? renderStepNode(steps[idx2], idx2) : <div />}
                      {steps[idx1] ? renderStepNode(steps[idx1], idx1) : <div />}
                      {steps[idx0] ? renderStepNode(steps[idx0], idx0) : <div />}
                    </div>
                  </div>

                  {/* 左侧垂直转折连线 (向下进入下一行) */}
                  {hasNextRow && (
                    <div className="relative w-full h-5 sm:h-6 pointer-events-none">
                      <div 
                        className={`absolute top-0 bottom-0 left-[12.5%] -translate-x-1/2 w-0.5 rounded-full transition-colors duration-300 ${
                          idx3 < currentStepIndex ? 'bg-blue-600 dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700/60'
                        }`} 
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            }
          })}
        </div>
      )}

      {/* ================= 执行成果图片展示（仅在存在结果图片且执行完毕时呈现） ================= */}
      {isAllFinished && Boolean(resultImage) && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] space-y-2 animate-fadeIn">
          {/* 仅保留结果下载按钮（靠右排版） */}
          <div className="flex items-center justify-end">
            <button
              id="btn-download-result-image"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已下载</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>结果下载</span>
                </>
              )}
            </button>
          </div>

          {/* 成果图（纯净静态图，支持点击放大预览） */}
          <div 
            className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-black max-h-56 sm:max-h-64 cursor-pointer group/img"
            onClick={() => setIsModalOpen(true)}
          >
            <img
              src={resultImage || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'}
              alt="遥感成像检测成果"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              referrerPolicy="no-referrer"
            />
            
            {/* 悬浮放大提示 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/90 text-white text-xs font-bold backdrop-blur-md shadow-md">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>点击放大预览</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 大图弹窗 Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-blue-600 dark:bg-sky-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {targetTitle} 遥感成果影像大图
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  {downloadSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>已下载</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>下载此图</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="关闭 (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[65vh] p-2 overflow-hidden select-none">
              <img
                src={resultImage || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'}
                alt="遥感成像检测成果"
                className="max-w-full max-h-[62vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>遥感影像已完成下传与在轨算法解译</span>
              <span className="font-mono">目标: {targetTitle}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
