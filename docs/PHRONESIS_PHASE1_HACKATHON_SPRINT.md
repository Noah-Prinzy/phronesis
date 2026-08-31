# PHRONESIS: PHASE 1 HACKATHON SPRINT PLAN

**Sprint Duration:** 6-8 weeks  
**Team Size:** 2-3 developers + 1 designer  
**Goal:** Functional MVP with beautiful UI for hackathon showcase  
**Deliverable:** Web app (React) + working backend (Node.js) deployed on Vercel/Railway  

---

## PHASE 1 OVERVIEW

### What You'll Build (Hackathon MVP)

✅ **Avatar Welcome Screen** (Beautiful, animated)  
✅ **User Authentication** (Email + Google Sign-in)  
✅ **Home/Chat Page** (Text input, Claude API responses)  
✅ **Journey Detection** (Pre-car vs. Post-car onboarding)  
✅ **Account Page** (Basic profile management)  
✅ **Responsive Design** (Mobile, tablet, desktop)  
✅ **Avatar Positioning** (Centered on welcome, corner on other pages)  

### What You'll Skip (Phase 2+)

❌ OBD Bluetooth integration (too complex for hackathon)  
❌ 3D hologram (postpone to Phase 2)  
❌ Mechanic marketplace (postpone to Phase 2)  
❌ Advanced animations (keep it simple, elegant)  
❌ TTS/STT (add text-only for hackathon)  

---

## WEEK-BY-WEEK BREAKDOWN

### **WEEK 1: FOUNDATION & SETUP**

**Duration:** 5 working days  
**Deliverable:** Deployed skeleton with auth working

#### **Day 1: Project Initialization**

```bash
# Frontend
npm create vite@latest phronesis -- --template react-ts
cd phronesis
npm install react-router-dom socket.io-client framer-motion zustand axios @supabase/supabase-js zod react-hook-form
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Backend
mkdir backend
cd backend
npm init -y
npm install express socket.io @supabase/supabase-js @anthropic-ai/sdk dotenv cors
npm install -D typescript @types/node @types/express ts-node
npx tsc --init
```

**Checklist:**
- [ ] Frontend compiles
- [ ] Backend starts without errors
- [ ] npm packages installed

#### **Day 2: Supabase Setup**

1. Create Supabase project (free tier)
2. Create users table (email, username, phone, primary_journey)
3. Enable email authentication
4. Enable Google OAuth
5. Add .env files to both frontend + backend
6. Test auth locally

**Checklist:**
- [ ] Supabase project created
- [ ] Tables set up
- [ ] Auth methods enabled
- [ ] Environment variables configured

#### **Day 3-4: Authentication Screens**

**Frontend:**
- Create SignIn.tsx component
- Create SignUp.tsx component
- Add basic Tailwind styling
- Create Auth context (Zustand store)
- Test login/signup flow

**Backend:**
- Create /auth/signup endpoint
- Create /auth/signin endpoint
- Create /auth/google endpoint
- Basic JWT token generation

**Checklist:**
- [ ] Sign up form works
- [ ] Sign in form works
- [ ] Tokens stored locally
- [ ] Tokens refresh on page reload

#### **Day 5: Deployment Setup**

- Deploy frontend to Vercel
- Deploy backend to Railway/Render
- Configure environment variables in cloud
- Test deployed version

**Checklist:**
- [ ] Frontend URL live
- [ ] Backend API responding
- [ ] Auth working in production

---

### **WEEK 2: AVATAR & WELCOME SCREEN** ⭐

**Duration:** 5 working days  
**Deliverable:** Beautiful Avatar Welcome screen with animations

#### **Day 1-2: Avatar Component + Animations**

**Create Avatar.tsx:**

