import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, TrendingUp, Settings, Home, 
  Flame, Utensils, Droplets, X, Plus, ChevronLeft, ChevronRight, CheckCircle2,
  Cloud, CloudOff, ShieldCheck, Activity, Dumbbell, Coffee, Apple, Pizza, Carrot, 
  Fish, Beef, Bike, Zap, HeartPulse, Delete, Trash2,
  Music, Sun, Moon, Star, Heart, Target, RefreshCw, Moon as MoonIcon,
  Camera, Sparkles, Clock, Loader2, Image as ImageIcon,
  CornerDownLeft
} from 'lucide-react';

// --- Firebase 初始化 ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, getDoc, getDocs } from 'firebase/firestore';

// 在 Canvas 預覽環境中會自動注入 __firebase_config
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : (firebaseConfig.appId || 'default-app-id');

// --- Gemini API 封裝 (安全版) ---
const fetchGemini = async (payload) => {
  const url = `/api/gemini`;
  let retries = 5;
  let delay = 1000;
  while (retries > 0) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "0";
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
};

const estimateDietCalories = async (base64Str) => {
  const b64Data = base64Str.split(',')[1];
  const payload = {
    contents: [{
      role: "user",
      parts: [
        { text: "請估算這份食物的熱量。請直接回覆我一個數字即可（代表大卡），不要有任何其他文字或符號。如果無法辨識，請回覆 0。" },
        { inlineData: { mimeType: "image/jpeg", data: b64Data } }
      ]
    }]
  };
  return await fetchGemini(payload);
};

const estimateDietCaloriesText = async (name, fullness, weight, height, age, gender) => {
  const genderStr = gender === 'male' ? '男性' : '女性';
  const payload = {
    contents: [{
      parts: [{ text: `我是一名 ${age} 歲的${genderStr}，身高 ${height} 公分，體重 ${weight} 公斤。我吃了一份「${name}」，飽足感是「${fullness}」。請為我估算這份食物大概是多少大卡熱量？請直接回覆我一個整數即可，不要有任何其他文字或符號。` }]
    }],
    systemInstruction: { parts: [{ text: "你是一個專業的營養師，擅長精準估算食物熱量。" }] }
  };
  return await fetchGemini(payload);
};

const estimateExercisePower = async (type, weight, height, age, gender) => {
  const genderStr = gender === 'male' ? '男性' : '女性';
  const payload = {
    contents: [{
      parts: [{ text: `我是一名 ${age} 歲的${genderStr}，身高 ${height} 公分，體重 ${weight} 公斤。我正在做「${type}」運動。請為我估算這項運動「每分鐘」會消耗多少大卡熱量？請直接回覆我一個整數即可，不要有任何其他文字或符號。` }]
    }],
    systemInstruction: { parts: [{ text: "你是一個專業的健身教練與營養師，擅長精準估算熱量消耗功率。" }] }
  };
  return await fetchGemini(payload);
};

// --- 本地儲存封裝 ---
const safeStorage = {
  get: (key) => {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : null; } 
    catch (e) { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } 
    catch (e) {}
  }
};

const DEFAULT_PROFILE = {
  height: '', birthYear: '', gender: 'female', customTDEE: '', 
  visualFriendly: false, themeMode: 'auto',
  showTDEE: true, showBMR: false,
  dietCards: [
    { id: 'custom', name: '自行輸入', icon: 'Plus' }, { id: 'bf', name: '早餐', icon: 'Coffee' },
    { id: 'lc', name: '午餐', icon: 'Utensils' }, { id: 'dn', name: '晚餐', icon: 'Utensils' },
    { id: 'sn', name: '點心', icon: 'Apple' }
  ],
  exerciseCards: [
    { id: 'custom', name: '自行輸入', icon: 'Plus' }, { id: 'bd', name: '羽球', icon: 'Shuttlecock' },
    { id: 'bx', name: '有氧', icon: 'Flame' }, { id: 'bp', name: '重量訓練', icon: 'Dumbbell' }
  ]
};

// --- 自訂圖示庫 ---
const ShuttlecockIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 18a2 2 0 1 0 4 0v-2h-4v2z" />
    <path d="M10 16L5 3l7 4 7-4-5 13" />
    <path d="M12 16V7" />
    <path d="M7.5 10h9" />
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

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
  });
};

