# Technical Blueprint Design System

## Design Principles

**Documentation as Technical Specifications**: The documentation interface treats content like architectural blueprints - precise, structured, and functional. Every element serves a purpose and communicates technical authority.

**Precision Over Decoration**: No decorative elements exist without function. Every border, spacing unit, and color choice serves the technical communication goal.

**Modern Developer Experience**: Bold, contemporary aesthetics that developers expect from modern tools like Linear, Vercel, and developer platforms, but with a distinctive technical blueprint identity.

## Color Palette

### Primary Colors
```css
--color-primary: #0066cc;        /* Blueprint blue - primary actions, links */
--color-secondary: #004080;      /* Deep blue - secondary states */
--color-accent: #ff6b00;         /* Technical orange - measurements, warnings */
```

### Technical Colors
```css
--color-technical: #2d3748;     /* Dark gray - technical labels */
--color-measure: #718096;        /* Medium gray - measurements, metadata */
```

### Surface Colors
```css
--color-background: #f8f9fa;     /* Technical white - main background */
--color-surface: #ffffff;        /* Pure white - cards, content areas */
--color-surface-alt: #e9ecef;    /* Light gray - headers, alternating backgrounds */
```

### Text Colors
```css
--color-foreground: #1a202c;     /* Near black - primary text */
--color-foreground-secondary: #4a5568;  /* Medium gray - secondary text */
```

### Border & Structural
```css
--color-border: #dee2e6;         /* Light gray - borders, dividers */
```

### Semantic Colors
```css
--color-success: #28a745;        /* Green - success states */
--color-warning: #ffc107;        /* Yellow - warnings */
--color-danger: #dc3545;         /* Red - errors, destructive actions */
```

## Typography System

### Font Families
```css
--font-heading: "Space Grotesk", sans-serif;  /* Bold, modern headings */
--font-body: "Inter", system-ui, sans-serif;  /* Clean, readable body text */
--font-mono: "JetBrains Mono", monospace;    /* Technical elements */
```

### Typography Scale
```css
/* Headings (Space Grotesk) */
h1: 2.5rem / 3rem (40-48px) - 700 weight
h2: 2rem / 2.5rem (32-40px) - 700 weight  
h3: 1.25rem / 1.5rem (20-24px) - 600 weight

/* Body (Inter) */
Body: 1rem / 1.5 (16px) - 400 weight
Small: 0.875rem / 1.4 (14px) - 400 weight
Tiny: 0.75rem / 1.3 (12px) - 400 weight

/* Technical (JetBrains Mono) */
Code: 0.875rem / 1.4 (14px) - 400 weight
Labels: 0.75rem / 1.3 (12px) - 400 weight
Measurements: 0.625rem / 1.2 (10px) - 400 weight
```

### Typography Usage
- **Headings**: Use Space Grotesk for all h1-h3, uppercase for technical headers
- **Body Text**: Inter for readable paragraphs, descriptions
- **Technical Elements**: JetBrains Mono for code, measurements, labels
- **Navigation**: Inter for UI elements, monospace for technical labels

## Spacing & Grid System

### Base Unit
```css
--grud-grid-size: 4px;  /* Base measurement unit */
```

### Spacing Scale
```css
--spacing-1: 4px    /* Minor adjustments */
--spacing-2: 8px    /* Tight spacing */
--spacing-3: 12px   /* Compact spacing */
--spacing-4: 16px   /* Standard spacing */
--spacing-6: 24px   /* Comfortable spacing */
--spacing-8: 32px   /* Generous spacing */
--spacing-12: 48px  /* Section spacing */
--spacing-16: 64px  /* Major sections */
```

### Layout Containers
```css
/* Main content max-width */
max-width: 1400px;  /* Documentation listing */
max-width: 900px;   /* Content reading */
```

## Border Radius & Structural Elements

### Technical Precision
```css
--radius-sm: 0px;   /* Sharp corners - default */
--radius-md: 0px;   /* Sharp corners - standard */
--radius-lg: 2px;   /* Minimal rounding - special cases */
```

### Border Weights
```css
--grud-measure-light: 1px;  /* Standard borders */
--grud-measure-medium: 2px; /* Structural dividers */
--grud-measure-heavy: 3px;  /* Major sections */
```

## Component Patterns

### Documentation Cards
- **Layout**: 4px grid, 400px minimum width
- **Borders**: 1px solid borders with 4px left accent strip
- **Shadows**: Subtle 1-2px shadows, hover state 2-4px
- **Header**: Technical gray background with version badge
- **Content**: Icon + title hierarchy, monospace metadata
- **Footer**: Technical measurements and bracket notation buttons

### Sidebar Navigation
- **Width**: 320px fixed
- **Header**: Technical labels "// CONTENTS" with monospace author info
- **Items**: Minimal borders, monospace text, 2px hover states
- **Active State**: Primary blue background with white text
- **Scrollbars**: 4px width, measure color with primary hover

