# PHRONESIS: COMPREHENSIVE FINANCIAL REPORT

**Report Date:** August 31, 2026  
**Company:** Phronesis (Africa-Based Vehicle Diagnostic AI)  
**Markets:** Uganda, Kenya, Nigeria, South Africa (Phase 2+)  
**Currency:** USD (African market rates)  
**Prepared For:** Seed Round Fundraising & Hackathon Phase 1

---

## EXECUTIVE SUMMARY

**Project Cost to MVP Deployment:** $250,000 - $350,000 (Year 1)  
**3-Year Full Product Cost:** $790,000 - $1,000,000  
**Break-even Timeline:** 18-24 months (with revenue streams)  
**ROI at OEM Scale:** 300-500% (Year 3+)  

**Recommended Funding Path:**
- **Phase 1 (Hackathon MVP):** $20,000 - $50,000 (6-8 weeks)
- **Seed Round:** $200,000 - $500,000 (growth + full product)
- **Series A:** $1,000,000 - $3,000,000 (OEM partnerships)

---

## PART 1: YEAR 1 DETAILED COST BREAKDOWN

### 1.1 TEAM SALARIES & PERSONNEL (6-12 months)

**Lean Startup Model (Recommended for Hackathon → Seed)**

| Role | Seniority | Salary/Month | Duration (months) | Total Cost | Notes |
|------|-----------|-------------|-------------------|-----------|-------|
| **Full-Stack Developer** | Mid-level | $2,500 | 12 | $30,000 | React + Node.js |
| **Frontend Developer** | Mid-level | $2,500 | 12 | $30,000 | React + Animations |
| **Backend/DevOps** | Mid-level | $2,000 | 12 | $24,000 | Node.js + Supabase |
| **UI/UX Designer** | Mid-level | $2,000 | 6 | $12,000 | Avatar + Pages |
| **QA/Testing** | Junior | $1,000 | 6 | $6,000 | Manual + Automation |
| **Product Manager** | Junior | $1,500 | 6 | $9,000 | Roadmap + Coordination |
| **Contractor (OBD/Hardware)** | Expert | $1,500/week | 8 weeks | $12,000 | Bluetooth integration |

**SUBTOTAL PERSONNEL:** $123,000

**Benefits & Overhead (15%):** $18,450  
**Total Personnel Cost (Year 1):** $141,450

---

### 1.2 INFRASTRUCTURE & HOSTING (Annual)

| Service | Tier | Cost/Month | Annual Cost | Notes |
|---------|------|-----------|------------|-------|
| **Supabase (Database)** | Starter → Pro | $25-100 | $600-1,200 | PostgreSQL, Auth, Realtime |
| **Vercel (Frontend Hosting)** | Pro | $20 | $240 | Unlimited bandwidth |
| **Railway/Render (Backend)** | Standard | $50 | $600 | 2GB RAM, auto-scaling |
| **Redis (Upstash)** | Hobby → Growth | $0-50 | $100-600 | Job queue, caching |
| **Cloudflare CDN** | Free | $0 | $0 | Free for static assets |
| **Domain Name** | .com or .co.ug | $2 | $24 | Annual renewal |
| **SSL Certificate** | Free (Cloudflare) | $0 | $0 | Auto-renewal |
| **SendGrid (Email)** | Free tier | $0 | $0 | 100 emails/day free |
| **Firebase (Push Notifications)** | Free tier | $0 | $0 | Free tier sufficient |

**Total Infrastructure (Annual):** $1,564 - $2,464

---

### 1.3 AI & LANGUAGE SERVICES (Annual)

**Assumption: 100,000 users by end of Year 1**

#### **Claude API Usage**

| Metric | Per 1K Tokens | Monthly Volume | Monthly Cost | Annual Cost |
|--------|--------------|----------------|-------------|------------|
| **Chat (diagnostic)** | $0.003 input / $0.015 output | 500M tokens | $2,000-3,000 | $24,000-36,000 |
| **Streaming responses** | Same rate | Included above | Included | Included |

**Claude Cost (Year 1):** $24,000 - $36,000

#### **OpenAI API (Fallback + Vision)**

| Model | Use Case | Estimated Cost |
|-------|----------|-----------------|
| **GPT-4 Vision** | Analyze damage photos | $500-1,000/month |
| **Fallback routing** | When Claude overloaded | $300-500/month |

**OpenAI Cost (Year 1):** $9,600 - $18,000

