import { useCallback, useEffect, useState } from 'react';
import { Button, PlanningView, formatEuros, startOfWeek, type PlanningEvent, type PlanningMode } from '@bsandoz/ui';
import { ajusterCarte, carteClient, type CarteFidelite } from '../../services/fidelite';
import { annulerRendezVous, catalogue, changerStatut, horaires, indisponibilites, planning, rembourser, type Indisponibilite, type Plage, type RendezVousPro } from '../../services/pro';
import { dateHeure, jourLocal, localIso, plusJours } from './dates';
import { STATUTS } from './statutsRdv';
import { IconeTelephone } from '../../components/Telephone/Telephone';
import { lienTel } from '../../components/Telephone/numeroTelephone';
import { BoutonItineraire } from '../../components/Itineraire/Itineraire';
import { Icone } from '../../components/Icone/Icone';
import r from '../../components/Reglages/Reglages.module.css';
import { defilerVers } from '../../app/defilement';
import { Link } from 'react-router-dom';
import { emettreFacture } from '../../services/factures';
import styles from './Pro.module.css';


const LIBELLES = {
  day: 'Jour', week: 'Semaine', month: 'Mois', previous: 'Période précédente', next: 'Période suivante', today: 'Aujourd’hui',
  empty: 'Rien de prévu', more: (n: number) => `+${n}`,
  dayWithCount: (jour: string, n: number) => `${jour}, ${n === 0 ? 'aucun rendez-vous' : n === 1 ? '1 élément' : `${n} éléments`}`,
};

/** Couleur des cases : bleu, ou orange quand des produits sont à apporter ; gris une fois terminé. */
const COULEUR_RDV = '#2563eb';
const COULEUR_PRODUITS = '#ea580c';
const COULEUR_TERMINE = '#64748b';
const avecProduits = (r: RendezVousPro) => (r.produits?.length ?? 0) > 0;
const heureLocale = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Plage affichée : de la première ouverture à la dernière fermeture de la semaine (7 h – 20 h par défaut). */
function plageHoraire(plages: Plage[]): [number, number] {
  if (plages.length === 0) return [7, 20];
  const debut = Math.min(...plages.map((p) => Number(p.startsAt.slice(0, 2))));
  const fin = Math.max(...plages.map((p) => Math.ceil(Number(p.endsAt.slice(0, 2)) + Number(p.endsAt.slice(3, 5)) / 60)));
  return [Math.max(0, debut - 1), Math.min(24, fin + 1)];
}

/** Période chargée : couvre la semaine et le mois du jour affiché. */
function periode(jour: string): [string, string] {
  const lundi = startOfWeek(jour);
  const debutMois = `${jour.slice(0, 7)}-01`;
  const [y, m] = jour.split('-').map(Number);
  const moisSuivant = jourLocal(new Date(y, m, 1));
  const from = lundi < debutMois ? lundi : startOfWeek(debutMois);
  const finSemaine = plusJours(lundi, 7);
  return [from, plusJours(finSemaine > moisSuivant ? finSemaine : moisSuivant, 7)];
}

