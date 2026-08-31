# PHASE 1: AVATAR COMPONENT BUILD GUIDE

**Status:** Starting from blank canvas  
**Focus:** Avatar orb only (Welcome screen, Welcome message, Account page variants)  
**Duration:** Weeks 1-2 of Phase 1  
**Deliverable:** Reusable Avatar component in multiple states

---

## 🎯 AVATAR COMPONENT OVERVIEW

The Avatar is **Phronesis** — a beautiful, animated orb that appears in different contexts:

### **1. Welcome Screen Avatar**
- Large (8rem × 8rem = 128px)
- Centered on screen
- Pulsing animation
- Glowing effect
- User attention: PRIMARY

### **2. Home/Account Page Avatar**
- Small (4rem × 4rem = 64px)
- Bottom-right corner
- Same pulsing animation (subtle)
- Glow effect (subtle)
- Interactive (hover tooltip)
- User attention: SECONDARY

### **3. Chat Responding Avatar**
- Small (4rem × 4rem)
- Corner position
- Typing indicator or thinking animation
- Glowing more brightly when responding

---

## 📦 FILE STRUCTURE

```
phronesis/frontend/
├── src/
│   ├── components/
│   │   ├── Avatar/
│   │   │   ├── Avatar.tsx (MAIN COMPONENT)
│   │   │   ├── Avatar.module.css (STYLING)
│   │   │   ├── avatarAnimations.ts (ANIMATION LOGIC)
│   │   │   └── AvatarDemo.tsx (FOR TESTING)
│   │   └── ...other components
│   ├── App.tsx
│   └── index.css
└── ...
```

---

## 🚀 STEP 1: PROJECT SETUP (Prerequisites)

### **What you need installed:**

```bash
# Node.js (v18+)
node --version

# npm (v9+)
npm --version

# Git
git --version
```

### **Frontend dependencies (already installed in Week 1):**

```bash
npm install react-dom framer-motion tailwindcss postcss autoprefixer
npm install -D typescript @types/react @types/react-dom
```

**Check if Tailwind is set up:**
```
phronesis/frontend/tailwind.config.js (should exist)
phronesis/frontend/postcss.config.js (should exist)
phronesis/frontend/src/index.css (should have @tailwind directives)
```

If not, run:
```bash
npx tailwindcss init -p
```

---

## 🎨 STEP 2: CREATE AVATAR COMPONENT (BLANK CANVAS)

### **Create the file:**

```bash
# From phronesis/frontend/
mkdir -p src/components/Avatar
touch src/components/Avatar/Avatar.tsx
touch src/components/Avatar/Avatar.module.css
touch src/components/Avatar/avatarAnimations.ts
```

### **File 1: Avatar.tsx (Main Component)**

Create `src/components/Avatar/Avatar.tsx`:

```typescript
// frontend/src/components/Avatar/Avatar.tsx

import React from 'react';
import { motion } from 'framer-motion';
import styles from './Avatar.module.css';

interface AvatarProps {
  size?: 'large' | 'small'; // large = welcome screen, small = other pages
  isLoading?: boolean;
  showTooltip?: boolean;
  tooltipMessage?: string;
}

/**
 * PHRONESIS AVATAR
 * Beautiful animated orb representing the AI assistant
 * 
 * Used in:
 * 1. Welcome screen (large, centered)
 * 2. Home/Account pages (small, corner)
 * 3. Chat responses (small, with thinking animation)
 */

export const Avatar: React.FC<AvatarProps> = ({
  size = 'large',
  isLoading = false,
  showTooltip = false,
  tooltipMessage = "Hey! 👋 How can I help?",
}) => {
  // SIZE CONFIGURATION
  const sizeConfig = {
    large: {
      container: 'w-32 h-32', // 128px (8rem)
      innerGlow: 'inset-2',
      highlight: 'inset-6',
    },
    small: {
      container: 'w-16 h-16', // 64px (4rem)
      innerGlow: 'inset-1',
      highlight: 'inset-4',
    },
  };

  const config = sizeConfig[size];

  // PULSING ANIMATION (continuous)
  const pulseAnimation = {
    scale: [1, 1.05, 1],
    opacity: [0.9, 1, 0.9],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };

  // THINKING ANIMATION (only when loading)
  const thinkingAnimation = {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };

  return (
    <motion.div
      className={`relative ${config.container} rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 shadow-2xl cursor-pointer hover:shadow-2xl transition-shadow ${styles.avatarContainer}`}
      animate={pulseAnimation}
      whileHover={size === 'small' ? { scale: 1.1 } : {}}
    >
      {/* INNER GLOW LAYER */}
      <motion.div
        className={`absolute ${config.innerGlow} rounded-full bg-gradient-to-br from-blue-300 to-purple-400`}
        animate={{
          opacity: isLoading ? [0.3, 0.8, 0.3] : [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: isLoading ? 1.5 : 3,
          repeat: Infinity,
        }}
      />

      {/* CENTER HIGHLIGHT (light reflection) */}
      <motion.div
        className={`absolute ${config.highlight} rounded-full bg-white opacity-20`}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />

      {/* THINKING INDICATOR (when Claude is responding) */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* TOOLTIP (hovers on small avatar) */}
      {showTooltip && size === 'small' && (
        <motion.div
          className={`absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap border border-purple-500 shadow-lg ${styles.tooltip}`}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
        >
          {tooltipMessage}
          {/* Tooltip arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default Avatar;
```

---

### **File 2: Avatar.module.css (Styling & Glow)**

Create `src/components/Avatar/Avatar.module.css`:

```css
/* frontend/src/components/Avatar/Avatar.module.css */

.avatarContainer {
  /* Gradient background */
  background: linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%);
  
  /* Glow effect */
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.4),
              0 0 60px rgba(96, 165, 250, 0.2),
              inset 0 0 20px rgba(255, 255, 255, 0.1);
  
  /* Smooth transitions */
  transition: box-shadow 0.3s ease;
}

.avatarContainer:hover {
  box-shadow: 0 0 40px rgba(168, 85, 247, 0.6),
              0 0 80px rgba(96, 165, 250, 0.3),
              inset 0 0 20px rgba(255, 255, 255, 0.15);
}

/* Tooltip styling */
.tooltip {
  pointer-events: none;
  font-size: 0.75rem;
  line-height: 1;
}

/* For larger screens, tooltip appears on hover */
@media (hover: hover) {
  .tooltip {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
}

/* Mobile: no shadow as aggressive */
@media (max-width: 640px) {
  .avatarContainer {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.3),
                0 0 40px rgba(96, 165, 250, 0.1),
                inset 0 0 15px rgba(255, 255, 255, 0.08);
  }
}
```

---

### **File 3: avatarAnimations.ts (Animation Utilities)**

Create `src/components/Avatar/avatarAnimations.ts`:

```typescript
// frontend/src/components/Avatar/avatarAnimations.ts

/**
 * Avatar animation configurations
 * Exported for reusability and testing
 */

export const avatarAnimations = {
  // Welcome screen: Large, attention-grabbing pulse
  welcomePulse: {
    scale: [1, 1.05, 1],
    opacity: [0.9, 1, 0.9],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },

  // Home page: Subtle, continuous pulse
  homePulse: {
    scale: [1, 1.02, 1],
    opacity: [0.95, 1, 0.95],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },

  // Inner glow: Breathing effect
  breathe: {
    opacity: [0.3, 0.6, 0.3],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },

  // Loading/Thinking: Faster pulse
  thinking: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },

  // Highlight: Shimmer effect
  shimmer: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },

  // Loading spinner: Rotating
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },

  // Hover: Scale up slightly
  hoverScale: {
    scale: 1.1,
    transition: {
      duration: 0.2,
    },
  },
};

// Color configurations
export const avatarColors = {
  gradient: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
  glowPrimary: 'rgba(168, 85, 247, 0.4)',
  glowSecondary: 'rgba(96, 165, 250, 0.2)',
};

// Size configurations
export const avatarSizes = {
  large: {
    width: '8rem', // 128px
    height: '8rem',
    innerGlowInset: '0.5rem',
    highlightInset: '1.5rem',
  },
  small: {
    width: '4rem', // 64px
    height: '4rem',
    innerGlowInset: '0.25rem',
    highlightInset: '1rem',
  },
};
```

