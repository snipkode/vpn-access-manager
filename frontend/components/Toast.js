import { useUIStore } from '../store';

export default function Toast() {
  const { notification } = useUIStore();

  if (!notification) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div
        className={`${getBgColor(notification.type)} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        <span className="text-2xl">{getIcon(notification.type)}</span>
        <span className="flex-1 font-medium">{notification.message}</span>
        <button
          onClick={() => useUIStore.getState().showNotification(null)}
          className="text-white/80 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
