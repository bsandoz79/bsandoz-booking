import { useState } from 'react';
import { Button } from '@bsandoz/ui';

/** Copie de la liste où l'élément `i` a bougé d'un cran (`sens` : -1 monte, 1 descend). */
export function deplacer<T>(liste: T[], i: number, sens: -1 | 1): T[] {
  const j = i + sens;
  if (j < 0 || j >= liste.length) return liste;
  const copie = [...liste];
  [copie[i], copie[j]] = [copie[j], copie[i]];
  return copie;
}

/** Bouton « Retirer » en deux touches (la première demande confirmation), pour éviter les erreurs au doigt. */
export function Retirer({ nom, onRetirer }: { nom: string; onRetirer: () => Promise<void> }) {
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  return (
    <Button
      variant="ghost"
      disabled={enCours}
      aria-label={confirmer ? `Confirmer : retirer ${nom}` : `Retirer ${nom}`}
      onClick={() => {
        if (!confirmer) {
          setConfirmer(true);
          return;
        }
        setEnCours(true);
        void onRetirer().finally(() => { setEnCours(false); setConfirmer(false); });
      }}
    >
      {confirmer ? 'Toucher encore pour retirer' : 'Retirer'}
    </Button>
  );
}
