# RonSuite OS Design System

## Metallic UI Aesthetic
The application uses a premium, physical-feeling "metallic" design language characterized by crisp colors, deep shadows, and glossy gradient overlays. 

### Core CSS Classes (`app/globals.css`)

#### `.metallic-blue`
Used for solid blue sidebars and headers.
- **Visuals**: Deep solid blue (`var(--accent)`) with white text and inner/outer box shadows.
- **Usage**: Primary structural panels.

#### `.btn-metallic`
Used for all primary buttons.
- **Visuals**: Shiny surface (`::before` gradient layer), prominent drop shadow, physically lifts (`translateY(-2px)`) on hover and presses down on click.
- **Requirements**: Must have an inline `backgroundColor` or background color class assigned. The metallic shine is applied as an overlay.
- **Usage**: Submit buttons, "New Item" actions.

#### `.metallic-overlay`
General utility for applying the glossy metallic texture over any colored block.
- **Visuals**: Adds a pseudo-element (`::after`) with a white-to-black diagonal sheen, plus a crisp 1px semi-transparent white border.
- **Requirements**: The element MUST have `position: relative`. Ensure any text inside is wrapped in an element with `position: relative; z-index: 2` (or the `.metallic-overlay > *` rule will catch it if it's a direct child element).
- **Usage**: Used internally by badges and cards.

#### `.metallic-badge`
Used for status pills, dots, and tag backgrounds.
- **Visuals**: Same as overlay but styled specifically for small, rounded, high-contrast badges.
- **Requirements**: Ensure text is wrapped in a `<span>` so it floats above the shine layer.

#### `.metallic-card`
Used for Dashboard cards, Agent Grid cards, and Project cards.
- **Visuals**: White card surface with a glowing blue top-border strip and soft glossy gradient across the face.
- **Usage**: Main content containers.

#### `.metallic-color-bar`
Used inside cards to display a project/entity color.
- **Visuals**: A horizontal strip that keeps its assigned color but gains a left-to-right sheen overlay.

### Typography & Colors
- **Muted text**: Do not use grey text against white backgrounds. Muted text is defined as `#000000` to maintain maximum contrast and readability. 
- **Icons**: Icons inside sidebars or buttons should use the `.icon-float` class for a sharp drop-shadow.

## Implementation Rules
1. Never use flat filled boxes for primary UI elements.
2. If adding a new colored element, apply `.metallic-overlay` or `.metallic-badge` so it matches the physical texture of the rest of the app.
3. Always wrap text inside metallic overlays in a `<span>` or `<div>` to ensure `z-index: 2` keeps the text visible above the gradient layer.
