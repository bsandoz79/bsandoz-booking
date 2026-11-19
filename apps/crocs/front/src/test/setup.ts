import '@testing-library/jest-dom/vitest';

// jsdom n'implémente pas le défilement de la fenêtre : on l'ignore dans les tests.
window.scrollTo = (() => undefined) as typeof window.scrollTo;
