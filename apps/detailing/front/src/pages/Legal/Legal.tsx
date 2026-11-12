import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useContenu } from '../../app/contenuContexte';
import { SITE } from '../../data/site';
import { useSeo } from '../../seo/useSeo';
import styles from './Legal.module.css';

/**
 * Pages légales. Les informations d'identité de l'entreprise restent « [à compléter] » tant qu'elles ne sont pas fournies ;
 * les textes sont à faire relire avant la mise en ligne réelle.
 */
function PageLegale({ titre, children }: { titre: string; children: ReactNode }) {
  useSeo(`${titre} | Perfect Clean`);
  return (
    <main className={`container ${styles.page}`}>
      <h1>{titre}</h1>
      {children}
      <p className={styles.maj}>Dernière mise à jour : [à compléter]</p>
    </main>
  );
}

export function MentionsLegales() {
  const { legal: l, coordonnees } = useContenu().contenu;
  return (
    <PageLegale titre="Mentions légales">
      <section>
        <h2>Éditeur du site</h2>
        <ul>
          <li>Nom commercial : {SITE.brand}</li>
          <li>Responsable : {l.responsable}</li>
          <li>Statut : {l.statut}</li>
          <li>SIRET : {l.siret}</li>
          <li>TVA intracommunautaire : {l.tva}</li>
          <li>Adresse : {l.adresse}</li>
          <li>Téléphone : {coordonnees.telephone} · E-mail : {coordonnees.email}</li>
        </ul>
      </section>
      <section>
        <h2>Directeur de la publication</h2>
        <p>{l.responsable}</p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>{SITE.legal.host}</p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>Les textes, photos et éléments graphiques de ce site appartiennent à {SITE.brand} ou sont utilisés avec autorisation. Toute reproduction sans accord préalable est interdite.</p>
      </section>
      <section>
        <h2>Données personnelles</h2>
        <p>Voir la <Link to="/confidentialite">politique de confidentialité</Link>.</p>
      </section>
    </PageLegale>
  );
}

export function Cgv() {
  const { legal, coordonnees } = useContenu().contenu;
  return (
    <PageLegale titre="Conditions générales de vente">
      <section>
        <h2>1. Objet</h2>
        <p>Les présentes conditions s'appliquent aux prestations de {SITE.activity.toLowerCase()} réservées sur ce site auprès de {SITE.brand}.</p>
      </section>
      <section>
        <h2>2. Prix</h2>
        <p>Les prix sont affichés en euros toutes taxes comprises avant la réservation. Ils dépendent de la prestation et des options choisies ; un supplément peut s'appliquer pour un véhicule très sale ou des poils d'animaux. Le déplacement est offert jusqu'à {SITE.freeRadiusKm} km ; au-delà, des frais de déplacement calculés à partir de l'adresse sont indiqués avant la validation.</p>
      </section>
      <section>
        <h2>3. Réservation et paiement</h2>
        <p>Aucun acompte n'est demandé. À la réservation, vous choisissez de régler sur place, une fois la prestation terminée, ou de payer la totalité en ligne par carte bancaire, Apple Pay ou Google Pay, via notre prestataire de paiement sécurisé (Stripe). Payée sur place, la réservation est confirmée aussitôt ; payée en ligne, elle l'est dès le paiement reçu. Un e-mail de confirmation est envoyé avec un lien pour gérer le rendez-vous.</p>
      </section>
      <section>
        <h2>4. Annulation et report</h2>
        <p>Vous pouvez annuler ou déplacer votre rendez-vous depuis le lien reçu par e-mail ou votre espace client. Jusqu'à {SITE.freeCancelHours} heures avant le rendez-vous, l'annulation est gratuite et ce qui a été payé en ligne est intégralement remboursé. Au-delà, les sommes réglées en ligne restent acquises. En cas d'empêchement de notre part, le rendez-vous est reporté à une date convenue ensemble ou ce qui a été payé est intégralement remboursé.</p>
      </section>
      <section>
        <h2>5. Droit de rétractation</h2>
        <p>{legal.retractation}</p>
      </section>
      <section>
        <h2>6. Déroulement de la prestation</h2>
        <p>Le client s'assure que le véhicule est accessible à l'adresse et à l'heure prévues. La durée affichée est une estimation ; certaines prestations occupent une demi-journée.</p>
      </section>
      <section>
        <h2>7. Réclamations et médiation</h2>
        <p>Toute réclamation peut être adressée à {coordonnees.email}. En cas de litige, vous pouvez recourir gratuitement au médiateur de la consommation : {legal.mediateur}.</p>
      </section>
    </PageLegale>
  );
}

export function Confidentialite() {
  const { legal, coordonnees } = useContenu().contenu;
  return (
    <PageLegale titre="Politique de confidentialité">
      <section>
        <h2>Responsable du traitement</h2>
        <p>{SITE.brand} ({legal.responsable}), joignable à {coordonnees.email}.</p>
      </section>
      <section>
        <h2>Données collectées et utilisation</h2>
        <ul>
          <li>Nom, e-mail, téléphone et adresse d'intervention : organiser le rendez-vous, vous contacter et calculer le déplacement.</li>
          <li>Détails de la prestation (véhicule, options, notes) : préparer l'intervention.</li>
          <li>Paiement : traité directement par Stripe ; aucun numéro de carte n'est stocké sur ce site.</li>
          <li>Position (carte de la zone d'intervention, seulement si vous l'autorisez) : estimer les frais de déplacement ; elle n'est pas enregistrée.</li>
          <li>Demande de devis (page Professionnels) : nom, entreprise, e-mail, téléphone et besoin, transmis par e-mail à {SITE.brand} uniquement pour vous répondre ; rien n'est enregistré sur le site.</li>
        </ul>
        <p>Base légale : l'exécution du contrat (votre réservation). Le téléphone et l'adresse sont chiffrés dans notre base de données.</p>
      </section>
      <section>
        <h2>Durée de conservation</h2>
        <p>Durée de conservation : {legal.conservation}. Lorsque vous supprimez votre compte, vos données personnelles sont anonymisées ; seules les informations nécessaires à la comptabilité sont conservées pendant la durée légale.</p>
      </section>
      <section>
        <h2>Destinataires</h2>
        <p>Vos données ne sont ni vendues ni cédées. Elles sont accessibles à {SITE.brand} et à ses prestataires techniques : hébergement ({SITE.legal.host.split(',')[0]}), paiement (Stripe), recherche d'adresse (Base Adresse Nationale), fond de carte (OpenStreetMap, qui reçoit l'adresse IP du visiteur pour afficher la carte).</p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>Ce site n'utilise pas de cookie publicitaire ni de mesure d'audience. Un seul cookie technique, nécessaire au maintien de votre connexion à l'espace client, est déposé lorsque vous vous connectez. Le choix de la version claire ou nuit est retenu dans votre navigateur (stockage local), sans être transmis.</p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité. Depuis votre espace client, vous pouvez télécharger vos données et supprimer votre compte. Vous pouvez aussi nous écrire à {coordonnees.email}, ou saisir la CNIL (cnil.fr).</p>
      </section>
    </PageLegale>
  );
}

export function PageIntrouvable() {
  return (
    <main className={`container ${styles.page}`}>
      <h1>Page introuvable</h1>
      <p>La page demandée n'existe pas ou a été déplacée.</p>
      <p><Link to="/" className="btn">Retour à l'accueil</Link></p>
    </main>
  );
}