#### **Google Cloud TTS/STT** (Avatar Voice)

| Service | Cost per Million | Estimated Volume | Cost |
|---------|-----------------|-----------------|------|
| **Text-to-Speech** | $16/1M chars | 50M chars/month | $800/month |
| **Speech-to-Text** | $4/1M chars | 20M chars/month | $80/month |

**Google TTS/STT (Year 1):** $10,560 - $12,000

#### **Google Maps API**

| Request Type | Cost | Estimated Monthly | Annual |
|-------------|------|-------------------|--------|
| **Geocoding** | $7/1K requests | $100 | $1,200 |
| **Directions** | $10/1K requests | $300 | $3,600 |
| **Places** | $7/1K requests | $150 | $1,800 |

**Google Maps (Year 1):** $6,600

**Total AI & Language Services (Year 1):** $50,760 - $73,200

---

### 1.4 THIRD-PARTY INTEGRATIONS & SERVICES

| Service | Purpose | Cost/Month | Annual |
|---------|---------|-----------|--------|
| **Twilio SMS** | OBD alerts via SMS | $50 | $600 |
| **GitHub** | Code repository + actions | $21 | $252 |
| **DataDog Monitoring** | Server monitoring | $50 | $600 |
| **Stripe/Paystack** | Payment processing (future) | Setup only | $0 (Phase 2) |
| **Slack** | Team communication | $12.50 | $150 |

**Total 3rd Party (Year 1):** $1,602

---

### 1.5 TESTING & HARDWARE

| Item | Cost | Qty | Total | Notes |
|------|------|-----|-------|-------|
| **OBD-II Bluetooth Adapter** | $60 | 5 | $300 | Testing devices |
| **iPhone (for testing)** | $500 | 1 | $500 | iOS testing |
| **Android Phones** | $200 | 3 | $600 | Android devices (various) |
| **Laptop (Dev)** | $1,200 | 2 | $2,400 | MacBook/Windows |
| **Monitor + Peripherals** | $300 | 3 | $900 | Development setup |
| **Mobile Device Simulator Licenses** | $0 | N/A | $0 | Free (Android Studio, Xcode) |
| **AWS Testing/Staging** | $200 | 1 | $200 | Load testing, staging servers |
| **Test Vehicle Rentals** | $100/week | 8 weeks | $800 | Real-world OBD testing |

**Total Hardware & Testing (Year 1):** $5,700

---

### 1.6 LEGAL & COMPLIANCE

| Item | Cost | Notes |
|------|------|-------|
| **Business Registration (Uganda)** | $300 | Company formation |
| **Tax ID / VAT Registration** | $100 | Uganda tax authority |
| **Privacy Policy & Terms of Service** | $500 | Legal review |
| **Data Protection Compliance** | $1,000 | GDPR + local regulations |
| **App Store Agreement Review** | $300 | Apple + Google terms |
| **Business Insurance** | $1,200 | Liability + cyber |
| **Accounting/Bookkeeping** | $200/month | $2,400 | Year 1 |

**Total Legal & Compliance (Year 1):** $5,800

---

### 1.7 MARKETING & LAUNCH

| Campaign | Budget | Timeline | Purpose |
|----------|--------|----------|---------|
| **Website & Landing Page** | $1,500 | Weeks 1-4 | Brand presence |
| **App Store Optimization (ASO)** | $2,000 | Weeks 8-12 | Store optimization |
| **Social Media Setup** | $500 | Weeks 1-2 | Twitter, Instagram, TikTok |
| **Launch Campaign** | $3,000 | Weeks 12-16 | Influencers, press |
| **Hackathon Pitch Deck** | $800 | Week 8 | Visual presentation |
| **Brand Assets (Logo, etc.)** | $1,200 | Weeks 1-6 | Branding |
| **PR/Press Release** | $1,000 | Week 16 | Launch announcement |
| **Community Building (Reddit, Discord)** | $1,000 | Ongoing | Community management |

**Total Marketing & Launch (Year 1):** $10,500 - $15,000

---

### 1.8 MISCELLANEOUS & CONTINGENCY

| Item | Cost |
|------|------|
| **Software Licenses** (IDEs, tools) | $500 |
| **Training & Learning Resources** | $500 |
| **Travel (team meetings, testing)** | $2,000 |
| **Miscellaneous expenses** | $1,000 |
| **Contingency Reserve (10%)** | $20,000 |

