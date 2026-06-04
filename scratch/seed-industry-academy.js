const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error("No .env.local found");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const url = env.NWS_BROKER_SUPABASE_URL;
const serviceKey = env.NWS_BROKER_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const assets = [
  {
    type: 'guide',
    title: 'Real Estate Sales Guide',
    description: 'Complete 8-step B2B client acquisition and implementation playbook for property brokerages.',
    content: `# Real Estate Brokerage Suite: B2B Playbook

This playbook outlines the 8-step framework for landing real estate brokerages as clients and deploying their systems.

---

## 1. Why Real Estate is the Best Client to Pitch
*   **The Opportunity**: Real estate is a high-margin, transaction-heavy industry. Decision-makers are independent owner-operators who directly control their budgets.
*   **The Core Leak**: Inquiries from property portals (Zillow in the US, Rightmove in the UK, Cariblist in the Caribbean) and social channels grow cold instantly. Waiting 5 minutes instead of 5 seconds to reply drops lead close rates by 80%.
*   **Whiteboard-Ready Math**:
    *   Monthly Lead Volume: 100 leads (average portal spend $5,000/mo at $50/lead).
    *   Speed-to-Lead Failure: 80% are contacted after the 5-minute window = 80 leads cold.
    *   Booking drop-off: Instant reply books 50% (50 tours); delayed reply books 10% (10 tours). Loss = 40 tours.
    *   Sales Loss: With a 25% close rate, this represents 10 lost sales / month.
    *   Revenue Impact: 10 deals * $15,000 commission split = $150,000 / month leaked.
    *   NWS ROI: A $299/mo (Entry) or $497/mo (Growth) SaaS subscription pays for itself if Aria recovers just one deal every 6 months.

---

## 2. The Mechanism Rule
*   **Rule**: Never pitch outcome-only ("we get you buyers"). Doctors and brokers are trained skeptics who reject vague promises. Lead with the mechanism.
*   **Outcome-Only (Skip)**: "We will get your brokerage 30 new home buyer leads next month, guaranteed."
*   **Mechanism-Led (Use)**: "We install an organic web-chat widget and a pre-qualifying WhatsApp chatbot that filters out tire-kickers based on budget and pre-approval status, booking qualified buyer consultations directly into your agents' calendars."

---

## 3. Who to Chase vs. Who to Skip
*   **Chase**:
    *   Independent local property brokerages (5-30 agents).
    *   Boutique luxury agency owners.
    *   Residential and villa developers.
*   **Skip**:
    *   Junior agents under a large franchise (they do not own the budget).
    *   Corporate franchise owners (e.g. Century 21 regional) tied to rigid corporate IT.
    *   Government-sponsored housing authorities.

---

## 4. The Referral Substitute (Name-Dropping)
*   **Concept**: Establish trust by citing named real estate professionals:
    *   *Tier 1 (Personal)*: "We set up this system for Broker Sarah Chen at Coastal Real Estate in San Diego..."
    *   *Tier 2 (Niche-specific)*: Name-drop a prominent regional broker in the same state/country.
    *   *Tier 3 (General)*: "We work with Broker Marcus Aldridge at Capital Realty..." (Always use a real name).

---

## 5. Where to Get Contact Data
*   **Sourcing**: Pull independent brokers from regional real estate boards:
    *   US: Local MLS directories and broker registers.
    *   UK: Rightmove and Zoopla agency listings.
    *   Caribbean: Cariblist, Terra Luxury, or local classified broker lists.
*   **Verification**: Filter for Managing Partners, Owners, or Directors. Run through a verifier to maintain a bounce rate under 1%.

---

## 6. The 4-Sentence Cold Outreach Script
Send via Email or WhatsApp.

~~~text
Subject: front desk booking leak at [Agency Name]

Saw your team is actively listing 18 properties on Cariblist/Zillow, but the web chat on your site has a delayed response rate.

How are you currently managing the gap between online inquiries and booking a listing tour, especially when your agents are out doing showings?

We set up an automated WhatsApp booking assistant for Broker Sarah at Coastal Real Estate that qualified pre-approval status and booked 14 tours in 30 days.

Worth comparing this with what your team does now?
~~~

---

## 7. GHL Setup SOP & Interactive Zoom Demo
*   **GHL Configuration**:
    *   Create custom fields: 'Buyer Timeline' (30/60/90 days), 'Pre-Approved Status' (Yes/No), and 'Target Property Address'.
    *   Configure GHL Custom Menu link pointing to your WhatsApp gateway.
    *   Setup round-robin booking calendar named 'Property Showings'.
*   **Zoom Live Demo Script**:
    *   *Step 1*: Show your screen with the GHL pipeline. Submit a mock form on a listing page.
    *   *Step 2*: Open your WhatsApp on screen. Show the Aria bot qualifying the buyer on timeline and pre-approval within 30 seconds.
    *   *Step 3*: Reply with pre-approval status. Aria sends the booking calendar, and the GHL pipeline updates to 'Qualified Tour Requested'.

---

## 8. Landing Client #1 From Zero
*   **Play**: Identify a broker with high listing volume but slow response times.
*   **The Offer**: "We will build a free WhatsApp no-show rebooking sequence for your agency in 24 hours. If it doesn't recover at least 2 tours this month, you owe us nothing. If it does, we ask for a testimonial and a 3-month trial at 50% off."
`
  },
  {
    type: 'guide',
    title: 'Home Services Optimization Guide',
    description: 'Complete 8-step B2B client acquisition and implementation playbook for trade contractors (HVAC, Plumbing, Electrical).',
    content: `# Home Services Optimization: B2B Playbook

This playbook outlines the 8-step framework for landing home services contractors as clients and deploying their systems.

---

## 1. Why Home Services is the Best Client to Pitch
*   **The Opportunity**: Trades are cash-flowing businesses where owners understand the immediate value of an incoming job. 
*   **The Core Leak**: Missed calls. 27% of calls to HVAC, plumbing, and electrical shops go to voicemail. 80% of missed callers hang up and call the next contractor on Google.
*   **Whiteboard-Ready Math**:
    *   Monthly Calls: 300.
    *   Missed Calls: 27% = 81 missed calls / month.
    *   Competitor Loss: 80% hang up and call a competitor = 65 lost jobs.
    *   Ticket Mix: 80% repairs ($800 value), 20% replacements ($8,000 value).
    *   Revenue Loss: 52 repairs ($41,600) + 13 replacements ($104,000) = $145,600 / month leaked.
    *   NWS ROI: A $299/mo (Entry) or $497/mo (Growth) SaaS subscription pays for itself if Aria recovers just one repair job a month.

---

## 2. The Mechanism Rule
*   **Rule**: Do not pitch "leads". Pitch the exact operational mechanism that captures missed calls instantly.
*   **Outcome-Only (Skip)**: "We will get your plumbing business 40 hot plumbing jobs next month."
*   **Mechanism-Led (Use)**: "We set up an automated WhatsApp Missed-Call Text-Back sequence and an organic website widget that responds in under 30 seconds to book diagnostic dispatch windows directly on your calendar."

---

## 3. Who to Chase vs. Who to Skip
*   **Chase**:
    *   Owner-operated residential service contractors (HVAC, Plumbing, Electrical, Roofing).
    *   Companies with 3-15 dispatch trucks.
    *   Contractors running Google Local Services profiles.
*   **Skip**:
    *   Commercial-only contractors (long sales cycles, project-based).
    *   New sole-traders with no admin staff or calendar software.
    *   Union-only civil infrastructure contractors.

---

## 4. The Referral Substitute (Name-Dropping)
*   **Concept**: Quote local trade owners to bypass skepticism:
    *   *Tier 1 (Personal)*: "We set up this WhatsApp missed-call recovery system for Jim over at Apex Plumbing..."
    *   *Tier 2 (Niche)*: "We set up this system for a residential HVAC contractor in Miami..."
    *   *Tier 3 (General)*: "We work with Bob over at Capital Air..."

---

## 5. Where to Get Contact Data
*   **Sourcing**: 
    *   US/UK: Google Local Services ads, local trade directories (Checkatrade/Yelp), state contractor registers.
    *   Caribbean: Local Yellow Pages, contractor registries, trade licensing databases.
*   **Verification**: Target the Owner or Founder. Run verification checks to keep email list bounce rates below 1%.

---

## 6. The 4-Sentence Cold Outreach Script
Send via Email or WhatsApp.

~~~text
Subject: missed calls at [Company Name]

I tried calling your shop yesterday at 5:30 PM to check on AC service and got your voicemail. In your industry, 27% of calls go missed, and 80% of those people hang up to call the next contractor on Google.

How are you currently handling after-hours calls or missed inquiries when your dispatchers are on other lines?

We built a WhatsApp missed-call recovery bot for Jim at Apex Plumbing that catches missed calls in 30 seconds and has booked 12 repair jobs this month.

Worth checking out a 2-minute video on how we set this up?
~~~

---

## 7. GHL Setup SOP & Interactive Zoom Demo
*   **GHL Configuration**:
    *   Set trigger: 'Call Status' -> 'No Answer' / 'Busy'.
    *   Add GHL action: Send WhatsApp Message: "Hey! This is Aria from [Company]. Sorry we missed your call. How can we help you today?"
    *   Integrate GHL calendar with Jobber or Housecall Pro.
*   **Zoom Live Demo Script**:
    *   *Step 1*: Ask the prospect to call your demo number and let it ring out to voicemail.
    *   *Step 2*: Show your shared screen. Within 30 seconds, open WhatsApp and show the Aria bot texting their mobile number to qualify the repair.
    *   *Step 3*: Reply: "My pipe is leaking." Aria books a diagnostic slot and updates the GHL dispatch board.

---

## 8. Landing Client #1 From Zero
*   **Play**: Identify a contractor who misses calls.
*   **The Offer**: "We will run a free 2-week Missed-Call Text-Back pilot over WhatsApp. If it doesn't recover at least 2 jobs, you pay nothing. If it does, we move to a standard $299/mo plan."
`
  },
  {
    type: 'guide',
    title: 'Hospitality & Seasonal Sales Guide',
    description: 'Complete 8-step B2B client acquisition and implementation playbook for event venues, tours, and seasonal charter operators.',
    content: `# Hospitality & Seasonal Suite: B2B Playbook

This playbook outlines the 8-step framework for landing seasonal operators and venues as clients and deploying their systems.

---

## 1. Why Hospitality is the Best Client to Pitch
*   **The Opportunity**: Seasonal businesses experience intense volume spikes. Booking delays translate to direct checkout abandonment.
*   **The Core Leak**: Social media inquiries (Instagram, Facebook DM) and web chat drop-offs outside office hours or during peak check-in.
*   **Whiteboard-Ready Math**:
    *   Weekly Inquiries: 40.
    *   Response Delay: 50% are delayed (after hours or during active tours) = 20.
    *   Abandonment: 75% book elsewhere = 15 lost bookings/week.
    *   Ticket Value: $100 per ticket (average booking group of 2 = $200).
    *   Weekly Loss: 15 * $200 = $3,000/week ($12,000/month).
    *   NWS ROI: A $299/mo SaaS subscription pays for itself if Aria secures just 2 lost bookings a month.

---

## 2. The Mechanism Rule
*   **Rule**: Pitch direct API booking integration and social DM automation, not generic marketing.
*   **Outcome-Only (Skip)**: "We will help you get more tourists to book your boat charters."
*   **Mechanism-Led (Use)**: "We integrate a WhatsApp and social DM booking assistant directly with your booking API (FareHarbor/Peek) that answers FAQs in 15 seconds and drops secure checkout links to complete reservations."

---

## 3. Who to Chase vs. Who to Skip
*   **Chase**:
    *   Private boat charters, catamaran rentals, adventure tour operators.
    *   Independent wedding and event venues.
    *   Boutique seasonal resorts and activity operators.
*   **Skip**:
    *   Large corporate cruise lines or major hotel brands (enterprise procurement blocks).
    *   Government parks or municipal attractions.
    *   Activity providers without an online booking engine.

---

## 4. The Referral Substitute (Name-Dropping)
*   **Concept**:
    *   *Tier 1 (Personal)*: "We set up this WhatsApp booking assistant for Capt. Dave at Island Charters..."
    *   *Tier 2 (Niche)*: "We set up this automated reservation flow for a catamaran charter operator in the Bahamas..."
    *   *Tier 3 (General)*: "We work with Dave over at Capital Tours..."

---

## 5. Where to Get Contact Data
*   **Sourcing**:
    *   Multi-regional: TripAdvisor listings, local tourism board member lists, Instagram/Facebook business pages for active charter operators.
*   **Verification**: Target the Owner, General Manager, or Tour Director. Validate email addresses.

---

## 6. The 4-Sentence Cold Outreach Script
Send via Email or Instagram DM.

~~~text
Subject: DM booking leak at [Business Name]

I noticed your Instagram page doesn't have an automated response for booking inquiries sent after your office closes. 

If a tourist trying to book a charter at 10 PM doesn't get a response, they usually book the next operator. At $100/ticket, that is $200 lost in one night.

How are you currently handling reservations that come in via social media or web chat when your team is out guiding tours?

We built a WhatsApp and social booking flow for Capt. Dave at Island Charters that connects to FareHarbor and secured 18 extra tickets this month.

Worth a quick chat to see how it works?
~~~

---

## 7. GHL Setup SOP & Interactive Zoom Demo
*   **GHL Configuration**:
    *   Connect Instagram and Facebook channels in GHL Integrations.
    *   Configure webhooks to pull live slots from FareHarbor/Peek Pro.
    *   Set up post-tour WhatsApp review requests: Trigger 'Booking Status' -> 'Completed' -> Delay 3 hours -> Send Review Link.
*   **Zoom Live Demo Script**:
    *   *Step 1*: Open the prospect's Facebook page or chat widget.
    *   *Step 2*: Send a message: "Do you have slots for 6 people this Saturday?"
    *   *Step 3*: Show Aria responding in 15 seconds with live FareHarbor slots, capturing details, and generating a checkout link.

---

## 8. Landing Client #1 From Zero
*   **Play**: Spot a charter page with active social media but no automated DMs.
*   **The Offer**: "Let us configure a WhatsApp booking widget for your website for free. We will run it for 2 weeks. If it doesn't capture at least 3 bookings, we remove it. If it does, we move to a standard $299 monthly plan."
`
  },
  {
    type: 'guide',
    title: 'Veterinary & Clinic Suite Guide',
    description: 'Complete 8-step B2B client acquisition and implementation playbook for animal clinics and private medical practices.',
    content: `# Veterinary & Healthcare Clinic Suite: B2B Playbook

This playbook outlines the 8-step framework for landing veterinary and private clinics as clients and deploying their systems.

---

## 1. Why Veterinary/Clinics is the Best Client to Pitch
*   **The Opportunity**: Animal clinics have high client lifetime values. Owners are typically veterinarians who run independent practices.
*   **The Core Leak**: Wellness and vaccine recall attrition (20% fail to reschedule annual boosters). Plus, after-hours emergency inquiries that leak to 24hr competitors due to a lack of immediate triage.
*   **Whiteboard-Ready Math**:
    *   Patient Base: 2,000 files.
    *   Recall Attrition: 20% fail to reschedule = 400 lost wellness visits.
    *   Visit Value: Exam + booster = $250.
    *   Recall Leak: 400 * $250 = $100,000 annual loss.
    *   Emergency Leak: 5 after-hours surgeries missed monthly at $2,000 each = $10,000/mo ($120,000/year).
    *   Total Annual Leak: $220,000.
    *   NWS ROI: A $299/mo (Entry) or $497/mo (Growth) SaaS subscription pays for itself by recovering just two wellness visits a month.

---

## 2. The Mechanism Rule
*   **Rule**: Never pitch general marketing. Pitch the clinical triage and recall integration mechanism.
*   **Outcome-Only (Skip)**: "We will get your clinic 50 new pet patients this month."
*   **Mechanism-Led (Use)**: "We integrate a pre-qualifying WhatsApp chat widget and automated recall campaign that syncs with your EHR system to trigger booster reminders and route emergencies to your on-call vet."

---

## 3. Who to Chase vs. Who to Skip
*   **Chase (Recommended Specialties)**:
    *   Plastic Surgeons & Cosmetic Dermatologists.
    *   Med Spa Owners & Aesthetic Clinics.
    *   Concierge Doctors & Private Fee-for-Service Practices.
    *   Chiropractors & Physical Therapy Clinics.
    *   Functional Medicine or Longevity Clinics.
    *   Fertility Clinics.
    *   Independent private veterinary clinics and pet hospitals (1-5 vets).
*   **Skip (Specialties to Avoid)**:
    *   Anesthesiologists, Radiologists, and Pathologists (typically employed by large hospital systems rather than owning their own practices).
    *   Primary Care Physicians (PCPs) working at large, institutional hospital systems.
    *   Corporate veterinary consolidators (e.g. Banfield equivalents).
    *   State-funded public health hospitals and emergency municipal systems with rigid IT.

---

## 4. The Referral Substitute (Name-Dropping)
*   **Concept**:
    *   *Tier 1 (Personal)*: "We set up this WhatsApp recall assistant for Dr. Sarah Chen at Coastal Vet..."
    *   *Tier 2 (Niche)*: "We designed this vaccine reminder automation for a vet clinic in Florida..."
    *   *Tier 3 (General)*: "We work with Dr. Aldridge at Capitol Animal Hospital..."

---

## 5. Where to Get Contact Data
*   **Sourcing**:
    *   US/UK: State veterinary licensing boards, medical directories, association listings.
    *   Caribbean: Local veterinary directories, trade registries.
*   **Verification**: Target the Practice Manager or Lead Vet Owner. Verify emails and phone numbers.

---

## 6. The 4-Sentence Cold Outreach Script
Send via Email or LinkedIn.

~~~text
Subject: vaccine recall leak at [Clinic Name]

I noticed your clinic doesn't have an automated WhatsApp recall campaign for patients past due on booster vaccinations.

How are you currently handling the follow-ups for the estimated 20% of pet owners in your database who miss their annual exam dates?

We built an automated WhatsApp recall trigger for Dr. Sarah at Coastal Vet that reactivated 42 overdue appointments in 30 days.

Worth taking a quick look at how it syncs with patient files?
~~~

---

## 7. GHL Setup SOP & Interactive Zoom Demo
*   **GHL Configuration**:
    *   Create custom fields: 'Pet Name', 'Vaccine Due Date', 'Last Exam Date'.
    *   Create GHL Trigger based on 'Vaccine Due Date' minus 30 days.
    *   Action: Send WhatsApp recall template with standard disclaimer: "For medical emergencies, please visit the emergency hospital immediately."
*   **Zoom Live Demo Script**:
    *   *Step 1*: Open the web chat widget. Type: "My dog is bleeding."
    *   *Step 2*: Show Aria immediately routing the user to the emergency hospital address.
    *   *Step 3*: Type: "Need a wellness check booking." Aria qualifies, checks available EHR calendar slots, and books.

---

## 8. Landing Client #1 From Zero
*   **Play**: Target a clinic with a large patient database.
*   **The Offer**: "We will export a list of your patients past due for vaccines and run a free 2-week WhatsApp reactivation campaign. We charge nothing upfront. If we book 5 appointments, you agree to a 3-month case study pilot."
`
  },
  {
    type: 'guide',
    title: 'Dental Practice Revenue Recovery Guide',
    description: 'Complete 8-step B2B client acquisition and implementation playbook for dental clinics and cosmetic dentists.',
    content: `# Dental Practice Revenue Recovery: B2B Playbook

This playbook outlines the 8-step framework for landing dental practices as clients and deploying their systems.

---

## 1. Why Dental is the Best Client to Pitch
*   **The Opportunity**: Dentists have a high average value per client (crowns/implants worth $1,500 - $5,000).
*   **The Core Leak**: Case acceptance. Practices averages a case acceptance rate of only 40%. The remaining 60% of recommended care sits unbooked because patients are confused about insurance copays or financing.
*   **Whiteboard-Ready Math**:
    *   Monthly Proposed Treatment: $100,000.
    *   Case Acceptance: 40% = $40,000 accepted.
    *   Unbooked Care: 60% = $60,000 leaked/month.
    *   Annual Leak: $720,000.
    *   NWS ROI: A $299/mo (Entry) or $497/mo (Growth) SaaS subscription pays for itself if Aria recovers just one crown or implant treatment follow-up.

---

## 2. The Mechanism Rule
*   **Rule**: Never pitch general SEO or ads. Pitch the post-checkout treatment plan recovery mechanism.
*   **Outcome-Only (Skip)**: "We will get your dental clinic 40 new patients a month."
*   **Mechanism-Led (Use)**: "We install an automated WhatsApp/Email follow-up sequence that triggers 1 hour post-checkout, explaining the procedure in plain English, detailing insurance copay estimates, and offering CareCredit financing links."

---

## 3. Who to Chase vs. Who to Skip
*   **Chase**:
    *   Independent private dental clinics (1-4 chairs).
    *   Cosmetic dentists, orthodontists, and dental implant specialists.
    *   Practices with a dedicated Treatment Coordinator.
*   **Skip**:
    *   Dental Service Organizations (DSOs) with corporate procurement blocks.
    *   Pediatric clinics focused entirely on basic state-funded cleanings.
    *   Clinics that do not offer high-value treatments (crowns, implants).

---

## 4. The Referral Substitute (Name-Dropping)
*   **Concept**:
    *   *Tier 1 (Personal)*: "We set up this case recovery system for Dr. Sarah Chen at Coastal Dental..."
    *   *Tier 2 (Niche)*: "We set up this copay follow-up automation for a cosmetic dentist in San Diego..."
    *   *Tier 3 (General)*: "We work with Dr. Aldridge at Capitol Dental..."

---

## 5. Where to Get Contact Data
*   **Sourcing**:
    *   US: ADA registers, state dental boards, Local Google maps audits.
    *   UK: General Dental Council (GDC) registers.
    *   Caribbean: Local dental associations, medical registry registers.
*   **Verification**: Target the Lead Dentist (Owner) or the Office/Practice Manager. Run email verification.

---

## 6. The 4-Sentence Cold Outreach Script
Send via Email or LinkedIn.

~~~text
Subject: unbooked crowns at [Practice Name]

I noticed your clinic doesn't have an automated WhatsApp follow-up sequence for patients who leave without booking their recommended treatment plans.

How are you currently educating patients on their insurance copays or financing options once they walk out your door?

We built a WhatsApp follow-up automation for Dr. Sarah at Coastal Dental that explains procedures in plain English and recovered $12k in unbooked crowns in 30 days.

Worth a quick chat to see how we sync it with patient records?
~~~

---

## 7. GHL Setup SOP & Interactive Zoom Demo
*   **GHL Configuration**:
    *   Create custom fields: 'Recommended Treatment Plan', 'Estimated Insurance Copay', 'Patient Out-of-Pocket'.
    *   Set trigger: Tag 'treatment-recovery' added to contact.
    *   Action: Send WhatsApp: "Hi {{contact.first_name}}, this is Aria from [Dental]. Dr. Smith wanted to check in. Your insurance covers 50% of the recommended crown, leaving your portion at $600. We have 0% financing starting at $50/mo. Would you like to book for next Tuesday?"
*   **Zoom Live Demo Script**:
    *   *Step 1*: Show a mock patient checkout in GHL.
    *   *Step 2*: Open WhatsApp on screen. Show the Aria bot triggering the copay breakdown and providing a CareCredit link.
    *   *Step 3*: Reply: "Yes, book Tuesday." Aria secures the slot on the GHL calendar.

---

## 8. Landing Client #1 From Zero
*   **Play**: Target a local dentist offering implants or crowns.
*   **The Offer**: "We will configure a free 2-week WhatsApp follow-up sequence for patients who exit without booking treatment. You provide the list. If we don't recover at least 2 crowns, you pay nothing. If we do, we ask for a testimonial and a 3-month trial."
`
  },
  {
    type: 'guide',
    title: 'Death Care & Funeral Suite Guide',
    description: 'Complete 8-step B2B client acquisition and implementation playbook for funeral homes and directors.',
    content: `# Death Care & Funeral Suite: B2B Playbook

This playbook outlines the 8-step framework for landing funeral homes as clients and deploying their systems.

---

## 1. Why Funeral Homes is the Best Client to Pitch
*   **The Opportunity**: High-margin pre-need contracts (pre-paid funeral arrangements) are valued at $10,000 each.
*   **The Core Leak**: Inquiries and brochure downloads go uncontacted because understaffed funeral directors are focused on active viewings and services.
*   **Whiteboard-Ready Math**:
    *   Monthly Guide Downloads: 30 leads.
    *   Response Delay: 90% receive no follow-up for weeks.
    *   Conversion Drop: Immediate reply books 30% (9 consults); delayed reply books 5% (1.5 consults). Loss = 7.5 consults.
    *   Financial Loss: 7.5 lost consultations * $10,000 contract value = $75,000/mo ($900,000/year).
    *   NWS ROI: A $299/mo (Entry) or $497/mo (Growth) SaaS subscription pays for itself if Aria helps secure just one pre-need contract every 6 months.

---

## 2. The Mechanism Rule
*   **Rule**: Never pitch aggressive sales. Pitch the gentle, long-term pre-planning education mechanism.
*   **Outcome-Only (Skip)**: "We will help your funeral home double pre-need sales this month."
*   **Mechanism-Led (Use)**: "We build a gentle WhatsApp and email brochure-nurture campaign that delivers educational pre-planning guides over 12 months, scheduling quiet pre-need consultations directly with your directors."

---

## 3. Who to Chase vs. Who to Skip
*   **Chase**:
    *   Independent, family-owned funeral homes (operating for 10+ years).
    *   Boutique funeral directors in competitive local areas.
*   **Skip**:
    *   Large corporate funeral conglomerates.
    *   Municipal cemeteries or government crematoriums.
    *   Funeral directors without an existing website.

---

## 4. The Referral Substitute (Name-Dropping)
*   **Concept**:
    *   *Tier 1 (Personal)*: "We set up this gentle pre-need nurture sequence for Director Sarah at Memorial Homes..."
    *   *Tier 2 (Niche)*: "We designed this 12-month educational drip for a funeral home in Georgia..."
    *   *Tier 3 (General)*: "We work with Director Marcus at Capitol Funerals..."

---

## 5. Where to Get Contact Data
*   **Sourcing**:
    *   Multi-regional: Regional funeral director association registers, local business registers, obituary site directories.
*   **Verification**: Target the Managing Director or Owner. Verify email lists carefully to keep bounce rates under 1%.

---

## 6. The 4-Sentence Cold Outreach Script
Send via Email or WhatsApp.

~~~text
Subject: pre-planning downloads at [Funeral Home Name]

I noticed your website offers a free pre-planning arrangement brochure, but there is no automated email or WhatsApp follow-up set up.

How are your directors currently nurturing the families who download your guides over the 6-12 months before they are ready to book a consultation?

We built a gentle pre-need nurture sequence for Director Sarah at Memorial Homes that booked 4 additional consultations last month.

Worth a quick look at how we structure these drips?
~~~

---

## 7. GHL Setup SOP & Interactive Zoom Demo
*   **GHL Configuration**:
    *   Setup 'Pre-Planning Consultation' calendar.
    *   Configure GHL custom fields: 'Guide Downloaded', 'Relation of Inquirer'.
    *   Set up 12-month drip: Send Email/WhatsApp on days 1, 15, 45, 90, 180, 270, 360 containing educational brochures.
*   **Zoom Live Demo Script**:
    *   *Step 1*: Submit a mock brochure download form.
    *   *Step 2*: Open WhatsApp on screen. Show the Aria bot sending a soft welcome message 5 minutes later, offering to schedule a quiet consult.
    *   *Step 3*: Reply: "Just gathering info." Aria logs the contact into the 12-month drip and alerts the director.

---

## 8. Landing Client #1 From Zero
*   **Play**: Identify a funeral home with active listings but zero automated follow-up.
*   **The Offer**: "We will build a free 12-month pre-need nurture sequence for your website downloads. If it doesn't book at least 1 consultation in 30 days, you pay nothing. If it does, we ask for a testimonial and move to a standard $299/mo or $497/mo plan."
`
  },
  {
    type: 'guide',
    title: 'Automotive Service Department Guide',
    description: 'Complete 8-step B2B client acquisition and implementation playbook for dealership service departments.',
    content: `# Automotive Service Department: B2B Playbook

This playbook outlines the 8-step framework for landing dealership service departments as clients and deploying their systems.

---

## 1. Why Automotive is the Best Client to Pitch
*   **The Opportunity**: Dealership service bays operate on volume. Service managers are highly incentivized to hit repair quotas.
*   **The Core Leak**: safety-declined recommendations (e.g. brakes, tires, leaks). Customers drive away saying they will "think about it" and advisors are too busy checking in cars to follow up, leaking thousands of dollars of work to independent mechanics.
*   **Whiteboard-Ready Math**:
    *   Monthly Repair Orders (ROs): 800.
    *   Safety Declines: 25% decline safety repairs = 200 declines / month.
    *   Ticket Value: $700 average.
    *   Outstanding Revenue Leak: 200 * $700 = $140,000 / month.
    *   NWS ROI: A $299/mo (Entry) or $497/mo (Growth) SaaS subscription pays for itself if Aria recovers just one safety-declined brake or tire repair a month.

---

## 2. The Mechanism Rule
*   **Rule**: Never pitch general advertising or SEO. Pitch the safety-declined repair database-to-WhatsApp recovery mechanism.
*   **Outcome-Only (Skip)**: "We will get your service bay 100 new repair jobs next month."
*   **Mechanism-Led (Use)**: "We set up an easy daily/weekly CSV export procedure from your dealer management system (DMS) that maps to a custom GHL workflow, triggering a WhatsApp safety follow-up 24 hours post-visit, offering a service discount and scheduling repair booking slots."

---

## 3. Who to Chase vs. Who to Skip
*   **Chase**:
    *   Franchise dealership service managers (Honda, Toyota, BMW, etc.).
    *   Multi-bay independent repair centers.
    *   Service directors managing regional dealer groups.
*   **Skip**:
    *   Custom modification or tuner shops (low volume, highly custom).
    *   Small single-bay mechanics without software calendars.
    *   Dealerships without any DMS software.

---

## 4. The Referral Substitute (Name-Dropping)
*   **Concept**:
    *   *Tier 1 (Personal)*: "We set up this safety recovery trigger for Service Manager Dave at Apex Motors..."
    *   *Tier 2 (Niche)*: "We set up this DMS-to-WhatsApp sequence for a Toyota dealership in Denver..."
    *   *Tier 3 (General)*: "We work with Service Director Marcus at Capital Dealership Group..."

---

## 5. Where to Get Contact Data
*   **Sourcing**:
    *   Multi-regional: Dealership group registries, national automotive dealer associations, local business maps.
*   **Verification**: Target the Service Manager or Service Director. Run verifications to ensure email lists are active.

---

## 6. The 4-Sentence Cold Outreach Script
Send via Email or WhatsApp.

~~~text
Subject: declined repairs at [Dealership Name]

I noticed your service advisors don't have an automated WhatsApp follow-up trigger for safety-declined repair orders (brakes, tires) after a customer drives away.

How are your advisors currently following up on the estimated $140k/mo in outstanding safety repairs sitting in your DMS?

We built a WhatsApp safety-declined recovery sequence for Service Manager Dave at Apex Motors that recovered $14,000 in declined services in 30 days.

Worth checking out how we reactivate these declines?
~~~

---

## 7. GHL Setup SOP & Interactive Zoom Demo
*   **GHL Configuration**:
    *   Create custom fields: 'Declined Repair Description', 'Service Advisor Name', 'Safety Coupon Code'.
    *   Import the daily safety-declined CSV export from the dealership's DMS into GHL using our pre-mapped custom fields.
    *   Set up workflow trigger: Tag 'declined-service' added. Send WhatsApp safety alert 24 hours post-service.
*   **Zoom Live Demo Script**:
    *   *Step 1*: Upload a mock declined repair order CSV.
    *   *Step 2*: Open WhatsApp on screen. Show Aria texting the client 24 hours later with a safety warning, brake coupon, and loaner vehicle option.
    *   *Step 3*: Reply: "Book Thursday." Aria confirms the slot and assigns the commission to the original advisor.

---

## 8. Landing Client #1 From Zero
*   **Play**: Target a local dealer with high volume.
*   **The Offer**: "We will run a free 2-week Database Reactivation pilot. You export your safety-declined ROs from the last 30 days, we upload them, and trigger the WhatsApp recovery sequence. If we recover less than $2,000 in repairs, you owe us nothing. If we do, we ask for a testimonial and move to a standard $497/mo plan."
`
  },
  {
    type: 'guide',
    title: 'Workstation Operations Manual',
    description: 'Interactive step-by-step handbook on utilizing the Sales Workstation pipeline, call assistant, and toolset.',
    content: `# Workstation Operations Manual

Welcome to the Novelty Web Solutions (NWS) Sales and Onboarding Workstation. This guide details how to operate the client onboarding pipeline, dynamic tools, call assistant, and client playbooks, specifically aligning with our Extendly technical delivery partnership.

---

## 1. Division of Labor: NWS vs. Extendly
To prevent operational overlaps, we maintain a strict boundary between NWS and our technical delivery partner (Extendly). Extendly does NOT have access to this Workstation; it is for NWS internal team members only.

* **NWS Internal Team Role**:
  - Conduct Discovery/Prospecting calls with the client.
  - Compile the **Client Playbook** and run the **Active Tools** to provision GHL sub-accounts and generate prompts.
  - Export the unified Handover Report and submit it to Extendly.
* **Extendly Partner Team Role**:
  - Receive the handover details and prompts from NWS.
  - Conduct the Tech Call, Training Call, and Launch Call sequentially on behalf of NWS.
  - Handle all 24/7 technical support.

---

## 2. Live Call Assistant Workspace
The **Call Assistant** tab is the AM's cockpit during calls. Select the client/prospect and choose the call type:

### A. Prospecting / Discovery Call
Follow these sequential steps to run discovery:
1. **Niche Discovery**: Establish practice size, baseline metrics, and primary high-value offerings.
2. **Leak Audit Math**: Input values into the whiteboard calculator to show the prospect their estimated annual revenue leak. Apply the calculated data to your notes.
3. **Mechanism Pitch**: Present the Aria automated WhatsApp/Email chatbot. Explain how organic chat widgets and database reactivation replace paid ads.
4. **Target Alignment**: Confirm if they fit target cash-pay elective specialties (plastic surgery, med spas) and avoid corporate networks.
5. **Playbook Blueprint**: Auto-populate the client playbook profile.

### B. Onboarding / Handover Call
Track the technical onboarding progress of Extendly's checklist:
1. **Tech Setup**: Track domain DNS configuration, user accounts, and calendar connections.
2. **AI Settings**: Specify autopilot rules, Aria prompts, FAQs list, and Review AI star rules (auto 4-5 stars, suggestive 1-3 stars).
3. **Training Syllabus**: Track CRM contacts training, opportunities card drag-drop, social planner review posting, and invoicing payment links.
4. **Live Launch Tests**: Track live dialing Q&A tests, routing transfer triggers, and calendar booking events.
5. **Handoff Sign-off**: Verify GHL custom values, LeadConnector mobile app download, and brand assets.

---

## 3. Real-Time Note Taking & Notes Merging
During any active call, AMs can:
* Write private comments in the **AM Notes** pane.
* Turn on **Simulate Transcript** to watch the dialogue stream. As technical keywords are spoken (e.g. subdomains, email, reviews mode), Aria will automatically populate the **AI Auto-Notes** pane.
* Click **Compare & Merge** to open the side-by-side modal. Review AM notes and AI auto-notes, then click **AI-Assisted Merge** to generate a combined, structured Handover Report.
* Click **Confirm & Export** to save the report to the client's file, mark all cards as Ready, and download a \`.md\` handover file to send directly to Extendly.

---

## 4. Account Manager Meeting Scripts

These scripts provide a structured talking-point framework for running client discovery and technical onboarding sessions. They cut down preparation time and ensure all technical/sales parameters are captured.

### A. Prospecting & Discovery Call Script (20 Mins)

*   **1. The Hook (First 2 Mins)**
    *   **Talking Point**: Pivot immediately to speed-to-lead.
    *   **What to say**: *"Thanks for taking the call. We aren’t a typical marketing agency trying to sell you ads or clicks. We analyze systems. I was auditing your online presence and noticed a response lag on your incoming customer inquiries. In your industry, if a prospect isn't contacted in 5 minutes, close rates drop 80%. Let's see what that delay is costing you."*
*   **2. Diagnostic Math (5 Mins)**
    *   **Talking Point**: Run the numbers using the Live Call whiteboard calculator.
    *   **What to say**: *"Let's do some quick math. How many inquiries or missed calls does your business get per month? Let's say 100. If 20% are missed, that's 20 clients gone straight to your competitor. If a client is worth $1,000, that's a $20,000 monthly leak. Does that sound like a leak worth plugging?"*
*   **3. Introducing the Mechanism (5 Mins)**
    *   **Talking Point**: Focus on the organic Aria assistant widget.
    *   **What to say**: *"We solve this without buying ads. We install a custom WhatsApp web chat widget and an AI receptionist named Aria. Aria answers in under 10 seconds, qualifies their intent, and books the appointment directly in your calendar. It works 24/7."*
*   **4. The Demo Pivot (5 Mins)**
    *   **Talking Point**: Get them to try it live.
    *   **What to say**: *"Don't take my word for it. Grab your phone and text/call our demo line. Try to trip Aria up. Let me know what you think of the response speed."*
*   **5. Pricing Close (3 Mins)**
    *   **Talking Point**: Frame the $299 pricing floor.
    *   **What to say**: *"Our setup is simple. We build the website widget, configure Aria's knowledge base, and hook up the WhatsApp booking triggers for a standard flat SaaS subscription of $299/mo. If Aria recovers just one client every two months, she pays for itself. Let's get the playbook started."*

### B. Onboarding & Handover Call Script (30 Mins)

*   **1. Framing the Call (2 Mins)**
    *   **Talking Point**: Set expectations for technical mapping.
    *   **What to say**: *"Welcome to your onboarding call! Today we're locking in the exact technical details (subdomains, emails, review rules) so our engineering team (Extendly) can build and launch your custom suite. I'm going to follow a 6-step checklist to ensure everything is documented."*
*   **2. Tech Configuration (10 Mins)**
    *   **Talking Point**: Get domain and calendar credentials.
    *   **What to say**: *"First, we need a subdomain for your calendar and widgets—something like booking.[yourdomain].com. I'll need your DNS logins (GoDaddy/Cloudflare) or I can send DNS records for your team to copy-paste. We also need to connect your GHL user profiles to Google/Outlook calendars."*
*   **3. Aria AI Persona & Training (8 Mins)**
    *   **Talking Point**: Define Aria's tone and FAQ rules.
    *   **What to say**: *"Aria is your new digital employee. Should her tone be casual and friendly, or strictly clinical/professional? Also, what are the top 5 questions customers ask about your services? We will load these into Aria's brain so she can answer instantly."*
*   **4. Review AI Rules (5 Mins)**
    *   **Talking Point**: Star-rating configuration.
    *   **What to say**: *"For customer reviews, we want automated triggers. When a job is completed, Aria sends a WhatsApp review request. If they rate you 4-5 stars, the system automatically redirects them to your public Google profile. If they rate you 1-3 stars, it routes them to an internal feedback form so you can resolve the issue privately. Does that work?"*
*   **5. Verification & Final Handoff (5 Mins)**
    *   **Talking Point**: Download mobile app and finalize specs.
    *   **What to say**: *"We are all set. Please download the 'LeadConnector' app on your phone—this is where you will see Aria chatting with clients in real-time. I am merging our call notes into a Handover Report and submitting it to our partner engineers (Extendly). They will conduct your training call next and verify all live triggers. Welcome to the team!"*
`
  },
  {
    type: 'guide',
    title: 'AI Business Suite: Pricing & Offer Playbook',
    description: 'NWS pricing tiers, positioning trees, value-stacking templates, and sales objection handling scripts.',
    content: `# AI Business Suite: Pricing & Offer Playbook

This playbook outlines Novelty Web Solutions' (NWS) pricing tiers, positioning trees, and sales scripts for the AI Business Suite (Voice AI + Conversation AI + Review AI).

---

## 1. The $299 Pricing Floor
* **The Sweet Spot**: Always price the entry-level AI Business Suite at **$299/month**.
* **The Economics**: 
  - GHL platform/sub-account cost: $97/mo.
  - Unlimited AI Employee add-on: $99/mo.
  - Delivery cost base: ~ $39-50/mo.
  - Total NWS Cost: ~ $139-149/mo.
  - At $299/mo, NWS makes a healthy **$150+ net margin** per client.
* **No Setup Fees at Entry**: Margin absorbs initial setup costs. Eliminates sales friction and ensures faster closing times. Only charge setup fees for highly custom work ($597+/mo plans).

## 2. Lead-Source Positioning Tree
The success of Voice AI, Conversation AI, and Review AI relies on active customer engagement. If there are no current inquiries or contacts, the AI sits idle. We solve this by leveraging their existing database (manual CSV exports/imports) or setting up directory syndication.

Does the prospect have active inbound traffic or calls?
  |
  +---> [YES] ---> AI Business Suite (Missed-Call Text-Back & Web Chat)
  |                  - Focus: Capture existing missed calls & website visits immediately.
  |                  - Price: $299/mo (No setup fee)
  |
  +---> [NO]  ---> Database Reactivation & Directory Syndication
                     - Focus: Set up organic listings via Yext and run manual CSV database reactivation campaigns.
                     - Price: $297 - $497/mo (Yext Listing Bundle) or $1,500 - $5,000 Custom Website Setup.
                     - Ascension: Transition them to AI Business Suite subscriptions once contact channels are active.
~~~

---

## 3. Pricing Tiers & Customization

| Tier | Price | Setup Fee | Deliverables |
| :--- | :--- | :--- | :--- |
| **Entry Suite** | $299/mo | None | Standard templates for Voice AI (receptionist), Conversation AI, and Review AI. |
| **Growth Suite** | $397-497/mo | Optional | Light customization, industry-specific conversation greetings, and rules. |
| **Premium Custom** | $597-997/mo | $500-1500 | Custom Voice AI agents (outbound dialing, calendar bookings), deep FAQ knowledge bases. |
| **Enterprise** | $997+/mo | $1500+ | Multi-location setups, department routing, enterprise SLAs, and ongoing optimization. |

---

## 4. Sales Script: Stacking the Value (Demo Close)
* **Rule**: Sell the outcome, not the tech. Do not offer free trials; let them experience the live demo instead.
* **The Script**:
  > "For $299 a month, you get a full digital employee suite:
  > 1. **Voice AI**: A 24/7 AI receptionist answering every missed call, even at 2 AM.
  > 2. **Conversation AI**: A web chat widget capturing visitors who would otherwise leave.
  > 3. **Review AI**: Automated review requests post-visit to stack 5-star Google ratings.
  > 4. **Missed Call Text-Back**: If a call slips through, the system text-backs instantly.
  > 5. **LeadConnector App**: Monitor all conversations in real-time from your phone.
  > I handle the setup on your account. Dial this number right now to test the live demo."

---

## 5. Overcoming Pricing Objections
* **Objection**: *"That is too expensive."*
  - **Framework**: Shift to ROI. *"I hear you. How much is a single new client worth? If Aria recovers just one missed call/appointment every two months, it pays for itself. Everything else is pure profit."*
* **Objection**: *"I'm not sure it will work for my specific business."*
  - **Framework**: Demo close. *"Let's test it right now. Try to trip up the demo agent. That is the exact quality your customers will experience."*
* **Objection**: *"I need to think about it."*
  - **Framework**: Uncover the real concern. *"What specifically do you need to think through? Price? Setup timing? Let's clarify now so you can make an informed decision."*
`
  }
];

