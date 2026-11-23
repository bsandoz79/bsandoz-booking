import { useState } from 'react';
import { Carte, CarteModifiable, Defilant, Visionneuse } from '@bsandoz/ui';
import { horairesParJour, rangAujourdhui } from './calculs/horaires';
import { Logo } from './components/Logo';
import { PhotosHero } from './components/PhotosHero';
import { Trajet } from './components/Trajet';
import { crocs, itineraires } from './data/crocs';
import { pictos } from './data/pictos';
import { useContenu } from './hooks/useContenu';
import { FenetreTexte, type TexteModifiable } from './modification/FenetresTextes';
import { BarreModification, Modifiable } from './modification/Modifiable';
import modification from './modification/Modification.module.css';
import { useModeModification } from './modification/useModeModification';
import styles from './App.module.css';

/**
 * Photos servies par le serveur (dossier `photos/` du site), hors du dépôt public et hors du build :
 * le site se déploie depuis GitHub sans elles, et elles se changent sans redéployer. En local : `public/photos/`.
 */
const photo = (nom: string) => `/photos/${nom}.webp`;

/** Photos du diaporama du haut : la photo principale et 7 photos du patron au plus. */
export const PHOTOS_MAX = 8;

const LIBELLES_CARTE = { ajouterArticle: 'Ajouter un plat', modifierArticle: 'Modifier le plat' };

/**
 * Site de Croc's (démo) : une seule page, de l'envie (photo, carte) au trajet.
 * `modifier` (adresse /?modifier, ouverte depuis l'espace pro) : le patron connecté voit son site tel quel, avec la carte,
 * l'annonce, la phrase d'accueil et les horaires entourés ; un toucher ouvre la fenêtre pour les changer.
 */
