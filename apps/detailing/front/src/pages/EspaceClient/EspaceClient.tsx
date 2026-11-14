import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Field } from '@bsandoz/ui';
import { mesAbonnements, offresAbonnement, parPeriode, resilier, souscrire, type MonAbonnement, type OffreAbonnement } from '../../services/abonnements';
import { CarteFidelite } from '../../components/CarteFidelite/CarteFidelite';
import { CarteRendezVous } from '../../components/CarteRendezVous/CarteRendezVous';
import type { Formule } from '../../data/demo';
import { getCatalog } from '../../services/api';
import { maCarteFidelite, type CarteFidelite as Carte } from '../../services/fidelite';
import { mesFactures, type FactureResume } from '../../services/factures';
import { formatEuros } from '@bsandoz/ui';
import {
  annulerMonRendezVous, deplacerMonRendezVous, payerMonRendezVous, exporterMesDonnees, mesRendezVous, modifierMonCompte, monCompte, reprendreSession,
  seConnecter, seDeconnecter, supprimerMonCompte, type Compte, type RendezVous,
} from '../../services/compte';
import { Icone, type NomIcone } from '../../components/Icone/Icone';
import styles from '../Compte/Compte.module.css';

/** Espace client : connexion, rendez-vous à venir et passés (déplacer, annuler), compte (export, suppression, déconnexion). */
export function EspaceClient() {
  const [params] = useSearchParams();
  const [etat, setEtat] = useState<'chargement' | 'deconnecte' | 'connecte'>('chargement');
  const [message, setMessage] = useState(params.get('mdp') === 'ok' ? 'Mot de passe enregistré : vous pouvez vous connecter.' : '');

  useEffect(() => {
    reprendreSession().then((ok) => setEtat(ok ? 'connecte' : 'deconnecte'));
  }, []);

  if (etat === 'chargement') {
    return <main className={`container ${styles.page}`} aria-busy="true"><h1>Mon espace</h1><p>Chargement…</p></main>;
  }
  if (etat === 'deconnecte') {
    return <Connexion message={message} onConnecte={() => { setMessage(''); setEtat('connecte'); }} />;
  }
  return <Tableau onDeconnecte={(texte) => { setMessage(texte); setEtat('deconnecte'); }} />;
}

function Connexion({ message, onConnecte }: { message: string; onConnecte: () => void }) {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      await seConnecter(email.trim(), mdp);
      onConnecte();
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <main className={`container ${styles.page}`}>
      <h1>Mon espace</h1>
      {message && <p className={styles.ok} role="status">{message}</p>}
      <form className={styles.formulaire} onSubmit={soumettre} noValidate>
        <h2>Connexion</h2>
        <Field label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Mot de passe" type="password" autoComplete="current-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} />
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <Button type="submit" loading={enCours} loadingLabel="Connexion…" disabled={!email || !mdp}>Se connecter</Button>
        <p className={styles.aide}><Link to="/compte/mot-de-passe">Mot de passe oublié ?</Link></p>
      </form>
      <p className={styles.aide}>
        Pas encore de compte ? Il est créé à votre première <Link to="/reserver">réservation</Link> : vous recevez alors un e-mail pour choisir votre mot de passe.
        Pour gérer un rendez-vous sans compte, utilisez le lien de l'e-mail de confirmation.
      </p>
    </main>
  );
}