export function PlanningOnglet() {
  const [aujourdhui] = useState(() => jourLocal(new Date()));
  const [mode, setMode] = useState<PlanningMode>('day');
  const [plage, setPlage] = useState<[number, number]>([7, 20]);
  const [maintenant, setMaintenant] = useState(heureLocale);
  const [nomsOptions, setNomsOptions] = useState<Record<string, string>>({});
  useEffect(() => { horaires().then((h) => setPlage(plageHoraire(h))).catch(() => undefined); }, []);
  useEffect(() => {
    catalogue().then((c) => {
      setNomsOptions(Object.fromEntries(c.options.filter((o) => o.id).map((o) => [o.id as string, o.name])));
    }).catch(() => undefined);
  }, []);
  useEffect(() => { const t = window.setInterval(() => setMaintenant(heureLocale()), 60_000); return () => window.clearInterval(t); }, []);
  const [jour, setJour] = useState(aujourdhui);
  const [rdv, setRdv] = useState<RendezVousPro[]>([]);
  const [conges, setConges] = useState<Indisponibilite[]>([]);
  const [choisi, setChoisi] = useState<string>();
  const [erreur, setErreur] = useState('');
  const [from, to] = periode(jour);

  const charger = useCallback(() => {
    planning(from, to).then(setRdv).catch((e: Error) => setErreur(e.message));
    indisponibilites(from, to).then(setConges).catch(() => setConges([]));
  }, [from, to]);

  useEffect(() => { charger(); }, [charger]);

  const evenements: PlanningEvent[] = [
    ...rdv.filter((r) => r.status !== 'cancelled' && r.status !== 'expired').map((r) => ({
      id: r.id, start: localIso(r.start), end: localIso(r.end),
      // Dans la case : le client et le service ; les produits à apporter s'il y en a (case orange).
      title: [r.client.name, r.prestation].filter(Boolean).join(' · ') || 'Rendez-vous',
      subtitle: avecProduits(r) ? `+ ${r.produits!.map((p) => `${p.quantite > 1 ? `${p.quantite} × ` : ''}${p.nom}`).join(', ')}` : undefined,
      tone: r.status === 'pending_payment' ? ('muted' as const) : ('default' as const),
      color: r.status === 'done' ? COULEUR_TERMINE : avecProduits(r) ? COULEUR_PRODUITS : COULEUR_RDV,
    })),
    ...conges.map((c) => ({ id: `conge-${c.id}`, start: localIso(c.start), end: localIso(c.end), title: c.reason || 'Indisponible', tone: 'blocked' as const })),
  ];
  // Vue jour : détail à droite, le rendez-vous choisi ou, par défaut, le prochain à venir.
  const actifs = rdv.filter((r) => r.status === 'confirmed' || r.status === 'pending_payment');
  const prochain = [...actifs].filter((r) => new Date(r.end).getTime() >= Date.parse(`${aujourdhui}T${maintenant}`)).sort((a, b) => a.start.localeCompare(b.start))[0];
  const selection = rdv.find((r) => r.id === choisi) ?? (mode === 'day' ? prochain : undefined);

  return (
    <section className={styles.section} aria-labelledby="titre-planning">
      <h2 id="titre-planning">Planning</h2>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <ul className={styles.legende} aria-label="Couleurs du planning">
        <li><span style={{ background: COULEUR_RDV }} aria-hidden="true" />Rendez-vous</li>
        <li><span style={{ background: COULEUR_PRODUITS }} aria-hidden="true" />Avec produit à apporter</li>
        <li><span style={{ background: COULEUR_TERMINE }} aria-hidden="true" />Terminé</li>
        <li><span className={styles.legendeAttente} aria-hidden="true" />Paiement en attente</li>
        <li><span className={styles.legendeConge} aria-hidden="true" />Indisponible</li>
      </ul>
      <div className={mode === 'day' ? styles.vueJour : undefined}>
        <PlanningView mode={mode} date={jour} today={aujourdhui} events={evenements} labels={LIBELLES}
          hourStart={plage[0]} hourEnd={plage[1]} now={maintenant} showTime={false} fitHeight
          onModeChange={setMode} onDateChange={setJour}
          onEventClick={(e) => {
            if (e.id.startsWith('conge-')) return;
            setChoisi(e.id);
            // Semaine et mois : le détail s'ouvre sous le planning, on y descend ; jour : à droite, sauf sur téléphone (dessous).
            if (mode !== 'day' || window.matchMedia?.('(max-width: 999px)').matches) defilerVers('detail-rdv');
          }} />
        {mode === 'day' ? (
          <aside id="detail-rdv" className={styles.colonneDetail} aria-label="Détail du rendez-vous">
            {selection ? (
              <>
                {selection.id === prochain?.id && !choisi && <p className={styles.surtitreDetail}>Prochain rendez-vous</p>}
                <DetailRendezVous rdv={selection} nomsOptions={nomsOptions} onChange={charger} />
              </>
            ) : <p className={styles.aide}>Aucun rendez-vous à venir. Touchez un rendez-vous du planning pour voir son détail.</p>}
          </aside>
        ) : selection && (
          <div id="detail-rdv" className={styles.ancreDetail}>
            <DetailRendezVous rdv={selection} nomsOptions={nomsOptions} onFermer={() => setChoisi(undefined)} onChange={charger} />
          </div>
        )}
      </div>
    </section>
  );
}

