import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, CheckSquare, AlertCircle, 
  ChevronDown, ChevronRight, LayoutDashboard, 
  FileText, Plus, LogOut, Loader2, ArrowRight,
  Hexagon
} from 'lucide-react';

/**
 * 專案追蹤系統 - 前端主程式
 * 功能：登入驗證、活動概覽、父子任務進度計算、管理者與同仁權限區分
 */

// --- 設定區 ---
// 正式部署至 GitHub Pages 前，請將此處改為 false 並填入 GAS 網址
const USE_MOCK_DATA = false; 
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzeurryJ4gtk2EHdcDTbeGDbTXO7exOmh1qUZ_tlcp8VD6FfPdnMV9G_xPMG2881DjQ/exec"; // ★★★ 請在此貼上您的 Google Apps Script 網頁應用程式網址 ★★★

// 嘗試引入 Logo，若檔案不存在則會顯示預設圖示
let logo;
try {
  // 注意：這行在 Vite 環境中需要確保 src 目錄下有 logo.png
  // import logoImg from './logo.png'; 
  // logo = logoImg;
} catch (e) {
  logo = null;
}

// --- 模擬資料 (僅於 USE_MOCK_DATA = true 時使用) ---
const mockDB = {
  users: [
    { username: 'admin', password: '123', role: 'admin', name: '專案經理' },
    { username: 'staff', password: '123', role: 'staff', name: '專案同仁' },
  ],
  activities: [
    { id: 'A001', name: '2025 年度展示會', status: '進行中', startDate: '2025-01-01', endDate: '2025-12-31', manager: '專案經理' },
  ],
  tasks: [
    { id: 'T1', activityId: 'A001', code: '1', name: '場地籌備', status: 0, assignee: '專案經理', dueDate: '2025-03-01', type: 'ITEM', isParent: true },
    { id: 'T1-1', activityId: 'A001', code: '1.1', name: '租借場地確認', status: 100, assignee: '專案同仁', dueDate: '2025-02-15', type: 'ITEM', isParent: false },
    { id: 'T1-2', activityId: 'A001', code: '1.2', name: '簽署合約', status: 0, assignee: '專案經理', dueDate: '2025-03-01', type: 'ITEM', isParent: false },
  ]
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard'); 
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // 登入狀態
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // UI 控制狀態
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  // --- API 連線處理區 ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        const found = mockDB.users.find(u => u.username === username && u.password === password);
        if (found) {
          setUser(found);
          fetchData(found);
        } else {
          setError('帳號或密碼錯誤 (測試模式)');
          setLoading(false);
        }
      }, 800);
    } else {
      if (!GAS_API_URL) {
        setError("尚未設定後端 GAS API 網址");
        setLoading(false);
        return;
      }
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
        setError('系統連線錯誤，請檢查網路或 API 設定');
        setLoading(false);
      }
    }
  };

  const fetchData = async (currentUser) => {
    if (USE_MOCK_DATA) {
      let filteredTasks = mockDB.tasks;
      if (currentUser.role === 'staff') {
        filteredTasks = mockDB.tasks.filter(t => t.assignee === currentUser.name);
      }
      setActivities(mockDB.activities);
      setTasks(filteredTasks);
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
      } catch (err) {
        console.error("資料獲取失敗:", err);
      }
      setLoading(false);
    }
  };

  const handleCreateActivity = async (newActivity) => {
    if (!USE_MOCK_DATA) {
        setLoading(true);
        try {
          const response = await fetch(GAS_API_URL, {
              method: 'POST',
              body: JSON.stringify({
                  action: 'createActivity',
                  name: newActivity.name,
                  startDate: newActivity.startDate,
                  endDate: newActivity.endDate,
                  manager: user.name
              })
          });
          const res = await response.json();
          if (res.status === 'success') {
            fetchData(user); // 重新獲取最新資料
          }
        } catch (e) {
          console.error("建立活動失敗:", e);
        }
        setLoading(false);
    }
  };

  const updateTaskStatus = (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    if (!USE_MOCK_DATA) {
        fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateTask',
                taskId: taskId,
                status: newStatus
            })
        });
    }
  };

  // --- 計算邏輯：根據父子任務計算活動進度 ---
  const calculateProgress = useMemo(() => {
    const activityMap = {};
    activities.forEach(act => {
      const actTasks = tasks.filter(t => t.activityId === act.id);
      // 找出父任務 (代碼不含點，如 "1", "2")
      const parentTasks = actTasks.filter(t => !String(t.code).includes('.'));
      
      let totalParentProgress = 0;
      let parentCount = 0;

      const parentDetails = parentTasks.map(pTask => {
        // 找出屬於該父任務的子任務 (代碼如 "1.1", "1.2")
        const children = actTasks.filter(t => String(t.code).startsWith(`${pTask.code}.`));
        
        let pProgress = 0;
        if (children.length > 0) {
          // 父任務進度 = 已完成子任務數 / 總子任務數
          const completedCount = children.filter(c => Number(c.status) === 100).length;
          pProgress = Math.round((completedCount / children.length) * 100);
        } else {
          // 若無子任務，則取父任務自身的 status 欄位 (通常為 0 或 100)
          pProgress = Number(pTask.status) || 0;
        }

        totalParentProgress += pProgress;
        parentCount++;

        return {
          ...pTask,
          calculatedProgress: pProgress,
          totalChildren: children.length,
          completedChildren: children.filter(c => Number(c.status) === 100).length
        };
      });

      // 活動總進度 = 所有父任務進度的平均值
      const actProgress = parentCount > 0 ? Math.round(totalParentProgress / parentCount) : 0;
      
      activityMap[act.id] = {
        progress: actProgress,
        parentTasks: parentDetails,
        allTasks: actTasks
      };
    });
    return activityMap;
  }, [activities, tasks]);

  const isDelayed = (task) => {
    if (Number(task.status) === 100) return false;
    const today = new Date();
    const due = new Date(task.dueDate);
    return today > due;
  };

  // --- UI 組件 ---

  const LoginPage = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
             {logo ? (
               <img src={logo} alt="Logo" className="w-20 h-auto mb-4" />
             ) : (
               <div className="w-16 h-16 mb-4 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                  <Hexagon size={40} strokeWidth={1.5} />
               </div>
             )}
             <h2 className="text-2xl font-bold text-slate-800 tracking-tight">專案管考系統</h2>
             <p className="text-sm text-slate-500 mt-1">Project Tracking Management</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">系統帳號</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="輸入帳號"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">存取密碼</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="輸入密碼"
              />
            </div>
            
            {error && (
              <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-300 transition-all shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : '確認登入'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const ActivityDetailModal = ({ activityId, onClose }) => {
    const data = calculateProgress[activityId];
    if (!data) return null;

    const nestedTasks = data.parentTasks.map(p => {
        const children = data.allTasks.filter(t => String(t.code).startsWith(`${p.code}.`));
        return { parent: p, children };
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="w-full max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-2xl font-bold text-slate-800">專案明細控管</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">整體進度</span>
                <div className="w-64 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${data.progress}%` }}></div>
                </div>
                <span className="text-xl font-black text-blue-600 font-mono">{data.progress}%</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 space-y-8">
            {nestedTasks.map(({ parent, children }) => (
              <div key={parent.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center justify-center w-10 h-10 font-mono font-bold text-blue-600 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                          {parent.code}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg">{parent.name}</h4>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">{parent.type}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-500">
                           子項目: <span className="text-slate-800">{parent.completedChildren} / {parent.totalChildren}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-2 bg-slate-200 rounded-full">
                              <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${parent.calculatedProgress}%` }}></div>
                           </div>
                           <span className="text-sm font-black text-slate-700 w-10 text-right font-mono">{parent.calculatedProgress}%</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-tighter border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 w-16">項次</th>
                                <th className="px-6 py-3">任務項目名稱</th>
                                <th className="px-6 py-3">執行人</th>
                                <th className="px-6 py-3">截止期限</th>
                                <th className="px-6 py-3">當前狀態</th>
                                <th className="px-6 py-3 text-right">管理操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {children.map(child => (
                                <tr key={child.id} className="hover:bg-blue-50/20 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-slate-400 font-medium group-hover:text-blue-500">{child.code}</td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{child.name}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm border border-white">
                                          {(child.assignee || 'U')[0]}
                                        </div>
                                        <span className="text-slate-600 font-medium">{child.assignee}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${isDelayed(child) ? 'text-red-700 font-bold bg-red-50' : 'text-slate-500 font-medium'}`}>
                                        {child.dueDate}
                                        {isDelayed(child) && <AlertCircle className="w-3.5 h-3.5"/>}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {Number(child.status) === 100 ? (
                                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                                              <CheckSquare className="w-3.5 h-3.5"/> 已完成
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-slate-400 font-medium italic">進行中</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => updateTaskStatus(child.id, Number(child.status) === 100 ? 0 : 100)}
                                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                                Number(child.status) === 100 
                                                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                                            }`}
                                        >
                                            {Number(child.status) === 100 ? '取消' : '標記完成'}
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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAct, setNewAct] = useState({ name: '', startDate: '', endDate: '' });
    
    const ongoingActs = activities.filter(a => a.status === '進行中' || a.status === '洽談中');
    const allDelayedTasks = tasks.filter(t => !String(t.code).includes('.') && isDelayed(t));

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl shadow-xl shadow-blue-500/20 text-white relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] p-4 opacity-10 group-hover:scale-110 transition-transform">
              <LayoutDashboard size={120} />
            </div>
            <h3 className="text-blue-100/80 font-bold uppercase text-xs tracking-widest">Ongoing Projects</h3>
            <p className="text-5xl font-black mt-2 tracking-tighter">{ongoingActs.length}</p>
            <p className="text-xs text-blue-100/60 mt-4 font-medium italic">進行中案件統計</p>
          </div>
          
          <div className="p-6 bg-white border border-red-100 rounded-3xl shadow-xl shadow-red-500/10 relative overflow-hidden">
             <div className="absolute right-0 top-0 w-2 h-full bg-red-500"></div>
             <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Delayed Items</h3>
             <p className="text-5xl font-black mt-2 text-red-600 tracking-tighter">{allDelayedTasks.length}</p>
             <div className="mt-4 flex items-center gap-1 text-xs text-red-500 font-bold">
               <AlertCircle size={14} /> 需優先關注
             </div>
          </div>

          <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-500/10">
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Activities</h3>
            <p className="text-5xl font-black mt-2 text-slate-800 tracking-tighter">{activities.length}</p>
            <p className="text-xs text-slate-400 mt-4 font-medium italic">年度累計專案量</p>
          </div>
        </div>

        {allDelayedTasks.length > 0 && (
            <div className="bg-red-50/50 border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2 bg-red-50">
                    <AlertCircle className="w-5 h-5 text-red-600"/> 
                    <h4 className="font-black text-red-800 tracking-tight text-lg">嚴重延遲管考預警</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-red-100/40 text-red-700 font-black">
                            <tr>
                                <th className="px-6 py-3">所屬專案</th>
                                <th className="px-6 py-3">任務名稱</th>
                                <th className="px-6 py-3">負責人員</th>
                                <th className="px-6 py-3 text-right">原定期限</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100/50">
                            {allDelayedTasks.map(t => {
                                const act = activities.find(a => a.id === t.activityId);
                                return (
                                    <tr key={t.id} className="hover:bg-red-100/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-red-900">{act?.name}</td>
                                        <td className="px-6 py-4 text-red-800 font-medium">
                                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 mr-2 text-[10px]">{t.code}</span>
                                            {t.name}
                                        </td>
                                        <td className="px-6 py-4 text-red-800 font-medium">{t.assignee}</td>
                                        <td className="px-6 py-4 font-black text-red-600 text-right font-mono">{t.dueDate}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden shadow-slate-200/50">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">年度活動執行進度表</h3>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> 啟動新專案
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/30 text-xs font-black uppercase tracking-widest">
                  <th className="px-8 py-4 min-w-[200px]">活動專案名稱</th>
                  <th className="px-8 py-4">狀態</th>
                  <th className="px-8 py-4">專案負責</th>
                  <th className="px-8 py-4">結案期限</th>
                  <th className="px-8 py-4 min-w-[220px]">執行總進度</th>
                  <th className="px-8 py-4 text-right">動作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activities.map(act => {
                  const progData = calculateProgress[act.id] || { progress: 0 };
                  return (
                    <tr key={act.id} className="hover:bg-blue-50/30 transition-all group">
                      <td className="px-8 py-5 font-bold text-slate-800 text-base">{act.name}</td>
                      <td className="px-8 py-5">
                          <span className={`px-3 py-1 text-[10px] font-black rounded-full border tracking-tighter uppercase ${
                              act.status === '進行中' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              act.status === '已完成' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                              {act.status}
                          </span>
                      </td>
                      <td className="px-8 py-5 text-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-white shadow-sm">{(act.manager || 'U')[0]}</div>
                          <span className="font-medium">{act.manager}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-mono text-xs font-bold">{act.endDate}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1)" 
                              style={{ width: `${progData.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-black text-slate-700 w-10 text-right font-mono">{progData.progress}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => setSelectedActivityId(act.id)}
                          className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-auto group-hover:translate-x-1 transition-transform uppercase tracking-tighter"
                        >
                          Details <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="mb-6 text-2xl font-black text-slate-800 tracking-tight">啟動專案計畫</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">活動專案名稱</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium" 
                    placeholder="例如：2025 全球供應商大會"
                    value={newAct.name}
                    onChange={(e) => setNewAct({...newAct, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">啟動日期</label>
                        <input 
                            type="date"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                            value={newAct.startDate}
                            onChange={(e) => setNewAct({...newAct, startDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">預計結案</label>
                        <input 
                            type="date"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                            value={newAct.endDate}
                            onChange={(e) => setNewAct({...newAct, endDate: e.target.value})}
                        />
                    </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-10">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  放棄返回
                </button>
                <button 
                  onClick={() => { handleCreateActivity(newAct); setShowCreateModal(false); }}
                  className="px-6 py-3 text-sm font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                >
                  確認建立並派案
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedActivityId && (
            <ActivityDetailModal 
                activityId={selectedActivityId} 
                onClose={() => setSelectedActivityId(null)} 
            />
        )}
      </div>
    );
  };

  const StaffDashboard = () => {
    const myTasks = tasks.filter(t => t.assignee === user.name);
    const surveyTasks = myTasks.filter(t => t.type === 'SURVEY' && String(t.code).includes('.'));
    const itemTasks = myTasks.filter(t => t.type === 'ITEM' && String(t.code).includes('.'));

    const TaskCard = ({ task, actName }) => (
      <div className={`group p-5 bg-white border rounded-2xl shadow-sm transition-all hover:shadow-md hover:translate-y-[-2px] ${isDelayed(task) ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
        <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 tracking-tighter">
                {actName} · #{task.code}
            </span>
            <div className={`text-[11px] font-bold flex items-center gap-1 font-mono ${isDelayed(task) ? 'text-red-600' : 'text-slate-400'}`}>
                {isDelayed(task) && <AlertCircle className="w-3.5 h-3.5"/>}
                DEADLINE: {task.dueDate}
            </div>
        </div>
        <h4 className="font-bold text-slate-800 mb-4 text-lg leading-tight">{task.name}</h4>
        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase ${Number(task.status) === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-600'}`}>
                {Number(task.status) === 100 ? 'Completed' : 'Pending'}
            </span>
            <button 
                onClick={() => updateTaskStatus(task.id, Number(task.status) === 100 ? 0 : 100)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100"
            >
                {Number(task.status) === 100 ? '取消完成' : '回報完成'}
            </button>
        </div>
      </div>
    );

    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h3 className="flex items-center gap-2 mb-6 text-lg font-black text-slate-700 border-b-2 border-blue-500/20 pb-3 tracking-tight">
             <CheckSquare className="w-5 h-5 text-blue-500"/> 個人交辦事項 (Task Items)
          </h3>
          <div className="space-y-4">
            {itemTasks.map(t => {
                const act = activities.find(a => a.id === t.activityId);
                return <TaskCard key={t.id} task={t} actName={act?.name || '專案'} />;
            })}
            {itemTasks.length === 0 && <p className="text-slate-400 text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-medium">目前暫無待辦事項</p>}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 mb-6 text-lg font-black text-slate-700 border-b-2 border-purple-500/20 pb-3 tracking-tight">
             <FileText className="w-5 h-5 text-purple-500"/> 場地勘查項目 (Site Survey)
          </h3>
          <div className="space-y-4">
            {surveyTasks.map(t => {
                const act = activities.find(a => a.id === t.activityId);
                return <TaskCard key={t.id} task={t} actName={act?.name || '專案'} />;
            })}
            {surveyTasks.length === 0 && <p className="text-slate-400 text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-medium">目前暫無勘查項目</p>}
          </div>
        </div>
      </div>
    );
  };

  // --- 主畫面配置 ---

  if (!user) return <LoginPage />;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 側邊導覽列 */}
      <div className="flex flex-col w-72 bg-slate-900 text-white shadow-2xl z-30">
        <div className="flex items-center gap-3 px-8 h-24 text-xl font-black border-b border-slate-800 bg-slate-900/50">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
            <Hexagon size={24} />
          </div>
          <span className="tracking-tighter uppercase">PMS System</span>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex items-center w-full gap-4 p-4 rounded-2xl font-bold transition-all duration-200 ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/50 translate-x-2' : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-2'}`}
          >
            <LayoutDashboard size={20} /> 總覽儀表板
          </button>
          
          <div className="mt-auto mb-4 pt-8 border-t border-slate-800">
            <div className="flex items-center gap-4 px-4 py-4 bg-slate-800/40 rounded-2xl border border-slate-800 shadow-inner">
              <div className="flex items-center justify-center w-10 h-10 font-black text-blue-800 bg-blue-100 rounded-xl shadow-sm">
                {(user.name || 'U')[0]}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-black truncate">{user.name}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.role === 'admin' ? 'Administrator' : 'Staff Member'}</div>
              </div>
            </div>
            <button 
                onClick={() => setUser(null)}
                className="flex items-center w-full gap-4 p-4 mt-6 text-red-400 font-bold rounded-2xl hover:bg-red-500/10 hover:text-red-300 transition-all group"
            >
                <LogOut size={20} className="group-hover:rotate-12 transition-transform" /> 登出系統
            </button>
          </div>
        </nav>
      </div>

      {/* 主要內容區域 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between px-10 py-6 bg-white border-b border-slate-200 shadow-sm z-20">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {view === 'dashboard' && (user.role === 'admin' ? '管理者管考視窗' : '專案同仁作業台')}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Control Center / Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 font-mono shadow-sm">
              TODAY: {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-10 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {user.role === 'admin' ? <AdminDashboard /> : <StaffDashboard />}
          </div>
          <footer className="mt-20 pt-8 border-t border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Project Tracking System v2.0 © 2025</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;