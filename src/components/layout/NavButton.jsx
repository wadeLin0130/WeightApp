export function NavButton({ active, onClick, icon: Icon, label, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${s('gap-1 p-2 w-16', 'gap-1 p-2 w-[70px]')} bg-transparent border-none transition-all duration-300 ${active ? 'text-[#8C8477] dark:text-[#A1988B] -translate-y-1' : 'text-[#C2BCB6] dark:text-[#666666] hover:text-[#A89F91] dark:hover:text-[#888888]'}`}
    >
      <Icon className={`${s('w-[18px] h-[18px]', 'w-6 h-6')} ${active ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
      <span className={`${s('text-[9px] font-medium', 'text-[11px] font-bold')} tracking-widest m-0`}>{label}</span>
      <div
        className={`${s('w-1 h-1 mt-0.5', 'w-1.5 h-1.5 mt-1')} rounded-full bg-[#8C8477] dark:bg-[#A1988B] transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
      />
    </button>
  );
}
