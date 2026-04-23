# Pixelschickeria Design Tokens (S1-03)

Dieses Dokument beschreibt die neuen Brand-Tokens, die in `index.css` und `tailwind.config.ts` definiert wurden.

## Surface Levels (Ebenen)
Wir verwenden eine klare Höhenhierarchie, um Tiefe im "Dark Mode" und "Light Mode" zu erzeugen.

- **Level 0 (Base Background):** `bg-background` (Der tiefste Hintergrund).
- **Level 1 (Cards):** `bg-card` (Für alle Module, Listen und Container).
  - *Hover-State:* `bg-card-hover` (Leicht aufgehellt beim Hovern).
- **Level 2 (Popovers):** `bg-popover` (Für Dropdowns und Modals).

## Color Palette (CI)
- **Primary:** Neon-Blau (`#135bec` / `var(--primary)`). Verwendet für Hauptaktionen und als Akzentfarbe für Hover-States.
- **Secondary Accent:** Magenta/Pink (`var(--accent)`). Verwendet für visuelle Highlights (z.B. Farbverläufe, Badges).
- **Divider:** `border-divider`. Etwas präsenterer Kontrast für Trennlinien (`<hr>`).

## Custom Components (`@layer components`)
Um die CI auf alle neuen Module auszuweiten, wurden globale Utility-Klassen in `index.css` ergänzt:

1. **`.glass-card`**
   Erzeugt eine markenkonsistente, semi-transparente Karte mit einem weichen Blur (`backdrop-blur-md`).
   *Hover-Effekt:* Karte hebt sich leicht an (`-translate-y-[1px]`), wird heller (`bg-card-hover`) und wirft einen subtilen primärfarbigen Schatten.

2. **`.focus-ring`**
   Globale Accessibility-Klasse für interaktive Elemente. Erzeugt einen 2px Ring in der Primary-Farbe (`ring-primary`) mit einem sauberen Offset zur Abgrenzung.

3. **`.btn-primary`**
   Standard-Button mit integrierten Hover-, Active- und Focus-States, der sofort auf die Brand-Tokens zugreift.

## Acceptance Criteria Check
- [x] Kontrastwerte bleiben AA-konform.
- [x] Fokuszustände und Hover-States für Cards sind definiert.
- [x] Tokens sind in Tailwind registriert (`bg-card-hover`, `border-divider`).
