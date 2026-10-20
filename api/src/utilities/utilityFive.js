import { Router } from 'express';
import { UTILITY_CATALOG } from '../config/catalog.js';

/**
 * Utility Five -- directory audit & compliance report. RESTRICTED: Utility5.Access.
 *
 * Reports on the application's own authorization configuration. This is a
 * deliberately "privileged-feeling" utility: the kind of thing only an
 * administrator role should see.
 */
const router = Router();

const SAMPLE_ASSIGNMENTS = [
  { group: 'SG-UtilityHub-Reconcilers', role: 'Utility3.Access', members: 14 },
  { group: 'SG-UtilityHub-Finance', role: 'Utility4.Access', members: 6 },
  { group: 'SG-UtilityHub-Admins', role: 'Utility5.Access', members: 3 },
  { group: 'SG-UtilityHub-Finance', role: 'Utility5.Access', members: 6 },
];

router.get('/report', (req, res) => {
  const roleToGroups = {};
  for (const a of SAMPLE_ASSIGNMENTS) {
    (roleToGroups[a.role] ??= []).push({ group: a.group, members: a.members });
  }

  const utilities = UTILITY_CATALOG.map((u) => ({
    id: u.id,
    name: u.name,
    open: u.requiredRoles.length === 0,
    requiredRoles: u.requiredRoles,
    grantedVia: u.requiredRoles.flatMap((r) => roleToGroups[r] ?? []),
  }));

  // Flag roles that gate a utility but have no group assigned -- i.e. a utility
  // nobody can reach. A genuinely useful audit finding.
  const orphanedRoles = UTILITY_CATALOG.flatMap((u) => u.requiredRoles).filter(
    (r) => !roleToGroups[r]
  );

  res.json({
    generatedAt: new Date().toISOString(),
    caller: {
      id: req.principal.id,
      name: req.principal.name,
      roles: req.principal.roles,
    },
    utilities,
    assignments: SAMPLE_ASSIGNMENTS,
    findings: {
      orphanedRoles: [...new Set(orphanedRoles)],
      openUtilities: utilities.filter((u) => u.open).map((u) => u.id),
      totalDistinctGroups: new Set(SAMPLE_ASSIGNMENTS.map((a) => a.group)).size,
    },
    ranBy: req.principal.name,
  });
});

export default router;
