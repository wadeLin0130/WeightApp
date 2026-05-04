import { Plus } from 'lucide-react';
import { getArrayData } from '../../lib/records';
import { ModalLayout } from '../ui/ModalLayout';
import { DashboardDatePicker } from '../ui/DashboardDatePicker';
import { SwipeableRecord } from '../ui/SwipeableRecord';
import { Calculator } from '../calculator/Calculator';
import { DynamicIcon } from '../icons/DynamicIcon';

export function RecordModals({
  modalState,
  setModalState,
  targetDate,
  setTargetDate,
  isLarge,
  records,
  activeProfile,
  handleSaveSettings,
  setActiveTab,
  setDraftProfile,
  updateProfile,
  handleDeleteData,
  handleSaveData,
}) {
  const s = (n, l) => (isLarge ? l : n);
  if (!modalState) return null;

  const { view, category, item, dateStr } = modalState;
  const operateDate = dateStr || targetDate;
  const targetDataForModal = records[operateDate] || {};
  const isDiet = category === 'diet';
  const isEx = category === 'exercise';

  const closeModal = () => setModalState(null);

  if (view === 'confirm_leave') {
    return (
      <ModalLayout title="尚未儲存變更" onClose={closeModal} isLarge={isLarge}>
        <p className={`${s('text-xs', 'text-sm')} text-[#8C8477] dark:text-[#A1988B] mb-6 text-center tracking-wide`}>
          有未儲存的變更，是否儲存？
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              handleSaveSettings();
              setActiveTab(modalState.pendingTab);
              setModalState(null);
            }}
            className={`w-full bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-xl font-bold tracking-widest active:scale-95 transition-all ${s('py-3.5 text-sm', 'py-4 text-[15px]')}`}
          >
            儲存
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftProfile(null);
              setActiveTab(modalState.pendingTab);
              setModalState(null);
            }}
            className={`w-full bg-[#EFECE7] dark:bg-[#333333] text-[#C78D87] dark:text-[#B86C65] rounded-xl font-bold tracking-widest active:scale-95 transition-all ${s('py-3.5 text-sm', 'py-4 text-[15px]')}`}
          >
            捨棄
          </button>
          <button
            type="button"
            onClick={closeModal}
            className={`w-full bg-transparent border border-[#E8E4DF] dark:border-[#3A3A3A] text-[#8C8477] dark:text-[#A1988B] rounded-xl font-bold tracking-widest active:scale-95 transition-all ${s('py-3.5 text-sm', 'py-4 text-[15px]')}`}
          >
            取消
          </button>
        </div>
      </ModalLayout>
    );
  }

  if (view === 'datepicker') {
    return (
      <ModalLayout title="選擇日期" onClose={closeModal} isLarge={isLarge}>
        <DashboardDatePicker
          initialDate={targetDate}
          onSelect={(d) => {
            setTargetDate(d);
            setModalState(null);
          }}
          isLarge={isLarge}
        />
      </ModalLayout>
    );
  }

  if (view === 'list') {
    const arr = getArrayData(targetDataForModal, category);
    const catConfig = {
      weight: { unit: 'kg', name: '體重紀錄' },
      water: { unit: 'ml', name: '飲水紀錄' },
      diet: { unit: 'kcal', name: '飲食紀錄' },
      exercise: { unit: 'kcal', name: '運動紀錄' },
    }[category];

    return (
      <ModalLayout title={catConfig.name} onClose={closeModal} isLarge={isLarge}>
        <div className="mb-20">
          {arr.map((record) => (
            <SwipeableRecord
              key={record.id}
              record={record}
              onDelete={(id) => handleDeleteData(category, id)}
              onEdit={(rec) => setModalState({ view: 'calc', category, item: rec, dateStr: operateDate })}
              isDiet={isDiet}
              isEx={isEx}
              catConfig={catConfig}
              isLarge={isLarge}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setModalState({ view: isDiet || isEx ? 'select' : 'calc', category, dateStr: operateDate })
          }
          className={`absolute bottom-6 right-6 ${s('w-14 h-14', 'w-16 h-16')} bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(140,132,119,0.4)] active:scale-90 transition-transform`}
        >
          <Plus className={`${s('w-6 h-6 stroke-[1.5]', 'w-8 h-8 stroke-[2]')}`} />
        </button>
      </ModalLayout>
    );
  }

  if (view === 'select') {
    const cards = isDiet ? activeProfile.dietCards : activeProfile.exerciseCards;
    const colorClass = isDiet
      ? 'text-[#9AA899] dark:text-[#9AA899] bg-[#EEF2ED] dark:bg-[#222B21] border-[#D6E0D5] dark:border-[#2C3B2A]'
      : 'text-[#C4A495] dark:text-[#C4A495] bg-[#F7EFEA] dark:bg-[#2D2520] border-[#E8D9D1] dark:border-[#3D302A]';
    return (
      <ModalLayout
        title={`選擇${isDiet ? '飲食' : '運動'}項目`}
        onBack={() => getArrayData(targetDataForModal, category).length > 0 && setModalState({ view: 'list', category, dateStr: operateDate })}
        onClose={closeModal}
        isLarge={isLarge}
      >
        <div className={`grid grid-cols-3 ${s('gap-3', 'gap-2 sm:gap-3')}`}>
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() =>
                setModalState({
                  view: 'calc',
                  category,
                  item: { [isDiet ? 'content' : 'type']: card.name },
                  dateStr: operateDate,
                })
              }
              className={`flex flex-col items-center justify-center ${s('p-4 gap-2', 'p-3 gap-2')} rounded-2xl border bg-white dark:bg-[#1E1E1E] active:bg-gray-50 dark:active:bg-[#2A2A2A] transition-colors shadow-sm min-w-0 ${colorClass.split(' ')[2]}`}
            >
              <DynamicIcon
                name={card.icon}
                className={`${s('w-6 h-6', 'w-7 h-7')} stroke-[1.5] shrink-0 ${colorClass.split(' ')[0]}`}
              />
              <span className={`${s('text-[10px]', 'text-[12px] font-bold')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1] truncate w-full text-center`}>
                {card.name}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setModalState({ view: 'new_card', category, dateStr: operateDate })}
            className={`flex flex-col items-center justify-center ${s('p-4 gap-2 border', 'p-3 gap-2 border-2')} rounded-2xl border-dashed border-[#D6D0C4] dark:border-[#4A4A4A] bg-white dark:bg-[#1E1E1E] text-[#A89F91] dark:text-[#888888] active:bg-[#F9F8F6] dark:active:bg-[#2A2A2A] min-w-0`}
          >
            <Plus className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5] shrink-0`} />
            <span className={`${s('text-[9px]', 'text-[12px] font-bold')} tracking-widest truncate w-full text-center`}>新增</span>
          </button>
        </div>
      </ModalLayout>
    );
  }

  if (view === 'calc') {
    let title = '';
    if (category === 'weight') title = '體重 (kg)';
    else if (category === 'water') title = '飲水量 (ml)';
    else if (isDiet) title = '熱量 (kcal)';
    else if (isEx) title = '消耗 (kcal)';

    const initial =
      category === 'weight' || category === 'water'
        ? String(item?.value || '')
        : String(item?.calories ?? item?.value ?? '');

    return (
      <ModalLayout
        title={item?.id ? '修改紀錄' : '新增紀錄'}
        onBack={() =>
          setModalState({
            view: (isDiet || isEx) && !item?.id ? 'select' : 'list',
            category,
            dateStr: operateDate,
          })
        }
        onClose={closeModal}
        isLarge={isLarge}
      >
        {(isDiet || isEx) && (
          <div className={s('mb-4', 'mb-4')}>
            <label className={`${s('text-[10px]', 'text-[12px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B] mb-2 block`}>
              項目名稱
            </label>
            <input
              id="editNameInput"
              defaultValue={item?.content || item?.type || ''}
              placeholder="輸入名稱"
              className={`w-full ${s('p-3.5 text-sm', 'p-3 text-[16px] font-bold')} bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] font-medium`}
            />
          </div>
        )}
        <Calculator
          title={title}
          placeholder="0"
          initialValue={initial}
          isLarge={isLarge}
          onSave={(val) => {
            const nameVal = document.getElementById('editNameInput')?.value || item?.content || item?.type;
            const dataToSave = isDiet
              ? { content: nameVal, calories: val }
              : isEx
                ? { type: nameVal, calories: val }
                : { value: val };
            handleSaveData(category, dataToSave);
          }}
        />
        {(isDiet || isEx) && (
          <p className={`text-center ${s('text-[9px] mt-4 font-light', 'text-[11px] mt-4 font-medium')} text-[#C2BCB6] dark:text-[#666666] tracking-wide`}>
            若留空或輸入 0，將單純紀錄有執行此項目。
          </p>
        )}
      </ModalLayout>
    );
  }

  if (view === 'new_card') {
    const availableIcons = isDiet
      ? ['Coffee', 'Apple', 'Pizza', 'Carrot', 'Fish', 'Beef', 'Utensils']
      : ['Activity', 'Dumbbell', 'Flame', 'Bike', 'Shuttlecock', 'HeartPulse', 'Target'];
    return (
      <ModalLayout title="新增專屬卡片" onBack={() => setModalState({ view: 'select', category, dateStr: operateDate })} onClose={closeModal} isLarge={isLarge}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = e.target.cardName.value;
            const icon = e.target.iconSelect.value;
            if (!name) return;
            const newCard = { id: Date.now().toString(), name, icon };
            updateProfile((p) => ({
              ...p,
              [isDiet ? 'dietCards' : 'exerciseCards']: [...p[isDiet ? 'dietCards' : 'exerciseCards'], newCard],
            }));
            setModalState({ view: 'select', category, dateStr: operateDate });
          }}
          className={s('space-y-5', 'space-y-5')}
        >
          <div>
            <label className={`${s('text-[10px] mb-2', 'text-[12px] font-bold mb-2')} tracking-widest text-[#8C8477] dark:text-[#A1988B] block`}>名稱</label>
            <input
              name="cardName"
              type="text"
              placeholder="例如：拿鐵"
              required
              className={`w-full ${s('p-3.5 text-sm', 'p-3 text-[16px] font-medium')} bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1]`}
            />
          </div>
          <div>
            <label className={`${s('text-[10px] mb-2', 'text-[12px] font-bold mb-2')} tracking-widest text-[#8C8477] dark:text-[#A1988B] block`}>圖標</label>
            <div className={`grid grid-cols-4 ${s('gap-2', 'gap-2')}`}>
              {availableIcons.map((ic, i) => (
                <label key={ic} className="cursor-pointer">
                  <input type="radio" name="iconSelect" value={ic} defaultChecked={i === 0} className="peer hidden" />
                  <div
                    className={`flex justify-center ${s('py-3.5', 'py-3.5')} border border-[#F0ECE7] dark:border-[#333333] rounded-xl text-[#C2BCB6] dark:text-[#666666] peer-checked:border-[#8C8477] peer-checked:dark:border-[#A1988B] peer-checked:text-[#8C8477] peer-checked:dark:text-[#A1988B] peer-checked:bg-[#F5F2EB] peer-checked:dark:bg-[#2C2A25] transition-all`}
                  >
                    <DynamicIcon name={ic} className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5]`} />
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className={`w-full ${s('py-4 text-xs mt-4', 'py-3.5 text-[15px] font-bold mt-5')} bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-xl font-medium tracking-widest active:scale-95`}
          >
            儲存卡片
          </button>
        </form>
      </ModalLayout>
    );
  }

  return null;
}
