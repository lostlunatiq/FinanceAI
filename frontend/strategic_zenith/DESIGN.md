# Design System Specification: The Architectural Ledger

## 1. Overview & Creative North Star
This design system moves away from the "commodity SaaS" look of the last decade. It is built on the Creative North Star of **"The Architectural Ledger."** 

Just as a modern architectural marvel uses light, shadow, and material transitions rather than walls to define space, this system uses tonal depth and editorial typography to guide the user through complex financial data. We are replacing the rigid, boxed-in feeling of traditional finance software with an expansive, airy experience that feels both authoritative and effortless. 

We break the "template" look by utilizing intentional asymmetry, high-contrast typography scales, and a departure from standard structural lines. This is finance automation reimagined as a high-end editorial experience.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the "Quiet Glamour" aesthetic: professional teals and navies balanced by warm neutrals.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through:
- **Background Color Shifts:** Use `surface-container-low` (#f5f3f3) sections sitting on a `surface` (#fbf9f9) background.
- **Tonal Transitions:** Define zones by shifting from `surface-container` to `surface-container-high`.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials.
- **Base Layer:** `surface` (#fbf9f9)
- **Content Zones:** `surface-container-low` (#f5f3f3)
- **Interactive/Primary Cards:** `surface-container-lowest` (#ffffff)
- **Overlays/Modals:** `surface-bright` (#fbf9f9) with ambient shadows.

### The Glass & Gradient Rule
To achieve "Quiet Glamour," use **Glassmorphism** for floating elements (like the Command Palette or Tooltips). 
- **Recipe:** `surface_container_lowest` at 85% opacity + 24px Backdrop Blur.
- **Signature Texture:** Apply a subtle linear gradient to Primary CTAs, transitioning from `primary` (#00535b) to `primary_container` (#006d77) at a 135-degree angle. This adds a "soul" and depth that flat color cannot replicate.

---

## 3. Typography
We use a dual-font strategy to balance editorial prestige with high-density data legibility.

- **Display & Headlines (Manrope):** Chosen for its geometric precision and modern authority. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) to create a "Signature" feel in executive dashboards.
- **Body & Data (Inter):** The workhorse for tabular data and large numbers. Inter’s tall x-height ensures that even `label-sm` (0.6875rem) remains legible during complex dual-auth prompts or audit logs.

**Hierarchy Note:** Always lead with high contrast. A `headline-lg` should often be paired with a `label-md` in `on_surface_variant` to create an "Editorial Sprawl"—giving the data room to breathe.

---

## 4. Elevation & Depth
In this system, elevation is a property of light and material, not math.

- **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural lift. Shadows are a last resort.
- **Ambient Shadows:** When an element must float (e.g., a Command Palette), use a "Signature Ambient Shadow":
  - `box-shadow: 0 12px 40px rgba(0, 83, 91, 0.06);` (Note the tinting with the `primary` teal to mimic natural light).
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` (#bec8ca) at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components

### Buttons: The Weighted Interaction
- **Primary:** Gradient fill (`primary` to `primary_container`), `xl` (0.75rem) roundedness. No border.
- **Secondary:** `surface_container_high` background with `primary` text.
- **Tertiary:** Ghost style, using `primary` text with a `primary_fixed_dim` background shift on hover.

### Clean Cards
Cards must never have a border. Use `surface_container_lowest` and `xl` roundedness. Separate content within cards using vertical white space (32px/48px) rather than horizontal rules.

### Command Palette (Cmd+K)
The centerpiece of "Strategic Minimalism." 
- **Style:** Centered overlay, 640px width.
- **Material:** Glassmorphism (85% opacity `surface_container_lowest`) with a heavy backdrop blur.
- **Typography:** Use `title-md` for input text and `label-sm` for keyboard shortcuts.

### Sophisticated Data Viz
- **Palette:** Use `primary`, `secondary`, and `tertiary_fixed` for chart series.
- **Style:** Area charts should use a fade-to-transparent gradient from the line color. Axes should be invisible; use `label-sm` for minimalist tick marks.

### High-Security Patterns
- **Biometric/Dual-Auth:** Use a centered, focused layout. The background should dim to `inverse_surface` at 20% opacity. The "Success" state should utilize a soft pulse of `primary_fixed`, while "Alerts" use a subtle glow of `on_tertiary_container` (Electric Fuchsia).

---

## 6. Do’s and Don’ts

### Do:
- **Use White Space as a Border:** If two elements feel too close, increase the padding, do not add a line.
- **Embrace Asymmetry:** In large dashboards, allow the "Main Metric" to take up 65% of the width, leaving 35% for "Contextual Insights" to create a premium, non-grid feel.
- **Tint Your Neutrals:** Always use `on_surface_variant` (#3e494a) for secondary text to maintain the warmth of the "Quiet Glamour" palette.

### Don’t:
- **Don’t use 1px Borders:** This is the quickest way to make the system look "cheap" or "out-of-the-box."
- **Don’t use Pure Black Shadows:** Shadows must always be low-opacity and tinted with the Primary Teal or Navy.
- **Don’t Over-Crowd Tables:** If a table has more than 8 columns, implement a horizontal scroll with a `surface-container` fade rather than shrinking the text. High-fidelity finance requires clarity over density.