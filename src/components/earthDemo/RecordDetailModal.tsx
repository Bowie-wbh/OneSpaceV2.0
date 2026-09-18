import React from 'react';
import { HistoryRecord } from '../../types/earthDemoTypes';
import { CATEGORIES_DATA } from '../../data/mockRemoteSensingData';
import { 
  X, 
  Download, 
  Globe, 
  Calendar, 
  Clock, 
  Layers, 
  FileText, 
  ShieldCheck, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

interface RecordDetailModalProps {
  record: HistoryRecord | null;
  onClose: () => void;
  onOverlayFootprint: (record: HistoryRecord) => void;
  isFootprintActive: boolean;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onOverlayFootprint,
  isFootprintActive,
}) => {
  if (!record) return null;

  const category = CATEGORIES_DATA[record.categoryId] || {
    name: '遥感成果',
    englishName: 'Remote Sensing Asset',
    color: '#0284c7',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 2xl:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-2xl 2xl:max-w-3xl max-h-[85vh] 2xl:max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal 头部 */}
        <div className="p-3 sm:p-4 2xl:p-5 border-b border-slate-800 flex items-start justify-between gap-3 sm:gap-4 bg-slate-950/50">
          <div className="flex items-start gap-2.5 sm:gap-3.5">
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 2xl:w-11 2xl:h-11 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 mt-0.5"
              style={{ backgroundColor: category.color }}
            >
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700/60">
                  {record.id}
                </span>
                <span className="text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {category.name} · {record.platformType}
                </span>
                <span
                  className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${
                    record.status === 'normal'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {record.status === 'normal' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  <span>{record.statusLabel}</span>
                </span>
              </div>

              <h2 className="text-sm sm:text-base 2xl:text-lg font-bold text-white mt-1">
                {record.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 2. Modal 主体内容 (滚动区) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 2xl:p-6 space-y-3.5 sm:space-y-4 2xl:space-y-5">
          
          {/* 遥感解译综述 */}
          <div className="bg-slate-950/50 rounded-xl p-3 sm:p-3.5 border border-slate-800/80">
            <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              解译分析综合论述
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {record.summary}
            </p>
          </div>

          {/* 遥感/监测指标参数卡片 */}
          <div>
            <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              关键量测指标与参数
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 2xl:gap-2.5">
              {record.keyMetrics.map((metric, idx) => (
                <div key={idx} className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block mb-0.5 sm:mb-1">{metric.label}</span>
                  <span className={`text-xs sm:text-sm font-bold ${metric.status === 'warn' ? 'text-amber-400' : 'text-white'}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 时序动态曲线图 (Recharts) */}
          {record.trendData && record.trendData.length > 0 && (
            <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h4 className="text-[11px] sm:text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                  监测要素时序演变曲线
                </h4>
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                  指标单位: {record.trendData[0]?.unit}
                </span>
              </div>

              <div className="h-36 sm:h-44 2xl:h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={record.trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                    />
                    {record.trendData[0]?.threshold && (
                      <ReferenceLine
                        y={record.trendData[0].threshold}
                        label={{ value: '安全阈值', fill: '#f43f5e', fontSize: 10, position: 'top' }}
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="实测值"
                      stroke={category.color}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: category.color }}
                      activeDot={{ r: 5.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 遥感空间图层元数据规格表 */}
          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
            <h4 className="text-[11px] sm:text-xs font-semibold text-slate-300 mb-2 sm:mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
              遥感影像与测绘元数据表
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 sm:gap-y-2.5 gap-x-4 sm:gap-x-6 text-[11px] sm:text-xs">
              <div className="flex justify-between py-0.5 sm:py-1 border-b border-slate-800/60">
                <span className="text-slate-400">传感器载荷:</span>
                <span className="text-slate-200 font-medium">{record.sensor}</span>
              </div>
              <div className="flex justify-between py-0.5 sm:py-1 border-b border-slate-800/60">
                <span className="text-slate-400">波段/通道:</span>
                <span className="text-slate-200 font-medium">{record.bandsOrChannel}</span>
              </div>
              <div className="flex justify-between py-0.5 sm:py-1 border-b border-slate-800/60">
                <span className="text-slate-400">空间分辨率:</span>
                <span className="text-slate-200 font-medium">{record.resolution}</span>
              </div>
              <div className="flex justify-between py-0.5 sm:py-1 border-b border-slate-800/60">
                <span className="text-slate-400">成果级别:</span>
                <span className="text-slate-200 font-medium">{record.dataLevel}</span>
              </div>
              <div className="flex justify-between py-0.5 sm:py-1 border-b border-slate-800/60">
                <span className="text-slate-400">坐标基准:</span>
                <span className="text-slate-200 font-medium">{record.details.coordinateSystem}</span>
              </div>
              <div className="flex justify-between py-0.5 sm:py-1 border-b border-slate-800/60">
                <span className="text-slate-400">中心坐标:</span>
                <span className="text-slate-200 font-mono">{record.details.coordinates}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">数据文件大小:</span>
                <span className="text-slate-200 font-mono">{record.details.fileSize}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">质检评分:</span>
                <span className="text-emerald-400 font-semibold">{record.details.qualityScore}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 3. Modal 底部操作栏 */}
        <div className="p-4 md:p-5 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <button
            onClick={() => onOverlayFootprint(record)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              isFootprintActive
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{isFootprintActive ? '已在Cesium地球叠置' : '在三维地球叠置此覆盖区'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                alert(`已成功打包导出 ${record.id} 空间元数据及GeoTIFF索引解译简报！`);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>导出解译报告</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              关闭
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
