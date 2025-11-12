# 🎨 How to Save the Capsule Marker Icon

## 📥 Step-by-Step Instructions

### Method 1: Download from the Image You Shared

1. **Save the capsule icon image** (the gradient blue-to-pink pill you shared) as `capsule-marker.png`
2. **Move it to**: `/Users/analyticahouse/Documents/GitHub/timecapsule/assets/icons/capsule-marker.png`

### Method 2: Create a Temporary Test Icon

If you need to test immediately, you can download a placeholder:

1. Open **Preview** or **GIMP** or **Photoshop**
2. Create a new image: **120x120px** with **transparent background**
3. Draw a simple pill/capsule shape with a gradient (blue to pink)
4. **Export as PNG** with transparency enabled
5. Save as `capsule-marker.png`
6. Move to: `/Users/analyticahouse/Documents/GitHub/timecapsule/assets/icons/capsule-marker.png`

---

## 🔍 Current File Structure

```
timecapsule/
├── assets/
│   └── icons/
│       ├── capsule-marker.png          ← Save your icon HERE
│       └── README.md                   ← Already created
├── src/
│   └── screens/
│       └── dashboard/
│           └── DashboardScreen.tsx     ← ✅ Already updated
└── CAPSULE_ICON_SETUP.md              ← ✅ Full documentation
```

---

## ⚠️ Important Notes

### Image Requirements:
- ✅ **Format**: PNG with alpha channel (transparency)
- ✅ **Size**: At least 120x120px (or 240x240 for @2x)
- ✅ **Background**: Transparent (no white or colored background)
- ✅ **Content**: The capsule/pill icon should fill most of the canvas

### What NOT to do:
- ❌ Don't use JPEG (no transparency support)
- ❌ Don't include white/colored backgrounds
- ❌ Don't make it too small (< 80x80px)
- ❌ Don't add borders or shadows to the image itself

---

## 🚀 After Saving the Icon

1. **Restart the app**: Stop and restart the Metro bundler
   ```bash
   cd /Users/analyticahouse/Documents/GitHub/timecapsule
   npm start
   ```

2. **Clear cache** (if icon doesn't appear):
   ```bash
   npm start -- --reset-cache
   ```

3. **Navigate to Dashboard** and check the map markers

---

## ✅ What You'll See

### Before (Old markers):
- White circular background
- Custom-drawn pill with borders
- Drop shadows
- Separate top/bottom colors

### After (New markers):
- 🎯 Your custom capsule icon
- 🎯 No background or borders
- 🎯 Clean, transparent PNG
- 🎯 Small lock badge for distant capsules

---

## 🔧 If Icon Doesn't Appear

Run this to check if the file exists:

```bash
ls -la /Users/analyticahouse/Documents/GitHub/timecapsule/assets/icons/capsule-marker.png
```

If you see "No such file", the icon hasn't been saved yet.

---

## 📞 Need Help?

If the icon still doesn't work after saving:
1. Check file name is exactly `capsule-marker.png` (case-sensitive)
2. Restart Metro bundler completely
3. Try clearing cache: `npm start -- --reset-cache`
4. Check console for asset loading errors

🎉 **That's it! Save the icon and restart the app to see your new markers!**

