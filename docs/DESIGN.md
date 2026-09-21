# Design system

> **v3 layer (2026-09-21).** `src/styles-v3.css` sits on top of the v2 tokens and
> powers the redesigned pages (`/boost`, `/block-channel`, `/status`, `/contact`)
> and the control room. Its vocabulary: `ph3` gradient page heroes with a masked
> grid, `pnl` glass panels with hairline borders and a lit top edge, `ic-chip`
> icon chips, `flow` steppers, `seg3` segmented tabs, `btn3`/`in3` controls,
> `kpi` cards with CPU/memory gauges, `ad-table` for data and `pair` for the
> pairing-code surface. The palette is unchanged - deep navy, black, white and a
> single blue accent - in both themes. (v2)

**Palette: deep navy, black, white.** One accent hue (blue) and nothing else -
no greens, oranges or purples anywhere in the interface.

| Token | Dark theme | Light theme |
|---|---|---|
| `--bg` | `#04070f` (near-black navy) | `#ffffff` |
| `--bg-2` / `--surface` | `#070c17` / `#0a1121` | `#f7f9fe` / `#ffffff` |
| `--surface-2` / `--surface-3` | `#0e1728` / `#131f35` | `#f5f8fe` / `#eaeff9` |
| `--line` / `--line-2` | `#1a2438` / `#24314c` | `#e2e8f4` / `#d3dcee` |
| `--text` / `--text-2` / `--text-3` | `#f6f9ff` / `#a7b4cb` / `#6d7b95` | `#071127` / `#4a5872` / `#78879f` |
| `--blue` / `--blue-2` / `--blue-3` | `#2f6bff` / `#5c8bff` / `#9dbbff` | `#1f4fd8` / `#2f6bff` / `#1b3f9e` |

Only feedback colours (warning / error) break the rule, and even those are
muted so the page never looks colourful.

## Layout tokens

* Container `1180px`, gutters `24px`, header height `68px`.
* Radii: `8 / 10 / 14 / 20 / 26px`. Card padding `26px` (18px on phones).
* Section rhythm: `82px` / `46px` (`--tight`), `62px` under 900px, `52px` under 620px.
* Elevation is two-layer and very soft; hover raises cards by 3px and lights the
  border with the accent.

## Type

* Headings: **Inter** 650-700, tight letter-spacing (`-0.022em` … `-0.033em`).
* Body: Inter 15.5px / 1.62, secondary text `--text-2`.
* Code, counters, IDs: **JetBrains Mono** with tabular numerals.
* Sinhala copy falls back to **Noto Sans Sinhala**.

## Components

`.card` `.card--hover` `.card--flat` · `.panel` · `.btn` (+ `--primary`,
`--ghost`, `--sm`, `--lg`, `--block`) · `.badge` `.tag` `.chip` · `.field`
`.input` `.switch` · `.kv-list` · `.metric` · `.table-wrap` · `.tabs` · `.toast`
· `.announce` · `.channel-card` · `.chart` · `.status-pill` · `.qr-frame`
· admin: `.admin-wrap` `.admin-topbar` `.admin-section` `.admin-cards` `.admin-grid`.

## Theme switching

`html[data-theme="dark|light"]` is set by `public/theme-init.js` **before first
paint** (no flash), remembered in `localStorage`. The React context
(`src/theme/ThemeContext.jsx`) updates `theme-color`, keeps `color-scheme` in
sync and exposes `useTheme()`.

## Accessibility

* Visible focus ring (`:focus-visible`, 2px accent, 2px offset) on every control.
* All interactive icons are buttons with `aria-label`; the theme toggle uses
  `aria-pressed`, the accordion uses `aria-expanded`.
* Minimum contrast: body text on canvas is 12.6:1 (dark) / 14.8:1 (light);
  secondary text stays above 4.6:1.
* `prefers-reduced-motion` disables every animation, including the hero float.
* Emoji appear only inside the reaction feature, never as interface icons.