**Total Miscellaneous (Year 1):** $24,000

---

## YEAR 1 TOTAL COST SUMMARY

```
PHRONESIS YEAR 1 BUDGET BREAKDOWN
═════════════════════════════════════════════════════════════

Personnel & Payroll ...................... $141,450
Infrastructure & Hosting ................. $2,000
AI & Language Services ................... $62,000 (avg)
Third-Party Integrations ................. $1,600
Hardware & Testing ....................... $5,700
Legal & Compliance ....................... $5,800
Marketing & Launch ....................... $12,750
Miscellaneous & Contingency .............. $24,000
─────────────────────────────────────────────────────
TOTAL YEAR 1 ............................ $255,300
═════════════════════════════════════════════════════════════

Budget Range: $240,000 - $310,000 (with variance)
```

---

## PART 2: 3-YEAR FINANCIAL PROJECTION

### 2.1 YEAR-BY-YEAR BREAKDOWN

#### **YEAR 1: MVP DEVELOPMENT & LAUNCH**

```
Q1 (Months 1-3): MVP Development Phase
├── Personnel (5 people) ........................ $35,000
├── Infrastructure + APIs ...................... $20,000
├── Hardware/Testing ........................... $3,000
├── Marketing + Branding ....................... $3,000
└── Q1 Total .................................. $61,000

Q2 (Months 4-6): Feature Development
├── Personnel (5 people) ........................ $35,000
├── Infrastructure + APIs ...................... $20,000
├── Hardware/Testing ........................... $2,000
├── Legal/Compliance ........................... $3,000
└── Q2 Total .................................. $60,000

Q3 (Months 7-9): Testing & Polish
├── Personnel (6 people) ........................ $42,000
├── Infrastructure + APIs ...................... $20,000
├── QA/Testing ................................ $3,000
├── Marketing (pre-launch) ..................... $5,000
└── Q3 Total .................................. $70,000

Q4 (Months 10-12): Launch & Growth
├── Personnel (6 people) ........................ $42,000
├── Infrastructure + APIs ...................... $20,000
├── Marketing & Launch Campaign ............... $8,000
├── App Store Deployment ...................... $500
└── Q4 Total .................................. $70,500

YEAR 1 TOTAL: $261,500 (rounded: $260,000)
```

#### **YEAR 2: GROWTH & SCALING**

```
Personnel (Scale to 8 people)
├── Full-Stack Dev ............................ $2,500 × 12 = $30,000
├── 2nd Frontend Dev .......................... $2,500 × 12 = $30,000
├── Backend Specialist ........................ $2,000 × 12 = $24,000
├── OBD/Hardware Engineer ..................... $2,000 × 12 = $24,000
├── UI/UX Designer ............................ $2,000 × 12 = $24,000
├── Data Analyst .............................. $1,500 × 12 = $18,000
├── Community Manager ......................... $1,200 × 12 = $14,400
└── Project Manager (0.5 FTE) ................ $1,000 × 12 = $12,000

Personnel Subtotal: $176,400
Benefits/Overhead (15%): $26,460

Infrastructure & APIs (scaling)
├── Supabase (Pro + higher usage) ............ $100/month = $1,200
├── Vercel (Enterprise) ....................... $50/month = $600
├── Railway (scaled) .......................... $100/month = $1,200
├── AI Services (Claude, GPT-4, TTS) ........ $200/month = $2,400
└── Others .................................. $100/month = $1,200

Infrastructure Subtotal: $6,600

Operations & Marketing
├── Marketing Expansion ....................... $30,000
├── Mechanic Partnerships ..................... $10,000
├── Legal/Compliance (ongoing) ............... $5,000
├── Hardware/Testing (expanded) .............. $8,000

Operations Subtotal: $53,000

YEAR 2 TOTAL: $262,460 (rounded: $265,000)
```

#### **YEAR 3: OEM PREPARATION & EXPANSION**