/** « 1 h 30 », « 45 min ». */
const dureeTexte = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}` : `${min} min`);

export function DetailRendezVous({ rdv, nomsOptions = {}, onFermer, onChange }: { rdv: RendezVousPro; nomsOptions?: Record<string, string>; onFermer?: () => void; onChange: () => void }) {
  // Ce que le client a demandé : options (avec le nombre de véhicules concernés), modèle, entreprise.
  const options = [...new Set(rdv.optionIds)].map((id) => {
    const n = rdv.optionIds.filter((x) => x === id).length;
    return `${nomsOptions[id] ?? 'Option'}${n > 1 ? ` × ${n}` : ''}`;
  });
  const m = rdv.metierData;
  const texte = (cle: string) => (typeof m[cle] === 'string' && m[cle] !== '' ? String(m[cle]) : '');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [annulation, setAnnulation] = useState(false);
  const [maintenant] = useState(() => Date.now());
  const passe = new Date(rdv.start).getTime() <= maintenant;

  const agir = async (action: () => Promise<string>) => {
    setErreur('');
    try {
      setMessage(await action());
      onChange();
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  const heureFin = new Date(rdv.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dureeMin = Math.round((new Date(rdv.end).getTime() - new Date(rdv.start).getTime()) / 60000);
  const enLigne = rdv.enLigneCents ?? (rdv.paiementEnLigne === false ? rdv.depositCents : rdv.depositCents + (rdv.produitsCents ?? 0));
  // À encaisser : fourni par l'API, sinon total moins ce qui est réglé en ligne.
  const surPlace = rdv.surPlaceCents ?? Math.max(0, rdv.totalCents + (rdv.produitsCents ?? 0) - (rdv.status === 'pending_payment' ? 0 : enLigne));
  const vehicules = Array.isArray(m.vehicules) ? (m.vehicules as string[]) : [];
  const vehicule = vehicules.length > 0 ? vehicules.join(' · ') : texte('modele');

  return (
    <div className={`${styles.panneau} ${styles.detailRdv}`} role="region" aria-label={`Rendez-vous du ${dateHeure(rdv.start)}`}>
      <div className={styles.detailEntete}>
        <div>
          <p className={styles.detailQuand}>{dateHeure(rdv.start)} → {heureFin}</p>
          <p className={r.aide}>{dureeTexte(dureeMin)} sur place</p>
        </div>
        <span className={`${styles.pastilleStatut} ${styles[`statut_${rdv.status}`] ?? ''}`}>{STATUTS[rdv.status]}</span>
        {onFermer && <button type="button" className={r.boutonContour} onClick={onFermer}>Fermer</button>}
      </div>

      {/* Fiche compacte : une ligne par information, sans défilement. */}
      <dl className={styles.fiche}>
        <div aria-label="Client">
          <dt><Icone nom="utilisateur" taille={17} /><span>Client</span></dt>
          <dd><strong>{rdv.client.name || '—'}</strong>{texte('entreprise') ? ` · ${texte('entreprise')}${texte('siret') ? ` (SIRET ${texte('siret')})` : ''}` : ''}</dd>
        </div>
        <div>
          <dt><Icone nom="position" taille={17} /><span>Adresse</span></dt>
          <dd>{rdv.address || 'Sur place'}{texte('adresseFacturation') ? <span className={r.ligneSous}> · facturation : {texte('adresseFacturation')}</span> : null}</dd>
        </div>
        <div aria-label="Prestation">
          <dt><Icone nom="catalogue" taille={17} /><span>Prestation</span></dt>
          <dd><strong>{rdv.prestation || '—'}</strong>{(rdv.quantite ?? 1) > 1 ? ` × ${rdv.quantite} véhicules` : ''}{options.length > 0 ? <span className={r.ligneSous}> · {options.join(', ')}</span> : null}</dd>
        </div>
        {vehicule && (
          <div>
            <dt><Icone nom="carteIdentite" taille={17} /><span>Véhicule</span></dt>
            <dd>{vehicule}</dd>
          </div>
        )}
        {rdv.produits && rdv.produits.length > 0 && (
          <div>
            <dt><Icone nom="produit" taille={17} /><span>À apporter</span></dt>
            <dd className={r.attention}>{rdv.produits.map((p) => `${p.quantite} × ${p.nom}`).join(', ')}</dd>
          </div>
        )}
        {rdv.notes && (
          <div>
            <dt><Icone nom="facture" taille={17} /><span>Précisions</span></dt>
            <dd>{rdv.notes}</dd>
          </div>
        )}
        <div aria-label="Paiement">
          <dt><Icone nom="euro" taille={17} /><span>Paiement</span></dt>
          <dd>
            Total <strong>{formatEuros(rdv.totalCents + (rdv.produitsCents ?? 0))}</strong>
            {enLigne > 0 ? ` · ${rdv.status === 'pending_payment' ? 'en ligne en attente' : 'payé en ligne'} ${formatEuros(enLigne)}` : ''}
            {' · '}<span className={surPlace > 0 ? r.accent : undefined}>{surPlace > 0 ? `À encaisser sur place ${formatEuros(surPlace)}` : 'tout est réglé'}</span>
            {rdv.travelFeeCents > 0 || rdv.remiseFideliteCents ? (
              <span className={r.ligneSous}>{' '}({rdv.travelFeeCents > 0 ? `déplacement ${formatEuros(rdv.travelFeeCents)}` : ''}{rdv.travelFeeCents > 0 && rdv.remiseFideliteCents ? ', ' : ''}{rdv.remiseFideliteCents ? `remise fidélité ${formatEuros(rdv.remiseFideliteCents)}` : ''})</span>
            ) : null}
          </dd>
        </div>
        {rdv.clientId && (
          <div>
            <dt><Icone nom="ticket" taille={17} /><span>Fidélité</span></dt>
            <dd><Fidelite clientId={rdv.clientId} /></dd>
          </div>
        )}
        {rdv.status === 'done' && (
          <div>
            <dt><Icone nom="facture" taille={17} /><span>Facture</span></dt>
            <dd><BoutonFacture reservationId={rdv.id} /></dd>
          </div>
        )}
      </dl>

      {/* Contacter le client : tout en bas de la fiche. */}
      {(rdv.client.phone || rdv.client.email || rdv.address) && (
        <div className={styles.detailContact}>
          {rdv.client.phone && <a className={styles.appelClient} href={lienTel(rdv.client.phone)}><IconeTelephone /> Appeler {rdv.client.phone}</a>}
          {rdv.client.email && <a className={r.boutonContour} href={`mailto:${rdv.client.email}`}><Icone nom="mail" taille={17} /> Écrire</a>}
          {rdv.address && <BoutonItineraire destination={{ address: rdv.address }} nom={rdv.client.name} />}
        </div>
      )}

      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {rdv.status === 'confirmed' && !annulation && (
        <div className={styles.detailActions}>
          {passe && <Button onClick={() => agir(async () => { await changerStatut(rdv.id, 'done'); return 'Rendez-vous marqué comme terminé.'; })}>Terminé</Button>}
          {passe && <Button variant="secondary" onClick={() => agir(async () => { await changerStatut(rdv.id, 'no_show'); return 'Client marqué absent.'; })}>Client absent</Button>}
          <button type="button" className={r.boutonDanger} onClick={() => setAnnulation(true)}>Annuler le rendez-vous</button>
        </div>
      )}
      {annulation && rdv.status !== 'cancelled' && (
        <div className={styles.detailAnnulation}>
          <p><strong>Annuler ce rendez-vous ?</strong> Le client est prévenu par e-mail.</p>
          <div className={styles.actions}>
            <Button onClick={() => agir(async () => { const r2 = await annulerRendezVous(rdv.id, true); setAnnulation(false); return `Rendez-vous annulé, ${formatEuros(r2.refundedCents)} remboursés.`; })}>Annuler et rembourser l’acompte</Button>
            <Button variant="secondary" onClick={() => agir(async () => { await annulerRendezVous(rdv.id, false); setAnnulation(false); return 'Rendez-vous annulé sans remboursement.'; })}>Annuler sans rembourser</Button>
            <Button variant="ghost" onClick={() => setAnnulation(false)}>Garder le rendez-vous</Button>
          </div>
        </div>
      )}
      {(rdv.status === 'cancelled' || rdv.status === 'no_show') && rdv.depositCents > 0 && (
        <div className={styles.detailActions}>
          <Button variant="secondary" onClick={() => agir(async () => { const r2 = await rembourser(rdv.id); return `${formatEuros(r2.refundedCents)} remboursés.`; })}>Rembourser l’acompte</Button>
        </div>
      )}
    </div>
  );
}

/** Carte de fidélité du client, avec ajout / retrait d'un tampon (carte papier, prestation hors site…). */
function Fidelite({ clientId }: { clientId: string }) {
  const [carte, setCarte] = useState<CarteFidelite>();
  useEffect(() => { carteClient(clientId).then(setCarte).catch(() => undefined); }, [clientId]);
  if (!carte) return <span>…</span>;
  if (!carte.actif) return <span>désactivée</span>;
  const ajuster = (delta: number) => ajusterCarte(clientId, delta).then(setCarte).catch(() => undefined);
  return (
    <span className={styles.actions}>
      <span>{carte.tampons} / {carte.tamponsRequis}{carte.remiseDisponible ? ` · −${carte.remisePercent} % à la prochaine réservation` : ''}</span>
      <button type="button" className={r.boutonContour} disabled={carte.tampons === 0} onClick={() => ajuster(-1)} aria-label="Retirer un tampon">−</button>
      <button type="button" className={r.boutonContour} onClick={() => ajuster(1)} aria-label="Ajouter un tampon">+</button>
    </span>
  );
}

/** Prestation faite : ouvre sa facture (émise automatiquement, ou créée à la demande pour un rendez-vous plus ancien). */
function BoutonFacture({ reservationId }: { reservationId: string }) {
  const [facture, setFacture] = useState<{ id: string; numero: string }>();
  const [erreur, setErreur] = useState('');
  if (facture) return <Link to={`/facture/${facture.id}`}>Voir la facture {facture.numero}</Link>;
  return (
    <>
      <Button variant="ghost" onClick={async () => { try { setFacture(await emettreFacture(reservationId)); } catch (e) { setErreur((e as Error).message); } }}>Ouvrir la facture</Button>
      {erreur && <span className={styles.erreur} role="alert"> {erreur}</span>}
    </>
  );
}
