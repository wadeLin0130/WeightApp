import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, TrendingUp, Settings, Home, 
  Flame, Utensils, Droplets, X, Plus, ChevronLeft, ChevronRight, CheckCircle2,
  Cloud, CloudOff, ShieldCheck, Activity, Dumbbell, Coffee, Apple, Pizza, Carrot, 
  Fish, Beef, Bike, Zap, HeartPulse, Delete, Trash2,
  Music, Sun, Moon, Star, Heart, Target
} from 'lucide-react';

// --- Firebase 初始化 ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyBHtWTHEXuSrZBnB4gzh2N7ZvzSVSmjWgg",
      authDomain: "myweightapp-281cb.firebaseapp.com",
      projectId: "myweightapp-281cb",
      storageBucket: "myweightapp-281cb.firebasestorage.app",
      messagingSenderId: "476667742331",
      appId: "1:476667742331:web:09feb9c64766c0c9e1fade"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : (firebaseConfig.appId || 'default-app-id');

// --- 自訂圖示庫 ---
const ShuttlecockIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22v-4" /><path d="M8 18h8" /><path d="M5 4l4 10" /><path d="M19 4l-4 10" /><path d="M12 2l1 12H11Z" />
  </svg>
);

const WeightScaleIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="4" /><rect width="10" height="5" x="7" y="7" rx="1" />
    <path d="M12 12V9" />
  </svg>
);

const ICON_MAP = {
  Plus, Flame, Utensils, Activity, Dumbbell, Coffee, Apple, Pizza, Carrot, Fish, Beef, Bike, Zap, HeartPulse,
  Shuttlecock: ShuttlecockIcon, Music, Sun, Moon, Star, Heart, Target
};

const DynamicIcon = ({ name, className }) => {
  const IconCmp = ICON_MAP[name] || Activity;
  return <IconCmp className={className} />;
};

// --- 工具函數 ---
const getDateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getTimeString = () => new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });

const getArrayData = (data, key) => {
  if (!data || data[key] === undefined) return [];
  if (Array.isArray(data[key])) return data[key];
  if (key === 'weight' || key === 'water') return [{ id: 'legacy', time: '00:00', value: data[key] }];
  return [];
};

// --- 左滑刪除元件 ---
const SwipeableRecord = ({ record, onDelete, onEdit, isDiet, isEx, catConfig }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startXRef.current;
    if (deltaX < 0) {
      currentXRef.current = Math.max(deltaX, -80);
      setOffsetX(currentXRef.current);
    } else if (deltaX > 0 && offsetX < 0) {
      currentXRef.current = Math.min(offsetX + deltaX, 0);
      setOffsetX(currentXRef.current);
    }
  };
  
  const handleTouchEnd = () => {
    if (currentXRef.current < -40) {
      setOffsetX(-80);
      currentXRef.current = -80;
    } else {
      setOffsetX(0);
      currentXRef.current = 0;
    }
  };

  const displayValue = record.calories ?? record.value ?? 0;

  return (
    <div className="relative w-full mb-3 rounded-2xl overflow-hidden touch-pan-y bg-[#C78D87]">
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center">
        <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="w-full h-full flex flex-col items-center justify-center text-white active:bg-[#B57C76] transition-colors">
          <Trash2 className="w-5 h-5 mb-1 stroke-[1.5]" />
          <span className="text-[10px]">刪除</span>
        </button>
      </div>
      <div 
        className="relative w-full bg-[#F9F8F6] p-4 flex justify-between items-center transition-transform duration-200 z-10 h-full border border-[#E8E4DF] rounded-2xl"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (offsetX === 0) onEdit(record);
          else { setOffsetX(0); currentXRef.current = 0; }
        }}
      >
        <div className="flex items-center gap-4 pointer-events-none">
          <span className="text-[10px] text-[#A89F91] font-light w-10">{record.time}</span>
          <div className="h-4 w-[1px] bg-[#D6D0C4]"></div>
          {(isDiet || isEx) && <span className="text-xs font-medium text-[#5C5C5C] truncate max-w-[120px]">{record.content || record.type}</span>}
          {!(isDiet || isEx) && <span className="text-xs font-medium text-[#5C5C5C]">紀錄數值</span>}
        </div>
        <div className="flex items-baseline gap-1 pointer-events-none">
          <span className="text-sm font-medium text-[#5C5C5C]">{displayValue}</span>
          {Number(displayValue) > 0 && <span className="text-[9px] text-[#A89F91] font-light">{catConfig.unit}</span>}
        </div>
      </div>
    </div>
  );
};

