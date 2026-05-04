import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDateString } from '../../lib/dateUtils';
import { getArrayData } from '../../lib/records';

export function CalendarView({ records, viewMode: initialMode, onSelectDate, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  const [viewMode, setViewMode] = useState(initialMode);
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const swipeContainerRef = useRef(null);

  const shiftMonth = (delta) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  useEffect(() => {
    const el = swipeContainerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let lock = null;
    let dx = 0;

    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lock = null;
      dx = 0;
      el.style.transition = 'none';
    };

    const onTouchMove = (e) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      dx = currentX - startX;
      const dy = currentY - startY;

      if (!lock) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) lock = 'horizontal';
        else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) lock = 'vertical';
      }

      if (lock === 'horizontal') {
        if (e.cancelable) e.preventDefault();
        el.style.transform = `translateX(calc(-40% + ${dx}px))`;
      }
    };

    const onTouchEnd = () => {
      if (lock === 'horizontal') {
        el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        if (dx > 60) {
          el.style.transform = `translateX(-20%)`;
          setTimeout(() => {
            el.style.transition = 'none';
            el.style.transform = `translateX(-40%)`;
            shiftMonth(-1);
          }, 300);
        } else if (dx < -60) {
          el.style.transform = `translateX(-60%)`;
          setTimeout(() => {
            el.style.transition = 'none';
            el.style.transform = `translateX(-40%)`;
            shiftMonth(1);
          }, 300);
        } else {
          el.style.transform = `translateX(-40%)`;
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const monthsData = useMemo(() => {
    return [-2, -1, 0, 1, 2].map((offset) => {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const days = Array(firstDay)
        .fill(null)
        .concat(Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)));
      return { id: `${year}-${month}`, year, month, days };
    });
  }, [currentMonth]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  return (
    <div className={`p-6 animate-in fade-in duration-500 overflow-hidden ${s('pb-28', 'pb-32')}`}>
      <div className="flex border-b border-[#E8E4DF] dark:border-[#3A3A3A] mb-6">
        {[
          { id: 'weight', label: '體重' },
          { id: 'diet', label: '飲食' },
          { id: 'exercise', label: '運動' },
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setViewMode(mode.id)}
            className={`flex-1 ${s('pb-2 text-[10px]', 'pb-3 text-[13px]')} tracking-widest transition-all relative ${
              viewMode === mode.id
                ? `text-[#8C8477] dark:text-[#A1988B] ${s('font-medium', 'font-bold')}`
                : `text-[#C2BCB6] dark:text-[#666666] ${s('font-light', 'font-medium')}`
            }`}
          >
            {mode.label}
            {viewMode === mode.id && (
              <div
                className={`absolute bottom-0 left-0 w-full border-[#8C8477] dark:border-[#A1988B] ${s('border-b-[2px]', 'border-b-[3px]')}`}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-5 px-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className={`${s('p-1.5', 'p-1.5')} hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-full text-[#8C8477] dark:text-[#A1988B] active:scale-90 transition-transform`}
        >
          <ChevronLeft className={s('w-4 h-4', 'w-5 h-5')} />
        </button>
        <h2 className={`${s('text-xs font-medium', 'text-[15px] font-bold')} tracking-[0.2em] text-[#5C5C5C] dark:text-[#D1D1D1]`}>
          {year} . {String(month + 1).padStart(2, '0')}
        </h2>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className={`${s('p-1.5', 'p-1.5')} hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-full text-[#8C8477] dark:text-[#A1988B] active:scale-90 transition-transform`}
        >
          <ChevronRight className={s('w-4 h-4', 'w-5 h-5')} />
        </button>
      </div>

      <div className="w-full relative">
        <div className={`grid grid-cols-7 ${s('gap-1.5', 'gap-1')} mb-2`}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div
              key={i}
              className={`text-center tracking-widest text-[#C2BCB6] dark:text-[#666666] ${s('text-[9px] font-medium', 'text-[11px] font-bold')}`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="-mr-6">
          <div ref={swipeContainerRef} className="flex w-[500%] will-change-transform touch-pan-y" style={{ transform: 'translateX(-40%)' }}>
            {monthsData.map((mData) => (
              <div key={mData.id} className="w-1/5 shrink-0 pr-6">
                <div className={`grid grid-cols-7 ${s('gap-1.5', 'gap-1')}`}>
                  {mData.days.map((date, idx) => {
                    const heightClass = s('h-[3.8rem]', 'h-[4.2rem]');
                    if (!date) return <div key={`e-${idx}`} className={`${heightClass} bg-transparent pointer-events-none`} />;

                    const dStr = getDateString(date);
                    const dayData = records[dStr] || {};
                    const arr = getArrayData(dayData, viewMode);
                    const isToday = dStr === getDateString(new Date());
                    let cellContent = null;

                    if (arr.length > 0) {
                      if (viewMode === 'weight') {
                        const latestW = arr[arr.length - 1].value;
                        let prevW = null;
                        for (let i = 1; i <= 7; i++) {
                          const pArr = getArrayData(records[getDateString(new Date(date.getTime() - i * 86400000))] || {}, 'weight');
                          if (pArr.length > 0) {
                            prevW = pArr[pArr.length - 1].value;
                            break;
                          }
                        }
                        const diff = prevW ? (latestW - prevW).toFixed(2) : null;
                        let diffEl = null;
                        const iconSize = s('5', '7');
                        const strVal = String(latestW);
                        const mainFontSize = strVal.length >= 5 ? s('8.5px', '10.5px') : s('11px', '14px');

                        if (diff !== null) {
                          const nDiff = Number(diff);
                          const diffStr = Math.abs(nDiff).toFixed(2);
                          const diffLen = diffStr.length;
                          const diffFontSize = diffLen >= 5 ? s('7.5px', '8.5px') : s('8.5px', '10px');

                          if (nDiff > 0)
                            diffEl = (
                              <span
                                style={{ fontSize: diffFontSize }}
                                className="mt-[2px] text-[#9AA899] font-bold flex items-center justify-center gap-[1px] whitespace-nowrap tracking-tighter"
                              >
                                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                                  <path d="M12 3L22 20H2L12 3Z" />
                                </svg>
                                <span>{diffStr}</span>
                              </span>
                            );
                          else if (nDiff < 0)
                            diffEl = (
                              <span
                                style={{ fontSize: diffFontSize }}
                                className="mt-[2px] text-[#C78D87] dark:text-[#B86C65] font-bold flex items-center justify-center gap-[1px] whitespace-nowrap tracking-tighter"
                              >
                                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                                  <path d="M12 21L2 4H22L12 21Z" />
                                </svg>
                                <span>{diffStr}</span>
                              </span>
                            );
                          else
                            diffEl = (
                              <span
                                style={{ fontSize: diffFontSize }}
                                className="mt-[2px] font-medium text-[#C2BCB6] dark:text-[#666666] text-center whitespace-nowrap tracking-tighter"
                              >
                                0.00
                              </span>
                            );
                        }
                        cellContent = (
                          <div className="flex flex-col items-center justify-center min-w-0">
                            <span
                              style={{ fontSize: mainFontSize }}
                              className="font-bold text-[#5C5C5C] dark:text-[#D1D1D1] leading-none text-center whitespace-nowrap tracking-tighter"
                            >
                              {latestW}
                            </span>
                            {diffEl}
                          </div>
                        );
                      } else if (viewMode === 'diet') {
                        const cals = arr.reduce((sum, a) => sum + (Number(a.calories ?? a.value) || 0), 0);
                        const calsLen = String(cals).length;
                        const calsFontSize = calsLen >= 4 ? s('9px', '11px') : s('10px', '12px');
                        cellContent = (
                          <div className="flex justify-center min-w-0">
                            <span
                              style={{ fontSize: calsFontSize }}
                              className="font-bold text-[#9AA899] text-center whitespace-nowrap tracking-tighter"
                            >
                              {cals > 0 ? cals : '✓'}
                            </span>
                          </div>
                        );
                      } else if (viewMode === 'exercise') {
                        const cals = arr.reduce((sum, a) => sum + (Number(a.calories ?? a.value) || 0), 0);
                        const calsLen = String(cals).length;
                        const calsFontSize = calsLen >= 4 ? s('9px', '11px') : s('10px', '12px');
                        cellContent = (
                          <div className="flex justify-center min-w-0">
                            <span
                              style={{ fontSize: calsFontSize }}
                              className="font-bold text-[#C4A495] text-center whitespace-nowrap tracking-tighter"
                            >
                              {cals > 0 ? cals : '✓'}
                            </span>
                          </div>
                        );
                      }
                    }

                    return (
                      <button
                        key={dStr}
                        type="button"
                        onClick={() => onSelectDate(dStr, viewMode)}
                        className={`${heightClass} ${s('rounded-[10px] p-1', 'rounded-[12px] p-1.5')} flex flex-col items-center transition-colors border active:scale-95 min-w-0 overflow-hidden ${
                          isToday
                            ? 'bg-[#F9F8F6] dark:bg-[#2A2A2A] border-[#D6D0C4] dark:border-[#4A4A4A]'
                            : 'bg-white dark:bg-[#1E1E1E] border-[#F0ECE7] dark:border-[#333333]'
                        }`}
                      >
                        <span
                          className={`${s('text-[8px] mb-1 font-medium', 'text-[11px] mb-1 font-bold')} ${isToday ? 'text-[#8C8477] dark:text-[#A1988B]' : 'text-[#A89F91] dark:text-[#888888]'} shrink-0`}
                        >
                          {date.getDate()}
                        </span>
                        <div className="flex-1 flex items-center justify-center pointer-events-none min-w-0">{cellContent}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p
        className={`text-center text-[#C2BCB6] dark:text-[#666666] tracking-widest ${s('text-[9px] mt-6 font-light', 'text-[11px] mt-8 font-medium')}`}
      >
        點擊日期即可查看或編輯紀錄，左右滑動切換月份
      </p>
    </div>
  );
}
