import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { getArrayData } from '../../lib/records';
import { TrendFilters } from './TrendFilters';

export function TrendChart({ records, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  const [range, setRange] = useState('1M');

  const weightData = useMemo(() => {
    const data = [];
    Object.entries(records).forEach(([date, dayData]) => {
      const arr = getArrayData(dayData, 'weight');
      if (arr.length > 0) data.push({ date, weight: Number(arr[arr.length - 1].value) });
    });
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (range === 'ALL') return data;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(range, 10));
    return data.filter((d) => new Date(d.date) >= cutoff);
  }, [records, range]);

  if (weightData.length < 2) {
    return (
      <div className={`p-6 animate-in fade-in ${s('pb-28', 'pb-32')}`}>
        <TrendFilters range={range} setRange={setRange} isLarge={isLarge} />
        <div className={`text-center text-[#A89F91] dark:text-[#888888] ${s('mt-24', 'mt-28')}`}>
          <TrendingUp className={`${s('w-8 h-8', 'w-10 h-10')} mx-auto text-[#D6D0C4] dark:text-[#4A4A4A] mb-4 stroke-[1.5]`} />
          <p className={`tracking-widest ${s('font-medium text-[10px]', 'font-bold text-[12px]')}`}>資料不足</p>
          <p className={`${s('text-[9px]', 'text-[11px] font-medium')} mt-2 font-light`}>需要兩天以上的紀錄來產生趨勢線</p>
        </div>
      </div>
    );
  }

  const weights = weightData.map((d) => d.weight);
  let minW = Math.floor(Math.min(...weights));
  let maxW = Math.ceil(Math.max(...weights));
  if (maxW === minW) {
    minW -= 1;
    maxW += 1;
  }
  if ((maxW - minW) % 2 !== 0) {
    maxW += 1;
  }

  const viewBoxWidth = 320;
  const viewBoxHeight = 180;
  const paddingX = s(20, 20);
  const paddingY = 25;
  const points = weightData.map((d, i) => ({
    x: paddingX + (i / (weightData.length - 1)) * (viewBoxWidth - paddingX * 2),
    y: viewBoxHeight - paddingY - ((d.weight - minW) / (maxW - minW)) * (viewBoxHeight - paddingY * 2),
    dateStr: d.date,
  }));
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const xAxisLabels = [];
  let lastMonth = null;
  points.forEach((p) => {
    const m = parseInt(p.dateStr.split('-')[1], 10);
    if (m !== lastMonth) {
      xAxisLabels.push({ x: p.x, label: `${m}月` });
      lastMonth = m;
    }
  });

  return (
    <div className={`p-6 animate-in fade-in duration-500 flex flex-col gap-5 ${s('pb-28', 'pb-32')}`}>
      <TrendFilters range={range} setRange={setRange} isLarge={isLarge} />
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-5', 'p-5')}`}>
        <div className="flex justify-between items-end mb-6 px-1">
          <h2 className={`${s('text-[10px] font-medium', 'text-[12px] font-bold')} tracking-[0.2em] text-[#8C8477] dark:text-[#A1988B] uppercase`}>
            Weight Trend
          </h2>
          <span className={`${s('text-[9px] font-light', 'text-[11px] font-medium')} text-[#A89F91] dark:text-[#888888]`}>
            {weightData[0].date.replace(/-/g, '.')} ~ {weightData[weightData.length - 1].date.replace(/-/g, '.')}
          </span>
        </div>
        <div className="w-full pb-2">
          <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-auto overflow-visible">
            {[0, 0.5, 1].map((r) => {
              const y = paddingY + r * (viewBoxHeight - paddingY * 2);
              const val = Math.round(maxW - r * (maxW - minW));
              return (
                <g key={`y-${r}`}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={viewBoxWidth - paddingX}
                    y2={y}
                    className="stroke-[#F0ECE7] dark:stroke-[#333333]"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    fontSize={s('8', '10')}
                    className={`fill-[#C2BCB6] dark:fill-[#666666] ${s('font-light', 'font-medium')}`}
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              );
            })}
            {xAxisLabels.map((lbl, i) => (
              <g key={`x-${i}`}>
                <line
                  x1={lbl.x}
                  y1={paddingY}
                  x2={lbl.x}
                  y2={viewBoxHeight - paddingY}
                  className="stroke-[#F9F8F6] dark:stroke-[#2A2A2A]"
                  strokeWidth="1"
                />
                <text
                  x={lbl.x}
                  y={viewBoxHeight - paddingY + 18}
                  fontSize={s('8', '10')}
                  className={`fill-[#A89F91] dark:fill-[#888888] ${s('font-light', 'font-medium')}`}
                  textAnchor="middle"
                >
                  {lbl.label}
                </text>
              </g>
            ))}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#C4A495"
              strokeWidth={s('2', '2.5')}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
