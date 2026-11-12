import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Field } from '@bsandoz/ui';
import { ajouterIndisponibilite, definirHoraires, horaires, indisponibilites, supprimerIndisponibilite, type Indisponibilite, type Plage } from '../../services/pro';
import { JOURS_SEMAINE, jourLocal, plusJours } from './dates';
import styles from './Pro.module.css';

/** Horaires d'ouverture de la semaine (plusieurs plages par jour) et congés / absences. */
export function HorairesOnglet() {
  return (
    <>
      <SemaineType />
      <Conges />
    </>
  );
}

function SemaineType() {
  const [plages, setPlages] = useState<Plage[]>([]);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    horaires().then((h) => setPlages(h.map(({ weekday, startsAt, endsAt }) => ({ weekday, startsAt, endsAt })))).catch((e: Error) => setErreur(e.message));
  }, []);

  const modifier = (index: number, champ: 'startsAt' | 'endsAt', valeur: string) => setPlages(plages.map((p, i) => (i === index ? { ...p, [champ]: valeur } : p)));
  const incoherente = (p: Plage) => !p.startsAt || !p.endsAt || p.startsAt >= p.endsAt;

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    setMessage('');
    try {
      await definirHoraires([...plages].sort((a, b) => a.weekday - b.weekday || a.startsAt.localeCompare(b.startsAt)));
      setMessage('Horaires enregistrés.');
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  return (
    <form className={styles.section} onSubmit={enregistrer} aria-labelledby="titre-horaires" noValidate>
      <h2 id="titre-horaires">Horaires d’ouverture</h2>
      <p className={styles.aide}>Les créneaux proposés aux clients sont pris dans ces plages. Une journée sans plage est fermée.</p>
      <div className={styles.panneau}>
        {JOURS_SEMAINE.map((nom, i) => {
          const weekday = i + 1;
          return (
            <div key={nom} className={styles.jour} role="group" aria-label={nom}>
              <strong>{nom}</strong>
              {plages.map((p, index) => p.weekday === weekday && (
                <div key={index} className={styles.plage}>
                  <label>De <input type="time" value={p.startsAt} onChange={(e) => modifier(index, 'startsAt', e.target.value)} aria-label={`${nom}, début de la plage`} /></label>
                  <label>à <input type="time" value={p.endsAt} onChange={(e) => modifier(index, 'endsAt', e.target.value)} aria-label={`${nom}, fin de la plage`} /></label>
                  <Button variant="ghost" onClick={() => setPlages(plages.filter((_, j) => j !== index))}>Retirer</Button>
                  {incoherente(p) && <span className={styles.erreur}>La fin doit être après le début.</span>}
                </div>
              ))}
              {!plages.some((p) => p.weekday === weekday) && <span className={styles.aide}>Fermé</span>}
              <div><Button variant="secondary" onClick={() => setPlages([...plages, { weekday, startsAt: '08:00', endsAt: '12:00' }])}>Ajouter une plage le {nom.toLowerCase()}</Button></div>
            </div>
          );
        })}
        {message && <p className={styles.ok} role="status">{message}</p>}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div><Button type="submit" disabled={plages.some(incoherente)}>Enregistrer les horaires</Button></div>
      </div>
    </form>
  );
}

function Conges() {
  const [aujourdhui] = useState(() => jourLocal(new Date()));
  const [liste, setListe] = useState<Indisponibilite[]>([]);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = useCallback(() => indisponibilites(aujourdhui, plusJours(aujourdhui, 366)).then(setListe).catch((e: Error) => setErreur(e.message)), [aujourdhui]);
  useEffect(() => { charger(); }, [charger]);

  const valide = /^\d{4}-\d{2}-\d{2}$/.test(debut) && /^\d{4}-\d{2}-\d{2}$/.test(fin) && fin >= debut;

  const ajouter = async (e: FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    setErreur('');
    try {
      await ajouterIndisponibilite(debut, plusJours(fin, 1), motif.trim());
      setDebut(''); setFin(''); setMotif('');
      charger();
    } catch (err) {
      setErreur((err as Error).message);
    }
  };

  const jour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className={styles.section} aria-labelledby="titre-conges">
      <h2 id="titre-conges">Congés et absences</h2>
      <p className={styles.aide}>Aucun créneau n’est proposé pendant ces périodes. Les rendez-vous déjà pris ne sont pas annulés.</p>
      {liste.length === 0 ? <p>Aucun congé prévu.</p> : (
        <ul className={styles.liste}>
          {liste.map((c) => (
            <li key={c.id} className={styles.actions}>
              <span>Du {jour(c.start)} au {jour(new Date(new Date(c.end).getTime() - 1).toISOString())}{c.reason ? ` · ${c.reason}` : ''}</span>
              <Button variant="ghost" onClick={async () => { await supprimerIndisponibilite(c.id); charger(); }}>Supprimer</Button>
            </li>
          ))}
        </ul>
      )}
      <form className={styles.panneau} onSubmit={ajouter} noValidate>
        <h3>Ajouter un congé</h3>
        <div className={styles.grille}>
          <Field label="Premier jour" type="date" min={aujourdhui} value={debut} onChange={(e) => setDebut(e.target.value)} />
          <Field label="Dernier jour" type="date" min={debut || aujourdhui} value={fin} onChange={(e) => setFin(e.target.value)}
            error={debut && fin && fin < debut ? 'Le dernier jour doit être après le premier.' : undefined} />
          <Field label="Motif (facultatif)" value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <div><Button type="submit" disabled={!valide}>Ajouter le congé</Button></div>
      </form>
    </section>
  );
}
