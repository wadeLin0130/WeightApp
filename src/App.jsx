import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, TrendingUp, Settings, Home, 
  Flame, Utensils, Droplets, X, Camera, Plus, ChevronLeft, ChevronRight, CheckCircle2,
  Cloud, CloudOff
} from 'lucide-react';

// --- Firebase 初始化 ---
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

// 優先使用環境變數中的 __firebase_config (這樣在 Canvas 測試環境才能正常拿到權限)
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyBHtWTHEXuSrZBnB4gzh2N7ZvzSVSmjWgg",
      authDomain: "myweightapp-281cb.firebaseapp.com",
      projectId: "myweightapp-281cb",
      storageBucket: "myweightapp-281cb.firebasestorage.app",
      messagingSenderId: "476667742331",
      appId: "1:476667742331:web:09feb9c64766c0c9e1fade",
      measurementId: "G-Q5EK8KZ85T"
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// 為了避免在某些環境缺少測量 ID 報錯，加上 try/catch 或判斷
let analytics;
try {
  analytics = getAnalytics(app);
} catch(e) {
  console.log("Analytics init skipped");
}

const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : (firebaseConfig.appId || 'default-app-id');

// 自訂體重計圖標
const WeightScaleIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="4" />
    <rect width="10" height="5" x="7" y="7" rx="1" />
    <path d="M12 12V9" />
  </svg>
);

