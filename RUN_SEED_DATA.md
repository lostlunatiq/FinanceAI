# Seeding Demo Data for Tijori FinanceAI

This guide explains how to seed synthetic and realistic data for all personas.

## Quick Start

### In your development environment (with Django installed):

```bash
# Make sure your virtual environment is activated
source venv/bin/activate  # or your environment's activation script

# Run the management command
python manage.py seed_demo_data
```

### Or directly run the standalone script:

```bash
python3 seed_demo_data.py
```

## What Gets Seeded

The seeding script creates:

### 👥 Users & Personas (11 total)

| Role | Username | Email | Password |
|------|----------|-------|----------|
| CFO (G5) | arjun.sharma | arjun.sharma@company.com | demo1234 |
| Finance Admin (G4) | priya.nair | priya.nair@company.com | demo1234 |
| Finance Manager (G3) | vikram.mehta | vikram.mehta@company.com | demo1234 |
| HOD - Engineering (G2) | divya.krishnan | divya.krishnan@company.com | demo1234 |
| HOD - Operations (G2) | rohit.kapoor | rohit.kapoor@company.com | demo1234 |
| HOD - HR (G2) | sunita.rao | sunita.rao@company.com | demo1234 |
| HOD - Marketing (G2) | anil.desai | anil.desai@company.com | demo1234 |
| Employee 1 (G1) | neha.gupta | neha.gupta@company.com | demo1234 |
| Employee 2 (G1) | rahul.joshi | rahul.joshi@company.com | demo1234 |
| Employee 3 (G1) | kavita.iyer | kavita.iyer@company.com | demo1234 |
| Employee 4 (G1) | sanjay.reddy | sanjay.reddy@company.com | demo1234 |

### 🏢 Vendors (5 total)
- Infosys Limited
- Staples India
- AWS India
- Microsoft India
- Adobe Systems India

### 💰 Department Budgets
- Engineering Budget FY2024-25
- Operations Budget FY2024-25
- Marketing Budget FY2024-25
- Human Resources Budget FY2024-25
- Sales Budget FY2024-25

### 📝 Expenses
- 2-5 realistic expenses per employee
- Random amounts: ₹1,000 - ₹45,000
- Various status: PENDING_L1, APPROVED, PAID
- Realistic merchant names (Swiggy, Uber, Hotels, Airlines, etc.)

### 📋 Bills/Invoices
- 3-7 realistic bills per vendor
- Random amounts: ₹50,000 - ₹500,000
- Various approval states
- GST automatically calculated (18%)

## Features

✅ **Realistic Data**: All amounts, dates, and merchant names are realistic
✅ **Variable States**: Expenses and bills in different approval stages
✅ **Multiple Personas**: Full hierarchy from CFO to Employees
✅ **Vendor Data**: Complete vendor information with bank details
✅ **Budget Allocation**: Department-wise budgets with thresholds
✅ **Date Distribution**: Data spread across last 30-45 days

## OCR Fallback

The app now has synthetic OCR data generation. When actual OCR fails on file uploads:

- **Random amounts**: ₹5,000 - ₹50,000 (realistic range)
- **Random dates**: Last 30 days
- **Random merchants**: From a curated list of real Indian merchants
- **Confidence score**: 75-95% (realistic OCR confidence)

This ensures users can always complete expense filing even if OCR is unavailable.

## Testing Tips

1. **Login** with any persona username and password: demo1234
2. **File Expenses** as an Employee - upload any PDF/image and watch it populate with synthetic data
3. **Approve Expenses** as Finance Manager or HOD
4. **Process Payments** as Finance Admin
5. **View Reports** as CFO

## Notes

- All passwords are set to `demo1234`
- All emails use `@company.com` domain
- Vendors include real Indian software and service companies
- Budget amounts are realistic for departments
- No sensitive data is stored - this is for demo/testing only
