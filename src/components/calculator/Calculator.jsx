import { useState } from 'react';
import { Delete } from 'lucide-react';

export function Calculator({ onSave, title, placeholder, initialValue = '', isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  const [expr, setExpr] = useState(initialValue);

  const handlePress = (val) => {
    if (val === 'C') {
      setExpr('');
      return;
    }
    if (val === 'DEL') {
      setExpr((prev) => prev.slice(0, -1));
      return;
    }
    if (val === '=') {
      try {
        const result = new Function(
          `'use strict'; return (${expr.replace(/×/g, '*').replace(/÷/g, '/')})`,
        )();
        if (!isNaN(result) && isFinite(result)) {
          setExpr(String(Math.round(result * 100) / 100));
        }
      } catch {
        setExpr('Error');
        setTimeout(() => setExpr(''), 1000);
      }
      return;
    }
    if (expr === 'Error') {
      setExpr(val);
      return;
    }
    setExpr((prev) => prev + val);
  };

  const handleConfirm = () => {
    let finalVal = expr;
    if (/[+×÷-]/.test(expr)) {
      try {
        finalVal = String(
          new Function(`'use strict'; return (${expr.replace(/×/g, '*').replace(/÷/g, '/')})`)(),
        );
      } catch {
        return;
      }
    }
    if (finalVal || finalVal === '') onSave(finalVal);
  };

  const btns = [
    { label: 'C', col: 1 },
    { label: 'DEL', col: 1 },
    { label: '÷', col: 1 },
    { label: '×', col: 1 },
    { label: '7', col: 1 },
    { label: '8', col: 1 },
    { label: '9', col: 1 },
    { label: '-', col: 1 },
    { label: '4', col: 1 },
    { label: '5', col: 1 },
    { label: '6', col: 1 },
    { label: '+', col: 1 },
    { label: '1', col: 1 },
    { label: '2', col: 1 },
    { label: '3', col: 1 },
    { label: '=', col: 1, row: 2, isEq: true },
    { label: '0', col: 2 },
    { label: '.', col: 1 },
  ];

  const displayStr = expr || placeholder;
  const getFontSize = (text) => {
    const len = text.length;
    if (isLarge) {
      if (len <= 7) return 'clamp(2rem, 10vw, 3rem)';
      if (len <= 10) return 'clamp(1.5rem, 8vw, 2.25rem)';
      if (len <= 14) return 'clamp(1.2rem, 6vw, 1.875rem)';
      return 'clamp(1rem, 5vw, 1.5rem)';
    }
    if (len <= 7) return 'clamp(1.75rem, 8vw, 2.25rem)';
    if (len <= 10) return 'clamp(1.5rem, 6vw, 1.875rem)';
    if (len <= 14) return 'clamp(1.25rem, 5vw, 1.5rem)';
    return '1.125rem';
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-2xl ${s('p-4 min-h-[5.5rem]', 'p-4 min-h-[6.5rem]')} flex flex-col items-end justify-center overflow-hidden transition-all`}
      >
        <p
          className={`text-[#A89F91] dark:text-[#888888] ${s('text-[10px]', 'text-[12px]')} tracking-widest font-medium mb-1 shrink-0`}
        >
          {title}
        </p>
        <p
          className="font-light text-[#4A4A4A] dark:text-[#E8E8E8] tracking-wider w-full text-right transition-all duration-200 truncate leading-none pb-1 min-w-0"
          style={{ fontSize: getFontSize(displayStr) }}
        >
          {displayStr}
        </p>
      </div>
      <div className={`grid grid-cols-4 ${s('gap-2', 'gap-2.5')}`}>
        {btns.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => handlePress(btn.label)}
            className={`${s('h-12 text-xl', 'h-14 text-2xl')} rounded-2xl font-light flex items-center justify-center transition-colors active:scale-95
                ${btn.col === 2 ? 'col-span-2' : 'col-span-1'}
                ${btn.row === 2 ? 'row-span-2' : 'row-span-1'}
                ${
                  btn.isEq
                    ? 'bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212]'
                    : ['÷', '×', '-', '+'].includes(btn.label)
                      ? 'bg-[#EFECE7] dark:bg-[#333333] text-[#8C8477] dark:text-[#A1988B]'
                      : ['C', 'DEL'].includes(btn.label)
                        ? 'bg-[#F7EFEA] dark:bg-[#2D2520] text-[#C4A495] dark:text-[#C4A495]'
                        : 'bg-white dark:bg-[#1E1E1E] border border-[#F0ECE7] dark:border-[#333333] text-[#5C5C5C] dark:text-[#D1D1D1]'
                }`}
          >
            {btn.label === 'DEL' ? (
              <Delete className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5]`} />
            ) : (
              btn.label
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={handleConfirm}
          className={`col-span-4 ${s('h-12', 'h-14 text-[16px]')} bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-2xl font-medium tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2`}
        >
          儲存紀錄
        </button>
      </div>
    </div>
  );
}