// --- 儀表板小月曆元件 ---
function DashboardDatePicker({ initialDate, onSelect }) {
  const [viewDate, setViewDate] = useState(new Date(initialDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(year, month, i + 1)));

  const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i);
  const months = Array.from({length: 12}, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#F9F8F6] p-2 rounded-2xl border border-[#E8E4DF]">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 text-[#8C8477] hover:bg-[#EFECE7] rounded-xl transition-colors active:scale-90"><ChevronLeft className="w-5 h-5"/></button>
        <div className="flex gap-2">
          <div className="relative flex items-center bg-white border border-[#E8E4DF] rounded-xl px-1 shadow-sm">
            <select value={year} onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))} className="appearance-none bg-transparent py-2 pl-3 pr-6 outline-none text-[#5C5C5C] text-sm font-medium">
              {years.map(y => <option key={y} value={y}>{y} 年</option>)}
            </select>
            <div className="absolute right-2 pointer-events-none text-[#A89F91] text-[10px]">▼</div>
          </div>
          <div className="relative flex items-center bg-white border border-[#E8E4DF] rounded-xl px-1 shadow-sm">
            <select value={month} onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))} className="appearance-none bg-transparent py-2 pl-3 pr-6 outline-none text-[#5C5C5C] text-sm font-medium">
              {months.map(m => <option key={m} value={m}>{String(m + 1).padStart(2, '0')} 月</option>)}
            </select>
            <div className="absolute right-2 pointer-events-none text-[#A89F91] text-[10px]">▼</div>
          </div>
        </div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 text-[#8C8477] hover:bg-[#EFECE7] rounded-xl transition-colors active:scale-90"><ChevronRight className="w-5 h-5"/></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center mb-2 px-1">
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-[10px] text-[#C2BCB6] tracking-widest font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5 px-1 pb-4">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const dStr = getDateString(d);
          const isTarget = dStr === initialDate;
          const isToday = dStr === getDateString(new Date());
          return (
            <button key={i} onClick={() => onSelect(dStr)} className={`aspect-square flex items-center justify-center rounded-xl text-xs transition-all active:scale-90 ${isTarget ? 'bg-[#8C8477] text-white font-medium shadow-md' : isToday ? 'border-2 border-[#D6D0C4] text-[#8C8477] font-medium bg-[#F9F8F6]' : 'text-[#5C5C5C] hover:bg-[#EFECE7] border border-transparent'}`}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [modalState, setModalState] = useState(null); 

  // ============================================================
  // BUG FIX: 將 isInitialLoad 拆成兩個獨立 flag
  // - isInitialLoad: 控制全局 loading 畫面（給 Firebase auth 用）
  // - recordsReady: 只在 onSnapshot 確實拿到第一筆資料後才設為 true
  //   這樣即使 iOS bfcache 恢復時 records 是空的，也不會提前渲染空資料
  // ============================================================
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [recordsReady, setRecordsReady] = useState(false);
  
  const todayStrRef = useRef(getDateString(new Date()));
  const [todayStr, setTodayStr] = useState(todayStrRef.current);
  const [targetDate, setTargetDate] = useState(todayStrRef.current);

  const [profile, setProfile] = useState({
    height: 165, age: 30, gender: 'female', customTDEE: '', 
    dietCards: [
      { id: 'custom', name: '自行輸入', icon: 'Plus' },
      { id: 'bf', name: '早餐', icon: 'Coffee' },
      { id: 'lc', name: '午餐', icon: 'Utensils' },
      { id: 'dn', name: '晚餐', icon: 'Utensils' },
      { id: 'sn', name: '點心', icon: 'Apple' }
    ],
    exerciseCards: [
      { id: 'custom', name: '自行輸入', icon: 'Plus' },
      { id: 'bd', name: '羽球', icon: 'Shuttlecock' },
      { id: 'bx', name: '拳擊有氧', icon: 'Flame' },
      { id: 'bp', name: '槓鈴有氧', icon: 'Dumbbell' }
    ]
  });

  const [records, setRecords] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);

  // ============================================================
  // BUG FIX: iOS Safari bfcache 恢復偵測
  // 當 pageshow 的 persisted 為 true，代表是從 bfcache 恢復，
  // 此時 React state 是舊快照，Firebase listener 也已斷開。
  // 必須重置 recordsReady，讓畫面回到 loading 狀態，
  // 等待重新建立的 onSnapshot 推送最新資料後再顯示。
  // ============================================================
  const unsubRecordsRef = useRef(null);
  const unsubProfileRef = useRef(null);

  useEffect(() => {
    const handleWake = () => {
      const newToday = getDateString(new Date());
      if (todayStrRef.current !== newToday) {
        setTargetDate(prev => prev === todayStrRef.current ? newToday : prev);
        todayStrRef.current = newToday;
        setTodayStr(newToday);
      }
    };

    // pageshow 是最可靠的 iOS bfcache 恢復事件
    const handlePageShow = (e) => {
      handleWake();
      if (e.persisted) {
        // 從 bfcache 恢復：重置 recordsReady，讓畫面顯示 loading
        // Firebase listener 會在 user effect 重新訂閱後推送最新資料
        setRecordsReady(false);
        // 強制重新觸發 Firebase 訂閱
        // 透過清除再重建 user 狀態觸發
        const currentUser = auth.currentUser;
        if (currentUser) {
          // 重新建立 Firestore listener
          if (unsubRecordsRef.current) unsubRecordsRef.current();
          if (unsubProfileRef.current) unsubProfileRef.current();
          
          const recordsRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'health_records');
          const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'main');

          unsubProfileRef.current = onSnapshot(profileRef, (snap) => {
            if (snap.exists()) setProfile(p => ({ ...p, ...snap.data() }));
          });

          unsubRecordsRef.current = onSnapshot(recordsRef, (snap) => {
            const newRec = {};
            snap.forEach(doc => newRec[doc.id] = doc.data());
            setRecords(newRec);
            setRecordsReady(true); // 資料確實到位才開放渲染
          });
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleWake();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // --- Firebase 邏輯 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else if (!auth.currentUser) await signInAnonymously(auth);
      } catch (e) {
        if (!auth.currentUser) await signInAnonymously(auth).catch(()=>{});
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 清除舊的 listener
    if (unsubRecordsRef.current) { unsubRecordsRef.current(); unsubRecordsRef.current = null; }
    if (unsubProfileRef.current) { unsubProfileRef.current(); unsubProfileRef.current = null; }

    if (!user) {
      setRecords({});
      setRecordsReady(true); // 無用戶也要放行，否則永遠 loading
      setIsInitialLoad(false);
      return;
    }

    // 重置 recordsReady，等待新的 snapshot 到來
    setRecordsReady(false);

    const recordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'health_records');
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');

    unsubProfileRef.current = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) setProfile(p => ({ ...p, ...snap.data() }));
    });

    unsubRecordsRef.current = onSnapshot(recordsRef, (snap) => {
      const newRec = {};
      snap.forEach(doc => newRec[doc.id] = doc.data());
      setRecords(newRec);
      setRecordsReady(true); // ← 關鍵：資料確實到位才開放渲染
      setIsInitialLoad(false);
    });

    return () => {
      if (unsubRecordsRef.current) { unsubRecordsRef.current(); unsubRecordsRef.current = null; }
      if (unsubProfileRef.current) { unsubProfileRef.current(); unsubProfileRef.current = null; }
    };
  }, [user]);

  useEffect(() => {
    if (!user || !profile.age || !recordsReady) return;
    const timeoutId = setTimeout(async () => {
      setIsSyncing(true);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), profile, { merge: true }).catch(()=>{});
      setIsSyncing(false);
    }, 1500); 
    return () => clearTimeout(timeoutId);
  }, [profile, user, recordsReady]);

  // ============================================================================
  // 核心資料計算（直接從最新的 records state 讀取，無快取）
  // ============================================================================
  const currentData = records[targetDate] || {};
  
  const arrWeight = getArrayData(currentData, 'weight');
  const arrWater = getArrayData(currentData, 'water');
  const arrDiet = getArrayData(currentData, 'diet');
  const arrEx = getArrayData(currentData, 'exercise');

  let latestWeight = null;
  if (arrWeight.length > 0) {
    latestWeight = arrWeight[arrWeight.length - 1].value;
  } else {
    const sortedDates = Object.keys(records).sort((a, b) => b.localeCompare(a));
    for (let d of sortedDates) {
      if (d < targetDate) {
        const wArr = getArrayData(records[d], 'weight');
        if (wArr.length > 0) {
          latestWeight = wArr[wArr.length - 1].value;
          break;
        }
      }
    }
  }

  const totalWater = arrWater.reduce((sum, i) => sum + Number(i.value), 0);
  const totalIntake = arrDiet.reduce((sum, d) => sum + (Number(d.calories ?? d.value) || 0), 0);
  const totalExCals = arrEx.reduce((sum, ex) => sum + (Number(ex.calories ?? ex.value) || 0), 0);

  let weightChange = null;
  let prevWeight = null;
  const targetDObj = new Date(targetDate);
  for(let i = 1; i <= 7; i++) {
    const pastObj = new Date(targetDObj);
    pastObj.setDate(pastObj.getDate() - i);
    const prevArr = getArrayData(records[getDateString(pastObj)] || {}, 'weight');
    if(prevArr.length > 0) { 
      prevWeight = prevArr[prevArr.length - 1].value; 
      break; 
    }
  }
  if (latestWeight && prevWeight) {
    weightChange = (latestWeight - prevWeight).toFixed(2);
  }

  let tdee = 0;
  if (profile.height && profile.age) {
    if (profile.customTDEE && Number(profile.customTDEE) > 0) {
      tdee = Number(profile.customTDEE);
    } else {
      let bmr = 10 * Number(latestWeight || 60) + 6.25 * Number(profile.height) - 5 * Number(profile.age);
      bmr += (profile.gender === 'male' ? 5 : -161);
      
      let weekEx = 0;
      for (let i = 1; i <= 7; i++) {
        const pastObj = new Date(targetDObj);
        pastObj.setDate(pastObj.getDate() - i);
        const dStr = getDateString(pastObj);
        getArrayData(records[dStr] || {}, 'exercise').forEach(ex => {
          weekEx += (Number(ex.calories ?? ex.value) || 0);
        });
      }
      tdee = Math.round((bmr * 1.2) + (weekEx / 7));
    }
  }
  // ============================================================================

  // --- 操作流程 ---
  const openCategoryFlow = (category, dateStr = targetDate) => {
    const dataObj = records[dateStr] || {};
    const hasData = getArrayData(dataObj, category).length > 0;
    if (hasData) {
      setModalState({ view: 'list', category, dateStr });
    } else {
      if (category === 'diet' || category === 'exercise') setModalState({ view: 'select', category, dateStr });
      else setModalState({ view: 'calc', category, dateStr });
    }
  };

  const handleSaveData = async (category, dataObj) => {
    const operateDate = modalState?.dateStr || targetDate;
    const currentDayData = records[operateDate] || {};
    const arr = getArrayData(currentDayData, category);
    let newArr;

    if (modalState?.item?.id) {
      newArr = arr.map(item => item.id === modalState.item.id ? { ...item, ...dataObj } : item);
    } else {
      newArr = [...arr, { id: Date.now().toString(), time: getTimeString(), ...dataObj }];
    }
    
    const updated = { ...currentDayData, [category]: newArr };
    setRecords(prev => ({...prev, [operateDate]: updated}));
    setModalState(null);

    if (user) {
      setIsSyncing(true);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'health_records', operateDate), updated, { merge: true }).catch(()=>{});
      setIsSyncing(false);
    }
  };

  const handleDeleteData = async (category, id) => {
    const operateDate = modalState?.dateStr || targetDate;
    const currentDayData = records[operateDate] || {};
    const arr = getArrayData(currentDayData, category);
    const newArr = arr.filter(item => item.id !== id);
    const updated = { ...currentDayData, [category]: newArr };
    
    setRecords(prev => ({...prev, [operateDate]: updated}));
    
    if (newArr.length === 0) setModalState(null);

    if (user) {
      setIsSyncing(true);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'health_records', operateDate), updated, { merge: true }).catch(()=>{});
      setIsSyncing(false);
    }
  };

  // --- 計算機元件 ---
  const Calculator = ({ onSave, title, placeholder, initialValue = "", showDecimals = true }) => {
    const [expr, setExpr] = useState(initialValue);
    const handlePress = (val) => {
      if (val === 'C') { setExpr(''); return; }
      if (val === 'DEL') { setExpr(prev => prev.slice(0, -1)); return; }
      if (val === '=') {
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function(`'use strict'; return (${expr.replace(/×/g, '*').replace(/÷/g, '/')})`)();
          setExpr(String(Math.round(result * 100) / 100)); 
        } catch (e) { setExpr('Error'); setTimeout(() => setExpr(''), 1000); }
        return;
      }
      if (expr === 'Error') { setExpr(val); return; }
      setExpr(prev => prev + val);
    };

    const handleConfirm = () => {
      let finalVal = expr;
      if (/[+×÷\-]/.test(expr)) {
        try {
          // eslint-disable-next-line no-new-func
          finalVal = String(new Function(`'use strict'; return (${expr.replace(/×/g, '*').replace(/÷/g, '/')})`)());
        } catch(e) { return; }
      }
      if (finalVal || finalVal === '') onSave(finalVal);
    };

    const btns = ['7','8','9','÷','4','5','6','×','1','2','3','-','C','0', showDecimals ? '.' : 'DEL','+'];
    if (!showDecimals) btns[14] = 'DEL'; 

    return (
      <div className="flex flex-col gap-4">
        <div className="bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl p-4 flex flex-col items-end justify-center h-20 overflow-hidden">
          <p className="text-[#A89F91] text-[10px] tracking-widest font-light">{title}</p>
          <p className="text-3xl font-light text-[#4A4A4A] tracking-wider truncate w-full text-right">{expr || placeholder}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {btns.map(btn => (
            <button key={btn} type="button" onClick={() => handlePress(btn)}
              className={`h-14 rounded-2xl font-light text-xl flex items-center justify-center transition-colors active:scale-95
                ${['÷','×','-','+'].includes(btn) ? 'bg-[#EFECE7] text-[#8C8477]' : btn === 'C' || btn === 'DEL' ? 'bg-[#F7EFEA] text-[#C4A495]' : 'bg-white border border-[#F0ECE7] text-[#5C5C5C]'}`}
            >
              {btn === 'DEL' ? <Delete className="w-5 h-5 stroke-[1.5]"/> : btn}
            </button>
          ))}
          <button onClick={handleConfirm} className="col-span-4 h-14 bg-[#8C8477] text-white rounded-2xl font-medium tracking-widest active:scale-95 transition-all mt-2 flex items-center justify-center gap-2">
            儲存紀錄
          </button>
        </div>
      </div>
    );
  };

  // --- 畫面渲染 ---
  const renderHome = () => (
    <div className="p-6 space-y-4 animate-in fade-in duration-500 pb-28">
      <div className="flex items-center justify-between bg-white p-3.5 rounded-3xl border border-[#F0ECE7] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <button onClick={() => setModalState({ view: 'datepicker' })} className="flex items-center gap-2.5 text-[#5C5C5C] font-medium tracking-wider text-sm active:scale-95 transition-transform">
          <div className="w-8 h-8 rounded-xl bg-[#F9F8F6] flex items-center justify-center border border-[#E8E4DF]">
            <CalendarIcon className="w-4 h-4 text-[#8C8477] stroke-[1.5]" />
          </div>
          {targetDate === todayStr ? '今天' : targetDate.replace(/-/g, '.')}
        </button>
        {targetDate !== todayStr && (
          <button onClick={() => setTargetDate(todayStr)} className="text-[10px] tracking-widest bg-[#F9F8F6] border border-[#E8E4DF] px-3 py-1.5 rounded-xl text-[#8C8477] active:scale-95 transition-all font-medium">回今日</button>
        )}
      </div>

      <div className="bg-[#EFECE7] rounded-3xl p-6 shadow-sm border border-[#E8E4DF] relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-[#8C8477] text-[9px] tracking-widest font-medium mb-1">WEIGHT</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-light text-[#4A4A4A] tracking-tight">{latestWeight || '--'}</span>
              <span className="text-sm text-[#8C8477] font-light">kg</span>
            </div>
            {weightChange && (
              <div className="inline-flex items-center mt-3 px-3 py-1 rounded-full text-[10px] font-medium bg-white/50 text-[#7A756D] backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                較前次 {Number(weightChange) > 0 ? '+' : ''}{weightChange} kg
              </div>
            )}
          </div>
          <WeightScaleIcon className="w-10 h-10 text-[#D6D0C4] opacity-50 stroke-1" />
        </div>
        <div className="mt-6 pt-4 border-t border-[#D6D0C4]/40 relative z-10">
          <p className="text-[#8C8477] text-[9px] tracking-widest mb-1.5">INTAKE / TDEE</p>
          <div className="flex items-end gap-1">
            <span className="font-medium text-[#5C5C5C] text-lg leading-none">{totalIntake}</span>
            <span className="text-[#A89F91] font-light text-sm leading-none pb-[1px]">/ {tdee} kcal</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'weight', title: '體重', icon: WeightScaleIcon, val: arrWeight.length ? `已記 ${arrWeight[arrWeight.length - 1].value} kg` : '未紀錄', bg: 'bg-[#F5F2EB]', color: 'text-[#A89F91]' },
          { id: 'water', title: '飲水', icon: Droplets, val: totalWater ? `${totalWater} ml` : '未紀錄', bg: 'bg-[#EDF1F4]', color: 'text-[#93A3B1]' },
          { id: 'diet', title: '飲食', icon: Utensils, val: arrDiet.length ? `已記 ${arrDiet.length} 筆` : '未紀錄', bg: 'bg-[#EEF2ED]', color: 'text-[#9AA899]' },
          { id: 'exercise', title: '運動', icon: Flame, val: arrEx.length ? `已記 ${arrEx.length} 筆` : '未紀錄', bg: 'bg-[#F7EFEA]', color: 'text-[#C4A495]' }
        ].map(card => (
          <button key={card.id} onClick={() => openCategoryFlow(card.id)} className="bg-white p-5 rounded-3xl border border-[#F0ECE7] flex flex-col items-start gap-3 active:scale-95 transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
            <div className={`w-9 h-9 rounded-2xl ${card.bg} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.color} stroke-[1.5]`} />
            </div>
            <div>
              <h3 className="font-medium text-[#5C5C5C] text-[11px] tracking-widest">{card.title}</h3>
              <p className="text-[10px] text-[#C2BCB6] mt-1 font-light tracking-wide">{card.val}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderModals = () => {
    if (!modalState) return null;
    const { view, category, item, dateStr } = modalState;
    const operateDate = dateStr || targetDate; 
    const targetDataForModal = records[operateDate] || {};
    
    const isDiet = category === 'diet';
    const isEx = category === 'exercise';

    const ModalLayout = ({ title, onBack, children }) => (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#4A4A4A]/20 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-8 border border-[#F0ECE7] max-h-[90vh] overflow-y-auto relative">
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2">
            <div className="flex items-center gap-2">
              {onBack && <button onClick={onBack} className="p-1.5 -ml-1.5 text-[#A89F91] active:scale-90"><ChevronLeft className="w-5 h-5 stroke-[1.5]"/></button>}
              <h2 className="text-[13px] font-medium text-[#5C5C5C] tracking-widest">{title}</h2>
            </div>
            <button onClick={() => setModalState(null)} className="p-1.5 bg-[#F9F8F6] rounded-full text-[#A89F91] active:scale-90"><X className="w-4 h-4" /></button>
          </div>
          {children}
        </div>
      </div>
    );

    if (view === 'datepicker') {
      return (
        <ModalLayout title="選擇日期">
          <DashboardDatePicker initialDate={targetDate} onSelect={(d) => { setTargetDate(d); setModalState(null); }} />
        </ModalLayout>
      );
    }

    if (view === 'list') {
      const arr = getArrayData(targetDataForModal, category);
      const catConfig = {
        weight: { unit: 'kg', name: '體重紀錄' }, water: { unit: 'ml', name: '飲水紀錄' },
        diet: { unit: 'kcal', name: '飲食紀錄' }, exercise: { unit: 'kcal', name: '運動紀錄' }
      }[category];

      return (
        <ModalLayout title={catConfig.name}>
          <div className="mb-20">
            {arr.map(record => (
              <SwipeableRecord
                key={record.id}
                record={record}
                onDelete={(id) => handleDeleteData(category, id)}
                onEdit={(rec) => setModalState({ view: 'calc', category, item: rec, dateStr: operateDate })}
                isDiet={isDiet}
                isEx={isEx}
                catConfig={catConfig}
              />
            ))}
          </div>
          <button onClick={() => setModalState({ view: (isDiet || isEx) ? 'select' : 'calc', category, dateStr: operateDate })} className="absolute bottom-6 right-6 w-14 h-14 bg-[#8C8477] text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(140,132,119,0.4)] active:scale-90 transition-transform">
            <Plus className="w-6 h-6 stroke-[1.5]" />
          </button>
        </ModalLayout>
      );
    }

    if (view === 'select') {
      const cards = isDiet ? profile.dietCards : profile.exerciseCards;
      const colorClass = isDiet ? 'text-[#9AA899] bg-[#EEF2ED] border-[#D6E0D5]' : 'text-[#C4A495] bg-[#F7EFEA] border-[#E8D9D1]';
      return (
        <ModalLayout title={`選擇${isDiet ? '飲食' : '運動'}項目`} onBack={() => getArrayData(targetDataForModal, category).length > 0 && setModalState({view: 'list', category, dateStr: operateDate})}>
          <div className="grid grid-cols-3 gap-3">
            {cards.map(card => (
              <button key={card.id} onClick={() => setModalState({ view: 'calc', category, item: { [isDiet?'content':'type']: card.name }, dateStr: operateDate })} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border bg-white active:bg-gray-50 transition-colors shadow-sm ${colorClass.replace('bg-','border-').replace('text-','').split(' ')[2]}`}>
                <DynamicIcon name={card.icon} className={`w-6 h-6 stroke-[1.5] ${colorClass.split(' ')[0]}`} />
                <span className="text-[10px] font-medium text-[#5C5C5C]">{card.name}</span>
              </button>
            ))}
            <button onClick={() => setModalState({ view: 'new_card', category, dateStr: operateDate })} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-[#D6D0C4] bg-white text-[#A89F91] active:bg-[#F9F8F6]">
              <Plus className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] tracking-widest">新增</span>
            </button>
          </div>
        </ModalLayout>
      );
    }

    if (view === 'calc') {
      let title = '', initial = '', showDec = true;
      if (category === 'weight') { title = '體重 (kg)'; initial = String(item?.value || ''); }
      else if (category === 'water') { title = '飲水量 (ml)'; initial = String(item?.value || ''); showDec = false; }
      else if (isDiet) { title = `熱量 (kcal)`; initial = String(item?.calories ?? item?.value ?? ''); showDec = false; }
      else if (isEx) { title = `消耗 (kcal)`; initial = String(item?.calories ?? item?.value ?? ''); showDec = false; }

      return (
        <ModalLayout title={item?.id ? '修改紀錄' : '新增紀錄'} onBack={() => setModalState({view: (isDiet || isEx) && !item?.id ? 'select' : 'list', category, dateStr: operateDate})}>
          {(isDiet || isEx) && (
            <div className="mb-4">
              <label className="text-[10px] tracking-widest text-[#8C8477] mb-2 block">項目名稱</label>
              <input id="editNameInput" defaultValue={item?.content || item?.type || ''} placeholder="輸入名稱" className="w-full p-3.5 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-sm font-medium" />
            </div>
          )}
          <Calculator title={title} placeholder="0" showDecimals={showDec} initialValue={initial} onSave={(val) => {
            const nameVal = document.getElementById('editNameInput')?.value || item?.content || item?.type;
            const dataToSave = (isDiet) ? { content: nameVal, calories: val } : (isEx) ? { type: nameVal, calories: val } : { value: val };
            handleSaveData(category, dataToSave);
          }} />
          {(isDiet || isEx) && <p className="text-center text-[9px] text-[#C2BCB6] mt-4 tracking-wide font-light">若留空或輸入 0，將單純紀錄有執行此項目。</p>}
        </ModalLayout>
      );
    }

    if (view === 'new_card') {
      const availableIcons = isDiet ? ['Coffee','Apple','Pizza','Carrot','Fish','Beef','Utensils'] : ['Activity','Dumbbell','Flame','Bike','Shuttlecock','HeartPulse','Target'];
      return (
        <ModalLayout title="新增專屬卡片" onBack={() => setModalState({view: 'select', category, dateStr: operateDate})}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const name = e.target.cardName.value;
            const icon = e.target.iconSelect.value;
            if(!name) return;
            const newCard = { id: Date.now().toString(), name, icon };
            if(isDiet) setProfile(p => ({...p, dietCards: [...p.dietCards, newCard]}));
            else setProfile(p => ({...p, exerciseCards: [...p.exerciseCards, newCard]}));
            setModalState({view: 'select', category, dateStr: operateDate});
          }} className="space-y-5">
            <div>
              <label className="text-[10px] tracking-widest text-[#8C8477] mb-2 block">名稱</label>
              <input name="cardName" type="text" placeholder="例如：拿鐵" required className="w-full p-3.5 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-sm" />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-[#8C8477] mb-2 block">圖標</label>
              <div className="grid grid-cols-4 gap-2">
                {availableIcons.map((ic, i) => (
                  <label key={ic} className="cursor-pointer">
                    <input type="radio" name="iconSelect" value={ic} defaultChecked={i===0} className="peer hidden" />
                    <div className="flex justify-center py-3.5 border border-[#F0ECE7] rounded-xl text-[#C2BCB6] peer-checked:border-[#8C8477] peer-checked:text-[#8C8477] peer-checked:bg-[#F5F2EB] transition-all">
                      <DynamicIcon name={ic} className="w-5 h-5 stroke-[1.5]" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-[#8C8477] text-white rounded-xl text-xs font-medium tracking-widest active:scale-95 mt-4">儲存卡片</button>
          </form>
        </ModalLayout>
      );
    }
  };

  // ============================================================
  // BUG FIX: loading 條件改為同時檢查 isInitialLoad 和 recordsReady
  // 只有在 recordsReady 為 true 時才渲染實際內容
  // ============================================================
  const showLoading = isInitialLoad || !recordsReady;

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-[#F7F5F2] font-sans text-[#4A4A4A] overflow-hidden shadow-2xl relative">
      <header className="bg-[#F7F5F2]/90 backdrop-blur-md px-6 py-4 z-10 flex justify-center border-b border-[#EBE8E3] sticky top-0">
        <div className="text-[11px] font-medium text-[#5C5C5C] tracking-[0.2em] uppercase flex items-center gap-2">
          {activeTab === 'home' && 'Dashboard'}
          {activeTab === 'calendar' && 'Calendar'}
          {activeTab === 'trend' && 'Analytics'}
          {activeTab === 'settings' && 'Profile'}
          {isSyncing ? <Cloud className="w-3 h-3 text-[#C4A495] animate-pulse" /> : user && !user.isAnonymous ? <Cloud className="w-3 h-3 text-[#9AA899]" /> : <CloudOff className="w-3 h-3 text-[#C2BCB6]" />}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        {showLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-[#C2BCB6] pb-20">
            <Activity className="w-8 h-8 animate-spin mb-4 stroke-[1.5] text-[#8C8477]" />
            <p className="text-[10px] tracking-widest font-medium">資料同步中</p>
          </div>
        ) : (
          <>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'calendar' && <CalendarView records={records} viewMode={modalState?.category || 'weight'} onSelectDate={(d, mode) => { openCategoryFlow(mode, d); }} />}
            {activeTab === 'trend' && <TrendChart records={records} />}
            {activeTab === 'settings' && <SettingsView profile={profile} setProfile={setProfile} user={user} auth={auth} />}
          </>
        )}
      </main>

      <nav className="bg-[#F7F5F2]/95 backdrop-blur-md border-t border-[#EBE8E3] px-2 pt-2 pb-6 flex justify-around items-center fixed bottom-0 w-full max-w-md z-40">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="首頁" />
        <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={CalendarIcon} label="月曆" />
        <NavButton active={activeTab === 'trend'} onClick={() => setActiveTab('trend')} icon={TrendingUp} label="趨勢" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="設定" />
      </nav>

      {renderModals()}
    </div>
  );
}

// 底部按鈕
function NavButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-2 w-16 bg-transparent border-none transition-all duration-300 ${active ? 'text-[#8C8477] -translate-y-1' : 'text-[#C2BCB6] hover:text-[#A89F91]'}`}>
      <Icon className={`w-[18px] h-[18px] ${active ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
      <span className="text-[9px] tracking-widest font-medium m-0">{label}</span>
      <div className={`w-1 h-1 rounded-full bg-[#8C8477] mt-0.5 transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
    </button>
  );
}

// --- 月曆元件 ---
function CalendarView({ records, viewMode: initialMode, onSelectDate }) {
  const [viewMode, setViewMode] = useState(initialMode);
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const swipeContainerRef = useRef(null);

  const shiftMonth = (delta) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  useEffect(() => {
    const el = swipeContainerRef.current;
    if (!el) return;
    
    let startX = 0, startY = 0;
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

  const monthsData = React.useMemo(() => {
    return [-2, -1, 0, 1, 2].map(offset => {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(year, month, i + 1)));
      return { id: `${year}-${month}`, year, month, days };
    });
  }, [currentMonth]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  return (
    <div className="p-6 pb-28 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex border-b border-[#E8E4DF] mb-6">
        {[{ id: 'weight', label: '體重' }, { id: 'diet', label: '飲食' }, { id: 'exercise', label: '運動' }].map(mode => (
          <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`flex-1 pb-2 text-[10px] tracking-widest transition-all relative ${viewMode === mode.id ? 'text-[#8C8477] font-medium' : 'text-[#C2BCB6] font-light'}`}>
            {mode.label}
            {viewMode === mode.id && <div className="absolute bottom-0 left-0 w-full border-b-[2px] border-[#8C8477]" />}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-5 px-1">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 hover:bg-[#EFECE7] rounded-full text-[#8C8477] active:scale-90 transition-transform"><ChevronLeft className="w-4 h-4" /></button>
        <h2 className="text-xs font-medium tracking-[0.2em] text-[#5C5C5C]">{year} . {String(month + 1).padStart(2, '0')}</h2>
        <button onClick={() => shiftMonth(1)} className="p-1.5 hover:bg-[#EFECE7] rounded-full text-[#8C8477] active:scale-90 transition-transform"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="w-full relative">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-center text-[9px] tracking-widest font-medium text-[#C2BCB6]">{d}</div>)}
        </div>

        <div className="-mr-6">
          <div 
            ref={swipeContainerRef} 
            className="flex w-[500%] will-change-transform touch-pan-y" 
            style={{ transform: 'translateX(-40%)' }}
          >
            {monthsData.map((mData) => (
              <div key={mData.id} className="w-1/5 shrink-0 pr-6">
                <div className="grid grid-cols-7 gap-1.5">
                  {mData.days.map((date, idx) => {
                    if (!date) return <div key={`e-${idx}`} className="h-[3.8rem] bg-transparent pointer-events-none"></div>;
                    
                    const dStr = getDateString(date);
                    const dayData = records[dStr] || {};
                    const arr = getArrayData(dayData, viewMode);
                    const isToday = dStr === getDateString(new Date());
                    let cellContent = null;

                    if (arr.length > 0) {
                      if (viewMode === 'weight') {
                        const latestW = arr[arr.length-1].value;
                        let prevW = null;
                        for(let i=1; i<=7; i++) {
                          const pArr = getArrayData(records[getDateString(new Date(date.getTime() - i * 86400000))] || {}, 'weight');
                          if(pArr.length > 0) { prevW = pArr[pArr.length-1].value; break; }
                        }
                        const diff = prevW ? (latestW - prevW).toFixed(2) : null;
                        let diffEl = null;
                        if (diff !== null) {
                          const nDiff = Number(diff);
                          if (nDiff > 0) diffEl = <span className="text-[8px] text-[#9AA899] font-medium flex items-center gap-[1px] mt-0.5"><svg width="5" height="5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L22 20H2L12 3Z"/></svg>{Math.abs(nDiff).toFixed(2)}</span>;
                          else if (nDiff < 0) diffEl = <span className="text-[8px] text-[#C78D87] font-medium flex items-center gap-[1px] mt-0.5"><svg width="5" height="5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21L2 4H22L12 21Z"/></svg>{Math.abs(nDiff).toFixed(2)}</span>;
                          else diffEl = <span className="text-[8px] text-[#C2BCB6] font-light mt-0.5">- 0.00</span>;
                        }
                        cellContent = <div className="flex flex-col items-center"><span className="font-medium text-[#5C5C5C] text-[11px] leading-none">{latestW}</span>{diffEl}</div>;
                      } else if (viewMode === 'diet') {
                        const cals = arr.reduce((s, a) => s + (Number(a.calories ?? a.value)||0), 0);
                        cellContent = <span className="text-[10px] font-medium text-[#9AA899]">{cals > 0 ? cals : '✓'}</span>;
                      } else if (viewMode === 'exercise') {
                        const cals = arr.reduce((s, a) => s + (Number(a.calories ?? a.value)||0), 0);
                        cellContent = <span className="text-[10px] font-medium text-[#C4A495]">{cals > 0 ? cals : '✓'}</span>;
                      }
                    }

                    return (
                      <button key={dStr} onClick={() => onSelectDate(dStr, viewMode)} className={`h-[3.8rem] rounded-[10px] p-1 flex flex-col items-center transition-colors border active:scale-95 ${isToday ? 'bg-[#F9F8F6] border-[#D6D0C4]' : 'bg-white border-[#F0ECE7]'}`}>
                        <span className={`text-[8px] font-medium mb-1 ${isToday ? 'text-[#8C8477]' : 'text-[#A89F91]'}`}>{date.getDate()}</span>
                        <div className="flex-1 flex items-center justify-center pointer-events-none">{cellContent}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] text-[#C2BCB6] mt-6 tracking-widest font-light">點擊日期即可查看或編輯紀錄，左右滑動可切換月份</p>
    </div>
  );
}

// --- 趨勢圖表 ---
function TrendChart({ records }) {
  const [range, setRange] = useState('1M'); 
  
  const weightData = React.useMemo(() => {
    const data = [];
    Object.entries(records).forEach(([date, dayData]) => {
      const arr = getArrayData(dayData, 'weight');
      if (arr.length > 0) data.push({ date, weight: Number(arr[arr.length - 1].value) });
    });
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (range === 'ALL') return data;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(range));
    return data.filter(d => new Date(d.date) >= cutoff);
  }, [records, range]);

  if (weightData.length < 2) {
    return (
      <div className="p-6 pb-28 animate-in fade-in">
        <TrendFilters range={range} setRange={setRange} />
        <div className="text-center text-[#A89F91] mt-24">
          <TrendingUp className="w-8 h-8 mx-auto text-[#D6D0C4] mb-4 stroke-[1.5]" />
          <p className="font-medium tracking-widest text-[10px]">資料不足</p>
          <p className="text-[9px] mt-2 font-light">需要兩天以上的紀錄來產生趨勢線</p>
        </div>
      </div>
    );
  }

  const weights = weightData.map(d => d.weight);
  
  let minW = Math.floor(Math.min(...weights));
  let maxW = Math.ceil(Math.max(...weights));
  if (maxW === minW) { minW -= 1; maxW += 1; }
  if ((maxW - minW) % 2 !== 0) { maxW += 1; }

  const width = 320;
  const height = 180;
  const paddingX = 20; 
  const paddingY = 25;

  const points = weightData.map((d, i) => ({
    x: paddingX + (i / (weightData.length - 1)) * (width - paddingX * 2),
    y: height - paddingY - ((d.weight - minW) / (maxW - minW)) * (height - paddingY * 2),
    dateStr: d.date
  }));

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const xAxisLabels = [];
  let lastMonth = null;
  points.forEach(p => {
    const m = parseInt(p.dateStr.split('-')[1]);
    if (m !== lastMonth) {
      xAxisLabels.push({ x: p.x, label: `${m}月` });
      lastMonth = m;
    }
  });

  return (
    <div className="p-6 pb-28 animate-in fade-in duration-500 flex flex-col gap-5">
      <TrendFilters range={range} setRange={setRange} />
      <div className="bg-white p-5 rounded-3xl border border-[#F0ECE7]">
        <div className="flex justify-between items-end mb-6 px-1">
          <h2 className="text-[10px] font-medium tracking-[0.2em] text-[#8C8477] uppercase">Weight Trend</h2>
          <span className="text-[9px] text-[#A89F91] font-light">{weightData[0].date.replace(/-/g, '.')} ~ {weightData[weightData.length-1].date.replace(/-/g, '.')}</span>
        </div>
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
          <svg width={width} height={height} className="mx-auto overflow-visible">
            {[0, 0.5, 1].map(r => {
              const y = paddingY + r * (height - paddingY * 2);
              const val = Math.round(maxW - r * (maxW - minW));
              return (
                <g key={`y-${r}`}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#F0ECE7" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={paddingX - 6} y={y + 3} fontSize="8" fill="#C2BCB6" textAnchor="end" className="font-light">{val}</text>
                </g>
              );
            })}
            
            {xAxisLabels.map((lbl, i) => (
              <g key={`x-${i}`}>
                <line x1={lbl.x} y1={paddingY} x2={lbl.x} y2={height - paddingY} stroke="#F9F8F6" strokeWidth="1" />
                <text x={lbl.x} y={height - paddingY + 16} fontSize="8" fill="#A89F91" textAnchor="middle" className="font-light">{lbl.label}</text>
              </g>
            ))}

            <polyline points={polylinePoints} fill="none" stroke="#C4A495" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const TrendFilters = ({ range, setRange }) => (
  <div className="flex bg-white rounded-2xl p-1 border border-[#F0ECE7]">
    {['1M', '3M', '6M', '12M', 'ALL'].map(r => (
      <button key={r} onClick={() => setRange(r)} className={`flex-1 py-2 text-[9px] font-medium tracking-widest rounded-xl transition-all ${range === r ? 'bg-[#F9F8F6] text-[#8C8477] shadow-sm border border-[#E8E4DF]' : 'text-[#C2BCB6]'}`}>{r}</button>
    ))}
  </div>
);

// --- 設定頁面 ---
function SettingsView({ profile, setProfile, user, auth }) {
  return (
    <div className="p-6 space-y-5 animate-in fade-in duration-500 pb-28">
      <div className="bg-white rounded-3xl p-6 border border-[#F0ECE7] space-y-5">
        <h2 className="text-xs font-medium text-[#5C5C5C] tracking-widest flex items-center gap-2 mb-4"><Settings className="w-4 h-4 text-[#C2BCB6] stroke-[1.5]" /> 生理設定</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] tracking-widest text-[#8C8477]">GENDER</label>
            <div className="flex gap-2">
              <button onClick={() => setProfile({...profile, gender: 'male'})} className={`flex-1 py-2.5 rounded-xl border text-[11px] transition-all ${profile.gender === 'male' ? 'bg-[#EFECE7] border-[#D6D0C4] text-[#5C5C5C]' : 'border-[#F0ECE7] text-[#C2BCB6]'}`}>男</button>
              <button onClick={() => setProfile({...profile, gender: 'female'})} className={`flex-1 py-2.5 rounded-xl border text-[11px] transition-all ${profile.gender === 'female' ? 'bg-[#EFECE7] border-[#D6D0C4] text-[#5C5C5C]' : 'border-[#F0ECE7] text-[#C2BCB6]'}`}>女</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] tracking-widest text-[#8C8477]">AGE</label>
            <input type="number" value={profile.age || ''} onChange={(e) => setProfile({...profile, age: e.target.value})} className="w-full p-2.5 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-xs text-center" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] tracking-widest text-[#8C8477]">HEIGHT (cm)</label>
            <input type="number" value={profile.height || ''} onChange={(e) => setProfile({...profile, height: e.target.value})} className="w-full p-2.5 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-xs text-center" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] tracking-widest text-[#8C8477]">自訂 TDEE</label>
            <input type="number" placeholder="自動計算" value={profile.customTDEE || ''} onChange={(e) => setProfile({...profile, customTDEE: e.target.value})} className="w-full p-2.5 bg-[#F9F8F6] border border-[#E8E4DF] rounded-xl outline-none text-[#5C5C5C] text-xs text-center placeholder:text-[#C2BCB6]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#F0ECE7] space-y-4">
        <h2 className="text-xs font-medium text-[#5C5C5C] tracking-widest flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-[#C2BCB6] stroke-[1.5]" /> 雲端備份</h2>
        {user && !user.isAnonymous ? (
          <div className="space-y-3 pt-1">
            <div className="bg-[#F9F8F6] p-3 rounded-xl border border-[#E8E4DF] flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#8C8477] stroke-[1.5]" />
              <span className="text-[11px] font-medium text-[#5C5C5C] truncate">{user.email}</span>
            </div>
            <button onClick={() => { signOut(auth); window.location.reload(); }} className="w-full py-3 bg-white text-[#C78D87] rounded-xl text-[11px] font-medium tracking-widest border border-[#F0ECE7] active:scale-95">登出帳號</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] text-[#A89F91] leading-relaxed font-light">目前為訪客模式。綁定 Google 帳號可確保資料永久保存並跨裝置同步。</p>
            <button onClick={() => { signInWithPopup(auth, new GoogleAuthProvider()).catch(()=>{}); }} className="w-full py-3 bg-[#8C8477] text-white rounded-xl text-[11px] font-medium tracking-widest active:scale-95 shadow-sm">
              綁定 GOOGLE 帳號
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