```typescript
// frontend/src/components/Avatar/Avatar.tsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Avatar.module.css';

interface AvatarProps {
  isWelcome?: boolean;
  message?: string;
  isLoading?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ isWelcome = true, message, isLoading = false }) => {
  const [isAnimating, setIsAnimating] = useState(true);

  // Pulsing orb animation
  const orbAnimation = {
    scale: [1, 1.05, 1],
    opacity: [0.9, 1, 0.9],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };

  // Welcome screen: Avatar centered
  if (isWelcome) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-8">
          {/* Avatar Orb */}
          <motion.div
            className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 shadow-2xl"
            animate={orbAnimation}
          >
            {/* Inner glow */}
            <motion.div
              className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-300 to-purple-400"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            />

            {/* Center highlight */}
            <motion.div
              className="absolute inset-6 rounded-full bg-white opacity-20"
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>

          {/* Welcome Message */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2">Phronesis</h1>
            <p className="text-lg text-gray-300">Your AI Car Diagnostic Assistant</p>
          </motion.div>

          {/* Loading spinner */}
          {isLoading && (
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.1,
                    repeat: Infinity,
                  }}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Home/Other screens: Avatar in corner (minimized)
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        animate={orbAnimation}
      >
        <motion.div
          className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-300 to-purple-400"
          animate={{
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />
      </motion.div>

      {/* Message tooltip */}
      {message && (
        <motion.div
          className="absolute -top-12 right-0 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-purple-500"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message}
        </motion.div>
      )}
    </motion.div>
  );
};
```

**Avatar.module.css:**

```css
.avatar-container {
  perspective: 1000px;
}

.avatar-orb {
  background: linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%);
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.4),
              0 0 60px rgba(96, 165, 250, 0.2);
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.4); }
  50% { box-shadow: 0 0 50px rgba(168, 85, 247, 0.6); }
}
```

#### **Day 3: Welcome Screen Page**

**Create Welcome.tsx:**

```typescript
// frontend/src/pages/Welcome.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar/Avatar';
import { motion } from 'framer-motion';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<null | 'yes' | 'no'>(null);

  const handleAnswer = (answer: 'yes' | 'no') => {
    setSelectedAnswer(answer);
    // Store journey in localStorage/store
    localStorage.setItem('userJourney', answer === 'yes' ? 'post-car' : 'pre-car');
    
    // Delay redirect for animation effect
    setTimeout(() => {
      navigate('/auth/signin');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Avatar isWelcome={true} />

      {/* Question Overlay (appears after 2 seconds) */}
      {showQuestion && (
        <motion.div
          className="fixed inset-0 flex items-end justify-center pb-32 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <motion.div
            className="bg-slate-800 rounded-2xl border border-purple-500 p-8 max-w-md mx-4 shadow-2xl pointer-events-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">A Quick Question</h2>
            <p className="text-gray-300 mb-6">Do you own a car?</p>

            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer('yes')}
                disabled={selectedAnswer !== null}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Yes
              </button>
              <button
                onClick={() => handleAnswer('no')}
                disabled={selectedAnswer !== null}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                No
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Trigger question after animation */}
      <motion.div
        onAnimationComplete={() => setShowQuestion(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      />
    </div>
  );
};
```

#### **Day 4-5: Routing & Testing**

- Set up React Router
- Create route structure: Welcome → SignIn → Home
- Test navigation flow
- Test on mobile view (Tailwind responsive)

**Checklist:**
- [ ] Avatar welcome screen animated
- [ ] Question appears after 2 seconds
- [ ] Journey selection works
- [ ] Routes between Welcome → Auth → Home
- [ ] Mobile responsive

---

### **WEEK 3: AUTHENTICATION FLOW**

**Duration:** 5 working days  
**Deliverable:** Full auth flow (signup → journey detection → home)

#### **Day 1-2: SignUp & SignIn Pages**

**SignUp.tsx:**

```typescript
// Reusable form component
// Fields: email, password, confirm password, username
// Google OAuth button
// Link to SignIn
```

**SignIn.tsx:**

```typescript
// Email/password login
// Google OAuth button
// Link to SignUp
// Remember me checkbox
```

#### **Day 3: Journey Detection Onboarding**

**Create Onboarding.tsx:**

```typescript
// After login, show: "Do you own a car?" if not answered yet
// Route to Pre-car or Post-car home page based on answer
```

#### **Day 4: Session Persistence**

- Store JWT token in localStorage
- Auto-login on page refresh
- Logout functionality
- Handle token expiration

