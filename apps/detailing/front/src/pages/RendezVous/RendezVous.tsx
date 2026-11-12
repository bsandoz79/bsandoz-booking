import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CarteRendezVous } from '../../components/CarteRendezVous/CarteRendezVous';
import type { Formule } from '../../data/demo';
import { getCatalog } from '../../services/api';
import { annulerParLien, deplacerParLien, rendezVousParLien, type RendezVous as Rdv } from '../../services/compte';
import styles from '../Compte/Compte.module.css';

/** /rendez-vous?jeton=… : gérer un rendez-vous sans compte, depuis le lien de l'e-mail de confirmation. */
export function RendezVous() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton') ?? '';
  const [rdv, setRdv] = useState<Rdv>();
  const [formules, setFormules] = useState<Formule[]>([]);
  const [erreurChargement, setErreur] = useState('');
  const erreur = jeton ? erreurChargement : 'Ce lien est incomplet. Ouvrez le lien reçu par e-mail tel quel.';

  const charger = useCallback(async () => {
    if (!jeton) return;
    try {
      setRdv(await rendezVousParLien(jeton));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [jeton]);

  useEffect(() => {
    if (jeton) rendezVousParLien(jeton).then(setRdv).catch((e: Error) => setErreur(e.message));
    getCatalog().then((c) => setFormules(c.formules)).catch(() => setFormules([]));
  }, [jeton]);

  return (
    <main className={`container ${styles.page}`}>
      <h1>Mon rendez-vous</h1>
      {erreur && (
        <>
          <p className={styles.erreur} role="alert">{erreur}</p>
          <p>Le lien a peut-être expiré (le rendez-vous est passé). <Link to="/mon-espace">Connectez-vous à votre espace</Link> ou <Link to="/reserver">prenez un nouveau rendez-vous</Link>.</p>
        </>
      )}
      {!rdv && !erreur && <p aria-busy="true">Chargement…</p>}
      {rdv && (
        <CarteRendezVous rdv={rdv} formule={formules.find((f) => f.id === rdv.prestationId)}
          onDeplacer={async (start) => { await deplacerParLien(jeton, start); await charger(); }}
          onAnnuler={async () => { const resultat = await annulerParLien(jeton); await charger(); return resultat; }} />
      )}
      <p className={styles.aide}>Une question ? Répondez simplement à l'e-mail de confirmation.</p>
    </main>
  );
}
