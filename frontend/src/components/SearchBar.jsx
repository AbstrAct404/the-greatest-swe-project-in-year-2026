import { useState } from 'react'

function SearchBar({ onSearch }) {
  const [text, setText] = useState('')

  function submit(event) {
    event.preventDefault()
    onSearch(text.trim())
  }

  function clear() {
    setText('')
    onSearch('')
  }

  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <label>
        Search parks
        <input
          type="search"
          value={text}
          placeholder="e.g. Central"
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <button type="submit">Search</button>
      {text && <button type="button" onClick={clear}>Clear</button>}
    </form>
  )
}

export default SearchBar