#### **Day 5: Testing & Polish**

- Test all auth flows
- Test mobile auth
- Test error handling
- Ensure password security

**Checklist:**
- [ ] Sign up form works
- [ ] Sign in form works
- [ ] Google OAuth connected
- [ ] Session persists
- [ ] Journey detection onboarding
- [ ] Error handling

---

### **WEEK 4: CHAT HOME PAGE & AVATAR MESSAGING**

**Duration:** 5 working days  
**Deliverable:** Functional chat interface with Claude API integration

#### **Day 1-2: Chat UI Components**

**ChatWindow.tsx:**

```typescript
// Display chat messages
// Style: dark theme, message bubbles
// Avatar messages on left, user messages on right
// Typing indicator when assistant is responding
```

**MessageInput.tsx:**

```typescript
// Text input field
// Send button
// Character counter
// Disabled state while processing
```

#### **Day 3: Socket.io Setup**

**Backend:**

```typescript
// server/sockets/index.ts
import { Server, Socket } from 'socket.io';

export const setupChat = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    socket.on('user:message', async (message: string) => {
      // Call Claude API
      // Stream response back to client
      socket.emit('avatar:response', response);
    });
  });
};
```

**Frontend:**

```typescript
// Connect to Socket.io
// Send message, listen for response
// Update chat history
```

#### **Day 4-5: Claude API Integration**

**Setup Claude:**

```typescript
// services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';

export async function diagnoseCarIssue(userMessage: string) {
  const client = new Anthropic();
  
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: 'You are Phronesis, a friendly African car diagnostic AI. Answer car questions helpfully.',
    messages: [
      { role: 'user', content: userMessage }
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
```

**Checklist:**
- [ ] Chat UI displays messages
- [ ] Input field works
- [ ] Claude API responds
- [ ] Messages stream to user
- [ ] Typing indicator shows
- [ ] Chat history displayed

---

### **WEEK 5: AVATAR PERSONALITY & CORNER POSITIONING**

**Duration:** 5 working days  
**Deliverable:** Avatar adapts personality, positions smartly

#### **Day 1-2: Avatar Personality Module**

**Create avatarPersonality.ts:**

```typescript
// Different personalities based on journey/context
// Pre-car: "Curious, exploratory tone"
// Post-car: "Analytical, problem-solving tone"

export const avatarPersonalities = {
  'pre-car': {
    greeting: "Welcome, future car owner! Let's find your perfect vehicle.",
    tone: 'advisory',
    emoji: '🚗',
  },
  'post-car': {
    greeting: "I'm Phronesis, your car's co-pilot. What's going on with your vehicle?",
    tone: 'diagnostic',
    emoji: '🔧',
  },
};
```

#### **Day 3: Adaptive Positioning**

**usAvatarPosition.ts hook:**

```typescript
// Detect current page
// If Welcome/Home: center avatar
// If SignIn/Account: corner avatar
// Smooth animation between states
```

#### **Day 4-5: Message Variety**

- Create message templates for different scenarios
- Add randomized greetings
- Implement context-aware responses

**Checklist:**
- [ ] Avatar personality changes by journey
- [ ] Centered on Welcome/Home
- [ ] Cornered on other pages
- [ ] Smooth position transitions
- [ ] Message variety

---

### **WEEK 6: ACCOUNT PAGE & PROFILE MANAGEMENT**

**Duration:** 5 working days  
**Deliverable:** User can manage profile

#### **Day 1-2: Account Page UI**

**Account.tsx:**

```typescript
// Edit username
// Edit email
// Edit phone number
// Profile picture upload (optional for hackathon)
// Journey toggle (Pre-car ↔ Post-car)
// Logout button
```

#### **Day 3-4: Backend Profile Endpoints**

```typescript
// GET /api/user/profile
// PUT /api/user/profile
// POST /api/user/avatar (optional)
```

#### **Day 5: Testing & Polish**

- Test all profile updates
- Test journey toggle
- Test mobile view