const SwipeableRecord = ({ record, onDelete, onEdit, isDiet, isEx, catConfig, isLarge }) => {
  const s = (n, l) => isLarge ? l : n;
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  
  const maxOffset = isLarge ? -85 : -80;
  const triggerOffset = isLarge ? -40 : -40;

  const handleTouchStart = (e) => { startXRef.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startXRef.current;
    if (deltaX < 0) {
      currentXRef.current = Math.max(deltaX, maxOffset);
      setOffsetX(currentXRef.current);
    } else if (deltaX > 0 && offsetX < 0) {
      currentXRef.current = Math.min(offsetX + deltaX, 0);
      setOffsetX(currentXRef.current);
    }
  };
  const handleTouchEnd = () => {
    if (currentXRef.current < triggerOffset) {
      setOffsetX(maxOffset);
      currentXRef.current = maxOffset;
    } else {
      setOffsetX(0);
      currentXRef.current = 0;
    }
  };

  const displayValue = record.calories ?? record.value ?? 0;
  const hasImage = !!record.image;

  return (
    <div className="relative w-full mb-3 rounded-2xl overflow-hidden touch-pan-y bg-[#C78D87] dark:bg-[#B86C65]">
      <div className={`absolute inset-y-0 right-0 ${s('w-20', 'w-[85px]')} flex items-center justify-center`}>
        <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="w-full h-full flex flex-col items-center justify-center text-white active:bg-[#B57C76] dark:active:bg-[#A55F59] transition-colors">
          <Trash2 className={`${s('w-5 h-5 mb-1', 'w-6 h-6 mb-1.5')} stroke-[1.5]`} />
          <span className={s('text-[10px]', 'text-sm font-medium tracking-wide')}>刪除</span>
        </button>
      </div>
      <div 
        className={`relative w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] ${s('p-4', 'p-4')} flex justify-between items-center transition-transform duration-200 z-10 h-full border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-2xl min-w-0`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (offsetX === 0) onEdit(record);
          else { setOffsetX(0); currentXRef.current = 0; }
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
          <span className={`${s('text-[10px] w-10', 'text-[13px] w-12')} text-[#A89F91] dark:text-[#888888] font-medium shrink-0`}>{record.time}</span>
          <div className={`${s('h-4', 'h-5')} w-[1.5px] bg-[#D6D0C4] dark:bg-[#4A4A4A] shrink-0`}></div>
          <div className="flex flex-col min-w-0">
            <span className={`${s('text-xs', 'text-[15px]')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1] truncate min-w-0`}>
              {(isDiet || isEx) ? (record.content || record.type) : '紀錄數值'}
            </span>
            {isEx && record.duration && (
              <span className={`${s('text-[10px]', 'text-[12px]')} text-[#A89F91] dark:text-[#888888] font-medium truncate mt-0.5`}>持續 {record.duration} 分鐘</span>
            )}
          </div>
        </div>
        {hasImage && (
          <div className="ml-2 shrink-0">
            <img src={record.image} alt="紀錄縮圖" className={`${s('w-10 h-10', 'w-12 h-12')} object-cover rounded-lg border border-[#E8E4DF] dark:border-[#4A4A4A]`} />
          </div>
        )}
        <div className="flex items-baseline gap-1 pointer-events-none shrink-0 pl-2">
          <span className={`${s('text-sm', 'text-lg')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1]`}>{displayValue}</span>
          {Number(displayValue) > 0 && <span className={`${s('text-[9px]', 'text-[11px]')} text-[#A89F91] dark:text-[#888888] font-medium`}>{catConfig.unit}</span>}
        </div>
      </div>
    </div>
  );
};

// --- 紀錄編輯元件 ---
const RecordEditor = ({ category, item, isDiet, isEx, isLarge, latestWeight, onSave, profile }) => {
  const s = (n, l) => isLarge ? l : n;
  
  const [name, setName] = useState(item?.content || item?.type || '');
  const [duration, setDuration] = useState(item?.duration || '');
  const [image, setImage] = useState(item?.image || null);
  const [finalValue, setFinalValue] = useState(String((category === 'weight' || category === 'water') ? (item?.value || '') : (item?.calories ?? item?.value ?? '')));
  
  const [showCalc, setShowCalc] = useState(false);
  const [expr, setExpr] = useState(finalValue);
  
  const [isEstimating, setIsEstimating] = useState(false);
  const [showFullnessOptions, setShowFullnessOptions] = useState(false);
  const fileInputRef = useRef(null);

  let title = '';
  if (category === 'weight') title = '體重 (kg)';
  else if (category === 'water') title = '飲水量 (ml)';
  else if (isDiet) title = `熱量 (kcal)`;
  else if (isEx) title = `消耗 (kcal)`;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressedImage = await compressImage(file);
    setImage(compressedImage);
  };

  const handleEstimateDietImage = async () => {
    if (!image) return;
    setIsEstimating(true);
    try {
      const result = await estimateDietCalories(image);
      const numMatch = result.match(/\d+/);
      if (numMatch) setFinalValue(String(parseInt(numMatch[0])));
    } catch (e) {
      console.error("AI Estimation failed:", e);
    }
    setIsEstimating(false);
  };

  const handleEstimateDietText = async (fullness) => {
    setShowFullnessOptions(false);
    if (!name) return;
    setIsEstimating(true);
    try {
      const calcAge = profile?.birthYear ? new Date().getFullYear() - Number(profile.birthYear) : 25;
      const calcHeight = profile?.height ? Number(profile.height) : 160;
      const calcWeight = latestWeight ? Number(latestWeight) : 60;
      const calcGender = profile?.gender || 'female';

      const dietCache = safeStorage.get('wt_diet_text_cache') || {};
      const cacheKey = `${name}_${fullness}_${calcGender}`;
      const cachedData = dietCache[cacheKey];

      let cals = null;
      let isFromCache = false;

      if (cachedData) {
        const weightDiff = Math.abs(calcWeight - cachedData.weight) / cachedData.weight;
        const ageDiff = Math.abs(calcAge - cachedData.age) / cachedData.age;
        if (weightDiff <= 0.05 && ageDiff <= 0.05) {
          cals = cachedData.calories;
          isFromCache = true;
        }
      }

      if (isFromCache) {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
      } else {
        const result = await estimateDietCaloriesText(name, fullness, calcWeight, calcHeight, calcAge, calcGender);
        const numMatch = result.match(/\d+/);
        if (numMatch) {
          cals = parseInt(numMatch[0]);
          dietCache[cacheKey] = { weight: calcWeight, age: calcAge, calories: cals, updatedAt: Date.now() };
          safeStorage.set('wt_diet_text_cache', dietCache);
        }
      }

      if (cals !== null) setFinalValue(String(cals));
    } catch (e) { console.error("AI Estimation failed:", e); }
    setIsEstimating(false);
  };

  const handleEstimateExercise = async () => {
    if (!name || !duration) return;
    setIsEstimating(true);
    try {
      const calcAge = profile?.birthYear ? new Date().getFullYear() - Number(profile.birthYear) : 25;
      const calcHeight = profile?.height ? Number(profile.height) : 160;
      const calcWeight = latestWeight ? Number(latestWeight) : 60;
      const calcGender = profile?.gender || 'female';
      const durNum = Number(duration);

      const powerCache = safeStorage.get('wt_ex_power_cache') || {};
      const cacheKey = `${name}_${calcGender}`; 
      const cachedData = powerCache[cacheKey];

      let power = null;
      let isFromCache = false;

      if (cachedData) {
        const weightDiff = Math.abs(calcWeight - cachedData.weight) / cachedData.weight;
        const ageDiff = Math.abs(calcAge - cachedData.age) / cachedData.age;
        if (weightDiff <= 0.05 && ageDiff <= 0.05) {
          power = cachedData.power;
          isFromCache = true;
        }
      }

      if (isFromCache) {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
      } else {
        const result = await estimateExercisePower(name, calcWeight, calcHeight, calcAge, calcGender);
        const numMatch = result.match(/[\d.]+/);
        if (numMatch) {
          power = parseFloat(numMatch[0]);
          powerCache[cacheKey] = { weight: calcWeight, age: calcAge, power: power, updatedAt: Date.now() };
          safeStorage.set('wt_ex_power_cache', powerCache);
        }
      }

      if (power !== null) {
        const totalCals = Math.round(power * durNum);
        setFinalValue(String(totalCals));
      }
    } catch (e) { console.error("AI Estimation failed:", e); }
    setIsEstimating(false);
  };

  const handlePress = (val) => {
    if (val === 'C') { setExpr(''); return; }
    if (val === 'DEL') { setExpr(prev => prev.slice(0, -1)); return; }
    if (val === 'ENTER') {
      let result = expr;
      if (/[+×÷\-]/.test(expr)) {
        try {
          // eslint-disable-next-line no-new-func
          result = String(new Function(`'use strict'; return (${expr.replace(/×/g, '*').replace(/÷/g, '/')})`)());
          if(!isNaN(result) && isFinite(result)) result = String(Math.round(result * 100) / 100);
          else result = '0';
        } catch (e) { result = '0'; }
      }
      setFinalValue(result);
      setShowCalc(false);
      return;
    }
    if (expr === 'Error') { setExpr(val); return; }
    setExpr(prev => prev + val);
  };

  const handleConfirm = () => {
    let val = finalValue;
    if (val || val === '') {
      const dataToSave = (isDiet) 
        ? { content: name, calories: val, image } 
        : (isEx) 
          ? { type: name, calories: val, duration, image } 
          : { value: val };
      onSave(dataToSave);
    }
  };

  const btns = [
    { label: 'C', col: 1 }, { label: 'DEL', col: 1 }, { label: '÷', col: 1 }, { label: '×', col: 1 },
    { label: '7', col: 1 }, { label: '8', col: 1 }, { label: '9', col: 1 }, { label: '-', col: 1 },
    { label: '4', col: 1 }, { label: '5', col: 1 }, { label: '6', col: 1 }, { label: '+', col: 1 },
    { label: '1', col: 1 }, { label: '2', col: 1 }, { label: '3', col: 1 }, { label: 'ENTER', col: 1, row: 2, isEq: true },
    { label: '0', col: 2 }, { label: '.', col: 1 }
  ];

  const getFontSize = (text) => {
    const len = text.length;
    if (isLarge) {
      if (len <= 7) return 'clamp(2rem, 10vw, 3rem)';
      if (len <= 10) return 'clamp(1.5rem, 8vw, 2.25rem)';
      if (len <= 14) return 'clamp(1.2rem, 6vw, 1.875rem)';
      return 'clamp(1rem, 5vw, 1.5rem)';
    } else {
      if (len <= 7) return 'clamp(1.75rem, 8vw, 2.25rem)';
      if (len <= 10) return 'clamp(1.5rem, 6vw, 1.875rem)';
      if (len <= 14) return 'clamp(1.25rem, 5vw, 1.5rem)';
      return '1.125rem';
    }
  };

  // 獨立計算機視圖
  if (showCalc) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8E4DF] dark:border-[#3A3A3A]">
          <button onClick={() => setShowCalc(false)} className="p-1.5 text-[#A89F91] dark:text-[#888888] active:scale-90 bg-[#F9F8F6] dark:bg-[#2A2A2A] rounded-full">
            <ChevronLeft className="w-5 h-5 stroke-[2]"/>
          </button>
          <span className="text-[#5C5C5C] dark:text-[#D1D1D1] font-bold text-[13px] tracking-widest">輸入數值</span>
          <div className="w-8"></div>
        </div>
        
        <div className={`bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-2xl ${s('p-4 min-h-[5.5rem]', 'p-4 min-h-[6.5rem]')} flex flex-col items-end justify-center overflow-hidden`}>
           <p className={`font-light text-[#4A4A4A] dark:text-[#E8E8E8] tracking-wider w-full text-right truncate min-w-0`} style={{ fontSize: getFontSize(expr || "0") }}>
             {expr || "0"}
           </p>
        </div>

        <div className={`grid grid-cols-4 ${s('gap-2', 'gap-2.5')}`}>
          {btns.map(btn => (
            <button key={btn.label} type="button" onClick={() => handlePress(btn.label)}
              className={`${s('h-12 text-xl', 'h-14 text-2xl')} rounded-2xl font-light flex items-center justify-center transition-colors active:scale-95
                ${btn.col === 2 ? 'col-span-2' : 'col-span-1'}
                ${btn.row === 2 ? 'row-span-2' : 'row-span-1'}
                ${btn.isEq ? 'bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212]' : 
                  ['÷','×','-','+'].includes(btn.label) ? 'bg-[#EFECE7] dark:bg-[#333333] text-[#8C8477] dark:text-[#A1988B]' : 
                  ['C','DEL'].includes(btn.label) ? 'bg-[#F7EFEA] dark:bg-[#2D2520] text-[#C4A495] dark:text-[#C4A495]' : 
                  'bg-white dark:bg-[#1E1E1E] border border-[#F0ECE7] dark:border-[#333333] text-[#5C5C5C] dark:text-[#D1D1D1]'}`}
            >
              {btn.label === 'DEL' ? <Delete className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5]`}/> : 
               btn.label === 'ENTER' ? <CornerDownLeft className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[2]`}/> : btn.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 表單視圖
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {(isDiet || isEx) && (
        <div className="w-full relative bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-2xl overflow-hidden min-h-[120px] flex items-center justify-center">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          {image ? (
            <>
              <img src={image} alt="uploaded preview" className="w-full h-40 object-cover" />
              <button onClick={() => setImage(null)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full py-8 text-[#A89F91] dark:text-[#888888] hover:text-[#8C8477] dark:hover:text-[#A1988B] transition-colors">
              <Camera className="w-8 h-8 mb-2 stroke-[1.5]" />
              <span className={`${s('text-[11px]', 'text-[13px] font-medium')} tracking-widest`}>點擊新增照片紀錄</span>
            </button>
          )}
        </div>
      )}

      {(isDiet || isEx) && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={`${s('text-[10px]', 'text-[12px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B] mb-1.5 block`}>項目名稱</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="輸入名稱" className={`w-full ${s('p-3.5 text-sm', 'p-3 text-[16px] font-bold')} bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] font-medium`} />
          </div>
          {isEx && (
            <div>
              <label className={`${s('text-[10px]', 'text-[12px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B] mb-1.5 block`}>持續時間 (分鐘, 選填)</label>
              <div className="relative">
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="例如: 30" className={`w-full ${s('p-3.5 pl-10 text-sm', 'p-3 pl-10 text-[16px] font-bold')} bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] font-medium`} />
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89F91] dark:text-[#888888] stroke-[1.5]" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 觸發計算機區域 */}
      <div className={`relative bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-2xl ${s('p-4 min-h-[5.5rem]', 'p-4 min-h-[6.5rem]')} flex flex-col items-end justify-center overflow-hidden transition-all group hover:border-[#D6D0C4] dark:hover:border-[#4A4A4A]`}>
        
        {/* 左上角的標題及AI估算按鈕佈局 */}
        <div className="absolute top-3 left-4 flex flex-col items-start gap-2 z-20" onClick={(e) => e.stopPropagation()}>
          <p className={`text-[#A89F91] dark:text-[#888888] ${s('text-[10px]', 'text-[12px]')} tracking-widest font-medium shrink-0`}>{title}</p>
          
          {isDiet && (image || name) && (
            <div className="flex flex-col items-start gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (image) handleEstimateDietImage();
                  else setShowFullnessOptions(prev => !prev);
                }}
                disabled={isEstimating}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-[10px] sm:text-[11px] font-medium tracking-wider transition-all
                  ${isEstimating ? 'bg-[#C2BCB6] cursor-not-allowed' : 'bg-gradient-to-r from-[#9AA899] to-[#8C8477] active:scale-95 shadow-sm'}`}
              >
                {isEstimating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isEstimating ? '品嚐中...' : '估算攝取熱量'}
              </button>

              {showFullnessOptions && !image && !isEstimating && (
                <div className="flex items-center gap-1.5 mt-0.5 animate-in slide-in-from-top-1">
                  {['沒吃飽', '剛剛好', '好飽'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={(e) => { e.stopPropagation(); handleEstimateDietText(lvl); }}
                      className="px-2 py-1 text-[10px] bg-white dark:bg-[#1E1E1E] text-[#8C8477] dark:text-[#A1988B] rounded-md border border-[#E8E4DF] dark:border-[#3A3A3A] hover:bg-[#F9F8F6] dark:hover:bg-[#2A2A2A] active:scale-95 transition-all shadow-sm tracking-wider font-medium"
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isEx && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleEstimateExercise(); }}
              disabled={isEstimating || !name || !duration}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-[10px] sm:text-[11px] font-medium tracking-wider transition-all
                ${(isEstimating || !name || !duration) ? 'bg-[#C2BCB6] dark:bg-[#4A4A4A] cursor-not-allowed' : 'bg-gradient-to-r from-[#C4A495] to-[#B57C76] active:scale-95 shadow-sm'}`}
            >
              {isEstimating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isEstimating ? '運動中...' : '估算消耗熱量'}
            </button>
          )}
        </div>

        {/* 觸發計算機的大按鈕 */}
        <button 
           type="button" 
           onClick={() => { setExpr(finalValue); setShowCalc(true); }}
           className={`w-full flex-1 flex items-end justify-end focus:outline-none z-10 ${isDiet || isEx ? 'mt-8' : ''}`}
        >
          <p 
            className={`font-light text-[#4A4A4A] dark:text-[#E8E8E8] tracking-wider w-full text-right transition-all duration-200 truncate leading-none pb-1 min-w-0 group-active:scale-95 group-hover:text-[#8C8477] dark:group-hover:text-[#A1988B]`} 
            style={{ fontSize: getFontSize(finalValue || "0") }}
          >
            {finalValue || "0"}
          </p>
        </button>
      </div>

      <button onClick={handleConfirm} className={`w-full ${s('h-12', 'h-14 text-[16px]')} bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-2xl font-medium tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2`}>
        儲存紀錄
      </button>

      {(isDiet || isEx) && <p className={`text-center ${s('text-[9px] mt-1 font-light', 'text-[11px] mt-1 font-medium')} text-[#C2BCB6] dark:text-[#666666] tracking-wide`}>若留空或輸入 0，將單純紀錄有執行此項目。</p>}
    </div>
  );
};


// --- 儀表板小月曆元件 ---
function DashboardDatePicker({ initialDate, onSelect, isLarge }) {
  const s = (n, l) => isLarge ? l : n;
  const [viewDate, setViewDate] = useState(new Date(initialDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(year, month, i + 1)));

  const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i);
  const months = Array.from({length: 12}, (_, i) => i);

  return (
    <div className={s('space-y-4', 'space-y-5')}>
      <div className={`flex justify-between items-center bg-[#F9F8F6] dark:bg-[#2A2A2A] ${s('p-2', 'p-2')} rounded-2xl border border-[#E8E4DF] dark:border-[#3A3A3A]`}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 text-[#8C8477] dark:text-[#A1988B] hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-xl transition-colors active:scale-90"><ChevronLeft className={s('w-5 h-5', 'w-6 h-6')}/></button>
        <div className="flex gap-2">
          <div className={`relative flex items-center bg-white dark:bg-[#1E1E1E] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl ${s('px-1', 'px-1.5')} shadow-sm`}>
            <select value={year} onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))} className={`appearance-none bg-transparent ${s('py-2 pl-3 pr-6 text-sm', 'py-2 pl-3 pr-7 text-base')} outline-none text-[#5C5C5C] dark:text-[#D1D1D1] font-medium`}>
              {years.map(y => <option key={y} value={y}>{y} 年</option>)}
            </select>
            <div className={`absolute ${s('right-2 text-[10px]', 'right-2 text-[11px]')} pointer-events-none text-[#A89F91] dark:text-[#888888]`}>▼</div>
          </div>
          <div className={`relative flex items-center bg-white dark:bg-[#1E1E1E] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl ${s('px-1', 'px-1.5')} shadow-sm`}>
            <select value={month} onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))} className={`appearance-none bg-transparent ${s('py-2 pl-3 pr-6 text-sm', 'py-2 pl-3 pr-7 text-base')} outline-none text-[#5C5C5C] dark:text-[#D1D1D1] font-medium`}>
              {months.map(m => <option key={m} value={m}>{String(m + 1).padStart(2, '0')} 月</option>)}
            </select>
            <div className={`absolute ${s('right-2 text-[10px]', 'right-2 text-[11px]')} pointer-events-none text-[#A89F91] dark:text-[#888888]`}>▼</div>
          </div>
        </div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 text-[#8C8477] dark:text-[#A1988B] hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-xl transition-colors active:scale-90"><ChevronRight className={s('w-5 h-5', 'w-6 h-6')}/></button>
      </div>
      <div className={`grid grid-cols-7 ${s('gap-1.5 text-[10px] font-medium', 'gap-1.5 text-[12px] font-bold')} text-center mb-2 px-1 text-[#A89F91] dark:text-[#888888] tracking-widest`}>
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className={`grid grid-cols-7 ${s('gap-1.5', 'gap-1.5')} px-1 pb-4`}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const dStr = getDateString(d);
          const isTarget = dStr === initialDate;
          const isToday = dStr === getDateString(new Date());
          return (
            <button key={i} onClick={() => onSelect(dStr)} className={`aspect-square flex items-center justify-center transition-all active:scale-90 ${s('rounded-xl text-xs font-medium', 'rounded-2xl text-[15px] font-bold')} ${isTarget ? 'bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] shadow-md' : isToday ? 'border-2 border-[#D6D0C4] dark:border-[#4A4A4A] text-[#8C8477] dark:text-[#A1988B] bg-[#F9F8F6] dark:bg-[#2A2A2A]' : 'text-[#5C5C5C] dark:text-[#D1D1D1] hover:bg-[#EFECE7] dark:hover:bg-[#333333] border border-transparent'}`}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  );
}

