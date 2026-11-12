import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface FieldBase {
  label: string;
  /** Aide affichée sous le champ (ex. format attendu). */
  hint?: string;
  /** Message d'erreur : champ marqué invalide et message annoncé. */
  error?: string;
  /** Texte de la mention « obligatoire » (masquée si le champ n'est pas requis). */
  requiredLabel?: string;
}

type InputFieldProps = FieldBase & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextareaFieldProps = FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };
export type FieldProps = InputFieldProps | TextareaFieldProps;

/** Champ de formulaire accessible : libellé, aide et erreur reliés au champ (aria-describedby, aria-invalid). */
export function Field(props: FieldProps) {
  const { label, hint, error, requiredLabel = 'obligatoire', id, className, multiline, ...rest } = props;
  const autoId = useId();
  const fieldId = id ?? `champ-${autoId}`;
  const hintId = hint ? `${fieldId}-aide` : undefined;
  const errorId = error ? `${fieldId}-erreur` : undefined;
  const describedBy = [rest['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;
  const common = {
    id: fieldId,
    className: [styles.control, error ? styles.invalid : '', className ?? ''].join(' ').trim(),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
        {rest.required && <span className={styles.required}> ({requiredLabel})</span>}
      </label>
      {multiline ? (
        <textarea {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...common} />
      ) : (
        <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} {...common} />
      )}
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
