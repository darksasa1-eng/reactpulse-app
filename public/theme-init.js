/* ---------------------------------------------------------------------------
   Applied before first paint so the chosen theme never flashes.
   Kept as a separate file (not inline) so the Content-Security-Policy can stay
   strict: script-src 'self'.
   --------------------------------------------------------------------------- */
;(function () {
  try {
    var stored = localStorage.getItem('reactpulse.theme')
    var theme = stored === 'light' || stored === 'dark' ? stored : null
    if (!theme) {
      theme =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()
