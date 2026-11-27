import { useRef, useState } from 'react'
import { Pause, Volume2 } from 'lucide-react'

// Spaces in the filename have to be escaped: the browser requests this path
// verbatim and an unescaped space is not a valid URL.
const VOICE_SRC = '/assets/Ambot365%20Founder%20Voice.mp3'

/**
 * A short voice note from the founder.
 *
 * The <audio> element carries no controls of its own — the button is the
 * whole interface — and preload="none" keeps 340KB off the wire until
 * someone actually asks to hear it. State is driven by the element's own
 * events rather than set on click, so it cannot drift out of step when
 * playback is refused or the track is stopped from outside the page.
 *
 * `label` turns the round icon button into a pill with visible text.
 */
export default function FounderVoice({ className = 'speaker__voice', label }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => setPlaying(false))
    else el.pause()
  }

  const Icon = playing ? Pause : Volume2

  return (
    <>
      <button
        type="button"
        className={`${className}${playing ? ' is-playing' : ''}`}
        onClick={toggle}
        aria-pressed={playing}
        aria-label={label ? undefined : playing ? 'Pause the founder’s voice note' : 'Play the founder’s voice note'}
      >
        <Icon strokeWidth={2} aria-hidden="true" />
        {label && <span>{playing ? 'Pause voice note' : label}</span>}
      </button>
      <audio
        ref={audioRef}
        src={VOICE_SRC}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </>
  )
}
