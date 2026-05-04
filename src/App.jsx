import { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  TrendingUp,
  Settings,
  Home,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, getDoc, getDocs } from 'firebase/firestore';

import { auth, db, appId } from './firebase/client';
import { safeStorage } from './lib/storage';
import { DEFAULT_PROFILE } from './constants/defaultProfile';
import { getDateString, getTimeString } from './lib/dateUtils';
import { getArrayData } from './lib/records';

import { HomeView } from './components/home/HomeView';
import { RecordModals } from './components/modals/RecordModals';
import { CalendarView } from './components/calendar/CalendarView';
import { TrendChart } from './components/trend/TrendChart';
import { SettingsView } from './components/settings/SettingsView';
import { NavButton } from './components/layout/NavButton';

function normalizeProfile(rawProfile) {
  const nowYear = new Date().getFullYear();
  const normalized = { ...DEFAULT_PROFILE, ...(rawProfile || {}) };
  let migrated = false;

  if (normalized.birthYear === undefined || normalized.birthYear === null || normalized.birthYear === '') {
    const ageNum = Number(normalized.age);
    if (Number.isFinite(ageNum) && ageNum > 0) {
      normalized.birthYear = String(nowYear - Math.floor(ageNum));
      migrated = true;
    }
  }

  if (normalized.birthYear !== undefined && normalized.birthYear !== null && normalized.birthYear !== '') {
    const birthYearNum = Number(normalized.birthYear);
    if (Number.isFinite(birthYearNum) && birthYearNum > 0) {
      const normalizedBirthYear = String(Math.floor(birthYearNum));
      if (String(normalized.birthYear) !== normalizedBirthYear) {
        normalized.birthYear = normalizedBirthYear;
        migrated = true;
      }
    } else {
      normalized.birthYear = '';
      migrated = true;
    }
  }

  if ('age' in normalized) {
    delete normalized.age;
    migrated = true;
  }

  return { profile: normalized, migrated };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [modalState, setModalState] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const initialTodayStr = getDateString(new Date());
  const todayStrRef = useRef(initialTodayStr);
  const [todayStr, setTodayStr] = useState(initialTodayStr);
  const [targetDate, setTargetDate] = useState(initialTodayStr);

  const [profile, setProfile] = useState(() => normalizeProfile(safeStorage.get('wt_profile')?.data || DEFAULT_PROFILE).profile);
  const [records, setRecords] = useState(() => safeStorage.get('wt_records') || {});

  const [draftProfile, setDraftProfile] = useState(null);
  const activeProfile = draftProfile || profile;
  const isProfileDirty = draftProfile !== null;

  const unsubRecordsRef = useRef(null);
  const unsubProfileRef = useRef(null);

  const isLarge = activeProfile.visualFriendly || false;
  const themeMode = activeProfile.themeMode || 'auto';
  const s = (normal, large) => (isLarge ? large : normal);

  useEffect(() => {
    const checkTheme = () => {
      let isDarkTheme;
      if (themeMode === 'dark') {
        isDarkTheme = true;
      } else if (themeMode === 'light') {
        isDarkTheme = false;
      } else {
        const hour = new Date().getHours();
        isDarkTheme = hour < 6 || hour >= 18;
      }
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
    const timer = setInterval(checkTheme, 60000);
    return () => clearInterval(timer);
  }, [themeMode]);

  useEffect(() => {
    const handleWake = () => {
      const newToday = getDateString(new Date());
      if (todayStrRef.current !== newToday) {
        setTargetDate((prev) => (prev === todayStrRef.current ? newToday : prev));
        todayStrRef.current = newToday;
        setTodayStr(newToday);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleWake();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof globalThis.__initial_auth_token !== 'undefined' && globalThis.__initial_auth_token) {
          await signInWithCustomToken(auth, globalThis.__initial_auth_token);
        } else if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch {
        if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
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
          const { profile: lProfile, migrated: localMigrated } = normalizeProfile(lProfileObj?.data || DEFAULT_PROFILE);
          const lTimeP = lProfileObj?.updatedAt || 0;
          const { profile: normalizedRemoteProfile, migrated: remoteMigrated } = normalizeProfile(rProfile);
          const rTimeP = normalizedRemoteProfile?._updatedAt || 0;

          if (localMigrated && lProfileObj) {
            safeStorage.set('wt_profile', { data: lProfile, updatedAt: lTimeP || Date.now() });
          }

          if (normalizedRemoteProfile && (!lProfileObj || rTimeP >= lTimeP)) {
            if (isMounted) setProfile(normalizedRemoteProfile);
            safeStorage.set('wt_profile', { data: normalizedRemoteProfile, updatedAt: rTimeP || Date.now() });
            if (remoteMigrated) {
              const now = Date.now();
              await setDoc(profileRef, { ...normalizedRemoteProfile, _updatedAt: now }, { merge: true });
            }
          } else if (lProfileObj && lTimeP > rTimeP) {
            await setDoc(profileRef, lProfile, { merge: true });
          } else if (!normalizedRemoteProfile && localMigrated) {
            await setDoc(profileRef, { ...lProfile, _updatedAt: Date.now() }, { merge: true });
          }

          const recordsRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'health_records');
          const rSnap = await getDocs(recordsRef);
          const rRecords = {};

          rSnap.forEach((d) => {
            const id = d.id;
            const data = d.data();
            if (id.length === 10) {
              if (!rRecords[id] || (data._updatedAt || 0) > (rRecords[id]._updatedAt || 0)) {
                rRecords[id] = data;
              }
            } else if (id.length === 7) {
              Object.keys(data).forEach((key) => {
                if (key.length === 10) {
                  if (!rRecords[key] || (data[key]._updatedAt || 0) > (rRecords[key]._updatedAt || 0)) {
                    rRecords[key] = data[key];
                  }
                }
              });
            }
          });

          const lRecords = safeStorage.get('wt_records') || {};
          const mergedRecords = { ...lRecords };
          const needsUpload = [];

          const allDates = new Set([...Object.keys(rRecords), ...Object.keys(lRecords)]);
          allDates.forEach((date) => {
            const rData = rRecords[date];
            const lData = lRecords[date];
            const rTime = rData?._updatedAt || 0;
            const lTime = lData?._updatedAt || 0;

            if (rData && !lData) {
              mergedRecords[date] = rData;
            } else if (!rData && lData) {
              mergedRecords[date] = lData;
              needsUpload.push({ date, data: lData });
            } else if (rData && lData) {
              if (rTime >= lTime) {
                mergedRecords[date] = rData;
              } else {
                mergedRecords[date] = lData;
                needsUpload.push({ date, data: lData });
              }
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
              const { profile: normalizedProfile, migrated } = normalizeProfile(d);
              setProfile((p) => {
                if ((normalizedProfile._updatedAt || 0) >= (p._updatedAt || 0)) {
                  safeStorage.set('wt_profile', { data: normalizedProfile, updatedAt: normalizedProfile._updatedAt || Date.now() });
                  return normalizedProfile;
                }
                return p;
              });
              if (migrated) {
                const now = Date.now();
                setDoc(profileRef, { ...normalizedProfile, _updatedAt: now }, { merge: true }).catch(() => {});
              }
            }
          });

          if (unsubRecordsRef.current) unsubRecordsRef.current();
          unsubRecordsRef.current = onSnapshot(recordsRef, (snap) => {
            if (!isMounted) return;
            const newRecs = {};
            snap.forEach((d) => {
              const id = d.id;
              const data = d.data();
              if (id.length === 10) {
                if (!newRecs[id] || (data._updatedAt || 0) > (newRecs[id]._updatedAt || 0)) {
                  newRecs[id] = data;
                }
              } else if (id.length === 7) {
                Object.keys(data).forEach((key) => {
                  if (key.length === 10) {
                    if (!newRecs[key] || (data[key]._updatedAt || 0) > (newRecs[key]._updatedAt || 0)) {
                      newRecs[key] = data[key];
                    }
                  }
                });
              }
            });

            setRecords((prev) => {
              let changed = false;
              const next = { ...prev };
              Object.keys(newRecs).forEach((date) => {
                if ((newRecs[date]?._updatedAt || 0) >= (next[date]?._updatedAt || 0)) {
                  next[date] = newRecs[date];
                  changed = true;
                }
              });
              if (changed) safeStorage.set('wt_records', next);
              return changed ? next : prev;
            });
          });
        } catch (e) {
          console.error('Sync Error:', e);
        } finally {
          if (isMounted) setIsSyncing(false);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfileRef.current) unsubProfileRef.current();
      if (unsubRecordsRef.current) unsubRecordsRef.current();
    };
  }, []);

  const updateProfile = async (newProps) => {
    setProfile((prev) => {
      const draftUpdated = typeof newProps === 'function' ? newProps(prev) : { ...prev, ...newProps };
      const { profile: updated } = normalizeProfile(draftUpdated);
      const now = Date.now();
      updated._updatedAt = now;
      safeStorage.set('wt_profile', { data: updated, updatedAt: now });

      if (user) {
        setIsSyncing(true);
        setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), updated, { merge: true })
          .catch(() => {})
          .finally(() => setIsSyncing(false));
      }
      return updated;
    });
  };

  const handleSettingChange = (newProps) => {
    setDraftProfile((prev) => {
      const current = prev || profile;
      return normalizeProfile({ ...current, ...newProps }).profile;
    });
  };

  const handleSaveSettings = () => {
    if (draftProfile) {
      updateProfile(draftProfile);
      setDraftProfile(null);
    }
  };

  const handleTabClick = (tab) => {
    if (activeTab === 'settings' && isProfileDirty && tab !== 'settings') {
      setModalState({ view: 'confirm_leave', pendingTab: tab });
    } else {
      setActiveTab(tab);
    }
  };

  const updateRecords = async (operateDate, updatedDayData) => {
    const now = Date.now();
    const finalData = { ...updatedDayData, _updatedAt: now };

    setRecords((prev) => {
      const next = { ...prev, [operateDate]: finalData };
      safeStorage.set('wt_records', next);
      return next;
    });

    if (user) {
      setIsSyncing(true);
      const monthStr = operateDate.substring(0, 7);
      setDoc(
        doc(db, 'artifacts', appId, 'users', user.uid, 'health_records', monthStr),
        {
          [operateDate]: finalData,
          _updatedAt: now,
        },
        { merge: true },
      )
        .catch(() => {})
        .finally(() => setIsSyncing(false));
    }
  };

  const openCategoryFlow = (category, dateStr = targetDate) => {
    const dataObj = records[dateStr] || {};
    const hasData = getArrayData(dataObj, category).length > 0;
    if (hasData) {
      setModalState({ view: 'list', category, dateStr });
    } else if (category === 'diet' || category === 'exercise') {
      setModalState({ view: 'select', category, dateStr });
    } else {
      setModalState({ view: 'calc', category, dateStr });
    }
  };

  const handleSaveData = (category, dataObj) => {
    const operateDate = modalState?.dateStr || targetDate;
    const currentDayData = records[operateDate] || {};
    const arr = getArrayData(currentDayData, category);
    let newArr;

    if (modalState?.item?.id) {
      newArr = arr.map((row) => (row.id === modalState.item.id ? { ...row, ...dataObj } : row));
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
    const newArr = arr.filter((row) => row.id !== id);

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
    for (const d of sortedDates) {
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

  let weightChange = null;
  let prevWeight = null;
  const targetDObj = new Date(targetDate);
  for (let i = 1; i <= 7; i++) {
    const pastObj = new Date(targetDObj);
    pastObj.setDate(pastObj.getDate() - i);
    const prevArr = getArrayData(records[getDateString(pastObj)] || {}, 'weight');
    if (prevArr.length > 0) {
      prevWeight = prevArr[prevArr.length - 1].value;
      break;
    }
  }
  if (latestWeight && prevWeight) {
    weightChange = (latestWeight - prevWeight).toFixed(2);
  }

  const birthYearNum = Number(activeProfile.birthYear);
  const calculatedAge = Number.isFinite(birthYearNum) && birthYearNum > 0 ? new Date().getFullYear() - birthYearNum : null;
  let tdee = 0;
  if (activeProfile.height && calculatedAge) {
    if (activeProfile.customTDEE && Number(activeProfile.customTDEE) > 0) {
      tdee = Number(activeProfile.customTDEE);
    } else {
      let bmr = 10 * Number(latestWeight || 60) + 6.25 * Number(activeProfile.height) - 5 * Number(calculatedAge);
      bmr += activeProfile.gender === 'male' ? 5 : -161;
      let weekEx = 0;
      for (let i = 1; i <= 7; i++) {
        const pastObj = new Date(targetDObj);
        pastObj.setDate(pastObj.getDate() - i);
        const dStr = getDateString(pastObj);
        getArrayData(records[dStr] || {}, 'exercise').forEach((ex) => {
          weekEx += Number(ex.calories ?? ex.value) || 0;
        });
      }
      tdee = Math.round(bmr * 1.2 + weekEx / 7);
    }
  }

  return (
    <div
      className={`max-w-md mx-auto min-h-[100dvh] flex flex-col bg-[#F7F5F2] dark:bg-[#121212] font-sans text-[#4A4A4A] dark:text-[#E8E8E8] shadow-2xl relative ${isDark ? 'dark' : ''}`}
    >
      <header className="bg-[#F7F5F2]/90 dark:bg-[#121212]/90 backdrop-blur-md px-6 py-4 z-10 flex justify-center border-b border-[#EBE8E3] dark:border-[#2A2A2A] sticky top-0">
        <div className={`${s('text-[11px] font-medium', 'text-[14px] font-bold')} text-[#5C5C5C] dark:text-[#D1D1D1] tracking-[0.2em] uppercase flex items-center gap-2`}>
          {activeTab === 'home' && 'Dashboard'}
          {activeTab === 'calendar' && 'Calendar'}
          {activeTab === 'trend' && 'Analytics'}
          {activeTab === 'settings' && 'Profile'}
          {isSyncing ? (
            <RefreshCw className={`${s('w-3 h-3', 'w-4 h-4')} text-[#C4A495] animate-spin`} />
          ) : user && !user.isAnonymous ? (
            <Cloud className={`${s('w-3 h-3', 'w-4 h-4')} text-[#9AA899]`} />
          ) : (
            <CloudOff className={`${s('w-3 h-3', 'w-4 h-4')} text-[#C2BCB6] dark:text-[#666666]`} />
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        {activeTab === 'home' && (
          <HomeView
            isLarge={isLarge}
            targetDate={targetDate}
            todayStr={todayStr}
            setTargetDate={setTargetDate}
            setModalState={setModalState}
            openCategoryFlow={openCategoryFlow}
            latestWeight={latestWeight}
            weightChange={weightChange}
            totalIntake={totalIntake}
            tdee={tdee}
            arrWeight={arrWeight}
            arrDiet={arrDiet}
            arrEx={arrEx}
            totalWater={totalWater}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView
            records={records}
            viewMode={modalState?.category || 'weight'}
            onSelectDate={(d, mode) => {
              openCategoryFlow(mode, d);
            }}
            isLarge={isLarge}
          />
        )}
        {activeTab === 'trend' && <TrendChart records={records} isLarge={isLarge} />}
        {activeTab === 'settings' && (
          <SettingsView
            profile={activeProfile}
            onChangeSetting={handleSettingChange}
            onSave={handleSaveSettings}
            isDirty={isProfileDirty}
            user={user}
            auth={auth}
            isLarge={isLarge}
          />
        )}
      </main>

      <nav
        className={`bg-[#F7F5F2]/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-[#EBE8E3] dark:border-[#2A2A2A] px-2 ${s('pt-2 pb-6', 'pt-2.5 pb-8')} flex justify-around items-center fixed bottom-0 w-full max-w-md z-40`}
      >
        <NavButton active={activeTab === 'home'} onClick={() => handleTabClick('home')} icon={Home} label="首頁" isLarge={isLarge} />
        <NavButton active={activeTab === 'calendar'} onClick={() => handleTabClick('calendar')} icon={CalendarIcon} label="月曆" isLarge={isLarge} />
        <NavButton active={activeTab === 'trend'} onClick={() => handleTabClick('trend')} icon={TrendingUp} label="趨勢" isLarge={isLarge} />
        <NavButton active={activeTab === 'settings'} onClick={() => handleTabClick('settings')} icon={Settings} label="設定" isLarge={isLarge} />
      </nav>

      <RecordModals
        modalState={modalState}
        setModalState={setModalState}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        isLarge={isLarge}
        records={records}
        activeProfile={activeProfile}
        handleSaveSettings={handleSaveSettings}
        setActiveTab={setActiveTab}
        setDraftProfile={setDraftProfile}
        updateProfile={updateProfile}
        handleDeleteData={handleDeleteData}
        handleSaveData={handleSaveData}
      />
    </div>
  );
}