---

## 🧪 STEP 3: CREATE AVATAR DEMO (FOR TESTING)

Create `src/components/Avatar/AvatarDemo.tsx`:

```typescript
// frontend/src/components/Avatar/AvatarDemo.tsx

import React, { useState } from 'react';
import Avatar from './Avatar';

/**
 * AVATAR DEMO PAGE
 * Use this to test the Avatar component in isolation
 * Run: npm run dev, then navigate to /avatar-demo
 */

export const AvatarDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
      <h1 className="text-white text-3xl font-bold mb-12 text-center">
        Avatar Component Demo
      </h1>

      {/* DEMO 1: Large Avatar (Welcome Screen) */}
      <div className="mb-20">
        <h2 className="text-white text-xl font-bold mb-8 text-center">
          1. Large Avatar (Welcome Screen)
        </h2>
        <div className="flex justify-center items-center min-h-96">
          <Avatar size="large" />
        </div>
        <p className="text-gray-400 text-center mt-4">
          128px × 128px, centered, pulsing
        </p>
      </div>

      {/* DEMO 2: Small Avatar (Home/Account) */}
      <div className="mb-20">
        <h2 className="text-white text-xl font-bold mb-8 text-center">
          2. Small Avatar (Home/Account Pages)
        </h2>
        <div className="flex justify-end items-end min-h-64 pr-8 pb-8">
          <div
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Avatar
              size="small"
              showTooltip={showTooltip}
              tooltipMessage="Hey! 👋 How can I help?"
            />
          </div>
        </div>
        <p className="text-gray-400 text-center">
          64px × 64px, bottom-right corner, hover to show tooltip
        </p>
      </div>

      {/* DEMO 3: Loading State */}
      <div className="mb-20">
        <h2 className="text-white text-xl font-bold mb-8 text-center">
          3. Loading/Thinking State
        </h2>
        <div className="flex justify-center items-center min-h-96">
          <Avatar size="large" isLoading={true} />
        </div>
        <button
          onClick={() => setIsLoading(!isLoading)}
          className="mx-auto block mt-6 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
        >
          {isLoading ? 'Stop Loading' : 'Start Loading'}
        </button>
        <p className="text-gray-400 text-center mt-4">
          Faster pulse with rotating border when Claude is thinking
        </p>
      </div>

      {/* DEMO 4: Size Comparison */}
      <div className="mb-20">
        <h2 className="text-white text-xl font-bold mb-8 text-center">
          4. Size Comparison
        </h2>
        <div className="flex justify-center items-end gap-16 min-h-48">
          <div className="text-center">
            <Avatar size="large" />
            <p className="text-gray-400 mt-4 text-sm">Large (128px)</p>
          </div>
          <div className="text-center">
            <Avatar size="small" />
            <p className="text-gray-400 mt-4 text-sm">Small (64px)</p>
          </div>
        </div>
      </div>

      {/* DEMO 5: Multiple Small Avatars */}
      <div className="mb-20">
        <h2 className="text-white text-xl font-bold mb-8 text-center">
          5. Multiple Avatars (Responsive Layout Test)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 place-items-center min-h-96">
          {[...Array(8)].map((_, i) => (
            <Avatar key={i} size="small" />
          ))}
        </div>
        <p className="text-gray-400 text-center mt-4">
          Responsive grid (should reflow on different screen sizes)
        </p>
      </div>

      {/* CONTROLS */}
      <div className="fixed bottom-8 left-8 bg-slate-800 border border-purple-500 rounded-lg p-6 max-w-sm">
        <h3 className="text-white font-bold mb-4">Demo Controls</h3>
        <button
          onClick={() => setIsLoading(!isLoading)}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-2"
        >
          Toggle Loading State
        </button>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded"
        >
          Toggle Tooltip
        </button>
        <p className="text-gray-300 text-xs mt-4">
          Test animations in isolation before integrating into Welcome screen
        </p>
      </div>
    </div>
  );
};

export default AvatarDemo;
```