**Checklist:**
- [ ] Profile page displays
- [ ] Edit fields work
- [ ] Updates persist
- [ ] Journey toggle works
- [ ] Logout works

---

### **WEEK 7: RESPONSIVE DESIGN & POLISH**

**Duration:** 5 working days  
**Deliverable:** Beautiful, responsive UI across all devices

#### **Day 1: Mobile Optimization**

- Test on iPhone SE, Android (small phone)
- Fix any layout issues
- Test touch interactions
- Optimize avatar size for mobile

#### **Day 2: Tablet Optimization**

- Test on iPad, tablet screen sizes
- Ensure spacing is optimal
- Test landscape orientation

#### **Day 3: Desktop Optimization**

- Test on 1920x1080, 2560x1440
- Ensure not too wide
- Desktop-specific optimizations

#### **Day 4: Dark Mode & Theming**

- Ensure consistent color scheme
- Test contrast ratios (accessibility)
- Ensure avatar glows nicely on dark background

#### **Day 5: Performance & Animations**

- Optimize animations (60fps)
- Lazy load images
- Minify assets
- Test on slow 4G

**Checklist:**
- [ ] Mobile looks great
- [ ] Tablet responsive
- [ ] Desktop optimal
- [ ] All animations smooth
- [ ] Text readable
- [ ] Dark theme consistent

---

### **WEEK 8: DEPLOYMENT & HACKATHON PREP**

**Duration:** 5 working days  
**Deliverable:** Live, deployed app + demo video

#### **Day 1: Final Deployment**

- Deploy frontend to Vercel
- Deploy backend to Railway
- Verify all features working in production
- Test on real devices

#### **Day 2: Bug Fixes & Polish**

- Fix any production issues
- Polish animations
- Improve error messages
- Test edge cases

#### **Day 3: Demo Video Creation**

**Record 2-3 min demo showing:**
1. Avatar Welcome screen (animation)
2. Journey selection
3. Sign in flow
4. Chat interaction (pre-car questions)
5. Account page
6. Responsive design

#### **Day 4: Pitch Deck & Documentation**

- Create 10-slide pitch deck:
  1. Problem (diagnosing cars in Africa)
  2. Solution (Phronesis)
  3. Market size
  4. User journeys
  5. Technology stack
  6. Financial projections
  7. Team
  8. Go-to-market
  9. Funding ask
  10. Vision (OEM integration)

- Write README.md with setup instructions

#### **Day 5: Hackathon Day!**

- Set up booth/presentation area
- Practice pitch (3 min)
- Have backup laptop
- Have QR code for live demo
- Be ready for questions

**Checklist:**
- [ ] Frontend deployed & live
- [ ] Backend deployed & live
- [ ] Demo video recorded
- [ ] Pitch deck finalized
- [ ] README written
- [ ] Team ready to present

---

## AVATAR WELCOME MESSAGING (Final Design)

### **Avatar Welcome Screen - Sequence**

#### **Stage 1: Pure Animation (0-1.5 seconds)**

```
Screen: Dark gradient background (slate-900 → slate-800)
Avatar: Centered, 8rem x 8rem orb (gradient: blue → purple → pink)
Animation: Pulsing scale (1 → 1.05 → 1) over 2 seconds
Vibe: Futuristic, welcoming, calm
```

**Design Notes:**
- Orb uses CSS gradient: `linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)`
- Inner glow effect (opacity animation)
- White center highlight (subtle)
- Soft shadow with glow effect

#### **Stage 2: Avatar Welcome Message (1.5-2 seconds)**

```
Text appears above orb:
  "Phronesis"
  "Your AI Car Diagnostic Assistant"

Animation: Fade in + slide up
Vibe: Introduction, friendly
```

**Typography:**
- Title: "Phronesis" — 36px, Poppins bold, white
- Subtitle: "Your AI Car Diagnostic Assistant" — 18px, Inter regular, gray-300

#### **Stage 3: Question Appears (2-2.5 seconds)**

```
Card appears at bottom:
  "A Quick Question"
  "Do you own a car?"
  
  [Yes] [No] buttons

Animation: Slide up from bottom, box-shadow glow
Vibe: Interactive, decision-making
```

