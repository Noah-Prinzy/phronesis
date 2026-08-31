# PHRONESIS: Complete Application Plan Document

**Version:** 2.0 (With Tech Stack Decision)  
**Date:** August 31, 2026  
**Status:** Design Phase Complete - Ready for Development  
**Tech Stack:** Node.js + Express (Backend) | React 18 + Vite (Frontend) | Supabase (Database) | Claude API (AI)  
**Frontend Languages:** React 18+, TypeScript, Tailwind CSS, Framer Motion, Three.js  
**Backend Languages:** Node.js + Express, TypeScript, Socket.io, Bull  
**Target Markets:** Uganda / Africa-wide  

---

## 1. EXECUTIVE SUMMARY

Phronesis is an AI-powered vehicle diagnostic and advisory platform with two distinct user journeys:

1. **Pre-Car Ownership Journey** — For users researching, comparing, and shopping for vehicles
2. **Post-Car Ownership Journey** — For vehicle owners managing diagnostics, maintenance, and repairs

The app features an adaptive AI avatar (Phronesis) that serves as an intelligent conversational router, guide, and diagnostician. Users never manually navigate; instead, the avatar interprets intent from natural language (text, voice, video) and takes them where they need to go.

**Core Innovation:** Context-aware, intent-driven navigation powered by conversational AI + real-time OBD data + community mechanic marketplace.

---

## 2. USER HANDLING & AUTHENTICATION

### 2.1 Authentication Methods
- **Sign Up** (email + password)
- **Sign In** (email + password)
- **Google Sign In** (OAuth)

### 2.2 Session Persistence
- Sessions stored in Supabase Auth
- Tokens cached securely on device
- Auto-refresh on app launch

### 2.3 User Profile Data
- Email, username, phone number
- Profile picture
- Primary journey (Pre-car or Post-car)
- Secondary journey access (toggle-able)
- Preferences (language, accent, notification settings)

### 2.4 Chat History & Continuity
- All conversations stored (Supabase Chat History table)
- One continuous thread per user (not separate conversations)
- Avatar remembers full context across sessions
- Searchable/filterable history (future phase)

### 2.5 Account Management Page
- Edit profile picture
- Edit username (Avatar uses this in conversations)
- Edit/add phone number
- Edit/add email
- Toggle between Pre-car and Post-car journeys
- Manage connected OBD devices
- View chat history
- Privacy & data settings

---

## 3. JOURNEY DETECTION & ROUTING

### 3.1 Onboarding Flow

```
Avatar Welcome Screen
        ↓
[No Login Required]
Avatar asks: "Do you own a car yet?"
        ↓
    User Response
        ↓
┌─────────────┴──────────────┐
│                            │
YES → Post-Car Journey   NO → Pre-Car Journey
│                            │
└─────────────┬──────────────┘
        ↓
Avatar personalizes greeting:
  - Pre: "Welcome, future car owner!"
  - Post: "Welcome, Phronesis is your car's co-pilot!"
        ↓
[User proceeds to Sign in/Sign up/Google Sign in]
        ↓
Auth completes
        ↓
Avatar continues conversation → Home/Chat page
(for their primary journey)
```

### 3.2 Journey Access
- Users have one **primary journey** (inferred from onboarding)
- Can access **both journeys** via toggle in Account page or Nav
- Avatar adapts personality based on active journey

### 3.3 Dynamic Journey Refinement
- User can ask cross-journey questions
- Avatar validates context and asks clarifying questions
- Example: "I heard a weird noise" (Post-car question) while in Pre-car journey → Avatar asks "Do you own this car?" → Routes appropriately

---

## 4. AVATAR DESIGN & BEHAVIOR

### 4.1 Avatar Identity
- **Name:** Phronesis
- **Form:** Malleable, fluid orb (not static shape)
- **Personality:** Friendly, helpful, approachable
- **Gender:** Male
- **Accent:** African (Uganda-based; localized by country)
- **Consistency:** Same character across both journeys, adapts personality mode

### 4.2 Personality Modes

| Mode | Journey | Tone | Behavior |
|------|---------|------|----------|
| **Research Mode** | Pre-Car | Advisor, curious, exploratory | Helps explore options, compare, learn |
| **Diagnostic Mode** | Post-Car | Analytical, problem-solver, reassuring | Diagnoses issues, prioritizes fixes, recommends solutions |

### 4.3 Avatar Appearance & Expression
- **Visual Changes:**
  - Expressions/emotions shift during conversations
  - (Post-Car only) Reflects car health status
    - Glows green/healthy when car is in good condition
    - Dims or shows concern when issues detected
    - Animates with urgency based on problem severity
- **Fluid Orb Animation:** Continuous subtle morphing/pulsing

### 4.4 Avatar Positioning (Responsive Layout)

| Screen | Position | Status |
|--------|----------|--------|
| Avatar Welcome | Center | Full focus |
| Home/Chat | Center | Full focus |
| Sign in/Sign up | Corner (minimized) | Still interactive |
| Diagnosis Page | Corner (minimized) | Still interactive |
| Solutions Page | Corner (minimized) | Still interactive |
| Maps & Navigation | Corner (minimized) | Still interactive |
| Account Page | Corner (minimized) | Still interactive |

**Core Principle:** Avatar adapts to screen content — centers when it's the focus, minimizes when other information needs space. User can still tap/interact with corner avatar.

### 4.5 Avatar Voice & Localization
- **TTS Provider:** Google Cloud Text-to-Speech or Azure Speech Services (supports African accents)
- **Accent:** Localized per country (Uganda, Kenya, Nigeria, South Africa, etc.)
- **Tone:** Adapts based on context (encouraging, serious, playful, etc.)

---

## 5. PRE-CAR OWNERSHIP JOURNEY

### 5.1 Purpose
Guide users through vehicle research, comparison, pricing, and purchase decisions before buying.

### 5.2 Services

