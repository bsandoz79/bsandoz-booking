import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, EditeurCarte, Field } from '@bsandoz/ui';
import { createur } from '../data/createur';
import { crocs } from '../data/crocs';
import { pictos } from '../data/pictos';
import {
  avecApi, carteApi, connecter, deconnecter, enregistrerContenu, lireCartePro, lireContenu, reprendreSession,
  type ContenuSite, type Horaire, type RubriqueApi,
} from '../services/api';
import { FERME, horairesParJour } from '../calculs/horaires';
import styles from './EspacePro.module.css';
import { inactifTropLongtemps, noterActivite, oublierActivite, useInactivite } from './pro/inactivite';
import { Installer } from './pro/Installer';
import { MesAvis } from './pro/MesAvis';
import { AvisCreateur } from './pro/AvisCreateur';
import { MesCouts } from './pro/MesCouts';
import { MesPhotos } from './pro/MesPhotos';
import { ADRESSE_MODIFICATION } from '../modification/useModeModification';

type Etat = 'chargement' | 'connexion' | 'connecte';
type Onglet = 'carte' | 'infos' | 'avis' | 'photos' | 'couts';

const ONGLETS: { id: Onglet; nom: string }[] = [
  { id: 'carte', nom: 'La carte' },
  { id: 'infos', nom: 'Infos du site' },
  { id: 'avis', nom: 'Avis' },
  { id: 'photos', nom: 'Photos' },
  { id: 'couts', nom: 'Coûts' },
];

/** Onglet demandé dans l'adresse (/pro?onglet=avis, depuis le site en mode modification). */
const ongletDemande = (): Onglet => {
  const demande = new URLSearchParams(window.location.search).get('onglet');
  return ONGLETS.find((o) => o.id === demande)?.id ?? 'carte';
};

/** Espace du patron (/pro) : se connecter, modifier la carte, les infos du site (accroche, horaires, annonce), les avis et les photos ; voir ce que coûte le site. */
export function EspacePro() {
  const [etat, setEtat] = useState<Etat>('chargement');
  const [onglet, setOnglet] = useState<Onglet>(ongletDemande);
  const [avis, setAvis] = useState('');

  const fermer = useCallback((raison: string) => {
    oublierActivite();
    setAvis(raison);
    setEtat('connexion');
    void deconnecter();
  }, []);
  const expire = useCallback(() => fermer('Vous avez été déconnecté après 30 minutes sans activité. Reconnectez-vous pour continuer.'), [fermer]);
  useInactivite(etat === 'connecte', expire);

  useEffect(() => {
    if (!avecApi()) return;
    // Appli rouverte plus de 30 minutes après la dernière action : on ferme la session au lieu de la reprendre.
    if (inactifTropLongtemps()) {
      expire();
      return;
    }
    void reprendreSession().then((ok) => setEtat(ok ? 'connecte' : 'connexion'));
  }, [expire]);

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
          <Button variant="ghost" onClick={() => fermer('')}>Se déconnecter</Button>
        )}
      </div>

      {etat === 'chargement' && <p role="status">Chargement…</p>}
      {etat === 'connexion' && avis && <p className={styles.info} role="status">{avis}</p>}
      {etat === 'connexion' && <Connexion onConnecte={() => { noterActivite(); setAvis(''); setEtat('connecte'); }} />}
      {etat === 'connecte' && (
        <>
          <AvisCreateur />
          <a href={ADRESSE_MODIFICATION} className={styles.surLeSite}>
            <strong>Modifier directement sur le site</strong>
            <span>Votre site tel que vos clients le voient : touchez un plat, un prix, les horaires… pour les changer.</span>
          </a>
          <div className={styles.onglets} role="tablist" aria-label="Que voulez-vous modifier ?">
            {ONGLETS.map((o) => (
              <button key={o.id} type="button" role="tab" id={`onglet-${o.id}`} aria-controls={`panneau-${o.id}`} aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)}>
                {o.nom}
              </button>
            ))}
          </div>
          <section id={`panneau-${onglet}`} role="tabpanel" aria-labelledby={`onglet-${onglet}`}>
            {onglet === 'carte' && <MaCarte />}
            {onglet === 'infos' && <MesInfos />}
            {onglet === 'avis' && <MesAvis />}
            {onglet === 'photos' && <MesPhotos />}
            {onglet === 'couts' && <MesCouts />}
          </section>
          <Installer />
        </>
      )}
      {etat !== 'chargement' && <Urgence />}
    </main>
  );
}

/** Contact du créateur du site, visible même sans être connecté (mot de passe oublié, site en panne…). */
function Urgence() {
  return (
    <aside className={styles.urgence} aria-labelledby="urgence-titre">
      <h2 id="urgence-titre">Un problème avec le site ?</h2>
      <p>
        Appelez {createur.nom} : <a href={createur.telephoneLien}>{createur.telephone}</a>
      </p>
    </aside>
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
        Touchez un plat pour changer son nom, son prix ou sa description. Quand vous changez un prix, vous choisissez si l’ancien
        reste affiché barré pendant un mois. Un plat ajouté est marqué « Nouveau » pendant un mois, et « Épuisé » dure jusqu’à ce soir minuit.
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
      // Une ligne par jour (d'anciens horaires groupés sont répartis) ; « Fermé » s'écrit en laissant vide.
      setHoraires(horairesParJour(c.horaires && c.horaires.length > 0 ? c.horaires : crocs.horaires)
        .map((h) => (h.heures === FERME ? { ...h, heures: '' } : h)));
    }).catch(() => setMessage({ texte: 'Les infos n’ont pas pu être chargées.', erreur: true }));
  }, []);

  if (!contenu) return message ? <p className={styles.erreur} role="alert">{message.texte}</p> : <p role="status">Chargement…</p>;

  const changerHeures = (i: number, valeur: string) =>
    setHoraires((h) => h.map((ligne, j) => (j === i ? { ...ligne, heures: valeur } : ligne)));

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    setMessage(undefined);
    try {
      // Le contenu est remplacé en entier : on renvoie aussi ce qui n'est pas modifiable ici.
      await enregistrerContenu({ ...contenu, horaires: horaires.map((h) => ({ jours: h.jours, heures: h.heures.trim() || FERME })) });
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
        <legend>Horaires, jour par jour</legend>
        <p className={styles.aide}>Par exemple : 11 h 30 – 14 h 30 · 18 h – 22 h 30. Laissez vide un jour de fermeture.</p>
        {horaires.map((h, i) => (
          <Field key={h.jours} label={h.jours} value={h.heures} onChange={(e) => changerHeures(i, e.target.value)} placeholder={FERME} maxLength={80} />
        ))}
      </fieldset>

      {message && <p className={message.erreur ? styles.erreur : styles.succes} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      <Button type="submit" loading={enCours} loadingLabel="Enregistrement…">Enregistrer</Button>
    </form>
  );
}
