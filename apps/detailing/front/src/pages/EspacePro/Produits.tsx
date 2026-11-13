import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Dialog, Field, Toggle, formatEuros } from '@bsandoz/ui';
import { envoyerPhoto } from '../../services/contenu';
import { enregistrerProduit, produits as listerProduits, supprimerProduit, type ProduitPro } from '../../services/pro';
import { Icone } from '../../components/Icone/Icone';
import { Filtres } from './Filtres';
import { filtrer } from './filtrer';
import { etatStock } from '../../app/stock';
import r from '../../components/Reglages/Reglages.module.css';
import g from './Produits.module.css';
import styles from './Pro.module.css';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const centimes = (texte: string) => Math.round(Number(texte.replace(',', '.').replace(/\s/g, '')) * 100);
const prixValide = (texte: string) => /^\d+([.,]\d{1,2})?$/.test(texte.trim()) && centimes(texte) > 0;

const nouveauProduit = (position: number, category: string | null = null): ProduitPro =>
  ({ name: '', description: '', priceCents: 0, stock: 0, active: true, position, photo: null, category });

/**
 * Produits vendus avec les réservations (lave-vitres, microfibres…), en grille de cartes : photo, nom, prix, stock
 * réglable d'un geste ; ajout, modification, retrait de la vente, suppression. Filtres par catégorie et par nom.
 * Le client voit « il en reste 2 » ou « épuisé » ; le stock baisse à chaque réservation et remonte si elle est annulée.
 */
