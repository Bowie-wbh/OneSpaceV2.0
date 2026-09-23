import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Columns2, 
  Bot, 
  Send, 
  Plus, 
  ArrowDown, 
  ArrowUp,
  Satellite as SatelliteIcon,
  BrainCircuit,
  Radio,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  LineChart,
  Grid,
  AlertCircle
} from 'lucide-react';
import { Satellite, ChatMessage } from '../types';
import { INITIAL_SATELLITES } from '../data/satelliteData';
import { HealthTimeSpan } from '../data/telemetryAndHealthData';
import { HealthStatusDashboard } from './HealthStatusDashboard';

// 3.1 系统资源趋势图组件 (CPU / 内存 / 磁盘占用率)
export const SystemResourceCharts: React.FC = () => {
  // 采样时序点：7-22 至 7-27
  const dates = ['07-22', '07-23', '07-24', '07-25', '07-26', '07-27'];
  
  // CPU 占用率时序：4.0% ~ 87.0%，7-23日有异常尖峰
  const cpuPoints = [
    { x: 20, y: 55, val: '8.2%' },
    { x: 75, y: 12, val: '87.0%', isAlert: true }, // 尖峰告警
    { x: 130, y: 52, val: '12.4%' },
    { x: 185, y: 48, val: '15.6%' },
    { x: 240, y: 56, val: '6.5%' },
    { x: 295, y: 58, val: '4.1%' },
  ];
  const cpuPathD = cpuPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // 内存占用率时序：稳定 26.0% ~ 27.0%
  const memPoints = [
    { x: 20, y: 42, val: '26.2%' },
    { x: 75, y: 40, val: '26.8%' },
    { x: 130, y: 41, val: '26.4%' },
    { x: 185, y: 39, val: '27.0%' },
    { x: 240, y: 41, val: '26.5%' },
    { x: 295, y: 42, val: '26.1%' },
  ];
  const memPathD = memPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // 磁盘占用率时序：恒定 52.0%（未清理触发同窗时序异常）
  const diskPoints = [
    { x: 20, y: 28, val: '52.0%' },
    { x: 75, y: 28, val: '52.0%' },
    { x: 130, y: 28, val: '52.0%' },
    { x: 185, y: 28, val: '52.0%' },
    { x: 240, y: 28, val: '52.0%' },
    { x: 295, y: 28, val: '52.0%' },
  ];
  const diskPathD = diskPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="my-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 图 1: CPU占用率 */}
        <div className="p-3 rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#121829]/70 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">CPU 占用率趋势</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold">
              峰值 87.0%
            </span>
          </div>
          <div className="relative w-full h-24 bg-white/80 dark:bg-[#0c101c]/80 rounded-lg border border-slate-200/60 dark:border-white/[0.04] p-1.5">
            <svg viewBox="0 0 315 70" className="w-full h-full overflow-visible">
              {/* 参考辅助线 */}
              <line x1="15" y1="20" x2="300" y2="20" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.5" opacity="0.4" />
              <line x1="15" y1="50" x2="300" y2="50" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.5" opacity="0.4" />
              <text x="303" y="22" fill="#94a3b8" fontSize="8" textAnchor="start">80%</text>
              <text x="303" y="52" fill="#94a3b8" fontSize="8" textAnchor="start">20%</text>
              
              {/* 折线与渐变填充 */}
              <path d={`${cpuPathD} L 295 65 L 20 65 Z`} fill="rgba(244, 63, 94, 0.12)" />
              <path d={cpuPathD} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* 关键节点 */}
              {cpuPoints.map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.y} r={pt.isAlert ? '4' : '2.5'} fill={pt.isAlert ? '#e11d48' : '#f43f5e'} stroke="#ffffff" strokeWidth="1" />
                  {pt.isAlert && (
                    <text x={pt.x} y={pt.y - 6} fill="#e11d48" fontSize="8" fontWeight="bold" textAnchor="middle">
                      87.0% 告警
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1 px-1">
            {dates.map((d, idx) => <span key={idx}>{d}</span>)}
          </div>
        </div>

        {/* 图 2: 内存占用率 */}
        <div className="p-3 rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#121829]/70 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">内存占用率趋势</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold">
              稳态 26.5%
            </span>
          </div>
          <div className="relative w-full h-24 bg-white/80 dark:bg-[#0c101c]/80 rounded-lg border border-slate-200/60 dark:border-white/[0.04] p-1.5">
            <svg viewBox="0 0 315 70" className="w-full h-full overflow-visible">
              <line x1="15" y1="20" x2="300" y2="20" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.5" opacity="0.4" />
              <line x1="15" y1="50" x2="300" y2="50" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.5" opacity="0.4" />
              <text x="303" y="22" fill="#94a3b8" fontSize="8" textAnchor="start">50%</text>
              <text x="303" y="52" fill="#94a3b8" fontSize="8" textAnchor="start">20%</text>

              <path d={`${memPathD} L 295 65 L 20 65 Z`} fill="rgba(16, 185, 129, 0.12)" />
              <path d={memPathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {memPoints.map((pt, idx) => (
                <circle key={idx} cx={pt.x} cy={pt.y} r="2.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1 px-1">
            {dates.map((d, idx) => <span key={idx}>{d}</span>)}
          </div>
        </div>

        {/* 图 3: 磁盘占用率 */}
        <div className="p-3 rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#121829]/70 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">磁盘占用率趋势</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold">
              同窗恒定 52.0%
            </span>
          </div>
          <div className="relative w-full h-24 bg-white/80 dark:bg-[#0c101c]/80 rounded-lg border border-slate-200/60 dark:border-white/[0.04] p-1.5">
            <svg viewBox="0 0 315 70" className="w-full h-full overflow-visible">
              <line x1="15" y1="28" x2="300" y2="28" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="0.8" opacity="0.6" />
              <line x1="15" y1="50" x2="300" y2="50" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.5" opacity="0.4" />
              <text x="303" y="30" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="start">52%</text>

              <path d={`${diskPathD} L 295 65 L 20 65 Z`} fill="rgba(245, 158, 11, 0.12)" />
              <path d={diskPathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {diskPoints.map((pt, idx) => (
                <circle key={idx} cx={pt.x} cy={pt.y} r="2.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1 px-1">
            {dates.map((d, idx) => <span key={idx}>{d}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3.2 路由运行与端口状态矩阵组件
export const RouterPortMatrix: React.FC = () => {
  // 端口与运行服务状态项 (18个 Ethernet 端口 + 管理口 + 核心服务)
  const items = [
    { name: '管理口 (TML021)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth1 (TML022)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth2 (TML029)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth4 (TML036)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth5 (TML043)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth6 (TML050)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth7 (TML057)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth8 (TML064)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth9 (TML071)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth10 (TML078)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth12 (TML085)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth13 (TML092)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth14 (TML099)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth15 (TML106)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth16 (TML113)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth17 (TML120)', status: 'normal', desc: '开启 (0)' },
    { name: 'Eth18 (TML127)', status: 'normal', desc: '开启 (0)' },
    { name: 'Docker守护进程', status: 'normal', desc: '运行中 (0)' },
    { name: '自检守护 (TML013)', status: 'warning', desc: '时序缺测 (—)' },
    { name: '上注状态 (TML017)', status: 'normal', desc: '正常执行 (0)' },
  ];

  return (
    <div className="my-3 p-3.5 rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#121829]/70 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] pb-2">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">星载路由端口与进程健康状态热力拓扑矩阵</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 正常开启 (18)
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 待补测 (2)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {items.map((it, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg border text-xs transition-all flex flex-col justify-between ${
              it.status === 'normal'
                ? 'bg-white/80 dark:bg-[#0c101c]/80 border-slate-200/80 dark:border-white/[0.06]'
                : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate">{it.name}</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${it.status === 'normal' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <span className={`text-[10px] font-mono ${it.status === 'normal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {it.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 思考过程可折叠组件：思考生成中展开，思考完毕（正文开始生成或已完成）后自动收起
const HealthThinkingBlock: React.FC<{ thinking: string; isGeneratingContent?: boolean }> = ({ 
  thinking, 
  isGeneratingContent = false 
}) => {
  const [userToggled, setUserToggled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isGeneratingContent);

  useEffect(() => {
    if (!userToggled) {
      setIsExpanded(!isGeneratingContent);
    }
  }, [isGeneratingContent, userToggled]);

  const handleToggle = () => {
    setUserToggled(true);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden text-xs transition-all">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-white/[0.03] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <BrainCircuit className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ${!isGeneratingContent ? 'opacity-70' : 'animate-pulse text-sky-500/70'}`} />
          <span className="font-medium text-slate-600 dark:text-slate-400">健康体检推理过程</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500 font-sans">
            {isGeneratingContent ? '已完成推理' : '推理中...'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400/80 dark:text-slate-500">
          <span>{isExpanded ? '收起' : '展开'}</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 py-2 border-t border-slate-100 dark:border-white/[0.04] text-[11px] font-mono whitespace-pre-wrap text-slate-500 dark:text-slate-400 bg-slate-50/25 dark:bg-black/10 animate-fadeIn">
          {thinking}
        </div>
      )}
    </div>
  );
};

// 渲染 Markdown 行内格式（加粗、行内代码、换行等，并过滤 HTML 标签）
const renderInlineMarkdown = (text: string) => {
  // 先过滤 HTML 标签（如 <font ...>、</font>、<span> 等），保留纯净 Markdown
  const cleanText = text.replace(/<\/?[^>]+(>|$)/g, '');
  const parts = cleanText.split(/(<br\s*\/?>|\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part === '<br>' || part === '<br/>' || part === '<br />') {
      return <br key={i} />;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-slate-950 dark:text-slate-50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-white/[0.08] text-blue-600 dark:text-sky-400 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

// Markdown 结构化渲染组件
export const MarkdownMessageContent: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Markdown 表格识别与渲染
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 1) {
        const parseRowCells = (rowStr: string) => {
          let s = rowStr.trim();
          if (s.startsWith('|')) s = s.slice(1);
          if (s.endsWith('|')) s = s.slice(0, -1);
          return s.split('|').map(c => c.trim());
        };

        const headerCols = parseRowCells(tableLines[0]);
        const hasDivider = tableLines.length >= 2 && tableLines[1].includes('---');
        const rowStartIndex = hasDivider ? 2 : 1;
        const dataRows = tableLines.slice(rowStartIndex).map(r => parseRowCells(r));

        // 特殊健康评分卡片型表格检测
        const isScoreTable = headerCols.some(h => h.includes('健康评分')) && headerCols.some(h => h.includes('健康状态'));

        if (isScoreTable && dataRows.length > 0) {
          const row = dataRows[0];
          elements.push(
            <div key={`score-table-${i}`} className="my-3 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {headerCols.map((header, colIdx) => (
                <div key={colIdx} className="p-3 rounded-xl bg-slate-50/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-white/[0.08] text-center flex flex-col justify-between overflow-hidden">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{renderInlineMarkdown(header)}</span>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 break-words leading-snug">
                    {renderInlineMarkdown(row[colIdx] || '')}
                  </div>
                </div>
              ))}
            </div>
          );
        } else {
          elements.push(
            <div key={`table-${i}`} className="my-3 overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c101c]/60 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/[0.08] font-bold text-slate-700 dark:text-slate-300">
                    {headerCols.map((h, colIdx) => (
                      <th key={colIdx} className="py-2.5 px-3.5 whitespace-nowrap">{renderInlineMarkdown(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2.5 px-3.5 whitespace-nowrap text-slate-800 dark:text-slate-200">
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }
    }

    // 标题识别 (### 或 #### 或 二、三、四等中文标题)
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {renderInlineMarkdown(line.replace('#### ', ''))}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-100 dark:border-white/[0.06]">
          {renderInlineMarkdown(line.replace('### ', ''))}
        </h3>
      );
      i++;
      continue;
    }

    const cleanLine = line.replace(/<\/?[^>]+(>|$)/g, '').trim();
    if (/^[一二三四五六七八九十]+、/.test(cleanLine)) {
      elements.push(
        <h3 key={`h3-cn-${i}`} className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-100 dark:border-white/[0.06]">
          {renderInlineMarkdown(cleanLine)}
        </h3>
      );
      i++;
      continue;
    }

    if (/^3\.[12]\s+/.test(cleanLine)) {
      elements.push(
        <h4 key={`h4-num-${i}`} className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {renderInlineMarkdown(cleanLine)}
        </h4>
      );
      i++;
      continue;
    }

    // 引用块 (>)
    if (line.startsWith('> ')) {
      elements.push(
        <div key={`quote-${i}`} className="my-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-sky-950/20 border-l-4 border-blue-500 dark:border-sky-400 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {renderInlineMarkdown(line.replace('> ', ''))}
        </div>
      );
      i++;
      continue;
    }

    // 列表项 (- 或 •)
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      elements.push(
        <div key={`list-${i}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pl-1">
          <span className="text-blue-500 dark:text-sky-400 select-none">•</span>
          <div className="flex-1 leading-relaxed">
            {renderInlineMarkdown(line.trim().replace(/^[-•]\s*/, ''))}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 趋势图与状态矩阵渲染
    if (line.trim().includes('三张折线趋势图')) {
      elements.push(<SystemResourceCharts key={`chart-box-${i}`} />);
      i++;
      continue;
    }

    if (line.trim().includes('路由运行与端口状态矩阵')) {
      elements.push(<RouterPortMatrix key={`matrix-box-${i}`} />);
      i++;
      continue;
    }

    // 普通段落
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 my-1 break-all break-words">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 font-sans text-left break-all break-words">{elements}</div>;
};

// 生成路由系统评估报告 Markdown 内容
const getRouterReportContent = (satTag: string) => `为您生成“${satTag}”的路由系统评估报告：

**评估周期**：2026-07-22 ～ 2026-07-31

**实际数据覆盖**：2026-07-22 02:21:25 ～ 2026-07-27 02:26:58

| 健康评分 | 健康状态 | 风险等级 | 数据覆盖率 | 评分置信度 |
| :---: | :---: | :---: | :---: | :---: |
| **65.5 / 100** | **需关注** | **中** | **13.6%** | **低** |

ClickHouse 同窗核心遥测总体判读：健康评分 **65.5 / 100**，原始返回 22/22 项；可判读 3/22 项；满足评分门槛 3/22 项；风险等级 **中**。

### 二、关键遥测项总结

| 参数名称 | 遥测代号 | 遥测定义 | 取值分布 | 正常比例 |
| :--- | :--- | :--- | :--- | :--- |
| CPU占用率 | TML006 | CPU 占用率（%） | 4.0 ～ 87.0 | 96.6%（485/502） |
| 内存占用率 | TML007 | 内存占用率（%） | 26.0 ～ 27.0 | 100.0%（502/502） |
| 磁盘占用率 | TML008 | 磁盘占用率（%） | 52.0 | 0.0%（0/502） |
| 自检状态 | TML013 | 0=正常,1~4=Docker异常,5=容器个数异常,6=启动时间异常 | — | — |
| 最后一次上注文件状态 | TML017 | 0=正常执行 | 0.0（502） | — |
| 管理口状态 | TML021 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet1状态 | TML022 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet2状态 | TML029 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet4状态 | TML036 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet5状态 | TML043 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet6状态 | TML050 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet7状态 | TML057 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet8状态 | TML064 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet9状态 | TML071 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet10状态 | TML078 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet12状态 | TML085 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet13状态 | TML092 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet14状态 | TML099 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet15状态 | TML106 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet16状态 | TML113 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet17状态 | TML120 | 0=开启,1=关闭,2=未知 | — | — |
| 接口Ethernet18状态 | TML127 | 0=开启,1=关闭,2=未知 | — | — |

### 三、状态变化趋势

#### 3.1 系统资源趋势
三张折线趋势图

#### 3.2 路由运行与端口状态矩阵
路由运行与端口状态矩阵

### 四、异常提醒与分析

| 参数名称 | 遥测代号 | 异常类型 | 发生次数 | 原始时间 |
| :--- | :--- | :--- | :--- | :--- |
| CPU占用率 | TML006 | Q01｜严重 | 1 | 2026-07-23 14:08:19.189000 |
| CPU占用率 | TML006 | ClickHouse｜同窗时序异常 | 17 | — |
| 磁盘占用率 | TML008 | ClickHouse｜同窗时序异常 | 502 | — |

> 异常证据来源说明：\`Q01\` 提供原始异常事件，\`ClickHouse\` 提供健康结论和同窗异常证据；两类证据分列展示，Q01 不参与健康评分计算。

### 五、风险评估

| 风险维度 | 评估结果 |
| :--- | :--- |
| 异常严重度 | 高 |
| 健康评分口径 | ClickHouse 同窗核心遥测 |
| ClickHouse 时序完整性 | 原始返回 22/22 项；可判读 3/22 项；满足评分门槛 3/22 项；缺失/不可读：TML013、TML021、TML022、TML029、TML036、TML043、TML050、TML057、TML064、TML071、TML078、TML085、TML092、TML099、TML106、TML113、TML120、TML127、TML017 |
| 数据完整性 | ClickHouse 原始返回：22/22 项；可判读：3/22 项；满足评分门槛：3/22 项。 |
| 综合风险 | 中 |

### 六、建议与结论

**建议**
- 建议按既定周期持续观测星载路由关键遥测变化。
- 建议复核本周期评分、异常事件来源及可用遥测记录。
- 建议在后续同一评估时间窗持续观测星载路由遥测状态。

**结论**
- 综合风险 中；健康结论基于 ClickHouse 同窗核心遥测；原始返回 22/22 项；可判读 3/22 项；满足评分门槛 3/22 项。

**评分置信度说明**
本报告覆盖率口径：已按权威规则评价指标占比：已按权威规则完成评价的指标，占全部纳入评估指标的比例。

| 条件 | 评分置信度 |
| :--- | :--- |
| 无可评分证据或评分未生成 | 未评价 |
| 覆盖率小于 50% | 低 |
| 覆盖率 50%（含）至 80%（不含） | 中 |
| 覆盖率 80%（含）及以上 | 高 |`;

interface HealthCheckViewProps {
  satellites?: Satellite[];
  selectedSatellite: Satellite;
  onSelectSatellite?: (satelliteId: string) => void;
  onOpenSatelliteList?: () => void;
  viewMode?: 'split' | 'kanban' | 'chat';
  onViewModeChange?: (mode: 'split' | 'kanban' | 'chat') => void;
  messages?: ChatMessage[];
  onNewSessionCreated?: (title: string, type: 'health-check') => void;
}

export const HealthCheckView: React.FC<HealthCheckViewProps> = ({ 
  satellites = INITIAL_SATELLITES,
  selectedSatellite,
  onSelectSatellite,
  onOpenSatelliteList,
  viewMode = 'split',
  onViewModeChange,
  messages: externalMessages,
  onNewSessionCreated
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'split' | 'kanban' | 'chat'>('split');
  const currentViewMode = viewMode ?? internalViewMode;

  // 卡片式标签页：实时遥测 (telemetry) / 健康状态 (health)

  // 总体数据时段分段选择：今日 / 本周 / 本月 / 历史
  const [overviewTimeSpan, setOverviewTimeSpan] = useState<HealthTimeSpan>('history');

  // 当前卫星状态（支持外部受控与内部切换）
  const [internalSatelliteId, setInternalSatelliteId] = useState<string>(selectedSatellite?.id || INITIAL_SATELLITES[0].id);
  
  useEffect(() => {
    if (selectedSatellite?.id) {
      setInternalSatelliteId(selectedSatellite.id);
    }
  }, [selectedSatellite?.id]);

  const activeSatellite = satellites.find(s => s.id === internalSatelliteId) || selectedSatellite || INITIAL_SATELLITES[0];

  const handleSatelliteChange = (satId: string) => {
    setInternalSatelliteId(satId);
    if (onSelectSatellite) {
      onSelectSatellite(satId);
    }
  };

  // 路由评估状态机（支持在“健康诊断”单独视图模式下的交互）
  const [routerFlowState, setRouterFlowState] = useState<{ type: 'idle' } | { type: 'awaiting_satellite' }>({ type: 'idle' });


  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(540);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopGenerating = () => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsGenerating(false);
  };

  useEffect(() => {
    return () => {
      stopGenerating();
    };
  }, []);

  useEffect(() => {
    if (externalMessages !== undefined) {
      setMessages(externalMessages);
    }
  }, [externalMessages]);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

      const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const minWidth = 200; // 允许对话区缩得更窄，优先保证右侧看板空间不被过度压缩
      const maxWidth = Math.max(300, rect.width - 360); // 确保看板至少保留 360px 宽度
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

  // 使用 ResizeObserver 监听健康管理容器宽度变化，并自动在容器尺寸变化时合理调整 chatPanelWidth
  useEffect(() => {
    if (!containerRef.current || currentViewMode !== 'split') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const totalWidth = entry.contentRect.width;
        if (totalWidth <= 0) return;
        const minKanbanWidth = 360; // 看板区最低保留宽度
        const maxAllowedChatWidth = Math.max(200, totalWidth - minKanbanWidth - 12);
        
        // 如果当前宽度超出最大允许宽度，或者初始为默认 540 但容器较窄，则自适应收窄
        setChatPanelWidth(prev => {
          if (prev > maxAllowedChatWidth) return maxAllowedChatWidth;
          return prev;
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [currentViewMode]);

  const handleChatScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > 120);
  };

  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Auto-resize textarea height as user types multiple lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        if (!showScrollToBottom) {
          scrollToBottom(true);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [messages, isGenerating, showScrollToBottom]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    stopGenerating();

    if (onNewSessionCreated) {
      onNewSessionCreated(text, 'health-check');
    }

    const userMsg: ChatMessage = {
      id: 'hc-user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsGenerating(true);

    const asstMsgId = 'hc-asst-' + (Date.now() + 1);

    timeoutTimerRef.current = setTimeout(() => {
      let thinking = "正在调用星载遥测数据库，对指定分系统及时间序列进行深度特征提取与健康状态评估...";
      let reply = "";
      let quickReplyOptions: string[] | undefined = undefined;

      if (routerFlowState.type === 'awaiting_satellite') {
        const trimmed = text.trim();
        const found = satellites.find(s => 
          trimmed.includes(s.name) || 
          trimmed.includes(s.code) || 
          s.name.includes(trimmed) || 
          (s.code && s.code.toLowerCase() === trimmed.toLowerCase())
        );
        const satTag = found ? `${found.name} (${found.code})` : trimmed;
        if (found) {
          handleSatelliteChange(found.id);
        }
        setRouterFlowState({ type: 'idle' });
        thinking = `正在调用 ${satTag} 星载时序遥测数据库 (ClickHouse)...\n- 加载评估周期：2026-07-22 ～ 2026-07-31\n- 提取 ${satTag} 星载路由系统 22 项核心指标时序数据\n- 评估 CPU/内存/磁盘占用率分布及异常事件\n- 关联 Q01 原始告警与同窗时序异常比对\n- 计算健康度评分 (65.5/100) 及评分置信度...`;
        reply = getRouterReportContent(satTag);
      } else if (text.includes('蓄电池') || text.includes('平衡')) {
        thinking = "已提取最近10天能源分系统蓄电池单体电压、充放电电流及温度遥测序列。\n- 单体电压极差统计分析...\n- 荷电状态(SOC)均衡度评估...";
        reply = `【蓄电池平衡分析报告（最近10天）】\n\n1. **总体评估**：蓄电池组整体健康度良好（SOH = 97.5%），无单体严重衰减现象。\n2. **电压极差**：最大单体电压差值维持在 \`14.2 mV\` 以内（阈值 < 25mV），处于安全合规区间。\n3. **平衡状态**：第7天至第9天光照阴影交替期间，串联单体3#出现微弱压差偏移（约 8.5mV），BMS已自动触发主动均衡充电。\n4. **建议**：建议在下次轨道过境时进行一次例行脉冲校准，无需人工干预。`;
      } else if (text.includes('路由') || text.includes('状态')) {
        setRouterFlowState({ type: 'awaiting_satellite' });
        thinking = `1. 识别星载路由系统评估意图。\n2. 校验在轨星座分系统遥测数据可得性。\n3. 提示用户选择或输入需要评估的卫星名称与编号。`;
        reply = "请问您想评估的是哪颗卫星？";
        quickReplyOptions = satellites.map(s => s.code ? `${s.name} (${s.code})` : s.name);
      } else {
        thinking = `正在对 ${activeSatellite.name} 进行全系统遥测综合健康体检...\n- 载荷分系统、姿轨控分系统、能源分系统横向对比...`;
        reply = `【卫星综合健康诊断报告】\n\n- **目标卫星**：${activeSatellite.name} (${activeSatellite.code})\n- **在轨天数**：168 天\n- **当前诊断结果**：卫星各分系统运行参数均在设计nominal范围内。\n- **自检结论**：系统整体健康度 **优 (Normal)**，未发现Ⅱ级及以上在轨异常。`;
      }

      const asstMsg: ChatMessage = {
        id: asstMsgId,
        role: 'assistant',
        content: '',
        thinkingProcess: '',
        quickReplyOptions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, asstMsg]);

      let thinkingCharIndex = 0;
      let contentCharIndex = 0;
      const thinkingTotal = thinking.length;
      const contentTotal = reply.length;

      streamTimerRef.current = setInterval(() => {
        if (thinkingCharIndex < thinkingTotal) {
          const step = Math.min(6, thinkingTotal - thinkingCharIndex);
          thinkingCharIndex += step;
          const currentThinking = thinking.slice(0, thinkingCharIndex);

          setMessages(prev => prev.map(msg => {
            if (msg.id === asstMsgId) {
              return {
                ...msg,
                thinkingProcess: currentThinking,
              };
            }
            return msg;
          }));
        } else if (contentCharIndex < contentTotal) {
          const step = Math.min(25, contentTotal - contentCharIndex);
          contentCharIndex += step;
          const currentContent = reply.slice(0, contentCharIndex);

          setMessages(prev => prev.map(msg => {
            if (msg.id === asstMsgId) {
              return {
                ...msg,
                thinkingProcess: thinking,
                content: currentContent,
              };
            }
            return msg;
          }));
        } else {
          stopGenerating();
          setMessages(prev => prev.map(msg => {
            if (msg.id === asstMsgId) {
              return {
                ...msg,
                thinkingProcess: thinking,
                content: reply,
              };
            }
            return msg;
          }));
        }
      }, 20);
    }, 250);
  };

  const renderChatArea = () => (
    <div className="flex-1 flex flex-col min-h-0 w-full h-full relative overflow-hidden">
      <div ref={chatScrollContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto w-full flex flex-col px-2 sm:px-4 py-3 relative">
        {messages.length === 0 ? (
          <div className="flex-1 my-auto flex flex-col justify-center items-center text-center py-8 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 dark:bg-sky-950/70 border border-blue-200/80 dark:border-sky-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400 shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                您好，我是OneSpace，能做卫星健康管理，您可以跟我说：
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button type="button" onClick={() => handleSendMessage('帮我进行最近十天的蓄电池平衡分析')} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111728] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/45 transition-all cursor-pointer shadow-2xs">
                  帮我进行最近十天的蓄电池平衡分析
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-6">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col w-full ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                <div className={`rounded-2xl p-3.5 sm:p-4 transition-all text-left ${msg.role === 'assistant' ? 'w-full bg-white/90 dark:bg-[#121829]/90 border border-slate-200/90 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 shadow-sm' : 'max-w-[85%] bg-blue-600 text-white shadow-md shadow-blue-900/20'}`}>
                  {msg.role === 'assistant' && msg.thinkingProcess && (
                    <HealthThinkingBlock 
                      thinking={msg.thinkingProcess} 
                      isGeneratingContent={Boolean(msg.content && msg.content.length > 0)} 
                    />
                  )}
                  {msg.role === 'assistant' ? (
                    <MarkdownMessageContent content={msg.content} />
                  ) : (
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>

                {/* 快捷选星/回复胶囊 */}
                {msg.role === 'assistant' && msg.quickReplyOptions && msg.quickReplyOptions.length > 0 && !msg.isActionConfirmed && (
                  <div className="w-full flex flex-wrap gap-2 pt-2.5 px-1">
                    {msg.quickReplyOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, isActionConfirmed: true } : m)));
                          handleSendMessage(opt);
                        }}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer bg-white dark:bg-[#111728] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-sky-400 hover:bg-blue-50/50 dark:hover:bg-sky-950/45 active:scale-95 transition-all shadow-2xs"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 pt-1 pb-3 px-2 sm:px-4 w-full relative">
        {showScrollToBottom && (
          <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none z-20">
            <button 
              onClick={() => scrollToBottom(true)} 
              title="回到最近对话"
              className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#0f172a] hover:bg-blue-50 dark:hover:bg-sky-950/80 border border-slate-200 dark:border-sky-400/25 text-blue-600 dark:text-sky-400 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer group"
            >
              <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />
            </button>
          </div>
        )}

        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button 
            id="btn-health-new-chat" 
            onClick={() => { 
              stopGenerating();
              setMessages([]); 
              setInputText(''); 
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
              }
            }} 
            title="新建对话" 
            className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center bg-white/90 dark:bg-[#0c101c]/90 hover:bg-slate-100 dark:hover:bg-[#161e33] border border-slate-200/90 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5 text-blue-600 dark:text-sky-400" />
          </button>

          <div className="flex-1 flex items-center rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-sm hover:border-blue-400 dark:hover:border-white/[0.2] focus-within:border-blue-500 dark:focus-within:border-sky-400 transition-all px-4 py-2">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (isGenerating) stopGenerating();
                  else handleSendMessage(inputText);
                }
              }}
              placeholder="查询卫星分系统健康状态 (Shift+Enter 换行)..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none min-h-[24px] max-h-44 overflow-y-auto leading-relaxed py-1"
              rows={1}
            />
            <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isGenerating) stopGenerating();
                  else handleSendMessage(inputText);
                }}
                disabled={!isGenerating && !inputText.trim()}
                className={`w-8 h-8 rounded-full p-0 flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer ${isGenerating ? 'bg-rose-500 hover:bg-rose-600 text-white' : inputText.trim() ? 'bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 shadow-blue-500/20' : 'bg-slate-100 dark:bg-[#151b2e] text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                title={isGenerating ? '终止生成' : '发送指令'}
              >
                {isGenerating ? (
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-white shrink-0 pointer-events-none" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="health-check-view" ref={containerRef} className="w-full h-full flex flex-row min-h-0 select-none animate-fadeIn relative">
      {/* 1. 对话区：直接放在内容底层（当 viewMode 为 split 或 chat 时显示） */}
      {(currentViewMode === 'split' || currentViewMode === 'chat') && (
        <div 
          style={currentViewMode === 'split' ? { width: `${chatPanelWidth}px` } : undefined} 
          className={`${currentViewMode === 'split' ? 'h-full shrink-0 flex flex-col' : 'flex-1 h-full flex flex-col'} min-h-0 overflow-hidden z-10`}
        >
          {renderChatArea()}
        </div>
      )}

      {/* 2. 可调节拖拽轴（仅在 split 视图下显示，占位 12px 与页面统一间距 gap-3/12px 一致） */}
      {currentViewMode === 'split' && (
        <div 
          onMouseDown={(e) => { e.preventDefault(); setIsDraggingSplitter(true); }} 
          onDoubleClick={() => {
            if (containerRef.current) {
              setChatPanelWidth(Math.round(containerRef.current.getBoundingClientRect().width * 0.45));
            } else {
              setChatPanelWidth(540);
            }
          }} 
          title="按住左右拖动调整两侧大小，双击恢复默认" 
          className="group relative w-3 h-full shrink-0 cursor-col-resize flex items-center justify-center select-none z-30"
        >
          {/* 细轴指示线：从中间到上下两端渐变透明，悬浮或拖拽时高亮 */}
          <div className={`w-[2px] h-full rounded-full transition-all duration-200 pointer-events-none ${
            isDraggingSplitter
              ? 'bg-gradient-to-b from-transparent via-blue-500 to-transparent dark:via-sky-400 opacity-100 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
              : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-transparent group-hover:via-blue-500/80 group-hover:to-transparent dark:group-hover:via-sky-400/80 group-hover:shadow-[0_0_6px_rgba(59,130,246,0.4)]'
          }`} />
        </div>
      )}

      {/* 3. 看板区：设置最小宽度与最小高度安全值，防止过度压缩 */}
      {(currentViewMode === 'split' || currentViewMode === 'kanban') && (
        <div className="flex-1 h-full flex flex-col min-w-[360px] min-h-[480px] overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c101c]/95 shadow-xs p-3 sm:p-3.5 z-10 space-y-2">
          {/* 看板区顶部栏：右上角卫星下拉筛选：禁止换行 */}
          <div className="shrink-0 flex items-center justify-end gap-2 pb-1.5 border-b border-slate-100 dark:border-white/[0.06] whitespace-nowrap min-w-[320px]">
            {/* 右上角：下拉筛选卫星，筛选到哪个卫星，看板切换为哪颗卫星的数据 */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative inline-block">
                <select
                  id="select-kanban-satellite"
                  value={activeSatellite.id}
                  onChange={(e) => handleSatelliteChange(e.target.value)}
                  className="appearance-none pl-2.5 pr-7 py-0.5 text-[11px] font-bold rounded-lg bg-slate-50 dark:bg-[#121829] border border-slate-200 dark:border-white/[0.12] text-slate-800 dark:text-slate-200 outline-none hover:border-blue-400 dark:hover:border-sky-400 focus:border-blue-500 dark:focus:border-sky-400 cursor-pointer shadow-2xs transition-colors"
                >
                  {satellites.map(sat => (
                    <option key={sat.id} value={sat.id}>
                      {sat.name} ({sat.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* 看板内容主视窗：卫星统计卡与分系统面板固定高度，异常详情区自适应剩余高度并内部滚动 */}
          <div className="flex-1 min-h-0 w-full flex flex-col">
            <HealthStatusDashboard 
              satelliteId={activeSatellite.id}
              satelliteName={activeSatellite.name}
              satelliteCode={activeSatellite.code}
              overviewTimeSpan={overviewTimeSpan}
            />
          </div>
        </div>
      )}
    </div>
  );
};


