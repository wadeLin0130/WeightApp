import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export function SwipeableRecord({ record, onDelete, onEdit, isDiet, isEx, catConfig, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const maxOffset = isLarge ? -85 : -80;
  const triggerOffset = isLarge ? -40 : -40;

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startXRef.current;
    if (deltaX < 0) {
      currentXRef.current = Math.max(deltaX, maxOffset);
      setOffsetX(currentXRef.current);
    } else if (deltaX > 0 && offsetX < 0) {
      currentXRef.current = Math.min(offsetX + deltaX, 0);
      setOffsetX(currentXRef.current);
    }
  };

  const handleTouchEnd = () => {
    if (currentXRef.current < triggerOffset) {
      setOffsetX(maxOffset);
      currentXRef.current = maxOffset;
    } else {
      setOffsetX(0);
      currentXRef.current = 0;
    }
  };

  const displayValue = record.calories ?? record.value ?? 0;

  return (
    <div className="relative w-full mb-3 rounded-2xl overflow-hidden touch-pan-y bg-[#C78D87] dark:bg-[#B86C65]">
      <div className={`absolute inset-y-0 right-0 ${s('w-20', 'w-[85px]')} flex items-center justify-center`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(record.id);
          }}
          className="w-full h-full flex flex-col items-center justify-center text-white active:bg-[#B57C76] dark:active:bg-[#A55F59] transition-colors"
        >
          <Trash2 className={`${s('w-5 h-5 mb-1', 'w-6 h-6 mb-1.5')} stroke-[1.5]`} />
          <span className={s('text-[10px]', 'text-sm font-medium tracking-wide')}>刪除</span>
        </button>
      </div>
      <div
        className={`relative w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] ${s('p-4', 'p-4')} flex justify-between items-center transition-transform duration-200 z-10 h-full border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-2xl min-w-0`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (offsetX === 0) onEdit(record);
          else {
            setOffsetX(0);
            currentXRef.current = 0;
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
          <span
            className={`${s('text-[10px] w-10', 'text-[13px] w-12')} text-[#A89F91] dark:text-[#888888] font-medium shrink-0`}
          >
            {record.time}
          </span>
          <div className={`${s('h-4', 'h-5')} w-[1.5px] bg-[#D6D0C4] dark:bg-[#4A4A4A] shrink-0`} />
          <span
            className={`${s('text-xs', 'text-[15px]')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1] truncate min-w-0`}
          >
            {isDiet || isEx ? record.content || record.type : '紀錄數值'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 pointer-events-none shrink-0 pl-2">
          <span className={`${s('text-sm', 'text-lg')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1]`}>
            {displayValue}
          </span>
          {Number(displayValue) > 0 && (
            <span className={`${s('text-[9px]', 'text-[11px]')} text-[#A89F91] dark:text-[#888888] font-medium`}>
              {catConfig.unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
