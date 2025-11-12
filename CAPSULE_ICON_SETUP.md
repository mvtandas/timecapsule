# 🎯 Capsule Map Icon Setup Guide

## 📍 What Changed

The map markers for capsules have been updated to use a new custom icon image instead of the old View-based pill marker.

### ✅ Removed:
- ❌ Custom View-based pill marker (`capsulePill`, `capsulePillTop`, `capsulePillBottom`)
- ❌ White background container with shadows
- ❌ Border styling
- ❌ Multiple wrapper Views
- ❌ Complex opacity overlays

### ✅ Added:
- ✅ Simple `<Image>` component for marker icon
- ✅ Transparent PNG support (no background)
- ✅ Clean lock badge for distant capsules
- ✅ Optimized opacity for out-of-range markers
- ✅ No shadows or borders

---

## 📦 How to Add the Capsule Icon

### 1️⃣ Save the Icon Image

1. **Save the capsule icon image** (the gradient blue-to-pink pill image) to:
   ```
   /assets/icons/capsule-marker.png
   ```

2. **Image Requirements:**
   - ✅ Transparent PNG format
   - ✅ Recommended size: **120x120px** (or higher for @2x/@3x)
   - ✅ No background or border in the image file
   - ✅ Should be visible on both light and dark map themes
   - ✅ Centered artwork

### 2️⃣ Where to Place It

```
timecapsule/
├── assets/
│   └── icons/
│       ├── capsule-marker.png          ← Add your icon here
│       └── README.md                   ← Already created
├── src/
│   └── screens/
│       └── dashboard/
│           └── DashboardScreen.tsx     ← Already updated
```

### 3️⃣ Verify the Setup

After placing the icon:

1. **Restart the app** (close and reopen, or `npm start` / `expo start`)
2. **Navigate to the Dashboard** (Home screen with map)
3. **Check the map markers** - they should now display your custom capsule icon

---

## 🎨 Icon Behavior

### For Capsules Within Range (< 4km):
- ✅ Full opacity
- ✅ No lock badge
- ✅ Tappable to open details

### For Capsules Out of Range (> 4km):
- 🔒 Reduced opacity (40%)
- 🔒 Small lock badge in bottom-right corner
- 🔒 Tappable but shows distance warning

---

## 🔧 Customization

If you want to adjust the icon size or styling, edit these values in `DashboardScreen.tsx`:

```tsx
capsuleMarkerIcon: {
  width: 40,        // Change icon width
  height: 40,       // Change icon height
},
capsuleMarkerIconBlurred: {
  opacity: 0.4,     // Adjust out-of-range opacity
},
```

---

## 🚨 Troubleshooting

### Icon Not Showing?
1. ✅ Check the file path: `assets/icons/capsule-marker.png`
2. ✅ Ensure the image is a PNG (not JPEG or other format)
3. ✅ Restart the app (Metro bundler needs to detect new assets)
4. ✅ Check for console errors in Metro bundler

### Icon Too Small/Large?
- Adjust `width` and `height` in `capsuleMarkerIcon` style

### Icon Has Background?
- Ensure the PNG has a **transparent background** (alpha channel)
- Re-export the image with transparency enabled

---

## ✅ All Set!

Your capsule map markers will now use the new custom icon across:
- ✅ Initial map render
- ✅ Live updates (after user moves or data reloads)
- ✅ All capsule types (public, private, locked)

🚀 **Restart the app and enjoy your new map icons!**

