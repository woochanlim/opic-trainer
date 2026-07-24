// Web Speech API TTS - 문제 음성 읽기

// 영어 목소리를 비동기로 안전하게 가져옴 (voiceschanged 이벤트 대기)
function getEnglishVoice(): Promise<SpeechSynthesisVoice | undefined> {
  return new Promise((resolve) => {
    const pick = (voices: SpeechSynthesisVoice[]) =>
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft'))) ||
      voices.find((v) => v.lang.startsWith('en'))

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(pick(voices))
      return
    }
    // 아직 로드 안 됨 → 이벤트 대기
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(pick(window.speechSynthesis.getVoices()))
    }
    // 3초 타임아웃 (voiceschanged 안 오는 브라우저 대비)
    setTimeout(() => resolve(undefined), 3000)
  })
}

export async function speakText(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) return

  stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.88
  utterance.pitch = 1.0
  utterance.volume = 1.0

  const voice = await getEnglishVoice()
  if (voice) utterance.voice = voice

  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}
