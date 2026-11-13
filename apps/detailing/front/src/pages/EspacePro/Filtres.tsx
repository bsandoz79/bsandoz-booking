import { Field } from '@bsandoz/ui';
import r from '../../components/Reglages/Reglages.module.css';
import f from './Filtres.module.css';

/** Barre de filtres : recherche par nom et catégories en puces (« Toutes » + chaque catégorie). */
export function Filtres({ recherche, onRecherche, categories, categorie, onCategorie, libelleRecherche }: {
  recherche: string; onRecherche: (v: string) => void; categories: { value: string; label: string }[] | string[];
  categorie: string; onCategorie: (v: string) => void; libelleRecherche: string;
}) {
  const liste = (categories as (string | { value: string; label: string })[]).map((c) => (typeof c === 'string' ? { value: c, label: c } : c));
  return (
    <div className={f.filtres}>
      <div className={f.recherche}><Field label={libelleRecherche} type="search" value={recherche} placeholder="Nom…" onChange={(e) => onRecherche(e.target.value)} /></div>
      {liste.length > 0 && (
        <div className={f.puces} role="group" aria-label="Filtrer par catégorie">
          {[{ value: '', label: 'Toutes' }, ...liste].map((c) => (
            <button key={c.value || 'toutes'} type="button" className={`${r.boutonContour} ${f.puce}`} aria-pressed={categorie === c.value} onClick={() => onCategorie(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