/** « mar. 17 nov., 9 h 30 » */
const jourCourt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** Initiales du nom (2 lettres au plus). */
const initiales = (nom: string) => nom.split(/[\s@.-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');

function Tableau({ onDeconnecte }: { onDeconnecte: (message: string) => void }) {
  const [compte, setCompte] = useState<Compte>();
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [formules, setFormules] = useState<Formule[]>([]);
  const [erreur, setErreur] = useState('');
  const [suppression, setSuppression] = useState(false);
  const [fidelite, setFidelite] = useState<Carte>();
  const [factures, setFactures] = useState<FactureResume[]>([]);
  const [maintenant] = useState(() => new Date());

  const recharger = useCallback(() => mesRendezVous().then(setRendezVous).catch((e: Error) => setErreur(e.message)), []);

  useEffect(() => {
    monCompte().then(setCompte).catch((e: Error) => setErreur(e.message));
    getCatalog().then((c) => setFormules(c.formules)).catch(() => setFormules([]));
    maCarteFidelite().then(setFidelite).catch(() => undefined);
    mesFactures().then(setFactures).catch(() => undefined);
    recharger();
  }, [recharger]);

  const aVenir = rendezVous.filter((r) => new Date(r.start) > maintenant && ['confirmed', 'pending_payment'].includes(r.status))
    .sort((a, b) => a.start.localeCompare(b.start));
  const passes = rendezVous.filter((r) => !aVenir.includes(r));

  const carte = (r: RendezVous) => (
    <CarteRendezVous key={r.id} rdv={r} formule={formules.find((f) => f.id === r.prestationId)} maintenant={maintenant}
      onDeplacer={async (start) => { await deplacerMonRendezVous(r.id, start); await recharger(); }}
      onAnnuler={async () => { const resultat = await annulerMonRendezVous(r.id); await recharger(); return resultat; }}
      onPayer={() => payerMonRendezVous(r.id)} />
  );

  const telecharger = async () => {
    const fichier = await exporterMesDonnees();
    const url = URL.createObjectURL(fichier);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'mes-donnees.json';
    lien.click();
    URL.revokeObjectURL(url);
  };

  // Ce que la suppression fait perdre, annoncé avant de confirmer.
  const perdus = [
    ...((compte?.avoirCents ?? 0) > 0 ? [`un avoir de ${formatEuros(compte!.avoirCents!)}`] : []),
    ...(fidelite?.actif && fidelite.tampons > 0 ? [`${fidelite.tampons} tampon${fidelite.tampons > 1 ? 's' : ''} de fidélité${fidelite.remiseDisponible ? ` (remise de ${fidelite.remisePercent} % prête)` : ''}`] : []),
  ];

  const supprimer = async () => {
    setErreur('');
    try {
      await supprimerMonCompte();
      onDeconnecte('Votre compte a été supprimé et vos données personnelles anonymisées.');
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  const nomComplet = compte ? `${compte.firstname} ${compte.lastname}`.trim() : '';
  const enregistrerChamp = async (donnees: Partial<Pick<Compte, 'firstname' | 'lastname' | 'phone' | 'email'>>) => {
    if (!compte) return;
    setCompte(await modifierMonCompte({ firstname: compte.firstname, lastname: compte.lastname, phone: compte.phone, email: compte.email, ...donnees }));
  };

  return (
    <main className={`container ${styles.page} ${styles.espace}`}>
      <header className={styles.entete}>
        <span className={styles.avatar} aria-hidden="true">{initiales(nomComplet || compte?.email || '?')}</span>
        <div className={styles.enteteTexte}>
          <h1>Mon espace</h1>
          {compte && <p className={styles.aide}>Bonjour {compte.firstname || nomComplet}, retrouvez ici vos rendez-vous et vos informations.</p>}
        </div>
        <button type="button" className={styles.boutonContour} onClick={async () => { await seDeconnecter(); onDeconnecte('Vous êtes déconnecté.'); }}>
          <Icone nom="sortie" taille={18} /> Se déconnecter
        </button>
      </header>
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      <Rubrique id="a-venir" titre="Mes rendez-vous" description="Vos prochains rendez-vous : déplacez-les, annulez-les ou ajoutez-les à votre agenda."
        action={<Link to="/reserver" className="btn">Réserver</Link>}>
        {aVenir.length === 0
          ? <div className={styles.panneau}><Ligne icone="calendrier" titre="Aucun rendez-vous à venir" texte="Réservez un créneau en ligne en quelques clics." /></div>
          : <div className={styles.liste}>{aVenir.map(carte)}</div>}
      </Rubrique>

      <RubriqueAbonnement />

      <Rubrique id="en-bref" titre="En bref">
        <ul className={styles.panneau} aria-label="En bref">
          <Ligne element="li" icone="calendrier" titre="Prochain rendez-vous" valeur={aVenir[0] ? jourCourt(aVenir[0].start) : 'Aucun'} />
          <Ligne element="li" icone="etoile" titre="Prestations réalisées" valeur={String(rendezVous.filter((r) => r.status === 'done').length)} />
          {fidelite?.actif && (
            <Ligne element="li" icone="ticket" titre="Carte de fidélité"
              valeur={fidelite.remiseDisponible ? `Remise de ${fidelite.remisePercent} % prête` : `${fidelite.tampons} / ${fidelite.tamponsRequis} tampons`} />
          )}
          {(compte?.avoirCents ?? 0) > 0 && (
            <Ligne element="li" icone="euro" titre="Avoir" texte="Déduit automatiquement de votre prochain rendez-vous."
              valeur={formatEuros(compte!.avoirCents!)} accent />
          )}
        </ul>
        {(compte?.avoirCents ?? 0) > 0 && (
          <p className={styles.srOnly}>Vous avez un avoir de {formatEuros(compte!.avoirCents!)} : il sera déduit automatiquement de votre prochain rendez-vous.</p>
        )}
        {fidelite?.actif && <CarteFidelite carte={fidelite} />}
      </Rubrique>

      {compte && (
        <Rubrique id="profil" titre="Mon profil" description="Ces informations servent à vous joindre et à vous envoyer la confirmation de vos rendez-vous.">
          <div className={styles.panneau}>
            <LigneModifiable icone="carteIdentite" titre="Nom et prénom" valeur={nomComplet} autoComplete="name"
              valider={(v) => (v.trim() ? '' : 'Le nom est obligatoire.')} onEnregistrer={(v) => enregistrerChamp({ firstname: v.trim(), lastname: '' })} />
            <LigneModifiable icone="mail" titre="E-mail" valeur={compte.email} type="email" autoComplete="email" aide="Sert aussi à vous connecter."
              valider={(v) => (/\S+@\S+\.\S+/.test(v) ? '' : 'Adresse e-mail invalide.')} onEnregistrer={(v) => enregistrerChamp({ email: v.trim() })} />
            <LigneModifiable icone="telephone" titre="Téléphone" valeur={compte.phone} type="tel" autoComplete="tel"
              valider={(v) => (v.trim() ? '' : 'Le téléphone est obligatoire.')} onEnregistrer={(v) => enregistrerChamp({ phone: v.trim() })} />
          </div>
        </Rubrique>
      )}

      <Rubrique id="securite" titre="Sécurité et données" description="Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.">
        <div className={styles.panneau}>
          <Ligne icone="cle" titre="Mot de passe" valeur="••••••••" action={<Link to="/compte/mot-de-passe" className={styles.boutonContour}>Modifier</Link>} />
          <Ligne icone="telecharger" titre="Mes données" texte="Une copie de tout ce que nous gardons sur vous (fichier JSON)."
            action={<button type="button" className={styles.boutonContour} onClick={telecharger}>Télécharger</button>} />
        </div>
      </Rubrique>

      {passes.length > 0 && (
        <Rubrique id="historique" titre="Historique" description="Vos rendez-vous passés ou annulés.">
          <div className={styles.liste}>{passes.map(carte)}</div>
        </Rubrique>
      )}

      {factures.length > 0 && (
        <Rubrique id="factures" titre="Mes factures" description="Une facture par prestation réalisée, imprimable en PDF.">
          <ul className={styles.panneau}>
            {factures.map((f) => (
              <Ligne key={f.id} element="li" icone="facture" titre={`Facture ${f.numero}`} texte={new Date(f.prestationLe).toLocaleDateString('fr-FR')}
                valeur={formatEuros(f.totalCents)} action={<Link to={`/facture/${f.id}`} className={styles.boutonContour} aria-label={`Voir la facture ${f.numero}`}>Voir</Link>} />
            ))}
          </ul>
        </Rubrique>
      )}

      <Rubrique id="danger" titre="Supprimer le compte" description="Vos données personnelles seront définitivement anonymisées. Impossible s’il vous reste un rendez-vous à venir : annulez-le d’abord.">
        <div className={styles.danger}>
          {suppression ? (
            <>
              <p><strong>Supprimer définitivement votre compte ?</strong> Cette action est irréversible.</p>
              {perdus.length > 0 && (
                <p className={styles.perte} role="alert">Vous avez {perdus.join(' et ')} : {perdus.length > 1 ? 'ils seront perdus' : 'il sera perdu'}.</p>
              )}
              <div className={styles.actions}>
                <button type="button" className={styles.boutonDanger} onClick={supprimer}><Icone nom="poubelle" taille={18} /> Oui, supprimer mon compte</button>
                <Button variant="ghost" onClick={() => setSuppression(false)}>Non, garder mon compte</Button>
              </div>
            </>
          ) : (
            <div><button type="button" className={styles.boutonDanger} onClick={() => setSuppression(true)}><Icone nom="poubelle" taille={18} /> Supprimer mon compte</button></div>
          )}
        </div>
      </Rubrique>
    </main>
  );
}

const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * « Mon abonnement » : l'abonnement en cours (prestation de la période réservée ou à réserver, prochain prélèvement,
 * résiliation), sinon les offres proposées. Une prestation par période : non réservée à temps, elle est perdue.
 * Masquée s'il n'y a ni abonnement ni offre.
 */
function RubriqueAbonnement() {
  const [params] = useSearchParams();
  const retour = params.get('abonnement');
  const [offres, setOffres] = useState<OffreAbonnement[]>([]);
  const [abonnements, setAbonnements] = useState<MonAbonnement[]>([]);
  const [resiliation, setResiliation] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState<string>();

  const charger = useCallback(() => {
    offresAbonnement().then(setOffres).catch(() => setOffres([]));
    mesAbonnements().then(setAbonnements).catch(() => setAbonnements([]));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const enCours = abonnements.find((a) => a.statut !== 'termine');
  if (!enCours && offres.length === 0) return null;

  const sAbonner = async (o: OffreAbonnement) => {
    setErreur('');
    setEnvoi(o.id);
    try {
      const url = await souscrire(o.id);
      if (url.startsWith('/')) { window.history.replaceState(null, '', url); setMessage('Votre abonnement est actif.'); charger(); } else window.location.assign(url);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(undefined);
    }
  };
  const confirmerResiliation = async () => {
    if (!enCours) return;
    setErreur('');
    try {
      await resilier(enCours.id);
      setResiliation(false);
      setMessage(`Abonnement résilié : il reste actif jusqu’au ${enCours.finPeriode ? dateCourte(enCours.finPeriode) : 'terme de la période payée'}.`);
      charger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  return (
    <Rubrique id="abonnement" titre="Mon abonnement"
      description={enCours ? 'Une prestation comprise par période, prélevée automatiquement. Sans engagement.'
        : 'Une prestation comprise à chaque période, prélevée automatiquement. Non réservée dans sa période, elle est perdue. Sans engagement, résiliable à tout moment.'}>
      {retour === 'ok' && !message && <p className={styles.ok} role="status">Merci ! Votre abonnement est en cours d’activation : il apparaît ici dès le paiement confirmé.</p>}
      {retour === 'annule' && !message && !enCours && <p className={styles.aide} role="status">Abonnement non souscrit : rien n’a été prélevé.</p>}
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      {enCours ? (
        <div className={styles.panneau}>
          <Ligne icone="historique" titre={enCours.offre.nom} texte={`${enCours.offre.prestation}, ${enCours.offre.periodiciteLibelle}`}
            valeur={`${formatEuros(enCours.offre.prixCents)} ${parPeriode(enCours.offre.periodicite)}`} />
          {enCours.statut === 'impaye' ? (
            <Ligne icone="carteBancaire" titre="Prélèvement refusé" texte="Le paiement est retenté automatiquement. En attendant, la prestation comprise n’est plus réservable : contactez-nous si besoin." accent />
          ) : enCours.prestationPrevueLe ? (
            <Ligne icone="calendrier" titre="Prestation de cette période" texte="Déjà réservée." valeur={dateCourte(enCours.prestationPrevueLe)} />
          ) : (
            <Ligne icone="calendrier" titre="Prestation de cette période"
              texte={enCours.periodeFin ? `À réserver avant le ${dateCourte(enCours.periodeFin)}, sinon elle est perdue.` : 'À réserver.'}
              action={enCours.utilisable ? <Link to={`/reserver?formule=${encodeURIComponent(enCours.offre.prestationId)}&abonnement=${encodeURIComponent(enCours.id)}`} className="btn">Réserver</Link> : undefined} />
          )}
          {enCours.finPeriode && (
            <Ligne icone="euro" titre={enCours.resiliationDemandee ? 'Fin de l’abonnement' : 'Prochain prélèvement'} valeur={dateCourte(enCours.finPeriode)} />
          )}
          {!enCours.resiliationDemandee && (
            resiliation ? (
              <div className={styles.ligne}>
                <p><strong>Résilier votre abonnement ?</strong> Il reste actif jusqu’au {enCours.finPeriode ? dateCourte(enCours.finPeriode) : 'terme de la période payée'}, puis plus rien n’est prélevé.</p>
                <div className={styles.actions}>
                  <button type="button" className={styles.boutonDanger} onClick={confirmerResiliation}>Oui, résilier</button>
                  <Button variant="ghost" onClick={() => setResiliation(false)}>Non, garder</Button>
                </div>
              </div>
            ) : (
              <Ligne icone="sortie" titre="Résilier" texte="Sans frais, effet à la fin de la période payée."
                action={<button type="button" className={styles.boutonContour} onClick={() => setResiliation(true)}>Résilier</button>} />
            )
          )}
        </div>
      ) : (
        <ul className={styles.panneau} aria-label="Abonnements proposés">
          {offres.map((o) => (
            <Ligne key={o.id} element="li" icone="historique" titre={o.nom}
              texte={`${o.prestation}, ${o.periodiciteLibelle}.${o.description ? ` ${o.description}` : ''}`}
              valeur={`${formatEuros(o.prixCents)} ${parPeriode(o.periodicite)}`}
              action={<Button onClick={() => { void sAbonner(o); }} loading={envoi === o.id} aria-label={`S’abonner : ${o.nom}`}>S’abonner</Button>} />
          ))}
        </ul>
      )}
    </Rubrique>
  );
}

/** Rubrique façon « réglages » : titre, phrase d'explication, puis son contenu (panneau de lignes). */
function Rubrique({ id, titre, description, action, children }: { id: string; titre: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.rubrique} aria-labelledby={`titre-${id}`}>
      <div className={styles.rubriqueEntete}>
        <div>
          <h2 id={`titre-${id}`}>{titre}</h2>
          {description && <p className={styles.aide}>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Une ligne d'un panneau : icône, intitulé (et précision), valeur, action à droite. */
function Ligne({ icone, titre, texte, valeur, action, accent = false, element = 'div' }: {
  icone: NomIcone; titre: string; texte?: string; valeur?: string; action?: ReactNode; accent?: boolean; element?: 'div' | 'li';
}) {
  const Balise = element;
  return (
    <Balise className={styles.ligne}>
      <Icone nom={icone} className={styles.ligneIcone} />
      <div className={styles.ligneTexte}>
        <span className={styles.ligneTitre}>{titre}</span>
        {texte && <span className={styles.aide}>{texte}</span>}
      </div>
      {valeur !== undefined && <span className={`${styles.ligneValeur} ${accent ? styles.ligneAccent : ''}`}>{valeur}</span>}
      {action && <span className={styles.ligneAction}>{action}</span>}
    </Balise>
  );
}

/** Ligne modifiable sur place : « Modifier » ouvre le champ dans la ligne, « Enregistrer » ou « Annuler ». */
function LigneModifiable({ icone, titre, valeur, type = 'text', autoComplete, aide, valider, onEnregistrer }: {
  icone: NomIcone; titre: string; valeur: string; type?: string; autoComplete?: string; aide?: string;
  valider: (v: string) => string; onEnregistrer: (v: string) => Promise<void>;
}) {
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState(valeur);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    const probleme = valider(saisie);
    if (probleme) { setErreur(probleme); return; }
    setErreur(''); setEnCours(true);
    try {
      await onEnregistrer(saisie);
      setEdition(false);
      setMessage(`${titre} enregistré.`);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  if (!edition) {
    return (
      <div className={styles.ligne}>
        <Icone nom={icone} className={styles.ligneIcone} />
        <div className={styles.ligneTexte}>
          <span className={styles.ligneTitre}>{titre}</span>
          {message && <span className={styles.ok} role="status">{message}</span>}
        </div>
        <span className={styles.ligneValeur}>{valeur || '—'}</span>
        <span className={styles.ligneAction}>
          <button type="button" className={styles.boutonContour} aria-label={`Modifier : ${titre}`}
            onClick={() => { setSaisie(valeur); setErreur(''); setMessage(''); setEdition(true); }}>Modifier</button>
        </span>
      </div>
    );
  }
  return (
    <form className={`${styles.ligne} ${styles.ligneEdition}`} onSubmit={enregistrer} noValidate>
      <Icone nom={icone} className={styles.ligneIcone} />
      <div className={styles.ligneChamp}>
        <Field label={titre} type={type} value={saisie} autoComplete={autoComplete} hint={aide} error={erreur || undefined} autoFocus
          onChange={(e) => setSaisie(e.target.value)} />
        <div className={styles.actions}>
          <Button type="submit" loading={enCours}>Enregistrer</Button>
          <Button variant="ghost" onClick={() => setEdition(false)}>Annuler</Button>
        </div>
      </div>
    </form>
  );
}
