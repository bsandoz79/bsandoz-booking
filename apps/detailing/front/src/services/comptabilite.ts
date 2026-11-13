import { isDemo } from './api';
import { authHttp } from './compte';

export interface Depense { id: string; le: string; libelle: string; montantCents: number; mensuelle: boolean; finLe: string | null }
export interface MoisCompta { mois: string; chiffreAffairesCents: number; depensesCents: number; resultatCents: number }
export interface Bilan {
  annee: number;
  mois: MoisCompta[];
  totaux: { chiffreAffairesCents: number; depensesCents: number; resultatCents: number };
  depenses: Depense[];
}
export interface NouvelleDepense { le: string; libelle: string; montantCents: number; mensuelle: boolean }

// ——— Démo : dépenses en mémoire, chiffre d'affaires nul ———
let demoDepenses: Depense[] = [];
let demoId = 1;

function demoBilan(annee: number): Bilan {
  const maintenant = new Date();
  const moisCourant = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`;
  const mois = Array.from({ length: 12 }, (_, i) => `${annee}-${String(i + 1).padStart(2, '0')}`).map((m): MoisCompta => {
    const depenses = demoDepenses.reduce((s, d) => {
      const debut = d.le.slice(0, 7);
      const fin = d.finLe?.slice(0, 7);
      const compte = d.mensuelle ? m >= debut && m <= moisCourant && (!fin || m <= fin) : debut === m;
      return s + (compte ? d.montantCents : 0);
    }, 0);
    return { mois: m, chiffreAffairesCents: 0, depensesCents: depenses, resultatCents: -depenses };
  });
  const somme = (cle: keyof Omit<MoisCompta, 'mois'>) => mois.reduce((s, m) => s + m[cle], 0);
  return {
    annee, mois,
    totaux: { chiffreAffairesCents: somme('chiffreAffairesCents'), depensesCents: somme('depensesCents'), resultatCents: somme('resultatCents') },
    depenses: demoDepenses.filter((d) => Number(d.le.slice(0, 4)) <= annee).sort((a, b) => b.le.localeCompare(a.le)),
  };
}

export async function bilan(annee: number): Promise<Bilan> {
  if (isDemo()) return demoBilan(annee);
  return authHttp(`/admin/comptabilite?annee=${annee}`);
}

export async function ajouterDepense(d: NouvelleDepense): Promise<Depense> {
  if (isDemo()) {
    const depense = { ...d, libelle: d.libelle.trim(), id: `d${demoId++}`, finLe: null };
    demoDepenses = [...demoDepenses, depense];
    return depense;
  }
  return authHttp('/admin/depenses', { method: 'POST', body: JSON.stringify(d) });
}

/** Dépense mensuelle déjà commencée : arrêtée ce mois-ci ; sinon supprimée. */
export async function retirerDepense(id: string): Promise<void> {
  if (isDemo()) { demoDepenses = demoDepenses.filter((d) => d.id !== id); return; }
  await authHttp(`/admin/depenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