### Page Content Areas
- **Max Width**: 900px for optimal reading
- **Borders**: Left border for content anchoring
- **Headers**: 2px bottom borders with 60-80px accent lines
- **Spacing**: Generous vertical rhythm (16px base unit)

### Technical Measurements
- **Version Badges**: Top-right corner, monospace, bordered
- **Metadata Icons**: Clock, user, document icons (3-4px)
- **Status Messages**: Code comment style, monospace
- **Navigation**: Bracket notation [VIEW_DOCS], [CLEAR_SEARCH]

## Interaction States

### Hover States
- **Cards**: Subtle lift (1px), shadow increase, border color change
- **Buttons**: Monospace text maintains during hover
- **Navigation Items**: Background color change, no decorative effects

### Active States
- **Primary Selection**: Blueprint blue background, white text
- **Borders**: 2px solid primary blue
- **Indicators**: Left accent strips or measurement lines

### Focus States
- **Outline**: 2px primary blue outline, 2px offset
- **Input Fields**: Border color change to primary blue

## Animation & Motion

### Timing Functions
```css
/* Fast, technical transitions */
0.2s ease - Standard interactions
0.3s cubic-bezier(0.4, 0, 0.2, 1) - Smooth transitions
```

### Animation Patterns
- **Fade In**: 8px vertical translation + opacity (0.3s)
- **Hover Effects**: 1px lift + shadow increase (0.2s)
- **Border Color**: Smooth transitions (0.2s ease)

### Motion Principles
- Minimal, purposeful animations only
- No decorative or playful motion
- Technical precision in all transitions
- Support reduced-motion preferences

## Icon System

### Icon Library
- **Primary**: Heroicons React (outline style)
- **Usage**: 16-20px for UI elements, 12px for metadata

### Icon Applications
- **Document Icons**: DocumentTextIcon (16px, measure color)
- **User Indicators**: UserIcon (12px, measure color)
- **Time References**: ClockIcon (12px, measure color)
- **Search**: MagnifyingGlassIcon (16px, measure color)
- **Navigation**: ChevronRightIcon, ChevronDownIcon (16px)

### Icon Guidelines
- Use outline style only (no filled icons)
- Consistent sizing within component types
- Measure color for metadata, primary for actions
- No emoji or decorative icons

## Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) {
  /* Single column layouts */
  /* Reduced spacing (8px base) */
  /* Full-width cards */
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Optimized reading widths */
  /* Adjusted grid columns */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Full grid layouts */
  /* Maximum content widths */
}
```

### Mobile Considerations
- Sidebar becomes full-width drawer (320px height)
- Documentation cards stack vertically
- Search bar uses full width
- Technical measurements scale appropriately

## Accessibility

### Color Contrast
- **Primary Text**: 4.5:1 minimum contrast ratio
- **Large Text**: 3:1 minimum contrast ratio  
- **Interactive Elements**: 3:1 minimum contrast ratio
- **Technical Labels**: Enhanced contrast for readability

### Focus Indicators
- 2px solid outline, primary blue color
- 2px offset from element
- Visible on all interactive elements

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for technical elements
- Logical heading hierarchy
- Descriptive link text

## Dark Mode

### Dark Color Palette
```css
--color-background: #0a0e27;     /* Deep blue-black */
--color-surface: #12183a;        /* Blue-gray surfaces */
--color-surface-alt: #1a1f3a;    /* Lighter blue-gray */
--color-foreground: #e2e8f0;     /* Light gray text */
--color-measure: #58a6ff;        /* Bright blue measurements */
--color-technical: #94a3b8;      /* Medium gray labels */
```

### Dark Mode Principles
- Maintain technical blueprint feel
- Blue-based dark theme (not pure black)
- Enhanced contrast for measurements
- Preserve monospace readability

## File Structure

### Design Files
- `frontend/src/styles/theme.css` - Core color system and CSS variables
- `frontend/src/index.css` - Typography, spacing, global styles
- `frontend/src/styles/publicDocsPage.module.css` - Documentation listing
- `frontend/src/styles/publicDocViewerPage.module.css` - Documentation viewer
- `frontend/src/components/DocSidebar.tsx` - Navigation sidebar

### Component Styles
- Use CSS modules for component-specific styles
- Leverage design tokens for consistency
- Maintain technical precision in all styles

## Implementation Guidelines

### New Components
1. Start with 4px grid measurements
2. Use sharp corners (0px radius) by default
3. Apply monospace for technical labels
4. Include proper borders (1-2px)
5. Use minimal shadows (1-2px)
6. Test both light and dark modes

### Color Usage
- Reserve primary blue for actions and active states
- Use measure color for metadata and technical labels
- Apply accent color sparingly for measurements/warnings
- Maintain high contrast for readability

### Typography Rules
- Space Grotesk for headings and display
- Inter for body text and UI elements
- JetBrains Mono for technical content
- Maintain proper hierarchy and sizing

---

**Design System Version**: 1.0.0  
**Last Updated**: 2024-08-25  
**Maintained By**: Development Team  
**Design Philosophy**: Technical precision, modern developer experience, blueprint aesthetics