import { useContenu } from '../../app/contenuContexte';
import { A_COMPLETER } from '../../services/contenu';

/** Lien « tel: » à partir d'un numéro saisi librement (espaces, points…). */
export const lienTel = (numero: string) => `tel:${numero.replace(/[^\d+]/g, '')}`;

/** Téléphone de l'entreprise (« Mon site »), ou null tant qu'il n'est pas renseigné. */
export function useTelephone(): string | null {
  const { telephone } = useContenu().contenu.coordonnees;
  return telephone && telephone !== A_COMPLETER && /\d/.test(telephone) ? telephone : null;
}
