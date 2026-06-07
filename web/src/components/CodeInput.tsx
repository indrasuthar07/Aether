import { useRef, useEffect, useCallback, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react';

interface CodeInputProps {
  onChange: (code: string) => void;
  value?: string;
}

const CODE_LENGTH = 6;

function CodeInput({ onChange, value = '' }: CodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const valuesRef = useRef<string[]>(value.padEnd(CODE_LENGTH, '').split('').slice(0, CODE_LENGTH));

  // Sync external value to internal state
  useEffect(() => {
    if (value) {
      const chars = value.padEnd(CODE_LENGTH, '').split('').slice(0, CODE_LENGTH);
      valuesRef.current = chars;
      inputsRef.current.forEach((input, i) => {
        if (input) {
          input.value = chars[i] || '';
        }
      });
    }
  }, [value]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const emitChange = useCallback(() => {
    const code = valuesRef.current.join('');
    onChange(code.replace(/\s/g, ''));
  }, [onChange]);

  const handleChange = useCallback((index: number, e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only accept digits
    if (inputValue && !/^\d$/.test(inputValue)) {
      e.target.value = valuesRef.current[index] || '';
      return;
    }

    valuesRef.current[index] = inputValue;
    emitChange();

    // Auto-focus next input
    if (inputValue && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }, [emitChange]);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!valuesRef.current[index] && index > 0) {
        // Move focus to previous input and clear it
        valuesRef.current[index - 1] = '';
        const prevInput = inputsRef.current[index - 1];
        if (prevInput) {
          prevInput.value = '';
          prevInput.focus();
        }
        emitChange();
      } else {
        valuesRef.current[index] = '';
        const currentInput = inputsRef.current[index];
        if (currentInput) {
          currentInput.value = '';
        }
        emitChange();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }, [emitChange]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);

    if (!pasteData) return;

    const chars = pasteData.split('');
    for (let i = 0; i < CODE_LENGTH; i++) {
      const char = chars[i] || '';
      valuesRef.current[i] = char;
      const input = inputsRef.current[i];
      if (input) {
        input.value = char;
      }
    }
    const focusIndex = Math.min(chars.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();

    emitChange();
  }, [emitChange]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold text-aether-ink bg-white border border-black/10 rounded-xl shadow-sm focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 transition-all selection:bg-blue-100"
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoComplete="off"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default CodeInput;