async function run() {
  console.log("[Seeding Sales Academy] Starting insert of 7-industry assets...");
  
  // Clean up old guides that might conflict
  const { error: deleteError } = await supabase
    .from('training_resources')
    .delete()
    .like('title', '%Guide%');

  if (deleteError) {
    console.error("Warning during cleanup:", deleteError);
  }

  // Clean up old objection guides too
  const { error: deleteErrorObjections } = await supabase
    .from('training_resources')
    .delete()
    .like('title', '%Objection%');

  if (deleteErrorObjections) {
    console.error("Warning during cleanup of objections:", deleteErrorObjections);
  }

  // Clean up operations manual too
  const { error: deleteErrorOps } = await supabase
    .from('training_resources')
    .delete()
    .like('title', '%Manual%');

  if (deleteErrorOps) {
    console.error("Warning during cleanup of manual:", deleteErrorOps);
  }

  // Clean up playbooks too just in case
  const { error: deleteErrorPlaybooks } = await supabase
    .from('training_resources')
    .delete()
    .like('title', '%Playbook%');

  if (deleteErrorPlaybooks) {
    console.error("Warning during cleanup of playbooks:", deleteErrorPlaybooks);
  }

  const inserted = [];
  for (const asset of assets) {
    const { data, error } = await supabase
      .from('training_resources')
      .insert(asset)
      .select()
      .single();

    if (error) {
      console.error(`Error inserting asset "${asset.title}":`, error.message);
    } else {
      console.log(`Inserted asset: "${data.title}" (ID: ${data.id})`);
      inserted.push(data);
    }
  }

  console.log(`[Seeding Sales Academy] Successfully seeded ${inserted.length} resources!`);
}

run();
