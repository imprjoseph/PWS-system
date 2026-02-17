import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, CheckSquare, AlertCircle, 
  ChevronDown, ChevronRight, LayoutDashboard, 
  FileText, Plus, LogOut, Loader2, ArrowRight,
  Target, Clock, BarChart3, Bell, CheckCircle2,
  Briefcase, Search, Filter
} from 'lucide-react';

/**
 * 專案追蹤系統 - impr 新動力公關 企業版
 * * 修改重點：
 * 1. 視覺設計：採用 logo 中的橘色 (#F28C00) 為主色，搭配深色灰階與純白，營造專業公關公司質感。
 * 2. 排版優化：採用全寬式響應式佈局，資訊分層清晰。
 * 3. 圖片整合：預留 logo.png 引用位置。
 */

// --- 設定區 ---
const USE_MOCK_DATA = true; // 預設開啟測試模式，讓您直接看畫面。上線時請改為 false。
const GAS_API_URL = "";     // 填入您的 Google Apps Script 網址

// 嘗試引用 logo.png (在您的本地環境請確保 src 資料夾內有此檔案)
const logoImg = "./logo.png"; 

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard'); 
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // 登入狀態 (帳密在這裡設定)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  // --- API 處理區 ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (username === "" || password === "") {
        setError('請輸入帳號與密碼');
        setLoading(false);
        return;
    }

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        const mockUsers = [
          { username: 'admin', password: '123', role: 'admin', name: '專案總監' },
          { username: 'staff', password: '123', role: 'staff', name: '王小明' }
        ];
        const found = mockUsers.find(u => u.username === username && u.password === password);
        if (found) {
          setUser(found);
          fetchData(found);
        } else {
          setError('帳號或密碼不正確');
          setLoading(false);
        }
      }, 800);
    } else {
      try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username, password })
        });
        const res = await response.json();
        if (res.status === 'success') {
            setUser(res.user);
            fetchData(res.user);
        } else {
            setError(res.message || '登入失敗');
            setLoading(false);
        }
      } catch (err) {
        setError('連線至伺服器失敗');
        setLoading(false);
      }
    }
  };

  const fetchData = async (currentUser) => {
    if (USE_MOCK_DATA) {
      setActivities([
        { id: 'A01', name: '2025 全球電子展公關專案', status: '進行中', startDate: '2025-01-10', endDate: '2025-05-20', manager: '專案總監' },
        { id: 'A02', name: '新品牌上市媒體發表會', status: '洽談中', startDate: '2025-03-01', endDate: '2025-04-15', manager: '專案總監' }
      ]);
      setTasks([
        { id: 'T1', activityId: 'A01', code: '1', name: '媒體名單整理', status: 0, assignee: '專案總監', dueDate: '2025-03-01', type: 'ITEM' },
        { id: 'T2', activityId: 'A01', code: '1.1', name: '科技線記者名單確認', status: 100, assignee: '王小明', dueDate: '2025-02-15', type: 'ITEM' },
        { id: 'T3', activityId: 'A01', code: '1.2', name: '財經線記者預約', status: 50, assignee: '王小明', dueDate: '2025-02-28', type: 'ITEM' },
        { id: 'T4', activityId: 'A01', code: '2', name: '場地勘查', status: 0, assignee: '王小明', dueDate: '2025-03-10', type: 'SURVEY' },
        { id: 'T5', activityId: 'A01', code: '2.1', name: '展覽館 101 會議室確認', status: 0, assignee: '王小明', dueDate: '2025-03-05', type: 'SURVEY' }
      ]);
      setLoading(false);
    } else {
       try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'getData', role: currentUser.role, name: currentUser.name }) 
        });
        const data = await response.json();
        if (data.status === 'success') {
          setActivities(data.activities);
          setTasks(data.tasks);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    }
  };

  const updateTaskStatus = (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (!USE_MOCK_DATA) {
        fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateTask', taskId, status: newStatus })
        });
    }
  };

  // --- 進度計算邏輯 ---
  const calculateProgress = useMemo(() => {
    const activityMap = {};
    activities.forEach(act => {
      const actTasks = tasks.filter(t => t.activityId === act.id);
      const parentTasks = actTasks.filter(t => !String(t.code).includes('.'));
      let totalParentProgress = 0;
      let parentCount = 0;

      const parentDetails = parentTasks.map(pTask => {
        const children = actTasks.filter(t => String(t.code).startsWith(`${pTask.code}.`));
        let pProgress = 0;
        if (children.length > 0) {
            pProgress = Math.round((children.filter(c => Number(c.status) === 100).length / children.length) * 100);
        } else {
            pProgress = Number(pTask.status);
        }
        totalParentProgress += pProgress;
        parentCount++;
        return { ...pTask, calculatedProgress: pProgress, totalChildren: children.length, completedChildren: children.filter(c => Number(c.status) === 100).length };
      });

      activityMap[act.id] = {
        progress: parentCount > 0 ? Math.round(totalParentProgress / parentCount) : 0,
        parentTasks: parentDetails,
        allTasks: actTasks
      };
    });
    return activityMap;
  }, [activities, tasks]);

  const isDelayed = (task) => {
    if (Number(task.status) === 100) return false;
    return new Date() > new Date(task.dueDate);
  };

  // --- UI 元件 ---

  const LoginPage = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* 背景漸層點綴 */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#F28C00]/5 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10 px-6">
        <div className="bg-white rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
          <div className="p-10 text-center">
            <div className="mb-8 flex justify-center">
               <img 
                 src={logoImg} 
                 alt="impr Logo" 
                 className="h-20 w-auto object-contain"
                 onError={(e) => { e.target.src = "https://via.placeholder.com/200x80?text=impr+Logo"; }}
               />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">專案管考系統</h2>
            <p className="text-slate-400 font-medium text-sm mt-1">Impetus Public Relations</p>
          </div>

          <form onSubmit={handleLogin} className="px-10 pb-12 space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">帳號 Username</label>
              <input 
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#F28C00] transition-all font-bold text-slate-700 placeholder:text-slate-300"
                placeholder="請輸入帳號"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">密碼 Password</label>
              <input 
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#F28C00] transition-all font-bold text-slate-700 placeholder:text-slate-300"
                placeholder="請輸入密碼"
              />
            </div>
            {error && (
              <div className="text-xs text-rose-500 bg-rose-50 p-4 rounded-2xl flex items-center gap-2 border border-rose-100 font-bold">
                <AlertCircle size={14}/>{error}
              </div>
            )}
            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#F28C00] text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-200 hover:bg-[#D97D00] transition-all active:scale-[0.98] disabled:bg-slate-300"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : '確認登入'}
            </button>
          </form>
        </div>
        <p className="mt-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">© 2025 Impetus PR Consultants Co., Ltd.</p>
      </div>
    </div>
  );

  const ActivityDetailModal = ({ activityId, onClose }) => {
    const data = calculateProgress[activityId];
    if (!data) return null;
    const nested = data.parentTasks.map(p => ({ 
      parent: p, 
      children: data.allTasks.filter(t => String(t.code).startsWith(`${p.code}.`)) 
    }));

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
          <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-2xl font-black text-slate-800">專案執行細節</h3>
              <div className="flex items-center gap-4 mt-3">
                <div className="h-3 w-64 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-[#F28C00] transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)" style={{ width: `${data.progress}%` }}></div>
                </div>
                <span className="text-2xl font-black text-[#F28C00] font-mono">{data.progress}%</span>
              </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-all shadow-sm">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-10 bg-[#FBFBFE] space-y-10">
            {nested.map(({ parent, children }) => (
              <div key={parent.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 bg-slate-50/20">
                  <div className="flex items-center gap-4">
                    <span className="w-12 h-12 bg-orange-50 text-[#F28C00] rounded-2xl flex items-center justify-center font-mono font-black text-lg border border-orange-100">{parent.code}</span>
                    <div>
                      <h4 className="font-black text-slate-800 text-lg">{parent.name}</h4>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#F28C00] bg-orange-50 px-2 py-0.5 rounded-lg">{parent.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 bg-white px-5 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">任務進度</p>
                       <p className="font-bold text-slate-700 text-sm">{parent.completedChildren} / {parent.totalChildren}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl border-2 border-orange-50 flex items-center justify-center">
                        <span className="text-sm font-black text-[#F28C00]">{parent.calculatedProgress}%</span>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-2">
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-slate-50">
                      {children.map(child => (
                        <tr key={child.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-5 font-mono text-slate-300 text-[10px] w-14 font-bold">{child.code}</td>
                          <td className="py-5 font-bold text-slate-700">{child.name}</td>
                          <td className="py-5">
                            <div className="flex items-center gap-2 font-medium text-slate-500 text-xs">
                                <div className="w-6 h-6 bg-[#F28C00]/10 rounded-full flex items-center justify-center text-[10px] font-black text-[#F28C00] border border-white">{(child.assignee || 'U')[0]}</div>
                                {child.assignee}
                            </div>
                          </td>
                          <td className="py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black ${isDelayed(child) ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-400'}`}>
                              {child.dueDate} {isDelayed(child) && <AlertCircle size={12}/>}
                            </span>
                          </td>
                          <td className="py-5 text-right">
                             <button 
                              onClick={() => updateTaskStatus(child.id, Number(child.status) === 100 ? 0 : 100)}
                              className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all shadow-sm ${Number(child.status) === 100 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-900 text-white hover:bg-[#F28C00] active:scale-95'}`}
                             >
                               {Number(child.status) === 100 ? '已完成 ✓' : '回報完成'}
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AdminDashboard = () => {
    const ongoing = activities.filter(a => a.status === '進行中' || a.status === '洽談中');
    const delayed = tasks.filter(t => !String(t.code).includes('.') && isDelayed(t));

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: '進行中專案', val: ongoing.length, color: 'from-[#F28C00] to-orange-600 shadow-orange-200', icon: Target },
            { label: '延遲風險任務', val: delayed.length, color: 'from-rose-500 to-pink-600 shadow-rose-200', icon: AlertCircle },
            { label: '本年度總件數', val: activities.length, color: 'from-slate-800 to-slate-900 shadow-slate-200', icon: BarChart3 },
          ].map((card, i) => (
            <div key={i} className={`p-8 bg-gradient-to-br ${card.color} rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group hover:translate-y-[-4px] transition-all`}>
               <card.icon className="absolute right-[-10px] bottom-[-10px] w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
               <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none">{card.label}</p>
               <h4 className="text-6xl font-black mt-4 tracking-tighter leading-none">{card.val}</h4>
               <div className="mt-8 flex items-center gap-2 text-[10px] font-black opacity-80 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                 Live Update <Clock size={10}/>
               </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-50 overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Briefcase size={24} className="text-[#F28C00]"/> 年度活動管考表</h3>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#F28C00] text-white font-black rounded-2xl hover:bg-[#D97D00] shadow-xl shadow-orange-100 transition-all active:scale-95 text-sm">
              <Plus size={18}/> 建立新活動
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-50 bg-slate-50/10">
                  <th className="px-10 py-5">專案活動名稱</th>
                  <th className="px-6 py-5 text-center">當前狀態</th>
                  <th className="px-6 py-5">負責主管</th>
                  <th className="px-10 py-5 w-[320px]">執行總進度</th>
                  <th className="px-10 py-5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activities.map(act => {
                  const prog = calculateProgress[act.id]?.progress || 0;
                  return (
                    <tr key={act.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-10 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-lg leading-tight group-hover:text-[#F28C00] transition-colors">{act.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono mt-1 uppercase">Due: {act.endDate} · {act.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase border shadow-sm ${act.status === '進行中' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {act.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 font-bold text-slate-600 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">{act.manager[0]}</div>
                            {act.manager}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#F28C00] rounded-full transition-all duration-1000" style={{ width: `${prog}%` }}></div>
                          </div>
                          <span className="text-sm font-black text-slate-700 font-mono w-10 text-right">{prog}%</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button onClick={() => setSelectedActivityId(act.id)} className="px-4 py-2 bg-slate-50 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-[#F28C00] hover:text-white transition-all shadow-sm active:scale-90">
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const StaffDashboard = () => {
    const myTasks = tasks.filter(t => t.assignee === user.name && String(t.code).includes('.'));
    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex items-center justify-between mb-10">
           <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">個人專案工作台</h2>
              <p className="text-slate-400 font-medium mt-2">你好 {user.name}，今日有 <span className="text-[#F28C00] font-black">{myTasks.filter(t => Number(t.status) !== 100).length}</span> 項待辦任務需處理</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {myTasks.map(t => {
              const act = activities.find(a => a.id === t.activityId);
              const delayed = isDelayed(t);
              const completed = Number(t.status) === 100;
              return (
                <div key={t.id} className={`p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-lg shadow-slate-100 hover:shadow-2xl hover:translate-y-[-4px] transition-all group ${delayed ? 'border-rose-100' : ''}`}>
                   <div className="flex justify-between items-start mb-6">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${delayed ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                         {act?.name || '專案'} · #{t.code}
                      </span>
                      {delayed && <div className="animate-pulse bg-rose-500 w-2 h-2 rounded-full shadow-lg shadow-rose-200"></div>}
                   </div>
                   <h4 className="text-2xl font-black text-slate-800 mb-6 leading-tight group-hover:text-[#F28C00] transition-colors">{t.name}</h4>
                   <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">截止期限</span>
                         <span className={`font-mono text-sm font-bold ${delayed ? 'text-rose-600' : 'text-slate-700'}`}>{t.dueDate}</span>
                      </div>
                      <button 
                        onClick={() => updateTaskStatus(t.id, completed ? 0 : 100)}
                        className={`px-8 py-3 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 ${completed ? 'bg-emerald-50 text-emerald-600 shadow-none border border-emerald-100' : 'bg-slate-900 text-white shadow-slate-200 hover:bg-[#F28C00]'}`}
                      >
                         {completed ? <><CheckCircle2 size={14}/> 已完成</> : '回報完成'}
                      </button>
                   </div>
                </div>
              );
           })}
           {myTasks.length === 0 && (
              <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black text-xl tracking-tight">目前暫無派發任務項目</p>
              </div>
           )}
        </div>
      </div>
    );
  };

  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* 側邊導覽列 */}
      <div className="w-80 bg-slate-900 m-6 mr-0 rounded-[2.5rem] shadow-[20px_0_60px_-20px_rgba(0,0,0,0.4)] flex flex-col text-white z-50 overflow-hidden">
        <div className="p-10 pt-12">
          <div className="flex flex-col items-center gap-4 mb-14">
            <img 
              src={logoImg} 
              alt="Logo" 
              className="h-16 w-auto object-contain brightness-0 invert" 
              onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
            />
            <div className="hidden text-center">
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-[#F28C00]">PMS<br/><span className="text-white text-[10px] tracking-[0.4em]">SYSTEM</span></h1>
            </div>
          </div>
          
          <nav className="space-y-4">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black transition-all ${view === 'dashboard' ? 'bg-[#F28C00] shadow-2xl shadow-orange-600/40 translate-x-2' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <LayoutDashboard size={22} /> 總覽儀表板
            </button>
            <button className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-slate-500 hover:text-white hover:bg-white/5 transition-all">
              <Calendar size={22} /> 專案行事曆
            </button>
            <button className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-slate-500 hover:text-white hover:bg-white/5 transition-all">
              <Bell size={22} /> 系統公告
            </button>
          </nav>
        </div>
        
        <div className="mt-auto p-10">
          <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 shadow-inner">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-tr from-orange-400 to-[#F28C00] rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-orange-500/20">{(user.name || 'U')[0]}</div>
                <div className="overflow-hidden">
                   <p className="text-sm font-black truncate">{user.name}</p>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{user.role}</p>
                </div>
             </div>
             <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 text-rose-500 rounded-xl font-black text-xs hover:bg-rose-500 hover:text-white transition-all active:scale-95">
               <LogOut size={14}/> 登出系統
             </button>
          </div>
        </div>
      </div>

      {/* 右側主要內容區 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="px-12 py-10 flex justify-between items-center">
           <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Navigation / {view}</h2>
              <p className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                {user.role === 'admin' ? '管理者管考儀表板' : '同仁工作台'}
              </p>
           </div>
           <div className="flex items-center gap-4">
              <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-50 text-xs font-black text-slate-500 font-mono flex items-center gap-3">
                <Clock size={14} className="text-[#F28C00]"/>
                {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </div>
           </div>
        </header>

        <main className="flex-1 overflow-auto px-12 pb-12">
          <div className="max-w-7xl mx-auto">
             {user.role === 'admin' ? <AdminDashboard /> : <StaffDashboard />}
          </div>
          
          <footer className="mt-24 pt-10 border-t border-slate-100 text-center">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] leading-none">impr Impetus PR Consultants Co., Ltd. © 2025 v2.0</p>
          </footer>
        </main>
      </div>

      {/* 彈出視窗 */}
      {selectedActivityId && (
        <ActivityDetailModal 
          activityId={selectedActivityId} 
          onClose={() => setSelectedActivityId(null)} 
        />
      )}
    </div>
  );
};

export default App;