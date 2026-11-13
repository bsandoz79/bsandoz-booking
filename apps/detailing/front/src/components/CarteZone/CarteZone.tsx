import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Circle, CircleMarker, Map as CarteLeaflet } from 'leaflet';
import { AddressInput, formatEuros } from '@bsandoz/ui';
import { cerclesZone, couleurTranche, type Estimation, type ZonePublique } from '../../data/zone';
import styles from './CarteZone.module.css';

export interface Position { lat: number; lng: number }
interface Adresse extends Position { label: string }

export interface CarteZoneProps {
  zone: ZonePublique;
  /** Centre affiché (centre de la ville de départ, jamais l'adresse du pro). */
  centre: Position;
  ville: string;
  estimer: (lat: number, lng: number) => Promise<Estimation>;
  rechercherAdresse: (q: string) => Promise<Adresse[]>;
  /** Prévient la page (ex. pour mettre en avant la tranche correspondante). */
  onEstimation?: (estimation: Estimation | undefined) => void;
}

type EtatPosition = 'attente' | 'demande' | 'refusee' | 'indisponible' | 'ok';

const prix = (cents: number) => (cents === 0 ? 'offert' : formatEuros(cents).replace(',00', ''));
const COULEUR_VOUS = '#0f1b2d';

/**
 * Carte de la zone d'intervention (OpenStreetMap) : un cercle par tranche de frais de déplacement autour de la ville de
 * départ. La carte (Leaflet) n'est chargée qu'à l'arrivée sur la section ; la position est alors demandée au
 * navigateur pour estimer les frais. Sans position, le visiteur saisit son adresse.
 */