// --- 主要應用程式 ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [modalState, setModalState] = useState(null); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const todayStrRef = useRef(getDateString(new Date()));
  const [todayStr, setTodayStr] = useState(todayStrRef.current);
  const [targetDate, setTargetDate] = useState(todayStrRef.current);

  const [profile, setProfile] = useState(() => safeStorage.get('wt_profile')?.data || DEFAULT_PROFILE);
  const [records, setRecords] = useState(() => safeStorage.get('wt_records') || {});
  
  const [draftProfile, setDraftProfile] = useState(null);
  const activeProfile = draftProfile || profile;
  const isProfileDirty = draftProfile !== null;

  const [showSettingsDot, setShowSettingsDot] = useState(() => {
    const hasViewed = safeStorage.get('wt_settings_viewed');
    const isMissingData = !profile.birthYear || !profile.height;
    return !hasViewed && isMissingData;
  });

  const unsubRecordsRef = useRef(null);
  const unsubProfileRef = useRef(null);

  const isLarge = activeProfile.visualFriendly || false;
  const themeMode = activeProfile.themeMode || 'auto';
  const s = (normal, large) => isLarge ? large : normal;

  // --- 夜間模式與時間監聽邏輯 ---
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const checkTheme = () => {
      let isDarkTheme = false;
      if (themeMode === 'dark') isDarkTheme = true;
      else if (themeMode === 'light') isDarkTheme = false;
      else isDarkTheme = mediaQuery.matches;
      setIsDark(isDarkTheme);
      if (isDarkTheme) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#121212';
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#F7F5F2';
      }
    };
    checkTheme();
    const handleThemeChange = () => { if (themeMode === 'auto') checkTheme(); };
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, [themeMode]);

  useEffect(() => {
    const handleWake = () => {
      const newToday = getDateString(new Date());
      if (todayStrRef.current !== newToday) {
        setTargetDate(prev => prev === todayStrRef.current ? newToday : prev);
        todayStrRef.current = newToday;
        setTodayStr(newToday);
      }
    };
    const handleVisibility = () => { if (document.visibilityState === 'visible') handleWake(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
    };
  }, []);

  // --- Firebase 同步邏輯 ---
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
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsSyncing(true);
        let isMounted = true;
        try {
          const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'main');
          const pSnap = await getDoc(profileRef);
          const rProfile = pSnap.exists() ? pSnap.data() : null;
          
          const lProfileObj = safeStorage.get('wt_profile');
          const lProfile = lProfileObj?.data || DEFAULT_PROFILE;
          const lTimeP = lProfileObj?.updatedAt || 0;
          const rTimeP = rProfile?._updatedAt || 0;

          if (rProfile && (!lProfileObj || rTimeP >= lTimeP)) {
            if (isMounted) setProfile(rProfile);
            safeStorage.set('wt_profile', { data: rProfile, updatedAt: rTimeP || Date.now() });
          } else if (lProfileObj && lTimeP > rTimeP) {
            await setDoc(profileRef, lProfile, { merge: true });
          }

          const recordsRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'health_records');
          const rSnap = await getDocs(recordsRef);
          const rRecords = {};
          
          rSnap.forEach(d => { 
            const id = d.id;
            const data = d.data();
            if (id.length === 10) { 
              if (!rRecords[id] || (data._updatedAt || 0) > (rRecords[id]._updatedAt || 0)) rRecords[id] = data;
            } else if (id.length === 7) { 
              Object.keys(data).forEach(key => {
                if (key.length === 10) { 
                  if (!rRecords[key] || (data[key]._updatedAt || 0) > (rRecords[key]._updatedAt || 0)) rRecords[key] = data[key];
                }
              });
            }
          });

          const lRecords = safeStorage.get('wt_records') || {};
          const mergedRecords = { ...lRecords };
          const needsUpload = [];

          const allDates = new Set([...Object.keys(rRecords), ...Object.keys(lRecords)]);
          allDates.forEach(date => {
            const rData = rRecords[date];
            const lData = lRecords[date];
            const rTime = rData?._updatedAt || 0;
            const lTime = lData?._updatedAt || 0;

            if (rData && !lData) mergedRecords[date] = rData; 
            else if (!rData && lData) { mergedRecords[date] = lData; needsUpload.push({ date, data: lData }); }
            else if (rData && lData) {
              if (rTime >= lTime) mergedRecords[date] = rData;
              else { mergedRecords[date] = lData; needsUpload.push({ date, data: lData }); }
            }
          });

          if (isMounted) setRecords(mergedRecords);
          safeStorage.set('wt_records', mergedRecords);

          if (needsUpload.length > 0) {
            const uploadsByMonth = {};
            for (const item of needsUpload) {
              const monthStr = item.date.substring(0, 7); 
              if (!uploadsByMonth[monthStr]) uploadsByMonth[monthStr] = {};
              uploadsByMonth[monthStr][item.date] = item.data;
              if (!uploadsByMonth[monthStr]._updatedAt || item.data._updatedAt > (uploadsByMonth[monthStr]._updatedAt || 0)) {
                uploadsByMonth[monthStr]._updatedAt = item.data._updatedAt;
              }
            }
            for (const [monthStr, monthData] of Object.entries(uploadsByMonth)) {
              await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'health_records', monthStr), monthData, { merge: true });
            }
          }

          if (unsubProfileRef.current) unsubProfileRef.current();
          unsubProfileRef.current = onSnapshot(profileRef, (snap) => {
            if (snap.exists() && isMounted) {
              const d = snap.data();
              setProfile(p => {
                if ((d._updatedAt || 0) >= (p._updatedAt || 0)) {
                  safeStorage.set('wt_profile', { data: d, updatedAt: d._updatedAt || Date.now() });
                  return d;
                }
                return p;
              });
            }
          });

          if (unsubRecordsRef.current) unsubRecordsRef.current();
          unsubRecordsRef.current = onSnapshot(recordsRef, (snap) => {
            if (!isMounted) return;
            const newRecs = {};
            snap.forEach(d => { 
              const id = d.id;
              const data = d.data();
              if (id.length === 10) {
                if (!newRecs[id] || (data._updatedAt || 0) > (newRecs[id]._updatedAt || 0)) newRecs[id] = data;
              } else if (id.length === 7) {
                Object.keys(data).forEach(key => {
                  if (key.length === 10) {
                    if (!newRecs[key] || (data[key]._updatedAt || 0) > (newRecs[key]._updatedAt || 0)) newRecs[key] = data[key];
                  }
                });
              }
            });
            
            setRecords(prev => {
              let changed = false;
              const next = { ...prev };
              Object.keys(newRecs).forEach(date => {
                if ((newRecs[date]?._updatedAt || 0) >= (next[date]?._updatedAt || 0)) { next[date] = newRecs[date]; changed = true; }
              });
              if (changed) safeStorage.set('wt_records', next);
              return changed ? next : prev;
            });
          });

        } catch(e) { console.error("Sync Error:", e); } 
        finally { if (isMounted) setIsSyncing(false); }
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfileRef.current) unsubProfileRef.current();
      if (unsubRecordsRef.current) unsubRecordsRef.current();
    };
  }, []);

  const updateProfile = async (newProps) => {
    setProfile(prev => {
      const updated = typeof newProps === 'function' ? newProps(prev) : { ...prev, ...newProps };
      const now = Date.now();
      updated._updatedAt = now;
      safeStorage.set('wt_profile', { data: updated, updatedAt: now });

      if (user) {
        setIsSyncing(true);
        setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), updated, { merge: true })
          .catch(()=>{})
          .finally(() => setIsSyncing(false));
      }
      return updated;
    });
  };

  const handleSettingChange = (newProps) => {
    setDraftProfile(prev => {
      const current = prev || profile;
      return { ...current, ...newProps };
    });
  };

  const handleSaveSettings = () => {
    if (draftProfile) {
      updateProfile(draftProfile);
      setDraftProfile(null);
    }
  };

  const handleTabClick = (tab) => {
    if (tab === 'settings') { setShowSettingsDot(false); safeStorage.set('wt_settings_viewed', true); }
    if (activeTab === 'settings' && isProfileDirty && tab !== 'settings') {
      setModalState({ view: 'confirm_leave', pendingTab: tab });
    } else {
      setActiveTab(tab);
    }
  };

  const updateRecords = async (operateDate, updatedDayData) => {
    const now = Date.now();
    const finalData = { ...updatedDayData, _updatedAt: now };

    setRecords(prev => {
      const next = { ...prev, [operateDate]: finalData };
      safeStorage.set('wt_records', next);
      return next;
    });

    if (user) {
      setIsSyncing(true);
      const monthStr = operateDate.substring(0, 7);
      setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'health_records', monthStr), {
        [operateDate]: finalData,
        _updatedAt: now
      }, { merge: true })
        .catch(()=>{})
        .finally(() => setIsSyncing(false));
    }
  };

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

  const handleSaveData = (category, dataObj) => {
    const operateDate = modalState?.dateStr || targetDate;
    const currentDayData = records[operateDate] || {};
    const arr = getArrayData(currentDayData, category);
    let newArr;

    if (modalState?.item?.id) {
      newArr = arr.map(item => item.id === modalState.item.id ? { ...item, ...dataObj } : item);
    } else {
      newArr = [...arr, { id: Date.now().toString(), time: getTimeString(), ...dataObj }];
    }
    
    updateRecords(operateDate, { ...currentDayData, [category]: newArr });
    setModalState(null);
  };

  const handleDeleteData = (category, id) => {
    const operateDate = modalState?.dateStr || targetDate;
    const currentDayData = records[operateDate] || {};
    const arr = getArrayData(currentDayData, category);
    const newArr = arr.filter(item => item.id !== id);
    
    updateRecords(operateDate, { ...currentDayData, [category]: newArr });
    if (newArr.length === 0) setModalState(null);
  };

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
    if(prevArr.length > 0) { prevWeight = prevArr[prevArr.length - 1].value; break; }
  }
  if (latestWeight && prevWeight) { weightChange = (latestWeight - prevWeight).toFixed(2); }

  let tdee = 0;
  let bmr = 0;
  const calcAge = activeProfile.birthYear ? new Date().getFullYear() - Number(activeProfile.birthYear) : 25;
  const calcHeight = activeProfile.height ? Number(activeProfile.height) : 160;
  const calcWeight = latestWeight ? Number(latestWeight) : 60;
  const calcGender = activeProfile.gender || 'female';

  let rawBmr = 10 * calcWeight + 6.25 * calcHeight - 5 * calcAge;
  rawBmr += (calcGender === 'male' ? 5 : -161);
  bmr = Math.max(500, Math.round(rawBmr)); // 提供合理底限

  if (activeProfile.customTDEE && Number(activeProfile.customTDEE) > 0) {
    tdee = Number(activeProfile.customTDEE);
    tdee = Math.max(800, Math.min(6000, tdee));
  } else {
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
    tdee = Math.max(800, Math.min(6000, tdee));
  }

  const renderHome = () => {
    const tdeeTitle = activeProfile.showTDEE !== false ? ' / TDEE' : '';
    const bmrTitle = activeProfile.showBMR === true ? ' / BMR' : '';
    const titlesStr = `INTAKE${tdeeTitle}${bmrTitle}`;

    const valTdee = activeProfile.showTDEE !== false ? ` / ${tdee}` : '';
    const valBmr = activeProfile.showBMR === true ? ` / ${bmr}` : '';

    return (
      <div className={`p-6 space-y-4 animate-in fade-in duration-500 ${s('pb-28', 'pb-32')}`}>
        <div className={`flex items-center justify-between bg-white dark:bg-[#1E1E1E] ${s('p-3.5', 'p-4')} rounded-3xl border border-[#F0ECE7] dark:border-[#333333] shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}>
          <button onClick={() => setModalState({ view: 'datepicker' })} className={`flex items-center gap-2.5 text-[#5C5C5C] dark:text-[#D1D1D1] tracking-wider active:scale-95 transition-transform ${s('text-sm font-medium', 'text-[16px] font-bold gap-3')}`}>
            <div className={`${s('w-8 h-8', 'w-10 h-10')} rounded-xl bg-[#F9F8F6] dark:bg-[#2A2A2A] flex items-center justify-center border border-[#E8E4DF] dark:border-[#3A3A3A] shrink-0`}>
              <CalendarIcon className={`${s('w-4 h-4', 'w-5 h-5')} text-[#8C8477] dark:text-[#A1988B] stroke-[1.5]`} />
            </div>
            {targetDate === todayStr ? '今天' : targetDate.replace(/-/g, '.')}
          </button>
          {targetDate !== todayStr && (
            <button onClick={() => setTargetDate(todayStr)} className={`${s('text-[10px] px-3 py-1.5', 'text-[13px] px-4 py-2 font-bold')} tracking-widest bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl text-[#8C8477] dark:text-[#A1988B] active:scale-95 transition-all font-medium shrink-0`}>回今日</button>
          )}
        </div>

        <div className={`bg-[#EFECE7] dark:bg-[#252525] rounded-3xl ${s('p-6', 'p-6')} shadow-sm border border-[#E8E4DF] dark:border-[#3A3A3A] relative overflow-hidden`}>
          <div className="relative z-10 flex justify-between items-start">
            <div className="min-w-0">
              <p className={`text-[#8C8477] dark:text-[#A1988B] ${s('text-[9px] mb-1', 'text-[12px] font-bold mb-1.5')} tracking-widest font-medium`}>WEIGHT</p>
              <div className={`flex items-baseline ${s('gap-1', 'gap-1.5')}`}>
                <span className={`font-light text-[#4A4A4A] dark:text-[#E8E8E8] tracking-tight text-[clamp(2.5rem,12vw,3rem)] ${s('', 'text-[clamp(3rem,15vw,4rem)]')}`}>{latestWeight || '--'}</span>
                <span className={`${s('text-sm', 'text-lg font-medium')} text-[#8C8477] dark:text-[#A1988B] font-light`}>kg</span>
              </div>
              {weightChange && (
                <div className={`inline-flex items-center ${s('mt-3 px-3 py-1 text-[10px]', 'mt-3 px-3 py-1.5 text-[12px] font-bold')} rounded-full font-medium bg-white/50 dark:bg-[#333333]/50 text-[#7A756D] dark:text-[#AAAAAA] backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}>
                  較前次 {Number(weightChange) > 0 ? '+' : ''}{weightChange} kg
                </div>
              )}
            </div>
          </div>
          <div className={`mt-6 ${s('pt-4', 'pt-5')} border-t border-[#D6D0C4]/40 dark:border-[#4A4A4A]/40 relative z-10`}>
            <p className={`text-[#8C8477] dark:text-[#A1988B] ${s('text-[9px] mb-1.5', 'text-[12px] font-bold mb-2')} tracking-widest`}>{titlesStr}</p>
            <div className={`flex items-end ${s('gap-1', 'gap-1.5')}`}>
              <span className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] leading-none text-[clamp(1.125rem,6vw,1.875rem)] ${s('', 'font-bold text-[clamp(1.5rem,8vw,2.25rem)]')}`}>{totalIntake}</span>
              <span className={`text-[#A89F91] dark:text-[#888888] font-light ${s('text-sm pb-[1px]', 'text-[16px] font-medium pb-[2px]')} leading-none whitespace-nowrap`}>{valTdee}{valBmr} kcal</span>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-2 ${s('gap-3', 'gap-3')}`}>
          {[
            { id: 'weight', title: '體重', icon: WeightScaleIcon, val: arrWeight.length ? `已記 ${arrWeight[arrWeight.length - 1].value} kg` : '未紀錄', bg: 'bg-[#F5F2EB] dark:bg-[#2C2A25]', color: 'text-[#A89F91]' },
            { id: 'water', title: '飲水', icon: Droplets, val: totalWater ? `${totalWater} ml` : '未紀錄', bg: 'bg-[#EDF1F4] dark:bg-[#1E262B]', color: 'text-[#93A3B1]' },
            { id: 'diet', title: '飲食', icon: Utensils, val: arrDiet.length ? `已記 ${arrDiet.length} 筆` : '未紀錄', bg: 'bg-[#EEF2ED] dark:bg-[#222B21]', color: 'text-[#9AA899]' },
            { id: 'exercise', title: '運動', icon: Flame, val: arrEx.length ? `已記 ${arrEx.length} 筆` : '未紀錄', bg: 'bg-[#F7EFEA] dark:bg-[#2D2520]', color: 'text-[#C4A495]' }
          ].map(card => (
            <button key={card.id} onClick={() => openCategoryFlow(card.id)} className={`bg-white dark:bg-[#1E1E1E] ${s('p-4 gap-3', 'p-4 sm:p-5 gap-3')} rounded-3xl border border-[#F0ECE7] dark:border-[#333333] flex flex-col items-start active:scale-95 transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.01)] min-w-0`}>
              <div className={`${s('w-9 h-9', 'w-11 h-11')} rounded-2xl ${card.bg} flex items-center justify-center shrink-0`}>
                <card.icon className={`${s('w-4 h-4', 'w-6 h-6')} ${card.color} stroke-[1.5]`} />
              </div>
              <div className="min-w-0 text-left w-full">
                <h3 className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest ${s('text-[11px]', 'text-[14px] font-bold')} truncate`}>{card.title}</h3>
                <p className={`${s('text-[10px] mt-1 font-light', 'text-[12px] mt-1 font-medium')} text-[#C2BCB6] dark:text-[#666666] tracking-wide truncate`}>{card.val}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderModals = () => {
    if (!modalState) return null;
    const { view, category, item, dateStr } = modalState;
    const operateDate = dateStr || targetDate; 
    const targetDataForModal = records[operateDate] || {};
    
    const isDiet = category === 'diet';
    const isEx = category === 'exercise';

    const ModalLayout = ({ title, onBack, children }) => (
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#4A4A4A]/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setModalState(null)} 
      >
        <div 
          className={`bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] ${s('p-6', 'p-5 sm:p-6')} shadow-2xl animate-in slide-in-from-bottom-8 border border-[#F0ECE7] dark:border-[#333333] max-h-[90vh] flex flex-col relative`}
          onClick={(e) => e.stopPropagation()} 
        >
          <div className={`flex justify-between items-center ${s('mb-6 pb-2', 'mb-5 pb-2')} sticky top-0 bg-white dark:bg-[#1E1E1E] z-10 shrink-0`}>
            <div className={`flex items-center ${s('gap-2', 'gap-3')} min-w-0`}>
              {onBack && <button onClick={onBack} className="p-1.5 -ml-1.5 text-[#A89F91] dark:text-[#888888] active:scale-90 shrink-0"><ChevronLeft className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5]`}/></button>}
              <h2 className={`${s('text-[13px] font-medium', 'text-[16px] font-bold')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest truncate`}>{title}</h2>
            </div>
            <button onClick={() => setModalState(null)} className="p-1.5 bg-[#F9F8F6] dark:bg-[#2A2A2A] rounded-full text-[#A89F91] dark:text-[#888888] active:scale-90 shrink-0"><X className={`${s('w-4 h-4', 'w-5 h-5')}`} /></button>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 pb-6">
            {children}
          </div>
        </div>
      </div>
    );

    if (view === 'confirm_leave') {
      return (
        <ModalLayout title="尚未儲存變更">
          <p className={`${s('text-xs', 'text-sm')} text-[#8C8477] dark:text-[#A1988B] mb-6 text-center tracking-wide`}>有未儲存的變更，是否儲存？</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => { handleSaveSettings(); setActiveTab(modalState.pendingTab); setModalState(null); }} className={`w-full bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-xl font-bold tracking-widest active:scale-95 transition-all ${s('py-3.5 text-sm', 'py-4 text-[15px]')}`}>儲存</button>
            <button onClick={() => { setDraftProfile(null); setActiveTab(modalState.pendingTab); setModalState(null); }} className={`w-full bg-[#EFECE7] dark:bg-[#333333] text-[#C78D87] dark:text-[#B86C65] rounded-xl font-bold tracking-widest active:scale-95 transition-all ${s('py-3.5 text-sm', 'py-4 text-[15px]')}`}>捨棄</button>
            <button onClick={() => setModalState(null)} className={`w-full bg-transparent border border-[#E8E4DF] dark:border-[#3A3A3A] text-[#8C8477] dark:text-[#A1988B] rounded-xl font-bold tracking-widest active:scale-95 transition-all ${s('py-3.5 text-sm', 'py-4 text-[15px]')}`}>取消</button>
          </div>
        </ModalLayout>
      );
    }

    if (view === 'datepicker') {
      return (
        <ModalLayout title="選擇日期">
          <DashboardDatePicker initialDate={targetDate} onSelect={(d) => { setTargetDate(d); setModalState(null); }} isLarge={isLarge} />
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
                isLarge={isLarge}
              />
            ))}
          </div>
          <button onClick={() => setModalState({ view: (isDiet || isEx) ? 'select' : 'calc', category, dateStr: operateDate })} className={`absolute bottom-6 right-6 ${s('w-14 h-14', 'w-16 h-16')} bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(140,132,119,0.4)] active:scale-90 transition-transform`}>
            <Plus className={`${s('w-6 h-6 stroke-[1.5]', 'w-8 h-8 stroke-[2]')}`} />
          </button>
        </ModalLayout>
      );
    }

    if (view === 'select') {
      const cards = isDiet ? activeProfile.dietCards : activeProfile.exerciseCards;
      const colorClass = isDiet ? 'text-[#9AA899] dark:text-[#9AA899] bg-[#EEF2ED] dark:bg-[#222B21] border-[#D6E0D5] dark:border-[#2C3B2A]' : 'text-[#C4A495] dark:text-[#C4A495] bg-[#F7EFEA] dark:bg-[#2D2520] border-[#E8D9D1] dark:border-[#3D302A]';
      return (
        <ModalLayout title={`選擇${isDiet ? '飲食' : '運動'}項目`} onBack={() => getArrayData(targetDataForModal, category).length > 0 && setModalState({view: 'list', category, dateStr: operateDate})}>
          <div className={`grid grid-cols-3 ${s('gap-3', 'gap-2 sm:gap-3')}`}>
            {cards.map(card => (
              <button key={card.id} onClick={() => setModalState({ view: 'calc', category, item: { [isDiet?'content':'type']: card.name, calories: card.defaultCalories }, dateStr: operateDate })} className={`flex flex-col items-center justify-center ${s('p-4 gap-2', 'p-3 gap-2')} rounded-2xl border bg-white dark:bg-[#1E1E1E] active:bg-gray-50 dark:active:bg-[#2A2A2A] transition-colors shadow-sm min-w-0 ${colorClass.split(' ')[2]}`}>
                <DynamicIcon name={card.icon} className={`${s('w-6 h-6', 'w-7 h-7')} stroke-[1.5] shrink-0 ${colorClass.split(' ')[0]}`} />
                <span className={`${s('text-[10px]', 'text-[12px] font-bold')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1] truncate w-full text-center`}>{card.name}</span>
              </button>
            ))}
            <button onClick={() => setModalState({ view: 'new_card', category, dateStr: operateDate })} className={`flex flex-col items-center justify-center ${s('p-4 gap-2 border', 'p-3 gap-2 border-2')} rounded-2xl border-dashed border-[#D6D0C4] dark:border-[#4A4A4A] bg-white dark:bg-[#1E1E1E] text-[#A89F91] dark:text-[#888888] active:bg-[#F9F8F6] dark:active:bg-[#2A2A2A] min-w-0`}>
              <Plus className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5] shrink-0`} />
              <span className={`${s('text-[9px]', 'text-[12px] font-bold')} tracking-widest truncate w-full text-center`}>新增</span>
            </button>
          </div>
        </ModalLayout>
      );
    }

    if (view === 'calc') {
      return (
        <ModalLayout title={item?.id ? '修改紀錄' : '新增紀錄'} onBack={() => setModalState({view: (isDiet || isEx) && !item?.id ? 'select' : 'list', category, dateStr: operateDate})}>
          <RecordEditor 
            category={category} item={item} isDiet={isDiet} isEx={isEx} isLarge={isLarge}
            latestWeight={latestWeight} onSave={(dataToSave) => handleSaveData(category, dataToSave)} profile={activeProfile}
          />
        </ModalLayout>
      );
    }

    if (view === 'new_card') {
      const availableIcons = isDiet ? ['Coffee','Apple','Pizza','Carrot','Fish','Beef','Utensils'] : ['Activity','Dumbbell','Flame','Bike','Shuttlecock','HeartPulse','Target'];
      const namePlaceholder = isDiet ? '例如：拿鐵' : '例如：跳繩';
      return (
        <ModalLayout title="新增專屬卡片" onBack={() => setModalState({view: 'select', category, dateStr: operateDate})}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const name = e.target.cardName.value;
            const icon = e.target.iconSelect.value;
            const defCals = e.target.defaultCalories.value;
            if(!name) return;
            const newCard = { id: Date.now().toString(), name, icon };
            if (defCals) newCard.defaultCalories = defCals;
            updateProfile(p => ({ ...p, [isDiet ? 'dietCards' : 'exerciseCards']: [...p[isDiet ? 'dietCards' : 'exerciseCards'], newCard] }));
            setModalState({view: 'select', category, dateStr: operateDate});
          }} className={s('space-y-5', 'space-y-5')}>
            <div>
              <label className={`${s('text-[10px] mb-2', 'text-[12px] font-bold mb-2')} tracking-widest text-[#8C8477] dark:text-[#A1988B] block`}>名稱</label>
              <input name="cardName" type="text" placeholder={namePlaceholder} required className={`w-full ${s('p-3.5 text-sm', 'p-3 text-[16px] font-medium')} bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1]`} />
            </div>
            <div>
              <label className={`${s('text-[10px] mb-2', 'text-[12px] font-bold mb-2')} tracking-widest text-[#8C8477] dark:text-[#A1988B] block`}>預設熱量 (選填)</label>
              <input name="defaultCalories" type="number" placeholder="例如：300" className={`w-full ${s('p-3.5 text-sm', 'p-3 text-[16px] font-medium')} bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1]`} />
            </div>
            <div>
              <label className={`${s('text-[10px] mb-2', 'text-[12px] font-bold mb-2')} tracking-widest text-[#8C8477] dark:text-[#A1988B] block`}>圖標</label>
              <div className={`grid grid-cols-4 ${s('gap-2', 'gap-2')}`}>
                {availableIcons.map((ic, i) => (
                  <label key={ic} className="cursor-pointer">
                    <input type="radio" name="iconSelect" value={ic} defaultChecked={i===0} className="peer hidden" />
                    <div className={`flex justify-center ${s('py-3.5', 'py-3.5')} border border-[#F0ECE7] dark:border-[#333333] rounded-xl text-[#C2BCB6] dark:text-[#666666] peer-checked:border-[#8C8477] peer-checked:dark:border-[#A1988B] peer-checked:text-[#8C8477] peer-checked:dark:text-[#A1988B] peer-checked:bg-[#F5F2EB] peer-checked:dark:bg-[#2C2A25] transition-all`}>
                      <DynamicIcon name={ic} className={`${s('w-5 h-5', 'w-6 h-6')} stroke-[1.5]`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className={`w-full ${s('py-4 text-xs mt-4', 'py-3.5 text-[15px] font-bold mt-5')} bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-xl font-medium tracking-widest active:scale-95`}>儲存卡片</button>
          </form>
        </ModalLayout>
      );
    }
  };

  return (
    <div className={`max-w-md mx-auto min-h-[100dvh] flex flex-col bg-[#F7F5F2] dark:bg-[#121212] font-sans text-[#4A4A4A] dark:text-[#E8E8E8] shadow-2xl relative ${isDark ? 'dark' : ''}`}>
      <header className="bg-[#F7F5F2]/90 dark:bg-[#121212]/90 backdrop-blur-md px-6 py-4 z-10 flex justify-center border-b border-[#EBE8E3] dark:border-[#2A2A2A] sticky top-0">
        <div className={`${s('text-[11px] font-medium', 'text-[14px] font-bold')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-[0.2em] uppercase flex items-center gap-2`}>
          {activeTab === 'home' && 'Dashboard'}
          {activeTab === 'calendar' && 'Calendar'}
          {activeTab === 'trend' && 'Analytics'}
          {activeTab === 'settings' && 'Profile'}
          {isSyncing ? <RefreshCw className={`${s('w-3 h-3', 'w-4 h-4')} text-[#C4A495] animate-spin`} /> : user && !user.isAnonymous ? <Cloud className={`${s('w-3 h-3', 'w-4 h-4')} text-[#9AA899]`} /> : <CloudOff className={`${s('w-3 h-3', 'w-4 h-4')} text-[#C2BCB6] dark:text-[#666666]`} />}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'calendar' && <CalendarView records={records} viewMode={modalState?.category || 'weight'} onSelectDate={(d, mode) => { openCategoryFlow(mode, d); }} isLarge={isLarge} />}
        {activeTab === 'trend' && <TrendChart records={records} isLarge={isLarge} />}
        {activeTab === 'settings' && <SettingsView profile={activeProfile} onChangeSetting={handleSettingChange} onSave={handleSaveSettings} isDirty={isProfileDirty} user={user} auth={auth} isLarge={isLarge} />}
      </main>

      <nav className={`bg-[#F7F5F2]/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-[#EBE8E3] dark:border-[#2A2A2A] px-2 ${s('pt-2 pb-6', 'pt-2.5 pb-8')} flex justify-around items-center fixed bottom-0 w-full max-w-md z-40`}>
        <NavButton active={activeTab === 'home'} onClick={() => handleTabClick('home')} icon={Home} label="首頁" isLarge={isLarge} />
        <NavButton active={activeTab === 'calendar'} onClick={() => handleTabClick('calendar')} icon={CalendarIcon} label="月曆" isLarge={isLarge} />
        <NavButton active={activeTab === 'trend'} onClick={() => handleTabClick('trend')} icon={TrendingUp} label="趨勢" isLarge={isLarge} />
        <NavButton active={activeTab === 'settings'} onClick={() => handleTabClick('settings')} icon={Settings} label="設定" isLarge={isLarge} hasDot={showSettingsDot} />
      </nav>

      {renderModals()}
    </div>
  );
}

// 底部按鈕
function NavButton({ active, onClick, icon: Icon, label, isLarge, hasDot }) {
  const s = (n, l) => isLarge ? l : n;
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center ${s('gap-1 p-2 w-16', 'gap-1 p-2 w-[70px]')} bg-transparent border-none transition-all duration-300 ${active ? 'text-[#8C8477] dark:text-[#A1988B] -translate-y-1' : 'text-[#C2BCB6] dark:text-[#666666] hover:text-[#A89F91] dark:hover:text-[#888888]'}`}>
      {hasDot && <div className={`absolute ${s('top-1.5 right-3', 'top-1.5 right-4')} w-[9px] h-[9px] bg-[#B86C65] rounded-full border-[1.5px] border-[#F7F5F2] dark:border-[#121212] z-10 animate-pulse`} />}
      <Icon className={`${s('w-[18px] h-[18px]', 'w-6 h-6')} ${active ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
      <span className={`${s('text-[9px] font-medium', 'text-[11px] font-bold')} tracking-widest m-0`}>{label}</span>
      <div className={`${s('w-1 h-1 mt-0.5', 'w-1.5 h-1.5 mt-1')} rounded-full bg-[#8C8477] dark:bg-[#A1988B] transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
    </button>
  );
}

// --- 月曆元件 ---
function CalendarView({ records, viewMode: initialMode, onSelectDate, isLarge }) {
  const s = (n, l) => isLarge ? l : n;
  const [viewMode, setViewMode] = useState(initialMode);
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const swipeContainerRef = useRef(null);

  const shiftMonth = (delta) => { setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)); };

  useEffect(() => {
    const el = swipeContainerRef.current;
    if (!el) return;
    
    let startX = 0, startY = 0;
    let lock = null;
    let dx = 0;

    const onTouchStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; lock = null; dx = 0; el.style.transition = 'none'; };
    const onTouchMove = (e) => {
      const currentX = e.touches[0].clientX; const currentY = e.touches[0].clientY; dx = currentX - startX; const dy = currentY - startY;
      if (!lock) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) lock = 'horizontal';
        else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) lock = 'vertical';
      }
      if (lock === 'horizontal') { if (e.cancelable) e.preventDefault(); el.style.transform = `translateX(calc(-40% + ${dx}px))`; }
    };
    const onTouchEnd = () => {
      if (lock === 'horizontal') {
        el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        if (dx > 60) { el.style.transform = `translateX(-20%)`; setTimeout(() => { el.style.transition = 'none'; el.style.transform = `translateX(-40%)`; shiftMonth(-1); }, 300); } 
        else if (dx < -60) { el.style.transform = `translateX(-60%)`; setTimeout(() => { el.style.transition = 'none'; el.style.transform = `translateX(-40%)`; shiftMonth(1); }, 300); } 
        else { el.style.transform = `translateX(-40%)`; }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false }); el.addEventListener('touchmove', onTouchMove, { passive: false }); el.addEventListener('touchend', onTouchEnd); el.addEventListener('touchcancel', onTouchEnd);
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd); el.removeEventListener('touchcancel', onTouchEnd); };
  }, []);

  const monthsData = React.useMemo(() => {
    return [-2, -1, 0, 1, 2].map(offset => {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
      const year = d.getFullYear(); const month = d.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay();
      const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(year, month, i + 1)));
      return { id: `${year}-${month}`, year, month, days };
    });
  }, [currentMonth]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  return (
    <div className={`p-6 animate-in fade-in duration-500 overflow-hidden ${s('pb-28', 'pb-32')}`}>
      <div className="flex border-b border-[#E8E4DF] dark:border-[#3A3A3A] mb-6">
        {[{ id: 'weight', label: '體重' }, { id: 'diet', label: '飲食' }, { id: 'exercise', label: '運動' }].map(mode => (
          <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`flex-1 ${s('pb-2 text-[10px]', 'pb-3 text-[13px]')} tracking-widest transition-all relative ${viewMode === mode.id ? `text-[#8C8477] dark:text-[#A1988B] ${s('font-medium', 'font-bold')}` : `text-[#C2BCB6] dark:text-[#666666] ${s('font-light', 'font-medium')}`}`}>
            {mode.label}
            {viewMode === mode.id && <div className={`absolute bottom-0 left-0 w-full border-[#8C8477] dark:border-[#A1988B] ${s('border-b-[2px]', 'border-b-[3px]')}`} />}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-5 px-1">
        <button onClick={() => shiftMonth(-1)} className={`${s('p-1.5', 'p-1.5')} hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-full text-[#8C8477] dark:text-[#A1988B] active:scale-90 transition-transform`}><ChevronLeft className={s('w-4 h-4', 'w-5 h-5')} /></button>
        <h2 className={`${s('text-xs font-medium', 'text-[15px] font-bold')} tracking-[0.2em] text-[#5C5C5C] dark:text-[#D1D1D1]`}>{year} . {String(month + 1).padStart(2, '0')}</h2>
        <button onClick={() => shiftMonth(1)} className={`${s('p-1.5', 'p-1.5')} hover:bg-[#EFECE7] dark:hover:bg-[#333333] rounded-full text-[#8C8477] dark:text-[#A1988B] active:scale-90 transition-transform`}><ChevronRight className={s('w-4 h-4', 'w-5 h-5')} /></button>
      </div>

      <div className="w-full relative">
        <div className={`grid grid-cols-7 ${s('gap-1.5', 'gap-1')} mb-2`}>
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className={`text-center tracking-widest text-[#C2BCB6] dark:text-[#666666] ${s('text-[9px] font-medium', 'text-[11px] font-bold')}`}>{d}</div>)}
        </div>

        <div className="-mr-6">
          <div ref={swipeContainerRef} className="flex w-[500%] will-change-transform touch-pan-y" style={{ transform: 'translateX(-40%)' }}>
            {monthsData.map((mData) => (
              <div key={mData.id} className="w-1/5 shrink-0 pr-6">
                <div className={`grid grid-cols-7 ${s('gap-1.5', 'gap-1')}`}>
                  {mData.days.map((date, idx) => {
                    const heightClass = s('h-[3.8rem]', 'h-[4.2rem]');
                    if (!date) return <div key={`e-${idx}`} className={`${heightClass} bg-transparent pointer-events-none`}></div>;
                    
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
                        const iconSize = s("5", "7");
                        const strVal = String(latestW);
                        const mainFontSize = strVal.length >= 5 ? s('8.5px', '10.5px') : s('11px', '14px');

                        if (diff !== null) {
                          const nDiff = Number(diff);
                          const diffStr = Math.abs(nDiff).toFixed(2);
                          const diffLen = diffStr.length; 
                          const diffFontSize = diffLen >= 5 ? s('7.5px', '8.5px') : s('8.5px', '10px');

                          if (nDiff > 0) diffEl = <span style={{ fontSize: diffFontSize }} className={`mt-[2px] text-[#9AA899] font-bold flex items-center justify-center gap-[1px] whitespace-nowrap tracking-tighter`}><svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M12 3L22 20H2L12 3Z"/></svg><span>{diffStr}</span></span>;
                          else if (nDiff < 0) diffEl = <span style={{ fontSize: diffFontSize }} className={`mt-[2px] text-[#C78D87] dark:text-[#B86C65] font-bold flex items-center justify-center gap-[1px] whitespace-nowrap tracking-tighter`}><svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M12 21L2 4H22L12 21Z"/></svg><span>{diffStr}</span></span>;
                          else diffEl = <span style={{ fontSize: diffFontSize }} className={`mt-[2px] font-medium text-[#C2BCB6] dark:text-[#666666] text-center whitespace-nowrap tracking-tighter`}>0.00</span>;
                        }
                        cellContent = <div className="flex flex-col items-center justify-center min-w-0"><span style={{ fontSize: mainFontSize }} className={`font-bold text-[#5C5C5C] dark:text-[#D1D1D1] leading-none text-center whitespace-nowrap tracking-tighter`}>{latestW}</span>{diffEl}</div>;
                      } else if (viewMode === 'diet') {
                        const cals = arr.reduce((s, a) => s + (Number(a.calories ?? a.value)||0), 0);
                        const calsLen = String(cals).length;
                        const calsFontSize = calsLen >= 4 ? s('9px', '11px') : s('10px', '12px');
                        cellContent = <div className="flex justify-center min-w-0"><span style={{ fontSize: calsFontSize }} className={`font-bold text-[#9AA899] text-center whitespace-nowrap tracking-tighter`}>{cals > 0 ? cals : '✓'}</span></div>;
                      } else if (viewMode === 'exercise') {
                        const cals = arr.reduce((s, a) => s + (Number(a.calories ?? a.value)||0), 0);
                        const calsLen = String(cals).length;
                        const calsFontSize = calsLen >= 4 ? s('9px', '11px') : s('10px', '12px');
                        cellContent = <div className="flex justify-center min-w-0"><span style={{ fontSize: calsFontSize }} className={`font-bold text-[#C4A495] text-center whitespace-nowrap tracking-tighter`}>{cals > 0 ? cals : '✓'}</span></div>;
                      }
                    }

                    return (
                      <button key={dStr} onClick={() => onSelectDate(dStr, viewMode)} className={`${heightClass} ${s('rounded-[10px] p-1', 'rounded-[12px] p-1.5')} flex flex-col items-center transition-colors border active:scale-95 min-w-0 overflow-hidden ${isToday ? 'bg-[#F9F8F6] dark:bg-[#2A2A2A] border-[#D6D0C4] dark:border-[#4A4A4A]' : 'bg-white dark:bg-[#1E1E1E] border-[#F0ECE7] dark:border-[#333333]'}`}>
                        <span className={`${s('text-[8px] mb-1 font-medium', 'text-[11px] mb-1 font-bold')} ${isToday ? 'text-[#8C8477] dark:text-[#A1988B]' : 'text-[#A89F91] dark:text-[#888888]'} shrink-0`}>{date.getDate()}</span>
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
      <p className={`text-center text-[#C2BCB6] dark:text-[#666666] tracking-widest ${s('text-[9px] mt-6 font-light', 'text-[11px] mt-8 font-medium')}`}>點擊日期即可查看或編輯紀錄，左右滑動切換月份</p>
    </div>
  );
}

// --- 趨勢圖表 ---
function TrendChart({ records, isLarge }) {
  const s = (n, l) => isLarge ? l : n;
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
      <div className={`p-6 animate-in fade-in ${s('pb-28', 'pb-32')}`}>
        <TrendFilters range={range} setRange={setRange} isLarge={isLarge} />
        <div className={`text-center text-[#A89F91] dark:text-[#888888] ${s('mt-24', 'mt-28')}`}>
          <TrendingUp className={`${s('w-8 h-8', 'w-10 h-10')} mx-auto text-[#D6D0C4] dark:text-[#4A4A4A] mb-4 stroke-[1.5]`} />
          <p className={`tracking-widest ${s('font-medium text-[10px]', 'font-bold text-[12px]')}`}>資料不足</p>
          <p className={`${s('text-[9px]', 'text-[11px] font-medium')} mt-2 font-light`}>需要兩天以上的紀錄來產生趨勢線</p>
        </div>
      </div>
    );
  }

  const weights = weightData.map(d => d.weight);
  let minW = Math.floor(Math.min(...weights));
  let maxW = Math.ceil(Math.max(...weights));
  if (maxW === minW) { minW -= 1; maxW += 1; }
  if ((maxW - minW) % 2 !== 0) { maxW += 1; }

  const viewBoxWidth = 320; const viewBoxHeight = 180; const paddingX = s(20, 20); const paddingY = 25;
  const points = weightData.map((d, i) => ({
    x: paddingX + (i / (weightData.length - 1)) * (viewBoxWidth - paddingX * 2),
    y: viewBoxHeight - paddingY - ((d.weight - minW) / (maxW - minW)) * (viewBoxHeight - paddingY * 2),
    dateStr: d.date
  }));
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const xAxisLabels = [];
  let lastMonth = null;
  points.forEach(p => {
    const m = parseInt(p.dateStr.split('-')[1]);
    if (m !== lastMonth) { xAxisLabels.push({ x: p.x, label: `${m}月` }); lastMonth = m; }
  });

  return (
    <div className={`p-6 animate-in fade-in duration-500 flex flex-col gap-5 ${s('pb-28', 'pb-32')}`}>
      <TrendFilters range={range} setRange={setRange} isLarge={isLarge} />
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-5', 'p-5')}`}>
        <div className="flex justify-between items-end mb-6 px-1">
          <h2 className={`${s('text-[10px] font-medium', 'text-[12px] font-bold')} tracking-[0.2em] text-[#8C8477] dark:text-[#A1988B] uppercase`}>Weight Trend</h2>
          <span className={`${s('text-[9px] font-light', 'text-[11px] font-medium')} text-[#A89F91] dark:text-[#888888]`}>{weightData[0].date.replace(/-/g, '.')} ~ {weightData[weightData.length-1].date.replace(/-/g, '.')}</span>
        </div>
        <div className="w-full pb-2">
          <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-auto overflow-visible">
            {[0, 0.5, 1].map(r => {
              const y = paddingY + r * (viewBoxHeight - paddingY * 2);
              const val = Math.round(maxW - r * (maxW - minW));
              return (
                <g key={`y-${r}`}>
                  <line x1={paddingX} y1={y} x2={viewBoxWidth - paddingX} y2={y} className="stroke-[#F0ECE7] dark:stroke-[#333333]" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={paddingX - 8} y={y + 4} fontSize={s("8", "10")} className={`fill-[#C2BCB6] dark:fill-[#666666] ${s('font-light', 'font-medium')}`} textAnchor="end">{val}</text>
                </g>
              );
            })}
            {xAxisLabels.map((lbl, i) => (
              <g key={`x-${i}`}>
                <line x1={lbl.x} y1={paddingY} x2={lbl.x} y2={viewBoxHeight - paddingY} className="stroke-[#F9F8F6] dark:stroke-[#2A2A2A]" strokeWidth="1" />
                <text x={lbl.x} y={viewBoxHeight - paddingY + 18} fontSize={s("8", "10")} className={`fill-[#A89F91] dark:fill-[#888888] ${s('font-light', 'font-medium')}`} textAnchor="middle">{lbl.label}</text>
              </g>
            ))}
            <polyline points={polylinePoints} fill="none" stroke="#C4A495" strokeWidth={s("2", "2.5")} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const TrendFilters = ({ range, setRange, isLarge }) => {
  const s = (n, l) => isLarge ? l : n;
  return (
    <div className={`flex bg-white dark:bg-[#1E1E1E] rounded-2xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-1', 'p-1.5')}`}>
      {['1M', '3M', '6M', '12M', 'ALL'].map(r => (
        <button key={r} onClick={() => setRange(r)} className={`flex-1 tracking-widest rounded-xl transition-all min-w-0 truncate ${s('py-2 text-[9px] font-medium', 'py-2 text-[11px] font-bold')} ${range === r ? 'bg-[#F9F8F6] dark:bg-[#2A2A2A] text-[#8C8477] dark:text-[#A1988B] shadow-sm border border-[#E8E4DF] dark:border-[#3A3A3A]' : 'text-[#C2BCB6] dark:text-[#666666]'}`}>{r}</button>
      ))}
    </div>
  );
}

// --- 設定頁面 ---
function SettingsView({ profile, onChangeSetting, onSave, isDirty, user, auth, isLarge }) {
  const s = (n, l) => isLarge ? l : n;
  const themeMode = profile.themeMode || 'auto';
  return (
    <div className={`p-6 animate-in fade-in duration-500 ${s('space-y-5 pb-28', 'space-y-5 pb-32')}`}>
      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6 space-y-5', 'p-6 space-y-5')}`}>
        <h2 className={`${s('text-xs font-medium mb-4', 'text-[14px] font-bold mb-4')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest flex items-center gap-2`}><Settings className={`${s('w-4 h-4', 'w-5 h-5')} text-[#C2BCB6] dark:text-[#666666] stroke-[1.5]`} /> 個人資料設定</h2>
        <div className={`grid grid-cols-2 ${s('gap-4', 'gap-4')}`}>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>GENDER</label>
            <div className={`flex ${s('gap-2', 'gap-2')}`}>
              <button onClick={() => onChangeSetting({ gender: 'male' })} className={`flex-1 rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${profile.gender === 'male' ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]' : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'}`}>男</button>
              <button onClick={() => onChangeSetting({ gender: 'female' })} className={`flex-1 rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${profile.gender === 'female' ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]' : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'}`}>女</button>
            </div>
          </div>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>出生年份</label>
            <input type="number" placeholder="例如: 1990" value={profile.birthYear || ''} onChange={(e) => onChangeSetting({ birthYear: e.target.value })} className={`w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] text-center min-w-0 placeholder:text-[#C2BCB6] dark:placeholder:text-[#666666] ${s('p-2.5 text-xs', 'p-3 text-[14px] font-medium')}`} />
          </div>
        </div>
        <div className={`grid grid-cols-2 ${s('gap-4', 'gap-4')}`}>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>HEIGHT (cm)</label>
            <input type="number" value={profile.height || ''} onChange={(e) => onChangeSetting({ height: e.target.value })} className={`w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] text-center min-w-0 ${s('p-2.5 text-xs', 'p-3 text-[14px] font-medium')}`} />
          </div>
          <div className={s('space-y-2', 'space-y-2')}>
            <label className={`${s('text-[9px]', 'text-[11px] font-bold')} tracking-widest text-[#8C8477] dark:text-[#A1988B]`}>自訂 TDEE</label>
            <input type="number" placeholder="自動計算" value={profile.customTDEE || ''} onChange={(e) => onChangeSetting({ customTDEE: e.target.value })} className={`w-full bg-[#F9F8F6] dark:bg-[#2A2A2A] border border-[#E8E4DF] dark:border-[#3A3A3A] rounded-xl outline-none text-[#5C5C5C] dark:text-[#D1D1D1] text-center placeholder:text-[#C2BCB6] dark:placeholder:text-[#666666] min-w-0 ${s('p-2.5 text-xs', 'p-3 text-[14px] font-medium')}`} />
          </div>
        </div>
      </div>

      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6 space-y-5', 'p-6 space-y-5')}`}>
        <h2 className={`${s('text-xs font-medium mb-4', 'text-[14px] font-bold mb-4')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest flex items-center gap-2`}><Activity className={`${s('w-4 h-4', 'w-5 h-5')} text-[#C2BCB6] dark:text-[#666666] stroke-[1.5]`} /> 指標顯示設定</h2>
        
        <div className={`flex items-center justify-between bg-[#F9F8F6] dark:bg-[#2A2A2A] rounded-2xl ${s('p-4', 'p-5')} border border-[#E8E4DF] dark:border-[#3A3A3A]`}>
          <div className="min-w-0 flex-1 pr-4">
            <h3 className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest ${s('text-xs', 'text-[14px] font-bold')}`}>顯示 TDEE</h3>
            <p className={`${s('text-[10px] mt-1.5', 'text-[12px] mt-2')} text-[#A89F91] dark:text-[#888888] font-light leading-relaxed`}>
              每日總消耗 (Total Daily Energy Expenditure)。維持目前體重所需的總熱量，包含基礎代謝與活動消耗。
            </p>
          </div>
          <button onClick={() => onChangeSetting({ showTDEE: profile.showTDEE !== false ? false : true })} className={`relative rounded-full transition-colors duration-300 shrink-0 ${s('w-11 h-6', 'w-12 h-7')} ${profile.showTDEE !== false ? 'bg-[#8C8477] dark:bg-[#A1988B]' : 'bg-[#E8E4DF] dark:bg-[#4A4A4A]'}`}>
            <div className={`absolute bg-white dark:bg-[#D1D1D1] rounded-full transition-transform duration-300 ${s('top-1 left-1 w-4 h-4', 'top-1 left-1 w-5 h-5')} ${profile.showTDEE !== false ? s('translate-x-5', 'translate-x-5') : 'translate-x-0'}`} />
          </button>
        </div>

        <div className={`flex items-center justify-between bg-[#F9F8F6] dark:bg-[#2A2A2A] rounded-2xl ${s('p-4', 'p-5')} border border-[#E8E4DF] dark:border-[#3A3A3A]`}>
          <div className="min-w-0 flex-1 pr-4">
            <h3 className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest ${s('text-xs', 'text-[14px] font-bold')}`}>顯示 BMR</h3>
            <p className={`${s('text-[10px] mt-1.5', 'text-[12px] mt-2')} text-[#A89F91] dark:text-[#888888] font-light leading-relaxed`}>
              基礎代謝率 (Basal Metabolic Rate)。維持生命所需的最低熱量，即一整天不活動也會消耗的熱量。
            </p>
          </div>
          <button onClick={() => onChangeSetting({ showBMR: profile.showBMR === true ? false : true })} className={`relative rounded-full transition-colors duration-300 shrink-0 ${s('w-11 h-6', 'w-12 h-7')} ${profile.showBMR === true ? 'bg-[#8C8477] dark:bg-[#A1988B]' : 'bg-[#E8E4DF] dark:bg-[#4A4A4A]'}`}>
            <div className={`absolute bg-white dark:bg-[#D1D1D1] rounded-full transition-transform duration-300 ${s('top-1 left-1 w-4 h-4', 'top-1 left-1 w-5 h-5')} ${profile.showBMR === true ? s('translate-x-5', 'translate-x-5') : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6 space-y-4', 'p-6 space-y-4')}`}>
        <h2 className={`${s('text-xs font-medium mb-4', 'text-[14px] font-bold mb-4')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest flex items-center gap-2`}><MoonIcon className={`${s('w-4 h-4', 'w-5 h-5')} text-[#C2BCB6] dark:text-[#666666] stroke-[1.5]`} /> 外觀主題</h2>
        <div className={`grid grid-cols-3 ${s('gap-2', 'gap-2')}`}>
          <button onClick={() => onChangeSetting({ themeMode: 'light' })} className={`rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${themeMode === 'light' ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]' : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'}`}>亮色</button>
          <button onClick={() => onChangeSetting({ themeMode: 'dark' })} className={`rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${themeMode === 'dark' ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]' : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'}`}>夜間</button>
          <button onClick={() => onChangeSetting({ themeMode: 'auto' })} className={`rounded-xl border transition-all ${s('py-2.5 text-[11px]', 'py-3 text-[14px] font-medium')} ${themeMode === 'auto' ? 'bg-[#EFECE7] dark:bg-[#333333] border-[#D6D0C4] dark:border-[#4A4A4A] text-[#5C5C5C] dark:text-[#D1D1D1]' : 'border-[#F0ECE7] dark:border-[#333333] text-[#C2BCB6] dark:text-[#666666]'}`}>自動</button>
        </div>
      </div>

      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] flex justify-between items-center ${s('p-6', 'p-6')}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`${s('w-10 h-10 rounded-xl', 'w-11 h-11 rounded-2xl')} bg-[#F5F2EB] dark:bg-[#2C2A25] flex items-center justify-center shrink-0`}>
            <span className={`${s('text-base font-medium', 'text-lg font-bold')} text-[#A89F91] dark:text-[#888888]`}>Aa</span>
          </div>
          <div className="min-w-0">
            <h3 className={`font-medium text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest truncate ${s('text-xs', 'text-[14px] font-bold')}`}>視覺友善模式</h3>
            <p className={`${s('text-[10px] mt-1', 'text-[11px] mt-1.5')} text-[#A89F91] dark:text-[#888888] font-medium tracking-wide truncate`}>放大文字與圖示尺寸</p>
          </div>
        </div>
        <button onClick={() => onChangeSetting({ visualFriendly: !profile.visualFriendly })} className={`relative rounded-full transition-colors duration-300 shrink-0 ml-2 ${s('w-11 h-6', 'w-12 h-7')} ${profile.visualFriendly ? 'bg-[#8C8477] dark:bg-[#A1988B]' : 'bg-[#E8E4DF] dark:bg-[#4A4A4A]'}`}>
          <div className={`absolute bg-white dark:bg-[#D1D1D1] rounded-full transition-transform duration-300 ${s('top-1 left-1 w-4 h-4', 'top-1 left-1 w-5 h-5')} ${profile.visualFriendly ? s('translate-x-5', 'translate-x-5') : 'translate-x-0'}`} />
        </button>
      </div>

      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6', 'p-6')} mb-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}>
        <button onClick={onSave} disabled={!isDirty} className={`w-full rounded-xl font-bold tracking-widest transition-all flex items-center justify-center gap-2 ${s('py-3.5 text-[13px]', 'py-4 text-[15px]')} ${isDirty ? 'bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] active:scale-95 shadow-md' : 'bg-[#F9F8F6] dark:bg-[#2A2A2A] text-[#C2BCB6] dark:text-[#666666] cursor-not-allowed border border-[#E8E4DF] dark:border-[#3A3A3A]'}`}>
          <CheckCircle2 className={`${s('w-4 h-4', 'w-5 h-5')} stroke-[1.5] ${isDirty ? '' : 'opacity-50'}`} />
          {isDirty ? '儲存所有變更' : '已儲存最新設定'}
        </button>
      </div>

      <div className={`bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#F0ECE7] dark:border-[#333333] ${s('p-6 space-y-4', 'p-6 space-y-4')}`}>
        <h2 className={`${s('text-xs font-medium mb-2', 'text-[14px] font-bold mb-3')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-widest flex items-center gap-2`}><ShieldCheck className={`${s('w-4 h-4', 'w-5 h-5')} text-[#C2BCB6] dark:text-[#666666] stroke-[1.5]`} /> 雲端備份</h2>
        {user && !user.isAnonymous ? (
          <div className={`${s('space-y-3 pt-1', 'space-y-3 pt-1')}`}>
            <div className={`bg-[#F9F8F6] dark:bg-[#2A2A2A] rounded-xl border border-[#E8E4DF] dark:border-[#3A3A3A] flex items-center gap-3 ${s('p-3', 'p-3.5')}`}>
              <CheckCircle2 className={`${s('w-4 h-4', 'w-5 h-5')} text-[#8C8477] dark:text-[#A1988B] stroke-[1.5] shrink-0`} />
              <span className={`${s('text-[11px]', 'text-[13px]')} font-medium text-[#5C5C5C] dark:text-[#D1D1D1] truncate min-w-0`}>{user.email}</span>
            </div>
            <button onClick={() => { signOut(auth); window.location.reload(); }} className={`w-full bg-white dark:bg-[#1E1E1E] text-[#C78D87] dark:text-[#B86C65] rounded-xl font-medium tracking-widest border border-[#F0ECE7] dark:border-[#333333] active:scale-95 ${s('py-3 text-[11px]', 'py-3.5 text-[13px] font-bold')}`}>登出帳號</button>
          </div>
        ) : (
          <div className={s('space-y-3', 'space-y-4')}>
            <p className={`${s('text-[10px] font-light', 'text-[12px] font-medium')} text-[#A89F91] dark:text-[#888888] leading-relaxed`}>目前為訪客模式。綁定 Google 帳號可確保資料永久保存並跨裝置同步。</p>
            <button onClick={() => { signInWithPopup(auth, new GoogleAuthProvider()).catch(()=>{}); }} className={`w-full bg-[#8C8477] dark:bg-[#A1988B] text-white dark:text-[#121212] rounded-xl font-medium tracking-widest active:scale-95 shadow-sm ${s('py-3 text-[11px]', 'py-3.5 text-[13px] font-bold')}`}>
              綁定 GOOGLE 帳號
            </button>
          </div>
        )}
      </div>
    </div>
  );
}