export function ProduitsOnglet() {
  const [liste, setListe] = useState<ProduitPro[]>([]);
  const [edition, setEdition] = useState<ProduitPro>();
  const [suppression, setSuppression] = useState<ProduitPro>();
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = useCallback(() => listerProduits().then(setListe).catch((e: Error) => setErreur(e.message)), []);
  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async (p: ProduitPro, texte: string) => {
    setErreur('');
    try { await enregistrerProduit(p); setMessage(texte); setEdition(undefined); charger(); } catch (e) { setErreur((e as Error).message); }
  };
  const stock = (p: ProduitPro, delta: number) => enregistrer({ ...p, stock: Math.max(0, p.stock + delta) }, `Stock de « ${p.name} » : ${Math.max(0, p.stock + delta)}.`);
  const supprimer = async (p: ProduitPro) => {
    setErreur('');
    try { await supprimerProduit(p.id!); setSuppression(undefined); setMessage(`« ${p.name} » supprimé.`); charger(); } catch (e) { setErreur((e as Error).message); }
  };

  const categories = [...new Set(liste.map((p) => p.category?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'fr'));
  const visibles = filtrer(liste, recherche, categorie, (p) => `${p.name} ${p.description}`, (p) => p.category ?? '');

  if (edition) {
    return (
      <section className={styles.section} aria-labelledby="titre-produits">
        <h2 id="titre-produits">Produits</h2>
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        <FormulaireProduit initial={edition} categories={categories} onAnnuler={() => setEdition(undefined)} onEnregistrer={(p) => enregistrer(p, `« ${p.name} » enregistré.`)} />
      </section>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="titre-produits">
      <div className={r.rubriqueEntete}>
        <div>
          <h2 id="titre-produits">Produits</h2>
          <p className={r.aide}>Proposés au client juste avant le paiement et remis le jour du rendez-vous. Le client voit le stock restant (« il en reste 2 », « épuisé »).</p>
        </div>
        <Button onClick={() => { setMessage(''); setEdition(nouveauProduit(liste.length, categorie || null)); }}>Ajouter un produit</Button>
      </div>
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      <Filtres recherche={recherche} onRecherche={setRecherche} categories={categories} categorie={categorie} onCategorie={setCategorie}
        libelleRecherche="Rechercher un produit" />

      {visibles.length === 0 ? <p className={r.aide}>{liste.length === 0 ? 'Aucun produit pour l’instant.' : 'Aucun produit ne correspond à la recherche.'}</p> : (
        <ul className={g.grille} aria-label="Mes produits">
          {visibles.map((p) => (
            <li key={p.id ?? p.name} className={`${g.carte} ${p.active ? '' : g.retire}`} aria-label={p.name}>
              <div className={g.photo}>
                {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : <Icone nom="produit" taille={56} className={g.sansPhoto} />}
                <span className={`${g.etat} ${!p.active ? g.etatRetire : p.stock === 0 ? g.etatEpuise : p.stock <= 5 ? g.etatBas : ''}`}>
                  {p.active ? etatStock(p.stock) : 'Retiré de la vente'}
                </span>
              </div>
              <div className={g.corps}>
                {p.category && <span className={g.categorie}>{p.category}</span>}
                <h3 className={g.nom}>{p.name}</h3>
                <p className={g.prix}>{formatEuros(p.priceCents)}</p>
                <div className={g.stock} role="group" aria-label={`Stock de ${p.name}`}>
                  <button type="button" className={g.pas} onClick={() => stock(p, -1)} disabled={p.stock === 0} aria-label={`Un ${p.name} de moins en stock`}>−</button>
                  <span className={g.quantite}><strong>{p.stock}</strong> en stock</span>
                  <button type="button" className={g.pas} onClick={() => stock(p, 1)} aria-label={`Un ${p.name} de plus en stock`}>+</button>
                </div>
                <div className={g.actions}>
                  <button type="button" className={r.boutonContour} onClick={() => { setMessage(''); setEdition(p); }} aria-label={`Modifier ${p.name}`}>Modifier</button>
                  <button type="button" className={r.boutonContour} aria-label={p.active ? `Retirer ${p.name}` : `Remettre ${p.name}`}
                    onClick={() => enregistrer({ ...p, active: !p.active }, p.active ? `« ${p.name} » retiré de la vente.` : `« ${p.name} » de nouveau en vente.`)}>
                    {p.active ? 'Retirer' : 'Remettre'}
                  </button>
                  <button type="button" className={`${r.boutonContour} ${g.supprimer}`} onClick={() => setSuppression(p)} aria-label={`Supprimer ${p.name}`}>
                    <Icone nom="poubelle" taille={17} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {suppression && (
        <Dialog open title={`Supprimer « ${suppression.name} » ?`} onClose={() => setSuppression(undefined)}
          description="Il disparaît de votre liste et du site. Les réservations passées gardent son nom et son prix. Pour l’arrêter seulement un temps, utilisez plutôt « Retirer »."
          actions={<>
            <Button variant="ghost" onClick={() => setSuppression(undefined)}>Garder</Button>
            <button type="button" className={r.boutonDanger} onClick={() => supprimer(suppression)}>Supprimer définitivement</button>
          </>} />
      )}
    </section>
  );
}

function FormulaireProduit({ initial, categories, onAnnuler, onEnregistrer }: {
  initial: ProduitPro; categories: string[]; onAnnuler: () => void; onEnregistrer: (p: ProduitPro) => void;
}) {
  const [p, setP] = useState(initial);
  const [prix, setPrix] = useState(initial.id ? euros(initial.priceCents) : '');
  const [stock, setStock] = useState(String(initial.stock));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const valide = p.name.trim() !== '' && prixValide(prix) && /^\d+$/.test(stock);

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (valide) onEnregistrer({ ...p, name: p.name.trim(), category: p.category?.trim() || null, priceCents: centimes(prix), stock: Number(stock) });
  };
  const photo = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setErreur('');
    setEnvoi(true);
    try { setP({ ...p, photo: await envoyerPhoto(fichier) }); } catch (err) { setErreur((err as Error).message); } finally { setEnvoi(false); }
  };

  return (
    <form className={styles.panneau} onSubmit={soumettre} noValidate aria-labelledby="titre-produit">
      <h3 id="titre-produit">{initial.id ? `Modifier « ${initial.name} »` : 'Nouveau produit'}</h3>
      <div className={styles.grille}>
        <Field label="Nom" required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Ex. Lave-vitres 500 ml" />
        <Field label="Prix (€)" inputMode="decimal" required value={prix} onChange={(e) => setPrix(e.target.value)} error={prix && !prixValide(prix) ? 'Montant invalide, ex. 8 ou 7,90.' : undefined} />
        <Field label="En stock" inputMode="numeric" required value={stock} onChange={(e) => setStock(e.target.value)} error={stock && !/^\d+$/.test(stock) ? 'Nombre entier, 0 si vous n’en avez plus.' : undefined} />
        <Field label="Catégorie (facultatif)" value={p.category ?? ''} list="categories-produits" placeholder="Ex. Jantes, Vitres, Intérieur" onChange={(e) => setP({ ...p, category: e.target.value })} />
        <datalist id="categories-produits">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <Field label="Description" multiline rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
      <div className={styles.ligne}>
        {p.photo && <img src={p.photo} alt={`Photo actuelle de ${p.name || 'ce produit'}`} width="80" height="80" style={{ objectFit: 'cover', borderRadius: 8 }} />}
        <label className={styles.choix}>Photo (facultative)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} disabled={envoi} /></label>
        {p.photo && <Button variant="ghost" onClick={() => setP({ ...p, photo: null })}>Enlever la photo</Button>}
      </div>
      <Toggle label="Proposé aux clients" checked={p.active} onChange={(v) => setP({ ...p, active: v })} />
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
      <div className={styles.actions}>
        <Button type="submit" disabled={!valide || envoi}>Enregistrer</Button>
        <Button variant="ghost" onClick={onAnnuler}>Annuler</Button>
      </div>
    </form>
  );
}
