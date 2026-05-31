interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const btnClass = 'w-11 h-11 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 flex items-center justify-center transition-colors touch-manipulation select-none';
  return (
    <div className="absolute bottom-4 right-4 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] flex flex-col gap-2">
      <button onClick={onZoomIn}  className={btnClass} title="Phóng to">
        <span className="text-xl font-bold leading-none">+</span>
      </button>
      <button onClick={onZoomOut} className={btnClass} title="Thu nhỏ">
        <span className="text-xl font-bold leading-none">−</span>
      </button>
      <button onClick={onReset}   className={btnClass} title="Vừa khung">
        <span className="text-sm">⊙</span>
      </button>
    </div>
  );
}
