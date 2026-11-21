import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import styles from './ActionMenu.module.css';

export function ActionMenu({ label = 'Lainnya', items = [], align = 'right' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({});
  const menuId = useId();

  const visibleItems = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const closeOnMove = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('scroll', closeOnMove, true);
    window.addEventListener('resize', closeOnMove);
    menuRef.current?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', closeOnMove, true);
      window.removeEventListener('resize', closeOnMove);
    };
  }, [open]);

  if (visibleItems.length === 0) return null;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          const rect = triggerRef.current.getBoundingClientRect();
          const height = visibleItems.length * 46 + 16;
          setPosition({
            position: 'fixed',
            left: Math.max(
              12,
              Math.min(align === 'left' ? rect.left : rect.right - 200, window.innerWidth - 212)
            ),
            top:
              rect.bottom + height < window.innerHeight
                ? rect.bottom + 6
                : Math.max(12, rect.top - height),
            width: 200,
            right: 'auto',
          });
          setOpen((v) => !v);
        }}
      >
        <span>{label}</span>
        <ChevronDown size={14} aria-hidden="true" className={open ? styles.chevronOpen : ''} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            style={position}
            onKeyDown={(event) => {
              const buttons = [...menuRef.current.querySelectorAll('button:not(:disabled)')];
              const index = buttons.indexOf(document.activeElement);
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? buttons.length - 1
                      : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) %
                        buttons.length;
                buttons[next]?.focus();
              }
              if (event.key === 'Tab') {
                setOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
              }
            }}
            className={`${styles.menu} ${align === 'left' ? styles.alignLeft : styles.alignRight}`}
          >
            {visibleItems.map((item) => (
              <button
                key={item.key || item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`${styles.item} ${item.tone === 'danger' ? styles.danger : ''}`}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus({ preventScroll: true });
                  item.onClick?.();
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