```
Personnel (Maintain at 8-10 people)
├── Core team (8 people) ..................... $176,400
├── OEM Integration Specialist (new) ........ $30,000
├── Regional Manager (Africa expansion) .... $20,000

Personnel Subtotal: $226,400
Benefits/Overhead (15%): $33,960

Infrastructure & APIs (heavy usage)
├── Infrastructure (scaled) .................. $10,000
├── AI Services (OEM-scale) .................. $40,000 (higher volume)
└── OEM Testing Infrastructure .............. $20,000

Infrastructure Subtotal: $70,000

OEM Integration & Expansion
├── Android Automotive OS integration ....... $30,000
├── Apple CarPlay development ............... $20,000
├── OEM Certification & Compliance .......... $25,000
├── Vehicle API integration (CAN-bus) ...... $20,000
├── Marketing (regional expansion) .......... $30,000
├── Mechanic Onboarding (East Africa) ....... $15,000

OEM & Expansion Subtotal: $140,000

Operations
├── Legal/Compliance (OEM agreements) ....... $10,000
├── Hardware/Testing (OEM devices) .......... $10,000

Operations Subtotal: $20,000

YEAR 3 TOTAL: $490,360 (rounded: $500,000)
```

### 2.2 THREE-YEAR TOTAL PROJECTION

```
┌──────────────────────────────────────────────────┐
│    PHRONESIS 3-YEAR FINANCIAL PROJECTION         │
├──────────────────────────────────────────────────┤
│ Year 1 (MVP + Launch) ........... $260,000       │
│ Year 2 (Growth + Features) ...... $265,000       │
│ Year 3 (OEM Integration) ........ $500,000       │
├──────────────────────────────────────────────────┤
│ SUBTOTAL 3 YEARS ................ $1,025,000     │
│ Contingency (10%) ............... $102,500       │
├──────────────────────────────────────────────────┤
│ TOTAL REQUIRED .................. $1,127,500     │
│ (Realistic Range: $1,000,000 - $1,200,000)      │
└──────────────────────────────────────────────────┘
```

---

## PART 3: REVENUE MODEL & BREAK-EVEN ANALYSIS

### 3.1 USER ACQUISITION PROJECTIONS

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| **Total Users** | 50,000 | 200,000 | 500,000 |
| **Active Users (DAU)** | 10,000 | 50,000 | 150,000 |
| **Mechanic Partners** | 50 | 300 | 1,000+ |
| **Diagnostic Runs/Month** | 20,000 | 100,000 | 300,000 |
| **Service Bookings/Month** | 2,000 | 15,000 | 50,000 |

### 3.2 REVENUE STREAMS

#### **Stream 1: Mechanic Commission (5-10% on service bookings)**

| Metric | Assumption | Monthly | Annual |
|--------|-----------|---------|--------|
| **Year 1** | 2,000 bookings/month @ $200 avg = $400k GMV | $20,000 comm | $240,000 |
| **Year 2** | 15,000 bookings/month @ $200 avg = $3M GMV | $150,000 comm | $1,800,000 |
| **Year 3** | 50,000 bookings/month @ $250 avg = $12.5M GMV | $500,000 comm | $6,000,000 |

#### **Stream 2: Premium Subscription ($5-10/month for power users)**

| Metric | Assumption | Adoption | Monthly | Annual |
|--------|-----------|----------|---------|--------|
| **Year 1** | 50,000 users × 5% premium | 2,500 users | $15,000 | $180,000 |
| **Year 2** | 200,000 users × 10% premium | 20,000 users | $100,000 | $1,200,000 |
| **Year 3** | 500,000 users × 15% premium | 75,000 users | $375,000 | $4,500,000 |

#### **Stream 3: Mechanic Shop Featured Listings ($100-500/month)**

| Year | Shops | Adoption | Monthly | Annual |
|------|-------|----------|---------|--------|
| **1** | 50 | 30% | $2,000 | $24,000 |
| **2** | 300 | 40% | $15,000 | $180,000 |
| **3** | 1,000 | 50% | $50,000 | $600,000 |

#### **Stream 4: OEM Integration (Year 3+)**

| Model | Assumption | Annual Revenue |
|-------|-----------|-----------------|
| **Per-car revenue** | 10,000 cars/year × $5 | $50,000 |
| **Subscription model** | 100,000 cars × $2/month avg | $2,400,000 |
| **Data licensing** | Anonymized repair trends | $100,000-500,000 |

### 3.3 PROJECTED REVENUE & BREAK-EVEN

