import { useState } from 'react';
import { crocs } from '../data/crocs';

/**
 * Logo de Croc's (lettres jaunes, fond transparent). Comme les photos, il est déposé sur le serveur (dossier photos/),
 * hors du dépôt public. Fichier absent : le nom s'écrit en texte, le site reste lisible.
 */
export function Logo({ className, decoratif = false }: { className?: string; decoratif?: boolean }) {
  const [absent, setAbsent] = useState(false);
  if (absent) return <span className={className}>{crocs.nom}</span>;
  return (
    <img
      className={className}
      src="/photos/logo-crocs.webp"
      alt={decoratif ? '' : crocs.nom}
      width="900"
      height="198"
      onError={() => setAbsent(true)}
    />
  );
}
