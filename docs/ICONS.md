# Icon reference

All icons live in `src/components/Icons.jsx` as inline SVG React components.
They inherit `currentColor`, so they always match the black & white theme.

```jsx
import { Bolt, Shield, WhatsApp } from './components/Icons.jsx'

<Bolt size={18} />
```

| Name | Use |
|---|---|
| `Pulse` | Brand mark / logo |
| `WhatsApp`, `Telegram`, `Github`, `Mail` | Social + contact links |
| `Bolt` | Boost action, "instant" feature |
| `Rocket`, `Sparkle`, `Spark` | Hype, presets, pro tips |
| `Smile` | Emoji picker label |
| `Infinity_` | "No daily limits" |
| `Shield`, `Lock` | Privacy, API key safety |
| `Terminal`, `Code`, `Server`, `Cpu`, `Layers` | Developer / stack sections |
| `Globe`, `Users`, `Store`, `Chart` | Audience and reach blocks |
| `Clock`, `Refresh`, `Activity` | Time, retry, status |
| `Check`, `CheckCircle`, `XCircle`, `Alert`, `Info` | Feedback states |
| `ChevronDown`, `ChevronRight`, `ArrowLeft`, `ArrowRight`, `Plus`, `Close`, `Menu` | Navigation |
| `Link`, `Copy`, `Trash`, `File`, `Download`, `Book`, `Scale`, `Send`, `Eye`, `Palette` | Utility actions |
| `Loader`, `Dots` | Progress |

To add an icon: copy an existing component, keep the `viewBox="0 0 24 24"`
convention, use `stroke="currentColor"`, and add it to the `ICONS` export map.
