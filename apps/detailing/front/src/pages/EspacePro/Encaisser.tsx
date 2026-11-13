import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Button, Dialog, formatEuros } from '@bsandoz/ui';
import { encaisser, lienPaiementQr, rendezVousPro, type MoyenPaiement, type RendezVousPro } from '../../services/pro';
import { Icone, type NomIcone } from '../../components/Icone/Icone';
import styles from './Encaisser.module.css';

type MoyenManuel = Exclude<MoyenPaiement, 'qr'>;

const MOYENS: { valeur: MoyenManuel; libelle: string; icone: NomIcone }[] = [
  { valeur: 'carte', libelle: 'Carte bancaire (terminal)', icone: 'carteBancaire' },
  { valeur: 'especes', libelle: 'Espèces', icone: 'especes' },
  { valeur: 'virement', libelle: 'Virement', icone: 'virement' },
  { valeur: 'cheque', libelle: 'Chèque', icone: 'cheque' },
];

/** Intervalle de vérification du paiement par QR code. */
const SUIVI_MS = 3000;

/**
 * Encaissement du reste à régler sur place. Le pro choisit le moyen (carte au terminal, espèces, virement, chèque) puis
 * valide ; ou il affiche un QR code que le client scanne pour payer sur son téléphone (carte, Apple Pay, Google Pay),
 * et la fenêtre suit le paiement jusqu'à sa réception. Dans tous les cas : rendez-vous terminé, facture envoyée.
 */
export function Encaisser({ rdv, onClose, onEncaisse }: { rdv: RendezVousPro; onClose: () => void; onEncaisse: (message: string) => void }) {
  const montant = rdv.surPlaceCents ?? 0;
  const [moyen, setMoyen] = useState<MoyenManuel | null>(null);
  const [lien, setLien] = useState<string | null>(null);
  const [recu, setRecu] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  // QR code affiché : on vérifie régulièrement si le client a payé.
  useEffect(() => {
    if (!lien || recu) return;
    const minuteur = window.setInterval(() => {
      rendezVousPro(rdv.id).then((r) => { if (r.moyenSurPlace) setRecu(true); }).catch(() => undefined);
    }, SUIVI_MS);
    return () => window.clearInterval(minuteur);
  }, [lien, recu, rdv.id]);

  const valider = async () => {
    if (!moyen) return;
    setEnvoi(true);
    setErreur('');
    try {
      await encaisser(rdv.id, moyen);
      onEncaisse(`${formatEuros(montant)} encaissés (${MOYENS.find((m) => m.valeur === moyen)?.libelle.toLowerCase()}). Facture envoyée au client.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Encaissement impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  const afficherQr = async () => {
    setEnvoi(true);
    setErreur('');
    try {
      setLien(await lienPaiementQr(rdv.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Paiement par QR code indisponible.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open title={`Encaisser ${formatEuros(montant)}`} description={`${rdv.client.name || 'Client'} · ${rdv.prestation}`}
      onClose={recu ? () => onEncaisse(`${formatEuros(montant)} payés par QR code. Facture envoyée au client.`) : onClose}>
      {lien ? (
        <div className={styles.qr}>
          {recu ? (
            <p className={styles.recu} role="status"><span className={styles.coche}><Icone nom="coche" taille={28} /></span>Paiement reçu</p>
          ) : (
            <>
              <CodeQr texte={lien} />
              <p className={styles.consigne}>Le client scanne ce code avec l’appareil photo de son téléphone, puis paie par carte, Apple Pay ou Google Pay.</p>
              <p className={styles.attente} role="status" aria-live="polite"><span className={styles.point} aria-hidden="true" />En attente du paiement…</p>
            </>
          )}
          {recu
            ? <Button onClick={() => onEncaisse(`${formatEuros(montant)} payés par QR code. Facture envoyée au client.`)}>Terminer</Button>
            : <button type="button" className={styles.lienRetour} onClick={() => setLien(null)}>Choisir un autre moyen de paiement</button>}
        </div>
      ) : (
        <>
          <p className={styles.question} id="question-moyen">Comment le client a-t-il payé ?</p>
          <div className={styles.moyens} role="radiogroup" aria-labelledby="question-moyen">
            {MOYENS.map((m) => (
              <button key={m.valeur} type="button" role="radio" aria-checked={moyen === m.valeur} className={styles.moyen} onClick={() => setMoyen(m.valeur)}>
                <Icone nom={m.icone} taille={24} />{m.libelle}
              </button>
            ))}
          </div>
          {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
          <Button onClick={() => { void valider(); }} disabled={!moyen || envoi}>
            {moyen ? `Encaisser ${formatEuros(montant)}` : 'Choisissez un moyen de paiement'}
          </Button>
          <div className={styles.separateur}><span>ou</span></div>
          <button type="button" className={styles.boutonQr} onClick={() => { void afficherQr(); }} disabled={envoi}>
            <Icone nom="qrcode" taille={24} />
            <span><strong>Afficher un QR code</strong><small>Le client paie sur son téléphone, sans terminal.</small></span>
          </button>
        </>
      )}
    </Dialog>
  );
}

/** QR code dessiné en SVG (carrés noirs sur fond blanc, marge de lecture comprise). */
function CodeQr({ texte }: { texte: string }) {
  const { taille, trace } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(texte);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
      }
    }
    return { taille: n + 8, trace: d };
  }, [texte]);
  return (
    <svg className={styles.code} viewBox={`0 0 ${taille} ${taille}`} role="img" aria-label="QR code de paiement" shapeRendering="crispEdges">
      <rect width={taille} height={taille} fill="#fff" />
      <path d={trace} fill="#000" />
    </svg>
  );
}
