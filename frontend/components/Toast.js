import { useUIStore } from '../store';

export default function Toast() {
  const { notification } = useUIStore();

  if (!notification) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '!';
      default:
        return '•';
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
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div
        className={`${getBgColor(notification.type)} text-white px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] max-w-md`}
      >
        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
          {getIcon(notification.type)}
        </span>
        <span className="flex-1 font-medium text-sm">{notification.message}</span>
      </div>
    </div>
  );
}