---

## 📱 STEP 4: ADD DEMO ROUTE (Testing)

Update `src/App.tsx` to include the demo route:

```typescript
// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AvatarDemo from './components/Avatar/AvatarDemo';

function App() {
  return (
    <Router>
      <Routes>
        {/* Demo routes (remove before final deployment) */}
        <Route path="/avatar-demo" element={<AvatarDemo />} />

        {/* Main app routes (added later) */}
        <Route path="/" element={<div>Coming soon...</div>} />
      </Routes>
    </Router>
  );
}

export default App;
```

---

## 🏃 STEP 5: TEST LOCALLY

### **Run the development server:**

```bash
# From phronesis/frontend/
npm run dev
```

Output should show:
```
Local:   http://localhost:5173/
```

### **Test the Avatar:**

1. Open browser: `http://localhost:5173/avatar-demo`
2. You should see 5 demo sections
3. Test each variant:
   - Large avatar pulsing
   - Small avatar in corner
   - Loading/thinking animation
   - Size comparison
   - Responsive grid

### **What to look for:**

✅ Orb is smooth and round  
✅ Gradient colors (blue → purple → pink)  
✅ Pulsing animation (not too fast, not too slow)  
✅ Glow effect is visible  
✅ Inner highlight shimmers  
✅ On mobile, still looks good (not too large)  
✅ Hover effect works (scale up)  
✅ Tooltip appears on hover  
✅ Loading spinner rotates  

---

## 🎨 STEP 6: FINE-TUNE ANIMATIONS

### **If pulse is too slow:**
```typescript
// In Avatar.tsx, change duration
duration: 1.5, // was 2.5 (faster)
```

### **If glow is too bright:**
```typescript
// In Avatar.module.css
box-shadow: 0 0 20px rgba(168, 85, 247, 0.2), // was 0.4 (dimmer)
```

### **If inner glow doesn't breathe enough:**
```typescript
// In avatarAnimations.ts
opacity: [0.2, 0.7, 0.2], // was [0.3, 0.6, 0.3] (more dramatic)
```

---

## 📐 STEP 7: TEST RESPONSIVE DESIGN

### **Mobile Testing:**

```bash
# Open DevTools (F12)
# Click device toolbar (Ctrl+Shift+M)
# Test these screen sizes:
- iPhone SE (375px)
- iPhone 12 (390px)
- Pixel 5 (393px)
```

**Checklist:**
- [ ] Avatar still visible at 375px width
- [ ] Glow doesn't overflow screen
- [ ] Animations smooth (no jank)
- [ ] Touch interactions work

### **Tablet Testing:**

```bash
# Resize to:
- iPad (768px)
- iPad Pro (1024px)
```

**Checklist:**
- [ ] Avatar properly centered
- [ ] Tooltip readable
- [ ] Spacing looks balanced

### **Desktop Testing:**

```bash
# Full screen, then resize to:
- 1920x1080
- 2560x1440
```

**Checklist:**
- [ ] Avatar not too small
- [ ] Avatar not too large
- [ ] Glow centered properly

---

## 🐛 TROUBLESHOOTING

### **Problem: Avatar looks blocky/pixelated**
- Solution: Ensure Tailwind CSS is installed
- Check: `npm list tailwindcss`
- Fix: `npm install tailwindcss`

