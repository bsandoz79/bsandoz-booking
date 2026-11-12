import styles from './ChoiceChips.module.css';

export interface Choice {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ChoiceChipsProps {
  label: string;
  choices: Choice[];
  value?: string;
  onChange: (value: string) => void;
}

/** Choix unique sous forme de pastilles (ex. variante, lieu du rendez-vous). */
export function ChoiceChips({ label, choices, value, onChange }: ChoiceChipsProps) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {choices.map((choice) => {
        const checked = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={choice.disabled}
            className={[styles.chip, checked ? styles.checked : ''].join(' ').trim()}
            onClick={() => onChange(choice.value)}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