#### 5.2.1 Car Information Library
- **Data included:** Engine type, parts catalog, country of manufacture, mileage, fuel consumption specs, tank size, transmission type, dimensions, safety features, warranty info
- **Accessibility:** Browse by make/model/year or ask Avatar ("Tell me about Honda Civic engines")
- **Interaction:** Text, voice, or upload images (user can point camera at a car)

#### 5.2.2 Car Recommendations
- Avatar asks budget constraints, preferences, use case
- Recommends vehicles matching criteria
- Compares up to 3 vehicles side-by-side
- Shows pros/cons for each

#### 5.2.3 Price Gauging & Market Analysis
- Shows current market price ranges (by region, condition, year)
- Alerts on deal opportunities
- Trends over time (prices rising/falling)
- Regional pricing differences (e.g., "Same car is cheaper in Nairobi than Kampala")

#### 5.2.4 Multi-Modal Assistant Interaction
- **Text input:** Type questions to Avatar
- **Voice input:** Speak to Avatar (STT)
- **Video recording:** Show Avatar a car's condition, damage, or interior (Avatar analyzes)

#### 5.2.5 Service Location Mapping
- Shows dealerships, private sellers, auto shops near user
- Real-time navigation to locations
- Reviews/ratings of dealerships
- Can filter by vehicle type, price range, distance

### 5.3 App Flow (Pre-Car Ownership)

```
Avatar Welcome
        ↓
Sign in/Sign up/Google Sign in
        ↓
Home/Avatar Chat
(User asks: "What car should I buy under $5000?")
        ↓
Avatar interprets → Routes to Car Info & Recommendations
        ↓
Car Info & Recommendations Page
(Shows matching vehicles, specs, pricing)
        ↓
User asks: "Where can I find these cars?"
        ↓
Avatar routes to Maps & Navigation
        ↓
Maps & Navigation Page
(Shows nearby dealerships/sellers)
        ↓
User asks: "Tell me more about my profile settings"
        ↓
Avatar routes to Account Page
```

---

## 6. POST-CAR OWNERSHIP JOURNEY

### 6.1 Purpose
Help vehicle owners diagnose problems, find solutions, manage maintenance, and access repair services.

### 6.2 Services

#### 6.2.1 Real-Time Avatar Assistant
- Always available for questions about car health, maintenance, repair costs, service providers
- Remembers user's car(s) and history

#### 6.2.2 OBD Bluetooth Monitoring
- Connects to OBD-II adapter via Bluetooth
- **Data collected:**
  - Engine fault codes (DTCs)
  - Real-time sensor readings (temperature, RPM, fuel consumption, O2 levels, etc.)
  - Battery voltage
  - Vehicle speed
  - Emission data
- **Real-time polling:** Continuous monitoring during drive or on-demand
- **Alerts:** Avatar notifies user of anomalies ("Engine temp is rising," "Check engine light triggered")

#### 6.2.3 Real-Time Notifications & Alerts
- Critical issues (engine failure risk, brake problems)
- Warning issues (unusual readings, maintenance due)
- Informational (fuel efficiency tips, service reminders)
- User can customize alert thresholds

#### 6.2.4 Multi-Modal Assistant Interaction
- **Text input:** Type symptoms ("Rough idle at cold start")
- **Voice input:** Describe issue verbally (STT)
- **Audio recording:** Record engine/car sounds for Avatar analysis
- **Video recording:** Film visible damage, dashboard, warning lights
- **OBD data:** Real-time diagnostic data from adapter

#### 6.2.5 3D Car Hologram Visualization
- **Display:** Interactive 3D model of user's car (make/model/year specific)
- **Features:**
  - Zoom in/out on specific areas
  - Select individual parts to inspect
  - Highlight damaged/problematic areas (based on diagnosis)
  - Color-coded urgency (red=critical, yellow=warning, green=healthy)
  - Part names and specs on hover
- **Integration:** Updates in real-time as Avatar diagnoses issues
- **Use case:** User can visualize exactly where a problem exists ("That's the alternator")

#### 6.2.6 Diagnosis & Repair Solutions
- Avatar analyzes OBD data + user input
- Generates **diagnosis report:**
  - Identified issues (with confidence levels)
  - Root cause analysis
  - Urgency ranking (Critical/High/Medium/Low)
  - "Nice-to-have" vs. "Must-fix" prioritization
- Shows **repair cost estimates** and recommends solutions

#### 6.2.7 Mechanic Service Finding & Marketplace
- **Mechanic Database:** Custom-built partner shop directory
- **Ranking:** Shops ranked by user reviews (best to least wanted)
- **Smart Matching:** Avatar suggests best nearby mechanics based on:
  - Specific car issue diagnosed
  - Shop ratings/reviews
  - Proximity to user
  - Specialization (some shops specialize in certain brands)
- **Cost Options:**
  - Industry cost range (from knowledge base)
  - Actual shop quotes (if integrated)
  - User contacts shops directly for custom quotes
- **Comparison:** User can compare costs, reviews, and services across multiple providers

#### 6.2.8 Service Reports & Transparency
- **Phronesis Report:** AI-generated diagnosis report (user reference)
- **Mechanic Report:** Generated by service provider after work (future phase)
- **Dual-sided future:** Separate apps for users and service providers (both generate/view reports)
- **Content:**
  - Parts cost vs. labor cost breakdown
  - Urgency level
  - Priority (must-fix vs. nice-to-have)
  - Timeline for repair
  - Warranty/guarantee info

#### 6.2.9 Follow-up & Feedback Loop
- **Issue Resolution:** User marks issue as "resolved" (OBD can verify via retesting)
- **Service Rating:** User rates mechanic service (1-5 stars + comments)
- **Review Distribution:** Rating sent to service provider (affects their reputation)
- **Photo Upload:** User can upload photos of completed work (builds transparency)
- **Learning:** Phronesis learns from every outcome to improve future recommendations

