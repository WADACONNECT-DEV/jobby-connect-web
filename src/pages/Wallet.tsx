import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatMoney, type Wallet } from '../types'

const LABELS: Record<string, string> = {
  EARNED_STANDARD: 'Standard points earned',
  EARNED_BONUS: 'Bonus points earned',
  REDEEMED: 'Points redeemed',
  ADJUSTED: 'Adjustment',
}

export default function WalletPage() {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Wallet>('/points/wallet', 'GET')
      .then(setWallet)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your wallet.'))
  }, [])

  return (
    <>
      <div className="page-head">
        <h2>Mate Points</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/home')}>← Home</button>
      </div>

      {error && <div className="msg err">{error}</div>}
      {wallet === null && !error && <div className="loading">Loading…</div>}

      {wallet && (
        <>
          <div className="wallet-hero">
            <div className="wallet-hero-label">Available balance</div>
            <div className="wallet-hero-balance">{formatMoney(wallet.balance)}</div>
            <div className="wallet-hero-note">Redeemable against future jobs at checkout.</div>
          </div>

          <h3 style={{ marginTop: 20 }}>History</h3>
          {wallet.history.length === 0 ? (
            <div className="empty"><p>No points activity yet. Complete and rate a job to start earning.</p></div>
          ) : (
            <div className="md-panel">
              {wallet.history.map((h, i) => (
                <div className="pay-row" key={i}>
                  <span>{LABELS[h.type] ?? h.type}<span className="pay-meta"> · {h.date}</span></span>
                  <span style={{ fontWeight: 600, color: h.amount < 0 ? '#c0392b' : 'var(--green)' }}>
                    {h.amount < 0 ? '' : '+'}{formatMoney(h.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
