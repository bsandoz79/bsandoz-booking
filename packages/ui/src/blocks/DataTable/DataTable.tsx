import { useState, type ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Contenu de la cellule (par défaut : `row[key]`). */
  render?: (row: T) => ReactNode;
  /** Valeur de tri : la colonne devient triable si fournie. */
  sortValue?: (row: T) => string | number;
  align?: 'start' | 'end';
}

export interface DataTableProps<T> {
  /** Titre du tableau (légende, lue par les lecteurs d'écran). */
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Message affiché quand il n'y a aucune ligne. */
  emptyLabel: string;
  /** Masque visuellement la légende (reste accessible). */
  hideCaption?: boolean;
  onRowClick?: (row: T) => void;
  /** Libellé du bouton d'ouverture d'une ligne (avec `onRowClick`), reçoit la ligne. */
  rowActionLabel?: (row: T) => string;
}

type Sort = { key: string; direction: 'ascending' | 'descending' };

/** Tableau de données : tri par colonne (clic sur l'en-tête), affichage en cartes sur mobile. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  emptyLabel,
  hideCaption = false,
  onRowClick,
  rowActionLabel,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<Sort | undefined>(undefined);

  const valeurTri = sort && columns.find((c) => c.key === sort.key)?.sortValue;
  const lignes = sort && valeurTri
    ? [...rows].sort((a, b) => {
        const va = valeurTri(a);
        const vb = valeurTri(b);
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr');
        return sort.direction === 'ascending' ? cmp : -cmp;
      })
    : rows;

  const trier = (key: string) =>
    setSort((s) => ({ key, direction: s?.key === key && s.direction === 'ascending' ? 'descending' : 'ascending' }));

  const cellule = (row: T, col: DataTableColumn<T>): ReactNode =>
    col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '');

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className={hideCaption ? styles.srOnly : styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={col.align === 'end' ? styles.end : undefined}
                aria-sort={sort?.key === col.key ? sort.direction : col.sortValue ? 'none' : undefined}
              >
                {col.sortValue ? (
                  <button type="button" className={styles.sort} onClick={() => trier(col.key)}>
                    {col.header}
                    <span aria-hidden="true" className={styles.arrow}>
                      {sort?.key === col.key ? (sort.direction === 'ascending' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>{emptyLabel}</td>
            </tr>
          ) : (
            lignes.map((row) => (
              <tr key={rowKey(row)} className={onRowClick ? styles.clickable : undefined}>
                {columns.map((col, i) => (
                  <td key={col.key} data-label={col.header} className={col.align === 'end' ? styles.end : undefined}>
                    {i === 0 && onRowClick ? (
                      <button
                        type="button"
                        className={styles.rowButton}
                        aria-label={rowActionLabel?.(row)}
                        onClick={() => onRowClick(row)}
                      >
                        {cellule(row, col)}
                      </button>
                    ) : (
                      cellule(row, col)
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
