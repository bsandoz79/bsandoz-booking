import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContactDirect } from '../../components/FormulaireDevis/ContactDirect';
import { FormulaireDevis } from '../../components/FormulaireDevis/FormulaireDevis';
import { SITE } from '../../data/site';
import { getZone } from '../../services/api';
import { PAGES_SEO } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import styles from './Professionnels.module.css';

const PAGE = PAGES_SEO.find((p) => p.chemin === '/devis');

/**
 * « Demander un devis » pour un particulier, notamment au-delà de la zone de réservation en ligne : l'adresse saisie
 * à la réservation ou sur la carte arrive pré-remplie (?adresse=).
 */
export function Devis() {
  useSeo(PAGE?.titre ?? 'Demander un devis | Perfect Clean', PAGE?.description);
  const [params] = useSearchParams();
  const adresse = params.get('adresse') ?? '';
  const [rayon, setRayon] = useState<number>();
  useEffect(() => { getZone().then((z) => setRayon(z.surPlace ? undefined : z.maxDistanceKm)).catch(() => undefined); }, []);

  return (
    <main className={`container ${styles.page}`}>
      <p className={styles.surtitre}>{SITE.brand} · Devis</p>
      <h1>{PAGE?.h1 ?? 'Demander un devis'}</h1>
      <p className={styles.intro}>
        {adresse
          ? `Votre adresse est au-delà de ${rayon ? `${rayon} km` : 'ma zone de réservation en ligne'} autour de ${SITE.city} : je peux tout de même venir, sur devis.`
          : `Besoin particulier, plusieurs véhicules ou adresse éloignée de ${SITE.city} : décrivez votre demande, je vous réponds avec un devis.`}
      </p>

      <section aria-labelledby="titre-formulaire-devis" className={styles.section}>
        <h2 id="titre-formulaire-devis">Votre demande</h2>
        <FormulaireDevis variante="particulier" adresseInitiale={adresse} placeholder="Ex. nettoyage intérieur complet d’un SUV, disponible en semaine." />
      </section>

      <section aria-labelledby="titre-direct" className={styles.section}>
        <h2 id="titre-direct">Ou directement</h2>
        <ContactDirect sujet="Demande de devis" />
      </section>
    </main>
  );
}
