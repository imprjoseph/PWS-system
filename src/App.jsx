import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, CheckSquare, AlertCircle, 
  ChevronDown, ChevronRight, LayoutDashboard, 
  FileText, Plus, LogOut, Loader2
} from 'lucide-react';

// --- 設定區 ---
// 部署時請改為 false 並填入你的 Google Apps Script 網址
const USE_MOCK_DATA = false; 
const GAS_API_URL = "https://docs.google.com/spreadsheets/d/1avSAEzLmrJPnEA5hU01IoN5enqWqfF_hFBPEoFaaOR8/edit?gid=1321463893#gid=1321463893"; 

// --- 模擬資料 (Mock Data) ---
const mockDB = {
  users: [
    { username: 'admin', password: '123', role: 'admin', name: '專案經理' },
    { username: 'staff', password: '123', role: 'staff', name: '小明' },
  ],
  activities: [
    { id: 'A001', name: '2024 年度大會', status: '進行中', startDate: '2024-01-01', endDate: '2024-12-31', manager: '專案經理' },
    { id: 'A002', name: '新產品發表會', status: '洽談中', startDate: '2024-06-01', endDate: '2024-08-01', manager: '專案經理' },
  ],
  tasks: [
    // 專案 A001 的結構
    // 父任務 1
    { id: 'T1', activityId: 'A001', code: '1', name: '前期規劃', status: 0, assignee: '專案經理', dueDate: '2024-02-01', type: 'ITEM', isParent: true },
    { id: 'T1-1', activityId: 'A001', code: '1.1', name: '場地確認', status: 100, assignee: '小明', dueDate: '2024-01-15', type: 'ITEM', isParent: false },
    { id: 'T1-2', activityId: 'A001', code: '1.2', name: '預算編列', status: 100, assignee: '專案經理', dueDate: '2024-01-20', type: 'ITEM', isParent: false },
    
    // 父任務 2 (有延遲)
    { id: 'T2', activityId: 'A001', code: '2', name: '場地勘查', status: 0, assignee: '小明', dueDate: '2024-03-01', type: 'SURVEY', isParent: true },
    { id: 'T2-1', activityId: 'A001', code: '2.1', name: '消防檢查', status: 0, assignee: '小明', dueDate: '2024-02-01', type: 'SURVEY', isParent: false }, // Delayed
    { id: 'T2-2', activityId: 'A001', code: '2.2', name: '動線規劃', status: 0, assignee: '小明', dueDate: '2024-03-01', type: 'SURVEY', isParent: false },

    // 專案 A002 (剛開始)
    { id: 'T3', activityId: 'A002', code: '1', name: '需求訪談', status: 0, assignee: '專案經理', dueDate: '2024-06-10', type: 'ITEM', isParent: true },
    { id: 'T3-1', activityId: 'A002', code: '1.1', name: '初次會議', status: 0, assignee: '專案經理', dueDate: '2024-06-10', type: 'ITEM', isParent: false },
  ]
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard'); // dashboard, activity, tasks
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // UI State
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  // --- API 處理區 ---
  
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
          setError('帳號或密碼錯誤');
          setLoading(false);
        }
      }, 800);
    } else {
      // Real API Call
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
            setError(res.message);
            setLoading(false);
        }
      } catch (err) {
        setError('連線錯誤');
        setLoading(false);
      }
    }
  };

  const fetchData = async (currentUser) => {
    // Fetch Activities and Tasks
    if (USE_MOCK_DATA) {
      let filteredTasks = mockDB.tasks;
      if (currentUser.role === 'staff') {
        filteredTasks = mockDB.tasks.filter(t => t.assignee === currentUser.name);
      }
      setActivities(mockDB.activities);
      setTasks(filteredTasks);
      setLoading(false);
    } else {
      // Real API implementation would go here
      // const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', role: currentUser.role, name: currentUser.name }) });
      // const data = await response.json();
      // setActivities(data.activities);
      // setTasks(data.tasks);
      setLoading(false);
    }
  };

  const handleCreateActivity = (newActivity) => {
    // 模擬新增活動與複製 Template 邏輯
    const newId = `A${Date.now()}`;
    const activityObj = {
      id: newId,
      name: newActivity.name,
      status: '洽談中',
      startDate: newActivity.startDate,
      endDate: newActivity.endDate,
      manager: user.name,
      progress: 0
    };

    // 模擬從 Template 複製並產生 Tasks
    const templateTasks = [
      { code: '1', name: '籌備啟動', type: 'ITEM', isParent: true },
      { code: '1.1', name: '工作小組成立', type: 'ITEM', isParent: false },
      { code: '1.2', name: '預算審核', type: 'ITEM', isParent: false },
      { code: '2', name: '現場勘查', type: 'SURVEY', isParent: true },
      { code: '2.1', name: '丈量尺寸', type: 'SURVEY', isParent: false },
    ];

    const newGeneratedTasks = templateTasks.map((t, idx) => ({
      id: `${newId}-T${idx}`,
      activityId: newId,
      code: t.code,
      name: t.name,
      status: 0,
      assignee: user.name, // 預設給建立者
      dueDate: newActivity.endDate,
      type: t.type,
      isParent: t.isParent
    }));

    setActivities([...activities, activityObj]);
    setTasks([...tasks, ...newGeneratedTasks]);
    // 實際應用需呼叫後端 API: createActivity
  };

  const updateTaskStatus = (taskId, newStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
    // In real app, send API request here: updateTask
  };

  // --- 計算邏輯 (核心需求) ---

  const calculateProgress = useMemo(() => {
    // 1. Group Tasks by Activity
    const activityMap = {};

    activities.forEach(act => {
      const actTasks = tasks.filter(t => t.activityId === act.id);
      
      // Group by Parent Code (Assuming code format "1", "1.1")
      // Find all parent codes first
      const parentTasks = actTasks.filter(t => !t.code.includes('.'));
      
      let totalParentProgress = 0;
      let parentCount = 0;

      const parentDetails = parentTasks.map(pTask => {
        // Find children: code starts with "pTask.code."
        const children = actTasks.filter(t => t.code.startsWith(`${pTask.code}.`));
        
        let pProgress = 0;
        if (children.length > 0) {
          const completedCount = children.filter(c => c.status === 100).length;
          pProgress = Math.round((completedCount / children.length) * 100);
        } else {
            // 如果沒有子任務，直接看父任務自己是否完成 (fallback)
            pProgress = pTask.status;
        }

        totalParentProgress += pProgress;
        parentCount++;

        return {
          ...pTask,
          calculatedProgress: pProgress,
          totalChildren: children.length,
          completedChildren: children.filter(c => c.status === 100).length
        };
      });

      const actProgress = parentCount > 0 ? Math.round(totalParentProgress / parentCount) : 0;
      
      activityMap[act.id] = {
        progress: actProgress,
        parentTasks: parentDetails,
        allTasks: actTasks
      };
    });

    return activityMap;
  }, [activities, tasks]);

  // --- 輔助函式 ---
  const isDelayed = (task) => {
    if (task.status === 100) return false;
    const today = new Date();
    const due = new Date(task.dueDate);
    return today > due;
  };

  // --- 頁面組件 ---

  const LoginPage = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">專案追蹤系統</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">帳號</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 mt-1 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="admin / staff"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">密碼</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 mt-1 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="123"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : '登入'}
          </button>
        </form>
        <div className="mt-4 text-xs text-center text-gray-400">
           Demo: admin/123 or staff/123
        </div>
      </div>
    </div>
  );

  const ActivityDetailModal = ({ activityId, onClose }) => {
    const data = calculateProgress[activityId];
    if (!data) return null;

    // 將任務整理為巢狀結構以便顯示
    const nestedTasks = data.parentTasks.map(p => {
        const children = data.allTasks.filter(t => t.code.startsWith(`${p.code}.`));
        return { parent: p, children };
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl m-4">
          <div className="sticky top-0 z-10 flex justify-between p-4 bg-white border-b">
            <div>
              <h3 className="text-xl font-bold text-gray-800">專案管考明細</h3>
              <p className="text-sm text-gray-500">
                專案完成率: <span className="text-lg font-bold text-blue-600">{data.progress}%</span> 
                (依據父項目完成比率計算)
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          
          <div className="p-4 space-y-4">
            {nestedTasks.map(({ parent, children }) => (
              <div key={parent.id} className="border rounded-lg">
                {/* 父任務 Header */}
                <div className="flex items-center justify-between p-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-600">{parent.code}</span>
                        <span className="font-semibold text-gray-800">{parent.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-200 rounded text-gray-600">{parent.type}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            子任務: {parent.completedChildren}/{parent.totalChildren}
                        </div>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div 
                                className="h-2 bg-blue-500 rounded-full" 
                                style={{ width: `${parent.calculatedProgress}%` }}
                            ></div>
                        </div>
                        <span className="text-sm font-bold w-9">{parent.calculatedProgress}%</span>
                    </div>
                </div>

                {/* 子任務列表 */}
                <div className="p-3 bg-white border-t">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 border-b">
                            <tr>
                                <th className="pb-2 w-14">項次</th>
                                <th className="pb-2">子項目名稱</th>
                                <th className="pb-2">負責人</th>
                                <th className="pb-2">期限</th>
                                <th className="pb-2">狀態</th>
                                <th className="pb-2 text-right">回報</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {children.map(child => (
                                <tr key={child.id} className="hover:bg-gray-50">
                                    <td className="py-2 font-mono text-gray-500">{child.code}</td>
                                    <td className="py-2">{child.name}</td>
                                    <td className="py-2 text-gray-600">{child.assignee}</td>
                                    <td className={`py-2 ${isDelayed(child) ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                        {child.dueDate}
                                        {isDelayed(child) && <AlertCircle className="inline w-4 h-4 ml-1"/>}
                                    </td>
                                    <td className="py-2">
                                        {child.status === 100 ? (
                                            <span className="text-green-600 flex items-center gap-1"><CheckSquare className="w-4 h-4"/> 完成</span>
                                        ) : (
                                            <span className="text-gray-400">進行中</span>
                                        )}
                                    </td>
                                    <td className="py-2 text-right">
                                        <button 
                                            onClick={() => updateTaskStatus(child.id, child.status === 100 ? 0 : 100)}
                                            className={`px-3 py-1 rounded text-xs ${
                                                child.status === 100 
                                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                        >
                                            {child.status === 100 ? '重置' : '標記完成'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {children.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-2 text-center text-gray-400">無子項目</td>
                                </tr>
                            )}
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

    // 統計資料
    const ongoingActs = activities.filter(a => a.status === '進行中' || a.status === '洽談中');
    // 找出所有延遲任務
    const allDelayedTasks = tasks.filter(t => !t.isParent && isDelayed(t));

    return (
      <div className="space-y-6">
        {/* 概覽卡片 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="p-4 bg-white border-l-4 border-blue-500 rounded shadow">
            <h3 className="text-gray-500">進行中案件</h3>
            <p className="text-3xl font-bold">{ongoingActs.length}</p>
          </div>
          <div className="p-4 bg-white border-l-4 border-red-500 rounded shadow">
            <h3 className="text-gray-500">延遲項目列表</h3>
            <p className="text-3xl font-bold text-red-600">{allDelayedTasks.length}</p>
          </div>
          <div className="p-4 bg-white border-l-4 border-green-500 rounded shadow">
            <h3 className="text-gray-500">本年度總案件</h3>
            <p className="text-3xl font-bold">{activities.length}</p>
          </div>
        </div>

        {/* 延遲項目警告區 */}
        {allDelayedTasks.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="flex items-center gap-2 mb-2 font-bold text-red-700">
                    <AlertCircle className="w-5 h-5"/> 嚴重延遲項目
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-red-900">
                        <thead>
                            <tr>
                                <th className="pb-1">專案</th>
                                <th className="pb-1">任務</th>
                                <th className="pb-1">負責人</th>
                                <th className="pb-1">期限</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allDelayedTasks.map(t => {
                                const act = activities.find(a => a.id === t.activityId);
                                return (
                                    <tr key={t.id} className="border-t border-red-200">
                                        <td className="py-2">{act?.name}</td>
                                        <td className="py-2">{t.code} {t.name}</td>
                                        <td className="py-2">{t.assignee}</td>
                                        <td className="py-2">{t.dueDate}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* 活動列表 */}
        <div className="p-6 bg-white rounded shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">近一年活動進度</h3>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> 新增活動
            </button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="p-2">活動名稱</th>
                <th className="p-2">狀態</th>
                <th className="p-2">負責人</th>
                <th className="p-2">期限</th>
                <th className="p-2">總進度</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(act => {
                const progData = calculateProgress[act.id] || { progress: 0 };
                return (
                  <tr key={act.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{act.name}</td>
                    <td className="p-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            act.status === '進行中' ? 'bg-blue-100 text-blue-800' :
                            act.status === '已完成' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                            {act.status}
                        </span>
                    </td>
                    <td className="p-2 text-gray-600">{act.manager}</td>
                    <td className="p-2 text-gray-600">{act.endDate}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${progData.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{progData.progress}%</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <button 
                        onClick={() => setSelectedActivityId(act.id)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        管考細節
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 新增活動 Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md p-6 bg-white rounded shadow-lg">
              <h3 className="mb-4 text-lg font-bold">新增活動</h3>
              <div className="space-y-3">
                <input 
                  className="w-full p-2 border rounded" 
                  placeholder="活動名稱"
                  value={newAct.name}
                  onChange={(e) => setNewAct({...newAct, name: e.target.value})}
                />
                <input 
                  type="date"
                  className="w-full p-2 border rounded" 
                  placeholder="開始日期"
                  value={newAct.startDate}
                  onChange={(e) => setNewAct({...newAct, startDate: e.target.value})}
                />
                <input 
                  type="date"
                  className="w-full p-2 border rounded" 
                  placeholder="結束日期"
                  value={newAct.endDate}
                  onChange={(e) => setNewAct({...newAct, endDate: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  取消
                </button>
                <button 
                  onClick={() => { handleCreateActivity(newAct); setShowCreateModal(false); }}
                  className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  建立並複製範本
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 詳細 Modal */}
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
    // Staff 只看到自己的 Tasks
    const myTasks = tasks.filter(t => t.assignee === user.name);
    // 分類
    const surveyTasks = myTasks.filter(t => t.type === 'SURVEY' && !t.isParent);
    const itemTasks = myTasks.filter(t => t.type === 'ITEM' && !t.isParent);

    const TaskCard = ({ task, actName }) => (
      <div className={`p-3 mb-2 bg-white border rounded shadow-sm ${isDelayed(task) ? 'border-red-300 bg-red-50' : ''}`}>
        <div className="flex justify-between">
            <div className="text-xs text-gray-500">{actName} | {task.code}</div>
            <div className={`text-xs ${isDelayed(task) ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                期限: {task.dueDate}
            </div>
        </div>
        <div className="my-1 font-medium">{task.name}</div>
        <div className="flex items-center justify-between mt-2">
            <span className={`text-xs px-2 py-0.5 rounded ${task.status === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {task.status === 100 ? '已完成' : '進行中'}
            </span>
            <button 
                onClick={() => updateTaskStatus(task.id, task.status === 100 ? 0 : 100)}
                className="text-sm text-blue-600 underline"
            >
                {task.status === 100 ? '取消完成' : '回報完成'}
            </button>
        </div>
      </div>
    );

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-700">
             <CheckSquare className="w-5 h-5"/> 我的工作項目 (Item)
          </h3>
          <div className="space-y-2">
            {itemTasks.map(t => {
                const act = activities.find(a => a.id === t.activityId);
                return <TaskCard key={t.id} task={t} actName={act?.name || 'Unknown'} />;
            })}
            {itemTasks.length === 0 && <p className="text-gray-400">目前沒有工作項目</p>}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-700">
             <FileText className="w-5 h-5"/> 我的場勘項目 (Survey)
          </h3>
          <div className="space-y-2">
            {surveyTasks.map(t => {
                const act = activities.find(a => a.id === t.activityId);
                return <TaskCard key={t.id} task={t} actName={act?.name || 'Unknown'} />;
            })}
            {surveyTasks.length === 0 && <p className="text-gray-400">目前沒有場勘項目</p>}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (!user) return <LoginPage />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex flex-col w-64 text-white bg-slate-800">
        <div className="flex items-center justify-center h-16 text-xl font-bold border-b border-slate-700">
          專案管考系統
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex items-center w-full gap-3 p-3 rounded transition-colors ${view === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> 總覽儀表板
          </button>
          
          {/* User Info */}
          <div className="pt-4 mt-4 border-t border-slate-700">
            <div className="flex items-center gap-3 px-3">
              <div className="flex items-center justify-center w-8 h-8 font-bold text-blue-800 bg-blue-100 rounded-full">
                {user.name[0]}
              </div>
              <div>
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-gray-400">{user.role === 'admin' ? '管理者' : '同仁'}</div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="flex items-center w-full gap-3 p-3 mt-2 text-red-300 rounded hover:bg-slate-700"
          >
            <LogOut className="w-5 h-5" /> 登出
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">
            {view === 'dashboard' && (user.role === 'admin' ? '管理者儀表板' : '同仁作業區')}
          </h2>
          <div className="text-sm text-gray-500">今日: {new Date().toLocaleDateString()}</div>
        </header>

        <main className="p-6">
          {user.role === 'admin' ? <AdminDashboard /> : <StaffDashboard />}
        </main>
      </div>
    </div>
  );
};

export default App;