# FinanceAI (Tijori AI) - Master Presentation Script
**Team 14 - Data Dakait | Duration: 20-25 Minutes**

---

## 🎤 PART 1: GREETING & CONTEXT SETTING (3-4 mins)

**[Slide 1: Title Slide - Tijori AI: The Intelligent Vault]**

**Speaker 1:**
"Good morning, respected judges and everyone present. We are Team 14, **Data Dakait**, and today we are incredibly excited to present our solution: **Tijori AI - The Intelligent Vault**. 

At its core, Tijori AI is an advanced, AI-powered financial operations platform built from the ground up to automate and secure the most critical, yet manual workflows of a modern finance team."

**[Slide 2: The Problem We Are Solving]**

**Speaker 1:**
"Let’s look at the current reality of a mid-sized to large enterprise. 
Every month, finance teams face massive bottlenecks:
1. **Manual Ingestion:** Vendors send PDFs over email. AP clerks spend weeks manually typing data into the ERP.
2. **Scattered Approvals:** Approvals happen over WhatsApp or email trails, with zero auditability. 
3. **Fraud & Anomalies:** Duplicate invoices or sudden price inflations often slip through the cracks because manual spot-checks only cover 10% of the volume.
4. **Delayed Insights:** By the time the CFO gets the monthly report, the data is already 15 days old. 

Current enterprise tools are rigid, overly complex, and don't natively understand Indian compliance rules like the MSME 45-day payment act."

**[Slide 3: Our Solution & Tech Stack]**

**Speaker 1:**
"Tijori AI solves this by injecting AI directly into the workflow. We are not replacing the ERP; we are adding a smart, autonomous layer on top of it.
Our platform offers:
- **AI-First Ingestion** using Claude Sonnet 4 Vision for 6-second, zero-touch OCR.
- **Automated Workflows** with strict Segregation of Duties (SoD).
- **Always-On Compliance & Fraud Detection** powered by Machine Learning (Isolation Forest).
- **An AI CFO Copilot** that answers complex financial queries in plain English.

We've built this on a robust stack: React for the frontend, Django and REST APIs for the backend, Celery for asynchronous processing, and PostgreSQL for secure data storage. 

Now, let's step out of the slides and show you the system in action. We've built **role-specific portals** to ensure that every persona—from a vendor to the CFO—gets exactly what they need."

---

## 🎭 PART 2: ROLES EXPLANATION (1-2 mins)

**Speaker 2:**
"To demonstrate the true power of Tijori AI, we will walk you through a live, day-in-the-life scenario using our **5-Tier Role-Based Access Control (RBAC)** system.

Our hierarchy is structured as follows:
- **Vendor Portal:** External vendors self-serve and upload invoices.
- **G1 (Employee):** Regular employees who submit expenses.
- **G2 (HOD):** Department heads who manage their specific department's budget and approve employee expenses.
- **G3 (Finance Manager):** Handles cross-department analytics and mid-level approvals.
- **G4 (Finance Admin):** The operational backbone. Manages the AP Hub, anomalies, and system configurations.
- **G5 (CFO):** The strategic commander. Needs high-level insights, cash flow forecasts, and AI assistance.

Let’s begin the live demo with our first interaction: The Vendor."

---

## 💻 PART 3: LIVE DEMO - DEEP DIVE (15-18 mins)

### 🔹 Step 1: The Vendor Experience (2 mins)
*(Action: Log in as Vendor 1 - `vendor.infosys` / `demo1234`)*

**Speaker 2:**
"We are now logged in as **Infosys**, one of our registered vendors. Instead of emailing invoices to a generic finance inbox, the vendor uses this self-serve portal. 

Notice the dashboard—the vendor can instantly see their pending bills, approved bills, and total payments. This eliminates the constant 'What is the status of my payment?' emails. 

*Action: Click 'Upload Invoice'*
Watch closely as we drag and drop a PDF invoice. Behind the scenes, our **Claude Sonnet 4 Vision model** is instantly extracting the vendor name, invoice number, GSTIN, HSN codes, and exact line items. 
In about 6 seconds, the data is digitized with over 95% accuracy. 

The vendor submits it, and they can track its journey in real-time. If the vendor is MSME-registered, our system automatically starts a 45-day countdown to ensure compliance."

### 🔹 Step 2: Finance Admin - Invoice Approval & Anomaly Handling (3 mins)
*(Action: Log out Vendor. Log in as Finance Admin - `priya.nair` / `demo1234`)*

**Speaker 2:**
"The invoice has been submitted. We now switch hats to **Priya Nair, our Finance Admin (G4)**. She operates from the AP (Accounts Payable) Hub.

*Action: Navigate to AP Hub*
Here, Priya sees a centralized queue of all vendor bills. She clicks on the Infosys bill that was just submitted. All the data is pre-populated. She doesn't have to type a single number.

But here is where the AI truly shines. Notice the **Anomaly Score** attached to this invoice. Our background ML model, **Isolation Forest**, has analyzed this invoice against the vendor’s historical billing patterns, frequency, and typical amounts.

*Action: Navigate to Anomaly Dashboard and click an Anomalous Invoice*
Let's look at this specific invoice flagged in RED. The AI detected that the billing amount is unusually high for this time of the month. 
Priya has options: she can raise a **Query** directly back to the vendor through the portal, or she can **Escalate** this to the CFO. If she validates it, she can 'Mark as Safe'. Every single action here trains the AI to be smarter next time."

### 🔹 Step 3: Regular Employee (G1) - Expense Submission (2 mins)
*(Action: Log out Finance Admin. Log in as Employee 1 - `neha.gupta` / `demo1234`)*

**Speaker 3:**
"Now that the vendor side is handled, let’s look at internal operations. Meet **Neha Gupta, an Employee (G1)** in the Engineering department. 

