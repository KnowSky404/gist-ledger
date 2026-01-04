import { useState, useEffect } from 'react';
import { GistService } from './services/gist';
import type { LedgerItem } from './services/gist';
import { Loader2, CheckCircle, Wallet, LogOut } from 'lucide-react';
import { AddTransactionForm } from './components/AddTransactionForm';

function App() {
  // Auth State
  const [token, setToken] = useState('');
  const [gistId, setGistId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Data State
  const [items, setItems] = useState<LedgerItem[]>([]);
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [log, setLog] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // 初始化：检查本地存储
  useEffect(() => {
    const savedToken = localStorage.getItem('gist_token');
    const savedGistId = localStorage.getItem('gist_id');

    if (savedToken && savedGistId) {
      setToken(savedToken);
      setGistId(savedGistId);
      handleInitialLoad(savedToken, savedGistId);
    }
  }, []);

  const handleInitialLoad = async (authToken: string, targetGistId: string) => {
    setStatus('loading');
    setLog('正在同步数据...');
    try {
      const service = new GistService(authToken);
      const data = await service.getData(targetGistId);
      setItems(data);
      setIsLoggedIn(true);
      setStatus('idle');
      setLog('');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setLog('自动登录失败，请重新连接');
      localStorage.removeItem('gist_token');
      localStorage.removeItem('gist_id');
    }
  };

  const handleConnect = async () => {
    if (!token) return;
    setStatus('loading');
    setLog('正在验证 Token...');

    try {
      const service = new GistService(token);
      const user = await service.getUser();
      setLog(`你好, ${user.login}! 正在查找 Gist 数据库...`);

      const id = await service.initGist();
      setGistId(id);
      setLog(`连接成功! 数据库 ID: ${id}`);

      const data = await service.getData(id);
      setItems(data);
      setLog(`数据同步完成。当前记录数: ${data.length} 条`);
      setStatus('success');

      localStorage.setItem('gist_token', token);
      localStorage.setItem('gist_id', id);
      
      // 延迟一下进入主界面，让用户看到成功提示
      setTimeout(() => {
        setIsLoggedIn(true);
        setStatus('idle');
        setLog('');
      }, 1000);

    } catch (e) {
      console.error(e);
      setLog('连接失败，请检查 Token 权限 (需要 gist 权限)');
      setStatus('error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gist_token');
    localStorage.removeItem('gist_id');
    setIsLoggedIn(false);
    setToken('');
    setGistId('');
    setItems([]);
    setLog('');
    setStatus('idle');
  };

  const handleAddTransaction = async (newItem: LedgerItem) => {
    setIsSaving(true);
    try {
      const service = new GistService(token);
      // 乐观更新：先更新本地状态
      const updatedItems = [newItem, ...items];
      setItems(updatedItems);
      
      // 再保存到云端
      await service.saveData(gistId, updatedItems);
    } catch (e) {
      console.error('保存失败', e);
      alert('保存失败，请检查网络或 Token');
      // 回滚
      setItems(items); 
    } finally {
      setIsSaving(false);
    }
  };

  // --- 登录界面 ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Wallet size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">GistLedger</h1>
            <p className="text-gray-500 text-sm mt-1">基于 GitHub Gist 的极简记账</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={status === 'loading' || !token}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' && <Loader2 className="animate-spin" size={20} />}
              {status === 'success' ? '已连接' : '连接数据库'}
            </button>
          </div>

          {log && (
            <div className={`mt-6 p-4 rounded-lg text-sm flex items-start gap-3 ${
              status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {status === 'success' ? <CheckCircle size={18} className="mt-0.5" /> : null}
              <p className="leading-relaxed">{log}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 主界面 ---
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <h1 className="font-bold text-gray-800">GistLedger</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-100"
            title="退出登录"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        
        {/* 记账表单 */}
        <section>
          <AddTransactionForm onAdd={handleAddTransaction} isLoading={isSaving} />
        </section>

        {/* 简单列表预览 (临时) */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 px-1">最近记录</h3>
          {items.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              还没有记录，快记一笔吧！
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{item.category}</span>
                    <span className="text-xs text-gray-400">{item.date} {item.remark ? `· ${item.remark}` : ''}</span>
                  </div>
                  <span className={`font-semibold ${item.type === 'expense' ? 'text-gray-900' : 'text-emerald-600'}`}>
                    {item.type === 'expense' ? '-' : '+'} {item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {items.length > 5 && (
                 <div className="p-3 text-center text-sm text-gray-500 bg-gray-50 border-t border-gray-100">
                   显示最近 5 条 / 共 {items.length} 条
                 </div>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;