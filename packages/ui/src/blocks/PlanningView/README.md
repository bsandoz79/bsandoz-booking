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
