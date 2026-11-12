import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './AddressInput.module.css';

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

export interface AddressInputProps {
  label: string;
  /** Recherche des suggestions (ex. GET /api/v1/geo/search). */
  search: (query: string) => Promise<AddressSuggestion[]>;
  onSelect: (address: AddressSuggestion) => void;
  /** Adresse déjà choisie (affichée dans le champ). */
  value?: AddressSuggestion | null;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Nombre de caractères avant de chercher. */
  minLength?: number;
  /** Délai d'attente après la frappe, en millisecondes. */
  debounceMs?: number;
  noResultsLabel?: string;
  loadingLabel?: string;
}

/**
 * Champ d'adresse avec autocomplétion (motif ARIA « combobox ») : flèches pour parcourir les suggestions,
 * Entrée pour choisir, Échap pour fermer. Les réponses arrivées dans le désordre sont ignorées.
 */
export function AddressInput({
  label,
  search,
  onSelect,
  value = null,
  placeholder,
  hint,
  error,
  minLength = 3,
  debounceMs = 300,
  noResultsLabel = 'Aucune adresse trouvée.',
  loadingLabel = 'Recherche…',
}: AddressInputProps) {
  const id = useId();
  const listId = `${id}-liste`;
  const hintId = hint ? `${id}-aide` : undefined;
  const errorId = error ? `${id}-erreur` : undefined;
  const [query, setQuery] = useState(value?.label ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const requete = useRef(0);

  useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value?.label]);

  useEffect(() => {
    const texte = query.trim();
    if (!open || texte.length < minLength || texte === value?.label) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const numero = ++requete.current;
    setLoading(true);
    const timer = setTimeout(() => {
      search(texte)
        .then((resultats) => {
          if (numero === requete.current) {
            setSuggestions(resultats);
            setActive(-1);
          }
        })
        .catch(() => {
          if (numero === requete.current) setSuggestions([]);
        })
        .finally(() => {
          if (numero === requete.current) setLoading(false);
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, open, minLength, debounceMs, search, value?.label]);

  const choisir = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.label);
    setOpen(false);
    setSuggestions([]);
    onSelect(suggestion);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter' && active >= 0 && suggestions[active]) {
      event.preventDefault();
      choisir(suggestions[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const montrerListe = open && query.trim().length >= minLength && query.trim() !== value?.label;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input
        id={id}
        className={[styles.control, error ? styles.invalid : ''].join(' ').trim()}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={montrerListe && suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <ul id={listId} role="listbox" aria-label={label} className={styles.list} hidden={!montrerListe || suggestions.length === 0}>
        {suggestions.map((s, i) => (
          <li
            key={`${s.label}-${i}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={[styles.option, i === active ? styles.active : ''].join(' ').trim()}
            onMouseDown={(e) => { e.preventDefault(); choisir(s); }}
          >
            {s.label}
          </li>
        ))}
      </ul>
      <p className={styles.status} aria-live="polite">
        {montrerListe && loading ? loadingLabel : ''}
        {montrerListe && !loading && suggestions.length === 0 ? noResultsLabel : ''}
      </p>
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