```
PHRONESIS REVENUE PROJECTION
════════════════════════════════════════════════════════════

YEAR 1 REVENUE:
  Commission ............................ $240,000 (46%)
  Premium Subscriptions ................. $180,000 (35%)
  Mechanic Listings ..................... $24,000 (5%)
  Other (partnerships, data) ............ $56,000 (11%)
  ─────────────────────────────────────────────────────
  TOTAL YEAR 1 REVENUE .................. $500,000
  
YEAR 1 COSTS: $260,000
YEAR 1 NET: +$240,000 (Profit!)

════════════════════════════════════════════════════════════

YEAR 2 REVENUE:
  Commission ............................ $1,800,000 (60%)
  Premium Subscriptions ................. $1,200,000 (40%)
  Mechanic Listings ..................... $180,000
  Other ................................ $120,000
  ─────────────────────────────────────────────────────
  TOTAL YEAR 2 REVENUE .................. $3,300,000
  
YEAR 2 COSTS: $265,000
YEAR 2 NET: +$3,035,000 (Major Profit)

════════════════════════════════════════════════════════════

YEAR 3 REVENUE:
  Commission ............................ $6,000,000 (60%)
  Premium Subscriptions ................. $4,500,000 (45%)
  Mechanic Listings ..................... $600,000
  OEM Integration ....................... $2,400,000
  Data Licensing ........................ $300,000
  ─────────────────────────────────────────────────────
  TOTAL YEAR 3 REVENUE .................. $13,800,000
  
YEAR 3 COSTS: $500,000
YEAR 3 NET: +$13,300,000 (Major Profit)

════════════════════════════════════════════════════════════

CUMULATIVE 3-YEAR:
  Total Revenue ......................... $17,600,000
  Total Costs ........................... $1,025,000
  NET PROFIT ............................. $16,575,000
  ROI: 1,615% !!
```

### 3.4 BREAK-EVEN TIMELINE

```
Month 1-3 .... Negative ($61,000) — Development phase
Month 4-6 .... Negative ($122,000) — Still in dev
Month 7-9 .... Negative ($192,000) — Testing phase
Month 10 ..... +$0 (Launch month - break-even)
Month 11-12 .. +$60,000 (Profit from commission + subscriptions)

BREAK-EVEN: ~Month 9-10 (First revenue in Month 10)
PROFITABILITY: Month 11+
```

---

## PART 4: FUNDING REQUIREMENTS & ALLOCATION

### 4.1 RECOMMENDED FUNDING STAGES

#### **STAGE 1: HACKATHON MVP BUDGET ($20,000 - $50,000)**

```
Objective: Build functional MVP for hackathon demo

Allocation:
├── 2 Developers (contract, 8 weeks) ......... $15,000
├── UI/UX Design + Avatar ................... $8,000
├── Infrastructure + APIs ................... $5,000
├── Hardware testing (OBD device) ........... $2,000
├── Contingency (10%) ....................... $5,000
└── TOTAL .................................. $35,000
```

#### **STAGE 2: SEED ROUND BUDGET ($200,000 - $500,000)**

```
Objective: Full team, all features, 50k+ users

Allocation:
├── Personnel (5-6 team) ..................... $120,000
├── Infrastructure & APIs ................... $50,000
├── Marketing & Launch ...................... $20,000
├── Hardware/Testing ........................ $10,000
├── Legal/Compliance ........................ $10,000
└── Contingency (15%) ....................... $50,000-200,000
   TOTAL .................................. $260,000-450,000
```

#### **STAGE 3: SERIES A BUDGET ($1,000,000 - $3,000,000)**

```
Objective: OEM partnerships, regional expansion, custom model

Allocation:
├── Team expansion (to 12 people) ........... $300,000
├── OEM Integration Engineering ............ $200,000
├── Regional Expansion (Kenya, Nigeria) .... $300,000
├── Custom LLM Training ..................... $150,000
├── Marketing (regional) .................... $100,000
├── Contingency (20%) ....................... $400,000-1,000,000
   TOTAL .................................. $1,000,000-2,450,000
```

### 4.2 USE OF FUNDS (Seed Round - $300,000 Example)

```
SEED ROUND: $300,000 USE OF FUNDS
═════════════════════════════════════════════════════════════

Personnel & Hiring (40%) ................... $120,000
├── Full-Stack Developer ................... $30,000
├── Frontend Developer ..................... $30,000
├── Backend Engineer ....................... $24,000
├── Designer ............................... $18,000
├── QA Engineer ............................ $12,000
└── Project Manager ........................ $6,000

Product Development (25%) ................. $75,000
├── Infrastructure scaling ................. $20,000
├── AI/LLM costs (Claude, GPT-4) ........... $30,000
├── Hardware testing (OBD, vehicles) ....... $15,000
└── Development tools/software ............ $10,000

Growth & Marketing (20%) .................. $60,000
├── User acquisition campaigns ............. $30,000
├── Influencer partnerships (African) ...... $20,000
├── Content marketing ....................... $10,000

Operations & Legal (10%) .................. $30,000
├── Legal/compliance ....................... $15,000
├── Accounting/Finance ..................... $10,000
├── Admin/Office ........................... $5,000

Contingency (5%) .......................... $15,000
```

