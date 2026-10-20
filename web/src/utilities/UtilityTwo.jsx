import { useEffect, useState } from 'react';
import { useApi, useUtility } from '../api/SessionProvider.jsx';
import { ErrorNotice, JsonBlock, UtilityHeader } from '../components/Common.jsx';

/**
 * Utility Two — unit & data-size conversion. Open to any authenticated user.
 */
export default function UtilityTwo() {
  const api = useApi();
  const utility = useUtility('utility-two');

  const [families, setFamilies] = useState({});
  const [family, setFamily] = useState('length');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('ft');
  const [value, setValue] = useState('100');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/utilities/utility-two/meta')
      .then((meta) => {
        if (cancelled) return;
        setFamilies(meta.families ?? {});
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const units = families[family] ?? [];

  // When the family changes the previously selected units may not exist in the
  // new family, which the API would reject. Snap to valid units instead.
  function changeFamily(nextFamily) {
    setFamily(nextFamily);
    const nextUnits = families[nextFamily] ?? [];
    if (nextUnits.length) {
      setFrom(nextUnits[0]);
      setTo(nextUnits[Math.min(1, nextUnits.length - 1)]);
    }
    setResult(null);
  }

  async function run(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(
        await api.post('/api/utilities/utility-two/convert', { value, from, to, family })
      );
    } catch (err) {
      setError(err);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <UtilityHeader utility={utility} title="Utility Two" />

      <form className="card" onSubmit={run}>
        <div className="field">
          <label htmlFor="u2-family">Family</label>
          <select
            id="u2-family"
            value={family}
            onChange={(e) => changeFamily(e.target.value)}
          >
            {Object.keys(families).length
              ? Object.keys(families).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))
              : <option value={family}>{family}</option>}
          </select>
        </div>

        <div className="row">
          <div>
            <label htmlFor="u2-value">Value</label>
            <input
              id="u2-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div>
            <label htmlFor="u2-from">From</label>
            <select id="u2-from" value={from} onChange={(e) => setFrom(e.target.value)}>
              {(units.length ? units : [from]).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="u2-to">To</label>
            <select id="u2-to" value={to} onChange={(e) => setTo(e.target.value)}>
              {(units.length ? units : [to]).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy}>
            {busy ? 'Converting…' : 'Convert'}
          </button>
        </div>
      </form>

      <ErrorNotice error={error} />

      {result && (
        <div className="card">
          <h3>Result</h3>
          <div className="result-line">{result.formatted}</div>
          <div className="muted" style={{ marginTop: 10 }}>ran by {result.ranBy}</div>
          <JsonBlock value={result} />
        </div>
      )}
    </>
  );
}
