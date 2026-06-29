import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './App.module.css'

const LANGUAGES = {
  fr: { name: 'French',     flag: '🇫🇷', label: 'FR', greeting: 'Bonjour',    speechCode: 'fr-FR' },
  es: { name: 'Spanish',    flag: '🇪🇸', label: 'ES', greeting: '¡Hola',      speechCode: 'es-ES' },
  de: { name: 'German',     flag: '🇩🇪', label: 'DE', greeting: 'Hallo',      speechCode: 'de-DE' },
  jp: { name: 'Japanese',   flag: '🇯🇵', label: 'JP', greeting: 'こんにちは', speechCode: 'ja-JP' },
  it: { name: 'Italian',    flag: '🇮🇹', label: 'IT', greeting: 'Ciao',       speechCode: 'it-IT' },
  pt: { name: 'Portuguese', flag: '🇵🇹', label: 'PT', greeting: 'Olá',        speechCode: 'pt-PT' },
}

const STARTERS = {
  fr: ['Introduce yourself', 'Order coffee at a café', 'Talk about the weather', 'Plan a trip to Paris'],
  es: ['Introduce yourself', 'Order tapas at a bar', 'Ask for directions', 'Talk about flamenco'],
  de: ['Introduce yourself', 'Order food at a Biergarten', 'Talk about travel', 'Discuss the seasons'],
  jp: ['Introduce yourself', 'Order ramen at a restaurant', 'Ask about train routes', 'Talk about anime'],
  it: ['Introduce yourself', 'Order gelato', 'Talk about art museums', 'Plan a trip to Rome'],
  pt: ['Introduce yourself', 'Order pasteis de nata', 'Talk about music', 'Plan a Lisbon trip'],
}

const DEFAULT_SETTINGS = { correct: true, translate: true, formal: false, tips: false }

function TypingDots() {
  return (
    <div className={styles.typingDots}>
      <span/><span/><span/>
    </div>
  )
}

function CorrectionBox({ text, type }) {
  const colors = type === 'tip'
    ? { bg: '#E1F5EE', border: '#5DCAA5', label: '#04342C', text: '#0F6E56' }
    : { bg: '#FAEEDA', border: '#FAC775', label: '#412402', text: '#633806' }
  return (
    <div style={{
      background: colors.bg, border: `0.5px solid ${colors.border}`,
      borderRadius: 8, padding: '7px 12px', fontSize: 12, color: colors.text,
      marginTop: 4, lineHeight: 1.5
    }}>
      <strong style={{ color: colors.label, fontWeight: 500 }}>
        {type === 'tip' ? '💡 Vocab tip: ' : '✏️ Gentle correction: '}
      </strong>
      {text}
    </div>
  )
}

