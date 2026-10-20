import { useState } from 'react';
import { useApi, useUtility } from '../api/SessionProvider.jsx';
import { ErrorNotice, JsonBlock, UtilityHeader } from '../components/Common.jsx';

/**
 * Utility Four — financial export generator. RESTRICTED: Utility4.Access.
 *
 * Also demonstrates an authenticated file download: because the endpoint needs
 * an Authorization header, a plain <a href> will not work. The API client
 * fetches the response as a blob and saves it client-side.
 */
export default function UtilityFour() {
  const api = useApi();
  const utility = useUtility('utility-four');

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(null);

  async function loadPreview() {
    setBusy(true);
    setError(null);
    try {
      setPreview(await api.get('/api/utilities/utility-four/preview'));
    } catch (err) {
      setError(err);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function download(format) {
    setDownloading(format);
    setError(null);
    try {
      await api.download(
        `/api/utilities/utility-four/export?format=${format}`,
        `ledger-export.${format}`
      );
    } catch (err) {
      setError(err);
    } finally {
      setDownloading(null);
    }
  }

  const currency = (n) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  return (
    <>
      <UtilityHeader utility={utility} title="Utility Four" />

      <div className="card">
        <div className="row">
          <button onClick={loadPreview} disabled={busy}>
            {busy ? 'Loading…' : 'Load ledger preview'}
          </button>
          <button
            className="secondary"
            onClick={() => download('csv')}
            disabled={downloading !== null}
          >
            {downloading === 'csv' ? 'Downloading…' : 'Download CSV'}
          </button>
          <button
            className="secondary"
            onClick={() => download('json')}
            disabled={downloading !== null}
          >
            {downloading === 'json' ? 'Downloading…' : 'Download JSON'}
          </button>
        </div>
      </div>

      <ErrorNotice error={error} />

      {preview && (
        <div className="card">
          <h3>Ledger</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Memo</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr key={`${r.date}-${i}`}>
                  <td className="mono">{r.date}</td>
                  <td className="mono">{r.account}</td>
                  <td>{r.memo}</td>
                  <td className="num">{currency(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: 22 }}>Subtotals by account</h3>
          <table>
            <tbody>
              {preview.subtotals.map((s) => (
                <tr key={s.account}>
                  <td className="mono">{s.account}</td>
                  <td className="num">{currency(s.total)}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Net</strong></td>
                <td className="num">
                  <strong>{currency(preview.net)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="muted" style={{ marginTop: 14 }}>ran by {preview.ranBy}</div>
          <JsonBlock value={preview} />
        </div>
      )}
    </>
  );
}
