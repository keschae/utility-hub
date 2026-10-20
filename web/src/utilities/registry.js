import UtilityOne from './UtilityOne.jsx';
import UtilityTwo from './UtilityTwo.jsx';
import UtilityThree from './UtilityThree.jsx';
import UtilityFour from './UtilityFour.jsx';
import UtilityFive from './UtilityFive.jsx';

/**
 * Maps catalog ids to their UI component and route path. This mirrors the API's
 * `IMPLEMENTATIONS` map in api/src/utilities/index.js.
 *
 * Note what is NOT here: required roles. Those live only on the server and
 * arrive via /api/me. Duplicating them in the client would create two sources
 * of truth that can drift, and would imply the client is making the access
 * decision. It is not.
 *
 * To add "Utility Six": add a catalog entry + router on the API, then add one
 * entry here and one component file.
 */
export const UTILITY_COMPONENTS = {
  'utility-one': { path: 'utility-one', Component: UtilityOne },
  'utility-two': { path: 'utility-two', Component: UtilityTwo },
  'utility-three': { path: 'utility-three', Component: UtilityThree },
  'utility-four': { path: 'utility-four', Component: UtilityFour },
  'utility-five': { path: 'utility-five', Component: UtilityFive },
};

/**
 * Role values known to the dev persona builder. These must match the "Value"
 * field of the app roles in Entra ID and the catalog on the API. Used only to
 * populate the dev-mode login checkboxes, never for access decisions.
 */
export const ALL_KNOWN_ROLES = ['Utility3.Access', 'Utility4.Access', 'Utility5.Access'];
