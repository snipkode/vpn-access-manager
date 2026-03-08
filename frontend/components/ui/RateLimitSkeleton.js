import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * RateLimitSkeleton - Skeleton UI shown during rate limit cooldown
 * Shows countdown timer and progress bar
 * 
 * @param {number} countdown - Seconds remaining
 * @param {number} progress - Progress bar percentage (0-100)
 * @param {string} message - Custom message to display
 * @param {string} className - Additional CSS classes
 */
export default function RateLimitSkeleton({ 
  countdown = 0, 
  progress = 0, 
  message = 'Too many requests',
  className = ''
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* Skeleton Container - iOS Style */}
      <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-500/10 dark:to-orange-500/5 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-200/20 shadow-sm">
        {/* Icon with pulse animation */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-md">
            <div className="relative">
              <span className="text-2xl">⏱️</span>
              {/* Pulse ring animation */}
              <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-amber-500" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center mb-4">
          <div className="text-sm font-semibold text-dark dark:text-white mb-1">
            {message}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Please wait before trying again
          </div>
        </div>

        {/* Countdown Timer - Large Display */}
        <div className="flex items-center justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-sm border border-amber-200/30 dark:border-amber-200/10">
            <Icon name="clock" className="w-4 h-4 text-amber-500" />
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {countdown}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">seconds</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200/60 dark:bg-[#2C2C2E] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Label */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Cooldown
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            {Math.round(progress)}% complete
          </span>
        </div>

        {/* Disabled Button Placeholder */}
        <div className="mt-5">
          <button
            disabled
            className="w-full px-5 py-3.5 bg-gray-100 dark:bg-[#2C2C2E] text-gray-400 dark:text-gray-500 rounded-xl text-sm font-semibold cursor-not-allowed opacity-60"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              Waiting...
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

RateLimitSkeleton.propTypes = {
  countdown: PropTypes.number.isRequired,
  progress: PropTypes.number.isRequired,
  message: PropTypes.string,
  className: PropTypes.string,
};

/**
 * RateLimitInline - Compact inline version for small spaces
 */
export function RateLimitInline({ countdown = 0, progress = 0, className = '' }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="bg-amber-50/60 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-200/30 dark:border-amber-200/10">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#2C2C2E] flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-lg">⏱️</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-dark dark:text-white">
                Please wait
              </span>
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md font-medium tabular-nums">
                {countdown}s
              </span>
            </div>
            
            {/* Mini Progress Bar */}
            <div className="w-full h-1.5 bg-gray-200/60 dark:bg-[#2C2C2E] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

RateLimitInline.propTypes = {
  countdown: PropTypes.number.isRequired,
  progress: PropTypes.number.isRequired,
  className: PropTypes.string,
};
