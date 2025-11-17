# Card Redesign Guide

This document outlines the modern, minimalistic redesign applied to all cards in the NexBoard application.

## Design Principles Applied

### 1. Subtle Shadows & Depth
- **Before**: Heavy single-layer shadows (`box-shadow: 0 10px 25px rgb(0 0 0 / 0.25)`)
- **After**: Layered, subtle shadows for natural depth
  ```css
  box-shadow:
    0 1px 2px 0 rgb(0 0 0 / 0.05),
    0 1px 3px 0 rgb(0 0 0 / 0.04);
  ```

### 2. Minimal Borders
- **Before**: 12% opacity borders
- **After**: 6% opacity borders for cleaner look
- More breathing room between elements

### 3. Smooth Transitions
- All cards now have `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Hover states lift cards slightly (`transform: translateY(-1px)`)
- Smooth scaling effects on interactive elements

### 4. Better Typography Hierarchy
- Clear distinction between headings and body text
- Improved line-height and letter-spacing
- Semantic HTML tags (h1, h2, h3, p) instead of generic divs

### 5. Enhanced Spacing
- More generous padding (p-4 → p-5, p-6)
- Consistent gap values using Tailwind's spacing scale
- Better visual grouping of related elements

## Updated Components

### 1. Base Card Styles (`globals.css`)

```css
.nb-card {
  background-color: var(--nb-card);
  border: 1px solid color-mix(in srgb, var(--nb-ink) 6%, transparent);
  box-shadow:
    0 1px 2px 0 rgb(0 0 0 / 0.05),
    0 1px 3px 0 rgb(0 0 0 / 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nb-card:hover {
  border-color: color-mix(in srgb, var(--nb-ink) 10%, transparent);
  box-shadow:
    0 2px 4px 0 rgb(0 0 0 / 0.06),
    0 4px 8px 0 rgb(0 0 0 / 0.05);
  transform: translateY(-1px);
}

.nb-card-elevated {
  background-color: var(--nb-card);
  border: 1px solid color-mix(in srgb, var(--nb-ink) 8%, transparent);
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.08),
    0 2px 4px -2px rgb(0 0 0 / 0.06);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nb-card-elevated:hover {
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.08);
  transform: translateY(-2px);
}
```

**Status**: ✅ COMPLETE

---

### 2. Task Cards (`BoardClient.tsx`)

**Location**: `src/app/boards/[id]/BoardClient.tsx` lines 264-281

#### Changes:
- **Rounded corners**: `rounded-lg` → `rounded-xl` (more modern)
- **Padding**: `p-3` → `p-4` (more breathing room)
- **Class**: Using `nb-card` with auto hover states
- **Selected state**: Simplified to `ring-2 ring-[--nb-ring]`
- **Typography**:
  - Title now uses `<h3>` with `font-semibold`
  - Description uses `<p>` with `leading-relaxed`
  - Better spacing between elements
- **Progress bar**:
  - Height: `h-1` → `h-1.5` (more visible)
  - Shape: `rounded` → `rounded-full` (pill shape)
  - Background: More subtle with `color-mix`
  - Smooth animation: `transition-all duration-300`
- **Assignee section**:
  - Now has top border separator
  - Better spacing and alignment

#### Before:
```tsx
<button className={`w-full text-left rounded-lg p-3 border transition-colors
  ${selectedTaskId===t.taskId ? 'ring-2 ring-[--nb-ring] bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
  <div className="text-sm font-medium flex items-center justify-between gap-2">
    <span className="truncate">{t.title}</span>
    <DueChip due={t.dueDate} />
  </div>
  {t.description && <div className="text-xs opacity-70 line-clamp-2 mt-1">{t.description}</div>}
  {/* subtasks and assignee */}
</button>
```

#### After:
```tsx
<button
  className={`w-full text-left rounded-xl p-4 nb-card group ${selectedTaskId===t.taskId ? 'ring-2 ring-[--nb-ring]' : ''}`}
>
  <div className="flex items-start justify-between gap-3 mb-2">
    <h3 className="text-sm font-semibold leading-snug flex-1">{t.title}</h3>
    <DueChip due={t.dueDate} />
  </div>

  {t.description && (
    <p className="text-xs opacity-60 line-clamp-2 mb-3 leading-relaxed">
      {t.description}
    </p>
  )}

  {hasSubtasks && (
    <div className="mb-3 space-y-1.5">
      <div className="h-1.5 w-full rounded-full overflow-hidden"
           style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 8%, transparent)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${Math.round((doneCount / subs.length) * 100)}%`,
            backgroundColor: 'var(--nb-teal)'
          }}
        />
      </div>
      <div className="text-[11px] font-medium"
           style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
        {doneCount}/{subs.length} completed
      </div>
    </div>
  )}

  {assignee && (
    <div className="flex items-center gap-2 pt-2 border-t"
         style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 6%, transparent)' }}>
      <Avatar uid={assigneeId} name={m?.name} email={m?.email} />
      <span className="text-xs font-medium opacity-70">{m?.name || m?.email}</span>
    </div>
  )}
