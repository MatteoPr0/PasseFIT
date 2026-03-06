import React, { useState, useEffect, useRef } from 'react';

interface EtherInputProps {
  initialValue?: string | number;
  onCommit: (val: string | number) => void;
  ghost?: string;
  className?: string;
}

export const EtherInput: React.FC<EtherInputProps> = ({ initialValue, onCommit, ghost, className = "" }) => {
  const [localVal, setLocalVal] = useState<string | number>(initialValue || '');
  useEffect(() => { setLocalVal(initialValue || ''); }, [initialValue]);
  
  return (
    <input
      type="number" 
      inputMode="decimal" 
      value={localVal} 
      placeholder={ghost || '--'}
      onBlur={() => onCommit(localVal)}
      onChange={(e) => setLocalVal(e.target.value)}
      className={`${className} bg-[#1C1C21] border border-white/[0.08] rounded-2xl py-3 text-center text-[15px] font-mono font-bold tabular-nums text-white outline-none w-full transition-all placeholder:text-gray-600`}
    />
  );
};

interface NoteAreaProps {
  initialValue?: string;
  onCommit: (val: string) => void;
  ghost?: string;
  className?: string;
}

export const NoteArea: React.FC<NoteAreaProps> = ({ initialValue, onCommit, ghost, className = "" }) => {
  const [localVal, setLocalVal] = useState(initialValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setLocalVal(initialValue || ''); }, [initialValue]);
  
  const adjustHeight = () => {
      const el = textareaRef.current;
      if (!el) return;
      if (!localVal || localVal.trim().length === 0) {
          el.style.height = '40px';
          return;
      }
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  };
  useEffect(() => { adjustHeight(); }, [localVal]);
  
  return (
    <textarea
      ref={textareaRef} 
      rows={1} 
      value={localVal} 
      placeholder={ghost || "..."}
      onBlur={() => onCommit(localVal)}
      onChange={(e) => setLocalVal(e.target.value)}
      className={`${className} auto-expand bg-[#1C1C21] border border-white/[0.08] rounded-2xl px-4 py-3 text-[13px] font-medium text-white outline-none w-full transition-all placeholder:text-gray-500`}
    />
  );
};

interface MiniBarChartProps {
  data: { value: number }[];
  height?: number;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, height = 64 }) => {
  const values = (data || []).map(d => Number(d.value || 0));
  const max = Math.max(0, ...values);
  const hasData = max > 0;
  const w = 280, h = 52, padX = 8, padY = 6, baselineY = h - padY;
  const n = Math.max(1, values.length);
  const barW = (w - padX * 2) / n;
  
  return (
    <svg className="w-full" style={{ height }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <line x1={padX} y1={baselineY} x2={w - padX} y2={baselineY} stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
      {!hasData ? (
        <text x={w/2} y={baselineY-10} textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="600">Nessun dato</text>
      ) : (
        values.map((v, i) => {
          const barH = Math.max(4, (v / max) * (baselineY - padY));
          const x = padX + i * barW + barW * 0.15;
          const y = baselineY - barH;
          const bw = barW * 0.7;
          const r = Math.min(8, bw / 2);
          return <rect key={i} x={x} y={y} width={bw} height={barH} rx={r} ry={r} fill="#38bdf8" />;
        })
      )}
    </svg>
  );
};
