import React from 'react';
import { Camera } from 'lucide-react';
import { Satellite } from '../types';

interface ToolCardsProps {
  satellites: Satellite[];
  onSelectSingleOrbit: () => void;
}

export const ToolCards: React.FC<ToolCardsProps> = ({
  satellites,
  onSelectSingleOrbit,
}) => {
  // 建链状态机：入境前 30s 倒计时 → 入境后建链中 → 建链成功/失败 → 星上模型启动成功/失败 → 可发指令 60s → 指令窗口已结束
  const connectingSat = satellites.find(s => s.status === 'in-bound' && s.linkState === 'connecting');
  const linkSuccessSat = satellites.find(s => s.status === 'in-bound' && s.linkState === 'link-success');
  const linkFailedSat = satellites.find(s => s.status === 'in-bound' && s.linkState === 'link-failed');
  const startSuccessSat = satellites.find(s => s.status === 'in-bound' && s.linkState === 'start-success');
  const startFailedSat = satellites.find(s => s.status === 'in-bound' && s.linkState === 'start-failed');
  const sendableSat = satellites.find(s => s.status === 'in-bound' && s.linkState === 'sendable');
  const windowClosedSat = satellites.find(s => s.status === 'in-bound' && s.linkState === 'window-closed');
  const preEntrySat = satellites
    .filter(s => s.status === 'upcoming' && s.countdownSeconds <= 30)
    .sort((a, b) => a.countdownSeconds - b.countdownSeconds)[0];

  type CardState = 'pre-entry' | 'connecting' | 'link-success' | 'link-failed' | 'start-success' | 'start-failed' | 'sendable' | 'window-closed' | 'idle';
  let cardState: CardState = 'idle';
  let activeSat: Satellite | undefined;

  if (sendableSat) {
    cardState = 'sendable';
    activeSat = sendableSat;
  } else if (startSuccessSat) {
    cardState = 'start-success';
    activeSat = startSuccessSat;
  } else if (startFailedSat) {
    cardState = 'start-failed';
    activeSat = startFailedSat;
  } else if (linkSuccessSat) {
    cardState = 'link-success';
    activeSat = linkSuccessSat;
  } else if (linkFailedSat) {
    cardState = 'link-failed';
    activeSat = linkFailedSat;
  } else if (connectingSat) {
    cardState = 'connecting';
    activeSat = connectingSat;
  } else if (preEntrySat) {
    cardState = 'pre-entry';
    activeSat = preEntrySat;
  } else if (windowClosedSat) {
    cardState = 'window-closed';
    activeSat = windowClosedSat;
  }

  // 指令发送窗口已结束状态下不显示卡片
  if (cardState === 'window-closed') {
    return null;
  }

  const isClickable = cardState === 'sendable';
  const remainingCommandSeconds = activeSat?.linkStateSeconds ?? 0;

  // 文案拆分为前缀/高亮倒计时数字/后缀，仅倒计时数字部分加底色强调
  type LabelSegments = { prefix: string; highlight?: string; suffix?: string };
  const labelSegments: LabelSegments = (() => {
    switch (cardState) {
      case 'pre-entry':
        return { prefix: `${activeSat?.name} 还有`, highlight: `${activeSat?.countdownSeconds}s`, suffix: '入境' };
      case 'connecting':
        return { prefix: `${activeSat?.name}已入境，正在建链` };
      case 'link-success':
        return { prefix: `${activeSat?.name}建链成功` };
      case 'link-failed':
        return { prefix: `建链失败：${activeSat?.name}建链失败` };
      case 'start-success':
        return { prefix: `${activeSat?.name}星上模型已启动` };
      case 'start-failed':
        return { prefix: `${activeSat?.name}星上模型启动失败` };
      case 'sendable':
        return { prefix: `可以给${activeSat?.name}发送指令，还剩`, highlight: `${remainingCommandSeconds}s`, suffix: undefined };
      default:
        return { prefix: '待入境不可用' };
    }
  })();

  const titleText = (() => {
    switch (cardState) {
      case 'pre-entry':
        return `${activeSat?.name} 即将入境，剩余 ${activeSat?.countdownSeconds}s`;
      case 'connecting':
        return `${activeSat?.name} 已入境，正在建链，请稍候`;
      case 'link-success':
        return `${activeSat?.name} 建链成功`;
      case 'link-failed':
        return `${activeSat?.name} 建链失败`;
      case 'start-success':
        return `${activeSat?.name} 星上模型已启动`;
      case 'start-failed':
        return `${activeSat?.name} 星上模型启动失败`;
      case 'sendable':
        return `开启${activeSat?.name}发送指令窗口，剩余 ${remainingCommandSeconds}s结束`;
      default:
        return '待入境不可用';
    }
  })();

  // 入境倒计时(状态1)与建链中(状态2)均需明显提醒：琥珀色高亮 + 呼吸光晕 + 跳动圆点，区别于普通不可点击的灰态
  const isPreEntry = cardState === 'pre-entry';
  const isConnecting = cardState === 'connecting';
  const isAlertState = isPreEntry || isConnecting;
  // 建链成功/启动成功为短暂的过程性提示，仅静态展示，不可点击
  const isTransientSuccess = cardState === 'link-success' || cardState === 'start-success';

  const buttonStyle = isClickable
    ? 'cursor-pointer bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:border-emerald-500 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 shadow-2xs active:scale-95'
    : isAlertState
      ? 'cursor-not-allowed bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-400/70 text-amber-800 dark:text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.45)] animate-pulse'
      : isTransientSuccess
        ? 'cursor-not-allowed bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
        : 'cursor-not-allowed opacity-60 bg-slate-100/80 dark:bg-[#111728]/60 border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400';

  const highlightStyle = isClickable
    ? 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300'
    : isAlertState
      ? 'bg-amber-200/80 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300'
      : 'bg-slate-200/80 dark:bg-white/[0.08] text-slate-500 dark:text-slate-400';

  return (
    <div className="w-full flex items-center justify-center">
      {/* 极简小卡片：一轨成像（入境+建链状态机），置于输入框正上方居中，字体与系统保持统一 */}
      <button
        id="card-tool-single-orbit"
        type="button"
        disabled={!isClickable}
        onClick={() => {
          if (isClickable) {
            onSelectSingleOrbit();
          }
        }}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-sans font-medium select-none transition-all ${buttonStyle}`}
        title={titleText}
      >
        <Camera className="w-3.5 h-3.5 shrink-0" />
        <span className={isAlertState ? 'font-semibold' : undefined}>{labelSegments.prefix}</span>
        {labelSegments.highlight && (
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-sans font-semibold ${highlightStyle}`}>
            {labelSegments.highlight}
          </span>
        )}
        {labelSegments.suffix && <span className={isAlertState ? 'font-semibold' : undefined}>{labelSegments.suffix}</span>}
      </button>
    </div>
  );
};

