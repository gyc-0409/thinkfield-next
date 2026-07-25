'use client';

export default function LoginRequiredModal({ onClose, onGoLogin }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-lg p-6 md:p-8 w-full md:w-auto md:max-w-sm mx-4 md:mx-0 relative text-center">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 text-2xl hover:text-gray-600">&times;</button>
        <p className="text-gray-700 mb-6">请登录后继续操作</p>
        <button
          onClick={onGoLogin}
          className="bg-gray-800 text-white px-6 py-2 rounded text-sm hover:bg-gray-900 transition-colors"
        >
          去登录
        </button>
      </div>
    </div>
  );
}