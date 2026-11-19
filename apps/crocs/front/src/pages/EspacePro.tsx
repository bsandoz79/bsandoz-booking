import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, EditeurCarte, Field } from '@bsandoz/ui';
import { crocs } from '../data/crocs';
import { pictos } from '../data/pictos';
import {
  avecApi, carteApi, connecter, deconnecter, enregistrerContenu, lireCartePro, lireContenu, reprendreSession,
  type ContenuSite, type Horaire, type RubriqueApi,
} from '../services/api';
import styles from './EspacePro.module.css';

type Etat = 'chargement' | 'connexion' | 'connecte';

/** Espace du patron (/pro) : se connecter, modifier la carte et les infos du site (accroche, horaires, annonce). */
export function EspacePro() {
  const [etat, setEtat] = useState<Etat>('chargement');
  const [onglet, setOnglet] = useState<'carte' | 'infos'>('carte');

  useEffect(() => {
    if (!avecApi()) return;
    void reprendreSession().then((ok) => setEtat(ok ? 'connecte' : 'connexion'));
  }, []);

  if (!avecApi()) {
    return (
      <main className={styles.page}>
        <h1 className={styles.titre}>Espace de {crocs.nom}</h1>
        <p>L’espace de modification n’est pas encore branché sur ce site.</p>
        <a href="/">Retour au site</a>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.entete}>
        <h1 className={styles.titre}>Espace de {crocs.nom}</h1>
        <a href="/" className={styles.lien}>Voir le site</a>
        {etat === 'connecte' && (
          <Button variant="ghost" onClick={() => void deconnecter().then(() => setEtat('connexion'))}>Se déconnecter</Button>
        )}
      </div>

      {etat === 'chargement' && <p role="status">Chargement…</p>}
      {etat === 'connexion' && <Connexion onConnecte={() => setEtat('connecte')} />}
      {etat === 'connecte' && (
        <>
          <div className={styles.onglets} role="tablist" aria-label="Que voulez-vous modifier ?">
            <button type="button" role="tab" id="onglet-carte" aria-controls="panneau-carte" aria-selected={onglet === 'carte'} onClick={() => setOnglet('carte')}>La carte</button>
            <button type="button" role="tab" id="onglet-infos" aria-controls="panneau-infos" aria-selected={onglet === 'infos'} onClick={() => setOnglet('infos')}>Infos du site</button>
          </div>
          {onglet === 'carte' ? (
            <section id="panneau-carte" role="tabpanel" aria-labelledby="onglet-carte"><MaCarte /></section>
          ) : (
            <section id="panneau-infos" role="tabpanel" aria-labelledby="onglet-infos"><MesInfos /></section>
          )}
        </>
      )}
    </main>
  );
}

function Connexion({ onConnecte }: { onConnecte: () => void }) {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    setErreur('');
    try {
      await connecter(email.trim(), motDePasse);
      onConnecte();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <form className={styles.carteBlanche} onSubmit={(e) => void envoyer(e)}>
      <h2>Se connecter</h2>
      <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field label="Mot de passe" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <Button type="submit" loading={enCours} loadingLabel="Connexion…" fullWidth>Se connecter</Button>
    </form>
  );
}

