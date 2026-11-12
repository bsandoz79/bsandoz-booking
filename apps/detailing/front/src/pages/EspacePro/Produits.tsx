import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, DataTable, Field, Toggle, formatEuros } from '@bsandoz/ui';
import { envoyerPhoto } from '../../services/contenu';
import { enregistrerProduit, produits as listerProduits, type ProduitPro } from '../../services/pro';
import styles from './Pro.module.css';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const centimes = (texte: string) => Math.round(Number(texte.replace(',', '.').replace(/\s/g, '')) * 100);
const prixValide = (texte: string) => /^\d+([.,]\d{1,2})?$/.test(texte.trim()) && centimes(texte) > 0;

const nouveauProduit = (position: number): ProduitPro => ({ name: '', description: '', priceCents: 0, stock: 0, active: true, position, photo: null });

/**
 * Produits vendus avec les réservations (lave-vitres, microfibres…) : proposés au client juste avant le paiement,
 * payés avec l'acompte. Stock à 0 ou produit retiré : plus proposé sur le site. Le stock baisse à chaque réservation
 * et remonte si elle est annulée ou non payée.
 */
export function ProduitsOnglet() {
  const [liste, setListe] = useState<ProduitPro[]>([]);
  const [edition, setEdition] = useState<ProduitPro>();
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = useCallback(() => listerProduits().then(setListe).catch((e: Error) => setErreur(e.message)), []);
  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async (p: ProduitPro, texte: string) => {
    setErreur('');
    try { await enregistrerProduit(p); setMessage(texte); setEdition(undefined); charger(); } catch (e) { setErreur((e as Error).message); }
  };
  const stock = (p: ProduitPro, delta: number) => enregistrer({ ...p, stock: Math.max(0, p.stock + delta) }, `Stock de « ${p.name} » : ${Math.max(0, p.stock + delta)}.`);

  return (
    <section className={styles.section} aria-labelledby="titre-produits">
      <h2 id="titre-produits">Produits</h2>
      <p className={styles.aide}>Proposés au client juste avant le paiement, réglés avec l’acompte, et remis le jour du rendez-vous. Un produit à 0 en stock n’est plus proposé.</p>
      {message && <p className={styles.ok} role="status">{message}</p>}
      {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}

      {edition ? (
        <FormulaireProduit initial={edition} onAnnuler={() => setEdition(undefined)} onEnregistrer={(p) => enregistrer(p, `« ${p.name} » enregistré.`)} />
      ) : (
        <>
          <DataTable caption="Mes produits" rows={liste} rowKey={(p) => p.id ?? p.name} emptyLabel="Aucun produit pour l’instant."
            onRowClick={(p) => { setMessage(''); setEdition(p); }} rowActionLabel={(p) => `Modifier ${p.name}`}
            columns={[
              { key: 'name', header: 'Produit', sortValue: (p) => p.name },
              { key: 'prix', header: 'Prix', align: 'end', render: (p) => formatEuros(p.priceCents), sortValue: (p) => p.priceCents },
              { key: 'stock', header: 'Stock', render: (p) => (
                <span className={styles.actions}>
                  <Button variant="ghost" onClick={() => stock(p, -1)} disabled={p.stock === 0} aria-label={`Un ${p.name} de moins en stock`}>−</Button>
                  <strong>{p.stock}</strong>
                  <Button variant="ghost" onClick={() => stock(p, 1)} aria-label={`Un ${p.name} de plus en stock`}>+</Button>
                </span>
              ), sortValue: (p) => p.stock },
              { key: 'active', header: 'Sur le site', render: (p) => (
                <span className={styles.actions}>
                  {!p.active ? 'Retiré' : p.stock === 0 ? 'Épuisé' : 'Oui'}
                  <Button variant="ghost" onClick={() => enregistrer({ ...p, active: !p.active }, p.active ? `« ${p.name} » retiré de la vente.` : `« ${p.name} » de nouveau en vente.`)}>
                    {p.active ? `Retirer ${p.name}` : `Remettre ${p.name}`}
                  </Button>
                </span>
              ) },
            ]} />
          <div className={styles.actions}>
            <Button onClick={() => { setMessage(''); setEdition(nouveauProduit(liste.length)); }}>Ajouter un produit</Button>
          </div>
        </>
      )}
    </section>
  );
}

function FormulaireProduit({ initial, onAnnuler, onEnregistrer }: { initial: ProduitPro; onAnnuler: () => void; onEnregistrer: (p: ProduitPro) => void }) {
  const [p, setP] = useState(initial);
  const [prix, setPrix] = useState(initial.id ? euros(initial.priceCents) : '');
  const [stock, setStock] = useState(String(initial.stock));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const valide = p.name.trim() !== '' && prixValide(prix) && /^\d+$/.test(stock);

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (valide) onEnregistrer({ ...p, name: p.name.trim(), priceCents: centimes(prix), stock: Number(stock) });
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