#### 6.2.10 Real-Time Navigation to Services
- **Route Planning:** Directions to recommended mechanic shops
- **Live Navigation:** Google Maps integration with turn-by-turn directions
- **Traffic Awareness:** Avoids congestion (real-time traffic data)
- **Estimated Time:** ETA to service provider

### 6.3 App Flow (Post-Car Ownership)

```
Avatar Welcome
        ↓
Sign in/Sign up/Google Sign in
        ↓
[OBD Pairing Prompt during onboarding - can defer]
        ↓
Home/Avatar Chat
(User says: "My car's making a weird noise")
        ↓
Avatar asks: "Can you describe it?" + pulls OBD data
        ↓
Avatar routes to Diagnosis Page
        ↓
Diagnosis Page
(3D hologram shows engine block, audio analysis, OBD codes)
Avatar displays:
- Identified problem (e.g., "Engine knock detected")
- Urgency (High)
- Repair solutions
        ↓
User asks: "How much will this cost to fix?"
        ↓
Avatar routes to Solutions Page
        ↓
Solutions Page
(Shows recommended mechanics, cost range, shop quotes)
User selects mechanic
        ↓
User asks: "How do I get there?"
        ↓
Avatar routes to Maps & Navigation
        ↓
Maps Page
(Shows route to selected mechanic, real-time directions)
        ↓
[After service] User marks issue as resolved
        ↓
Avatar prompts feedback (rate mechanic)
        ↓
Avatar learns & updates recommendation system
```

---

## 7. CHAT HUB & INTELLIGENT ROUTING

### 7.1 Home/Avatar Chat Purpose
**Universal Q&A space** — users ask anything (car-related and platform-related) within their stage context.

### 7.2 Conversation Continuity
- **Memory:** Avatar remembers everything from previous chats
- **Context:** Full conversation history carried forward across sessions
- **Thread:** One continuous thread per user (not segmented conversations)
- **Learning:** Avatar improves responses based on user history and outcomes

### 7.3 Context-Aware Validation
Avatar detects intent and asks clarifying questions:

| User Input | Avatar Response | Action |
|-----------|-----------------|--------|
| "What's that weird noise?" (Pre-car user) | "Are you asking about a car you own or one you're considering buying?" | Route based on answer |
| "Show me cars under $8k" (Post-car user) | "Looking to buy another vehicle?" | Confirm intent → Route to Car Info |
| "Can I get an inspection report?" (Pre-car) | "Let me help you find inspection services" | Route to Maps/Services |

### 7.4 Intent-Driven Navigation
User **never manually navigates.** Avatar routes based on natural language:

| Intent | Destination | Trigger |
|--------|-------------|---------|
| Browse/compare cars, get recommendations | Car Info & Recommendations | "Show me..." / "Recommend..." / "What car..." |
| Describe car problem/symptom | Diagnosis Page | "Weird noise..." / "Check engine light..." / "Vibration..." |
| Find mechanics, check costs | Solutions Page | "How much to fix?" / "Find a mechanic..." / "Get a quote..." |
| Navigate to location | Maps & Navigation | "Where can I find...?" / "Show me directions..." |
| Manage account | Account Page | "Change my profile..." / "Edit username..." |

---

## 8. OBD BLUETOOTH INTEGRATION

### 8.1 OBD Connection Flow
- **Timing:** Pairing requested during onboarding (Sign Up)
- **Optional:** User can complete setup later if they skip initial prompt
- **Reconnection:** If connection drops, user prompted to reconnect

### 8.2 Bluetooth Permissions
- **Request timing:** Per device OS requirements
  - iOS: Permissions requested on first OBD access
  - Android: Permissions requested during onboarding or on first access
- **If denied:** User can still interact via alternative methods (see 8.3)

### 8.3 Fallback Modes (No OBD or Permission Denied)
User can still diagnose by providing:
- **Text:** Type symptoms in natural language
- **Voice:** Describe issue verbally (STT)
- **Audio recording:** Record engine/car sounds for analysis
- **Video recording:** Film dashboard, warning lights, damage
- **Manual inspection:** User describes what they see/hear

**Result:** Diagnosis with lower confidence/accuracy but still functional.

### 8.4 OBD Data Collection

| Data Type | Examples | Usage |
|-----------|----------|-------|
| Engine Fault Codes (DTCs) | P0101 (Mass Airflow), P0420 (Catalyst) | Identify specific problems |
| Sensor Readings | Temperature, RPM, O2 levels, fuel consumption | Real-time monitoring |
| Vehicle Status | Battery voltage, speed, transmission status | Comprehensive health check |
| Emissions Data | Particulate levels, NOx | Environmental compliance |

### 8.5 Real-Time Monitoring
- **Polling:** Continuous during vehicle operation or on-demand
- **Avatar Alerts:** "Your engine temp is rising to 110°C" / "Check engine light just triggered"
- **Dashboard:** User can view live OBD metrics (optional)
- **Logging:** All data stored in Supabase for historical analysis

### 8.6 Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| OBD disconnects mid-diagnosis | Process halts, user prompted to reconnect; can re-diagnose with new data |
| No OBD adapter | Manual symptoms + multi-modal input (text/voice/video) → diagnosis with lower confidence |
| No Bluetooth permission | Use text/voice/video input only; OBD features unavailable |

---

## 9. SOLUTIONS PAGE & MARKETPLACE

### 9.1 Mechanic Partner Database
- **Source:** Custom-built partner directory (grows with user base)
- **Data per shop:** Name, location, phone, hours, specialties, ratings, reviews
- **Ranking:** Shops ranked by user reviews and community feedback (best to least wanted)

### 9.2 Smart Mechanic Recommendation
Avatar suggests best mechanics based on:
- **Diagnosed issue:** "Your car needs alternator replacement → Here are shops specializing in electrical"
- **Location:** Proximity to user
- **Ratings:** User reviews and Phronesis community rating
- **Cost:** Shop pricing for similar jobs (if available)

