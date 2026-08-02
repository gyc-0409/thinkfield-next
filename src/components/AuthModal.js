'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal({ onClose }) {
  const { refreshUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendCodeLoading, setSendCodeLoading] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [educationStatus, setEducationStatus] = useState('');
  const [university, setUniversity] = useState('');
  const [universityList, setUniversityList] = useState([]);

  const [uniSearch, setUniSearch] = useState('');
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const uniDropdownRef = useRef(null);
  const uniInputRef = useRef(null);

  const filteredUniversities = uniSearch.trim()
    ? universityList.filter(u => u.toLowerCase().includes(uniSearch.toLowerCase()))
    : universityList;

  useEffect(() => {
    fetch('/api/universities')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '加载大学列表失败');
        if (Array.isArray(data)) setUniversityList(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (uniDropdownRef.current && !uniDropdownRef.current.contains(e.target)) {
        setShowUniDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setInterval(() => {
      setCodeCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [codeCountdown]);

  const handleSendCode = async () => {
    if (!email) {
      alert('请先输入邮箱');
      return;
    }
    setSendCodeLoading(true);
    try {
      const res = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '发送失败');
      }
      alert('验证码已发送，5分钟内有效');
      setCodeCountdown(60);
    } catch (e) {
      alert(e.message);
    }
    setSendCodeLoading(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!username || !password) return setError('请输入用户名和密码');
    if (isRegister && password !== confirmPassword) return setError('两次密码不一致');
    if (isRegister && !email) return setError('请输入邮箱');
    if (isRegister && !code) return setError('请输入验证码');
    if (isRegister && !educationStatus) return setError('请选择就读状态');
    if (isRegister && educationStatus === 'studying' && !university) return setError('请选择就读大学');

    setLoading(true);
    try {
      const url = isRegister ? '/api/register' : '/api/login';
      const body = isRegister
        ? { username, password, email, university: educationStatus === 'studying' ? university : `已毕业 - ${university || '未知'}`, code }
        : { username, password };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失败');
      await refreshUser();
      onClose();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const selectUniversity = (name) => {
    setUniversity(name);
    setUniSearch(name);
    setShowUniDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-lg p-6 md:p-8 w-full h-full md:h-auto md:max-w-md md:max-h-[90vh] overflow-y-auto relative flex flex-col">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 text-2xl hover:text-gray-600">&times;</button>
        <h2 className="text-xl font-medium text-gray-800 mb-6">{isRegister ? '注册' : '登录'}</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          type="text"
          placeholder={isRegister ? '用户名' : '用户名或邮箱'}
          className="w-full border border-gray-200 p-2.5 rounded-md mb-3 text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
          autoComplete="username"
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="密码（至少8位）"
          className="w-full border border-gray-200 p-2.5 rounded-md mb-3 text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
          autoComplete="current-password"
        />

        {isRegister && (
          <>
            <input
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="确认密码"
              className="w-full border border-gray-200 p-2.5 rounded-md mb-3 text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
              autoComplete="new-password"
            />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="邮箱"
              className="w-full border border-gray-200 p-2.5 rounded-md mb-3 text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
              autoComplete="email"
            />
            <div className="flex gap-2 mb-3">
              <input
                value={code}
                onChange={e => setCode(e.target.value)}
                type="text"
                placeholder="验证码"
                className="flex-1 border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
              />
              <button
                onClick={handleSendCode}
                disabled={sendCodeLoading || codeCountdown > 0}
                className="px-3 rounded-md text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap transition-colors"
              >
                {codeCountdown > 0 ? `${codeCountdown}s` : sendCodeLoading ? '发送中' : '发送验证码'}
              </button>
            </div>

            <div className="mb-3">
              <select
                value={educationStatus}
                onChange={e => {
                  setEducationStatus(e.target.value);
                  if (e.target.value !== 'studying') {
                    setUniversity('');
                    setUniSearch('');
                  }
                }}
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 bg-white placeholder:text-gray-400"
              >
                <option value="">选择就读状态</option>
                <option value="studying">就读大学</option>
                <option value="graduated">已毕业</option>
              </select>
            </div>

            {educationStatus === 'studying' && (
              <div className="mb-3 relative" ref={uniDropdownRef}>
                <input
                  ref={uniInputRef}
                  value={uniSearch}
                  onChange={e => {
                    setUniSearch(e.target.value);
                    setUniversity(e.target.value);
                    setShowUniDropdown(true);
                  }}
                  onFocus={() => setShowUniDropdown(true)}
                  placeholder="搜索并选择就读大学"
                  className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                />
                {showUniDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredUniversities.length === 0 ? (
                      <p className="text-sm text-gray-400 p-2.5">无匹配结果</p>
                    ) : (
                      filteredUniversities.map(u => (
                        <div
                          key={u}
                          onClick={() => selectUniversity(u)}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors ${
                            university === u ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {u}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors mt-2"
        >
          {loading ? '处理中...' : isRegister ? '注册' : '登录'}
        </button>

        <p
          className="text-center mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
        >
          {isRegister ? '已有账号？去登录' : '没有账号？点击注册'}
        </p>
      </div>
    </div>
  );
}