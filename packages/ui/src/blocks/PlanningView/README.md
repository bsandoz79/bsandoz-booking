# PlanningView

Planning du professionnel : vues jour, semaine et mois, navigation précédent / suivant / aujourd'hui.

- **Jour** : liste des événements triés par heure.
- **Semaine** : un bloc par jour (empilés sur mobile, sept colonnes à partir de 768 px). Un clic sur le jour ouvre la vue jour.
- **Mois** : grille du lundi au dimanche ; jusqu'à `maxPerMonthCell` événements par case puis « +n ». Sur mobile, une pastille signale un jour occupé.

Les heures sont des chaînes locales `YYYY-MM-DDTHH:mm` : l'application convertit depuis l'UTC de l'API. `today` est fourni par l'application (testable). Un événement à cheval sur minuit apparaît sur les deux jours.

```tsx
<PlanningView
  mode={mode}
  date={jour}
  today={aujourdhui}
  events={[{ id: 'r1', start: '2026-11-12T09:00', end: '2026-11-12T12:00', title: 'Client', subtitle: 'Ville', tone: 'default' }]}
  labels={{
    day: 'Jour', week: 'Semaine', month: 'Mois',
    previous: 'Période précédente', next: 'Période suivante', today: "Aujourd'hui",
    empty: 'Rien de prévu',
    more: (n) => `+${n}`,
    dayWithCount: (jour, n) => `${jour}, ${n} rendez-vous`,
  }}
  onModeChange={setMode}
  onDateChange={setJour}
  onEventClick={ouvrir}
/>
```

`tone` : `default` (rendez-vous), `muted` (secondaire, ex. en attente de paiement), `blocked` (indisponibilité, hachuré).

## Emploi du temps (jour, semaine)
Toute la journée est affichée (`hourStart` → `hourEnd`, 7 h – 20 h par défaut, élargie si un événement en sort), même sans événement. Chaque événement est une case de couleur pleine (`color`, sinon la couleur par défaut) dont la hauteur suit la durée ; les événements qui se chevauchent sont placés côte à côte (`disposer`). `tone: 'muted'` : case rayée (ex. paiement en attente) ; `tone: 'blocked'` : gris hachuré (indisponibilité). `now` (« HH:mm ») trace l'heure courante dans la colonne d'aujourd'hui ; `showTime={false}` n'écrit pas les heures dans les cases (la grille les donne). Vue mois : grille, événements en pastilles colorées, « +n » au-delà de `maxPerMonthCell` (3).
