import { Router } from 'express';
import { UTILITY_CATALOG, getUtility } from '../config/catalog.js';
import { requireRoles } from '../middleware/auth.js';

import utilityOne from './utilityOne.js';
import utilityTwo from './utilityTwo.js';
import utilityThree from './utilityThree.js';
import utilityFour from './utilityFour.js';
import utilityFive from './utilityFive.js';

const IMPLEMENTATIONS = {
  'utility-one': utilityOne,
  'utility-two': utilityTwo,
  'utility-three': utilityThree,
  'utility-four': utilityFour,
  'utility-five': utilityFive,
};

/**
 * Mount every utility by walking the catalog. Because the guard is derived from
 * the catalog entry, adding a new utility is a two-step change -- add a catalog
 * entry and a router -- and the authorization wiring cannot be forgotten.
 */
export function mountUtilities() {
  const router = Router();

  for (const entry of UTILITY_CATALOG) {
    const impl = IMPLEMENTATIONS[entry.id];
    if (!impl) {
      throw new Error(
        `Catalog declares '${entry.id}' but no router implementation was registered.`
      );
    }
    router.use(`/${entry.id}`, requireRoles(entry.requiredRoles), impl);
  }

  // Fail loudly if a router exists with no catalog entry -- that router would
  // otherwise be unreachable, or worse, mounted without a guard by hand later.
  for (const id of Object.keys(IMPLEMENTATIONS)) {
    if (!getUtility(id)) {
      throw new Error(`Router '${id}' has no catalog entry; refusing to start.`);
    }
  }

  return router;
}
