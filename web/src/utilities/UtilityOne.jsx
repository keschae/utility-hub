import { useEffect, useState } from 'react';
import { useApi, useUtility } from '../api/SessionProvider.jsx';
import { ErrorNotice, JsonBlock, UtilityHeader } from '../components/Common.jsx';

/**
 * Utility One — text transformation. Open to any authenticated user.
 */
export default function UtilityOne() {
  const api = useApi();
  const utility = useUtility('utility-one');

  const [transforms, setTransforms] = useState([]);
  const [transform, setTransform] = useState('upper');
  const [text, setText] = useState('Hello from the Utility Hub!');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Discover the available transforms from the API rather than hardcoding them,
  // so the server stays the source of truth for its own capabilities.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/utilities/utility-one/meta')
      .then((meta) => {
        if (cancelled) return;
        setTransforms(meta.transforms ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function run(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await api.post('/api/utilities/utility-one/transform', { text, transform }));
    } catch (err) {
      setError(err);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <UtilityHeader utility={utility} title="Utility One" />

      <form className="card" onSubmit={run}>
        <div className="field">
          <label htmlFor="u1-text">Input text</label>
          <textarea
            id="u1-text"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="row">
          <div>
            <label htmlFor="u1-transform">Transform</label>
            <select
              id="u1-transform"
              value={transform}
              onChange={(e) => setTransform(e.target.value)}
            >
              {(transforms.length ? transforms : [transform]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy}>
            {busy ? 'Running…' : 'Transform'}
          </button>
        </div>
      </form>

      <ErrorNotice error={error} />

      {result && (
        <div className="card">
          <h3>Result</h3>
          <div className="result-line">{result.result}</div>
          <div className="muted" style={{ marginTop: 10 }}>
            {result.stats.characters} characters · {result.stats.words} words ·{' '}
            {result.stats.lines} lines · ran by {result.ranBy}
          </div>
          <JsonBlock value={result} />
        </div>
      )}
    </>
  );
}
