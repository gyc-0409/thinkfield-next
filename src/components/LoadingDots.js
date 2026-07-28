export default function LoadingDots({ text = '加载中' }) {
  return (
    <span className="text-gray-500 text-sm">
      {text}
      <span className="inline-flex ml-1">
        <span className="animate-bounce-dot" style={{ animationDelay: '0s' }}>.</span>
        <span className="animate-bounce-dot" style={{ animationDelay: '0.2s' }}>.</span>
        <span className="animate-bounce-dot" style={{ animationDelay: '0.4s' }}>.</span>
      </span>
    </span>
  );
}