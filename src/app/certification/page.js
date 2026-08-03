'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoadingDots from '@/components/LoadingDots';

const STATUS_TEXT = {
  none: '未认证',
  pending: '审核中',
  approved: '已通过',
  rejected: '未通过',
};

export default function CertificationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('none');
  const [school, setSchool] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/?login=1');
      return;
    }
    setLoading(true);
    fetch('/api/certification')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '加载失败');
        setStatus(data.status || 'none');
        setSchool(data.school || '');
        setRejectReason(data.rejectReason || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const canSubmit = status === 'none' || status === 'rejected';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!agreed) {
      setError('请先阅读并同意认证信息告知书');
      return;
    }
    if (!/^[A-Za-z0-9]{12}$/.test(code.trim())) {
      setError('请输入 12 位在线验证码（字母或数字）');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), agreed: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
      setStatus('pending');
      setSuccess('已提交，请等待审核');
      setCode('');
      setAgreed(false);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex justify-center pt-20">
        <LoadingDots />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← 返回
          </button>
          <span className="text-sm text-gray-400">|</span>
          <Link href={user ? `/user/${encodeURIComponent(user)}` : '/'} className="text-sm text-gray-600 hover:text-gray-900">
            个人主页
          </Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 sm:py-10">
        <h1 className="text-xl font-medium text-gray-900 mb-2">学生认证</h1>
        <p className="text-sm text-gray-500 mb-6">
          当前状态：{STATUS_TEXT[status] || status}
          {status === 'approved' && school ? ` · ${school}` : ''}
        </p>

        {status === 'approved' && (
          <div className="mb-6 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700">
            你已通过学生认证。个人主页将显示「已认证学生」标识；认证学校名称仅自己可见。如需撤销，请联系我们。
          </div>
        )}

        {status === 'pending' && (
          <div className="mb-6 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700">
            你的认证材料已提交，正在人工审核中，请耐心等待。
          </div>
        )}

        {status === 'rejected' && (
          <div className="mb-6 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            认证未通过{rejectReason ? `：${rejectReason}` : ''}。你可以更正后重新提交。
          </div>
        )}

        {canSubmit && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-md border border-gray-200 bg-white p-4 sm:p-5 text-sm text-gray-700 leading-relaxed space-y-4">
              <p className="font-medium text-gray-900">如何获取在线验证码</p>

              <div>
                <p className="font-medium text-gray-800 mb-2">网页版</p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                  <li>
                    打开学信网{' '}
                    <a
                      href="https://www.chsi.com.cn/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-800 underline underline-offset-2 hover:text-gray-950"
                    >
                      https://www.chsi.com.cn/
                    </a>
                    {' '}并登录
                  </li>
                  <li>登录成功后，点击「学信档案」</li>
                  <li>进入后点击「登录学信档案」</li>
                  <li>进入后点击「在线验证报告」的「查看」</li>
                  <li>查看「教育部学籍在线验证报告」，获取 12 位在线验证码</li>
                </ol>
              </div>

              <div>
                <p className="font-medium text-gray-800 mb-2">APP 版</p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                  <li>打开学信网 APP 并登录</li>
                  <li>登录成功后，点击「在线验证报告」</li>
                  <li>进入后查看「教育部学籍在线验证报告」，获取 12 位在线验证码</li>
                </ol>
              </div>

              <p className="text-gray-500 text-xs">
                验证码一般为 12 位，可包含字母和数字。将验证码填入下方输入框即可提交。
              </p>
            </div>

            <div className="rounded-md border border-gray-200 bg-white p-4 sm:p-5 text-sm text-gray-700 leading-relaxed space-y-2">
              <p className="font-medium text-gray-900 mb-3">认证信息告知书</p>
              <p>1. 认证目的：验证你的学生身份，通过后将在个人主页显示「已认证学生」标识。</p>
              <p>2. 信息使用：你提交的在线验证码仅用于本次身份审核，审核完成后立即删除，不会存储。</p>
              <p>3. 信息保护：审核人员将严格保密你的个人信息，不会向任何第三方提供。</p>
              <p>4. 自愿原则：认证是可选的，不影响你正常使用思辨场的其他功能。</p>
              <p>5. 你可以随时联系我们要求撤销认证标识。</p>
              <label className="flex items-start gap-2 pt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span>我已阅读并同意以上内容</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">在线验证码</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase())}
                placeholder="请输入 12 位在线验证码（字母或数字）"
                autoComplete="off"
                spellCheck={false}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm tracking-wider font-mono focus:outline-none focus:border-gray-400 placeholder:text-gray-400 placeholder:tracking-normal placeholder:font-sans"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <button
              type="submit"
              disabled={submitting || !agreed}
              className="bg-gray-800 text-white px-6 py-2.5 rounded-md text-sm hover:bg-gray-900 transition-colors disabled:opacity-40"
            >
              {submitting ? '提交中…' : '提交认证'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
