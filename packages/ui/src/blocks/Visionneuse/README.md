# Visionneuse

Photo agrandie en plein écran, sur fond sombre (galerie, photos d'un commerce…).

```tsx
const [ouverte, setOuverte] = useState<number | null>(null);
<Visionneuse photos={photos} index={ouverte} onChange={setOuverte} onClose={() => setOuverte(null)} />
```

- `photos` : `{ url, description }` (description = texte alternatif et légende), `index` : photo ouverte (null : fermée).
- Flèches fines (et touches ← →) pour passer d'une photo à l'autre, en boucle ; position « 2 / 5 » ; pas de flèches pour une seule photo.
- Fermeture : croix, Échap, clic sur le fond. Fenêtre modale (`role="dialog"`), focus gardé dedans puis rendu à l'élément d'origine, page bloquée derrière.
- `Fleche` : flèche fine en trait (`sens="gauche" | "droite"`), réutilisée par `Defilant`.
- Textes : `libelles` (fermer, precedente, suivante, position, titre).