function MaCarte() {
  const [rubriques, setRubriques] = useState<RubriqueApi[]>();
  const [erreur, setErreur] = useState('');

  const recharger = useCallback(async () => {
    try {
      setRubriques(await lireCartePro());
      setErreur('');
    } catch {
      setErreur('La carte n’a pas pu être chargée. Vérifiez la connexion et rechargez la page.');
    }
  }, []);

  useEffect(() => { void recharger(); }, [recharger]);

  /** Chaque modification est enregistrée tout de suite, puis la carte est relue (prix barré, « Nouveau »…). */
  const puisRecharger = <A extends unknown[]>(action: (...args: A) => Promise<void>) => async (...args: A) => {
    await action(...args);
    await recharger();
  };
  const photoDe = (id: string) => rubriques?.flatMap((r) => r.articles).find((a) => a.id === id)?.photo ?? null;

  if (erreur) return <p className={styles.erreur} role="alert">{erreur}</p>;
  if (!rubriques) return <p role="status">Chargement de la carte…</p>;

  return (
    <>
      <p className={styles.aide}>
        Touchez un plat pour changer son nom, son prix ou sa description. Un nouveau prix garde l’ancien barré pendant un mois,
        un plat ajouté est marqué « Nouveau » pendant un mois, et « Épuisé » dure jusqu’à ce soir minuit.
      </p>
      <EditeurCarte
        rubriques={rubriques}
        icones={pictos}
        libelles={{ ajouterArticle: 'Ajouter un plat', modifierArticle: 'Modifier le plat', vide: 'Aucun plat dans cette rubrique.', ordreArticles: 'Ordre des plats de la rubrique' }}
        onAjouterRubrique={puisRecharger(carteApi.ajouterRubrique)}
        onModifierRubrique={puisRecharger(carteApi.modifierRubrique)}
        onSupprimerRubrique={puisRecharger(carteApi.supprimerRubrique)}
        onOrdonnerRubriques={puisRecharger(carteApi.ordonnerRubriques)}
        onAjouterArticle={puisRecharger(carteApi.ajouterArticle)}
        onModifierArticle={puisRecharger((id: string, a) => carteApi.modifierArticle(id, a, photoDe(id)))}
        onEpuiser={puisRecharger(carteApi.epuiser)}
        onSupprimerArticle={puisRecharger(carteApi.supprimerArticle)}
        onOrdonnerArticles={puisRecharger(carteApi.ordonnerArticles)}
      />
    </>
  );
}

function MesInfos() {
  const [contenu, setContenu] = useState<ContenuSite>();
  const [horaires, setHoraires] = useState<Horaire[]>([]);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean }>();
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    void lireContenu().then((c) => {
      setContenu({ accroche: c.accroche ?? crocs.accroche, annonce: c.annonce ?? '', ...c });
      setHoraires(c.horaires && c.horaires.length > 0 ? c.horaires : crocs.horaires);
    }).catch(() => setMessage({ texte: 'Les infos n’ont pas pu être chargées.', erreur: true }));
  }, []);

  if (!contenu) return message ? <p className={styles.erreur} role="alert">{message.texte}</p> : <p role="status">Chargement…</p>;

  const changerHoraire = (i: number, champ: keyof Horaire, valeur: string) =>
    setHoraires((h) => h.map((ligne, j) => (j === i ? { ...ligne, [champ]: valeur } : ligne)));

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    setMessage(undefined);
    try {
      // Le contenu est remplacé en entier : on renvoie aussi ce qui n'est pas modifiable ici.
      await enregistrerContenu({ ...contenu, horaires: horaires.filter((h) => h.jours.trim() !== '').map((h) => ({ jours: h.jours.trim(), heures: h.heures.trim() })) });
      setMessage({ texte: 'Enregistré : le site est à jour.', erreur: false });
    } catch (err) {
      setMessage({ texte: err instanceof Error ? err.message : 'L’enregistrement n’a pas abouti.', erreur: true });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <form className={styles.carteBlanche} onSubmit={(e) => void envoyer(e)}>
      <Field label="Annonce en haut du site (facultative)" hint="Par exemple : Fermé exceptionnellement lundi 24. Videz le champ pour la retirer."
        value={contenu.annonce ?? ''} onChange={(e) => setContenu({ ...contenu, annonce: e.target.value })} maxLength={200} />
      <Field label="Phrase d’accueil" multiline rows={2} value={contenu.accroche ?? ''} onChange={(e) => setContenu({ ...contenu, accroche: e.target.value })} maxLength={200} />

      <fieldset className={styles.horaires}>
        <legend>Horaires</legend>
        {horaires.map((h, i) => (
          <div key={i} className={styles.ligneHoraire}>
            <Field label={`Jours (ligne ${i + 1})`} value={h.jours} onChange={(e) => changerHoraire(i, 'jours', e.target.value)} placeholder="Du lundi au samedi" />
            <Field label={`Heures (ligne ${i + 1})`} value={h.heures} onChange={(e) => changerHoraire(i, 'heures', e.target.value)} placeholder="11 h 30 – 14 h 30" />
            <Button variant="ghost" aria-label={`Retirer la ligne ${i + 1}`} onClick={() => setHoraires((liste) => liste.filter((_, j) => j !== i))}>✕</Button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setHoraires((liste) => [...liste, { jours: '', heures: '' }])}>+ Ajouter une ligne</Button>
      </fieldset>

      {message && <p className={message.erreur ? styles.erreur : styles.succes} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      <Button type="submit" loading={enCours} loadingLabel="Enregistrement…">Enregistrer</Button>
    </form>
  );
}
