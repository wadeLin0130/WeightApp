import { Calendar as CalendarIcon, Droplets, Utensils, Flame } from 'lucide-react';
import { WeightScaleIcon } from '../icons/DynamicIcon';

export function HomeView({
  isLarge,
  targetDate,
  todayStr,
  setTargetDate,
  setModalState,
  openCategoryFlow,
  latestWeight,
  weightChange,
  totalIntake,
  tdee,
  arrWeight,
  arrDiet,
  arrEx,
  totalWater,
}) {
  const s = (n, l) => (isLarge ? l : n);

  return (
    <div className={`p-6 space-y-4 animate-in fade-in duration-500 ${s('pb-28', 'pb-32')}`}>
      <div
        className={`flex items-center justify-between bg-white dark:bg-[#1E1E1E] ${s('p-3.5', 'p-4')} rounded-3xl border border-[#F0ECE7] dark:border-[#333333] shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}
      >
        <button
          type="button"
          onClick={() => setModalState({ view: 'datepicker' })}
          className={`flex items-center gap-2.5 text-[#5C5C5C] dark:text-[#D1D1D1] tracking-wider active:scale-95 transition-transform ${s('text-sm font-medium', 'text-[16px] font-bold gap-3')}`}
        >
          <div
            className={`${s('w-8 h-8', 'w-10 h-10')} rounded-xl bg-[#F9F8F6] dark:bg-[#2A2A2A] flex items-center justify-center border border-[#E8E4DF] dark:border-[#3A3A3A] shrink-0`}
          >
            <CalendarIcon className={`${s('w-4 h-4', 'w-5 h-5')} text-[#8C8477] dark:text-[#A1988B] stroke-[1.5]`} />
          </div>
          {targetDate === todayStr ? '今天' : targetDate.replace(/-/g, '.')}
        </button>
        {targetDate !== todayStr && (
          <button
            type="button"
            onClick={() => setTargetDate(todayStr)}
            className={`${s('text-[10px] px-3 py-1.5', 'text-[13px] px-4 py-2 font-bold')} tracking-widest bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl text-[#8C8477] dark:text-[#A1988B] active:scale-95 transition-all font-medium shrink-0`}
          >
            回今日
          </button>
        )}
      </div>

      <div
        className={`bg-[#EFECE7] dark:bg-[#252525] rounded-3xl ${s('p-6', 'p-6')} shadow-sm border border-[#E8E4DF] dark:border-[#3A3A3A] relative overflow-hidden`}
      >
        <div className="relative z-10 flex justify-between items-start">
          <div className="min-w-0">
            <p className={`text-[#8C8477] dark:text-[#A1988B] ${s('text-[9px] mb-1', 'text-[12px] font-bold mb-1.5')} tracking-widest font-medium`}>
              WEIGHT
            </p>
            <div className={`flex items-baseline ${s('gap-1', 'gap-1.5')}`}>
              <span
                className={`font-light text-[#4A4A4A] dark:text-[#E8E8E8] tracking-tight text-[clamp(2.5rem,12vw,3rem)] ${s('', 'text-[clamp(3rem,15vw,4rem)]')}`}
              >
                {latestWeight || '--'}
              </span>
              <span className={`${s('text-sm', 'text-lg font-medium')} text-[#8C8477] dark:text-[#A1988B] font-light`}>kg</span>
            </div>
            {weightChange && (
              <div
                className={`inline-flex items-center ${s('mt-3 px-3 py-1 text-[10px]', 'mt-3 px-3 py-1.5 text-[12px] font-bold')} rounded-full font-medium bg-white/50 dark:bg-[#333333]/50 text-[#7A756D] dark:text-[#AAAAAA] backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}
              >
                較前次 {Number(weightChange) > 0 ? '+' : ''}
                {weightChange} kg
              </div>
            )}
          </div>
        </div>
        <div className={`mt-6 ${s('pt-4', 'pt-5')} border-t border-[#D6D0C4]/40 dark:border-[#4A4A4A]/40 relative z-10`}>
          <p className={`text-[#8C8477] dark:text-[#A1988B] ${s('text-[9px] mb-1.5', 'text-[12px] font-bold mb-2')} tracking-widest`}>
            INTAKE / TDEE
          </p>
          <div className={`flex items-end ${s('gap-1', 'gap-1.5')}`}>
            <span
              className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] leading-none text-[clamp(1.125rem,6vw,1.875rem)] ${s('', 'font-bold text-[clamp(1.5rem,8vw,2.25rem)]')}`}
            >
              {totalIntake}
            </span>
            <span
              className={`text-[#A89F91] dark:text-[#888888] font-light ${s('text-sm pb-[1px]', 'text-[16px] font-medium pb-[2px]')} leading-none`}
            >
              / {tdee} kcal
            </span>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-2 ${s('gap-3', 'gap-3')}`}>
        {[
          {
            id: 'weight',
            title: '體重',
            icon: WeightScaleIcon,
            val: arrWeight.length ? `已記 ${arrWeight[arrWeight.length - 1].value} kg` : '未紀錄',
            bg: 'bg-[#F5F2EB] dark:bg-[#2C2A25]',
            color: 'text-[#A89F91]',
          },
          {
            id: 'water',
            title: '飲水',
            icon: Droplets,
            val: totalWater ? `${totalWater} ml` : '未紀錄',
            bg: 'bg-[#EDF1F4] dark:bg-[#1E262B]',
            color: 'text-[#93A3B1]',
          },
          {
            id: 'diet',
            title: '飲食',
            icon: Utensils,
            val: arrDiet.length ? `已記 ${arrDiet.length} 筆` : '未紀錄',
            bg: 'bg-[#EEF2ED] dark:bg-[#222B21]',
            color: 'text-[#9AA899]',
          },
          {
            id: 'exercise',
            title: '運動',
            icon: Flame,
            val: arrEx.length ? `已記 ${arrEx.length} 筆` : '未紀錄',
            bg: 'bg-[#F7EFEA] dark:bg-[#2D2520]',
            color: 'text-[#C4A495]',
          },
        ].map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => openCategoryFlow(card.id)}
            className={`bg-white dark:bg-[#1E1E1E] ${s('p-4 gap-3', 'p-4 sm:p-5 gap-3')} rounded-3xl border border-[#F0ECE7] dark:border-[#333333] flex flex-col items-start active:scale-95 transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.01)] min-w-0`}
          >
            <div className={`${s('w-9 h-9', 'w-11 h-11')} rounded-2xl ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`${s('w-4 h-4', 'w-6 h-6')} ${card.color} stroke-[1.5]`} />
            </div>
            <div className="min-w-0 text-left w-full">
              <h3 className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest ${s('text-[11px]', 'text-[14px] font-bold')} truncate`}>
                {card.title}
              </h3>
              <p className={`${s('text-[10px] mt-1 font-light', 'text-[12px] mt-1 font-medium')} text-[#C2BCB6] dark:text-[#666666] tracking-wide truncate`}>
                {card.val}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