### 9.3 Cost Breakdown & Transparency
Service report includes:
- **Parts cost vs. labor cost** (itemized)
- **Urgency level:** Critical / High / Medium / Low
- **Prioritization:** "Must-fix" vs. "Nice-to-have" repairs
- **Timeline:** How soon repair should be done
- **Multiple quotes:** Compare costs across different shops

### 9.4 Service Report Structure

```
PHRONESIS DIAGNOSTIC REPORT
─────────────────────────────────────
Vehicle: 2015 Honda Civic
Issue: Engine Knock
Detected: OBD code P0325
Confidence: 92%

DIAGNOSIS
─────────────────────────────────────
Root Cause: Low-quality fuel or carbon buildup
Urgency: HIGH
Timeline: Fix within 2 weeks

REPAIR SOLUTIONS
─────────────────────────────────────
Option 1: Carbon cleaning (labor only)
  Cost: $120-180 (parts: $0, labor: $120-180)
  
Option 2: Replace knock sensor
  Cost: $250-400 (parts: $80-120, labor: $170-280)

RECOMMENDED MECHANICS (Top 3)
─────────────────────────────────────
1. ABC Auto Repair (4.8★) - $280 total
2. Quick Fix Motors (4.6★) - $320 total
3. John's Garage (4.4★) - $250 total

[Contact] [Compare Shops] [Book Service]
```

### 9.5 Post-Service Feedback Loop
- **Issue Resolution:** User confirms problem fixed (OBD can re-diagnose to verify)
- **Mechanic Rating:** 1-5 star review + comments
- **Review Distribution:** Rating sent to service provider (affects ranking)
- **Photo Evidence:** User uploads photos of completed work (transparency)
- **Phronesis Learning:** Outcome feeds into recommendation algorithm
  - "User rated this mechanic highly for knock sensor replacement → boost ranking for electrical issues"
  - "This shop consistently resolves problems → increase priority in recommendations"

---

## 10. TECHNICAL ARCHITECTURE

### 10.1 Frontend Stack (React + TypeScript + Vite)
- **Framework:** React 18+ (TypeScript)
- **Build tool:** Vite (fast, modern, ESM-first)
- **Styling:** Tailwind CSS (utility-first, dark mode, animations)
- **State management:** Zustand (lightweight, simple API)
- **Real-time communication:** Socket.io-client (WebSocket for chat, OBD, notifications)
- **Animations & Transitions:** Framer Motion (smooth, performant animations for Avatar)
- **3D Graphics:** Three.js (3D car hologram visualization, optimized)
- **Data Fetching:** TanStack Query / SWR (caching, synchronization, background updates)
- **Routing:** React Router v6 (page navigation)
- **Form Handling:** React Hook Form + Zod (lightweight form validation)
- **HTTP Client:** Axios (for REST API calls)
- **Offline Support:** Service Workers (cache chat history, offline maps)
- **Testing:** Vitest + React Testing Library

**Key Dependencies:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.0",
    "socket.io-client": "^4.7.0",
    "framer-motion": "^10.16.0",
    "three": "^r157.0.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^4.32.0",
    "tailwindcss": "^3.3.0",
    "axios": "^1.5.0",
    "react-hook-form": "^7.45.0",
    "zod": "^3.22.0"
  }
}
```

### 10.2 Backend Stack (Node.js + Express/Fastify + TypeScript)
- **Runtime:** Node.js 18+ LTS
- **Web Framework:** Express.js (Recommended for simplicity) or Fastify (if performance critical)
- **Language:** TypeScript (type safety, IntelliSense, refactoring)
- **Real-time Server:** Socket.io (WebSocket server, auto-reconnection, rooms/namespaces)
- **Database:** Supabase (PostgreSQL + Realtime + Auth + Storage)
- **AI Integration:** 
  - Claude SDK (`@anthropic-ai/sdk`) — primary
  - OpenAI SDK (`openai`) — fallback/multi-modal
- **Job Queue:** Bull (Redis-based) for async tasks (report generation, quote aggregation)
- **Input Validation:** Joi or Zod (runtime validation)
- **Authentication:** Supabase Auth (JWT tokens)
- **Environment Config:** dotenv
- **Logging:** Winston or Pino (structured logging)
- **Error Handling:** Custom error classes + centralized error middleware
- **CORS:** cors middleware
- **Rate Limiting:** express-rate-limit (prevent abuse)
- **Testing:** Jest + Supertest (unit + integration tests)
- **API Documentation:** Swagger/OpenAPI (optional)

**Key Dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "@supabase/supabase-js": "^2.33.0",
    "@anthropic-ai/sdk": "^0.7.0",
    "openai": "^4.11.0",
    "bull": "^4.11.0",
    "redis": "^4.6.0",
    "joi": "^17.10.0",
    "zod": "^3.22.0",
    "dotenv": "^16.3.0",
    "winston": "^3.10.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^6.10.0",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "^5.1.0",
    "@types/node": "^20.3.0",
    "jest": "^29.6.0",
    "supertest": "^6.3.0"
  }
}
```

### 10.2.1 Database Layer
- **Primary Database:** Supabase (PostgreSQL)
- **Caching Layer:** Redis (optional, for real-time state, rate limiting)
- **Authentication:** Supabase Auth (email, Google OAuth, session tokens)
- **File Storage:** Supabase Storage (profile pictures, photos of repairs, audio/video)
- **Realtime Subscriptions:** Supabase Realtime (database change notifications)

### 10.3 AI & Conversational Engine (Node.js Implementation)

