export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