**Card Design:**
- Background: `bg-slate-800` with `border border-purple-500`
- Border glow: `box-shadow: 0 0 20px rgba(168, 85, 247, 0.3)`
- Buttons: Blue (yes), Gray (no)
- Hover effect: Scale up, color shift

#### **Stage 4: Journey Personalization (After Answer)**

**If YES (Post-car ownership):**
```
Avatar message: "Welcome, Phronesis is your car's co-pilot! 🔧"
Redirect to: Sign In
Avatar tone: Diagnostic, problem-solving
```

**If NO (Pre-car ownership):**
```
Avatar message: "Welcome, future car owner! Let's find your perfect vehicle. 🚗"
Redirect to: Sign In
Avatar tone: Exploratory, advisory
```

---

## AVATAR CORNER MESSAGING (On Other Pages)

### **When Avatar is Minimized (Corner)**

#### **Size & Position**
- Size: 4rem x 4rem (64px) — smaller orb
- Position: `bottom-6 right-6` (fixed, sticky)
- Z-index: 40 (above content but below modals)

#### **Interactions**

**Hover:** 
- Scale up slightly (1 → 1.05)
- Shadow intensity increases
- Show tooltip message

**Click (optional for later):**
- Open chat sidebar
- Show recent messages

#### **Message Tooltip (Hover)**

```
"Hey! 👋 How can I help?" (example)

Appears: Top-left of avatar, dark bg with purple border
Disappears: On mouse leave
Animation: Fade in/out smoothly
```

---

## AVATAR EXPRESSION CHANGES (Optional, Phase 1.5)

**Pre-Phase 2, you can add subtle expression changes:**

```typescript
// Avatar emotional states
const avatarStates = {
  'idle': { opacity: 0.9, scale: 1 },
  'thinking': { opacity: 1, scale: 1.02 }, // slightly larger
  'excited': { scale: 1.05, glow: 'bright' },
  'error': { opacity: 0.8, glow: 'red' },
};
```

**Triggers:**
- Thinking: When Claude is generating response
- Excited: When user completes action
- Error: When something fails
- Idle: Default state

---

## HACKATHON SUCCESS CRITERIA

### **Must-Have (MVP):**
- ✅ Avatar Welcome screen (beautiful, animated)
- ✅ User authentication (email + Google)
- ✅ Journey detection (pre-car vs post-car)
- ✅ Chat interface (text input)
- ✅ Claude API integration (working)
- ✅ Account page (profile management)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Deployed & live (Vercel + Railway)

### **Nice-to-Have (Bonus Points):**
- 🟢 Socket.io real-time chat
- 🟢 Multiple pre-car/post-car demo conversations
- 🟢 Avatar expression changes
- 🟢 Dark mode toggle
- 🟢 Smooth animations
- 🟢 Demo video
- 🟢 Pitch deck

### **Presentation Essentials:**
- ✅ 2-3 min demo video (recorded beforehand)
- ✅ 3 min live pitch
- ✅ Working app on laptop
- ✅ QR code for judges to test
- ✅ Team introduction

---

## ESTIMATED COSTS FOR HACKATHON

| Item | Cost | Notes |
|------|------|-------|
| **Vercel** | $0 | Free tier (enough for demo) |
| **Railway** | $5-10 | For backend hosting |
| **Supabase** | $0 | Free tier sufficient |
| **Claude API** | $20-50 | Testing + demo usage |
| **Domain** | $0 | Use vercel.app subdomain |
| **Total** | ~$50-60 | One-time for hackathon |

---

## SUCCESS METRICS

**Judge Impression Score:**
- UI/UX Design: 8/10 (beautiful avatar, smooth transitions)
- Functionality: 8/10 (auth works, chat works, responsive)
- Innovation: 9/10 (AI diagnostics, OEM roadmap)
- Presentation: 9/10 (clear pitch, live demo)
- Overall: 8.5/10 target → **Win hackathon!**

---

**Timeline: 8 weeks to hackathon showcase**  
**Status:** Ready to build!  
**Next Step:** Kickoff Week 1 on [DATE]

