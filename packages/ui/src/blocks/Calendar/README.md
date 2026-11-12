# Calendar

Calendrier mensuel réutilisable (semaine commençant le lundi).

```tsx
<Calendar month="2026-11" availableDays={['2026-11-17']} selected={day} onSelect={setDay} onMonthChange={setMonth} />
```
Les jours disponibles viennent de l'API (`GET /booking/days`). Thème via les variables `--bs-*`.

## Clavier
Un seul jour est atteignable par Tab (le jour choisi, sinon le premier disponible). Flèches gauche / droite : jour disponible précédent / suivant ; haut / bas : une semaine avant / après (jour disponible le plus proche) ; Début / Fin : premier / dernier jour disponible ; Entrée ou Espace : choisir.