### **Problem: Gradient doesn't show**
- Solution: Make sure `bg-gradient-to-br` is in Tailwind config
- Check: `tailwind.config.js` has correct content paths
- Fix: Run `npm run dev` and clear browser cache

### **Problem: Animation is stuttering**
- Solution: Check if other heavy computations are running
- Fix: Reduce animation complexity or use `will-change: transform`
- Performance: Test with DevTools Performance tab

### **Problem: Tooltip doesn't appear**
- Solution: Check `showTooltip` prop is true
- Fix: Ensure parent div is handling hover state
- Test: Use demo page controls to toggle

### **Problem: Colors look different on mobile**
- Solution: This is normal (different screen calibrations)
- Fix: Adjust CSS media queries if needed
- Test: Use real device, not just DevTools

---

## ✅ ACCEPTANCE CRITERIA

Your Avatar component is **DONE** when:

- ✅ Avatar renders as smooth orb (no jagged edges)
- ✅ Gradient is blue → purple → pink
- ✅ Glow effect is visible (not too bright, not too dim)
- ✅ Pulsing animation is smooth (2-2.5 sec duration)
- ✅ Inner glow breathes independently
- ✅ Center highlight shimmers
- ✅ Large size (128px) looks great on desktop
- ✅ Small size (64px) fits in corner
- ✅ Loading animation (spinner) works smoothly
- ✅ Tooltip appears on hover (small avatar)
- ✅ Mobile responsive (375px - 2560px)
- ✅ No console errors
- ✅ Framer Motion animations are smooth (60fps)
- ✅ Component is exported and reusable

---

## 📝 CODE COMMENTS & DOCUMENTATION

The code above includes comprehensive comments. Key sections:

```typescript
/**
 * PHRONESIS AVATAR
 * Beautiful animated orb representing the AI assistant
 */

// SIZE CONFIGURATION
// PULSING ANIMATION
// THINKING ANIMATION
```

This makes it easy for other developers to understand the component.

---

## 🚀 NEXT STEPS (After Avatar is Done)

Once the Avatar component is complete and tested:

1. ✅ Avatar.tsx (DONE)
2. ✅ Avatar styling (DONE)
3. ✅ Avatar animations (DONE)
4. → **Next: Build Welcome Screen around Avatar**
   - Add welcome message animation
   - Add journey question ("Do you own a car?")
   - Add personalized greeting

---

## 📊 TIMELINE

- **Day 1:** Create Avatar.tsx + Avatar.module.css
- **Day 2:** Create AvatarDemo.tsx + Test locally
- **Day 3:** Fine-tune animations + Test responsive
- **Day 4:** Troubleshoot + Polish
- **Day 5:** Code review + Commit to GitHub

**Total: ~1 week (Weeks 1-2 of Phase 1)**

---

## 🎓 LEARNING RESOURCES

If you're new to Framer Motion or Tailwind CSS:

- **Framer Motion Docs:** https://www.framer.com/motion/guide/
- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **CSS Gradients:** https://developer.mozilla.org/en-US/docs/Web/CSS/gradient
- **Box Shadow Generator:** https://www.cssmatic.com/box-shadow

---

## 💡 PRO TIPS

1. **Use DevTools to fine-tune:**
   - DevTools → Elements → Inspect styles live
   - Change duration/opacity in browser, see immediately

2. **Performance check:**
   - DevTools → Performance → Record
   - Animation should be 60fps (green)

3. **Color picker:**
   - If tweaking colors, use DevTools color picker
   - Convert to Tailwind class or CSS variable

4. **Version control:**
   - Commit after each step: `git add . && git commit -m "feat: add Avatar component"`

---

**Status:** Ready to build! 🚀  
**Start date:** [Your date]  
**Completion target:** [Your date + 1 week]

Next: Come back when Avatar is complete, we'll build the Welcome screen!
