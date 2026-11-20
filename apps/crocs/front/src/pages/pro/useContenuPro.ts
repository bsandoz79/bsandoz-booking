import { useCallback, useEffect, useState } from 'react';
import { enregistrerContenu, lireContenu, type ContenuSite } from '../../services/api';

/**
 * Contenu du site dans l'espace du patron : lu à l'ouverture de l'onglet, puis enregistré en entier à chaque
 * changement (l'API remplace tout le contenu : on renvoie aussi ce que l'onglet ne modifie pas).
 */
export function useContenuPro() {
  const [contenu, setContenu] = useState<ContenuSite>();
  const [erreurLecture, setErreurLecture] = useState(false);

  useEffect(() => {
    void lireContenu().then(setContenu).catch(() => setErreurLecture(true));
  }, []);

  const enregistrer = useCallback(async (changements: Partial<ContenuSite>) => {
    if (!contenu) return;
    const suite = { ...contenu, ...changements };
    await enregistrerContenu(suite);
    setContenu(suite);
  }, [contenu]);

  return { contenu, erreurLecture, enregistrer };
}