#### MVP Phase (Starter Model)
- **Hybrid approach (Node.js):**
  - **Claude API (Anthropic) — PRIMARY**
    - Install: `npm install @anthropic-ai/sdk`
    - Use Cases: Diagnosis reasoning, repair recommendations, avatar responses
    - Streaming support: Real-time Avatar responses (stream tokens as they arrive)
    - 200k context window: Carry full conversation history
    - Code example:
    ```typescript
    import Anthropic from "@anthropic-ai/sdk";
    
    const client = new Anthropic();
    const stream = client.messages.stream({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: userInput }],
    });
    
    // Stream to WebSocket for real-time Avatar responses
    stream.on("text", (text) => {
      socket.emit("avatar:response", text);
    });
    ```
  
  - **GPT-4 / GPT-4 Turbo (OpenAI) — FALLBACK**
    - Install: `npm install openai`
    - Use Cases: Multi-modal (image analysis of car damage), fallback when Claude busy
    - Vision API: Analyze user-uploaded photos of car damage/symptoms
    - Code example:
    ```typescript
    import OpenAI from "openai";
    
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's wrong with this car?" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });
    ```

- **Custom Knowledge Base (Node.js + Supabase):**
  - Store in Supabase with embeddings for semantic search
  - Tables: `car_specs`, `common_issues`, `repair_costs`, `maintenance_schedules`
  - Retrieve relevant context before calling Claude API (RAG pattern)
  - Africa-wide data:
    - Vehicle makes/models available in African markets
    - Regional pricing differences
    - Local mechanic expertise (by issue type)
    - Fuel types common in region (petrol, diesel, CNG)
  - Implementation:
    ```typescript
    // Retrieve context before calling Claude
    const context = await getRelevantCarData(userCarMake, userCarModel);
    const systemPrompt = `You are Phronesis, an African car diagnostic AI.
    User's car: ${context.carInfo}
    Common issues: ${context.commonIssues}
    Repair costs (local): ${context.localPricing}`;
    ```

#### Future Phase (Custom Model)
- **Fine-tune custom LLM** on accumulated Phronesis data
  - User diagnostics & outcomes
  - Mechanic feedback
  - Successful repair patterns
  - Regional repair data
- **Deploy on own infrastructure** (Hugging Face Inference, Modal, or self-hosted)
  - Faster inference (no API latency)
  - Cheaper at scale (no per-token costs)
  - Privacy (data stays on your servers)
  - Gradual transition: Keep Claude as fallback during fine-tuning

### 10.4 API Integrations (3rd Party)

| Service | Purpose | Calls/Use Case |
|---------|---------|---|
| **Google Maps API** | Location, routing, navigation | Real-time directions to mechanics |
| **Google Cloud TTS/Azure Speech** | Avatar voice | Localized accent support (Ugandan, Kenyan, etc.) |
| **Google Cloud STT/Azure Speech** | Speech-to-text | User voice input parsing |
| **OBD.js / BluetoothLE APIs** | Read OBD adapter | Real-time vehicle diagnostics |
| **Weather API** | Environmental context | Road conditions, seasonal maintenance tips |
| **Google Places API** | Business info | Mechanic shop details, reviews, hours |