---

## PART 5: FINANCIAL RATIOS & KPIs

### 5.1 KEY FINANCIAL METRICS (Seed Round Target)

| Metric | Target | Notes |
|--------|--------|-------|
| **CAC (Customer Acquisition Cost)** | <$5 | Cost to acquire one user |
| **LTV (Lifetime Value)** | $50-100 | Revenue per user over time |
| **LTV:CAC Ratio** | 10:1 | Ideal is 3:1+; we target 10:1 |
| **Burn Rate** | $25k/month | Seed should sustain 12 months |
| **Runway** | 12 months | Months of operating capital |
| **MRR (Monthly Recurring)** | $30k-50k | By Month 12 |
| **Gross Margin** | 70%+ | After COGS (servers, APIs) |
| **Payback Period** | 6-9 months | When user pays back CAC |

### 5.2 METRICS FOR VCs

**What VCs will ask about (Seed stage):**

| Question | Answer for Phronesis |
|----------|---------------------|
| **What's your TAM (Total Addressable Market)?** | $5B+ (African vehicle owners) |
| **What's your SAM (Serviceable Market)?** | $200M (East Africa mechanics) |
| **What's your projected year 3 revenue?** | $13.8M+ |
| **When do you break even?** | Month 9-10 |
| **What's your unit economics?** | LTV:CAC = 10:1 |
| **How much runway does this funding give?** | 12+ months |
| **What's your go-to-market strategy?** | OBD device users → mechanics → OEM partnerships |

---

## PART 6: FINANCIAL RISKS & MITIGATION

### 6.1 KEY RISKS

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **AI API costs spike** | Could 2x infrastructure spend | Medium | Build custom model, use Claude's pricing tiers |
| **User adoption slower** | Revenue delayed 3-6 months | Medium | Start with mechanic partnerships, not end users |
| **OBD hardware integration delays** | Phase 2 slips 2-3 months | Medium | Start with manual symptom input, OBD is enhancement |
| **Competition from bigger players** | Market share loss | Low-Medium | Speed to market, African-first advantage |
| **Regulatory issues (data privacy)** | Could delay launch 2+ months | Low | Proactive compliance, GDPR-ready from day 1 |
| **Mechanic partner adoption** | Core business model at risk | Medium | Build strong value prop, partner incentives |

### 6.2 MITIGATION STRATEGIES

| Risk | Mitigation | Timeline |
|------|-----------|----------|
| **High API costs** | Implement caching, build custom model | Phase 5 (Year 2-3) |
| **Slow adoption** | Start B2B with mechanic shops, not consumers | Phase 1 (Weeks 1-6) |
| **Hardware delays** | MVP with manual input, add OBD later | Phase 1 MVP |
| **Competition** | Move fast, get 50k users by Month 6 | Phase 1-2 |
| **Regulation** | Hire compliance consultant early | Month 2 |
| **Mechanic adoption** | Revenue share model, not pure commission | Phase 1 planning |

---

## PART 7: FINANCIAL ASSUMPTIONS & DEPENDENCIES

### 7.1 KEY ASSUMPTIONS

**User Growth Assumptions:**
- Month 1-3: 0 users (development)
- Month 4-6: 5,000 users (organic + hackathon buzz)
- Month 7-9: 15,000 users (marketing kick-in)
- Month 10-12: 50,000 users (viral growth + PR)

**Conversion Assumptions:**
- Commission conversion: 4% of users book a service
- Premium conversion: 5% of users upgrade
- Mechanic adoption: 30% of shops in Africa (long-term)

**API Cost Assumptions:**
- Claude: $0.003 input / $0.015 output per token
- Average diagnostic: 2,000 tokens = $0.03-0.04
- TTS/STT: ~500M characters/month = $1,000-2,000/month

**Team Salary Assumptions (African rates):**
- Mid-level dev: $2,000-2,500/month
- Junior dev: $1,000-1,500/month
- Designer: $1,500-2,000/month
- (vs. US rates: 2-3x higher)

