import { useId } from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Texte d'aide sous le libellé. */
  hint?: string;
  disabled?: boolean;
}

/** Interrupteur oui / non (rôle « switch ») : ex. prestation active, durée incertaine. */
export function Toggle({ label, checked, onChange, hint, disabled = false }: ToggleProps) {
  const id = useId();
  const hintId = hint ? `${id}-aide` : undefined;

  return (
    <div className={styles.toggle}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hintId}
        disabled={disabled}
        className={[styles.track, checked ? styles.on : ''].join(' ').trim()}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
      <div className={styles.text}>
        <label htmlFor={id} className={styles.label}>{label}</label>
        {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      </div>
    </div>
  );
}