// 輔助函數：取得日期字串 YYYY-MM-DD
const getDateString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [activeModal, setActiveModal] = useState(null); 
  const todayStr = getDateString(new Date());

  // --- 狀態管理 ---
  const [profile, setProfile] = useState({
    height: 158.5,
    age: 32,
    gender: 'female' 
  });

  // 正式版本：初始為空物件，移除假資料生成邏輯
  const [records, setRecords] = useState({});

  // --- 雲端連線與資料同步 (Firebase Hooks) ---
  
  // 1. 處理身份驗證
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && typeof __firebase_config !== 'undefined') {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("驗證失敗:", error);
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("匿名登入也失敗:", e);
        }
      }
    };
    initAuth();
    
    // 監聽登入狀態
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 監聽雲端健康紀錄與設定 (即時同步)
  useEffect(() => {
    if (!user) {
      setRecords({}); // 登出或尚未登入時清空畫面資料
      return;
    }

    const recordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'health_records');
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');

    // 同步個人設定
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    }, (error) => console.error("設定同步錯誤:", error));

    // 同步每日紀錄
    const unsubRecords = onSnapshot(recordsRef, (snapshot) => {
      const newRecords = {}; // 完全依賴雲端真實資料，不使用假資料墊底
      snapshot.forEach(doc => {
        newRecords[doc.id] = doc.data(); 
      });
      setRecords(newRecords);
    }, (error) => console.error("紀錄同步錯誤:", error));

    return () => {
      unsubProfile();
      unsubRecords();
    };
  }, [user]);

  // 3. 自動儲存個人設定到雲端 (Debounce 防抖處理)
  useEffect(() => {
    if (!user || !profile.age || !profile.height) return;
    const timeoutId = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), profile, { merge: true });
      } catch (e) {
        console.error("儲存設定失敗:", e);
      }
    }, 1000); // 停止輸入後 1 秒自動存檔
    return () => clearTimeout(timeoutId);
  }, [profile, user]);


  // --- 計算邏輯 ---
  const todayData = records[todayStr] || { weight: 0, water: 0, diet: [], exercise: [] };
  const yesterdayStr = getDateString(new Date(Date.now() - 86400000));
  const yesterdayData = records[yesterdayStr];
  
  const weightChange = (todayData.weight && yesterdayData?.weight) 
    ? (todayData.weight - yesterdayData.weight).toFixed(1) 
    : null;

  const nutritionStats = useMemo(() => {
    if (!profile.height || !profile.age || !todayData.weight) return null;
    
    const weight = todayData.weight;
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
    const avgExCals = totalExCals / 7;

    const tdee = Math.round((bmr * 1.2) + avgExCals);
    const todayIntake = todayData.diet?.reduce((sum, d) => sum + (Number(d.calories) || 0), 0) || 0;
    
    return { tdee, intake: todayIntake, gap: todayIntake - tdee };
  }, [profile, todayData, records]);

  // --- 儲存每日紀錄到雲端 ---
  const handleSaveData = async (type, data) => {
    if (!user) return; // 保護機制，確保已連線

    const currentDayData = records[todayStr] || { weight: 0, water: 0, diet: [], exercise: [] };
    const updated = { ...currentDayData };
    
    if (type === 'weight') updated.weight = parseFloat(data);
    if (type === 'water') updated.water = (updated.water || 0) + parseInt(data);
    if (type === 'diet') updated.diet = [...(updated.diet || []), data];
    if (type === 'exercise') updated.exercise = [...(updated.exercise || []), data];
    
    // 樂觀更新：立刻寫入雲端，雲端監聽器會瞬間更新畫面
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'health_records', todayStr), updated, { merge: true });
      setActiveModal(null);
    } catch (err) {
      console.error("儲存失敗:", err);
    }
  };

  const renderHome = () => (
    <div className="p-6 space-y-6 animate-in fade-in duration-700 pb-28">
      {/* 頂部大卡片 - 燕麥奶茶色調 */}
      <div className="bg-[#EFECE7] rounded-3xl p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E8E4DF] relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-[#8C8477] text-xs tracking-widest font-medium mb-2">TODAY'S WEIGHT</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light text-[#4A4A4A] tracking-tight">{todayData.weight || '--'}</span>
              <span className="text-lg text-[#8C8477] font-light">kg</span>
            </div>
            {weightChange && (
              <div className="inline-flex items-center mt-3 px-3 py-1 rounded-full text-[11px] font-medium bg-white/60 text-[#7A756D] backdrop-blur-sm shadow-sm">
                相較昨日 {Number(weightChange) > 0 ? '+' : ''}{weightChange} kg
              </div>
            )}
          </div>
          <WeightScaleIcon className="w-12 h-12 text-[#D6D0C4] opacity-50 stroke-1" />
        </div>

        {nutritionStats && (
          <div className="mt-8 pt-5 border-t border-[#D6D0C4]/40 relative z-10">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[#8C8477] text-[10px] tracking-widest mb-1.5">INTAKE / TDEE</p>
                <p className="font-medium text-[#5C5C5C] text-sm">
                  {nutritionStats.intake} / {nutritionStats.tdee} <span className="text-[10px] text-[#A89F91]">kcal</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#8C8477] text-[10px] tracking-widest mb-1.5">BALANCE</p>
                <p className={`font-medium text-sm ${nutritionStats.gap > 0 ? 'text-[#C4A495]' : 'text-[#9AA899]'}`}>
                  {nutritionStats.gap > 0 ? '+' : ''}{nutritionStats.gap} <span className="text-[10px] opacity-80">kcal</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 紀錄卡片網格 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 體重 */}
        <button onClick={() => setActiveModal('weight')} className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[#F0ECE7] flex flex-col items-start gap-4 active:scale-95 transition-transform text-left">
          <div className="w-11 h-11 rounded-2xl bg-[#F5F2EB] flex items-center justify-center">
            <WeightScaleIcon className="w-5 h-5 text-[#A89F91] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-sm tracking-wide">記錄體重</h3>
            <p className="text-xs text-[#C2BCB6] mt-1.5 font-light">{todayData.weight ? `${todayData.weight} kg` : '尚無紀錄'}</p>
          </div>
        </button>

        {/* 喝水 - 霧霾藍 */}
        <button onClick={() => setActiveModal('water')} className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[#F0ECE7] flex flex-col items-start gap-4 active:scale-95 transition-transform text-left">
          <div className="w-11 h-11 rounded-2xl bg-[#EDF1F4] flex items-center justify-center">
            <Droplets className="w-5 h-5 text-[#93A3B1] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-sm tracking-wide">補充水分</h3>
            <p className="text-xs text-[#C2BCB6] mt-1.5 font-light">{todayData.water ? `${todayData.water} ml` : '尚無紀錄'}</p>
          </div>
        </button>

        {/* 飲食 - 鼠尾草綠 */}
        <button onClick={() => setActiveModal('diet')} className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[#F0ECE7] flex flex-col items-start gap-4 active:scale-95 transition-transform text-left">
          <div className="w-11 h-11 rounded-2xl bg-[#EEF2ED] flex items-center justify-center">
            <Utensils className="w-5 h-5 text-[#9AA899] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-sm tracking-wide">飲食日記</h3>
            <p className="text-xs text-[#C2BCB6] mt-1.5 font-light">{todayData.diet?.length ? `已記錄 ${todayData.diet.length} 餐` : '尚無紀錄'}</p>
          </div>
        </button>

        {/* 運動 - 玫瑰燕麥 */}
        <button onClick={() => setActiveModal('exercise')} className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[#F0ECE7] flex flex-col items-start gap-4 active:scale-95 transition-transform text-left">
          <div className="w-11 h-11 rounded-2xl bg-[#F7EFEA] flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#C4A495] stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-medium text-[#5C5C5C] text-sm tracking-wide">運動消耗</h3>
            <p className="text-xs text-[#C2BCB6] mt-1.5 font-light">{todayData.exercise?.length ? `已記錄 ${todayData.exercise.length} 次` : '尚無紀錄'}</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-28">
      <div className="bg-white rounded-3xl p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[#F0ECE7] space-y-6">
        <h2 className="text-lg font-medium text-[#5C5C5C] mb-2 flex items-center gap-3 tracking-wide">
          <Settings className="w-5 h-5 text-[#C2BCB6] stroke-[1.5]" /> 基本設定
        </h2>
        <p className="text-xs text-[#A89F91] mb-6 font-light leading-relaxed">請完善您的基本資料，這將幫助我們更精準地計算您每日所需的基礎代謝與消耗熱量。</p>

        <div className="space-y-3">
          <label className="text-[11px] tracking-widest text-[#8C8477]">GENDER</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setProfile({...profile, gender: 'male'})}
              className={`flex-1 py-3.5 rounded-2xl border text-sm transition-all ${profile.gender === 'male' ? 'bg-[#EFECE7] border-[#D6D0C4] text-[#5C5C5C]' : 'bg-transparent border-[#F0ECE7] text-[#C2BCB6] hover:bg-[#F9F8F6]'}`}
            >男性</button>
            <button 
              onClick={() => setProfile({...profile, gender: 'female'})}
              className={`flex-1 py-3.5 rounded-2xl border text-sm transition-all ${profile.gender === 'female' ? 'bg-[#EFECE7] border-[#D6D0C4] text-[#5C5C5C]' : 'bg-transparent border-[#F0ECE7] text-[#C2BCB6] hover:bg-[#F9F8F6]'}`}
            >女性</button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] tracking-widest text-[#8C8477]">AGE</label>
          <input 
            type="number" 
            value={profile.age || ''}
            onChange={(e) => setProfile({...profile, age: e.target.value})}
            className="w-full p-4 bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl focus:border-[#C4A495] focus:bg-white focus:ring-0 outline-none text-[#5C5C5C] font-light transition-colors"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[11px] tracking-widest text-[#8C8477]">HEIGHT (cm)</label>
          <input 
            type="number" 
            value={profile.height || ''}
            onChange={(e) => setProfile({...profile, height: e.target.value})}
            className="w-full p-4 bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl focus:border-[#C4A495] focus:bg-white focus:ring-0 outline-none text-[#5C5C5C] font-light transition-colors"
          />
        </div>
      </div>

      {/* 帳號與同步管理區塊 */}
      <div className="bg-white rounded-3xl p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[#F0ECE7] space-y-6">
        <h2 className="text-lg font-medium text-[#5C5C5C] mb-2 flex items-center gap-3 tracking-wide">
          <Cloud className="w-5 h-5 text-[#C2BCB6] stroke-[1.5]" /> 雲端帳號管理
        </h2>
        
        {user && !user.isAnonymous ? (
          <div className="space-y-4">
            <div className="bg-[#EEF2ED] p-4 rounded-2xl border border-[#D6E0D5] flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-[#9AA899]" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-[#5C5C5C] truncate">{user.displayName || '已綁定用戶'}</p>
                <p className="text-xs text-[#9AA899] truncate font-light mt-0.5">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="w-full py-4 bg-[#F9F8F6] text-[#A89F91] rounded-2xl font-medium tracking-widest border border-[#F0ECE7] hover:bg-[#F0ECE7] active:scale-95 transition-all"
            >
              登出
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#A89F91] font-light leading-relaxed">
              目前使用「訪客模式」。若要跨裝置同步，或允許多人切換帳號使用，請綁定 Google 帳號。
            </p>
            <button 
              onClick={() => {
                const provider = new GoogleAuthProvider();
                signInWithPopup(auth, provider).catch(err => console.error("登入失敗", err));
              }}
              className="w-full py-4 bg-[#8C8477] text-white rounded-2xl font-medium tracking-widest shadow-[0_4px_15px_rgba(140,132,119,0.3)] active:scale-95 transition-all"
            >
              使用 GOOGLE 登入
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const ModalOverlay = ({ title, icon: Icon, colorClass, children }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#4A4A4A]/20 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 border border-[#F0ECE7]">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-2xl ${colorClass.bg}`}>
              <Icon className={`w-5 h-5 ${colorClass.text} stroke-[1.5]`} />
            </div>
            <h2 className="text-lg font-medium text-[#5C5C5C] tracking-wide">{title}</h2>
          </div>
          <button onClick={() => setActiveModal(null)} className="p-2 bg-[#F9F8F6] rounded-full text-[#A89F91] hover:bg-[#F0ECE7] active:scale-90 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const renderModals = () => {
    if (!activeModal) return null;

    if (activeModal === 'weight') {
      return (
        <ModalOverlay title="今日體重" icon={WeightScaleIcon} colorClass={{bg: 'bg-[#F5F2EB]', text: 'text-[#A89F91]'}}>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveData('weight', e.target.weight.value); }}>
            <input name="weight" type="number" step="0.1" required defaultValue={todayData.weight || ''} placeholder="70.5" className="w-full text-center text-5xl font-light p-6 bg-[#F9F8F6] border border-[#E8E4DF] rounded-3xl focus:border-[#D6D0C4] focus:bg-white outline-none mb-8 text-[#4A4A4A] placeholder:text-[#D6D0C4]" autoFocus />
            <button type="submit" className="w-full py-4 bg-[#8C8477] text-white rounded-2xl font-medium tracking-widest shadow-[0_4px_15px_rgba(140,132,119,0.3)] active:scale-95 transition-all">SAVE</button>
          </form>
        </ModalOverlay>
      );
    }

    if (activeModal === 'water') {
      return (
        <ModalOverlay title="補充水分" icon={Droplets} colorClass={{bg: 'bg-[#EDF1F4]', text: 'text-[#93A3B1]'}}>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[250, 350, 500].map(amt => (
              <button key={amt} type="button" onClick={() => handleSaveData('water', amt)} className="py-4 bg-[#F9F8F6] text-[#93A3B1] font-medium rounded-2xl border border-[#F0ECE7] active:bg-[#EDF1F4] transition-colors text-sm">+{amt}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveData('water', e.target.water.value); }}>
            <div className="flex gap-3">
              <input name="water" type="number" placeholder="輸入 ml" className="flex-1 p-4 bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl focus:border-[#93A3B1] focus:bg-white outline-none text-[#5C5C5C] font-light" required />
              <button type="submit" className="px-8 bg-[#93A3B1] text-white rounded-2xl font-medium tracking-wide shadow-[0_4px_15px_rgba(147,163,177,0.3)] active:scale-95 transition-all">ADD</button>
            </div>
          </form>
        </ModalOverlay>
      );
    }

    if (activeModal === 'diet') {
      return (
        <ModalOverlay title="飲食日記" icon={Utensils} colorClass={{bg: 'bg-[#EEF2ED]', text: 'text-[#9AA899]'}}>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            handleSaveData('diet', { content: e.target.content.value, calories: e.target.calories.value }); 
          }} className="space-y-5">
            <div>
              <input name="content" type="text" placeholder="吃了什麼呢？(選填)" className="w-full p-4 bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl focus:border-[#9AA899] focus:bg-white outline-none text-[#5C5C5C] font-light placeholder:text-[#C2BCB6]" />
            </div>
            <div>
              <input name="calories" type="number" placeholder="大約熱量 kcal (選填)" className="w-full p-4 bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl focus:border-[#9AA899] focus:bg-white outline-none text-[#5C5C5C] font-light placeholder:text-[#C2BCB6]" />
            </div>
            <div>
              <label className="flex items-center justify-center gap-2 w-full p-4 bg-[#F9F8F6] border border-dashed border-[#D6D0C4] rounded-2xl text-[#A89F91] cursor-pointer hover:bg-[#F0ECE7] transition-colors text-sm font-light">
                <Camera className="w-4 h-4 stroke-[1.5]" /> 上傳照片 (本地暫存)
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <button type="submit" className="w-full py-4 mt-4 bg-[#9AA899] text-white rounded-2xl font-medium tracking-widest shadow-[0_4px_15px_rgba(154,168,153,0.3)] active:scale-95 transition-all">SAVE</button>
          </form>
        </ModalOverlay>
      );
    }

    if (activeModal === 'exercise') {
      return (
        <ModalOverlay title="運動消耗" icon={Flame} colorClass={{bg: 'bg-[#F7EFEA]', text: 'text-[#C4A495]'}}>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            handleSaveData('exercise', { type: e.target.type.value || '日常活動', calories: e.target.calories.value }); 
          }} className="space-y-5">
            <div>
              <input name="type" type="text" placeholder="做了什麼運動？(選填)" className="w-full p-4 bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl focus:border-[#C4A495] focus:bg-white outline-none text-[#5C5C5C] font-light placeholder:text-[#C2BCB6]" />
            </div>
            <div>
              <input name="calories" type="number" placeholder="消耗熱量 kcal (選填)" className="w-full p-4 bg-[#F9F8F6] border border-[#E8E4DF] rounded-2xl focus:border-[#C4A495] focus:bg-white outline-none text-[#5C5C5C] font-light placeholder:text-[#C2BCB6]" />
            </div>
            <p className="text-xs text-[#C2BCB6] text-center font-light pt-2">若未填寫，將單純記錄今日「有運動」。</p>
            <button type="submit" className="w-full py-4 bg-[#C4A495] text-white rounded-2xl font-medium tracking-widest shadow-[0_4px_15px_rgba(196,164,149,0.3)] active:scale-95 transition-all">SAVE</button>
          </form>
        </ModalOverlay>
      );
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-[#F7F5F2] font-sans text-[#4A4A4A] overflow-hidden shadow-2xl relative">
      {/* 頂部導覽列 */}
      <header className="bg-[#F7F5F2]/80 backdrop-blur-md px-6 py-5 z-10 flex justify-center border-b border-[#EBE8E3] sticky top-0">
        <div className="text-sm font-medium text-[#5C5C5C] tracking-[0.2em] uppercase flex items-center gap-2">
          {activeTab === 'home' && 'Dashboard'}
          {activeTab === 'calendar' && 'Calendar'}
          {activeTab === 'trend' && 'Analytics'}
          {activeTab === 'settings' && 'Profile'}
          {/* 連線狀態提示小雲朵 */}
          {user ? (
            <Cloud className="w-3.5 h-3.5 text-[#9AA899] stroke-[2]" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-[#C2BCB6] stroke-[1.5]" />
          )}
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'calendar' && <CalendarView records={records} todayStr={todayStr} />}
        {activeTab === 'trend' && <TrendChart records={records} />}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* 底部導覽列 */}
      <nav className="bg-[#F7F5F2]/95 backdrop-blur-md border-t border-[#EBE8E3] px-4 pt-3 pb-5 flex justify-around items-center fixed bottom-0 w-full max-w-md z-40">
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
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 p-2 w-16 bg-transparent border-none transition-all duration-300 ${active ? 'text-[#8C8477] -translate-y-1' : 'text-[#C2BCB6] hover:text-[#A89F91]'}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
      <span className="text-[9px] tracking-wider font-medium m-0">{label}</span>
      {/* 提示亮點 */}
      <div className={`w-1 h-1 rounded-full bg-[#8C8477] transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
    </button>
  );
}

// 月曆元件
function CalendarView({ records, todayStr }) {
  const [viewMode, setViewMode] = useState('weight');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  const changeMonth = (offset) => setCurrentMonth(new Date(year, month + offset, 1));

  return (
    <div className="p-6 pb-28 animate-in fade-in duration-500">
      {/* 模式切換 - 極簡線條風 */}
      <div className="flex border-b border-[#E8E4DF] mb-8">
        {[
          { id: 'weight', label: '體重', color: 'text-[#8C8477]', border: 'border-[#8C8477]' },
          { id: 'diet', label: '飲食', color: 'text-[#9AA899]', border: 'border-[#9AA899]' },
          { id: 'exercise', label: '運動', color: 'text-[#C4A495]', border: 'border-[#C4A495]' }
        ].map(mode => (
          <button 
            key={mode.id}
            onClick={() => setViewMode(mode.id)} 
            className={`flex-1 pb-3 text-xs tracking-widest transition-all relative ${viewMode === mode.id ? `${mode.color} font-medium` : 'text-[#C2BCB6] font-light hover:text-[#A89F91]'}`}
          >
            {mode.label}
            {viewMode === mode.id && <div className={`absolute bottom-0 left-0 w-full border-b-[2px] ${mode.border} transition-all`} />}
          </button>
        ))}
      </div>

      {/* 月曆控制 */}
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-[#EFECE7] rounded-full transition-colors text-[#8C8477]"><ChevronLeft className="w-5 h-5 stroke-[1.5]" /></button>
        <h2 className="text-sm font-medium tracking-[0.1em] text-[#5C5C5C]">{year} . {String(month + 1).padStart(2, '0')}</h2>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-[#EFECE7] rounded-full transition-colors text-[#8C8477]"><ChevronRight className="w-5 h-5 stroke-[1.5]" /></button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-[10px] tracking-widest font-medium text-[#C2BCB6]">{day}</div>
        ))}
      </div>

      {/* 月曆網格 */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="h-16 bg-transparent"></div>;
          
          const dStr = getDateString(date);
          const dayData = records[dStr];
          const isToday = dStr === todayStr;

          let cellContent = null;
          let cellStyle = isToday 
            ? 'bg-[#EFECE7] border border-[#D6D0C4]' 
            : 'bg-white border border-[#F0ECE7] shadow-[0_2px_10px_rgb(0,0,0,0.01)]';

          if (dayData) {
            if (viewMode === 'weight' && dayData.weight) {
              cellContent = (
                <div className="flex flex-col items-center justify-center mt-1">
                  <span className="font-medium text-[#5C5C5C] text-sm">{dayData.weight}</span>
                </div>
              );
            } else if (viewMode === 'diet' && dayData.diet?.length > 0) {
              const totalCals = dayData.diet.reduce((sum, d) => sum + (Number(d.calories) || 0), 0);
              cellContent = (
                <div className="flex flex-col items-center justify-center mt-1.5 text-[#9AA899]">
                  <span className="text-[11px] font-medium">{totalCals > 0 ? totalCals : '✓'}</span>
                </div>
              );
            } else if (viewMode === 'exercise' && dayData.exercise?.length > 0) {
              const totalCals = dayData.exercise.reduce((sum, ex) => sum + (Number(ex.calories) || 0), 0);
              cellContent = (
                <div className="flex flex-col items-center justify-center mt-1.5 text-[#C4A495]">
                  <span className="text-[11px] font-medium">{totalCals > 0 ? totalCals : '✓'}</span>
                </div>
              );
            }
          }

          return (
            <div key={dStr} className={`h-16 rounded-2xl p-1.5 flex flex-col ${cellStyle}`}>
              <span className={`text-[9px] font-medium pl-0.5 ${isToday ? 'text-[#8C8477]' : 'text-[#A89F91]'}`}>{date.getDate()}</span>
              <div className="flex-1 flex items-center justify-center">
                {cellContent}
              </div>
            </div>
          );
        })}
      </div>
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
        <TrendingUp className="w-10 h-10 mx-auto text-[#D6D0C4] mb-6 stroke-1" />
        <p className="font-medium tracking-widest text-sm">NOT ENOUGH DATA</p>
        <p className="text-xs mt-3 font-light">需要兩天以上的紀錄來產生優美的趨勢線。</p>
      </div>
    );
  }

  const weights = weightData.map(d => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);
  
  const width = 340;
  const height = 240;
  const paddingX = 35;
  const paddingY = 40;

  const points = weightData.map((d, i) => {
    const x = paddingX + (i / (weightData.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.weight - minW) / (maxW - minW)) * (height - paddingY * 2);
    return { x, y, value: d.weight, date: d.date.slice(5).replace('-', '.') }; 
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="p-6 pb-28 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[#F0ECE7]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[#8C8477] mb-8 px-2 uppercase">Weight Trend</h2>
        <div className="overflow-x-auto overflow-y-hidden">
          <svg width={width} height={height} className="mx-auto overflow-visible">
            {/* 橫向參考線 */}
            {[0, 0.5, 1].map(ratio => {
              const y = paddingY + ratio * (height - paddingY * 2);
              const val = (maxW - ratio * (maxW - minW)).toFixed(1);
              return (
                <g key={`grid-${ratio}`}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#F0ECE7" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={paddingX - 12} y={y + 3} fontSize="9" fill="#C2BCB6" textAnchor="end" className="font-light">{val}</text>
                </g>
              );
            })}
            
            {/* 趨勢線 - 玫瑰灰 */}
            <polyline points={polylinePoints} fill="none" stroke="#C4A495" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* 資料點 */}
            {points.map((p, i) => (
              <g key={`point-${i}`}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="#FFFFFF" stroke="#C4A495" strokeWidth="2" />
                <text x={p.x} y={p.y - 12} fontSize="9" fill="#5C5C5C" textAnchor="middle" className="font-medium">{p.value}</text>
                {(i === 0 || i === points.length - 1 || i % 2 === 0) && (
                  <text x={p.x} y={height - paddingY + 22} fontSize="8" fill="#A89F91" textAnchor="middle" className="font-light tracking-wider">{p.date}</text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}