// Web Speech API TTS - 문제 음성 읽기

export function speakText(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) return

  stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  utterance.pitch = 1.0
  utterance.volume = 1.0

  // 영어 목소리 선택
  const voices = window.speechSynthesis.getVoices()
  const englishVoice = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft'))
  ) || voices.find((v) => v.lang.startsWith('en'))
  if (englishVoice) utterance.voice = englishVoice

  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking ?? false
}
