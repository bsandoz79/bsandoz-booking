import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field } from '@bsandoz/ui';
import { activerCompte, choisirNouveauMotDePasse, demanderNouveauMotDePasse, motDePasseValide } from '../../services/compte';
import styles from './Compte.module.css';

const REGLE = '10 caractères minimum, avec au moins une lettre et un chiffre.';

/** Formulaire « nouveau mot de passe » commun à l'activation du compte et à la réinitialisation. */
function NouveauMotDePasse({ titre, intro, envoyer }: { titre: string; intro: string; envoyer: (mdp: string) => Promise<void> }) {
  const navigate = useNavigate();
  const [mdp, setMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const erreurMdp = mdp && !motDePasseValide(mdp) ? REGLE : undefined;
  const erreurConfirmation = confirmation && confirmation !== mdp ? 'Les deux mots de passe ne sont pas identiques.' : undefined;

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!motDePasseValide(mdp) || mdp !== confirmation) return;
    setErreur('');
    setEnCours(true);
    try {
      await envoyer(mdp);
      navigate('/mon-espace?mdp=ok');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <main className={`container ${styles.page}`}>
      <h1>{titre}</h1>
      <p>{intro}</p>
      <form className={styles.formulaire} onSubmit={soumettre} noValidate>
        <Field label="Mot de passe" type="password" autoComplete="new-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} hint={REGLE} error={erreurMdp} />
        <Field label="Confirmez le mot de passe" type="password" autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} error={erreurConfirmation} />
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <Button type="submit" loading={enCours} disabled={!motDePasseValide(mdp) || mdp !== confirmation}>Enregistrer le mot de passe</Button>
      </form>
    </main>
  );
}

/** /compte/activer?jeton=… (lien reçu après la première réservation). */
export function ActiverCompte() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton') ?? '';
  if (!jeton) return <LienInvalide />;
  return (
    <NouveauMotDePasse titre="Créer mon mot de passe" envoyer={(mdp) => activerCompte(jeton, mdp)}
      intro="Choisissez votre mot de passe pour accéder à votre espace client : vos rendez-vous, leur déplacement ou leur annulation." />
  );
}

/** /compte/mot-de-passe : demande du lien (sans jeton) ou choix du nouveau mot de passe (avec jeton). */
export function MotDePasse() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton');
  if (jeton) {
    return <NouveauMotDePasse titre="Nouveau mot de passe" envoyer={(mdp) => choisirNouveauMotDePasse(jeton, mdp)}
      intro="Choisissez votre nouveau mot de passe. Vos autres appareils seront déconnectés." />;
  }
  return <DemandeLien />;
}

function DemandeLien() {
  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      await demanderNouveauMotDePasse(email.trim());
      setEnvoye(true);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <main className={`container ${styles.page}`}>
      <h1>Mot de passe oublié</h1>
      {envoye ? (
        <p className={styles.ok} role="status">Si un compte existe pour cette adresse, vous allez recevoir un e-mail avec un lien valable 1 heure.</p>
      ) : (
        <form className={styles.formulaire} onSubmit={soumettre} noValidate>
          <p>Indiquez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <Field label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
          <Button type="submit" loading={enCours} disabled={!/\S+@\S+\.\S+/.test(email)}>Recevoir le lien</Button>
        </form>
      )}
      <p><Link to="/mon-espace">Retour à la connexion</Link></p>
    </main>
  );
}

function LienInvalide() {
  return (
    <main className={`container ${styles.page}`}>
      <h1>Lien incomplet</h1>
      <p>Ce lien n'est pas valide. Ouvrez le lien reçu par e-mail tel quel, ou demandez un nouveau lien.</p>
      <p><Link to="/compte/mot-de-passe">Recevoir un nouveau lien</Link></p>
    </main>
  );
}
