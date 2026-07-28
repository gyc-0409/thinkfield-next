'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingDots from '@/components/LoadingDots';

export default function AdminPanel({ onClose }) {
  const { user, role } = useAuth();
  const [tab, setTab] = useState('reports');

  // 举报相关
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // 书籍申请相关
  const [bookRequests, setBookRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // 角色设置（仅超管在举报页显示）
  const [roleUsername, setRoleUsername] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [roleMsg, setRoleMsg] = useState('');

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setReports(data);
    } catch (e) {
      console.error(e);
    }
    setLoadingReports(false);
  };

  const loadBookRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/notifications?type=book_request');
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setBookRequests(data);
    } catch (e) {
      console.error(e);
    }
    setLoadingRequests(false);
  };

  useEffect(() => {
    if (tab === 'reports') {
      if (reports.length === 0) loadReports();
    } else if (tab === 'book-requests') {
      loadBookRequests();
    }
  }, [tab]);

  const handleBan = async (username) => {
    if (!confirm(`确认禁言用户 ${username} 吗？`)) return;
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('已禁言');
      loadReports();
    } catch (e) { alert(e.message); }
  };

  const handleIgnore = async (reportId) => {
    if (!confirm('确认忽略此举报？')) return;
    try {
      const res = await fetch('/api/admin/ignore', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('已忽略');
      loadReports();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (reportId) => {
    if (!confirm('确认永久删除此内容吗？此操作不可撤销！')) return;
    try {
      const res = await fetch('/api/admin/delete-content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('内容已删除');
      loadReports();
    } catch (e) { alert(e.message); }
  };

  const handleSetRole = async () => {
    if (!roleUsername) return alert('请输入用户名');
    try {
      const res = await fetch('/api/admin/set-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: roleUsername, role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setRoleMsg('设置成功');
      setRoleUsername('');
    } catch (e) { setRoleMsg(e.message); }
  };

  const handleApproveBook = async (notificationId) => {
    if (!confirm('确认同意该书籍申请并自动创建书籍？')) return;
    try {
      const res = await fetch('/api/admin/approve-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('书籍已创建');
      loadBookRequests();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-lg p-4 md:p-6 w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 text-2xl hover:text-gray-600">&times;</button>
        <h2 className="text-xl font-medium text-gray-800 mb-6">管理后台</h2>

        {/* 标签页 */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab('reports')}
            className={`pb-2 text-sm font-medium ${tab === 'reports' ? 'text-gray-800 border-b-2 border-gray-800' : 'text-gray-500'}`}
          >
            举报管理
          </button>
          <button
            onClick={() => setTab('book-requests')}
            className={`pb-2 text-sm font-medium ${tab === 'book-requests' ? 'text-gray-800 border-b-2 border-gray-800' : 'text-gray-500'}`}
          >
            书籍申请
          </button>
        </div>

        {/* 仅举报页显示角色设置 */}
        {tab === 'reports' && role === 'admin' && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-medium mb-3">角色设置</h3>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1">
                <input value={roleUsername} onChange={e => setRoleUsername(e.target.value)} placeholder="用户名"
                  className="w-full border border-gray-200 p-2 rounded text-sm placeholder:text-gray-400" />
              </div>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="border border-gray-200 p-2 rounded text-sm bg-white">
                <option value="user">用户</option>
                <option value="moderator">副管理员</option>
              </select>
              <button onClick={handleSetRole} className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900">设置</button>
            </div>
            {roleMsg && <p className="text-sm mt-2 text-gray-600">{roleMsg}</p>}
          </div>
        )}

        {tab === 'reports' && (
          <div>
            <h3 className="font-medium mb-3">举报列表</h3>
            {loadingReports ? (
              <LoadingDots />
            ) : reports.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无举报</p>
            ) : (
              <div className="space-y-4">
                {reports.map(r => (
                  <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-gray-700">{r.reported_user}</span>
                        <span className="text-gray-400 text-sm ml-2">{r.content_type}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.status === 'pending' ? '待处理' : r.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">举报人数：{r.report_count}</p>
                    <p className="text-sm text-gray-600 mb-1">内容摘要：{r.content_preview}</p>
                    <p className="text-sm text-gray-500 mb-3">理由：{r.reason || '无'}</p>
                    {r.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleBan(r.reported_user)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm border border-red-200 hover:bg-red-100">禁言</button>
                        <button onClick={() => handleIgnore(r.id)} className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-sm border border-gray-200 hover:bg-gray-200">忽略</button>
                        {role === 'admin' && (
                          <button onClick={() => handleDelete(r.id)} className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900">删除内容</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'book-requests' && (
          <div>
            <h3 className="font-medium mb-3">书籍申请</h3>
            {loadingRequests ? (
              <LoadingDots />
            ) : bookRequests.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无待处理的书籍申请</p>
            ) : (
              <div className="space-y-3">
                {bookRequests.map(n => (
                  <div key={n.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <p className="text-sm text-gray-700">{n.message}</p>
                    <button
                      onClick={() => handleApproveBook(n.id)}
                      className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900 whitespace-nowrap"
                    >
                      同意创建
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}