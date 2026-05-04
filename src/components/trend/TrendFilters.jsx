export function TrendFilters({ range, setRange, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  return (
    <div
      className={`flex bg-white dark:bg-[#1E1E1E] rounded-2xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-1', 'p-1.5')}`}
    >
      {['1M', '3M', '6M', '12M', 'ALL'].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRange(r)}
          className={`flex-1 tracking-widest rounded-xl transition-all min-w-0 truncate ${s('py-2 text-[9px] font-medium', 'py-2 text-[11px] font-bold')} ${
            range === r
              ? 'bg-[#F9F8F6] dark:bg-[#2A2A2A] text-[#8C8477] dark:text-[#A1988B] shadow-sm border border-[#E8E4DF] dark:border-[#3A3A3A]'
              : 'text-[#C2BCB6] dark:text-[#666666]'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
