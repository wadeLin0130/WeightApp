import { Settings, CheckCircle2, ShieldCheck, Moon as MoonIcon } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export function SettingsView({ profile, onChangeSetting, onSave, isDirty, user, auth, isLarge }) {
  const s = (n, l) => (isLarge ? l : n);
  const themeMode = profile.themeMode || 'auto';
  return (
    <div className={`p-6 animate-in fade-in duration-500 ${s('space-y-5 pb-28', 'space-y-5 pb-32')}`}>
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6 space-y-5', 'p-6 space-y-5')}`}>
        <h2
          className={`${s('text-xs font-medium mb-4', 'text-[14px] font-bold mb-4')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest flex items-center gap-2`}
        >
          <Settings className={`${s('w-4 h-4', 'w-5 h-5')} text-[#C2BCB6] dark:text-[#666666] stroke-[1.5]`} /> 個人資料設定
        </h2>
        <div className={`grid grid-cols-2 ${s('gap-4', 'gap-4')}`}>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>GENDER</label>
            <div className={`flex ${s('gap-2', 'gap-2')}`}>
              <button
                type="button"
                onClick={() => onChangeSetting({ gender: 'male' })}
                className={`flex-1 rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${
                  profile.gender === 'male'
                    ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]'
                    : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'
                }`}
              >
                男
              </button>
              <button
                type="button"
                onClick={() => onChangeSetting({ gender: 'female' })}
                className={`flex-1 rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${
                  profile.gender === 'female'
                    ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]'
                    : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'
                }`}
              >
                女
              </button>
            </div>
          </div>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>出生年</label>
            <input
              type="number"
              value={profile.birthYear || ''}
              onChange={(e) => onChangeSetting({ birthYear: e.target.value })}
              className={`w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] text-center min-w-0 ${s('p-2.5 text-xs', 'p-3 text-[14px] font-medium')}`}
            />
          </div>
        </div>
        <div className={`grid grid-cols-2 ${s('gap-4', 'gap-4')}`}>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>HEIGHT (cm)</label>
            <input
              type="number"
              value={profile.height || ''}
              onChange={(e) => onChangeSetting({ height: e.target.value })}
              className={`w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] text-center min-w-0 ${s('p-2.5 text-xs', 'p-3 text-[14px] font-medium')}`}
            />
          </div>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>自訂 TDEE</label>
            <input
              type="number"
              placeholder="自動計算"
              value={profile.customTDEE || ''}
              onChange={(e) => onChangeSetting({ customTDEE: e.target.value })}
              className={`w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] text-center placeholder:text-[#C2BCB6] dark:placeholder:text-[#666666] min-w-0 ${s('p-2.5 text-xs', 'p-3 text-[14px] font-medium')}`}
            />
          </div>
        </div>
      </div>
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6 space-y-4', 'p-6 space-y-4')}`}>
        <h2
          className={`${s('text-xs font-medium mb-4', 'text-[14px] font-bold mb-4')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest flex items-center gap-2`}
        >
          <MoonIcon className={`${s('w-4 h-4', 'w-5 h-5')} text-[#C2BCB6] dark:text-[#666666] stroke-[1.5]`} /> 外觀主題
        </h2>
        <div className={`grid grid-cols-3 ${s('gap-2', 'gap-2')}`}>
          <button
            type="button"
            onClick={() => onChangeSetting({ themeMode: 'light' })}
            className={`rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${
              themeMode === 'light'
                ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]'
                : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'
            }`}
          >
            亮色
          </button>
          <button
            type="button"
            onClick={() => onChangeSetting({ themeMode: 'dark' })}
            className={`rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${
              themeMode === 'dark'
                ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]'
                : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'
            }`}
          >
            夜間
          </button>
          <button
            type="button"
            onClick={() => onChangeSetting({ themeMode: 'auto' })}
            className={`rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${
              themeMode === 'auto'
                ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]'
                : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'
            }`}
          >
            自動
          </button>
        </div>
      </div>
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] flex justify-between items-center ${s('p-6', 'p-6')}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`${s('w-10 h-10 rounded-xl', 'w-11 h-11 rounded-2xl')} bg-[#F5F2EB] dark:bg-[#2C2A25] flex items-center justify-center shrink-0`}
          >
            <span className={`${s('text-base font-medium', 'text-lg font-bold')} text-[#A89F91] dark:text-[#888888]`}>Aa</span>
          </div>
          <div className="min-w-0">
            <h3 className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest truncate ${s('text-xs', 'text-[14px] font-bold')}`}>
              視覺友善模式
            </h3>
            <p className={`${s('text-[10px] mt-1', 'text-[11px] mt-1.5')} text-[#A89F91] dark:text-[#888888] font-medium tracking-wide truncate`}>
              放大文字與圖示尺寸
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChangeSetting({ visualFriendly: !profile.visualFriendly })}
          className={`relative rounded-full transition-colors duration-300 shrink-0 ml-2 ${s('w-11 h-6', 'w-12 h-7')} ${
            profile.visualFriendly ? 'bg-[#8C8477] dark:bg-[#A1988B]' : 'bg-[#E8E4DF] dark:bg-[#4A4A4A]'
          }`}
        >
          <div
            className={`absolute bg-white dark:bg-[#D1D1D1] rounded-full transition-transform duration-300 ${s('top-1 left-1 w-4 h-4', 'top-1 left-1 w-5 h-5')} ${
              profile.visualFriendly ? s('translate-x-5', 'translate-x-5') : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      <div
        className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6', 'p-6')} mb-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}
      >
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty}
          className={`w-full rounded-xl font-bold tracking-widest transition-all flex items-center justify-center gap-2 ${s('py-3.5 text-[13px]', 'py-4 text-[15px]')} ${
            isDirty
              ? 'bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] active:scale-95 shadow-md'
              : 'bg-[#F9F8F6] dark:bg-[#2A2A2A] text-[#C2BCB6] dark:text-[#666666] cursor-not-allowed border border-[#E8E4DF] dark:border-[#3A3A3A]'
          }`}
        >
          <CheckCircle2 className={`${s('w-4 h-4', 'w-5 h-5')} stroke-[1.5] ${isDirty ? '' : 'opacity-50'}`} />
          {isDirty ? '儲存所有變更' : '已儲存最新設定'}
        </button>
      </div>
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6 space-y-4', 'p-6 space-y-4')}`}>
        <h2
          className={`${s('text-xs font-medium mb-2', 'text-[14px] font-bold mb-3')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest flex items-center gap-2`}
        >
          <ShieldCheck className={`${s('w-4 h-4', 'w-5 h-5')} text-[#C2BCB6] dark:text-[#666666] stroke-[1.5]`} /> 雲端備份
        </h2>
        {user && !user.isAnonymous ? (
          <div className={`${s('space-y-3 pt-1', 'space-y-3 pt-1')}`}>
            <div
              className={`bg-[#F9F8F6] dark:bg-[#2A2A2A] rounded-xl border border-[#E8E4DF] dark:border-[#3A3A3A] flex items-center gap-3 ${s('p-3', 'p-3.5')}`}
            >
              <CheckCircle2 className={`${s('w-4 h-4', 'w-5 h-5')} text-[#8C8477] dark:text-[#A1988B] stroke-[1.5] shrink-0`} />
              <span className={`${s('text-[11px]', 'text-[13px]')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1] truncate min-w-0`}>{user.email}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                signOut(auth);
                window.location.reload();
              }}
              className={`w-full bg-white dark:bg-[#1E1E1E] text-[#C78D87] dark:text-[#B86C65] rounded-xl font-medium tracking-widest border border-[#F0ECE7] dark:border-[#333333] active:scale-95 ${s('py-3 text-[11px]', 'py-3.5 text-[13px] font-bold')}`}
            >
              登出帳號
            </button>
          </div>
        ) : (
          <div className={s('space-y-3', 'space-y-4')}>
            <p className={`${s('text-[10px] font-light', 'text-[12px] font-medium')} text-[#A89F91] dark:text-[#888888] leading-relaxed`}>
              目前為訪客模式。綁定 Google 帳號可確保資料永久保存並跨裝置同步。
            </p>
            <button
              type="button"
              onClick={() => {
                signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {});
              }}
              className={`w-full bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-xl font-medium tracking-widest active:scale-95 shadow-sm ${s('py-3 text-[11px]', 'py-3.5 text-[13px] font-bold')}`}
            >
              綁定 GOOGLE 帳號
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
