import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, TrendingUp, Settings, Home, 
  Flame, Utensils, Droplets, X, Plus, ChevronLeft, ChevronRight, CheckCircle2,
  Cloud, CloudOff, ShieldCheck, Activity, Dumbbell, Coffee, Apple, Pizza, Carrot, 
  Fish, Beef, Bike, Zap, HeartPulse, Delete
} from 'lucide-react';

// --- Firebase 初始化 ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "", authDomain: "", projectId: "", appId: "" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : (firebaseConfig.appId || 'default-app-id');

// 圖標對照表 (用於自訂卡片)
const ICON_MAP = {
  Plus, Flame, Utensils, Activity, Dumbbell, Coffee, Apple, Pizza, Carrot, Fish, Beef, Bike, Zap, HeartPulse
};

// 動態圖標元件
const DynamicIcon = ({ name, className }) => {
  const IconCmp = ICON_MAP[name] || Activity;
  return <IconCmp className={className} />;
};

const WeightScaleIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="4" />
    <rect width="10" height="5" x="7" y="7" rx="1" />
    <path d="M12 12V9" />
  </svg>
);

const getDateString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [activeModal, setActiveModal] = useState(null); 
  
  // 新增：目標日期 (用於修改過去資料)
  const todayStr = getDateString(new Date());
  const [targetDate, setTargetDate] = useState(todayStr);

  // --- 狀態管理 ---
  const [profile, setProfile] = useState({
    height: 165,
    age: 30,
    gender: 'female',
    customTDEE: '', // 新增：自訂 TDEE
    // 預設飲食卡片
    dietCards: [
      { id: 'custom', name: '自行輸入', icon: 'Plus' },
      { id: 'bf', name: '早餐', icon: 'Coffee' },
      { id: 'lc', name: '午餐', icon: 'Utensils' },
      { id: 'dn', name: '晚餐', icon: 'Utensils' },
      { id: 'sn', name: '點心', icon: 'Apple' }
    ],
    // 預設運動卡片
    exerciseCards: [
      { id: 'custom', name: '自行輸入', icon: 'Plus' },
      { id: 'bd', name: '羽球', icon: 'Activity' },
      { id: 'bx', name: '拳擊有氧', icon: 'Flame' },
      { id: 'bp', name: '槓鈴有氧', icon: 'Dumbbell' }
    ]
  });

  const [records, setRecords] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Firebase 同步邏輯 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          if (!auth.currentUser) await signInAnonymously(auth);
        }
      } catch (error) {
        if (!auth.currentUser) await signInAnonymously(auth).catch(()=>console.log("匿名登入失敗"));
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setRecords({}); return; }
    const recordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'health_records');
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');

    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) setProfile(prev => ({ ...prev, ...docSnap.data() }));
    });

    const unsubRecords = onSnapshot(recordsRef, (snapshot) => {
      const newRecords = {}; 
      snapshot.forEach(doc => newRecords[doc.id] = doc.data());
      setRecords(newRecords);
    });

    return () => { unsubProfile(); unsubRecords(); };
  }, [user]);

  // 自動儲存設定
  useEffect(() => {
    if (!user || !profile.age) return;
    const timeoutId = setTimeout(async () => {
      try {
        setIsSyncing(true);
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), profile, { merge: true });
        setIsSyncing(false);
      } catch (e) { console.error(e); }
    }, 1500); 
    return () => clearTimeout(timeoutId);
  }, [profile, user]);

  // --- 計算邏輯 ---
  const targetData = records[targetDate] || { weight: 0, water: 0, diet: [], exercise: [] };
  
  const nutritionStats = useMemo(() => {
    if (!profile.height || !profile.age) return null;
    
    // 計算 TDEE (自訂優先 > 公式計算)
    let finalTDEE = 0;
    if (profile.customTDEE && Number(profile.customTDEE) > 0) {
      finalTDEE = Number(profile.customTDEE);
    } else {
      const weight = targetData.weight || 60; // 若當天無體重，預設 60 避免出錯
      let bmr = 10 * weight + 6.25 * profile.height - 5 * profile.age;
      bmr += (profile.gender === 'male' ? 5 : -161);

      let totalExCals = 0;
      for (let i = 1; i <= 7; i++) {
        const dStr = getDateString(new Date(Date.now() - i * 86400000));
        const dayRecord = records[dStr];
        if (dayRecord && dayRecord.exercise) {
          totalExCals += dayRecord.exercise.reduce((sum, ex) => sum + (Number(ex.calories) || 0), 0);
        }
      }
      finalTDEE = Math.round((bmr * 1.2) + (totalExCals / 7));
    }

    const intake = targetData.diet?.reduce((sum, d) => sum + (Number(d.calories) || 0), 0) || 0;
    return { tdee: finalTDEE, intake };
  }, [profile, targetData, records]);

  // --- 儲存每日紀錄 ---
  const handleSaveData = async (type, data) => {
    const currentDayData = records[targetDate] || { weight: 0, water: 0, diet: [], exercise: [] };
    const updated = { ...currentDayData };
    
    if (type === 'weight') updated.weight = parseFloat(data);
    if (type === 'water') updated.water = (updated.water || 0) + parseInt(data);
    if (type === 'diet') updated.diet = [...(updated.diet || []), data];
    if (type === 'exercise') updated.exercise = [...(updated.exercise || []), data];
    
    // 先更新本地畫面 (Optimistic UI)
    setRecords(prev => ({...prev, [targetDate]: updated}));
    setActiveModal(null);

    // 有使用者才上傳雲端
    if (user) {
      setIsSyncing(true);
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'health_records', targetDate), updated, { merge: true });
      } catch (err) {
        console.error("儲存失敗", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // --- 自訂計算機元件 ---
  const Calculator = ({ onSave, title, placeholder, initialValue = "", showDecimals = true }) => {
    const [expr, setExpr] = useState(initialValue);

    const handlePress = (val) => {
      if (val === 'C') { setExpr(''); return; }
      if (val === 'DEL') { setExpr(prev => prev.slice(0, -1)); return; }
      if (val === '=') {
        try {
          // 替換符號並安全計算
          const cleanExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
          // eslint-disable-next-line no-new-func
          const result = new Function(`'use strict'; return (${cleanExpr})`)();
          setExpr(String(Math.round(result * 100) / 100)); // 取小數後兩位
        } catch (e) { setExpr('Error'); setTimeout(() => setExpr(''), 1000); }
        return;
      }
      if (expr === 'Error') { setExpr(val); return; }
      setExpr(prev => prev + val);
    };

    const handleConfirm = () => {
      let finalVal = expr;
      // 如果包含運算符號，先計算再存
      if (/[+×÷\-]/.test(expr)) {
        try {
          const cleanExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
          // eslint-disable-next-line no-new-func
          finalVal = String(new Function(`'use strict'; return (${cleanExpr})`)());
        } catch(e) { return; }
      }
      if (finalVal) onSave(finalVal);
    };

    const buttons = [
      '7', '8', '9', '÷',
      '4', '5', '6', '×',
      '1', '2', '3', '-',
      'C', '0', showDecimals ? '.' : 'DEL', '+'
    ];

    if (!showDecimals) buttons[14] = 'DEL'; // 若不需要小數點(如熱量)，替換為刪除鍵

    return (
      <div className="flex flex-col gap-4">
        <div className="bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl p-4 flex flex-col items-end justify-center h-20 overflow-hidden">
          <p className="text-[#A89F91] text-xs font-light">{title}</p>
          <p className="text-3xl font-light text-[#4A4A4A] tracking-wider truncate w-full text-right">{expr || placeholder}</p>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {buttons.map(btn => (
            <button 
              key={btn} type="button" onClick={() => handlePress(btn)}
              className={`h-14 rounded-2xl font-medium text-lg flex items-center justify-center transition-colors active:scale-95
                ${['÷','×','-','+'].includes(btn) ? 'bg-[#EFECE7] text-[#8C8477]' : 
                  btn === 'C' || btn === 'DEL' ? 'bg-[#F7EFEA] text-[#C4A495]' : 'bg-white border border-[#F0ECE7] text-[#5C5C5C]'}`}
            >
              {btn === 'DEL' ? <Delete className="w-5 h-5"/> : btn}
            </button>
          ))}
          <button onClick={handleConfirm} className="col-span-4 h-14 bg-[#8C8477] text-white rounded-2xl font-medium tracking-widest active:scale-95 transition-all mt-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> 確認
          </button>
        </div>
      </div>
    );
  };

  // --- 首頁渲染 ---
  const renderHome = () => (
    <div className="p-6 space-y-5 animate-in fade-in duration-500 pb-28">
      {/* 日期提示 (如果是看過去紀錄) */}
      {targetDate !== todayStr && (
        <div className="flex items-center justify-between bg-[#F9F8F6] p-3 rounded-2xl border border-[#E8E4DF]">
          <span className="text-xs text-[#A89F91] font-medium tracking-widest flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" /> 歷史紀錄模式
          </span>
          <span className="text-sm font-medium text-[#5C5C5C]">{targetDate.replace(/-/g, '.')}</span>
          <button onClick={() => setTargetDate(todayStr)} className="text-[10px] bg-white border border-[#F0ECE7] px-2 py-1 rounded-lg text-[#8C8477] active:scale-95">回今日</button>
        </div>
      )}

      {/* 頂部大卡片 */}
      <div className="bg-[#EFECE7] rounded-3xl p-7 shadow-sm border border-[#E8E4DF] relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-[#8C8477] text-[10px] tracking-widest font-medium mb-1">WEIGHT</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-light text-[#4A4A4A] tracking-tight">{targetData.weight || '--'}</span>
              <span className="text-sm text-[#8C8477] font-light">kg</span>
            </div>
          </div>
          <WeightScaleIcon className="w-10 h-10 text-[#D6D0C4] opacity-60 stroke-1" />
        </div>

        {nutritionStats && (
          <div className="mt-6 pt-5 border-t border-[#D6D0C4]/40 relative z-10">
            <p className="text-[#8C8477] text-[10px] tracking-widest mb-1.5">INTAKE / TDEE</p>
            <div className="flex items-end gap-1">
              <span className="font-medium text-[#5C5C5C] text-lg leading-none">{nutritionStats.intake}</span>
              <span className="text-[#A89F91] font-light text-sm leading-none pb-0.5">/ {nutritionStats.tdee} kcal</span>
            </div>
          </div>
        )}
      </div>

      {/* 紀錄卡片網格 */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setActiveModal('weight')} className="bg-white p-5 rounded-3xl border border-[#F0ECE7] flex flex-col items-start gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[#F5F2EB] flex items-center justify-center">
            <WeightScaleIcon className="w-4 h-4 text-[#A89F91] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-xs tracking-widest">體重</h3>
            <p className="text-[10px] text-[#C2BCB6] mt-1 font-light">{targetData.weight ? `${targetData.weight} kg` : '未紀錄'}</p>
          </div>
        </button>

        <button onClick={() => setActiveModal('water')} className="bg-white p-5 rounded-3xl border border-[#F0ECE7] flex flex-col items-start gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[#EDF1F4] flex items-center justify-center">
            <Droplets className="w-4 h-4 text-[#93A3B1] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-xs tracking-widest">飲水</h3>
            <p className="text-[10px] text-[#C2BCB6] mt-1 font-light">{targetData.water ? `${targetData.water} ml` : '未紀錄'}</p>
          </div>
        </button>

        <button onClick={() => setActiveModal('diet_select')} className="bg-white p-5 rounded-3xl border border-[#F0ECE7] flex flex-col items-start gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[#EEF2ED] flex items-center justify-center">
            <Utensils className="w-4 h-4 text-[#9AA899] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-xs tracking-widest">飲食</h3>
            <p className="text-[10px] text-[#C2BCB6] mt-1 font-light">{targetData.diet?.length ? `已記 ${targetData.diet.length} 筆` : '未紀錄'}</p>
          </div>
        </button>

        <button onClick={() => setActiveModal('exercise_select')} className="bg-white p-5 rounded-3xl border border-[#F0ECE7] flex flex-col items-start gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[#F7EFEA] flex items-center justify-center">
            <Flame className="w-4 h-4 text-[#C4A495] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-xs tracking-widest">運動</h3>
            <p className="text-[10px] text-[#C2BCB6] mt-1 font-light">{targetData.exercise?.length ? `已記 ${targetData.exercise.length} 筆` : '未紀錄'}</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-28">
      {/* 基本設定 */}
      <div className="bg-white rounded-3xl p-6 border border-[#F0ECE7] space-y-5">
        <h2 className="text-sm font-medium text-[#5C5C5C] tracking-widest flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-[#C2BCB6]" /> 基本設定
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] tracking-widest text-[#8C8477]">GENDER</label>
            <div className="flex gap-2">
              <button onClick={() => setProfile({...profile, gender: 'male'})} className={`flex-1 py-2.5 rounded-xl border text-xs transition-all ${profile.gender === 'male' ? 'bg-[#EFECE7] border-[#D6D0C4] text-[#5C5C5C]' : 'border-[#F0ECE7] text-[#C2BCB6]'}`}>男</button>
              <button onClick={() => setProfile({...profile, gender: 'female'})} className={`flex-1 py-2.5 rounded-xl border text-xs transition-all ${profile.gender === 'female' ? 'bg-[#EFECE7] border-[#D6D0C4] text-[#5C5C5C]' : 'border-[#F0ECE7] text-[#C2BCB6]'}`}>女</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] tracking-widest text-[#8C8477]">AGE</label>
            <input type="number" value={profile.age || ''} onChange={(e) => setProfile({...profile, age: e.target.value})} className="w-full p-2.5 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-sm text-center" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] tracking-widest text-[#8C8477]">HEIGHT (cm)</label>
            <input type="number" value={profile.height || ''} onChange={(e) => setProfile({...profile, height: e.target.value})} className="w-full p-2.5 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-sm text-center" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] tracking-widest text-[#8C8477]">自訂 TDEE (可留空)</label>
            <input type="number" placeholder="自動計算" value={profile.customTDEE || ''} onChange={(e) => setProfile({...profile, customTDEE: e.target.value})} className="w-full p-2.5 bg-[#EEF2ED] border border-[#D6E0D5] rounded-xl outline-none text-[#5C5C5C] text-sm text-center placeholder:text-[#9AA899]" />
          </div>
        </div>
      </div>

      {/* 隱私與帳號 */}
      <div className="bg-white rounded-3xl p-6 border border-[#F0ECE7] space-y-5">
        <h2 className="text-sm font-medium text-[#5C5C5C] tracking-widest flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-[#C2BCB6]" /> 隱私與同步
        </h2>
        
        <p className="text-[10px] text-[#A89F91] leading-relaxed font-light bg-[#F9F8F6] p-3 rounded-xl">
          【隱私權聲明】本程式採用本地與 Firebase 雲端加密同步，您的所有健康與生理數據僅供您個人存取檢視。我們承諾絕不會主動蒐集、分析或與任何第三方分享您的個人資訊。
        </p>

        {user && !user.isAnonymous ? (
          <div className="space-y-3 pt-2">
            <div className="bg-[#F5F2EB] p-3 rounded-xl border border-[#E8E4DF] flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#8C8477]" />
              <span className="text-xs font-medium text-[#5C5C5C] truncate">{user.email}</span>
            </div>
            <button onClick={() => { signOut(auth); window.location.reload(); }} className="w-full py-3 bg-[#F9F8F6] text-[#A89F91] rounded-xl text-xs font-medium tracking-widest border border-[#F0ECE7] active:scale-95">登出</button>
          </div>
        ) : (
          <button onClick={() => { signInWithRedirect(auth, new GoogleAuthProvider()).catch(err => console.error(err)); }} className="w-full py-3 bg-[#8C8477] text-white rounded-xl text-xs font-medium tracking-widest active:scale-95 mt-2">
            綁定 GOOGLE 帳號以永久保存
          </button>
        )}
      </div>
    </div>
  );

  // --- 彈出視窗與多卡片流程 ---
  const ModalOverlay = ({ title, icon: Icon, colorClass, onBack, children }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#4A4A4A]/30 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 border border-[#F0ECE7] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button onClick={onBack} className="p-2 -ml-2 text-[#A89F91] active:scale-90"><ChevronLeft className="w-5 h-5"/></button>
            ) : (
              <div className={`p-2 rounded-xl ${colorClass.bg}`}>
                <Icon className={`w-4 h-4 ${colorClass.text} stroke-[2]`} />
              </div>
            )}
            <h2 className="text-sm font-medium text-[#5C5C5C] tracking-widest">{title}</h2>
          </div>
          <button onClick={() => setActiveModal(null)} className="p-2 bg-[#F9F8F6] rounded-full text-[#A89F91] active:scale-90">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const renderModals = () => {
    if (!activeModal) return null;

    // 體重計算機
    if (activeModal === 'weight') {
      return (
        <ModalOverlay title="紀錄體重" icon={WeightScaleIcon} colorClass={{bg: 'bg-[#F5F2EB]', text: 'text-[#A89F91]'}}>
          <Calculator title="體重 (kg)" placeholder="0.0" initialValue={String(targetData.weight || '')} onSave={(val) => handleSaveData('weight', val)} />
        </ModalOverlay>
      );
    }

    // 飲水計算機
    if (activeModal === 'water') {
      return (
        <ModalOverlay title="補充水分" icon={Droplets} colorClass={{bg: 'bg-[#EDF1F4]', text: 'text-[#93A3B1]'}}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[250, 350, 500].map(amt => (
              <button key={amt} onClick={() => handleSaveData('water', amt)} className="py-3 bg-[#F9F8F6] text-[#93A3B1] rounded-xl border border-[#F0ECE7] active:bg-[#EDF1F4] text-xs font-medium">+{amt}ml</button>
            ))}
          </div>
          <Calculator title="自訂水量 (ml)" placeholder="0" showDecimals={false} onSave={(val) => handleSaveData('water', val)} />
        </ModalOverlay>
      );
    }

    // 飲食 - 卡片選擇
    if (activeModal === 'diet_select') {
      return (
        <ModalOverlay title="選擇飲食項目" icon={Utensils} colorClass={{bg: 'bg-[#EEF2ED]', text: 'text-[#9AA899]'}}>
          <div className="grid grid-cols-2 gap-3">
            {profile.dietCards.map(card => (
              <button key={card.id} onClick={() => setActiveModal(`diet_calc_${card.name}`)} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-[#E8E4DF] bg-[#F9F8F6] active:bg-[#EEF2ED] transition-colors">
                <DynamicIcon name={card.icon} className="w-6 h-6 text-[#9AA899] stroke-[1.5]" />
                <span className="text-xs font-medium text-[#5C5C5C]">{card.name}</span>
              </button>
            ))}
            {/* 新增卡片按鈕 */}
            <button onClick={() => setActiveModal('new_diet_card')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-[#D6D0C4] bg-white text-[#A89F91] active:bg-[#F9F8F6]">
              <Plus className="w-5 h-5" />
              <span className="text-[10px] tracking-widest">新增選項</span>
            </button>
          </div>
        </ModalOverlay>
      );
    }

    // 運動 - 卡片選擇
    if (activeModal === 'exercise_select') {
      return (
        <ModalOverlay title="選擇運動項目" icon={Flame} colorClass={{bg: 'bg-[#F7EFEA]', text: 'text-[#C4A495]'}}>
          <div className="grid grid-cols-2 gap-3">
            {profile.exerciseCards.map(card => (
              <button key={card.id} onClick={() => setActiveModal(`exercise_calc_${card.name}`)} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-[#E8E4DF] bg-[#F9F8F6] active:bg-[#F7EFEA] transition-colors">
                <DynamicIcon name={card.icon} className="w-6 h-6 text-[#C4A495] stroke-[1.5]" />
                <span className="text-xs font-medium text-[#5C5C5C]">{card.name}</span>
              </button>
            ))}
            <button onClick={() => setActiveModal('new_ex_card')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-[#D6D0C4] bg-white text-[#A89F91] active:bg-[#F9F8F6]">
              <Plus className="w-5 h-5" />
              <span className="text-[10px] tracking-widest">新增選項</span>
            </button>
          </div>
        </ModalOverlay>
      );
    }

    // 飲食 / 運動 - 計算機與儲存
    if (activeModal.startsWith('diet_calc_') || activeModal.startsWith('exercise_calc_')) {
      const isDiet = activeModal.startsWith('diet_calc_');
      const itemName = activeModal.replace(isDiet ? 'diet_calc_' : 'exercise_calc_', '');
      const typeLabel = isDiet ? 'diet' : 'exercise';
      
      return (
        <ModalOverlay title={`紀錄 ${itemName}`} onBack={() => setActiveModal(isDiet ? 'diet_select' : 'exercise_select')}>
          <Calculator 
            title="預估熱量 (kcal)" 
            placeholder="0" 
            showDecimals={false} 
            onSave={(val) => {
              const data = isDiet ? { content: itemName, calories: val } : { type: itemName, calories: val };
              handleSaveData(typeLabel, data);
            }} 
          />
          <p className="text-center text-[10px] text-[#C2BCB6] mt-4">若留空或為0，將單純紀錄有執行此項目。</p>
        </ModalOverlay>
      );
    }

    // 新增自訂卡片 (共用介面)
    if (activeModal === 'new_diet_card' || activeModal === 'new_ex_card') {
      const isDiet = activeModal === 'new_diet_card';
      const availableIcons = isDiet ? ['Coffee', 'Apple', 'Pizza', 'Carrot', 'Fish', 'Beef'] : ['Activity', 'Dumbbell', 'Flame', 'Bike', 'HeartPulse', 'Zap'];
      
      return (
        <ModalOverlay title={isDiet ? "新增飲食選項" : "新增運動選項"} onBack={() => setActiveModal(isDiet ? 'diet_select' : 'exercise_select')}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const name = e.target.cardName.value;
            const icon = e.target.iconSelect.value;
            if(!name) return;
            const newCard = { id: Date.now().toString(), name, icon };
            if(isDiet) setProfile(p => ({...p, dietCards: [...p.dietCards, newCard]}));
            else setProfile(p => ({...p, exerciseCards: [...p.exerciseCards, newCard]}));
            setActiveModal(isDiet ? 'diet_select' : 'exercise_select');
          }} className="space-y-4">
            <div>
              <label className="text-[10px] tracking-widest text-[#8C8477] mb-1 block">名稱</label>
              <input name="cardName" type="text" placeholder="例如：手搖飲" required className="w-full p-3 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-sm" />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-[#8C8477] mb-1 block">選擇圖標</label>
              <div className="grid grid-cols-3 gap-2">
                {availableIcons.map((ic, i) => (
                  <label key={ic} className="cursor-pointer">
                    <input type="radio" name="iconSelect" value={ic} defaultChecked={i===0} className="peer hidden" />
                    <div className="flex justify-center py-3 border border-[#F0ECE7] rounded-xl text-[#C2BCB6] peer-checked:border-[#8C8477] peer-checked:text-[#8C8477] peer-checked:bg-[#F5F2EB] transition-all">
                      <DynamicIcon name={ic} className="w-5 h-5" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-[#8C8477] text-white rounded-xl text-xs font-medium tracking-widest active:scale-95 mt-2">儲存選項</button>
          </form>
        </ModalOverlay>
      );
    }
  };

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-[#F7F5F2] font-sans text-[#4A4A4A] overflow-hidden shadow-2xl relative">
      {/* 頂部導覽列 */}
      <header className="bg-[#F7F5F2]/90 backdrop-blur-md px-6 py-4 z-10 flex justify-center border-b border-[#EBE8E3] sticky top-0">
        <div className="text-xs font-medium text-[#5C5C5C] tracking-[0.2em] uppercase flex items-center gap-2">
          {activeTab === 'home' && 'Dashboard'}
          {activeTab === 'calendar' && 'Calendar'}
          {activeTab === 'trend' && 'Analytics'}
          {activeTab === 'settings' && 'Profile'}
          {isSyncing ? <Cloud className="w-3 h-3 text-[#C4A495] animate-pulse" /> : user ? <Cloud className="w-3 h-3 text-[#9AA899]" /> : <CloudOff className="w-3 h-3 text-[#C2BCB6]" />}
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'calendar' && <CalendarView records={records} targetDate={targetDate} onSelectDate={(d) => { setTargetDate(d); setActiveTab('home'); }} />}
        {activeTab === 'trend' && <TrendChart records={records} />}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* 底部導覽列 */}
      <nav className="bg-[#F7F5F2]/95 backdrop-blur-md border-t border-[#EBE8E3] px-2 pt-2 pb-6 flex justify-around items-center fixed bottom-0 w-full max-w-md z-40">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="首頁" />
        <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={CalendarIcon} label="月曆" />
        <NavButton active={activeTab === 'trend'} onClick={() => setActiveTab('trend')} icon={TrendingUp} label="趨勢" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="設定" />
      </nav>

      {/* 浮動視窗 */}
      {renderModals()}
    </div>
  );
}

// 底部按鈕元件
function NavButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-2 w-16 bg-transparent border-none transition-all duration-300 ${active ? 'text-[#8C8477] -translate-y-1' : 'text-[#C2BCB6] hover:text-[#A89F91]'}`}>
      <Icon className={`w-5 h-5 ${active ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
      <span className="text-[9px] tracking-widest font-medium m-0">{label}</span>
      <div className={`w-1 h-1 rounded-full bg-[#8C8477] mt-0.5 transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
    </button>
  );
}

// 月曆元件
function CalendarView({ records, targetDate, onSelectDate }) {
  const [viewMode, setViewMode] = useState('weight');
  const [currentMonth, setCurrentMonth] = useState(new Date(targetDate));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  return (
    <div className="p-6 pb-28 animate-in fade-in duration-500">
      <div className="flex border-b border-[#E8E4DF] mb-6">
        {[
          { id: 'weight', label: '體重', color: 'text-[#8C8477]', border: 'border-[#8C8477]' },
          { id: 'diet', label: '飲食', color: 'text-[#9AA899]', border: 'border-[#9AA899]' },
          { id: 'exercise', label: '運動', color: 'text-[#C4A495]', border: 'border-[#C4A495]' }
        ].map(mode => (
          <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`flex-1 pb-2 text-[10px] tracking-widest transition-all relative ${viewMode === mode.id ? `${mode.color} font-medium` : 'text-[#C2BCB6] font-light'}`}>
            {mode.label}
            {viewMode === mode.id && <div className={`absolute bottom-0 left-0 w-full border-b-[2px] ${mode.border}`} />}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-5 px-1">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-[#EFECE7] rounded-full text-[#8C8477]"><ChevronLeft className="w-4 h-4" /></button>
        <h2 className="text-xs font-medium tracking-[0.2em] text-[#5C5C5C]">{year} . {String(month + 1).padStart(2, '0')}</h2>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-[#EFECE7] rounded-full text-[#8C8477]"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-[9px] tracking-widest font-medium text-[#C2BCB6]">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="h-[3.5rem] bg-transparent"></div>;
          
          const dStr = getDateString(date);
          const dayData = records[dStr];
          const isTarget = dStr === targetDate;

          let cellContent = null;
          let cellStyle = isTarget ? 'bg-[#EFECE7] border border-[#D6D0C4] shadow-inner' : 'bg-white border border-[#F0ECE7] active:bg-[#F9F8F6]';

          if (dayData) {
            if (viewMode === 'weight' && dayData.weight) {
              let prevWeight = null;
              // 往回找最近一次有體重紀錄的日期 (最多找7天)
              for(let i=1; i<=7; i++) {
                const prevD = getDateString(new Date(date.getTime() - i * 86400000));
                if(records[prevD] && records[prevD].weight) {
                  prevWeight = records[prevD].weight; break;
                }
              }
              const diff = prevWeight ? (dayData.weight - prevWeight).toFixed(1) : null;
              
              let diffEl = null;
              if (diff !== null) {
                const nDiff = Number(diff);
                if (nDiff > 0) {
                  // 綠漲 (莫蘭迪鼠尾草綠 #9AA899)
                  diffEl = (
                    <span className="text-[8px] text-[#9AA899] font-medium flex items-center mt-0.5 gap-[1.5px]">
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L22 20H2L12 3Z"/></svg>
                      {Math.abs(nDiff).toFixed(1)}
                    </span>
                  );
                } else if (nDiff < 0) {
                  // 紅跌 (莫蘭迪玫瑰紅 #C78D87)
                  diffEl = (
                    <span className="text-[8px] text-[#C78D87] font-medium flex items-center mt-0.5 gap-[1.5px]">
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21L2 4H22L12 21Z"/></svg>
                      {Math.abs(nDiff).toFixed(1)}
                    </span>
                  );
                } else {
                  // 持平
                  diffEl = <span className="text-[8px] text-[#C2BCB6] font-light flex items-center mt-0.5">- 0.0</span>;
                }
              }

              cellContent = (
                <div className="flex flex-col items-center">
                  <span className="font-medium text-[#5C5C5C] text-[11px] leading-none mt-1">{dayData.weight}</span>
                  {diffEl}
                </div>
              );
            } else if (viewMode === 'diet' && dayData.diet?.length > 0) {
              const totalCals = dayData.diet.reduce((sum, d) => sum + (Number(d.calories) || 0), 0);
              cellContent = <span className="text-[10px] font-medium text-[#9AA899]">{totalCals > 0 ? totalCals : '✓'}</span>;
            } else if (viewMode === 'exercise' && dayData.exercise?.length > 0) {
              const totalCals = dayData.exercise.reduce((sum, ex) => sum + (Number(ex.calories) || 0), 0);
              cellContent = <span className="text-[10px] font-medium text-[#C4A495]">{totalCals > 0 ? totalCals : '✓'}</span>;
            }
          }

          return (
            <button key={dStr} onClick={() => onSelectDate(dStr)} className={`h-[3.5rem] rounded-xl p-1 flex flex-col items-center transition-colors ${cellStyle}`}>
              <span className={`text-[8px] font-medium mt-0.5 ${isTarget ? 'text-[#8C8477]' : 'text-[#A89F91]'}`}>{date.getDate()}</span>
              <div className="flex-1 flex items-center justify-center">{cellContent}</div>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-[#C2BCB6] mt-6 font-light">點擊日期即可跳轉至該日紀錄</p>
    </div>
  );
}

// 趨勢圖表元件
function TrendChart({ records }) {
  const weightData = Object.entries(records)
    .filter(([_, data]) => data.weight)
    .map(([date, data]) => ({ date, weight: data.weight }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (weightData.length < 2) {
    return (
      <div className="p-6 text-center text-[#A89F91] mt-24">
        <TrendingUp className="w-8 h-8 mx-auto text-[#D6D0C4] mb-4 stroke-1" />
        <p className="font-medium tracking-widest text-xs">NOT ENOUGH DATA</p>
      </div>
    );
  }

  const weights = weightData.map(d => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);
  
  const width = 320;
  const height = 200;
  const paddingX = 30;
  const paddingY = 30;

  const points = weightData.map((d, i) => {
    const x = paddingX + (i / (weightData.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.weight - minW) / (maxW - minW)) * (height - paddingY * 2);
    return { x, y, value: d.weight, date: d.date.slice(5).replace('-', '.') }; 
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="p-6 pb-28 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-3xl border border-[#F0ECE7]">
        <h2 className="text-[10px] font-medium tracking-widest text-[#8C8477] mb-6 px-1 uppercase">Weight Trend</h2>
        <div className="overflow-x-auto overflow-y-hidden">
          <svg width={width} height={height} className="mx-auto overflow-visible">
            {[0, 0.5, 1].map(ratio => {
              const y = paddingY + ratio * (height - paddingY * 2);
              const val = (maxW - ratio * (maxW - minW)).toFixed(1);
              return (
                <g key={`grid-${ratio}`}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#F0ECE7" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={paddingX - 8} y={y + 3} fontSize="8" fill="#C2BCB6" textAnchor="end" className="font-light">{val}</text>
                </g>
              );
            })}
            <polyline points={polylinePoints} fill="none" stroke="#C4A495" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <g key={`point-${i}`}>
                <circle cx={p.x} cy={p.y} r="3" fill="#FFFFFF" stroke="#C4A495" strokeWidth="1.5" />
                <text x={p.x} y={p.y - 8} fontSize="8" fill="#5C5C5C" textAnchor="middle" className="font-medium">{p.value}</text>
                {(i === 0 || i === points.length - 1 || i % 2 === 0) && (
                  <text x={p.x} y={height - paddingY + 18} fontSize="7" fill="#A89F91" textAnchor="middle" className="font-light tracking-wider">{p.date}</text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
