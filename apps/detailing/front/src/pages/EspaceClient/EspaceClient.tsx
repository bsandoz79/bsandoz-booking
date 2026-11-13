import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Field } from '@bsandoz/ui';
import { CarteFidelite } from '../../components/CarteFidelite/CarteFidelite';
import { CarteRendezVous } from '../../components/CarteRendezVous/CarteRendezVous';
import type { Formule } from '../../data/demo';
import { getCatalog } from '../../services/api';
import { maCarteFidelite, type CarteFidelite as Carte } from '../../services/fidelite';
import { mesFactures, type FactureResume } from '../../services/factures';
import { formatEuros } from '@bsandoz/ui';
import {
  annulerMonRendezVous, deplacerMonRendezVous, payerMonRendezVous, exporterMesDonnees, mesRendezVous, modifierMonCompte, monCompte, reprendreSession,
  rolesSession, seConnecter, seDeconnecter, supprimerMonCompte, type Compte, type RendezVous,
} from '../../services/compte';
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

  const supprimer = async () => {
    setErreur('');
    try {
      await supprimerMonCompte();
      onDeconnecte('Votre compte a été supprimé et vos données personnelles anonymisées.');
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  return (
    <main className={`container ${styles.page}`}>
      <h1 className={styles.srOnly}>Mon espace</h1>
      {compte && (
        <Profil compte={compte} onModifie={setCompte}
          onDeconnecter={async () => { await seDeconnecter(); onDeconnecte('Vous êtes déconnecté.'); }} />
      )}
      {(compte?.roles.includes('ROLE_PRO') || rolesSession().includes('ROLE_PRO')) && (
        <p className={styles.accesPro}>Vous êtes connecté avec un compte professionnel. <Link to="/pro" className="btn">Accéder à l’espace pro</Link></p>
      )}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {(compte?.avoirCents ?? 0) > 0 && (
        <p className={styles.accesPro}>Vous avez un avoir de <strong>{formatEuros(compte!.avoirCents!)}</strong> : il sera déduit automatiquement de votre prochain rendez-vous.</p>
      )}
      {fidelite?.actif && <CarteFidelite carte={fidelite} />}

      <section className={styles.section} aria-labelledby="titre-a-venir">
        <h2 id="titre-a-venir">Mes rendez-vous à venir</h2>
        {aVenir.length === 0 ? (
          <p>Aucun rendez-vous à venir. <Link to="/reserver">Réserver un créneau</Link></p>
        ) : (
          <div className={styles.liste}>{aVenir.map(carte)}</div>
        )}
      </section>

      {passes.length > 0 && (
        <section className={styles.section} aria-labelledby="titre-historique">
          <h2 id="titre-historique">Historique</h2>
          <div className={styles.liste}>{passes.map(carte)}</div>
        </section>
      )}

      {factures.length > 0 && (
        <section className={styles.section} aria-labelledby="titre-factures">
          <h2 id="titre-factures">Mes factures</h2>
          <ul className={styles.liste}>
            {factures.map((f) => (
              <li key={f.id}><Link to={`/facture/${f.id}`}>Facture {f.numero}</Link> · {new Date(f.prestationLe).toLocaleDateString('fr-FR')} · {formatEuros(f.totalCents)}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section} aria-labelledby="titre-compte">
        <h2 id="titre-compte">Sécurité et données</h2>
        <div className={styles.actions}>
          <Link to="/compte/mot-de-passe" className="btn btn--ghost">Changer de mot de passe</Link>
          <Button variant="ghost" onClick={telecharger}>Télécharger mes données</Button>
        </div>
      </section>

      <section className={styles.danger} aria-labelledby="titre-danger">
        <h2 id="titre-danger">Zone de danger</h2>
        <div className={styles.dangerContenu}>
          {suppression ? (
            <>
              <p><strong>Supprimer définitivement votre compte ?</strong> Vos données personnelles seront anonymisées. Impossible s'il vous reste un rendez-vous à venir : annulez-le d'abord.</p>
              <div className={styles.actions}>
                <Button onClick={supprimer}>Oui, supprimer mon compte</Button>
                <Button variant="ghost" onClick={() => setSuppression(false)}>Non, garder mon compte</Button>
              </div>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setSuppression(true)}>Supprimer mon compte</Button>
          )}
        </div>
      </section>
    </main>
  );
}

/** En-tête de « Mon espace » : nom, e-mail et téléphone, modifiables ; déconnexion bien visible. */
function Profil({ compte, onModifie, onDeconnecter }: { compte: Compte; onModifie: (c: Compte) => void; onDeconnecter: () => void }) {
  const [edition, setEdition] = useState(false);
  const [valeurs, setValeurs] = useState({ nom: '', email: '', phone: '' });
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const nomComplet = `${compte.firstname} ${compte.lastname}`.trim();
  const valide = valeurs.nom.trim() !== '' && /\S+@\S+\.\S+/.test(valeurs.email) && valeurs.phone.trim() !== '';

  const ouvrir = () => { setValeurs({ nom: nomComplet, email: compte.email, phone: compte.phone }); setMessage(''); setErreur(''); setEdition(true); };
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    setErreur(''); setEnCours(true);
    try {
      // « Nom et prénom » en un seul champ, comme à la réservation.
      onModifie(await modifierMonCompte({ firstname: valeurs.nom.trim(), lastname: '', email: valeurs.email.trim(), phone: valeurs.phone.trim() }));
      setEdition(false);
      setMessage('Vos informations sont enregistrées.');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section className={styles.profil} aria-labelledby="titre-profil">
      <div className={styles.profilEntete}>
        <div>
          <p className={styles.bonjour}>Bonjour</p>
          <h2 id="titre-profil" className={styles.profilNom}>{nomComplet || compte.email}</h2>
        </div>
        <Button variant="secondary" onClick={onDeconnecter}>Se déconnecter</Button>
      </div>
      {edition ? (
        <form className={styles.profilFormulaire} onSubmit={enregistrer} noValidate>
          <Field label="Nom et prénom" value={valeurs.nom} autoComplete="name" onChange={(e) => setValeurs({ ...valeurs, nom: e.target.value })} />
          <Field label="E-mail" type="email" value={valeurs.email} autoComplete="email" hint="Sert aussi à vous connecter." onChange={(e) => setValeurs({ ...valeurs, email: e.target.value })} />
          <Field label="Téléphone" type="tel" value={valeurs.phone} autoComplete="tel" placeholder="01 02 03 04 05" onChange={(e) => setValeurs({ ...valeurs, phone: e.target.value })} />
          {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
          <div className={styles.actions}>
            <Button type="submit" loading={enCours} disabled={!valide}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => setEdition(false)}>Annuler</Button>
          </div>
        </form>
      ) : (
        <>
          <dl className={styles.coordonnees}>
            <div><dt>E-mail</dt><dd>{compte.email}</dd></div>
            <div><dt>Téléphone</dt><dd>{compte.phone || '—'}</dd></div>
          </dl>
          <div><Button variant="ghost" onClick={ouvrir}>Modifier mes informations</Button></div>
        </>
      )}
      {message && <p className={styles.ok} role="status">{message}</p>}
    </section>
  );
}
