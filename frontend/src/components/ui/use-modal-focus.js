import { useEffect, useRef } from 'react';

export function useModalFocus(ref, open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || !ref.current) return undefined;
    const modal = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const targets = () =>
      [
        ...modal.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"], summary'
        ),
      ].filter((element) => element.getClientRects().length > 0);
    (targets()[0] || modal).focus();

    const keyDown = (event) => {
      if (event.key === 'Escape') closeRef.current?.();
      if (event.key !== 'Tab') return;
      const elements = targets();
      const first = elements[0] || modal;
      const last = elements.at(-1) || modal;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === modal)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === modal ||
          !modal.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keyDown);
    return () => {
      window.removeEventListener('keydown', keyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, ref]);
}