export function App({ modifier = false }: { modifier?: boolean }) {
  const { carte, accroche, horaires, horairesAConfirmer, annonce, avis, photos, enAttente, recharger } = useContenu();
  const edition = useModeModification(modifier, recharger);
  const [texte, setTexte] = useState<TexteModifiable>();
  const photoDe = (id: string) => edition.carte?.flatMap((r) => r.articles).find((a) => a.id === id)?.photo ?? null;
  // Diaporama du haut (photo principale puis celles du patron), photos agrandies au clic.
  const galerie = [{ url: photo('assiette'), description: 'Assiettes kebab, frites et salade' }, ...photos].slice(0, PHOTOS_MAX);
  const [agrandie, setAgrandie] = useState<number | null>(null);
  return (
    <div className={modifier ? modification.page : undefined}>
      {edition.actif && !annonce
        ? (
          <Modifiable actif label="Ajouter une annonce" onToucher={() => setTexte('annonce')} className={modification.pleineLargeur}>
            <p className={modification.annonceVide}>Pas d’annonce en ce moment (par exemple une fermeture exceptionnelle).</p>
          </Modifiable>
        )
        : annonce && (
          <Modifiable actif={edition.actif} label="Modifier l’annonce" onToucher={() => setTexte('annonce')} className={modification.pleineLargeur}>
            <p className={styles.annonce} role="status">{annonce}</p>
          </Modifiable>
        )}

      <header className={styles.entete}>
        <a href="#haut" className={styles.logo} aria-label={`${crocs.nom}, haut de page`}><Logo decoratif /></a>
        <nav aria-label="Rubriques" className={styles.nav}>
          <a href="#carte">La carte</a>
          <a href="#venir">Venir</a>
          <a href="#avis">Avis</a>
        </nav>
        <a href={crocs.telephoneLien} className={styles.appelEntete}>Appeler</a>
      </header>

      <main id="haut">
        <section className={styles.hero} aria-labelledby="titre">
          <div className={styles.heroTexte}>
            <p className={styles.surtitre}>{crocs.activite} · Amiens</p>
            <h1 id="titre" className={styles.titre}><Logo /></h1>
            <Modifiable actif={edition.actif} label="Modifier la phrase d’accueil" onToucher={() => setTexte('accroche')}>
              <p className={enAttente ? `${styles.accroche} ${styles.enAttente}` : styles.accroche}>{accroche}</p>
            </Modifiable>
            <div className={styles.boutons}>
              <a href={crocs.telephoneLien} className={styles.boutonJaune}>Appeler le {crocs.telephone}</a>
              <a href={itineraires.google} className={styles.boutonBlanc} target="_blank" rel="noopener noreferrer">Itinéraire</a>
            </div>
            <p className={styles.adresse}>{crocs.adresse}, {crocs.ville}</p>
          </div>
          <div className={styles.heroPhoto}>
            <Modifiable actif={edition.actif} label="Changer les photos" href="/pro?onglet=photos">
              <PhotosHero photos={galerie} onAgrandir={setAgrandie} />
            </Modifiable>
          </div>
        </section>

        <section id="carte" className={styles.carte} aria-labelledby="carte-titre">
          <div className={styles.conteneur}>
            <div className={styles.cadreCarte}>
              <h2 id="carte-titre" className={styles.titreCarte}>La carte</h2>
              {/* En modification, la carte entière (pas de pages) : tous les plats à portée de doigt. */}
              {edition.actif && edition.carte ? (
                <CarteModifiable
                  titre="La carte de Croc’s"
                  sommaire="Aller à une rubrique de la carte"
                  compacte
                  rubriques={edition.carte}
                  icones={pictos}
                  libelles={LIBELLES_CARTE}
                  libellesCarte={{ ajouter: '+ Ajouter un plat' }}
                  onAjouterArticle={edition.actionsCarte.ajouterArticle}
                  onModifierArticle={(id, a) => edition.actionsCarte.modifierArticle(id, a, photoDe(id))}
                  onEpuiser={edition.actionsCarte.epuiser}
                  onSupprimerArticle={edition.actionsCarte.supprimerArticle}
                  onModifierRubrique={edition.actionsCarte.modifierRubrique}
                  onSupprimerRubrique={edition.actionsCarte.supprimerRubrique}
                />
              ) : enAttente || edition.verification
                ? <p className={styles.chargementCarte} role="status">Chargement de la carte…</p>
                : <Carte titre="La carte de Croc’s" rubriques={carte} sommaire="Aller à une rubrique de la carte" compacte ajustee />}
            </div>
          </div>
        </section>

        <section id="venir" className={styles.venir} aria-labelledby="venir-titre">
          <div className={`${styles.conteneur} ${styles.deuxColonnes}`}>
            <div className={styles.infos}>
              <h2 id="venir-titre" className={styles.sectionTitreRouge}>Venir chez Croc’s</h2>
              <p className={styles.adresseGrande}>{crocs.adresse}<br />{crocs.ville}</p>
              <div className={styles.liens}>
                <a href={itineraires.google} target="_blank" rel="noopener noreferrer">Google Maps</a>
                <a href={itineraires.waze} target="_blank" rel="noopener noreferrer">Waze</a>
                <a href={itineraires.plans} target="_blank" rel="noopener noreferrer">Plans (iPhone)</a>
              </div>
              <h3 className={styles.petitTitre}>Horaires</h3>
              {/* Jour par jour, aujourd'hui mis en avant (heure de France). */}
              <Modifiable actif={edition.actif} label="Modifier les horaires" onToucher={() => setTexte('horaires')} className={modification.surClair}>
              <dl className={enAttente ? `${styles.horaires} ${styles.enAttente}` : styles.horaires} aria-busy={enAttente || undefined}>
                {horairesParJour(horaires).map((h, i) => {
                  const aujourdhui = i === rangAujourdhui();
                  return (
                    <div key={h.jours} className={aujourdhui ? styles.aujourdhui : undefined} aria-current={aujourdhui ? 'date' : undefined}>
                      <dt>{h.jours}{aujourdhui && <span className={styles.pastilleJour}>aujourd’hui</span>}</dt>
                      <dd>{h.heures}</dd>
                    </div>
                  );
                })}
              </dl>
              </Modifiable>
              {horairesAConfirmer && <p className={styles.discret}>Horaires relevés dans les annuaires, à confirmer.</p>}
              <p><a href={crocs.telephoneLien} className={styles.telephone}>{crocs.telephone}</a></p>
            </div>
            <Trajet />
          </div>
        </section>

        {!enAttente && avis.length > 0 && <section id="avis" className={styles.avis} aria-labelledby="avis-titre">
          <div className={styles.conteneur}>
            <h2 id="avis-titre" className={styles.sectionTitreRouge}>Ce qu’en disent les clients</h2>
            {/* 3 avis à la fois ; au-delà, ils défilent d'un cran toutes les 3 secondes. */}
            <Modifiable actif={edition.actif} label="Changer les avis" href="/pro?onglet=avis" className={modification.surClair}>
            <div className={styles.listeAvis}>
              <Defilant label="Avis des clients" visibles={3} intervalle={3000}>
                {avis.map((a, i) => (
                  <figure key={i} className={styles.unAvis}>
                    <blockquote>
                      <p className={styles.etoiles} aria-label={`${a.note} sur 5`}>{'★'.repeat(a.note)}</p>
                      <p className={styles.texteAvis}>« {a.texte} »</p>
                    </blockquote>
                    <figcaption className={styles.auteur}>
                      <strong>{a.auteur}</strong>{a.quand && `, ${a.quand}`}{a.source && ` · sur ${a.source}`}
                    </figcaption>
                  </figure>
                ))}
              </Defilant>
            </div>
            </Modifiable>
          </div>
        </section>}

      </main>

      <Visionneuse photos={galerie} index={agrandie} onChange={setAgrandie} onClose={() => setAgrandie(null)} />

      <footer className={styles.pied}>
        <div className={styles.piedCommerce}>
          <p className={styles.logoPied}><Logo /></p>
          <p>{crocs.adresse}, {crocs.ville} · <a href={crocs.telephoneLien}>{crocs.telephone}</a></p>
        </div>
        <nav className={styles.piedLiens} aria-label="Informations">
          <a href="/mentions-legales" className={styles.lienPied}>Mentions légales et données personnelles</a>
          <a href="/pro" className={styles.lienPied}>Espace pro</a>
        </nav>
        <a href="https://bsandoz.fr" className={styles.pub}>
          <span>Site créé par <strong>Baptiste Sandoz</strong></span>
          <span>Vous aussi, un site à votre image, sans abonnement →</span>
        </a>
      </footer>

      {modifier && <BarreModification verification={edition.verification} />}
      {texte && (
        <FenetreTexte texte={texte} annonce={annonce} accroche={accroche} horaires={horaires} onFermer={() => setTexte(undefined)} onEnregistre={recharger} />
      )}
    </div>
  );
}
