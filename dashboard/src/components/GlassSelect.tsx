import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface GlassSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export default function GlassSelect({ label, value, onChange, options }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div className="block min-w-0 flex-1" ref={rootRef}>
      {label && (
        <span className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1.5 block font-medium">
          {label}
        </span>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="glass-select-trigger w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm text-white cursor-pointer transition-colors"
        >
          <span className="truncate text-left">{selected?.label ?? 'Select…'}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-[#9CA3AF] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open &&
          menuStyle &&
          createPortal(
            <ul
              ref={menuRef}
              role="listbox"
              style={{
                position: 'fixed',
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
                zIndex: 9999,
              }}
              className="glass-select-menu max-h-60 overflow-auto rounded-xl py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            >
              {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <li key={opt.value} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-accent/15 text-accent'
                          : 'text-white/90 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )}
      </div>
    </div>
  );
}
