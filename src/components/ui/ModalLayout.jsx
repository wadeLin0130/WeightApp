import { ChevronLeft, X } from 'lucide-react';

export function ModalLayout({ title, onBack, onClose, children, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#4A4A4A]/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] ${s('p-6', 'p-5 sm:p-6')} shadow-2xl animate-in slide-in-from-bottom-8 border border-[#F0ECE7] dark:border-[#333333] max-h-[90vh] flex flex-col relative`}
      >
        <div
          className={`flex justify-between items-center ${s('mb-6 pb-2', 'mb-5 pb-2')} sticky top-0 bg-white dark:bg-[#1E1E1E] z-10 shrink-0`}
        >
          <div className={`flex items-center ${s('gap-2', 'gap-3')} min-w-0`}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 -ml-1.5 text-[#A89F91] dark:text-[#888888] active:scale-90 shrink-0"
              >
                <ChevronLeft className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5]`} />
              </button>
            )}
            <h2
              className={`${s('text-[13px] font-medium', 'text-[16px] font-bold')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest truncate`}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-[#F9F8F6] dark:bg-[#2A2A2A] rounded-full text-[#A89F91] dark:text-[#888888] active:scale-90 shrink-0"
          >
            <X className={`${s('w-4 h-4', 'w-5 h-5')}`} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2">{children}</div>
      </div>
    </div>
  );
}
