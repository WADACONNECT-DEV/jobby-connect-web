import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { CATEGORY_LABELS, formatDate, statusLabel, type Job, type Review } from '../types'

export default function MyWork() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [reviewByJob, setReviewByJob] = useState<Record<string, Review | null>>({})

  function load() {
    return api<Job[]>('/jobs/assigned', 'GET')
      .then((js) => {
        setJobs(js)
        js.filter((j) => j.status === 'COMPLETED').forEach((j) => {
          api<Review>(`/jobs/${j.id}/review`, 'GET')
            .then((rev) => setReviewByJob((prev) => ({ ...prev, [j.id]: rev })))
            .catch(() => setReviewByJob((prev) => ({ ...prev, [j.id]: null })))
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your work.'))
  }

  useEffect(() => { load() }, [])

  async function action(jobId: string, verb: 'start' | 'cancel') {
    setActionError(''); setBusyId(jobId)
    try {
      await api<Job>(`/jobs/${jobId}/${verb}`, 'POST')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not ${verb} the job.`)
    } finally { setBusyId(null) }
  }

  return (
    <>
      <div className="page-head">
        <h2>Your work</h2>
        <button className="btn btn-amber" onClick={() => navigate('/requests')}>See requests</button>
      </div>
      <p className="page-intro">Jobs you've won. Start the work; then mark completion and submit your review under “Your quotes” to get paid.</p>

      {error && <div className="msg err">{error}</div>}
      {actionError && <div className="msg err">{actionError}</div>}
      {jobs === null && !error && <div className="loading">Loading…</div>}

      {jobs !== null && jobs.length === 0 && (
        <div className="empty">
          <p>No assigned work yet. Win a quote and it'll show up here.</p>
          <button className="btn btn-amber" onClick={() => navigate('/requests')} style={{ marginTop: 12 }}>See requests to me</button>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="job-list">
          {jobs.map((job) => {
            const busy = busyId === job.id
            const review = reviewByJob[job.id]
            return (
              <div className="job-card" key={job.id}>
                <div className="job-top">
                  <span className="job-title">{job.title}</span>
                  <span className={`status status-${job.status.toLowerCase()}`}>{statusLabel(job.status)}</span>
                </div>
                <div className="job-meta">
                  <span className="chip">{CATEGORY_LABELS[job.category]}</span>
                  <span>{job.suburb}</span>
                  {job.timeFrame && <span>· {job.timeFrame}</span>}
                  <span className="job-date">· {formatDate(job.createdAt)}</span>
                </div>
                <p className="job-desc">{job.description}</p>
                <p className="job-assigned">Customer: <strong>{job.customerName}</strong></p>

                {job.status === 'COMPLETED' && review && (
                  <div className="review-done">
                    <span className="review-label">Customer rating:</span> <Stars value={review.rating} />
                    {review.comment && <p className="review-comment">"{review.comment}"</p>}
                  </div>
                )}

                <div className="job-foot">
                  <span className="job-by">
                    {job.status === 'ACCEPTED' && 'Ready to start'}
                    {job.status === 'IN_PROGRESS' && 'In progress — mark completion under “Your quotes”'}
                    {job.status === 'COMPLETED' && review === null && 'Completed 🎉 — awaiting review'}
                    {job.status === 'COMPLETED' && review && 'Completed 🎉'}
                    {job.status === 'CANCELLED' && 'Cancelled'}
                  </span>
                  <div className="job-actions">
                    {job.status === 'ACCEPTED' && (
                      <button className="btn btn-green btn-sm" disabled={busy} onClick={() => action(job.id, 'start')}>{busy ? 'Starting…' : 'Start work'}</button>
                    )}
                    {(job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS') && (
                      <button className="btn btn-ghost-dark btn-sm" disabled={busy} onClick={() => action(job.id, 'cancel')}>Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
