import { useEffect, useState, type FormEvent } from 'react';
import { Button, Field } from '@bsandoz/ui';
import { reprendreSession, rolesSession, seConnecter, seDeconnecter } from '../../services/compte';
import { AbonnementsOnglet } from './Abonnements';
import { CatalogueOnglet } from './Catalogue';
import { ClientsOnglet } from './Clients';
import { HistoriqueOnglet } from './Historique';
import { ComptabiliteOnglet } from './Comptabilite';
import { HorairesOnglet } from './Horaires';
import { MonSiteOnglet } from './MonSite';
import { PlanningOnglet } from './Planning';
import { ProduitsOnglet } from './Produits';
import { FacturesOnglet } from './Factures';
import { RdvTelephoneOnglet } from './RdvTelephone';
import { ReglagesOnglet } from './Reglages';
import { TableauDeBordOnglet } from './TableauDeBord';
import { Icone, type NomIcone } from '../../components/Icone/Icone';
import styles from './Pro.module.css';

const ONGLETS = [
  { id: 'tableau', icone: 'tableau', label: 'Tableau de bord' },
  { id: 'planning', icone: 'calendrier', label: 'Planning' },
  { id: 'historique', icone: 'historique', label: 'Historique' },
  { id: 'clients', icone: 'clients', label: 'Clients' },
  { id: 'telephone', icone: 'telephone', label: 'Rendez-vous par téléphone' },
  { id: 'catalogue', icone: 'catalogue', label: 'Catalogue' },
  { id: 'produits', icone: 'produit', label: 'Produits' },
  { id: 'abonnements', icone: 'historique', label: 'Abonnements' },
  { id: 'factures', icone: 'facture', label: 'Factures' },
  { id: 'comptabilite', icone: 'euro', label: 'Comptabilité' },
  { id: 'horaires', icone: 'horloge', label: 'Horaires et congés' },
  { id: 'site', icone: 'globe', label: 'Mon site' },
  { id: 'reglages', icone: 'reglages', label: 'Réglages' },
] as const satisfies readonly { id: string; icone: NomIcone; label: string }[];
type Onglet = (typeof ONGLETS)[number]['id'];

const estPro = () => rolesSession().includes('ROLE_PRO');

/** Espace pro : connexion (compte avec le rôle pro), puis tableau de bord, planning, rendez-vous, catalogue, horaires, réglages. */
export function EspacePro() {
  const [etat, setEtat] = useState<'chargement' | 'deconnecte' | 'refuse' | 'connecte'>('chargement');
  const [onglet, setOnglet] = useState<Onglet>('tableau');

  useEffect(() => {
    reprendreSession().then((ok) => setEtat(!ok ? 'deconnecte' : estPro() ? 'connecte' : 'refuse'));
  }, []);

  if (etat === 'chargement') return <main className={`container ${styles.page}`} aria-busy="true"><h1>Espace pro</h1><p>Chargement…</p></main>;
  if (etat !== 'connecte') return <ConnexionPro refuse={etat === 'refuse'} onConnecte={() => setEtat(estPro() ? 'connecte' : 'refuse')} />;

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.actions} style={{ justifyContent: 'space-between' }}>
        <h1>Espace pro</h1>
        <Button variant="ghost" onClick={async () => { await seDeconnecter(); setEtat('deconnecte'); }}>Se déconnecter</Button>
      </div>
      <div className={styles.mise}>
      {/* Ordinateur : colonne fixe à gauche ; téléphone : toutes les rubriques visibles sur quelques lignes. */}
      <nav aria-label="Rubriques de l'espace pro" className={styles.onglets}>
        {ONGLETS.map((o) => (
          <button key={o.id} type="button" className={styles.onglet} aria-current={onglet === o.id ? 'page' : undefined}
            onClick={() => { setOnglet(o.id); document.getElementById('contenu-pro')?.scrollIntoView?.({ block: 'start' }); }}>
            <Icone nom={o.icone} className={styles.ongletIcone} taille={19} />{o.label}
          </button>
        ))}
      </nav>
      <div id="contenu-pro" className={styles.contenu}>
      {onglet === 'tableau' && <TableauDeBordOnglet />}
      {onglet === 'planning' && <PlanningOnglet />}
      {onglet === 'historique' && <HistoriqueOnglet />}
      {onglet === 'clients' && <ClientsOnglet />}
      {onglet === 'telephone' && <RdvTelephoneOnglet />}
      {onglet === 'catalogue' && <CatalogueOnglet />}
      {onglet === 'produits' && <ProduitsOnglet />}
      {onglet === 'abonnements' && <AbonnementsOnglet />}
      {onglet === 'factures' && <FacturesOnglet />}
      {onglet === 'comptabilite' && <ComptabiliteOnglet />}
      {onglet === 'horaires' && <HorairesOnglet />}
      {onglet === 'site' && <MonSiteOnglet />}
      {onglet === 'reglages' && <ReglagesOnglet />}
      </div>
      </div>
    </main>
  );
}

function ConnexionPro({ refuse, onConnecte }: { refuse: boolean; onConnecte: () => void }) {
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
      <h1>Espace pro</h1>
      {refuse && <p className={styles.erreur} role="alert">Ce compte n'a pas accès à l'espace pro.</p>}
      <form className={styles.panneau} style={{ maxWidth: 460 }} onSubmit={soumettre} noValidate>
        <h2>Connexion</h2>
        <Field label="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Mot de passe" type="password" autoComplete="current-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} />
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <Button type="submit" loading={enCours} loadingLabel="Connexion…" disabled={!email || !mdp}>Se connecter</Button>
      </form>
    </main>
  );
}
