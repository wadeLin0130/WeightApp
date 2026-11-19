import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, Delete, X } from 'lucide-react';
import { calculate } from './calculator';
import { formatNumber, hasNumber } from './numbers';
function CalculatorDialog({ label, value, precision, min, max, onConfirm, onClose }) {
  const [expression, setExpression] = useState(hasNumber(value) ? formatNumber(value, precision) : '');
  const [replace, setReplace] = useState(true), [error, setError] = useState('');
  const dialogRef = useRef(null), titleId = useId();
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current.focus({ preventScroll: true });
    return () => { document.body.style.overflow = oldOverflow; };
  }, []);
  function press(key) {
    setError('');
    if (key === 'C') { setExpression(''); setReplace(false); return; }
    if (key === 'DEL') { setExpression(previous => previous.slice(0, -1)); setReplace(false); return; }
    if (key === '=') {
      try {
        if (!expression) { onConfirm(''); return; }
        const result = Number(formatNumber(calculate(expression), precision));
        if (result < min || result > max) throw new Error(`請輸入 ${formatNumber(min, precision)}～${formatNumber(max, precision)}`);
        onConfirm(String(result));
      } catch (e) { setError(e.message); }
      return;
    }
    if (/\d|\./.test(key)) {
      const next = replace ? '' : expression;
      if (key === '.' && (next.split(/[+\-×÷]/).at(-1) || '').includes('.')) return;
      if (next.length < 80) setExpression(next + (key === '.' && (!next || /[+\-×÷]$/.test(next)) ? '0.' : key));
    } else {
      setExpression(previous => /[+\-×÷]$/.test(previous) ? previous.slice(0, -1) + key : (previous || '0') + key);
    }
    setReplace(false);
  }
  function keyboard(event) {
    if (event.key === 'Tab') {
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    const key = event.key === 'Enter' ? '=' : event.key === 'Backspace' ? 'DEL' : event.key === 'Delete' ? 'C' : event.key === '*' ? '×' : event.key === '/' ? '÷' : event.key;
    if (key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    else if (/^[0-9.+\-×÷=]$/.test(key) || key === 'DEL' || key === 'C') { event.preventDefault(); event.stopPropagation(); press(key); }
  }
  const keys = ['C', 'DEL', '÷', '×', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.'];
  return createPortal(<div className="calculator-backdrop" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="calculator-dialog" onKeyDown={keyboard}>
      <header className="calculator-header"><h2 id={titleId}>{label}</h2><button type="button" aria-label="關閉計算機" onClick={onClose}><X size={20}/></button></header>
      <output className="calculator-display" aria-live="polite">{expression || '—'}</output>
      {error && <p className="calculator-error" role="alert">{error}</p>}
      <div className="calculator-keys">{keys.map(key => <button type="button" key={key} aria-label={key === 'DEL' ? '退格' : key === '=' ? '確認數值' : key === 'C' ? '清除' : key} className={`${key === '=' ? 'calculator-equals' : /[+\-×÷]/.test(key) ? 'calculator-operator' : ''} ${key === '0' ? 'calculator-zero' : ''}`} onClick={() => press(key)}>{key === 'DEL' ? <Delete size={20}/> : key === '=' ? '確定' : key}</button>)}</div>
    </section>
  </div>, document.body);
}
export default function NumericField({ label, value, defaultValue = '', name, onChange, precision = 0, min = 0, max = 100000, disabled = false }) {
  const [internal, setInternal] = useState(defaultValue), [open, setOpen] = useState(false);
  const triggerRef = useRef(null), labelId = useId(), valueId = useId();
  const current = value === undefined ? internal : value;
  function close() { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); }
  return <div className="field">
    <span id={labelId}>{label}</span>
    <button ref={triggerRef} type="button" className="numeric-trigger" disabled={disabled} aria-labelledby={`${labelId} ${valueId}`} aria-haspopup="dialog" onClick={() => { document.activeElement?.blur(); setOpen(true); }}><Calculator size={16} aria-hidden="true"/><span id={valueId} className={hasNumber(current) ? '' : 'numeric-empty'}>{formatNumber(current, precision)}</span></button>
    {name && <input type="hidden" name={name} value={current ?? ''}/>}
    {open && <CalculatorDialog label={label} value={current} precision={precision} min={min} max={max} onClose={close} onConfirm={next => { if (value === undefined) setInternal(next); onChange?.(next); close(); }}/>}
  </div>;
}
