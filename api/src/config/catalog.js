/**
 * The utility catalog: the single source of truth for what utilities exist
 * and what authorization each one requires.
 *
 * `requiredRoles: []`  -> any authenticated user may use it ("open" utility)
 * `requiredRoles: [a]` -> caller's `roles` claim must contain at least one match
 *
 * The role VALUES here must exactly match the "Value" field of the App Roles
 * you define on the API app registration in Entra ID. See docs/ENTRA_SETUP.md.
 */
export const UTILITY_CATALOG = [
  {
    id: 'utility-one',
    name: 'Utility One',
    description: 'Text transformation toolkit. Open to all authenticated users.',
    requiredRoles: [],
  },
  {
    id: 'utility-two',
    name: 'Utility Two',
    description: 'Unit & data-size converter. Open to all authenticated users.',
    requiredRoles: [],
  },
  {
    id: 'utility-three',
    name: 'Utility Three',
    description: 'Bulk record reconciliation. Restricted.',
    requiredRoles: ['Utility3.Access'],
  },
  {
    id: 'utility-four',
    name: 'Utility Four',
    description: 'Financial export generator. Restricted.',
    requiredRoles: ['Utility4.Access'],
  },
  {
    id: 'utility-five',
    name: 'Utility Five',
    description: 'Directory audit & compliance report. Restricted.',
    requiredRoles: ['Utility5.Access'],
  },
];

/** Every distinct role value the application knows about. */
export const ALL_ROLES = [
  ...new Set(UTILITY_CATALOG.flatMap((u) => u.requiredRoles)),
];

export function getUtility(id) {
  return UTILITY_CATALOG.find((u) => u.id === id);
}

/**
 * Decide whether a set of token roles grants access to a utility.
 * Open utilities (no requiredRoles) are allowed for any authenticated caller.
 */
export function canAccess(utility, roles = []) {
  if (!utility) return false;
  if (utility.requiredRoles.length === 0) return true;
  return utility.requiredRoles.some((r) => roles.includes(r));
}

/**
 * Project the catalog for a specific caller. The UI uses this to decide what
 * to render. NOTE: this is a convenience for UX only -- it is never the
 * security boundary. Each utility endpoint re-checks authorization itself.
 */
export function catalogForRoles(roles = []) {
  return UTILITY_CATALOG.map((u) => ({
    id: u.id,
    name: u.name,
    description: u.description,
    requiredRoles: u.requiredRoles,
    open: u.requiredRoles.length === 0,
    allowed: canAccess(u, roles),
  }));
}
