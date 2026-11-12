import { formatEuros } from '@bsandoz/ui';
import type { ProduitItem } from '../../data/demo';
import styles from './ChoixProduits.module.css';

export interface ChoixProduitsProps {
  produits: ProduitItem[];
  /** Quantité choisie par identifiant (absent ou 0 : non ajouté). */
  quantites: Record<string, number>;
  onChange: (id: string, quantite: number) => void;
  /** Titre et texte d'introduction (false : déjà portés par une fenêtre). */
  avecTitre?: boolean;
}

/**
 * Produits proposés juste avant de confirmer : réglés avec la prestation (en ligne ou sur place), apportés le jour du rendez-vous.
 * « Ajouter », puis − / + dans la limite du stock.
 */
export function ChoixProduits({ produits, quantites, onChange, avecTitre = true }: ChoixProduitsProps) {
  if (produits.length === 0) return null;
  const total = produits.reduce((t, p) => t + p.priceCents * (quantites[p.id] ?? 0), 0);

  return (
    <section className={`${styles.bloc} ${avecTitre ? styles.avecTitre : ''}`} {...(avecTitre ? { 'aria-labelledby': 'titre-produits' } : { 'aria-label': 'Produits proposés' })}>
      {avecTitre && <h3 id="titre-produits" className={styles.titre}>À ajouter à votre commande ?</h3>}
      {avecTitre && <p className={styles.intro}>Mes produits d’entretien, réglés avec la prestation : je vous les apporte le jour du rendez-vous.</p>}
      <ul className={styles.liste}>
        {produits.map((p) => {
          const q = quantites[p.id] ?? 0;
          return (
            <li key={p.id} className={`${styles.produit} ${q > 0 ? styles.choisi : ''}`}>
              {p.photo ? <img className={styles.photo} src={p.photo} alt="" width="64" height="64" loading="lazy" /> : <span className={styles.photo} aria-hidden="true">✦</span>}
              <div className={styles.texte}>
                <strong>{p.name}</strong>
                {p.description && <span className={styles.description}>{p.description}</span>}
                <span className={styles.prix}>{formatEuros(p.priceCents)}</span>
              </div>
              {q === 0 ? (
                <button type="button" className={`btn btn--ghost ${styles.ajouter}`} onClick={() => onChange(p.id, 1)} aria-label={`Ajouter ${p.name}`}>Ajouter</button>
              ) : (
                <div className={styles.quantite} role="group" aria-label={`Quantité de ${p.name}`}>
                  <button type="button" onClick={() => onChange(p.id, q - 1)} aria-label={q === 1 ? `Retirer ${p.name}` : `Un ${p.name} de moins`}>−</button>
                  <span className={styles.nombre} aria-live="polite">{q}</span>
                  <button type="button" onClick={() => onChange(p.id, q + 1)} disabled={q >= p.stock} aria-label={`Un ${p.name} de plus`}>+</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {total > 0 && <p className={styles.total}>Produits : <strong>{formatEuros(total)}</strong></p>}
    </section>
  );
}
