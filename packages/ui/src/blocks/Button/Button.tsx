import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** principal (action principale), secondaire (bordure) ou discret (texte seul). */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Action en cours : bouton désactivé, indicateur visuel, texte annoncé aux lecteurs d'écran. */
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

/** Bouton du kit (zone tactile de 44 px, focus visible). type="button" par défaut. */
export function Button({
  variant = 'primary',
  loading = false,
  loadingLabel = 'Chargement…',
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth ? styles.full : '', className ?? ''].join(' ').trim();

  return (
    <button {...rest} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={loading ? styles.hiddenLabel : undefined}>{children}</span>
      {loading && <span className={styles.srOnly}>{loadingLabel}</span>}
    </button>
  );
}
