import { PREVIEW } from '../data/content.js'
import './preview-bar.css'

/* Opened from the admin's Preview button: says this is the unpublished draft, or that the link
   has run out and the live page is showing instead. Visitors never get a preview link. */
export default function PreviewBar() {
  if (!PREVIEW) return null
  const live = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('preview')
    window.location.assign(url)
  }
  return (
    <div className={`preview-bar preview-bar--${PREVIEW}`} role="status">
      {PREVIEW === 'draft'
        ? <span><strong>Preview</strong> · unpublished changes. Visitors still see the live site.</span>
        : <span>This preview link has expired, so this is the live site. Open Preview again from the admin.</span>}
      <button type="button" onClick={live}>View live site</button>
    </div>
  )
}