export function CarteZone({ zone, centre, ville, estimer, rechercherAdresse, onEstimation }: CarteZoneProps) {
  const racine = useRef<HTMLDivElement>(null);
  const conteneurCarte = useRef<HTMLDivElement>(null);
  const carte = useRef<{ map: CarteLeaflet; repere?: CircleMarker; cercles: Circle[]; L: typeof import('leaflet') }>(undefined);
  const [visible, setVisible] = useState(false);
  const [etat, setEtat] = useState<EtatPosition>('attente');
  const [adresse, setAdresse] = useState<Adresse>();
  const [estimation, setEstimation] = useState<Estimation>();
  const [erreur, setErreur] = useState('');
  const cercles = cerclesZone(zone);
  // Téléphone : un doigt fait défiler la page, deux doigts déplacent et zooment la carte ; on l'indique au besoin.
  const [tactile] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const [indice, setIndice] = useState(false);
  const minuterieIndice = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(minuterieIndice.current), []);
  const montrerIndice = () => {
    setIndice(true);
    window.clearTimeout(minuterieIndice.current);
    minuterieIndice.current = window.setTimeout(() => setIndice(false), 1600);
  };

  // Arrivée sur la section : chargement de la carte et demande de position (une seule fois).
  useEffect(() => {
    const el = racine.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observateur = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) { setVisible(true); observateur.disconnect(); }
    }, { threshold: 0.25 });
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  const calculer = async (pos: Position) => {
    setErreur('');
    try {
      const resultat = await estimer(pos.lat, pos.lng);
      setEstimation(resultat);
      onEstimation?.(resultat);
      placerRepere(pos);
    } catch {
      setErreur('Le calcul n’a pas pu se faire. Réessayez dans un instant.');
    }
  };

  const demanderPosition = () => {
    if (!('geolocation' in navigator)) { setEtat('indisponible'); return; }
    setEtat('demande');
    navigator.geolocation.getCurrentPosition(
      (p) => { setEtat('ok'); setAdresse(undefined); void calculer({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      (e) => setEtat(e.code === e.PERMISSION_DENIED ? 'refusee' : 'indisponible'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };

  useEffect(() => {
    if (!visible) return;
    demanderPosition();
    let annule = false;
    void Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([L]) => {
      if (annule || !conteneurCarte.current || carte.current) return;
      const map = L.map(conteneurCarte.current, { scrollWheelZoom: false, dragging: !tactile, touchZoom: true, attributionControl: true })
        .setView([centre.lat, centre.lng], 9);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      // Traits en tirets, du vert (le plus proche) au rouge (le plus loin) ; du plus grand au plus petit, pour que les
      // petits cercles restent par-dessus.
      const traces = [...cercles].reverse().map((c, i) => {
        const dernier = i === 0;
        const couleur = couleurTranche(cercles.length - 1 - i, cercles.length);
        const cercle = L.circle([centre.lat, centre.lng], {
          radius: c.rayonM, color: couleur, weight: 3, dashArray: '8 6', fillColor: couleur, fillOpacity: 0.07,
        }).addTo(map);
        L.tooltip({ permanent: true, direction: 'center', className: styles.etiquette })
          .setLatLng([centre.lat + c.rayonM / 111320, centre.lng])
          .setContent(`${c === cercles[0] && zone.rayonVilleKm ? `${ville} + ` : ''}${c.km} km · ${prix(c.fraisCents)}${dernier ? ' · au-delà : sur devis' : ''}`)
          .addTo(map);
        return cercle;
      });
      L.circleMarker([centre.lat, centre.lng], { radius: 6, color: '#fff', weight: 2, fillColor: '#0f1b2d', fillOpacity: 1 })
        .bindTooltip(ville, { direction: 'bottom', offset: [0, 6] }).addTo(map);
      map.fitBounds(traces[0]?.getBounds() ?? L.latLng(centre.lat, centre.lng).toBounds(20000), { padding: [12, 12] });
      carte.current = { map, cercles: traces, L };
    });
    return () => { annule = true; carte.current?.map.remove(); carte.current = undefined; };
    // La carte est créée une seule fois, à l'arrivée sur la section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const placerRepere = (pos: Position) => {
    const c = carte.current;
    if (!c) return;
    c.repere?.remove();
    c.repere = c.L.circleMarker([pos.lat, pos.lng], { radius: 8, color: '#fff', weight: 3, fillColor: COULEUR_VOUS, fillOpacity: 1 })
      .bindTooltip('Vous', { direction: 'top', offset: [0, -8] }).addTo(c.map);
    c.map.fitBounds(c.L.latLngBounds([[centre.lat, centre.lng], [pos.lat, pos.lng]]).pad(0.3), { maxZoom: 12 });
  };

  const km = (n: number) => `${String(Math.round(n)).replace('.', ',')} km`;

  return (
    <div ref={racine} className={styles.bloc}>
      <div className={styles.cadre} onTouchMove={(e) => { if (tactile && e.touches.length === 1) montrerIndice(); }}>
        <div ref={conteneurCarte} className={styles.carte} aria-label={`Carte de la zone d’intervention autour de ${ville} : ${cercles.map((c) => `${c.km} km ${prix(c.fraisCents)}`).join(', ')}, au-delà sur devis`} role="region" />
        {indice && <p className={styles.indice} aria-hidden="true">Utilisez deux doigts pour déplacer la carte</p>}
      </div>

      <div className={styles.calcul}>
        <h3>Combien coûte le déplacement chez vous ?</h3>
        {etat === 'demande' && <p className={styles.info}>Autorisez la localisation pour calculer automatiquement, ou indiquez votre adresse.</p>}
        {(etat === 'refusee' || etat === 'indisponible') && <p className={styles.info}>Localisation {etat === 'refusee' ? 'refusée' : 'indisponible'} : indiquez votre adresse.</p>}
        <AddressInput label="Votre adresse" placeholder="N°, rue, ville" search={rechercherAdresse} value={adresse}
          onSelect={(a: Adresse) => { setAdresse(a); void calculer(a); }} hint="Choisissez l’adresse dans la liste." />
        {etat !== 'ok' && etat !== 'demande' && (
          <button type="button" className={`btn btn--ghost ${styles.position}`} onClick={demanderPosition}>Utiliser ma position</button>
        )}
        {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
        {estimation && (
          <div className={styles.resultat} role="status">
            <span className={styles.resultatLibelle}>Déplacement</span>
            <strong className={`${styles.resultatPrix} ${!estimation.dansZone ? styles.horsZone : estimation.fraisCents === 0 ? styles.offert : ''}`}>
              {!estimation.dansZone ? 'Sur devis' : estimation.fraisCents === 0 ? 'Offert' : formatEuros(estimation.fraisCents)}
            </strong>
            <span className={styles.resultatDetail}>
              {estimation.dansZone
                ? (zone.rayonVilleKm
                  ? (estimation.distanceKm === 0 ? `Vous êtes à ${ville} : déplacement compris.` : `Vous êtes à environ ${km(estimation.distanceKm)} de route après la sortie de ${ville}.`)
                  : `Vous êtes à environ ${km(estimation.distanceKm)} de route de ${ville}.`)
                : `Vous êtes à environ ${km(estimation.distanceKm)} ${zone.rayonVilleKm ? `après la sortie de ${ville}` : `de ${ville}`}, au-delà de ${zone.maxDistanceKm} km : je viens sur devis.`}
            </span>
            {!estimation.dansZone && (
              <Link className={`btn ${styles.devis}`} to={adresse ? `/devis?adresse=${encodeURIComponent(adresse.label)}` : '/devis'}>Demander un devis</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