### 10.5 Database Schema (Supabase)

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  username VARCHAR NOT NULL,
  phone_number VARCHAR,
  profile_picture_url VARCHAR,
  primary_journey VARCHAR ('pre-car' | 'post-car'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Car Profiles Table
CREATE TABLE car_profiles (
  id UUID PRIMARY KEY,
  user_id UUID (FK: users.id),
  vin VARCHAR UNIQUE,
  make VARCHAR,
  model VARCHAR,
  year INT,
  engine_type VARCHAR,
  fuel_type VARCHAR,
  transmission VARCHAR,
  mileage INT,
  tank_size DECIMAL,
  last_service_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Chat History Table
CREATE TABLE chat_history (
  id UUID PRIMARY KEY,
  user_id UUID (FK: users.id),
  message VARCHAR,
  sender VARCHAR ('user' | 'assistant'),
  timestamp TIMESTAMP,
  context_journey VARCHAR ('pre-car' | 'post-car'),
  attachments JSONB (images/videos/audio)
);

-- OBD Data Log Table
CREATE TABLE obd_data_logs (
  id UUID PRIMARY KEY,
  user_id UUID (FK: users.id),
  car_profile_id UUID (FK: car_profiles.id),
  dtc_codes JSONB (P0101, P0420, etc.),
  temperature DECIMAL,
  rpm INT,
  fuel_consumption DECIMAL,
  o2_levels DECIMAL,
  battery_voltage DECIMAL,
  timestamp TIMESTAMP,
  alert_triggered BOOLEAN
);

-- Service Reports Table
CREATE TABLE service_reports (
  id UUID PRIMARY KEY,
  user_id UUID (FK: users.id),
  car_profile_id UUID (FK: car_profiles.id),
  diagnosis_text TEXT,
  urgency_level VARCHAR ('critical' | 'high' | 'medium' | 'low'),
  estimated_cost_low DECIMAL,
  estimated_cost_high DECIMAL,
  recommended_solutions JSONB,
  created_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_details TEXT
);

-- Mechanic Partners Table
CREATE TABLE mechanic_partners (
  id UUID PRIMARY KEY,
  name VARCHAR,
  location POINT (geo coordinates),
  phone VARCHAR,
  hours VARCHAR,
  specialties JSONB (electrical, engine, transmission, etc.),
  avg_rating DECIMAL (1-5),
  num_reviews INT,
  created_at TIMESTAMP
);

-- Reviews & Ratings Table
CREATE TABLE reviews_ratings (
  id UUID PRIMARY KEY,
  user_id UUID (FK: users.id),
  mechanic_partner_id UUID (FK: mechanic_partners.id),
  service_report_id UUID (FK: service_reports.id),
  rating INT (1-5),
  comment TEXT,
  photos_url JSONB (array of URLs),
  created_at TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID (FK: users.id),
  type VARCHAR ('alert' | 'recommendation' | 'reminder'),
  title VARCHAR,
  message TEXT,
  related_data JSONB,
  read_at TIMESTAMP,
  created_at TIMESTAMP
);

-- OBD Device Connections Table
CREATE TABLE obd_device_connections (
  id UUID PRIMARY KEY,
  user_id UUID (FK: users.id),
  device_name VARCHAR,
  device_id VARCHAR (Bluetooth MAC address),
  paired_at TIMESTAMP,
  last_connected_at TIMESTAMP,
  is_active BOOLEAN
);
```

### 10.6 Real-Time Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React App)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat Input   │  │ OBD Monitor  │  │ Notification │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │ WebSocket        │ WebSocket        │ WebSocket
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│              REAL-TIME SERVER (WebSocket)                    │
│  • Chat routing to Claude/GPT-4                              │
│  • OBD data ingestion                                        │
│  • Notification broadcasting                                │
└─────────────────────────────────────────────────────────────┘
          │
          │ REST API (Async)
          ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND SERVICES (REST API)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Service Report Generation (async queue)             │  │
│  │ Mechanic Quote Aggregation (batch job)              │  │
│  │ Learning/Analytics Updates (nightly batch)          │  │
│  │ Maps & Location Services                            │  │
│  │ Media Upload/Processing (image/video/audio)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + Storage)                 │
│  • Persistent data storage                                   │
│  • Authentication & sessions                                │
│  • File storage (photos, audio, video)                       │
└─────────────────────────────────────────────────────────────┘
```

### 10.7 API Endpoints (REST)

```
POST   /api/auth/signup          Sign up new user
POST   /api/auth/signin          Sign in user
POST   /api/auth/google          Google OAuth
POST   /api/auth/logout          Logout

POST   /api/car-profiles         Add car profile
GET    /api/car-profiles/:id     Get car profile
PUT    /api/car-profiles/:id     Update car profile
DELETE /api/car-profiles/:id     Delete car profile

GET    /api/cars/search          Search car info (Pre-car)
GET    /api/cars/recommendations Get recommendations (Pre-car)
GET    /api/cars/pricing         Get price data (Pre-car)

POST   /api/diagnosis            Run car diagnosis (Post-car)
GET    /api/diagnosis/:id        Get diagnosis report

GET    /api/mechanics/nearby     Find nearby mechanics
GET    /api/mechanics/:id        Get mechanic details
POST   /api/mechanics/:id/quote  Request quote from mechanic

POST   /api/services/:id/rating  Submit service rating

GET    /api/notifications        Get user notifications
PUT    /api/notifications/:id    Mark as read

POST   /api/obd/pair             Pair OBD device
POST   /api/obd/unpair           Unpair OBD device
GET    /api/obd/status           Check OBD connection status

GET    /api/user/profile         Get user profile
PUT    /api/user/profile         Update user profile
DELETE /api/user/account         Delete account
```

### 10.8 WebSocket Events (Real-Time)

```
// Chat
ws.emit('message:send', { text, attachments })
ws.on('message:receive', { message, timestamp })
ws.on('assistant:typing', {})
ws.on('assistant:stop_typing', {})

// OBD Monitoring
ws.on('obd:connected', { device_name })
ws.on('obd:disconnected', {})
ws.on('obd:data', { dtc_codes, temperature, rpm, ... })
ws.on('obd:alert', { type, message, severity })

// Notifications
ws.on('notification:new', { type, message, data })
ws.on('notification:update', { id, status })

// Typing Indicators
ws.on('user:typing', {})
ws.on('user:stop_typing', {})
```

### 10.9 Offline Capabilities
- **Chat history:** Cached locally with Service Worker
- **Car info:** Offline car database (MBs, not GBs)
- **Maps:** Downloaded offline maps (Google Maps API w/ offline layers)
- **Sync on reconnect:** All offline actions sync to server when connection restored

### 10.10 Security Considerations
- **Authentication:** Supabase JWT tokens + refresh tokens
- **Data encryption:** TLS for all API calls + end-to-end for sensitive chat
- **OBD data:** Encrypted in transit and at rest
- **Payment integration (future):** PCI compliance for mechanic service payments
- **Privacy:** User data not shared with mechanics unless explicitly granted

---

## 11. PROJECT STRUCTURE (Node.js + React + TypeScript)

### 11.1 Monorepo Layout

```
phronesis/
├── frontend/                              (React app - Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar/                   (Phronesis avatar - Framer Motion)
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── AvatarAnimation.ts    (Animation configs)
│   │   │   │   └── Avatar.module.css
│   │   │   ├── Chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── ChatMessage.tsx
│   │   │   ├── Hologram/                 (3D car - Three.js)
│   │   │   │   ├── CarHologram.tsx
│   │   │   │   ├── useCarModel.ts
│   │   │   │   └── carModels.ts
│   │   │   ├── Diagnosis/
│   │   │   ├── Solutions/
│   │   │   ├── Auth/
│   │   │   ├── Navigation/
│   │   │   └── Common/
│   │   ├── pages/
│   │   │   ├── Welcome.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── Diagnosis.tsx
│   │   │   ├── Solutions.tsx
│   │   │   ├── Maps.tsx
│   │   │   ├── Account.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   ├── useChat.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useOBD.ts
│   │   │   └── useTheme.ts
│   │   ├── services/
│   │   │   ├── socket.ts
│   │   │   ├── api.ts
│   │   │   ├── supabase.ts
│   │   │   └── storage.ts
│   │   ├── store/
│   │   │   ├── chatStore.ts              (Zustand)
│   │   │   ├── userStore.ts
│   │   │   ├── carStore.ts
│   │   │   └── uiStore.ts
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── car-models/
│   │   ├── avatars/
│   │   └── icons/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.local (git ignored)
│
├── backend/                               (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── cars.routes.ts
│   │   │   ├── diagnosis.routes.ts
│   │   │   ├── mechanics.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── obd.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── sockets/
│   │   │   ├── chat.socket.ts
│   │   │   ├── obd.socket.ts
│   │   │   ├── notifications.socket.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── ai.service.ts             (Claude/GPT-4)
│   │   │   ├── diagnosis.service.ts
│   │   │   ├── mechanic.service.ts
│   │   │   ├── obd.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── car.service.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Car.ts
│   │   │   ├── Diagnosis.ts
│   │   │   └── OBDData.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── validation.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── logging.ts
│   │   ├── queues/
│   │   │   ├── reportQueue.ts
│   │   │   ├── quoteQueue.ts
│   │   │   ├── analyticsQueue.ts
│   │   │   └── index.ts
│   │   ├── database/
│   │   │   ├── supabase.ts
│   │   │   ├── migrations/
│   │   │   └── seeds.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── errors.ts
│   │   │   └── validators.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── constants.ts
│   │   │   └── llm.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── .env.local (git ignored)
│
├── docker-compose.yml                    (Local dev - Redis, PostgreSQL)
├── .gitignore
├── README.md
└── DEPLOYMENT.md
```

### 11.2 Key Folders Explained

**Frontend (React + Vite):**
- **components/:** Reusable UI components (Avatar, Chat, 3D Hologram)
- **pages/:** Full page screens (Welcome, Home, Diagnosis, etc.)
- **hooks/:** Custom React hooks (useChat, useSocket, useAuth)
- **store/:** Zustand state management (global UI + data state)
- **services/:** API clients, Socket.io setup, Supabase client
- **types/:** TypeScript interfaces for type safety

**Backend (Node.js + Express):**
- **routes/:** Express route handlers (REST endpoints)
- **sockets/:** Socket.io event handlers (real-time chat, OBD, notifications)
- **services/:** Business logic (AI, diagnosis, mechanic matching)
- **middleware/:** Auth, validation, error handling, logging
- **queues/:** Bull job queues (async report generation, analytics)
- **config/:** Environment config, LLM setup (Claude/GPT-4)

---

## 12. GETTING STARTED (Phase 1 Setup)

### Step 1: Initialize Project (5 mins)

```bash
mkdir phronesis && cd phronesis

# Frontend (React + Vite)
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom socket.io-client framer-motion three zustand axios @tanstack/react-query zod react-hook-form
npm install -D tailwindcss postcss autoprefixer typescript-plugin-css-modules
npx tailwindcss init -p
cd ..

# Backend (Node.js + Express)
mkdir backend && cd backend
npm init -y
npm install express socket.io @supabase/supabase-js @anthropic-ai/sdk openai bull redis dotenv cors express-rate-limit winston
npm install -D typescript @types/node @types/express jest @types/jest supertest @types/supertest ts-node
npx tsc --init
cd ..
```

### Step 2: Environment Setup

**frontend/.env.local**
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SOCKET_IO_URL=http://localhost:3001
```

**backend/.env.local**
```
NODE_ENV=development
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
```

### Step 3: Database Setup (Supabase)

1. Create account at https://supabase.com
2. Create new project
3. Run SQL migrations (from section 10.5 schema)
4. Enable Realtime on tables (Users, Chat History, Notifications)
5. Set up email + Google OAuth in Authentication

### Step 4: Local Development Server

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Listens on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Opens on http://localhost:5173
```

**Terminal 3 - Redis (optional, using Docker):**
```bash
docker run -d -p 6379:6379 redis:latest
```

### Step 5: Verify Setup

- ✅ Backend running: http://localhost:3001/health
- ✅ Frontend running: http://localhost:5173
- ✅ Can see "Phronesis App" in browser
- ✅ Avatar Welcome screen renders

---

## 12.1 Development Workflow

**Phase 1 Timeline: Weeks 1-4**

**Week 1: Authentication + Welcome**
- [ ] Supabase Auth setup (email/password, Google OAuth)
- [ ] Avatar Welcome component (Framer Motion intro)
- [ ] Journey detection onboarding ("Do you own a car?")
- [ ] Route to auth screens based on response

**Week 2: Chat Hub + Socket.io**
- [ ] Socket.io server setup (message routing)
- [ ] Chat UI components (input, message list, typing indicator)
- [ ] Claude API integration (streaming responses)
- [ ] Chat history storage (Supabase)
- [ ] Intent detection (basic routing to pages)

**Week 3: Core Pages + Styling**
- [ ] Home/Chat page (full implementation)
- [ ] Account page (profile, settings)
- [ ] Basic styling (Tailwind, dark mode)
- [ ] Avatar corner positioning (responsive)
- [ ] Mobile responsiveness check

**Week 4: Testing + Polish**
- [ ] Unit tests (auth, chat, storage)
- [ ] Integration tests (Socket.io, Supabase)
- [ ] Error handling + loading states
- [ ] API documentation (Swagger optional)
- [ ] Code review + cleanup

---

## 13. DEVELOPMENT ROADMAP

### Phase 1: MVP (4-6 weeks)
**Goal:** Core chat hub + authentication + one journey (Post-car focus)

- [x] User authentication (Sign up, Sign in, Google OAuth)
- [x] Session persistence
- [x] Avatar Welcome screen
- [x] Home/Chat page
  - Text & voice input
  - Basic conversation routing
- [x] OBD connection flow (UI; actual hardware testing in Phase 2)
- [x] Account management page
- [x] Database setup (users, chat, car profiles)
- [x] Claude/GPT-4 API integration
- [x] Basic styling (Tailwind, responsive design)

**Deliverable:** Working chat app where users can ask questions about car diagnostics.

---

### Phase 2: Post-Car Diagnostics (4-6 weeks)
**Goal:** Full diagnostic engine + 3D visualization + solutions marketplace

- [ ] OBD Bluetooth integration (real hardware testing)
- [ ] Diagnosis page with 3D car hologram
- [ ] Real-time OBD monitoring
- [ ] Solutions page (mechanic matching)
- [ ] Service reports (AI-generated)
- [ ] Notifications/alerts system
- [ ] Google Maps integration (mechanic locations)
- [ ] WebSocket real-time chat
- [ ] Testing on iOS/Android devices

**Deliverable:** Users can diagnose car problems, get mechanic recommendations, and book services.

---

### Phase 3: Pre-Car Ownership Journey (3-4 weeks)
**Goal:** Car research, recommendations, pricing for pre-car buyers

- [ ] Car information library
- [ ] Car recommendation engine
- [ ] Price gauging & market analysis
- [ ] Dealership mapping
- [ ] Journey toggle (user can switch between Pre/Post)
- [ ] Avatar personality adaptation (research mode)
- [ ] Testing pre-car flows

**Deliverable:** Buyers can research and compare cars before purchase.

---

### Phase 4: Marketplace & Community (4-6 weeks)
**Goal:** Partner mechanic integration + review system + learning loops

- [ ] Mechanic partner database setup
- [ ] Review/rating system
- [ ] Cost comparison algorithm
- [ ] Mechanic notification system (new service requests)
- [ ] Analytics dashboard
- [ ] Learning feedback loops

**Deliverable:** Vibrant marketplace with trusted mechanics + continuous improvement.

---

### Phase 5: Custom Model & Optimization (Ongoing)
**Goal:** Build custom AI model + performance optimization

- [ ] Collect training data from Phase 1-4
- [ ] Fine-tune custom LLM
- [ ] Deploy on own infrastructure
- [ ] Advanced diagnostics (multi-model analysis)
- [ ] Multilingual support (Swahili, French, etc.)
- [ ] Regional expansion (Kenya, Nigeria, South Africa, etc.)

---

## 14. SUCCESS METRICS

### User Adoption
- Sign-ups per week
- Active users (DAU/MAU)
- Retention rate (day 7, day 30)

### Engagement
- Average chats per user per week
- Chat length (avg messages per session)
- Pages visited per session

### Functionality
- Diagnosis accuracy (user confirmation of fixes)
- Mechanic match quality (user satisfaction rating)
- Average cost savings (diagnosis vs. blindly replacing parts)

### Business
- Mechanic partner growth
- Average revenue per user (commission on services)
- Customer acquisition cost (CAC)
- Lifetime value (LTV)

---

## 15. GLOSSARY

| Term | Definition |
|------|-----------|
| **OBD** | On-Board Diagnostics; reads vehicle fault codes & sensor data via Bluetooth adapter |
| **DTC** | Diagnostic Trouble Code (e.g., P0101); identifies specific vehicle problems |
| **TTS** | Text-to-Speech; converts text to Avatar voice |
| **STT** | Speech-to-Text; converts user voice to text for processing |
| **Phronesis** | Greek term for practical wisdom; the app's AI avatar |
| **Pre-Car Journey** | User phase before buying a vehicle (research, comparison, pricing) |
| **Post-Car Journey** | User phase after owning a vehicle (diagnostics, maintenance, repairs) |
| **Solutions Page** | Displays repair recommendations, mechanic options, cost estimates |
| **Diagnosis Report** | AI-generated assessment of vehicle problem & repair solutions |

---

## 16. APPENDICES

### A. User Flow Diagram (Pre-Car)
```
Welcome → Auth → Home/Chat → "Show me cars under $8k" 
  → Car Info Page → "Where can I buy?" 
  → Maps Page → [End]
```

### B. User Flow Diagram (Post-Car)
```
Welcome → Auth → OBD Setup → Home/Chat → "Weird noise"
  → Diagnosis Page → "How much to fix?" 
  → Solutions Page → "Where's the shop?" 
  → Maps Page → [After service] → Rate Mechanic
```

### C. Avatar State Machine

| State | Trigger | Next State | Action |
|-------|---------|-----------|--------|
| Welcome | Page Load | Listening | Ask "Do you own a car?" |
| Listening | User Response | Routing | Infer journey, personalize greeting |
| Routing | Intent Detected | Page Navigation | Navigate to appropriate page |
| Diagnostics | "Weird noise" | Analysis | Analyze OBD + user input |
| Analysis | Analysis Complete | Solutions | Show repair options |
| Solutions | User Select Shop | Navigation | Route to Maps |

---

## 17. STACK DECISION SUMMARY

### Why Node.js + React for Phronesis?

| Decision | Rationale |
|----------|-----------|
| **Frontend: React 18+** | Best-in-class animation libraries (Framer Motion), 3D support (Three.js), WebSocket handling, large ecosystem |
| **Backend: Node.js + Express** | Real-time native (Socket.io is gold standard), single language across stack, async-first architecture, rapid MVP development |
| **AI: Claude API (primary)** | Superior reasoning for diagnostics, 200k context window, streaming support for real-time Avatar responses |
| **AI: GPT-4 (fallback)** | Vision API for analyzing damage photos, multi-modal scenarios, fallback for Claude load balancing |
| **State: Zustand** | Lightweight, simple API (vs Redux), perfect for chat + UI state management |
| **Database: Supabase** | PostgreSQL + Auth + Realtime + Storage in one platform, easy to scale, perfect for MVP |
| **Real-time: Socket.io + WebSocket** | Battle-tested, auto-reconnection, rooms/namespaces for chat routing, works across all platforms |
| **3D: Three.js** | Mature, performant, widely-used library for car hologram visualization |
| **Styling: Tailwind CSS** | Utility-first, dark mode, animation support, mobile-first responsive design |

**Result:** A futuristic, high-performance app built with proven technologies that enables rapid MVP delivery while maintaining the foundation for long-term scaling and custom AI model integration.

---

## 18. NEXT STEPS

1. **Review & Approval:** Stakeholder sign-off on this plan
2. **Technical Design:** Create detailed API contracts, database schemas, UI wireframes
3. **Environment Setup:** Supabase project, API keys, Git repo structure
4. **Sprint Planning:** Break Phase 1 into 2-week sprints
5. **Recruitment:** Hire/assign developers, designers, QA testers
6. **Kickoff:** Start Phase 1 development

---

**Document Version:** 2.0 (Tech Stack Finalized)
**Last Updated:** August 31, 2026  
**Author:** Phronesis Design Team  
**Status:** ✅ Ready for Development - All decisions locked
**Tech Stack:** Node.js + React + Supabase + Claude API
**Next Phase:** Environment setup, Sprint planning, Team recruitment
