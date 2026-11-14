import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Field, Toggle, formatEuros } from '@bsandoz/ui';
import { Icone } from '../../components/Icone/Icone';
import r from '../../components/Reglages/Reglages.module.css';
import { abonnes, enregistrerOffre, offresAbonnementPro, parPeriode, PERIODICITES, type Abonne, type OffreAbonnementPro, type Periodicite } from '../../services/abonnements';
import { catalogue, type PrestationPro } from '../../services/pro';
import styles from './Pro.module.css';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');
const prixValide = (t: string) => /^\d+([.,]\d{1,2})?$/.test(t.trim()) && Number(t.trim().replace(',', '.')) >= 1;
const centimes = (t: string) => Math.round(Number(t.trim().replace(',', '.')) * 100);
const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const STATUTS: Record<Abonne['statut'], string> = { actif: 'Actif', impaye: 'Prélèvement refusé', termine: 'Terminé' };

/**
 * Abonnements : offres proposées aux clients (prestation comprise, rythme, prix prélevé à chaque période) et abonnés.
 * Une prestation par période ; non réservée à temps, elle est perdue. Sans engagement pour le client.
 */
export function AbonnementsOnglet() {
  const [offres, setOffres] = useState<OffreAbonnementPro[]>([]);
  const [liste, setListe] = useState<Abonne[]>([]);
  const [prestations, setPrestations] = useState<PrestationPro[]>([]);
  const [edition, setEdition] = useState<OffreAbonnementPro>();
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = useCallback(() => {
    offresAbonnementPro().then(setOffres).catch((e: Error) => setErreur(e.message));
    abonnes().then(setListe).catch(() => setListe([]));
    catalogue().then((c) => setPrestations(c.prestations.filter((p) => !(p.composition?.length)))).catch(() => undefined);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const nouvelle = (): OffreAbonnementPro => ({ nom: '', description: '', prestationId: prestations.find((p) => p.active)?.id ?? '', periodicite: 'mois', prixCents: 0, active: true });
  const basculer = async (o: OffreAbonnementPro) => {
    setErreur('');
    try {
      await enregistrerOffre({ ...o, active: !o.active });
      setMessage(o.active ? `« ${o.nom} » n’est plus proposé (les abonnés en cours le gardent).` : `« ${o.nom} » est de nouveau proposé.`);
      charger();
    } catch (e) { setErreur((e as Error).message); }
  };

  return (
    <section className={styles.section} aria-labelledby="titre-abonnements">
      <h2 id="titre-abonnements">Abonnements</h2>
      <p className={styles.aide}>Le client choisit un abonnement dans « Mon espace » : sa carte est prélevée automatiquement à chaque période et il réserve la prestation comprise (options et déplacement en plus). Une prestation par période : non réservée à temps, elle est perdue. Sans engagement.</p>
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {edition ? (
        <FormulaireOffre initiale={edition} prestations={prestations} onAnnuler={() => setEdition(undefined)}
          onEnregistree={(o) => { setEdition(undefined); setMessage(`Abonnement « ${o.nom} » enregistré.`); charger(); }} />
      ) : (
        <>
          <div className={r.rubriqueEntete}>
            <h3>Offres</h3>
            <Button onClick={() => { setMessage(''); setEdition(nouvelle()); }}>+ Nouvel abonnement</Button>
          </div>
          {offres.length === 0 ? <p className={styles.aide}>Aucun abonnement proposé pour l’instant.</p> : (
            <ul className={r.panneau} aria-label="Offres d’abonnement">
              {offres.map((o) => (
                <li key={o.id} className={`${r.ligne} ${o.active ? '' : r.estompee}`}>
                  <Icone nom="historique" className={r.ligneIcone} />
                  <div className={r.ligneTexte}>
                    <span className={r.ligneTitre}>{o.nom}</span>
                    <span className={r.ligneSous}>{o.prestation}, {o.periodiciteLibelle} · <strong>{formatEuros(o.prixCents)} {parPeriode(o.periodicite)}</strong>{o.active ? '' : ' · non proposé'}</span>
                  </div>
                  <div className={r.ligneActions}>
                    <button type="button" className={r.boutonContour} aria-label={`Modifier ${o.nom}`} onClick={() => { setMessage(''); setEdition(o); }}>Modifier</button>
                    <button type="button" className={r.boutonContour} aria-label={o.active ? `Retirer ${o.nom}` : `Proposer ${o.nom}`} onClick={() => basculer(o)}>{o.active ? 'Retirer' : 'Proposer'}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3>Abonnés</h3>
          {liste.length === 0 ? <p className={styles.aide}>Aucun abonné pour l’instant.</p> : (
            <ul className={r.panneau} aria-label="Abonnés">
              {liste.map((a) => (
                <li key={a.id} className={`${r.ligne} ${a.statut === 'termine' ? r.estompee : ''}`}>
                  <Icone nom="utilisateur" className={r.ligneIcone} />
                  <div className={r.ligneTexte}>
                    <span className={r.ligneTitre}>{a.client.nom || a.client.email}</span>
                    <span className={r.ligneSous}>{a.offre} · depuis le {jour(a.debut)}</span>
                    <span className={r.ligneSous}>
                      {a.statut === 'termine' ? 'Terminé' : a.resiliationDemandee ? `Résilié : se termine le ${jour(a.finPeriode)}` : `Prochain prélèvement : ${jour(a.finPeriode)}`}
                    </span>
                  </div>
                  <span className={`${r.ligneValeur} ${a.statut === 'impaye' ? r.attention : a.statut === 'actif' ? r.accent : ''}`}>{STATUTS[a.statut]}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function FormulaireOffre({ initiale, prestations, onAnnuler, onEnregistree }: {
  initiale: OffreAbonnementPro; prestations: PrestationPro[]; onAnnuler: () => void; onEnregistree: (o: OffreAbonnementPro) => void;
}) {
  const [o, setO] = useState(initiale);
  const [prix, setPrix] = useState(initiale.id ? euros(initiale.prixCents) : '');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const prestation = prestations.find((p) => p.id === o.prestationId);
  const valide = o.nom.trim() !== '' && !!o.prestationId && prixValide(prix);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    setErreur('');
    setEnCours(true);
    try {
      onEnregistree(await enregistrerOffre({ ...o, nom: o.nom.trim(), prixCents: centimes(prix) }));
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <form className={styles.panneau} onSubmit={soumettre} noValidate aria-labelledby="titre-offre">
      <h3 id="titre-offre">{initiale.id ? `Modifier « ${initiale.nom} »` : 'Nouvel abonnement'}</h3>
      <div className={styles.grille}>
        <Field label="Nom" required value={o.nom} placeholder="Ex. Lavage mensuel" onChange={(e) => setO({ ...o, nom: e.target.value })} />
        <label className={styles.choix}>Prestation comprise
          <select value={o.prestationId} onChange={(e) => setO({ ...o, prestationId: e.target.value })}>
            {prestations.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (non proposée)'}</option>)}
          </select>
        </label>
        <label className={styles.choix}>Une prestation
          <select value={o.periodicite} onChange={(e) => setO({ ...o, periodicite: e.target.value as Periodicite })}>
            {PERIODICITES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <Field label="Prix prélevé à chaque période (€)" inputMode="decimal" required value={prix} onChange={(e) => setPrix(e.target.value)}
          error={prix && !prixValide(prix) ? 'Montant invalide (1 € au moins), ex. 20 ou 19,90.' : undefined}
          hint={prestation ? `Prix normal de la prestation : ${formatEuros(prestation.basePriceCents)}.` : undefined} />
      </div>
      <Field label="Précision (facultatif)" value={o.description} maxLength={200} placeholder="Ex. Idéal pour garder une voiture toujours propre."
        onChange={(e) => setO({ ...o, description: e.target.value })} />
      <Toggle label="Proposé aux clients" checked={o.active} onChange={(v) => setO({ ...o, active: v })}
        hint="Retiré : plus proposé aux nouveaux clients ; les abonnés en cours le gardent jusqu’à leur résiliation." />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div className={styles.actions}>
        <Button type="submit" loading={enCours} disabled={!valide}>Enregistrer</Button>
        <Button variant="ghost" onClick={onAnnuler}>Annuler</Button>
      </div>
    </form>
  );
}
