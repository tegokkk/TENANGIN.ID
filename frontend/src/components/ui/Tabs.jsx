import { useId } from 'react';
import styles from './Tabs.module.css';

export function Tabs({
  items,
  value,
  onChange,
  ariaLabel = 'Navigasi panel',
  orientation = 'horizontal',
  id,
}) {
  const generatedId = useId();
  const prefix = id || generatedId;
  return (
    <div
      className={`${styles.list} ${orientation === 'vertical' ? styles.vertical : ''}`}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${prefix}-tab-${item.value}`}
            aria-controls={id ? `${prefix}-panel-${item.value}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.active : ''}`}
            onClick={() => onChange?.(item.value)}
            onKeyDown={(event) => {
              const keys =
                orientation === 'vertical' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
              if (![...keys, 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const index = items.findIndex((entry) => entry.value === item.value);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (index + (event.key === keys[0] ? -1 : 1) + items.length) % items.length;
              onChange?.(items[next].value);
              document.getElementById(`${prefix}-tab-${items[next].value}`)?.focus();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