Neha just returned from a conference and needs to submit an expense.
*Action: Navigate to Expenses -> Submit Expense*
She quickly fills out the category, amount, and attaches the receipt. What happens next is crucial: the system instantly checks if her request fits within the **Engineering Department's budget**.

She submits it. Instantly, she receives a **Real-time Notification** (point to the bell icon/push notification) confirming submission. She can track exactly whose desk her reimbursement is sitting on."

### 🔹 Step 4: Head of Department (G2) - Scoped Approval (2 mins)
*(Action: Log out Employee. Log in as Engg HOD - `divya.krishnan` / `demo1234`)*

**Speaker 3:**
"Neha’s expense routes to her boss, **Divya Krishnan, the Engineering HOD (G2)**. 

The most important feature here is **Data Isolation**. Divya ONLY sees data related to the Engineering department. She cannot see Marketing's budget or HR's expenses. This security is enforced deep at the database query level.

*Action: Go to HOD Dashboard and Approve Expense*
Divya looks at her department's budget utilization widget, sees she has enough runway, reviews Neha's expense, and clicks 'Approve'. The notification engine fires immediately, updating Neha."

### 🔹 Step 5: Finance Manager (G3) - Spend Intelligence (2 mins)
*(Action: Log out HOD. Log in as Finance Manager - `vikram.mehta` / `demo1234`)*

**Speaker 1:**
"The expense now flows to **Vikram Mehta, the Finance Manager (G3)**. Vikram needs a broader view. 

*Action: Navigate to Spend Analytics / Dashboard*
Vikram sees the cross-department landscape. He has access to **Spend Intelligence**—which department is burning cash the fastest? What is the vendor risk profile? 

He handles the mid-level approvals. For vendor invoices associated with Purchase Orders (POs), the system automatically performs a **3-way match** (Invoice + PO + Delivery Receipt). Vikram only has to intervene if the AI flags a discrepancy. He approves Neha's expense, moving it to the final payout stage."

### 🔹 Step 6: Finance Admin (G4) - Audit Trail & Control (2 mins)
*(Action: Log out Finance Manager. Log in as Finance Admin - `priya.nair` / `demo1234`)*

**Speaker 2:**
"Back to our **Finance Admin, Priya**. The cycle is nearly complete, but compliance is key. 

*Action: Navigate to Audit Log*
I want to highlight our **Immutable Audit Trail**. Every approval, rejection, and login is logged with a SHA-256 hash chain. If an auditor asks, 'Who approved this anomaly?', Priya can generate a cryptographically secure report in one click. 

She also has full control over the **IAM (Identity & Access Management)** to add new users, and she can pull comprehensive GST and TDS reports instantly."

### 🔹 Step 7: The CFO (G5) - The Strategic Command Center (3-4 mins)
*(Action: Log out Finance Admin. Log in as CFO - `arjun.sharma` / `demo1234`)*

**Speaker 1:**
"Finally, we log in as the ultimate decision-maker: **Arjun Sharma, the CFO (G5)**. 

*Action: Show CFO Dashboard*
Arjun's dashboard is built for strategy, not data entry. He sees high-level KPIs immediately. 
Notice this chart—this is our **90-Day Cash Flow Forecast** powered by Meta's open-source *Prophet* algorithm. It analyzes past runway and predicts future cash crunches. 

*Action: Open AI Chatbot / Copilot*
But here is the game-changer: The **CFO AI Copilot**. Arjun doesn't need to ask an analyst for an Excel report. He can just type:
*Types: 'Which department has the highest spend this quarter?'*
The AI queries the live database and gives an instant, accurate answer.
*Types: 'What is our MSME exposure this month?'*
Instant compliance check.

*Action: Navigate to AI Hub -> Generate Monthly Summary*
At the end of the month, Arjun clicks one button. Claude Sonnet 4 analyzes all the data and generates a formal, 5-paragraph executive financial summary, ready to be exported as a PDF for the board.

He can even generate a **Draft 10-Q filing** for regulatory compliance with a single click. Every critical notification—from extreme anomalies to budget breaches—is pushed directly to his dashboard."

---

## 🎯 PART 4: IMPACT & CONCLUSION (1-2 mins)

**Speaker 1:**
"To wrap up, let's look at the actual impact of Tijori AI:
- **Speed:** Bill processing time drops from 3 weeks to 3 days.
- **Accuracy:** Duplicate and anomalous bills are flagged instantly, saving up to 15% in undetected overspend.
- **Compliance:** MSME rules and audit trails are mathematically enforced, not just trusted to memory.
- **Empowerment:** The CFO gets answers in seconds instead of days.

We have demonstrated a live, end-to-end flow featuring AI ingestion, strict role-based isolation, machine learning anomaly detection, and natural language analytics. Tijori AI is not just a tool; it is the intelligent partner every finance team needs.

Thank you. We are Team Data Dakait, and we are now open for any questions."

---

## 💡 QUICK REFERENCE FOR JUDGES Q&A (Keep Handy)

- **How do you handle OCR errors?**
  "If Claude Vision's confidence is below 85%, it flags the field for human review. It never silently passes bad data."
- **Is the audit log secure?**
  "Yes, it uses a SHA-256 hash chain. Modifying a past record breaks the chain, immediately alerting admins."
- **How is data isolated?**
  "Role isolation is hard-coded at the database/ORM level. HODs physically cannot query other departments' data."
- **What happens if the AI fails/goes offline?**
  "Graceful degradation. If OCR fails, a manual entry form appears. If the Copilot fails, standard UI filters are still available."
- **How is Segregation of Duties (SoD) enforced?**
  "The system prevents the same user from submitting and approving an invoice. API rules return a '403 Forbidden' if attempted."

---
*Created by Gemini CLI*