import { useState, type ChangeEvent, type ReactNode } from 'react';
import { Button, Field } from '@bsandoz/ui';
import { envoyerPhoto, type Avis, type ContenuSite, type Etape, type Question, type Realisation } from '../../services/contenu';
import type { RubriqueSite } from './titresRubriques';
import styles from './Pro.module.css';

const lignes = (texte: string) => texte.split('\n').map((l) => l.trim()).filter(Boolean);

/** Champs d'une rubrique ; `c` est la copie en cours de modification. */
export function ChampsRubrique({ rubrique, c, setC, onErreur }: {
  rubrique: RubriqueSite; c: ContenuSite; setC: (c: ContenuSite) => void; onErreur: (message: string) => void;
}) {
  const champ = <K extends keyof ContenuSite, F extends keyof ContenuSite[K]>(r: K, cle: F) => ({
    value: String(c[r][cle] ?? ''),
    onChange: (ev: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC({ ...c, [r]: { ...(c[r] as object), [cle]: ev.target.value } }),
  });

  switch (rubrique) {
    case 'coordonnees':
      return (
        <div className={styles.grille}>
          <Field label="Téléphone" type="tel" placeholder="01 02 03 04 05" {...champ('coordonnees', 'telephone')} />
          <Field label="E-mail" type="email" {...champ('coordonnees', 'email')} />
          <Field label="Ville ou adresse affichée" {...champ('coordonnees', 'adresse')} />
          <Field label="Horaires affichés" {...champ('coordonnees', 'horaires')} />
        </div>
      );
    case 'accueil':
      return (
        <>
          <Field label="Petit titre au-dessus" {...champ('accueil', 'surtitre')} />
          <Field label="Grand titre" {...champ('accueil', 'titre')} />
          <Field label="Texte de présentation" multiline rows={3} {...champ('accueil', 'introduction')} />
          <Field label="Points forts (un par ligne)" multiline rows={3} value={c.accueil.arguments.join('\n')}
            onChange={(e) => setC({ ...c, accueil: { ...c.accueil, arguments: e.target.value.split('\n') } })}
            onBlur={() => setC({ ...c, accueil: { ...c.accueil, arguments: lignes(c.accueil.arguments.join('\n')) } })} />
        </>
      );
    case 'photo':
      return (
        <>
          <p className={styles.aide}>Format conseillé : carré ou vertical, 1 200 pixels de large au moins, 5 Mo au plus. Sans photo choisie, celle du camion est affichée.</p>
          <Photo libelle="Photo de l’accueil" url={c.accueil.photo} onChange={(url) => setC({ ...c, accueil: { ...c.accueil, photo: url } })} onErreur={onErreur} />
        </>
      );
    case 'etapes':
      return (
        <Liste<Etape> elements={c.etapes} vide={{ titre: '', texte: '' }} nom="l’étape" onChange={(etapes) => setC({ ...c, etapes })}
          rendu={(e, maj, i) => (
            <>
              <Field label={`Étape ${i + 1} : titre`} value={e.titre} onChange={(ev) => maj({ ...e, titre: ev.target.value })} />
              <Field label={`Étape ${i + 1} : texte`} multiline rows={2} value={e.texte} onChange={(ev) => maj({ ...e, texte: ev.target.value })} />
            </>
          )} />
      );
    case 'realisations':
      return (
        <Liste<Realisation> elements={c.realisations} vide={{ titre: '', avant: '', apres: '' }} nom="la réalisation" onChange={(realisations) => setC({ ...c, realisations })}
          rendu={(r, maj, i) => (
            <>
              <Field label={`Réalisation ${i + 1} : légende`} value={r.titre} onChange={(ev) => maj({ ...r, titre: ev.target.value })} />
              <div className={styles.grille}>
                <Photo libelle={`Réalisation ${i + 1} : photo avant`} url={r.avant} onChange={(url) => maj({ ...r, avant: url })} onErreur={onErreur} />
                <Photo libelle={`Réalisation ${i + 1} : photo après`} url={r.apres} onChange={(url) => maj({ ...r, apres: url })} onErreur={onErreur} />
              </div>
            </>
          )} />
      );
    case 'avis':
      return (
        <>
          <p className={styles.aide}>Recopiez uniquement des avis réels (par exemple ceux de votre fiche Google), avec l’accord du client.</p>
          <Liste<Avis> elements={c.avis} vide={{ auteur: '', note: 5, texte: '', date: '' }} nom="l’avis" onChange={(avis) => setC({ ...c, avis })}
            rendu={(a, maj, i) => (
              <>
                <div className={styles.grille}>
                  <Field label={`Avis ${i + 1} : prénom ou initiales`} value={a.auteur} onChange={(ev) => maj({ ...a, auteur: ev.target.value })} />
                  <label className={styles.choix}>{`Avis ${i + 1} : note`}
                    <select value={a.note} onChange={(ev) => maj({ ...a, note: Number(ev.target.value) })}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
                    </select>
                  </label>
                  <Field label={`Avis ${i + 1} : date (facultatif)`} value={a.date} onChange={(ev) => maj({ ...a, date: ev.target.value })} placeholder="ex. mars 2026" />
                </div>
                <Field label={`Avis ${i + 1} : texte`} multiline rows={2} value={a.texte} onChange={(ev) => maj({ ...a, texte: ev.target.value })} />
              </>
            )} />
        </>
      );
    case 'faq':
      return (
        <Liste<Question> elements={c.faq} vide={{ question: '', reponse: '' }} nom="la question" onChange={(faq) => setC({ ...c, faq })}
          rendu={(q, maj, i) => (
            <>
              <Field label={`Question ${i + 1}`} value={q.question} onChange={(ev) => maj({ ...q, question: ev.target.value })} />
              <Field label={`Réponse ${i + 1}`} multiline rows={2} value={q.reponse} onChange={(ev) => maj({ ...q, reponse: ev.target.value })} />
            </>
          )} />
      );
    case 'communes':
      return (
        <Field label="Communes (une par ligne)" multiline rows={4} value={c.communes.join('\n')}
          onChange={(e) => setC({ ...c, communes: e.target.value.split('\n') })}
          onBlur={() => setC({ ...c, communes: lignes(c.communes.join('\n')) })}
          hint="Affichées dans la zone d’intervention ; aident à être trouvé sur Google dans ces communes." />
      );
    case 'legal':
      return (
        <>
          <div className={styles.grille}>
            <Field label="Responsable (nom et prénom)" {...champ('legal', 'responsable')} />
            <Field label="Statut (ex. micro-entreprise)" {...champ('legal', 'statut')} />
            <Field label="SIRET" {...champ('legal', 'siret')} />
            <Field label="TVA intracommunautaire" {...champ('legal', 'tva')} />
            <Field label="Adresse de l’entreprise" {...champ('legal', 'adresse')} />
            <Field label="Médiateur de la consommation" {...champ('legal', 'mediateur')} />
          </div>
          <Field label="Droit de rétractation (CGV)" multiline rows={3} {...champ('legal', 'retractation')} />
          <Field label="Durée de conservation des données" {...champ('legal', 'conservation')} />
        </>
      );
  }
}

/** Liste modifiable : ajouter, retirer, monter, descendre. */
function Liste<T>({ elements, vide, nom, onChange, rendu }: {
  elements: T[]; vide: T; nom: string; onChange: (elements: T[]) => void; rendu: (element: T, maj: (e: T) => void, index: number) => ReactNode;
}) {
  const deplacer = (i: number, sens: -1 | 1) => {
    const copie = [...elements];
    [copie[i], copie[i + sens]] = [copie[i + sens], copie[i]];
    onChange(copie);
  };
  return (
    <div className={styles.liste}>
      {elements.map((e, i) => (
        <div key={i} className={styles.jour}>
          {rendu(e, (nouveau) => onChange(elements.map((x, j) => (j === i ? nouveau : x))), i)}
          <div className={styles.actions}>
            <Button variant="ghost" disabled={i === 0} onClick={() => deplacer(i, -1)}>Monter</Button>
            <Button variant="ghost" disabled={i === elements.length - 1} onClick={() => deplacer(i, 1)}>Descendre</Button>
            <Button variant="ghost" onClick={() => onChange(elements.filter((_, j) => j !== i))}>{`Retirer ${nom} ${i + 1}`}</Button>
          </div>
        </div>
      ))}
      <div><Button variant="secondary" onClick={() => onChange([...elements, vide])}>{`Ajouter ${nom}`}</Button></div>
    </div>
  );
}

function Photo({ libelle, url, onChange, onErreur }: { libelle: string; url: string; onChange: (url: string) => void; onErreur: (m: string) => void }) {
  const [envoi, setEnvoi] = useState(false);
  const choisir = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setEnvoi(true);
    onErreur('');
    try {
      onChange(await envoyerPhoto(fichier));
    } catch (err) {
      onErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <div className={styles.choix}>
      <span>{libelle}</span>
      {url ? <img src={url} alt="" style={{ width: '100%', maxWidth: 240, aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 8 }} /> : <span className={styles.aide}>Aucune photo</span>}
      <div className={styles.actions}>
        <label className="btn btn--ghost" style={{ cursor: 'pointer' }}>
          {envoi ? 'Envoi…' : url ? 'Changer la photo' : 'Choisir une photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choisir} aria-label={libelle} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} disabled={envoi} />
        </label>
        {url && <Button variant="ghost" onClick={() => onChange('')}>Retirer</Button>}
      </div>
    </div>
  );
}
