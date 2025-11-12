# 🎨 TimeCapsule Color Reference Card

Quick reference for developers. Keep this handy when styling components!

---

## 📱 Background Colors

```typescript
// Main app background
backgroundColor: '#0B0B0B'

// Cards, modals, sheets
backgroundColor: '#1A1A1A'

// Input fields, sections
backgroundColor: '#2A2A2A'
```

---

## 🌈 Gradient Colors (Primary Actions)

```typescript
// Pink - Main CTAs, primary buttons
'#ED62EF'

// Purple - Secondary actions, links
'#6A56FF'

// Cyan - Alternative primary, social features
'#00C9FF'

// Yellow - Highlights (use sparingly)
'#FFD500'
```

---

## 📝 Text Colors

```typescript
// Headlines, primary text
color: '#FFFFFF'

// Secondary text, descriptions
color: '#CCCCCC'

// Placeholders, hints
color: '#AAAAAA'

// Disabled, very subtle
color: '#666666'
```

---

## 🎯 Button Styles

### Primary Button
```typescript
{
  backgroundColor: '#ED62EF',
  borderRadius: 16,
  shadowColor: '#ED62EF',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 8,
}
// Text: #FFFFFF
```

### Secondary Button
```typescript
{
  backgroundColor: 'rgba(237, 98, 239, 0.15)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(237, 98, 239, 0.3)',
}
// Text: #ED62EF
```

---

## 📥 Input Fields

```typescript
{
  backgroundColor: '#2A2A2A',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#333333',
  color: '#FFFFFF',  // input text
  placeholderTextColor: '#AAAAAA',
}
// Icons: #AAAAAA
```

---

## 🔲 Cards/Modals

```typescript
{
  backgroundColor: '#1A1A1A',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#333333',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 10,
}
```

---

## 📊 Status Colors

```typescript
// Success
'#06D6A0'

// Error/Alert
'#FF6B6B'

// Warning
'#FFD166'

// Info
'#00C9FF'
```

---

## 🎭 Common UI Elements

### Divider/Border
```typescript
borderColor: '#333333'
```

### Loading Indicator
```typescript
<ActivityIndicator color="#ED62EF" />
```

### Icon Colors
```typescript
// Active
color: '#ED62EF'

// Inactive
color: '#666666'

// On dark cards
color: '#AAAAAA'
```

---

## 🎨 Gradient Combos (for LinearGradient)

### Primary Gradient
```typescript
colors={['#ED62EF', '#6A56FF', '#00C9FF']}
```

### Reverse Gradient
```typescript
colors={['#00C9FF', '#6A56FF', '#ED62EF']}
```

### Accent Gradient
```typescript
colors={['#FFD500', '#ED62EF']}
```

### Glow Effect
```typescript
colors={[
  'rgba(237, 98, 239, 0.3)',
  'rgba(106, 86, 255, 0.3)',
  'rgba(0, 201, 255, 0.3)'
]}
```

---

## 🔍 Quick Find & Replace

| Old Color | New Color | Usage |
|-----------|-----------|-------|
| `#FAC638` | `#ED62EF` | Primary buttons |
| `#f8f8f5` | `#0B0B0B` | Main background |
| `white` | `#1A1A1A` | Cards/modals |
| `#111827` | `#FFFFFF` | Headline text |
| `#6b7280` | `#CCCCCC` | Secondary text |
| `#9ca3af` | `#AAAAAA` | Placeholder text |
| `#e5e7eb` | `#333333` | Borders/dividers |

---

## ⚡ Pro Tips

1. **Always test contrast** - Use `#FFFFFF` for text on dark backgrounds
2. **Gradients for emphasis** - Use gradient colors sparingly for maximum impact
3. **Consistent spacing** - Maintain existing padding/margins
4. **Shadow depth** - Increase `shadowOpacity` and `shadowRadius` for better depth on dark theme
5. **Border = Definition** - Always add subtle borders (`#333333`) on dark backgrounds

---

## 🎯 Color Usage by Context

| Context | Background | Primary Text | Accent |
|---------|------------|--------------|--------|
| Auth Screens | `#0B0B0B` | `#FFFFFF` | `#ED62EF` |
| Dashboard | `#0B0B0B` | `#FFFFFF` | `#ED62EF` |
| Modals | `#1A1A1A` | `#FFFFFF` | `#6A56FF` |
| Forms | `#2A2A2A` | `#FFFFFF` | `#00C9FF` |
| Tabs | `#1A1A1A` | `#FFFFFF` | `#ED62EF` |

---

## 📦 Import Theme Helper

```typescript
import Colors from '../theme/colors';

// Then use:
backgroundColor: Colors.background.primary,
color: Colors.text.primary,
borderColor: Colors.ui.border,
```

---

## 🎨 Color Hierarchy

```
Strongest ──────────────────────────────> Weakest
#FFFFFF > #CCCCCC > #AAAAAA > #666666
(Headlines) (Body) (Hints) (Disabled)
```

---

## 🚀 Remember

**✅ Keep the layout unchanged**
**✅ Only update colors and gradients**
**✅ Test on both light and dark system themes**
**✅ Maintain accessibility (contrast ratios)**

---

*Last Updated: Color Palette Migration*
*Version: 2.0 - Gradient Dark Theme*

