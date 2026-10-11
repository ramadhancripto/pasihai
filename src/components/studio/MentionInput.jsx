// ══════════════════════════════════════════════════════════════
// PASIHAI — MENTION INPUT
//
// Inashughulikia @mentions na autocomplete ya users.
// Inatumia identityRepository kutafuta users halisi.
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react'
import { identityRepository } from '../../data/repositories/index.js'

/**
 * @param {{
 *   value: string,
 *   onChange: (text: string) => void,
 *   placeholder?: string,
 *   maxLength?: number,
 *   rows?: number,
 *   className?: string,
 * }} props
 */
export default function MentionInput({ value, onChange, placeholder, maxLength, rows = 3, className = '' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [show, setShow] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      setShow(false)
      return
    }

    let active = true
    const timer = setTimeout(async () => {
      try {
        const users = await identityRepository.searchUsers?.(query) || []
        if (active) {
          setResults(users.slice(0, 5))
          setShow(users.length > 0)
          setCursor(0)
        }
      } catch {
        if (active) setResults([])
      }
    }, 250)

    return () => { active = false; clearTimeout(timer) }
  }, [query])

  const handleChange = useCallback((e) => {
    const text = e.target.value
    const pos = e.target.selectionStart

    onChange(text)

    // Detect @mention trigger
    const before = text.slice(0, pos)
    const atMatch = before.match(/@(\w{0,20})$/)
    if (atMatch) {
      setMentionStart(pos - atMatch[0].length)
      setQuery(atMatch[1])
    } else {
      setMentionStart(-1)
      setQuery('')
      setShow(false)
    }
  }, [onChange])

  const insertMention = useCallback((user) => {
    if (mentionStart < 0) return
    const text = value
    const before = text.slice(0, mentionStart)
    const after = text.slice(inputRef.current?.selectionStart || text.length)
    const mention = `@${user.handle || user.name?.replace(/\s/g, '')}`
    const newText = `${before}${mention} ${after}`
    onChange(newText)
    setShow(false)
    setMentionStart(-1)
    setQuery('')

    // Focus back and set cursor
    setTimeout(() => {
      const el = inputRef.current
      if (el) {
        el.focus()
        const pos = before.length + mention.length + 1
        el.setSelectionRange(pos, pos)
      }
    }, 0)
  }, [mentionStart, value, onChange])

  const handleKeyDown = useCallback((e) => {
    if (!show) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (results[cursor]) {
        e.preventDefault()
        insertMention(results[cursor])
      }
    } else if (e.key === 'Escape') {
      setShow(false)
    }
  }, [show, cursor, results, insertMention])

  return (
    <div className="psh-mention-input" style={{ position: 'relative' }}>
      <textarea
        ref={inputRef}
        className={className}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        autoComplete="off"
      />
      {show && results.length > 0 && (
        <ul
          ref={listRef}
          className="psh-mention-dropdown"
          role="listbox"
          aria-label="Mention suggestions"
        >
          {results.map((user, i) => (
            <li
              key={user.id || i}
              role="option"
              aria-selected={i === cursor}
              className={`psh-mention-item ${i === cursor ? 'is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(user)
              }}
              onMouseEnter={() => setCursor(i)}
            >
              <span className="psh-mention-avatar" aria-hidden="true">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" width={24} height={24} />
                  : <span className="psh-mention-avatar--fallback">{(user.name || '?')[0]}</span>
                }
              </span>
              <span className="psh-mention-info">
                <span className="psh-mention-name">{user.name}</span>
                <span className="psh-mention-handle">@{user.handle}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}