### 7.2 DEPENDENCIES

| Dependency | Critical? | Status |
|-----------|----------|--------|
| **Supabase account + API keys** | YES | Easy, free tier available |
| **Claude API key** | YES | Apply at anthropic.com |
| **Google Maps API key** | YES | $0.0070 per request |
| **Bluetooth OBD adapter** | NO (MVP) | Can start without, add Phase 2 |
| **Phone numbers for SMS alerts** | NO (MVP) | Add in Phase 2 |
| **Mechanic partner network** | NO (MVP) | Build organically after launch |

---

## PART 8: SENSITIVITY ANALYSIS

### 8.1 SCENARIO: "What if user growth is 50% slower?"

```
User Projection: 50,000 → 25,000 by Year 1

Revenue Impact:
  Commission ............................ $120,000 (vs $240k)
  Premium Subs .......................... $90,000 (vs $180k)
  ─────────────────────────────────────────────────
  TOTAL REVENUE (Y1) .................... $250,000 (vs $500k)
  
Costs: Still $260,000
Result: -$10,000 loss (vs +$240k profit)

Recovery: Need to extend runway or raise additional $50k
Timeline: Break-even pushed to Month 15-16
```

### 8.2 SCENARIO: "What if API costs triple?"

```
Claude + GPT-4 costs: $62k → $186k annually

New Year 1 Budget: $260k + $124k = $384k
Revenue: $500k
Result: +$116k profit (vs +$240k)

Impact: Still profitable, LTV:CAC still strong
Mitigation: Accelerate custom model (saves $100k+ annually)
```

### 8.3 SCENARIO: "What if OEM deal lands in Year 2 (early)?"

```
OEM Revenue (Year 2): +$2.4M
Total Year 2 Revenue: $3.3M + $2.4M = $5.7M
Year 2 Profit: $5.7M - $265k = +$5.4M!!

This would:
  ✅ Make Series A obsolete
  ✅ Fund expansion organically
  ✅ Achieve profitability 12 months early
  ✅ Open $10M+ Series A at much better valuation
```

---

## PART 9: COMPARATIVE FINANCIALS (Similar Startups)

### 9.1 How Phronesis Compares

| Metric | Phronesis | GoJek (2015) | Uber (2012) |
|--------|-----------|--------------|-----------|
| **Seed Round** | $300k-500k | $500k | $11.5M |
| **Break-even Timeline** | Month 9-10 | ~24 months | 36+ months |
| **Burn Rate** | $25k/month | $500k+/month | $2M+/month |
| **Revenue Year 1** | $500k | ~$100k | ~$37M |
| **Gross Margin** | 70%+ | 15% | 20% |
| **Path to Profitability** | Clear | Unclear | Unclear |

**Key Insight:** Phronesis has better unit economics + faster path to profitability than ride-sharing peers.

---

## PART 10: INVESTOR PRESENTATION SUMMARY

### **One-Page Financials for Pitch Deck**

```
PHRONESIS: FINANCIAL HIGHLIGHTS

Market Opportunity:
  • TAM: $5B (African vehicle owners)
  • SAM: $200M (East Africa mechanics)
  • SOM: $10M (Year 3 target)

Funding Ask: $300,000 (Seed Round)
  • Runway: 12 months
  • Team: Scale to 6-8 people
  • Deliverables: Full product + 50k users

Financial Projections:
  • Year 1 Revenue: $500,000
  • Year 2 Revenue: $3.3M
  • Year 3 Revenue: $13.8M
  • Break-even: Month 10
  • 3-Year Cumulative Profit: $16.5M+

Unit Economics:
  • CAC: <$5
  • LTV: $50-100
  • LTV:CAC Ratio: 10:1+
  • Payback Period: 6-9 months

Use of Funds:
  • Personnel (40%): $120k
  • Product (25%): $75k
  • Marketing (20%): $60k
  • Operations (15%): $45k

Exit Opportunity:
  • Year 3: OEM integration with Nissan/Mahindra
  • Valuation: $100M+ (conservative)
  • Multiple: 7-10x revenue

IRR: 150-200%+ (investor return)
```

---

**Document Version:** 1.0  
**Date Prepared:** August 31, 2026  
**Prepared For:** Seed Round Fundraising, Hackathon Pitch  
**Status:** ✅ Investor-Ready
