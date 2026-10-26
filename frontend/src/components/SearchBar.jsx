function SearchBar({ text, onTextChange, onSearch }) {
  function submit(event) {
    event.preventDefault()
    onSearch(text.trim())
  }

  function clear() {
    onTextChange('')
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
          onChange={(event) => onTextChange(event.target.value)}
        />
      </label>
      <button type="submit">Search</button>
      {text && <button type="button" onClick={clear}>Clear</button>}
    </form>
  )
}

export default SearchBar
