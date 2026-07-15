import moonIcon from '../assets/icons/Icon_theme_moon.svg'
import sunIcon from '../assets/icons/Icon_theme_sun.svg'
import './Selector_Tema.css'

type ThemeMode = 'dark' | 'light'

type SelectorTemaProps = {
  theme: ThemeMode
  onToggleTheme: () => void
}

function Selector_Tema({ theme, onToggleTheme }: SelectorTemaProps) {
  const isDark = theme === 'dark'
  const iconUrl = isDark ? moonIcon : sunIcon

  return (
    <button
      type="button"
      className={`selector-tema selector-tema--${theme}`}
      onClick={onToggleTheme}
      aria-label={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
      title={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
    >
      <span
        className="selector-tema__glyph"
        style={{
          maskImage: `url(${iconUrl})`,
          WebkitMaskImage: `url(${iconUrl})`,
        }}
        aria-hidden="true"
      />
    </button>
  )
}

export default Selector_Tema
