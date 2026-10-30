// Labelled form controls. Every control has a visible label.
import { useId, type ReactNode } from 'react';
import { useRun } from './RunContext';

interface Base { label: ReactNode; help?: ReactNode; className?: string }

export function TextField({ label, help, value, onChange, onBlur, className, placeholder, readOnly }: Base & {
  value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; readOnly?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {help && <p className="help" id={`${id}-h`}>{help}</p>}
      <input id={id} type="text" value={value} placeholder={placeholder} readOnly={readOnly}
        aria-describedby={help ? `${id}-h` : undefined} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
    </div>
  );
}

export function TextArea({ label, help, value, onChange, onBlur, className, rows = 3, readOnly, mono, children }: Base & {
  value: string; onChange: (v: string) => void; onBlur?: () => void; rows?: number; readOnly?: boolean; mono?: boolean; children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {help && <p className="help" id={`${id}-h`}>{help}</p>}
      <textarea id={id} value={value} rows={rows} readOnly={readOnly} className={mono ? 'mono' : undefined}
        aria-describedby={help ? `${id}-h` : undefined} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      {children}
    </div>
  );
}

export function Select({ label, help, value, onChange, options, className }: Base & {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {help && <p className="help">{help}</p>}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Check({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Radios<T extends string>({ legend, name, value, options, onChange, inline }: {
  legend: ReactNode; name: string; value: T | ''; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; inline?: boolean;
}) {
  return (
    <fieldset className={`radios ${inline ? 'inline' : ''}`}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="check">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Wraps a work area: in a read-only run every control inside is disabled. */
export function Editable({ children, className }: { children: ReactNode; className?: string }) {
  const { editable } = useRun();
  return <fieldset className={`plain ${className ?? ''}`} disabled={!editable}>{children}</fieldset>;
}
