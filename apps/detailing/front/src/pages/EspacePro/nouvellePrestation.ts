import type { PrestationPro } from '../../services/pro';

/** Prestation vierge (formulaire « Ajouter »), dans la catégorie donnée. */
export const nouvellePrestation = (position: number, categoryId = 'interieur'): PrestationPro => ({
  name: '', description: '', basePriceCents: 0, baseDurationMin: 60, active: true, categoryId, position, occupePlage: false, tarifs: {}, optionIds: [],
});
