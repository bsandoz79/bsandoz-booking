import { useEffect, useState } from 'react';
import { ContactDirect } from '../../components/FormulaireDevis/ContactDirect';
import { FormulaireDevis } from '../../components/FormulaireDevis/FormulaireDevis';
import { SITE } from '../../data/site';
import { getZone } from '../../services/api';
import { PAGES_SEO } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import styles from './Professionnels.module.css';

const PAGE = PAGES_SEO.find((p) => p.chemin === '/professionnels');

/**
 * Page « Professionnels » (flottes, utilitaires, poids lourds, garages) : uniquement sur devis. Formulaire de demande
 * transmis au pro par mail (POST /contact), coordonnées modifiables dans l'espace pro (« Mon site »).
 */
export function Professionnels() {
  useSeo(PAGE?.titre ?? 'Professionnels | Perfect Clean', PAGE?.description);
  const [rayon, setRayon] = useState<number>();
  useEffect(() => { getZone().then((z) => setRayon(z.surPlace ? undefined : z.maxDistanceKm)).catch(() => undefined); }, []);

  return (
    <main className={`container ${styles.page}`}>
      <p className={styles.surtitre}>{SITE.brand} · Professionnels</p>
      <h1>{PAGE?.h1 ?? 'Espace professionnels'}</h1>
      <p className={styles.intro}>
        Flottes, utilitaires, poids lourds, garages : j’interviens sur site à {SITE.city}{rayon ? ` et dans un rayon de ${rayon} km` : ' et alentours'}. Uniquement sur devis.
      </p>

      <ul className={styles.atouts}>
        <li><strong>Sur site</strong><span>Je viens à votre dépôt ou sur votre parking.</span></li>
        <li><strong>Devis sur mesure</strong><span>Tarif selon le nombre de véhicules et la fréquence.</span></li>
        <li><strong>Eau et électricité autonomes</strong><span>Aucun raccordement nécessaire.</span></li>
        <li><strong>Interventions planifiées</strong><span>Ponctuelles ou régulières, aux horaires qui gênent le moins votre activité.</span></li>
      </ul>

      <section aria-labelledby="titre-devis" className={styles.section}>
        <h2 id="titre-devis">Demander un devis</h2>
        <p>Décrivez votre besoin : je vous réponds avec un devis personnalisé selon votre activité.</p>
        <FormulaireDevis variante="pro" placeholder="Ex. 6 utilitaires à nettoyer une fois par mois, intérieur et extérieur." />
      </section>

      <section aria-labelledby="titre-direct" className={styles.section}>
        <h2 id="titre-direct">Ou directement</h2>
        <ContactDirect sujet="Demande de devis professionnel" />
      </section>
    </main>
  );
}
