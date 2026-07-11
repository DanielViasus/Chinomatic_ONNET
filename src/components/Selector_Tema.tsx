import './Selector_Tema.css'

type ThemeMode = 'dark' | 'light'

type SelectorTemaProps = {
  theme: ThemeMode
  onSelectTheme: (theme: ThemeMode) => void
  onToggleTheme: () => void
}

function SunMark() {
  return (
    <svg viewBox="0 0 70 70" aria-hidden="true">
      <rect x="56" y="33" width="11" height="4" rx="2" fill="currentColor" />
      <rect x="6" y="33" width="11" height="4" rx="2" fill="currentColor" />
      <rect
        x="51.7"
        y="47.4"
        width="11"
        height="4"
        rx="2"
        transform="rotate(45 51.7 47.4)"
        fill="currentColor"
      />
      <rect
        x="16.35"
        y="12.02"
        width="11"
        height="4"
        rx="2"
        transform="rotate(45 16.35 12.02)"
        fill="currentColor"
      />
      <rect
        x="34.5"
        y="15.5"
        width="11"
        height="4"
        rx="2"
        transform="rotate(-90 34.5 15.5)"
        fill="currentColor"
      />
      <rect
        x="34.5"
        y="65.5"
        width="11"
        height="4"
        rx="2"
        transform="rotate(-90 34.5 65.5)"
        fill="currentColor"
      />
      <rect
        x="48.87"
        y="19.8"
        width="11"
        height="4"
        rx="2"
        transform="rotate(-45 48.87 19.8)"
        fill="currentColor"
      />
      <rect
        x="13.52"
        y="55.15"
        width="11"
        height="4"
        rx="2"
        transform="rotate(-45 13.52 55.15)"
        fill="currentColor"
      />
      <rect x="21" y="20" width="30" height="30" rx="15" fill="currentColor" />
    </svg>
  )
}

function MoonMark() {
  return (
    <svg viewBox="0 0 70 70" aria-hidden="true">
      <path
        d="M37.801 14.2776C35.068 20.4075 34.911 27.3108 37.979 33.3323C43.426 44.0233 57.098 48.122 69.362 43.1263C66.779 53.9336 56.63 62.0003 44.5 62.0003C30.417 62.0003 19 51.1268 19 37.7141C19 26.5097 26.968 17.0796 37.801 14.2776Z"
        transform="translate(-3 -2)"
        fill="currentColor"
      />
      <rect x="49.7" y="11" width="2.6" height="10" rx="1.3" fill="currentColor" />
      <rect x="45.9" y="14.7" width="10" height="2.6" rx="1.3" fill="currentColor" />
      <rect x="60.2" y="24.9" width="2.6" height="10" rx="1.3" fill="currentColor" />
      <rect x="56.5" y="28.6" width="10" height="2.6" rx="1.3" fill="currentColor" />
    </svg>
  )
}

function Selector_Tema({
  theme,
  onSelectTheme,
  onToggleTheme,
}: SelectorTemaProps) {
  return (
    <div className="selector-tema" role="group" aria-label="Selector de tema">
      <button
        type="button"
        className={`selector-tema__icon ${
          theme === 'light' ? 'selector-tema__icon--active' : ''
        }`}
        onClick={() => onSelectTheme('light')}
        aria-label="Cambiar a tema claro"
        aria-pressed={theme === 'light'}
      >
        <SunMark />
      </button>

      <button
        type="button"
        className="selector-tema__track"
        onClick={onToggleTheme}
        aria-label={`Alternar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      >
        <span className="selector-tema__track-shell" aria-hidden="true">
          <span
            className={`selector-tema__knob ${
              theme === 'dark'
                ? 'selector-tema__knob--dark'
                : 'selector-tema__knob--light'
            }`}
          />
        </span>
      </button>

      <button
        type="button"
        className={`selector-tema__icon ${
          theme === 'dark' ? 'selector-tema__icon--active' : ''
        }`}
        onClick={() => onSelectTheme('dark')}
        aria-label="Cambiar a tema oscuro"
        aria-pressed={theme === 'dark'}
      >
        <MoonMark />
      </button>
    </div>
  )
}

export default Selector_Tema
