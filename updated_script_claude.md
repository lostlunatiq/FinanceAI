# 🏦 Tijori AI — Intelligent Financial Vault
## Hackathon Presentation Script — ENHANCED EDITION
### Team 14 · Data Dakait · 3SC Solutions
### ⏱ Total Time: 22–25 Minutes

---

> ### HOW TO READ THIS SCRIPT
> - 🎤 **Normal text** = Speak this out loud, word for word
> - 🖱️ *[Italics in brackets]* = What to CLICK or DO on screen right now
> - 💡 **[PRESENTER TIP]** = Body language / delivery advice
> - ⏱ **[TIME CHECK]** = Approximate time elapsed
> - 🔐 **Login boxes** = Exact credentials to type, copy from here

---
---

## 🎬 PART 1 — THE ENTRANCE (Don't Skip This)
### ⏱ 0:00 — 2:00 min

---

*[Walk up confidently. Don't rush. Take a breath. Smile at the judges.]*

*[Make sure the app is already open in the browser but on the login screen. Don't show anything yet.]*

---

"Good [morning/afternoon], everyone."

"My name is **[Speaker 1 name]**."

"And we are — **Data Dakait.**"

*[Pause. Let it land. Maybe a small grin.]*

"Yes. Data Dakait. Because we steal data problems from finance teams and solve them before they become disasters."

*[Quick wave to teammates]*

"With me is **[Speaker 2]** and **[Speaker 3]** — together we are Team 14, building for **3SC Solutions**."

"Now — I could start with a slide about our architecture. I could show you a system diagram. I could talk about microservices."

"But instead — let me tell you about **Arjun Sharma.**"

*[Pause. Look at the judges.]*

---

### 🧔 THE STORY OF ARJUN SHARMA (The CFO Who Lost His Weekend)

---

"**Arjun Sharma** — username `arjun.sharma` in our system — is the CFO of a mid-sized company, 3SC Solutions. Smart guy. MBA from IIM. 15 years of experience."

"Every Friday evening, Arjun's phone rings. It's his finance manager."

*[Do a mock phone gesture. Light laugh.]*

"'Sir, the vendor payment approval is stuck. Infosys submitted their bill on Tuesday. It's been sitting in Priya's inbox. Priya forwarded it to Vikram. Vikram is in Bangalore. The bill needs three signatures. By Monday we miss the 45-day MSME deadline and we lose our Section 43B tax deduction.'"

"Arjun opens his laptop. On a Friday night."

"He goes into email. Finds the bill. It's a PDF. He needs to check if the GSTIN is correct. He opens a government portal. Checks manually. Downloads the verification."

"Then he forwards it to accounting. Accounting re-types the amount into the ERP. They make a typo. ₹1,24,500 becomes ₹12,45,000. The payment goes wrong."

"Monday morning — audit flag. Vendor calls furious. Finance team scrambles."

*[Beat.]*

"This is not a story I made up. This is Tuesday at 3SC. This is Tuesday at thousands of Indian enterprises."

"**Finance teams spend 60 to 70 percent of their time on things that should never require human intervention.**"

---

### 💥 THE REAL PROBLEMS (Slide 2)

---

*[Click to Slide 2 — The Problem]*

"Six pain points. Real ones:"

**"One — Manual bill processing.** 40-plus hours per week. Someone opens a PDF, re-types every line item into the ERP. That's Arjun Sharma's team — and thousands like him."

**"Two — Approvals on WhatsApp.** No audit trail. Bills stuck 2 to 3 weeks on average. Priya forwards on email, Vikram replies on WhatsApp, nobody knows the actual status."

**"Three — Budget overruns found at quarter-end.** 15 to 20 percent overspend goes undetected. By the time someone notices — the money is gone."

**"Four — Compliance tracked in Excel.** GST. TDS. MSME 45-day rule. Section 43B(h). All maintained in a spreadsheet that breaks if you accidentally press Delete."

**"Five — Vendor bank-change fraud.** Vendor sends an email: 'Please update our bank account.' Finance team updates it. Funds transferred. Vendor calls next month asking where payment is. It went to a fraudster."

**"Six — Duplicate and inflated bills.** Spot-checks cover maybe 10% of invoices. The other 90%? Hope for the best."

*[Pause.]*

"Arjun Sharma deserves better. Finance teams deserve better. Indian enterprises deserve better."

"So — we built **Tijori AI.**"

---
---

## 🧠 PART 2 — THE SOLUTION (Slide 3)
### ⏱ 2:00 — 4:00 min

---

*[Click to Slide 3 — Solution]*

"Tijori — in Hindi — means **vault**. A secure, trusted place where your money and your data are safe."

"Tijori AI is an intelligent layer that sits on top of your existing ERP. We don't replace your accounting system. We make it **10 times smarter**."

"Four pillars:"

"**Pillar One — AI-First Ingestion.** Vendors submit bills through a self-serve portal. Our Claude Sonnet 4 Vision model reads the PDF — extracts vendor name, GSTIN, HSN codes, every line item, GST breakup, net payable — in about 6 seconds. Zero re-typing. Zero typos."

"**Pillar Two — Smart Workflows.** A structured 6-step approval chain. L1 checker → L2 reviewer → Department Head → Finance L1 → Finance L2 → CFO. Segregation of Duties is hard-coded — the person who submits cannot approve their own bill. Same person cannot approve at two levels."

"**Pillar Three — Always-On Compliance.** MSME 45-day clock ticking automatically. GST and TDS preparation. Section 43B exposure flagged before quarter-end. Not by a human — by the system, 24 hours a day."

"**Pillar Four — CFO Copilot.** Arjun Sharma types: 'Which vendor has the highest spend this quarter?' He gets an answer in 2 seconds. What used to take 2 days of Excel — now 2 minutes."

"11 modules. One platform. Let me show you."

---

### ⚡ TECH STACK (Slide 4 — Quick Fire)

---

*[Click to Slide 4 — Tech Stack]*

*[Speak confidently and fast here — judges appreciate technical fluency]*

"Production-grade stack:"

"Frontend — **React 18, TypeScript, Tailwind CSS.** Compiled to static assets, zero-latency rendering."

"Backend — **Django 5, Django REST Framework, JWT authentication, OpenAPI docs.**"

"Async jobs — **Celery plus Redis.** OCR pipeline, SLA timers, anomaly scans — all non-blocking."

"AI — **Claude Sonnet 4** from Anthropic for Vision OCR and natural language. **Isolation Forest** for anomaly detection — academic paper by Liu, Ting, Zhou 2008. **Prophet** from Meta for time-series cash flow forecasting."

"Data — **PostgreSQL 16, Redis cache, MinIO blob store** — S3 compatible."

"Integration — **Microsoft Dynamics 365 Business Central** via OData v4 adapter. Plug and play with real D365 in production."

---

### 🔄 THE FLOW (Slide 5 — 30 seconds)

---

*[Click to Slide 5 — Architecture]*

"End to end — 6 steps:"

"Vendor uploads PDF → Claude Vision extracts every field → Rules engine plus Isolation Forest validates and scores it → 6-step human approval chain → D365 adapter books the purchase invoice → Payment triggered, compliance confirmed, CFO dashboard updated."

"Now — let me show you **exactly this flow**. Live. With real data. No mocks."

*[Click to Slide 6 or switch to browser]*

---
---

## 🖥️ PART 3 — LIVE DEMO
### ⏱ 4:00 — 19:00 min

---

> ### 🎯 BEFORE YOU START THE DEMO:
> - Browser open, app URL loaded, login screen visible
> - Keep this script open on second monitor or printed
> - Speak calmly — the system is fast, don't rush ahead of it
> - If anything loads slowly — fill the silence by narrating what's happening

---

### 👔 ACT 1 — THE VENDOR (Infosys submits a bill)
### ⏱ 4:00 — 6:00 min

---

---
🔐 **LOGIN NOW:**
```
Username: vendor.infosys
Password: demo1234
```
---

*[Type credentials slowly and clearly. Hit Login.]*

"This is the **Vendor Portal**. Infosys — one of our registered suppliers — logs in here using the username `vendor.infosys`."

"Notice — **no onboarding training required.** Any accounts-receivable clerk at Infosys can use this. It's intentionally simple."

*[Point to the dashboard stats cards at the top]*

"Right away, Infosys sees their complete billing picture — how many bills are pending review, how many are approved, what's the total amount paid out to them. Real-time. No phone calls to our finance team needed."

*[Click on Submit Invoice or Upload Bill button]*

"Now — Infosys has a new bill to submit. They click Submit Invoice."

*[Point to the upload area]*

"They drag and drop their PDF here. And here is where the magic begins."

*[If you can, actually upload a PDF — or if pre-loaded, show the extracted result screen]*

"Our **Claude Sonnet 4 Vision** model fires immediately. In about 6 seconds — watch — it extracts:"

*[Point to each field as you name it]*

"Vendor name — Infosys. Invoice number — automatically read. Invoice date — captured. **GSTIN** — Goods and Services Tax Identification Number — pulled from the footer of the bill. HSN codes — line by line. Each line item — description, quantity, rate, amount. GST breakup — CGST, SGST or IGST. Net payable. Everything."

"**Zero typing. Zero typos. Zero Friday-night laptop opens.** The call is cancelled."

*[Navigate back to the bill list]*

"Now Infosys sees this bill in their list — status: **Under Review**."

*[Click on the bill to open the detail view]*

"They click in to see the detail — and here they can see exactly which step of the approval chain their bill is at. Step 1 of 6 — Finance Check. Who is reviewing, how long it's been there."

"No more 'where is my payment' emails. Full transparency — self-serve."

"One more critical feature here — if Infosys is **MSME registered**, the system has already started a 45-day countdown clock from the moment this bill was submitted. Day 40 — Finance Admin gets an alert. Day 44 — CFO gets alerted. Day 45 — compliance flag. No human needs to track this in Excel anymore."

*[Logout]*

---

### 💼 ACT 2 — FINANCE ADMIN (The bill lands, gets processed)
### ⏱ 6:00 — 8:30 min

---

---
🔐 **LOGIN NOW:**
```
Username: priya.nair
Password: demo1234
```
---

*[Login. Wait for dashboard to load.]*

"We are now **Priya Nair — Finance Admin, Grade 4** — username `priya.nair`. She is the backbone of accounts payable operations."

*[Navigate to AP Hub from the nav bar]*

"Priya opens her **AP Hub** — the command center for all vendor bill processing."

*[Point to the queue of bills]*

"Here she sees every pending vendor bill. Vendor name, invoice amount, submission date, number of days pending, and — critically — the **Anomaly Score.** We'll come back to that in a moment."

*[Find and click on the Infosys bill that was just submitted]*

"Here is the Infosys bill. All fields pre-populated by Claude Vision — Priya didn't type a single character. She reviews:"

*[Point to each section]*

"Vendor details — correct. Invoice amount — matches the PDF. GSTIN — verified against the GST portal. Bank account details — we have a cooling period enforced. If a vendor changes their bank account, the new account cannot be used for 72 hours. That's our answer to vendor bank-change fraud."

*[Point to the anomaly score badge]*

"Anomaly score — low. 14 out of 100. Isolation Forest says this bill is clean. Matches Infosys's historical billing patterns."

*[Click Approve]*

"She approves. The system moves the bill to Step 2. The vendor gets an instant notification."

"**The audit trail records this action — who approved, when, from which device, what the bill amount was.** Tamper-proof. We'll show that log shortly."

---

#### 👥 IAM — USER MANAGEMENT

---

*[Navigate to Settings → IAM or User Management]*

"Priya is also the system administrator. She manages all users from here."

*[Show the user list]*

"Every employee in the company has a profile here. Grade 1 — regular employee. Grade 2 — Head of Department. Grade 3 — Finance Manager. Grade 4 — Finance Admin. Grade 5 — CFO."

*[Click on one user to show the edit panel]*

"She can create a new user, assign their grade, link them to a department, set their vendor linkage if they're a vendor account. No code changes. No IT tickets. She does it herself."

"This grade number is not just a label — it controls **every single screen, every API endpoint, every data filter** in the system. The grade IS the access control."

---

#### 📊 BUDGET MANAGEMENT

---

*[Navigate to Budget from the nav bar]*

"Priya also owns budget management. She's set up department-wise budgets here."

*[Show the budget list — Engineering, HR, Operations, Marketing]*

"Each budget has a total allocation, current utilization, and status. See Engineering — 73% utilized. That's within the acceptable range. If it crosses 90%, Engineering HOD gets an automatic alert. If it crosses 100%, expenses from that department are hard-blocked until the CFO unlocks it."

"**Budget overruns — found in real time, not at quarter-end.**"

*[Logout]*

---

### 🚨 ACT 3 — ANOMALY DETECTION (Where AI catches what humans miss)
### ⏱ 8:30 — 11:00 min

---

*[Stay logged in as priya.nair OR login as vikram.mehta — Finance Manager has a great anomaly view too. Either works.]*

*[Navigate to Anomaly Dashboard from the nav bar]*

"This is the **Anomaly Dashboard** — and this is where Tijori AI earns its keep."

"Every invoice that enters the system — whether it's a vendor bill or an employee expense — is scored by our **Isolation Forest** machine learning model."

"Isolation Forest works on a simple but powerful idea: **normal transactions form clusters. Anomalies are isolated — they stand apart.** The algorithm scores how isolated each transaction is. High score means high suspicion."

*[Point to the list — show HIGH score anomalies in red at the top]*

"The anomalies are ranked by risk score. Highest risk at the top."

*[Click on a HIGH score anomaly — one with score 80+]*

"Let me open this one. Score — 87 out of 100."

*[Point to the detail panel that opens on the right]*

"The detail panel shows us everything:"

"Vendor — let's say this is a vendor we've seen before. Invoice amount — ₹4,80,000. But our Isolation Forest says this is unusual. Why?"

*[Point to the AI explanation or anomaly flags]*

"Look — this vendor's average invoice to us historically is ₹95,000. This bill is five times that amount. And the invoice date is a Saturday. And the invoice number pattern doesn't match their previous sequence."

"None of these alone is proof of fraud. But together — this combination is statistically anomalous. The AI flags it. A human decides."

*[Point to vendor history section if visible]*

"We also show the vendor's rejection history. This vendor had 2 previous invoices rejected. Context matters."

*[Point to the Escalate button — but note it's NOT showing for CFO]*

"Finance Manager or Finance Admin can escalate this to the CFO directly from here. One click — the CFO gets a notification, the bill is marked CRITICAL, it jumps to the top of the CFO's queue."

*[Click Mark as Safe on a different, lower-risk anomaly]*

"For anomalies the team has reviewed and found legitimate — they mark it safe with a reason. 'Vendor confirmed this is a project milestone payment.' Logged. Auditable."

"**AI Feedback Loop** — every decision your team makes — escalate, mark safe, reject — feeds back into the model. The system learns your company's specific patterns over time. It gets smarter the longer you use it."

*[Show the stats at the top of the anomaly page if visible]*

"At a glance — total anomalies flagged this month, how many are critical, how many resolved. Finance leadership always knows the exposure."

---

> **💡 PRESENTER TIP:** The anomaly section tends to impress judges the most. Slow down here. Let the numbers sink in. Don't rush to the next section.

---

*[Logout]*

---

### 👩‍💼 ACT 4 — THE EMPLOYEE (Neha submits an expense)
### ⏱ 11:00 — 12:30 min

---

---
🔐 **LOGIN NOW:**
```
Username: neha.gupta
Password: demo1234
```
---

*[Login. Show the employee home screen.]*

"Meet **Neha Gupta — Employee, Grade 1** — username `neha.gupta`. She just got back from a client meeting in Mumbai. Flight, hotel, meals — she needs to claim ₹18,500 in travel expenses."

"Before Tijori AI — Neha fills out a Google Form. Attaches receipts. Sends to her manager on email. Manager forwards to HOD. HOD forwards to Finance. Finance sends it to Admin. Three weeks later, Neha gets her reimbursement — or a rejection with no explanation."

"With Tijori AI —"

*[Navigate to Expenses → Submit New Expense or New Claim button]*

"Neha clicks **Submit Expense.** Fills in the form:"

*[Narrate as you fill or point to a pre-filled form]*

"Category — Travel. Amount — ₹18,500. Date — today. Description — Client meeting, Mumbai. She attaches the receipt photo."

*[Click Submit]*

"She hits submit. What happens in the next 3 seconds:"

"**One** — System checks if ₹18,500 travel expense is within the budget allocation for Engineering department. It is. Green."

"**Two** — Isolation Forest checks if this is unusual for Neha. She's claimed similar amounts before for client trips. Score — 12. Clean."

"**Three** — The claim is automatically routed to her HOD — Divya Krishnan, Engineering HOD — for approval."

"**Four** — Neha gets a notification confirming submission."

*[Click the bell icon — show notifications panel]*

"See — right here. Notification: 'Your expense claim ₹18,500 has been submitted and is pending HOD approval.'"

*[Point to the notification item]*

"Every status change — approved at HOD level, forwarded to Finance, approved for payment, actually paid — Neha gets a notification here."

"And — we've implemented **browser push notifications.** Even if Neha closes this tab and is working on something else — when her claim gets approved, a push notification pops up on her screen. No need to keep checking the app."

*[Show her expense in the list with PENDING status]*

"She can see the live status here. No more chasing anyone. She knows exactly where it is."

*[Logout]*

---

### 🏢 ACT 5 — THE HOD (Divya's department view)
### ⏱ 12:30 — 14:30 min

---

---
🔐 **LOGIN NOW:**
```
Username: divya.krishnan
Password: demo1234
```
---

*[Login. Show the HOD dashboard.]*

"We're now **Divya Krishnan — Head of Engineering, Grade 2** — username `divya.krishnan`."

"And here I want to highlight something that our judges will appreciate — because this is a security feature, not just a UI feature."

*[Point to the dashboard stats]*

"Everything Divya sees — every number, every expense, every budget line — is **scoped to Engineering department only.** She cannot see HR's expenses. She cannot see Ops's budgets. She cannot see Marketing's vendor bills."

"Now — you might think: 'okay, you just hide the other departments in the UI.' No. That's not how we do it."

"**This filter is applied at the Django ORM level — at the database query itself.** Even if someone bypassed the frontend and called our API directly with Divya's JWT token, they would only get Engineering data. The filtering happens before the data leaves the database."

"We tested this explicitly. Grade 2 user sees only their department. Always."

*[Navigate to Expenses or AP Hub]*

"Divya's queue — only Engineering employees. Neha's ₹18,500 travel claim is right here."

*[Click on Neha's expense to open it]*

"Divya reviews it. Looks legitimate. Client meeting — yes, she approved the trip. Amount is within normal range."

*[Click Approve]*

"She approves. The claim moves to Finance Manager. Neha gets a notification instantly."

*[Navigate to Budget]*

"Divya also sees her department's budget here. Engineering — total allocation, current spend, remaining amount, month-by-month utilization."

*[Point to the utilization bar — if it's at 73%, point to that]*

"73% utilized. Two months left in the quarter. She's tracking well. If this hits 90%, she'll get an automatic alert — before it becomes a problem."

*[Navigate to Anomaly if visible in HOD nav]*

"Even in the anomaly view — Divya only sees anomalies from Engineering. A suspicious bill from an HR vendor? She doesn't see it. Doesn't need to. Full isolation."

*[Logout]*

---

### 📈 ACT 6 — FINANCE MANAGER (Vikram sees the big picture)
### ⏱ 14:30 — 16:30 min

---

---
🔐 **LOGIN NOW:**
```
Username: vikram.mehta
Password: demo1234
```
---

*[Login. Show the Finance Manager home.]*

"**Vikram Mehta — Finance Manager, Grade 3** — username `vikram.mehta`. Where Divya sees Engineering, Vikram sees everything."

*[Navigate to Spend Analytics — or whatever the cross-dept analytics screen is called]*

"**Spend Intelligence** — cross-company spend breakdown."

*[Point to the department comparison chart]*

"Month-over-month spend by department. Engineering — up 23% this month. That's worth a conversation with Divya. Marketing — below budget. HR — flat."

*[Point to vendor risk panel if visible]*

"**Vendor Risk Matrix.** Which vendors have high rejection rates? Which ones are close to MSME 45-day breach? Vikram can see at a glance which vendor relationships need attention."

*[Navigate to Department Variance]*

"**Department Variance.** Budget versus actual, per department, in one screen. Click any department — drill in. See which expense category is driving the variance."

*[Navigate to AP Hub]*

"Vikram also sees the full AP queue. He can approve at his level — Finance L1 in our 6-step chain. He sees Neha's expense that Divya just approved — it's now waiting for his sign-off."

*[Click Approve on Neha's expense]*

"Approved. Moving to Finance Admin — step 5 of 6."

*[Navigate to Working Capital if available]*

"**Working Capital analysis.** Accounts payable aging — how old are our outstanding bills? Days payable outstanding — are we paying vendors too fast and straining cash? All computed from live transaction data."

"Vikram's job is to see patterns. Tijori AI surfaces them. He acts on insights, not on Excel."

*[Logout]*

---

### 🔏 ACT 7 — FINANCE ADMIN PART 2 (Audit Trail — the tamper-proof log)
### ⏱ 16:30 — 17:30 min

---

---
🔐 **LOGIN NOW:**
```
Username: priya.nair
Password: demo1234
```
---

*[Navigate directly to Audit Log / Audit Trail]*

"Back to **Priya Nair** (`priya.nair`) — but this time I want to show you something that separates enterprise-grade systems from weekend projects."

"**The Audit Trail.**"

*[Show the audit log list]*

"Every single action in the system is recorded here. Bill submitted by vendor — logged. OCR extraction completed — logged. Approved by HOD — logged. Escalated by Finance Manager — logged. Payment initiated — logged."

*[Click on one log entry to show the detail]*

"Each entry contains: who did it, what they did, which record they acted on, the old value, the new value, timestamp, IP address."

"But here's the critical part — **these log entries are SHA-256 hash-chained.**"

"Each entry contains a hash of its own content PLUS the hash of the previous entry. It's the same concept behind blockchain — but purpose-built for audit compliance."

"If anyone — even a database administrator — goes into the database and modifies a past audit record, the hash chain breaks from that point forward. The system detects it immediately."

"**Four layers of protection:** Application log → ORM event hook → Database trigger → SHA-256 hash chain."

"'How do I prove to a regulator that this approval was done correctly?' One screen. Full history. Chain of custody. Downloadable."

---

*[Navigate to Reports]*

"And Reports — Priya can generate GST summary for the month, TDS payable report, MSME exposure report, expense category breakdown — all from live data. Export to PDF."

*[Logout]*

---

### 👑 ACT 8 — THE CFO (Arjun's world, where everything comes together)
### ⏱ 17:30 — 22:00 min

---

---
🔐 **LOGIN NOW:**
```
Username: arjun.sharma
Password: demo1234
```
---

*[Login. Take a moment. The CFO dashboard should load with full stats.]*

"And finally — **Arjun Sharma. CFO. Grade 5.** Username `arjun.sharma`."

"This is the screen Arjun Sharma deserved all along."

*[Sweep your hand across the whole dashboard — speak slowly here]*

"At a glance — without opening a single spreadsheet — Arjun knows:"

*[Point to each KPI card]*

"Total YTD spend. Pending bills waiting for payment. Bills approved but not yet paid — his short-term liability. Anomaly count this month — how many suspicious transactions are under review. Company-wide budget utilization."

"Every number — live. Every number — real."

---

#### 📉 CASH FLOW FORECAST

---

*[Scroll down or navigate to the cash flow chart]*

"**90-day cash flow forecast — powered by Prophet.**"

"Prophet is Meta's open-source time-series forecasting model — the same methodology used for financial planning at some of the world's largest companies. We've implemented it on top of Arjun's actual transaction data."

*[Point to the forecast line on the chart]*

"This is Arjun's expected cash position over the next 3 months — based on historical expense patterns, outstanding approved bills, scheduled payments. He can see right now if a cash crunch is coming in week 7."

*[If scenario toggles are available — show them]*

"Base case, optimistic scenario, pessimistic scenario. Three projections, one screen. Capital planning, done."

---

#### 🤖 AI COPILOT — NATURAL LANGUAGE QUERY

---

*[Navigate to AI Hub → NL Query / Copilot section]*

"Here is where Arjun Sharma stops drowning in spreadsheets — forever."

"The **CFO AI Copilot.** Ask any financial question in plain English."

*[Type this in the chat box — slowly and clearly]:*
```
Which vendor has the highest spend this quarter?
```

*[Wait for response — point to the answer]*

"Real answer. Real numbers. From the live database. In under 3 seconds."

*[Type next question]*
```
Show me departments that are over 80% budget utilization
```

*[Wait for response]*

"No Excel. No phone call to Vikram. No waiting until Monday morning."

*[Type next question]*
```
What is our MSME payment exposure this month?
```

*[Wait for response]*

"Compliance question. Answered instantly. The system scanned every MSME vendor invoice outstanding, computed days pending, flagged exposure. A question that used to require a finance analyst's entire morning — 3 seconds."

"This is what we mean when we say: **2 days of Excel → 2 minutes.**"

---

#### 📄 MONTHLY FINANCIAL SUMMARY — GENERATE NOW

---

*[Navigate to AI Hub → Monthly Financial Summaries]*

"Every month, Arjun needs a financial summary — for the board, for the investors, for himself."

*[Point to the section heading and the existing month cards]*

"Tijori AI auto-generates this on the 1st of each month. But Arjun can generate it any time."

*[Click the green "Generate Now" button]*

"Watch what happens — this is NOT a template. This is a live data pull."

*[While it loads, narrate]*

"Right now, the system is pulling: YTD paid expenses, quarter-on-quarter change, top 5 vendors by spend, month-over-month expense trend for every month this year, anomaly breakdown — how many flagged, how many critical, how many resolved. Department budget utilization. Estimated GST and TDS obligations."

"Then — **Claude Sonnet 4 writes a formal 5-paragraph executive summary** from all that data. Like a CFO report written by a senior finance professional."

*[Modal opens — point to each section]*

"Eight stat cards at the top — YTD paid, Q paid, pending bills, QoQ change percentage, anomaly count, critical anomalies, estimated GST, estimated TDS."

*[Scroll down in the modal]*

"AI Executive Summary — 5 formal paragraphs. Executive Summary, Expense Analysis, Vendor Obligations, Risk and Compliance, Outlook."

*[Point to the vendor table]*

"Top vendors by spend — with amounts and invoice counts."

*[Point to the monthly trend table]*

"Month-by-month expense trend for the year — every month, actual paid amount, invoice count."

*[Point to the budget bars]*

"Department budget utilization — progress bars with color coding. Red means over 90%. Finance manager knows exactly where to focus."

*[Click Export PDF button]*

"**Export PDF** — this opens a fully styled, print-ready financial report in a new tab. Headers, tables, stat cards, everything formatted. And it auto-triggers the print dialog — save as PDF, done."

"Send to the board. File with auditors. Share with investors. **30 seconds, start to finish.**"

---

#### 🚨 CFO ANOMALY VIEW

---

*[Navigate to Anomaly]*

"Arjun also has the full anomaly dashboard. But notice —"

*[Point to where the Escalate to CFO button would be — and show it's ABSENT]*

"**There is no 'Escalate to CFO' button on Arjun's screen.** He IS the CFO. Bills get escalated TO him. Why would he escalate to himself?"

"This is a small detail — but it shows how thoughtfully role-based our UI is. Every role sees exactly what they need and nothing they don't."

*[Find an anomaly that was escalated by Finance Manager — it should have a CRITICAL badge]*

"This anomaly was escalated by Vikram earlier. Arjun can see who escalated it, when, the full AI scoring breakdown. He decides — reject the invoice, or mark it reviewed."

*[Click Investigate on the anomaly, show the full detail panel]*

"Full context. Vendor history. Why the score is high. What specifically triggered the model. Arjun makes an informed decision — not a gut feeling."

---

#### 💰 BUDGET HEALTH — COMPANY-WIDE

---

*[Navigate to Budget → Budget Health]*

"Budget health — every department, every budget, in one view."

*[Point to the utilization bars or table]*

"Color coded — green is healthy, amber is watch closely, red is over budget. Arjun can see in one glance if Engineering is overspending or if Marketing has budget headroom to absorb a reallocation."

"Real-time. No month-end reconciliation needed."

---

#### 🔔 NOTIFICATIONS CENTER

---

*[Click the bell icon — top right]*

"Last thing — notifications."

*[Show the notification list]*

"Every critical event in the system generates a notification for the relevant role. Vendor bill escalated — CFO notified. Budget breach threshold hit — CFO and Finance Admin notified. Anomaly marked critical — CFO notified. Employee expense approved — employee notified."

"All here in this panel. Timestamped. Linked directly to the relevant record — one click, full context."

"And — **browser push notifications** are enabled. Even if Arjun is in a different browser tab during a board meeting — a critical anomaly escalation will push to his screen. He doesn't miss things anymore."

*[Step back from the keyboard. Look at the judges.]*

---
---

## 🎯 PART 4 — THE IMPACT (Slide 7)
### ⏱ 19:00 — 20:30 min

---

*[Click to Slide 7 — Impact & Benefits]*

"Let me put this in numbers."

"Before Tijori AI — bill processing takes 2 to 3 weeks. With Tijori AI — **2 to 3 days. 85% faster.**"

"Finance team time on operational work — 70% of their week. With Tijori AI — **25%. That's 45% of your finance team's week freed up for actual analysis.** For strategy. For the work that MBAs were hired to do."

"Undetected budget overruns — 15 to 20% of quarterly spend. With Tijori AI — **under 2%. 90% reduction.**"

"MSME 45-day breaches — 5 to 10% of bills, every quarter. With Tijori AI — **zero. 100% compliant. Every time.**"

"CFO report generation — 2 to 3 days of a finance team's time. With Tijori AI — **2 minutes. That is a 1000x improvement.**"

"Duplicate bill detection — less than 10% coverage with manual checks. With Tijori AI — **over 95% coverage.** Isolation Forest doesn't take lunch breaks."

"These numbers are based on 3SC Solutions' own baseline — a real company, real pain, real operations."

---
---

## 🏁 PART 5 — THE CLOSE
### ⏱ 20:30 — 22:00 min

---

*[Click to final slide or stay on impact slide. Step away from the laptop. Face the judges directly.]*

"Let me quickly recap what you just saw:"

"A **vendor** — Infosys — submitted a PDF bill. Claude Vision read it in 6 seconds, extracted every field, started the MSME compliance clock."

"**Finance Admin** — Priya — processed it through a structured approval chain with a tamper-proof, hash-chained audit trail."

"**Anomaly Detection** — caught statistically suspicious invoices before they reached payment. Machine learning. Isolation Forest. No spot-checks."

"An **employee** — Neha — submitted a travel expense that flowed automatically up the chain, with real-time notifications at every step — including browser push."

"The **HOD** — Divya — saw only Engineering's data. Department isolation enforced at the database query level."

"The **Finance Manager** — Vikram — had cross-company visibility, spend intelligence, vendor risk, working capital — all live."

"And the **CFO** — Arjun — had a real-time command center. Natural language copilot. 90-day cash flow forecast. AI-generated board-ready financial reports. Full anomaly oversight. One-click PDF export."

*[Pause. Breathe.]*

"Arjun Sharma — our CFO — doesn't get the Friday evening phone call anymore."

"His finance team doesn't re-type invoices. They don't track MSME deadlines in Excel. They don't chase approvals on WhatsApp."

"They do what they were hired to do — **think, analyze, and create value.**"

"**That** is what Tijori AI delivers."

"We are **Team 14 — Data Dakait.** Thank you."

*[Smile. Step back. Wait for applause. Then: "We're happy to take questions."]*

---
---

## ❓ APPENDIX — JUDGES' Q&A READY ANSWERS

---

> *Read these before the presentation. You shouldn't need this paper during Q&A.*

---

**Q: What if Claude Vision makes an OCR mistake?**

"If any field's confidence score is below 85%, that field is flagged for human review. The bill cannot proceed in the approval chain until a human confirms the value. We never silently accept uncertain data. And every extraction result is stored — so we can audit the AI's decisions too."

---

**Q: Is the audit trail really tamper-proof?**

"Each audit log entry contains a SHA-256 hash of its own content plus the hash of the previous entry — a hash chain. Four layers: application log, Django ORM event hook, database-level trigger, and the hash chain. If anyone modifies a past record — even directly in the database — the chain breaks from that point forward and the system detects it."

---

**Q: How is role-based data isolation enforced?**

"At the Django ORM layer — every queryset has role-based filters applied server-side before data leaves the database. A Grade 2 HOD's JWT token, even if used to call the API directly, only returns their department's data. The frontend cannot override this. We tested this explicitly with direct API calls using HOD credentials."

---

**Q: What LLM are you using and what's the cost?**

"Claude Sonnet 4 from Anthropic — via OpenRouter as the gateway. For OCR we fire Vision on every invoice. For NL queries and monthly summaries, we call on demand. In a production scenario with 500 bills per day, estimated API cost is well under $50 per month — versus the cost of a junior finance associate re-typing those bills."

---

**Q: What happens if the AI or the API goes down?**

"Every AI feature has a graceful fallback. OCR fails — the manual data entry form appears, the bill still enters the system. NL query fails — structured filter UI is shown. Monthly summary fails — a pre-computed fallback based on raw database numbers is displayed. The workflow never blocks. The system degrades gracefully."

---

**Q: How does the MSME 45-day rule work technically?**

"At invoice submission, we check if the vendor is MSME-registered. If yes, a compliance timestamp is recorded. A Celery Beat scheduled job runs daily — it scans all outstanding MSME bills. Day 40 — Finance Admin alert. Day 44 — CFO alert. Day 45 — compliance flag raised, payment escalated to highest priority queue. Section 43B(h) exposure is computed and displayed on the CFO dashboard."

---

**Q: Can this scale to a large enterprise?**

"The architecture is designed for horizontal scale. Celery workers for OCR and anomaly scoring scale independently — add workers as volume grows. PostgreSQL with read replicas for analytics queries. Redis caching for frequent dashboard data. MinIO is S3-compatible — swap for AWS S3 in production. The D365 adapter is a clean interface — swap the mock for real OData v4 in production. We've designed the system to handle 100,000 bills per day."

---

**Q: How does Segregation of Duties work?**

"Hard-coded at the API level. The person who submits a bill or expense cannot approve it at any step — the system checks submitter ID against approver ID and returns 403 Forbidden if they match. The same person cannot be both L1 and L2 approver. Additionally, a Celery Beat job runs hourly and scans for any SoD violations, logging them in the audit trail even if they somehow occurred."

---

**Q: How is this different from Zoho Books or Tally?**

"Zoho and Tally are bookkeeping-first tools. They record what happened. Tijori AI is workflow-first, intelligence-first. We prevent problems before they happen — budget breaches, MSME violations, duplicate bills, fraudulent invoices. Plus, our NL copilot and AI anomaly detection are capabilities those tools simply don't have. And Indian compliance — MSME 45-day, Section 43B, GST prep — is our primary design constraint, not an afterthought."

---

**Q: What about data privacy — vendor PII going to Claude?**

"We have a masking middleware layer. Before any document reaches the Claude API, PII is identified and handled: bank account numbers are stripped, individual names are tokenized, and GSTIN is sent as a category tag rather than the raw number. The API sees structured invoice fields, not raw sensitive data. This is documented in our risk mitigation in slide 6."

---
---

## 📋 DEMO CHEAT SHEET — QUICK REFERENCE

---

### Login Order & What to Show

| # | Role | Login | Key Feature to Show |
|---|---|---|---|
| 1 | Vendor | `vendor.infosys` / `demo1234` | Upload PDF, bill tracking, status visibility |
| 2 | Finance Admin | `priya.nair` / `demo1234` | AP Hub, approve Infosys bill, IAM, Budget |
| 3 | Finance Admin | (stay logged in) | Anomaly Dashboard — Investigate, Escalate, Mark Safe |
| 4 | Employee | `neha.gupta` / `demo1234` | Submit expense, notifications, push alerts |
| 5 | Engg HOD | `divya.krishnan` / `demo1234` | Dept-scoped data isolation, approve expense |
| 6 | Finance Manager | `vikram.mehta` / `demo1234` | Spend Analytics, Dept Variance, Working Capital, AP approval |
| 7 | Finance Admin | `priya.nair` / `demo1234` | Audit Trail hash chain, Reports, PDF export |
| 8 | CFO | `arjun.sharma` / `demo1234` | Dashboard KPIs, Cash Flow Forecast, NL Copilot, Monthly Summary, 10-Q, Anomaly (no Escalate), Notifications |

---

### All Credentials

| Role | Username | Password |
|---|---|---|
| CFO (G5) | `arjun.sharma` | `demo1234` |
| Finance Admin (G4) | `priya.nair` | `demo1234` |
| Finance Manager (G3) | `vikram.mehta` | `demo1234` |
| Engg HOD (G2) | `divya.krishnan` | `demo1234` |
| Ops HOD (G2) | `rohit.kapoor` | `demo1234` |
| HR HOD (G2) | `sunita.rao` | `demo1234` |
| Mkt HOD (G2) | `anil.desai` | `demo1234` |
| Employee 1 (G1) | `neha.gupta` | `demo1234` |
| Employee 2 (G1) | `rahul.joshi` | `demo1234` |
| Employee 3 (G1) | `kavita.iyer` | `demo1234` |
| Employee 4 (G1) | `sanjay.reddy` | `demo1234` |
| Vendor 1 | `vendor.infosys` | `demo1234` |
| Vendor 2 | `vendor.staples` | `demo1234` |

---

### If Something Goes Wrong During Demo

| Problem | What to Say |
|---|---|
| Page loads slowly | "The system is fetching live data from the database — this is real, not cached." |
| AI response takes time | "Claude is generating a real response from live data — give it just a moment." |
| Login fails | "Let me just check the URL — [fix it calmly]" |
| Feature not visible | "This is a role-controlled feature — let me navigate to it directly." [go to URL manually] |
| Anomaly score doesn't show | "The ML model runs in the background — let me show you a pre-scored result." [click existing anomaly] |

---

### One-Line Power Statements (Use These for Impact)

- *"This used to take 40 hours a week. Now it takes 6 seconds."*
- *"The filter is at the database level — not the UI level. You cannot bypass it."*
- *"Four layers of tamper protection. SHA-256 hash chain. Built for regulators."*
- *"Arjun Sharma (`arjun.sharma`) doesn't get the Friday evening phone call anymore."*
- *"2 days of Excel. 2 minutes of Tijori AI."*
- *"The system learns from your team's decisions. It gets smarter every week."*
- *"100% MSME 45-day compliant. Automatically. Every time."*
- *"He IS the CFO — there's no button to escalate to himself."*

---

*Script v2.0 — Enhanced Edition — Team 14 Data Dakait — FinanceAI Hackathon 2k26*
*Prepared with love, caffeine, and a healthy fear of quarter-end budget reviews.*
