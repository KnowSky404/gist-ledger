import { useState } from 'react';
import { GistService } from './services/gist';
import { Loader2, CheckCircle, Wallet } from 'lucide-react'; // 引入图标

function App() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [log, setLog] = useState<string>('');

  const handleConnect = async () => {
    if (!token) return;
    setStatus('loading');
    setLog('正在验证 Token...');

    try {
      const service = new GistService(token);
      const user = await service.getUser();
      setLog(`你好, ${user.login}! 正在查找 Gist 数据库...`);

      const gistId = await service.initGist();
      setLog(`连接成功! 数据库 ID: ${gistId}`);

      const data = await service.getData(gistId);
      setLog(`数据同步完成。当前记录数: ${data.length} 条`);
      setStatus('success');

      // 这里可以将 token 和 gistId 存入 localStorage，作为后续自动登录的凭证
      localStorage.setItem('gist_token', token);
      localStorage.setItem('gist_id', gistId);

    } catch (e) {
      console.error(e);
      setLog('连接失败，请检查 Token 权限 (需要 gist 权限)');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* 卡片容器：利用 shadow-xl 和 rounded-2xl 制造现代感 */}
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">

        {/* 标题区域 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">GistLedger</h1>
          <p className="text-gray-500 text-sm mt-1">基于 GitHub Gist 的极简记账</p>
        </div>

        {/* 表单区域 */}
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
              // Tailwind 的 focus:ring 能够非常简单地实现聚焦动效
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <button
            onClick={handleConnect}
            disabled={status === 'loading' || !token}
            // 使用 group 和 disabled: 伪类来控制交互状态
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {status === 'loading' && <Loader2 className="animate-spin" size={20} />}
            {status === 'success' ? '已连接' : '连接数据库'}
          </button>
        </div>

        {/* 日志反馈区域 */}
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

export default App;
