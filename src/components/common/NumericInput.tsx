import { useRef, useState, useEffect } from 'react';

interface NumericInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
}

export function NumericInput({ value, onChange, placeholder, suffix, className = '' }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(value?.toString() ?? '');

  // Sync display when value changes externally (e.g. loading last performance)
  useEffect(() => {
    setDisplayValue(value?.toString() ?? '');
  }, [value]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          // Allow empty, digits, and one decimal point
          if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
          setDisplayValue(raw);
          if (raw === '' || raw === '.') {
            onChange(null);
            return;
          }
          const num = parseFloat(raw);
          if (!isNaN(num)) onChange(num);
        }}
        onBlur={() => {
          // Clean up display on blur (e.g. "12." → "12")
          if (displayValue && !displayValue.endsWith('.')) return;
          const num = parseFloat(displayValue);
          setDisplayValue(isNaN(num) ? '' : num.toString());
        }}
        onFocus={() => inputRef.current?.select()}
        className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono text-white focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light"
      />
      {suffix && (
        <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
