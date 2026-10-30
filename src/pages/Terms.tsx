import { PreviewNotice, SimplePage } from '../components/AuthParts'

/* /terms — placeholder until Jobby-Connect supplies the wording.
   TODO(developer): replace with the owner's Terms of Use before release and
   remove the Preview notice. Do not write legal text here. */
export default function Terms() {
  return (
    <SimplePage wide>
      <PreviewNotice>The final wording hasn't been supplied yet.</PreviewNotice>
      <article className="au-doc">
        <span className="au-eyebrow">JOBBY-CONNECT</span>
        <h1 className="au-title">Terms of Use</h1>
        <p className="au-placeholder">[Terms of Use — to be supplied by Jobby-Connect]</p>
      </article>
    </SimplePage>
  )
}
