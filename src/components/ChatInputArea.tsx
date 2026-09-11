import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Paperclip, 
  ArrowUp, 
  FileText, 
  X
} from 'lucide-react';

interface ChatInputAreaProps {
  onSendMessage: (message: string, attachments?: File[]) => void;
  onStopGenerating: () => void;
  onNewChat: () => void;
  isGenerating: boolean;
  prefillPrompt?: string;
  onClearPrefill?: () => void;
  disabled?: boolean;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  onStopGenerating,
  onNewChat,
  isGenerating,
  prefillPrompt = '',
  onClearPrefill,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as user types multiple lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Sync prefill prompt into input text
  useEffect(() => {
    if (prefillPrompt) {
      setInputText(prefillPrompt);
      if (onClearPrefill) {
        onClearPrefill();
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
      }, 50);
    }
  }, [prefillPrompt, onClearPrefill]);

  const handleSend = () => {
    if (disabled) return;
    if (isGenerating) {
      onStopGenerating();
      return;
    }

    if (!inputText.trim() && attachedFiles.length === 0) return;

    onSendMessage(inputText.trim(), attachedFiles);
    setInputText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift sends message, Shift+Enter creates a new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div id="chat-input-wrapper" className="w-full max-w-3xl mx-auto my-2">
      {/* 附件预览条 */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-2">
          {attachedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono bg-blue-50 dark:bg-sky-500/15 border border-blue-200 dark:border-sky-500/30 text-blue-700 dark:text-sky-300"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px]">{file.name}</span>
              <button
                onClick={() => handleRemoveFile(i)}
                className="text-blue-500 hover:text-blue-800 dark:hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入行：新建对话按钮（+图标） + 自适应多行输入框（右侧包含附件与发送/终止） */}
      <div className="flex items-center gap-2">
        {/* 新建对话按钮（+ 图标） */}
        <button
          id="btn-input-new-chat"
          onClick={onNewChat}
          title="新建对话"
          className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center bg-white/90 dark:bg-[#0c101c]/90 hover:bg-slate-100 dark:hover:bg-[#161e33] border border-slate-200/90 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 text-blue-600 dark:text-sky-400" />
        </button>

        {/* 自适应多行输入框容器 */}
        <div className="flex-1 flex items-center rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#0c101c]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-sm hover:border-blue-400 dark:hover:border-white/[0.2] focus-within:border-blue-500 dark:focus-within:border-sky-400 transition-all px-4 py-2">
          {/* 输入框主体 (支持多行输入与 Shift+Enter 换行，随内容自增高) */}
          <textarea
            ref={textareaRef}
            id="chat-textarea"
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? '本次任务已发起，请到任务看板查看进度，点击左侧 + 号新建对话' : '输入你想执行的任务'}
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:truncate resize-none outline-none min-h-[24px] max-h-44 overflow-y-auto leading-relaxed py-1 disabled:cursor-not-allowed"
          />

          {/* 隐藏文件输入 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept=".csv,.xlsx,.json,.txt,.kml,.geojson"
          />

          {/* 输入框最右侧：附件按钮、发送/终止 按钮 (固定在输入框右下角) */}
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            {/* 附件按钮 */}
            <button
              id="btn-input-attach"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="上传任务表或坐标文件"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* 发送 / 终止 按钮 */}
            <button
              id="btn-send-message"
              type="button"
              onClick={handleSend}
              disabled={disabled || (!isGenerating && !inputText.trim() && attachedFiles.length === 0)}
              title={isGenerating ? '终止生成' : '发送指令 (Enter 发送, Shift+Enter 换行)'}
              className={`w-8 h-8 rounded-full p-0 flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0 ${
                isGenerating
                  ? 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer'
                  : inputText.trim() || attachedFiles.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 cursor-pointer shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-[#151b2e] text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
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
  );
};
