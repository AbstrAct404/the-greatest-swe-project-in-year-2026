import { useEffect, useId, useRef, useState } from 'react'

function FilterDropdown({ label, options, value, onChange }) {
  const id = useId()
  const root = useRef(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const typed = useRef({ text: '', time: 0 })

  useEffect(() => {
    if (!open) return
    function outside(event) {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active, id])

  function toggle() {
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(!open)
  }

  function choose(index) {
    onChange(options[index].value)
    setOpen(false)
  }

  function keyDown(event) {
    if (event.key === 'Tab' || event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(active)
      else toggle()
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const current = open ? active : Math.max(0, options.findIndex((option) => option.value === value))
      setActive(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : Math.max(0, Math.min(options.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))))
      setOpen(true)
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now()
      const text = (now - typed.current.time < 700 ? typed.current.text : '') + event.key.toLowerCase()
      typed.current = { text, time: now }
      const index = options.findIndex((option) => option.label.toLowerCase().startsWith(text))
      if (index !== -1) {
        setActive(index)
        setOpen(true)
      }
    }
  }

  return (
    <div className="filter-dropdown" ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <span id={`${id}-label`} className="filter-dropdown-label">{label}</span>
      <button
        type="button"
        role="combobox"
        className="filter-dropdown-trigger"
        aria-labelledby={`${id}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={toggle}
        onKeyDown={keyDown}
      >
        <span>{options.find((option) => option.value === value)?.label ?? options[0].label}</span><span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <ul id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`} className="filter-options">
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={value === option.value}
              className={active === index ? 'active' : undefined}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >{option.label}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FilterDropdown
