import { useState, useEffect } from 'react'

export default function useTypewriter({
  text = '',
  typingSpeed = 75,
  deletingSpeed = 35,
  pauseDuration = 2400,
  deletePauseDuration = 600,
  loop = true,
} = {}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  // `text` may be a single string or a list of phrases cycled one at a time.
  const [phraseIndex, setPhraseIndex] = useState(0)

  const phrases = Array.isArray(text) ? text : [text]
  const current = phrases[phraseIndex % phrases.length] ?? ''

  useEffect(() => {
    let timeout

    if (!isDeleting) {
      if (displayedText.length < current.length) {
        timeout = setTimeout(() => {
          setDisplayedText(current.slice(0, displayedText.length + 1))
        }, typingSpeed)
      } else if (loop || phraseIndex < phrases.length - 1) {
        timeout = setTimeout(() => {
          setIsDeleting(true)
        }, pauseDuration)
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(current.slice(0, displayedText.length - 1))
        }, deletingSpeed)
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(false)
          setPhraseIndex((i) => (i + 1) % phrases.length)
        }, deletePauseDuration)
      }
    }

    return () => clearTimeout(timeout)
  }, [displayedText, isDeleting, current, phraseIndex, phrases.length, typingSpeed, deletingSpeed, pauseDuration, deletePauseDuration, loop])

  return { displayedText, isDeleting, phraseIndex }
}
