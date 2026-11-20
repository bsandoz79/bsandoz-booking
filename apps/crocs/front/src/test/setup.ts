import '@testing-library/jest-dom/vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Matchers de jest-dom (toBeInTheDocument…) : l'import ci-dessus les branche sur l'expect qu'il importe ; on les branche
// aussi sur l'expect global des tests, qui n'est pas toujours le même objet (sinon « Invalid Chai property » par moments).
(globalThis as { expect?: { extend: (m: typeof matchers) => void } }).expect?.extend(matchers);

// jsdom n'implémente pas le défilement de la fenêtre : on l'ignore dans les tests.
window.scrollTo = (() => undefined) as typeof window.scrollTo;
