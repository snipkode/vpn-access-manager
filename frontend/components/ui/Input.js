import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Input - Form input component
 * 
 * @param {string} label - Input label
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {string} type - Input type (text, email, password, number, etc.)
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message
 * @param {boolean} disabled - Disabled state
 * @param {boolean} required - Required field
 * @param {node} icon - Icon component
 * @param {node} rightElement - Element on right side (button, badge, etc.)
 * @param {string} className - Additional classes
 * 
 * @example
 * <Input label="Email" type="email" value={email} onChange={setEmail} />
 * <Input label="Password" type="password" error="Invalid password" />
 * <Input icon={<FaSearch />} placeholder="Search..." />
 */
export default function Input({ 
  label,
  value, 
  onChange,
  type = 'text',
  placeholder,
  error,
  disabled = false,
  required = false,
  icon,
  rightElement,
  className = '',
  ...props 
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          {label} {required && <span className="text-[#FF3B30]">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}
        
        {/* Input Field */}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-3 sm:px-4 py-[12px] sm:py-[14px]
            bg-gray-50 dark:bg-[#2C2C2E]
            border-2 rounded-xl sm:rounded-2xl
            text-dark dark:text-white text-[15px] sm:text-[17px]
            placeholder-gray-300 dark:placeholder-gray-500
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10 sm:pl-12' : ''}
            ${error 
              ? 'border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20' 
              : isFocused
                ? 'border-[#007AFF] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
                : 'border-gray-200 dark:border-[#38383A]'
            }
            ${rightElement ? 'pr-24 sm:pr-32' : ''}
          `}
          {...props}
        />
        
        {/* Right Element */}
        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="text-[11px] text-[#FF3B30] mt-1.5 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'tel', 'url', 'date', 'time', 'datetime-local']),
  placeholder: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  icon: PropTypes.node,
  rightElement: PropTypes.node,
  className: PropTypes.string,
};

/**
 * TextArea - Multi-line input
 */
export function TextArea({ 
  label,
  value, 
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  rows = 3,
  className = '',
  ...props 
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          {label} {required && <span className="text-[#FF3B30]">*</span>}
        </label>
      )}
      
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`
          w-full px-3 sm:px-4 py-[12px] sm:py-[14px]
          bg-gray-50 dark:bg-[#2C2C2E]
          border-2 rounded-xl sm:rounded-2xl
          text-dark dark:text-white text-[15px] sm:text-[17px]
          placeholder-gray-300 dark:placeholder-gray-500
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-none
          ${error 
            ? 'border-[#FF3B30] focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20' 
            : 'border-gray-200 dark:border-[#38383A] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20'
          }
        `}
        {...props}
      />
      
      {/* Error Message */}
      {error && (
        <p className="text-[11px] text-[#FF3B30] mt-1.5 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

Input.TextArea = TextArea;
