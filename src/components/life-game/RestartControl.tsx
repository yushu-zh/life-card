import { useState } from 'react';

interface RestartControlProps {
  labels: {
    title: string;
    message: string;
    confirmAction: string;
    cancelAction: string;
  };
  onConfirm: () => void;
}

// 左上角"重新开始"入口：一枚悬浮图标按钮 + 二次确认弹窗。
// 点击图标先弹出确认，避免误触导致当前进度丢失。
export function RestartControl({ labels, onConfirm }: RestartControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 确认重开：先关闭弹窗，再交给外部执行实际的重置逻辑。
  const handleConfirm = () => {
    setIsOpen(false);
    onConfirm();
  };

  return (
    <>
      <button
        type="button"
        className="life-game__restart-icon"
        aria-label={labels.title}
        title={labels.title}
        onClick={() => setIsOpen(true)}
      >
        <RestartIcon />
      </button>

      {isOpen && (
        <div
          className="life-game__confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
        >
          <div className="life-game__confirm-dialog">
            <h2 className="life-game__confirm-title">{labels.title}</h2>
            <p className="life-game__confirm-message">{labels.message}</p>
            <div className="life-game__confirm-actions">
              <button
                type="button"
                className="life-game__secondary-button"
                onClick={() => setIsOpen(false)}
              >
                {labels.cancelAction}
              </button>
              <button
                type="button"
                className="life-game__primary-button"
                onClick={handleConfirm}
              >
                {labels.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 圆形箭头（重开/刷新）图标：描边风格，跟随当前文字颜色。
function RestartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