function Message({ msg, langFlag }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`${styles.msgRow} ${isUser ? styles.userRow : ''}`}>
      <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.aiAvatar}`}>
        {isUser ? 'You' : langFlag}
      </div>
      <div className={`${styles.bubbleWrap} ${isUser ? styles.userBubbleWrap : ''}`}>
        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
          {msg.typing ? <TypingDots /> : msg.content}
        </div>
        {msg.translation && (
          <div className={styles.translationHint}>→ {msg.translation}</div>
        )}
        {msg.correction && <CorrectionBox text={msg.correction} type="correction" />}
        {msg.tip && <CorrectionBox text={msg.tip} type="tip" />}
      </div>
    </div>
  )
}

export default function App() {
  const [lang, setLangCode] = useState('fr')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [recording, setRecording] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [stats, setStats] = useState({ messages: 0, corrections: 0, streak: 1 })
  const chatRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  // Store only role+content for API history
  const apiHistory = useRef([])

  const langCfg = LANGUAGES[lang]

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const switchLang = (code) => {
    setLangCode(code)
    setMessages([])
    apiHistory.current = []
    setStats({ messages: 0, corrections: 0, streak: stats.streak })
  }

  const toggleSetting = (key) => setSettings(s => ({ ...s, [key]: !s[key] }))

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    setInput('')
    inputRef.current && (inputRef.current.style.height = 'auto')

    const userMsg = { role: 'user', content: msg }
    apiHistory.current = [...apiHistory.current, { role: 'user', content: msg }]

    setMessages(prev => [...prev, { ...userMsg, id: Date.now() }])
    setStats(s => ({ ...s, messages: s.messages + 1 }))
    setLoading(true)

    // Add typing indicator
    const typingId = Date.now() + 1
    setMessages(prev => [...prev, { id: typingId, role: 'assistant', content: '', typing: true }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, settings, messages: apiHistory.current })
      })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      apiHistory.current = [...apiHistory.current, { role: 'assistant', content: data.reply }]

      const aiMsg = {
        id: typingId,
        role: 'assistant',
        content: data.reply || '…',
        correction: settings.correct ? data.correction : '',
        translation: settings.translate ? data.translation : '',
        tip: settings.tips ? data.tip : '',
        typing: false,
      }

      setMessages(prev => prev.map(m => m.id === typingId ? aiMsg : m))
      if (data.correction) setStats(s => ({ ...s, corrections: s.corrections + 1 }))

    } catch (err) {
      setMessages(prev => prev.map(m => m.id === typingId
        ? { ...m, content: `Sorry, something went wrong: ${err.message}`, typing: false }
        : m
      ))
    }
    setLoading(false)
  }, [input, lang, loading, settings])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const autoResize = (el) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 110) + 'px'
  }

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setVoiceStatus('Voice input not supported in this browser.'); return }

    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false); setVoiceStatus(''); return
    }

    const r = new SR()
    r.lang = langCfg.speechCode
    r.interimResults = true
    r.continuous = false
    recognitionRef.current = r

    r.onstart = () => { setRecording(true); setVoiceStatus('🔴 Listening…') }
    r.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      setInput(t)
    }
    r.onend = () => {
      setRecording(false); setVoiceStatus('')
      setInput(prev => { if (prev.trim()) { sendMessage(prev); return '' } return prev })
    }
    r.onerror = (e) => { setRecording(false); setVoiceStatus('Mic error: ' + e.error) }
    r.start()
  }

  const showWelcome = messages.length === 0

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerAvatar}>🌍</div>
          <div>
            <div className={styles.headerTitle}>Language Companion</div>
            <div className={styles.headerSub}>
              {langCfg.flag} {langCfg.name} • AI tutor powered by Groq
            </div>
          </div>
        </div>
        <nav className={styles.langNav} aria-label="Language selector">
          {Object.entries(LANGUAGES).map(([code, cfg]) => (
            <button
              key={code}
              className={`${styles.langBtn} ${lang === code ? styles.langBtnActive : ''}`}
              onClick={() => switchLang(code)}
              title={cfg.name}
            >
              {cfg.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Chat */}
      <main className={styles.chat} ref={chatRef}>
        {showWelcome ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeEmoji}>{langCfg.flag}</div>
            <h2 className={styles.welcomeTitle}>{langCfg.greeting}! Your AI {langCfg.name} tutor is ready.</h2>
            <p className={styles.welcomeDesc}>
              Chat in {langCfg.name} — or start in English. I'll reply naturally and gently point out any mistakes.
            </p>
            <div className={styles.starterGrid}>
              {(STARTERS[lang] || STARTERS.fr).map(s => (
                <button key={s} className={styles.starterChip} onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <Message key={msg.id} msg={msg} langFlag={langCfg.flag} />
          ))
        )}
      </main>

      {/* Input area */}
      <footer className={styles.footer}>
        {/* Settings toolbar */}
        <div className={styles.toolbar}>
          {[
            { key: 'correct',   label: '✓ Grammar check' },
            { key: 'translate', label: '⇄ Translation' },
            { key: 'formal',    label: '🎩 Formal mode' },
            { key: 'tips',      label: '💡 Vocab tips' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.toolChip} ${settings[key] ? styles.toolChipActive : ''}`}
              onClick={() => toggleSetting(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className={styles.inputRow}>
          <button
            className={`${styles.iconBtn} ${recording ? styles.iconBtnRecording : ''}`}
            onClick={toggleMic}
            title={recording ? 'Stop recording' : 'Start voice input'}
            aria-label={recording ? 'Stop voice recording' : 'Start voice recording'}
          >
            🎙️
          </button>
          <textarea
            ref={inputRef}
            className={styles.textInput}
            rows={1}
            value={input}
            placeholder={`Type in ${langCfg.name}, or ask me to start a topic…`}
            onChange={e => { setInput(e.target.value); autoResize(e.target) }}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>

        {voiceStatus && (
          <div className={`${styles.voiceStatus} ${recording ? styles.voiceStatusRecording : ''}`}>
            {voiceStatus}
          </div>
        )}

        {/* Stats */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.messages}</span>
            <span className={styles.statLabel}>Messages</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.corrections}</span>
            <span className={styles.statLabel}>Corrections</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.streak}</span>
            <span className={styles.statLabel}>Day streak 🔥</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
