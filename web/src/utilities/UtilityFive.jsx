import { useState } from 'react';
import { useApi, useUtility } from '../api/SessionProvider.jsx';
import {
  ErrorNotice,
  JsonBlock,
  RoleChips,
  UtilityHeader,
} from '../components/Common.jsx';

/**
 * Utility Five — directory audit & compliance report. RESTRICTED: Utility5.Access.
 *
 * Reports the application's own authorization configuration: which roles gate
 * which utilities, which groups grant those roles, and which roles are orphaned
 * (gating a utility nobody can reach).
 */
export default function UtilityFive() {
  const api = useApi();
  const utility = useUtility('utility-five');

  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setReport(await api.get('/api/utilities/utility-five/report'));
    } catch (err) {
      setError(err);
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <UtilityHeader utility={utility} title="Utility Five" />

      <div className="card">
        <button onClick={run} disabled={busy}>
          {busy ? 'Generating…' : 'Generate audit report'}
        </button>
      </div>

      <ErrorNotice error={error} />

      {report && (
        <>
          <div className="card">
            <h3>Caller</h3>
            <table>
              <tbody>
                <tr>
                  <td>Name</td>
                  <td>{report.caller.name}</td>
                </tr>
                <tr>
                  <td>Object ID</td>
                  <td className="mono">{report.caller.id}</td>
                </tr>
                <tr>
                  <td>Roles in token</td>
                  <td>
                    <RoleChips roles={report.caller.roles} />
                  </td>
                </tr>
                <tr>
                  <td>Generated at</td>
                  <td className="mono">{report.generatedAt}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Utility access matrix</h3>
            <table>
              <thead>
                <tr>
                  <th>Utility</th>
                  <th>Access</th>
                  <th>Required roles</th>
                  <th>Granted via groups</th>
                </tr>
              </thead>
              <tbody>
                {report.utilities.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>
                      {u.open ? (
                        <span className="badge open">Open</span>
                      ) : (
                        <span className="badge granted">Restricted</span>
                      )}
                    </td>
                    <td>
                      <RoleChips roles={u.requiredRoles} empty="—" />
                    </td>
                    <td>
                      {u.grantedVia.length ? (
                        <div className="chips">
                          {u.grantedVia.map((g) => (
                            <span className="chip" key={`${u.id}-${g.group}`}>
                              {g.group} ({g.members})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Findings</h3>
            {report.findings.orphanedRoles.length > 0 ? (
              <div className="alert warn">
                <strong>Orphaned roles.</strong> These roles gate a utility but
                have no group assigned, so no user can reach that utility:{' '}
                <RoleChips roles={report.findings.orphanedRoles} />
              </div>
            ) : (
              <div className="alert info">
                No orphaned roles — every restricted utility is reachable by at
                least one group.
              </div>
            )}
            <table>
              <tbody>
                <tr>
                  <td>Open utilities</td>
                  <td className="mono">{report.findings.openUtilities.join(', ') || '—'}</td>
                </tr>
                <tr>
                  <td>Distinct groups</td>
                  <td className="num">{report.findings.totalDistinctGroups}</td>
                </tr>
              </tbody>
            </table>
            <div className="muted" style={{ marginTop: 14 }}>ran by {report.ranBy}</div>
            <JsonBlock value={report} />
          </div>
        </>
      )}
    </>
  );
}
