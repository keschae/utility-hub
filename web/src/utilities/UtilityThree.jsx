import { useState } from 'react';
import { useApi, useUtility } from '../api/SessionProvider.jsx';
import { ErrorNotice, JsonBlock, UtilityHeader } from '../components/Common.jsx';

/**
 * Utility Three — bulk record reconciliation. RESTRICTED: Utility3.Access.
 */
const SAMPLE_SOURCE = JSON.stringify(
  [
    { id: 'INV-1001', amount: 1250.0 },
    { id: 'INV-1002', amount: 890.5 },
    { id: 'INV-1003', amount: 430.25 },
    { id: 'INV-1004', amount: 2100.0 },
  ],
  null,
  2
);

const SAMPLE_TARGET = JSON.stringify(
  [
    { id: 'INV-1001', amount: 1250.0 },
    { id: 'INV-1002', amount: 890.55 },
    { id: 'INV-1004', amount: 2100.0 },
    { id: 'INV-1005', amount: 75.0 },
  ],
  null,
  2
);

export default function UtilityThree() {
  const api = useApi();
  const utility = useUtility('utility-three');

  const [source, setSource] = useState(SAMPLE_SOURCE);
  const [target, setTarget] = useState(SAMPLE_TARGET);
  const [keyField, setKeyField] = useState('id');
  const [compareField, setCompareField] = useState('amount');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    // Parse locally so malformed JSON is reported as a clear input problem
    // rather than a confusing 400 from the API.
    let parsedSource;
    let parsedTarget;
    try {
      parsedSource = JSON.parse(source);
      parsedTarget = JSON.parse(target);
    } catch (err) {
      setError(new Error(`Input is not valid JSON: ${err.message}`));
      setBusy(false);
      return;
    }

    try {
      setResult(
        await api.post('/api/utilities/utility-three/reconcile', {
          source: parsedSource,
          target: parsedTarget,
          keyField,
          compareField,
        })
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <UtilityHeader utility={utility} title="Utility Three" />

      <form className="card" onSubmit={run}>
        <div className="row">
          <div>
            <label htmlFor="u3-key">Key field</label>
            <input id="u3-key" value={keyField} onChange={(e) => setKeyField(e.target.value)} />
          </div>
          <div>
            <label htmlFor="u3-compare">Compare field</label>
            <input
              id="u3-compare"
              value={compareField}
              onChange={(e) => setCompareField(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy}>
            {busy ? 'Reconciling…' : 'Reconcile'}
          </button>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div style={{ minWidth: 260 }}>
            <label htmlFor="u3-source">Source records (JSON array)</label>
            <textarea
              id="u3-source"
              rows={12}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 260 }}>
            <label htmlFor="u3-target">Target records (JSON array)</label>
            <textarea
              id="u3-target"
              rows={12}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
        </div>
      </form>

      <ErrorNotice error={error} />

      {result && (
        <div className="card">
          <h3>Reconciliation summary</h3>
          <table>
            <tbody>
              {Object.entries(result.summary).map(([k, v]) => (
                <tr key={k}>
                  <td>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</td>
                  <td className="num">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {result.mismatched.length > 0 && (
            <>
              <h3 style={{ marginTop: 20 }}>Mismatched values</h3>
              <table>
                <thead>
                  <tr>
                    <th>{result.keyField}</th>
                    <th>source {result.compareField}</th>
                    <th>target {result.compareField}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.mismatched.map((m) => (
                    <tr key={m.key}>
                      <td className="mono">{m.key}</td>
                      <td className="num">{String(m.source)}</td>
                      <td className="num">{String(m.target)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {(result.missingInTarget.length > 0 || result.missingInSource.length > 0) && (
            <div className="row" style={{ marginTop: 18 }}>
              <div>
                <label>Missing in target</label>
                <div className="chips">
                  {result.missingInTarget.length ? (
                    result.missingInTarget.map((k) => (
                      <span className="chip" key={k}>
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="muted">none</span>
                  )}
                </div>
              </div>
              <div>
                <label>Missing in source</label>
                <div className="chips">
                  {result.missingInSource.length ? (
                    result.missingInSource.map((k) => (
                      <span className="chip" key={k}>
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="muted">none</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="muted" style={{ marginTop: 14 }}>ran by {result.ranBy}</div>
          <JsonBlock value={result} />
        </div>
      )}
    </>
  );
}
