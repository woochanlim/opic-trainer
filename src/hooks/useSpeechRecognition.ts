import { useState, useRef } from 'react'

interface UseSpeechRecognitionOptions {
  onTranscript: (text: string) => void
  onError?: (msg: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySR = any

export function useSpeechRecognition({ onTranscript, onError }: UseSpeechRecognitionOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<AnySR>(null)

  const stop = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  const toggle = () => {
    if (isRecording) { stop(); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      onError?.('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.')
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false // interim 중복 방지: final 텍스트만 수집

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' '
        }
      }
      if (finalText) onTranscript(finalText)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setIsRecording(false)
      if (event.error === 'not-allowed') {
        onError?.('마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.')
      } else if (event.error === 'network') {
        onError?.('음성 인식 네트워크 오류가 발생했습니다.')
      }
    }

    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  return { isRecording, toggle, stop }
}
