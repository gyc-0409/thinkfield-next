'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingDots from '@/components/LoadingDots';

export default function AdminPanel({ onClose }) {
  const { role } = useAuth();
  const [tab, setTab] = useState('reports');

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [bookRequests, setBookRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [bookIdInputs, setBookIdInputs] = useState({});

  const [certifications, setCertifications] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [schoolInputs, setSchoolInputs] = useState({});

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
    } catch {
      setReports([]);
    }
    setLoadingReports(false);
  };

  const loadBookRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/admin/book-requests');
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setBookRequests(data);
    } catch {
      setBookRequests([]);
    }
    setLoadingRequests(false);
  };

  const loadCertifications = async () => {
    setLoadingCerts(true);
    try {
      const res = await fetch('/api/admin/certifications');
      if (!res.ok) throw new Error((await res.json()).error || '加载失败');
      const data = await res.json();
      setCertifications(Array.isArray(data) ? data : []);
    } catch {
      setCertifications([]);
    }
    setLoadingCerts(false);
  };

  useEffect(() => {
    if (tab === 'reports') {
      if (reports.length === 0) loadReports();
    } else if (tab === 'book-requests') {
      loadBookRequests();
    } else if (tab === 'certifications') {
      loadCertifications();
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

  const handleApproveRequest = async (requestId) => {
    const bookId = (bookIdInputs[requestId] || '').trim();
    if (!bookId) return alert('请填写已创建的书籍 ID');
    if (!confirm('确认标记该申请为已通过？')) return;
    try {
      const res = await fetch(`/api/admin/book-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', bookId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('已标记通过');
      loadBookRequests();
    } catch (e) { alert(e.message); }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = window.prompt('拒绝原因（可选）', '') || '';
    if (!confirm('确认拒绝该书籍申请？')) return;
    try {
      const res = await fetch(`/api/admin/book-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('已拒绝');
      loadBookRequests();
    } catch (e) { alert(e.message); }
  };

  const requestStatusLabel = (s) => {
    if (s === 'pending') return '待处理';
    if (s === 'approved') return '已通过';
    if (s === 'rejected') return '已拒绝';
    return s;
  };

  const handleCertAction = async (username, action) => {
    const school = (schoolInputs[username] || '').trim();
    if (action === 'approve' && !school) {
      alert('请填写学校名称');
      return;
    }
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('拒绝原因（可选）', '') || '';
    }
    const labels = { approve: '通过', reject: '拒绝', revoke: '撤销' };
    if (!confirm(`确认${labels[action]}用户 ${username} 的学生认证？`)) return;
    try {
      const res = await fetch('/api/admin/certifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, action, school, reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('已处理');
      loadCertifications();
    } catch (e) {
      alert(e.message);
    }
  };

  const statusLabel = (s) => {
    if (s === 'pending') return '待审核';
    if (s === 'approved') return '已通过';
    if (s === 'rejected') return '已拒绝';
    return s;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-lg p-4 md:p-6 w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 text-2xl hover:text-gray-600">&times;</button>
        <h2 className="text-xl font-medium text-gray-800 mb-6">管理后台</h2>

        <div className="flex flex-wrap gap-4 mb-6 border-b border-gray-200">
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
          {role === 'admin' && (
            <button
              onClick={() => setTab('certifications')}
              className={`pb-2 text-sm font-medium ${tab === 'certifications' ? 'text-gray-800 border-b-2 border-gray-800' : 'text-gray-500'}`}
            >
              学生认证
            </button>
          )}
        </div>

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
            <h3 className="font-medium mb-2">书籍申请</h3>
            <p className="text-xs text-gray-500 mb-4">
              请先在「添加书籍」中手动创建书籍并录入目录，再在此填写书籍 ID 标记通过。
            </p>
            {loadingRequests ? (
              <LoadingDots />
            ) : bookRequests.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无书籍申请</p>
            ) : (
              <div className="space-y-4">
                {bookRequests.map((req) => (
                  <div key={req.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <p className="font-medium text-gray-800">《{req.title}》</p>
                        <p className="text-xs text-gray-500 mt-0.5">申请人：{req.username}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                          : req.status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {requestStatusLabel(req.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                      <p>作者：{req.author}</p>
                      {req.translator && <p>译者：{req.translator}</p>}
                      <p>出版社：{req.publisher}</p>
                      <p>版本：{req.edition}</p>
                      {req.publishYear && <p>出版年份：{req.publishYear}</p>}
                      {req.isbn && <p>ISBN：{req.isbn}</p>}
                      {req.createdAt && (
                        <p className="text-xs text-gray-400 pt-1">
                          提交于 {new Date(req.createdAt).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                    {req.status === 'approved' && req.bookId && (
                      <p className="text-sm text-gray-600">书籍 ID：{req.bookId}</p>
                    )}
                    {req.status === 'rejected' && req.rejectReason && (
                      <p className="text-sm text-gray-500">拒绝原因：{req.rejectReason}</p>
                    )}
                    {req.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <input
                          value={bookIdInputs[req.id] || ''}
                          onChange={(e) => setBookIdInputs((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="已创建的书籍 ID（如 book-1234567890）"
                          className="flex-1 border border-gray-200 p-2 rounded text-sm placeholder:text-gray-400"
                        />
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="bg-gray-800 text-white px-3 py-2 rounded text-sm hover:bg-gray-900 whitespace-nowrap"
                        >
                          标记通过
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm border border-gray-200 hover:bg-gray-200 whitespace-nowrap"
                        >
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'certifications' && role === 'admin' && (
          <div>
            <h3 className="font-medium mb-2">学生认证</h3>
            <p className="text-xs text-gray-500 mb-4">
              请用待审验证码到学信网核验「教育部学籍在线验证报告」，通过后填写学校名称。审核完成后验证码将清空。
            </p>
            {loadingCerts ? (
              <LoadingDots />
            ) : certifications.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无认证记录</p>
            ) : (
              <div className="space-y-4">
                {certifications.map((c) => (
                  <div key={c.username} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div>
                        <span className="font-medium text-gray-800">{c.username}</span>
                        {c.school && <span className="text-sm text-gray-500 ml-2">{c.school}</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                        c.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                          : c.status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {statusLabel(c.status)}
                      </span>
                    </div>
                    {c.status === 'pending' && (
                      <>
                        <p className="text-sm text-gray-700 mb-2 font-mono tracking-wider">
                          验证码：{c.code || '（无）'}
                        </p>
                        {c.submittedAt && (
                          <p className="text-xs text-gray-400 mb-3">
                            提交于 {new Date(c.submittedAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                        <input
                          value={schoolInputs[c.username] || ''}
                          onChange={(e) => setSchoolInputs((prev) => ({ ...prev, [c.username]: e.target.value }))}
                          placeholder="学校名称（通过时必填）"
                          className="w-full border border-gray-200 p-2 rounded text-sm mb-3 placeholder:text-gray-400"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleCertAction(c.username, 'approve')}
                            className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => handleCertAction(c.username, 'reject')}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm border border-gray-200 hover:bg-gray-200"
                          >
                            拒绝
                          </button>
                        </div>
                      </>
                    )}
                    {c.status === 'approved' && (
                      <div className="mt-2">
                        <button
                          onClick={() => handleCertAction(c.username, 'revoke')}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          撤销认证
                        </button>
                      </div>
                    )}
                    {c.status === 'rejected' && c.rejectReason && (
                      <p className="text-sm text-gray-500">原因：{c.rejectReason}</p>
                    )}
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
