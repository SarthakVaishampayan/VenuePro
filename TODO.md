# TODO — VenuePro SaaS Platform

> Track pending features, improvements, and known issues.

---

## ✅ Completed (this session)

- [x] **Create Portal — Trial/Subscription mode toggle** — Step 3 now asks Trial (days only) vs Subscription (plan + billing cycle)
- [x] **Days remaining badge for subscription plans** — Shows `Xd left` / `Overdue` badge in OwnerDetail and owner Settings (only when within active period)
- [x] **Plan column shows name instead of ObjectId** — Owners list now resolves plan reference to show the plan name
- [x] **Invoice stats showing 0 bug** — Fixed ObjectId casting in aggregation pipeline (tenantBilling.js)
- [x] **'Free' plan deletion crash** — Server no longer hardcodes 'free' as default; dynamically picks cheapest active plan
- [x] **Duplicate React key warning** — Fixed duplicate `subscription` key in Owners table columns

---

## 🔜 Up Next / In Progress

- [ ] **Auto-suspend after trial grace period** — Cron job to transition `overdue → suspended → expired` after the 7-day grace ends (currently only `trialing → overdue` is automated)
- [ ] **Unsuspend flow** — When superadmin unsuspends a tenant, show a choice: (a) Extend trial by N days or (b) Record payment for subscription plan
- [ ] **Wire up email sending** — Connect `emailService.sendPasswordReset()` in the player forgot-password route to actually send the magic link email
- [x] **API Sanity Check system** — Route scanner, snapshot/comparison tool + integrated into deploy.sh

---

## 📋 Future Improvements

### Subscription & Billing

- [ ] **Trial expiry notification** — Send email / in-app notification 3 days before trial ends
- [ ] **Extend trial feature** — Allow superadmin to extend a trial by N days from OwnerDetail page
- [ ] **Auto lifecycle: overdue → suspended → expired** — Cron to auto-transition after grace period:
  - `overdue` for 7+ days → auto-suspend (`suspended`, billing-only access)
  - `suspended` for 30+ days → auto-expire (`expired`, fully blocked)
- [ ] **Plan upgrade/downgrade** — Allow superadmin to change a tenant's plan and prorate billing
- [ ] **Auto-invoice generation** — Generate invoices automatically on a schedule (cron) for active subscriptions
- [ ] **Payment gateway integration** — Integrate Razorpay/Stripe for online payment collection instead of manual recording

### Owner Portal

- [ ] **Dashboard subscription widget** — Show plan status and days remaining directly on owner dashboard (not just Settings)
- [ ] **Self-service upgrade** — Allow owner to upgrade/downgrade their own plan from Settings
- [ ] **Cancel subscription** — Owner can request cancellation from their portal

### Superadmin

- [ ] **Unsuspend with options** — When unsuspending, ask: (a) Extend trial (pick days) or (b) Record payment (pick plan + billing cycle)
- [ ] **Bulk actions** — Select multiple tenants and apply action (suspend, extend trial, change plan)
- [ ] **Export owners list** — CSV/Excel export of tenants with subscription info
- [ ] **Subscription history** — Show full history of plan changes and payments for a tenant
- [ ] **Revenue charts** — Monthly/quarterly/yearly revenue breakdown with visual charts
- [ ] **Manual suspend reason** — Record and display suspension reason in OwnerDetail

### General / Tech Debt

- [ ] **Audit other aggregation pipelines** — Check all `aggregate()` calls in the codebase for the same ObjectId casting bug
- [ ] **Watermark logic** — Review watermarkService.js (currently checks for `planKey === 'free'` which was deleted)
- [ ] **Demo cleanup** — Ensure demo auto-cleanup cron properly removes demo data
- [ ] **Error handling** — Add more user-friendly error messages for payment/subscription failures

### UI/UX

- [ ] **Add days remaining to summary card** — Show the badge on the "Next Billing" card in OwnerDetail for quick glance
- [ ] **Mobile responsive** — Ensure subscription details section is mobile-friendly
- [ ] **Loading states** — Add skeleton loaders for billing/subscription sections

---

## 🐛 Known Issues

- [ ] _No known issues at the moment_

---

> **How to use:** Check off items with `[x]` as you complete them. Add new items under the appropriate section.
