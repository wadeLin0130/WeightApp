import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDateString } from '../../lib/dateUtils';

export function DashboardDatePicker({ initialDate, onSelect, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  const [viewDate, setViewDate] = useState(new Date(initialDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)));

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className={s('space-y-4', 'space-y-5')}>
      <div
        className={`flex justify-between items-center bg-[#F9F8F6] dark:bg-[#2A2A2A] ${s('p-2', 'p-2')} rounded-2xl border border-[#E8E4DF] dark:border-[#3A3A3A]`}
      >
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-2 text-[#8C8477] dark:text-[#A1988B] hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-xl transition-colors active:scale-90"
        >
          <ChevronLeft className={s('w-5 h-5', 'w-6 h-6')} />
        </button>
        <div className="flex gap-2">
          <div
            className={`relative flex items-center bg-white dark:bg-[#1E1E1E] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl ${s('px-1', 'px-1.5')} shadow-sm`}
          >
            <select
              value={year}
              onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
              className={`appearance-none bg-transparent ${s('py-2 pl-3 pr-6 text-sm', 'py-2 pl-3 pr-7 text-base')} outline-none text-[#5C5C5C] dark:text-[#D1D1D1] font-medium`}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <div
              className={`absolute ${s('right-2 text-[10px]', 'right-2 text-[11px]')} pointer-events-none text-[#A89F91] dark:text-[#888888]`}
            >
              ▼
            </div>
          </div>
          <div
            className={`relative flex items-center bg-white dark:bg-[#1E1E1E] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl ${s('px-1', 'px-1.5')} shadow-sm`}
          >
            <select
              value={month}
              onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
              className={`appearance-none bg-transparent ${s('py-2 pl-3 pr-6 text-sm', 'py-2 pl-3 pr-7 text-base')} outline-none text-[#5C5C5C] dark:text-[#D1D1D1] font-medium`}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {String(m + 1).padStart(2, '0')} 月
                </option>
              ))}
            </select>
            <div
              className={`absolute ${s('right-2 text-[10px]', 'right-2 text-[11px]')} pointer-events-none text-[#A89F91] dark:text-[#888888]`}
            >
              ▼
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-2 text-[#8C8477] dark:text-[#A1988B] hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-xl transition-colors active:scale-90"
        >
          <ChevronRight className={s('w-5 h-5', 'w-6 h-6')} />
        </button>
      </div>
      <div
        className={`grid grid-cols-7 ${s('gap-1.5 text-[10px] font-medium', 'gap-1.5 text-[12px] font-bold')} text-center mb-2 px-1 text-[#A89F91] dark:text-[#888888] tracking-widest`}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${s('gap-1.5', 'gap-1.5')} px-1 pb-4`}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const dStr = getDateString(d);
          const isTarget = dStr === initialDate;
          const isToday = dStr === getDateString(new Date());
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(dStr)}
              className={`aspect-square flex items-center justify-center transition-all active:scale-90 ${s('rounded-xl text-xs font-medium', 'rounded-2xl text-[15px] font-bold')} ${
                isTarget
                  ? 'bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] shadow-md'
                  : isToday
                    ? 'border-2 border-[#D6D0C4] dark:border-[#4A4A4A] text-[#8C8477] dark:text-[#A1988B] bg-[#F9F8F6] dark:bg-[#2A2A2A]'
                    : 'text-[#5C5C5C] dark:text-[#D1D1D1] hover:bg-[#EFECE7] dark:hover:bg-[#333333] border border-transparent'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
