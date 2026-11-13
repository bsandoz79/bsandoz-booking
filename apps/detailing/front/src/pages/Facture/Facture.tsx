import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { estConnecte, reprendreSession, rolesSession } from '../../services/compte';
import { facturePro, maFacture, type Facture } from '../../services/factures';
import { useSeo } from '../../seo/useSeo';
import styles from './Facture.module.css';

const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Facture imprimable (« Imprimer / enregistrer en PDF » du navigateur) : le client voit les siennes, le pro toutes.
 * Sans session, invite à se connecter.
 */
export function FactureVue() {
  const { id = '' } = useParams();
  useSeo('Facture | Perfect Clean');
  const [facture, setFacture] = useState<Facture>();
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'connexion' | 'introuvable'>('chargement');

  useEffect(() => {
    (estConnecte() ? Promise.resolve(true) : reprendreSession()).then(async (connecte) => {
      if (!connecte) { setEtat('connexion'); return; }
      try {
        setFacture(await (rolesSession().includes('ROLE_PRO') ? facturePro(id) : maFacture(id)));
        setEtat('ok');
      } catch {
        setEtat('introuvable');
      }
    }).catch(() => setEtat('introuvable'));
  }, [id]);

  if (etat === 'chargement') return <main className="container" style={{ paddingBlock: '3rem' }}><p>Chargement de la facture…</p></main>;
  if (etat === 'connexion') {
    return (
      <main className="container" style={{ paddingBlock: '3rem' }}>
        <h1>Votre facture</h1>
        <p>Connectez-vous pour voir votre facture.</p>
        <p><Link className="btn" to="/mon-espace">Se connecter</Link></p>
      </main>
    );
  }
  if (etat === 'introuvable' || !facture) return <main className="container" style={{ paddingBlock: '3rem' }}><h1>Facture introuvable</h1></main>;

  const { vendeur, client } = facture;
  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
      </div>
      <article className={styles.facture} aria-labelledby="titre-facture">
        <header className={styles.entete}>
          <div>
            <img src="/logo.png" alt="" width="64" height="56" className={styles.logo} />
            <p className={styles.vendeurNom}>{vendeur.nom}</p>
            <p>{vendeur.adresse}</p>
            <p>SIRET : {vendeur.siret}</p>
            <p>{vendeur.email} · {vendeur.telephone}</p>
          </div>
          <div className={styles.numero}>
            <h1 id="titre-facture">Facture {facture.numero}</h1>
            <p>Émise le {date(facture.emiseLe)}</p>
            <p>Prestation du {date(facture.prestationLe)}</p>
          </div>
        </header>

        <section className={styles.client} aria-label="Client">
          <p className={styles.libelle}>Facturé à</p>
          {client.entreprise ? (
            <>
              <p><strong>{client.entreprise}</strong></p>
              {client.siret && <p>SIRET : {client.siret}</p>}
              <p>{client.adresseFacturation || client.adresse}</p>
              <p>À l’attention de {client.nom}</p>
            </>
          ) : (
            <>
              <p><strong>{client.nom}</strong></p>
              <p>{client.adresse}</p>
            </>
          )}
          <p>{client.email}</p>
        </section>

        <table className={styles.lignes}>
          <thead><tr><th scope="col">Désignation</th><th scope="col">Montant</th></tr></thead>
          <tbody>
            {facture.lignes.map((l, i) => <tr key={`${l.libelle}-${i}`}><td>{l.libelle}</td><td>{formatEuros(l.montantCents)}</td></tr>)}
          </tbody>
          <tfoot><tr><th scope="row">Total</th><td>{formatEuros(facture.totalCents)}</td></tr></tfoot>
        </table>

        <footer className={styles.pied}>
          <p><strong>Facture acquittée</strong>{facture.payeEnLigneCents > 0 ? ` : ${formatEuros(facture.payeEnLigneCents)} réglés en ligne` : ''}{facture.payeSurPlaceCents > 0 ? `${facture.payeEnLigneCents > 0 ? ',' : ' :'} ${formatEuros(facture.payeSurPlaceCents)} réglés sur place${facture.moyenSurPlace ? ` par ${facture.moyenSurPlace}` : ''}` : ''}.</p>
          <p>{vendeur.mentionTva}</p>
        </footer>
      </article>
    </main>
  );
}
