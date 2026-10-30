import { PreviewNotice, SimplePage } from '../components/AuthParts'

/* /privacy — placeholder until Jobby-Connect supplies the wording.
   TODO(developer): replace with the owner's Privacy Policy before release and
   remove the Preview notice. Do not write legal text here. */
export default function Privacy() {
  return (
    <SimplePage wide>
      <PreviewNotice>The final wording hasn't been supplied yet.</PreviewNotice>
      <article className="au-doc">
        <span className="au-eyebrow">JOBBY-CONNECT</span>
        <h1 className="au-title">Privacy Policy</h1>
        <p className="au-placeholder">[Privacy Policy — to be supplied by Jobby-Connect]</p>
      </article>
    </SimplePage>
  )
}
