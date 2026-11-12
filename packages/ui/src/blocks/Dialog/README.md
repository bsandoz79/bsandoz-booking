# Dialog

Fenêtre modale accessible (proposition avant paiement, confirmation…).

- `open`, `title`, `onClose` (Échap, clic sur le fond, bouton ✕ libellé `closeLabel`, « Fermer » par défaut).
- `description` : texte sous le titre (lié par `aria-describedby`) ; `children` : contenu ; `actions` : boutons du bas.
- Focus placé dans la fenêtre à l'ouverture, gardé dedans (Tab / Maj+Tab), rendu à l'élément d'origine à la fermeture ; défilement de la page bloqué.
- Sur téléphone (< 560 px), la fenêtre monte du bas de l'écran ; animations coupées si moins d'animations demandées.

```tsx
<Dialog open={ouvert} title="Un petit plus ?" onClose={() => setOuvert(false)}
  actions={<><Button variant="ghost" onClick={nonMerci}>Non merci</Button><Button onClick={valider}>Valider</Button></>}>
  …
</Dialog>
```