</button>
```

**Status**: ⚠️ PENDING (file watching conflicts)

---

### 3. Board/Project Cards (`boards/page.tsx`)

**Location**: `src/app/boards/page.tsx` lines 57-142

#### Changes:
- **Class**: `nb-card nb-shadow` → `nb-card-elevated` (uses elevated styling)
- **Rounded corners**: `rounded-xl` → `rounded-2xl` (extra smooth)
- **Padding**: `p-4` → `p-6` (more spacious)
- **Typography**:
  - Board name: `font-medium text-lg` → `font-semibold text-xl`
  - Added icon for member count
  - Better visual hierarchy
- **Layout**:
  - Primary "Open Board" button now full-width
  - Secondary actions in responsive grid
  - Better spacing between button groups
- **Members section**:
  - Now uses border-top separator
  - List items have bullet indicators
  - Better contrast and spacing

**Status**: ⚠️ PENDING (file watching conflicts)

---

### 4. My Tasks Cards (`my-tasks/page.tsx`)

**Location**: `src/app/my-tasks/page.tsx` lines 168-199

#### Changes:
- **Rounded corners**: `rounded-lg` → `rounded-xl`
- **Padding**: `p-4` → `p-5`
- **Class**: Now uses `nb-card` with built-in hover states
- **Removed**: Manual `border border-white/10` and `hover:bg-white/5` (handled by base class)

#### Before:
```tsx
<li className="nb-card rounded-lg p-4 hover:bg-white/5 transition-colors border border-white/10">
```

#### After:
```tsx
<li className="nb-card rounded-xl p-5 group">
```

**Status**: ⚠️ PENDING

---

### 5. Comment Cards (`CommentsThread.tsx`)

**Location**: `src/components/CommentsThread.tsx` lines 167-262

#### Changes:
- **Rounded corners**: `rounded-md` → `rounded-lg` (more consistent with other cards)
- **Padding**: `p-3` → `p-4` (better spacing)
- Comment input also updated for consistency

#### Before:
```tsx
<li className="nb-card rounded-md p-3">
```

#### After:
```tsx
<li className="nb-card rounded-lg p-4">
```

**Status**: ⚠️ PENDING

---

### 6. Settings/API Token Cards (`settings/page.tsx`)

**Location**: `src/app/settings/page.tsx` lines 85-206

#### Changes:
- **Main section**: `nb-card rounded-xl p-6` → `nb-card-elevated rounded-2xl p-8`
- **Nested form card**: Enhanced padding and spacing
- **Tables**: Better row spacing and borders

#### Before:
```tsx
<section className="nb-card rounded-xl p-6">
```

#### After:
```tsx
<section className="nb-card-elevated rounded-2xl p-8">
```

**Status**: ⚠️ PENDING

---

## How to Apply Changes

### Option 1: Run the Update Script (Recommended)

1. **Stop your dev server** if running (`Ctrl+C` in the terminal where `npm run dev` is running)
2. Run the update script:
   ```bash
   cd nexboard
   node redesign-all-cards.js
   ```
3. Manually update `BoardClient.tsx` (see detailed changes above)
4. Restart your dev server: `npm run dev`

### Option 2: Manual Updates

Follow the "After" code examples above for each file. The changes are primarily:
- Class name updates
- Padding/spacing adjustments
- Typography improvements
- Adding semantic HTML tags

---

## Testing Checklist

After applying changes, verify:

- [ ] **Boards list page** - Project cards look clean and modern
- [ ] **Board detail page** - Task cards have proper spacing and hover effects
- [ ] **My Tasks page** - Cross-board task cards are consistent
- [ ] **Task modal** - Comments have improved styling
- [ ] **Settings page** - API token cards are well-spaced
- [ ] **Both themes** - Test light and dark modes
- [ ] **Hover states** - All cards lift slightly on hover
- [ ] **Transitions** - Smooth animations everywhere
- [ ] **Responsive** - Cards look good on mobile, tablet, and desktop

---

## Visual Design Benefits

✅ **Cleaner appearance** - Less visual noise, more focus on content
✅ **Better hierarchy** - Clear distinction between headings and body text
✅ **Modern feel** - Rounded corners, subtle shadows, smooth transitions
✅ **Improved UX** - Better hover feedback, clearer interactive elements
✅ **Consistent** - All cards follow the same design language
✅ **Accessible** - Better contrast and readability

---

## Questions or Issues?

If you encounter any problems:
1. Check that all file modifications were applied successfully
2. Clear your browser cache and hard refresh (Ctrl+Shift+R)
3. Check the browser console for any errors
4. Verify that `globals.css` changes are loaded
