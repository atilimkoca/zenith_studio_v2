# Mobile-First Lesson Cards Component 📱

A complete redesign of the lesson management interface optimized for small screens and mobile devices.

## 🎯 Problem Solved

The original lesson cards had several issues on small screens:
- Poor readability on mobile devices
- Cramped layout with overlapping elements  
- Non-responsive design that didn't scale properly
- Lack of touch-friendly interactions
- No accessibility considerations

## ✨ Features

### Mobile-First Design
- **320px+ Support**: Works perfectly on the smallest mobile screens
- **Touch Optimized**: Large touch targets (minimum 44px)
- **Responsive Grid**: Adapts from 1 column to 4 columns based on screen size
- **Fluid Typography**: Text scales appropriately across all devices

### Accessibility
- **Screen Reader Support**: Complete ARIA labeling
- **Keyboard Navigation**: Full keyboard accessibility with focus states
- **High Contrast**: Supports high contrast mode preferences
- **Reduced Motion**: Respects user motion preferences

### Performance
- **Lightweight**: Minimal CSS with efficient animations
- **Hardware Accelerated**: Uses transform and opacity for smooth animations
- **Touch Responsive**: Optimized for touch devices with appropriate feedback

## 🚀 Quick Integration

### 1. Basic Usage

```jsx
import LessonCards from './components/Lessons/LessonCards';

function MyComponent() {
  const lessons = [
    {
      id: '1',
      title: 'Pilates Morning',
      subtitle: 'Beginner friendly class',
      icon: '🧘‍♀️',
      color: 'primary',
      time: '08:00 - 09:00',
      participants: 8,
      maxParticipants: 12
    }
  ];

  return (
    <LessonCards
      lessons={lessons}
      onCreateLesson={() => console.log('Create lesson')}
      onEditLesson={(lesson) => console.log('Edit', lesson)}
      onDeleteLesson={(lesson) => console.log('Delete', lesson)}
      onViewDetails={(lesson) => console.log('View', lesson)}
    />
  );
}
```

### 2. Replace in Existing Schedule Component

In `src/components/Schedule/Schedule.jsx`, replace the mobile view section:

```jsx
// Replace the existing mobile-schedule section (lines 330-441) with:
{isMobileView ? (
  <LessonCards
    lessons={formattedLessons}
    onCreateLesson={() => setShowCreateModal(true)}
    onEditLesson={handleEditLesson}
    onDeleteLesson={handleDeleteLesson}
    onViewDetails={handleShowLessonDetail}
  />
) : (
  // Keep existing desktop view
)}
```

## 🎨 Color Variants

- `primary`: Blue gradient (default)
- `secondary`: Pink gradient  
- `success`: Cyan gradient
- `warning`: Orange gradient (dark text)
- `info`: Light gradient (dark text)
- `create`: Special dashed border for create actions

## 📱 Responsive Breakpoints

| Screen Size | Columns | Gap | Padding |
|-------------|---------|-----|---------|
| 320px+      | 1       | 16px| 16px    |
| 576px+      | 2       | 20px| 20px    |
| 768px+      | 2       | 24px| 24px    |
| 992px+      | 3       | 24px| 24px    |
| 1200px+     | 4       | 24px| 24px    |

## 🔧 Props API

### LessonCards Props

| Prop | Type | Description |
|------|------|-------------|
| `lessons` | Array | Array of lesson objects |
| `onCreateLesson` | Function | Callback for create action |
| `onEditLesson` | Function | Callback for edit action |
| `onDeleteLesson` | Function | Callback for delete action |
| `onViewDetails` | Function | Callback for view details |

### Lesson Object Structure

```typescript
interface Lesson {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  type?: string;
  action?: string;
  time?: string;
  participants?: number;
  maxParticipants?: number;
}
```

## 🛠 Customization

### Custom Colors

Add new color variants in `LessonCards.css`:

```css
.lesson-card--custom {
  background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%);
}
```

### Custom Icons

Use any emoji or icon font:

```jsx
{
  id: '1',
  title: 'Custom Lesson',
  icon: '🎯', // Emoji
  // or icon: '<i class="fas fa-dumbbell"></i>' // Font Awesome
}
```

## 🧪 Testing

Use the demo component to test all features:

```jsx
import LessonCardsDemo from './components/Lessons/LessonCardsDemo';

// Add to your router or render directly
<LessonCardsDemo />
```

## 🌙 Dark Mode Support

The component automatically adapts to system dark mode preferences with enhanced shadows and contrast.

## ♿ Accessibility Features

- ARIA labels and roles
- Keyboard navigation (Tab, Enter, Space)
- Focus indicators
- Screen reader announcements
- High contrast mode support
- Reduced motion support

## 📦 File Structure

```
src/components/Lessons/
├── LessonCards.jsx      # Main component
├── LessonCards.css      # Mobile-first styles  
├── LessonCardsDemo.jsx  # Demo/test component
└── README.md            # This documentation
```

## 🚀 Performance Tips

1. **Minimize Re-renders**: Memoize callback functions
2. **Lazy Loading**: Load lesson data as needed
3. **Virtual Scrolling**: For large lists (100+ items)
4. **Image Optimization**: Optimize lesson thumbnails if used

## 🐛 Browser Support

- **Mobile**: iOS Safari 12+, Chrome Mobile 80+
- **Desktop**: Chrome 80+, Firefox 75+, Safari 13+
- **Legacy**: IE 11+ with polyfills

## 📱 Device Testing

Tested on:
- iPhone SE (375px width)
- iPhone 12/13 (390px width) 
- Samsung Galaxy S21 (360px width)
- iPad Mini (768px width)
- Various Android devices (320px+ width)

---

*Built with ❤️ for mobile-first experiences*