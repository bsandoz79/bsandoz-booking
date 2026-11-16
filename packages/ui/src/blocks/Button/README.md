# Button

Bouton du kit : `variant` « primary » (par défaut), « secondary » ou « ghost », `loading` (désactivé, `aria-busy`, texte annoncé `loadingLabel`), `fullWidth`. `type="button"` par défaut ; tous les attributs HTML d'un bouton sont acceptés.

```tsx
<Button onClick={reserver} loading={envoi} fullWidth>Réserver</Button>
```

## Réglages par thème
- `--bs-button-radius` : arrondi des coins (par défaut `--bs-radius-pill`, en pilule).
- `--bs-button-border` : épaisseur du contour (par défaut `2px`).

Exemple, des boutons aux coins peu arrondis : `:root { --bs-button-radius: 8px; --bs-button-border: 1px; }`.

