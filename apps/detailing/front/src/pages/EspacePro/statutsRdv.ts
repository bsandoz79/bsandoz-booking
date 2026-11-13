import type { RendezVousPro } from '../../services/pro';

/** Libellés des statuts d'un rendez-vous (planning, historique). */
export const STATUTS: Record<RendezVousPro['status'], string> = {
  pending_payment: 'Paiement en ligne en attente', confirmed: 'Confirmé', done: 'Terminé', cancelled: 'Annulé', expired: 'Expiré', no_show: 'Client absent',
};
