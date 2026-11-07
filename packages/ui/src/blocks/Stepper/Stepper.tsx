import styles from './Stepper.module.css';

export interface StepperProps {
  steps: string[];
  /** Index de l'étape courante (0 = première). */
  current: number;
}

/** Barre de progression d'un parcours en étapes. */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className={styles.stepper} aria-label="Étapes">
      {steps.map((step, i) => {
        const state = i < current ? styles.done : i === current ? styles.current : '';
        return (
          <li key={step} className={[styles.step, state].join(' ').trim()} aria-current={i === current ? 'step' : undefined}>
            <span className={styles.bar} aria-hidden="true" />
            <span className={styles.label}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
