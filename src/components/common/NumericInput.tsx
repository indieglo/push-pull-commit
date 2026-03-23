import { useRef } from 'react';

interface NumericInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
}

export function NumericInput({ value, onChange, placeholder, suffix, className = '' }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(null);
            return;
          }
          const num = parseFloat(raw);
          if (!isNaN(num)) onChange(num);
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
