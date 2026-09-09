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

  useEffect(() => {
    let timeout

    if (!isDeleting) {
      if (displayedText.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayedText(text.slice(0, displayedText.length + 1))
        }, typingSpeed)
      } else if (loop) {
        timeout = setTimeout(() => {
          setIsDeleting(true)
        }, pauseDuration)
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(text.slice(0, displayedText.length - 1))
        }, deletingSpeed)
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(false)
        }, deletePauseDuration)
      }
    }

    return () => clearTimeout(timeout)
  }, [displayedText, isDeleting, text, typingSpeed, deletingSpeed, pauseDuration, deletePauseDuration, loop])

  return { displayedText, isDeleting }
}
