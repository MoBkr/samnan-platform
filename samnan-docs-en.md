# Samnan Platform — User Guide
### Samnan Holding Group · Developed by Thakaa Flow

---

## Overview

**Samnan Platform** is a comprehensive internal project management system built for Samnan Holding Group. It enables the entire team to track projects from contract signing through final closure — transparently and efficiently.

**Live URL:** https://samnan-platform.vercel.app

---

## User Roles

| Role | Title | Permissions |
|------|-------|-------------|
| `coordinator` | Coordinator | Full project lifecycle: create, track payments, close |
| `sales_engineer` | Sales Engineer | View own projects only, send payment requests |
| `installation` | Installation | View installation schedule, confirm completion |
| `admin` | Admin | Full access + user management + reports |

---

## Project Lifecycle

```
1. PROJECT CREATION
   ← Sales engineer or coordinator creates the project
   ← Upload signed contract (PDF)
   ← Define payment schedule

2. UPFRONT PAYMENT
   ← Coordinator requests payment from client
   ← Client pays → receipt uploaded
   ← Status updated to "Paid"

3. MATERIAL REQUEST
   ← Upload PDF with required materials list

4. SUPPLY PAYMENT
   ← Client pays before delivery

5. INSTALLATION
   ← Schedule installation date
   ← Team and client confirmation
   ← Upload completion photos

6. FINAL PAYMENT & PROJECT CLOSURE
   ← Collect final payment
   ← Close project permanently
```

---

## How to Use

### Coordinator
1. **Create project:** Projects → New Project → Fill in details
2. **Track payments:** Projects → Select Project → Payments tab
3. **Schedule installation:** Installation tab → Set date
4. **Close project:** When all payments collected → Close

### Sales Engineer
1. **My projects:** Dashboard shows your own projects
2. **Project detail:** Projects → Select → View

### Installation Team
1. **Schedule:** Installation page shows upcoming dates
2. **Confirm completion:** Open project → Installation tab → Confirm

### Admin
1. **Reports:** Dashboard → PDF card → Select type → Print/Export
2. **User management:** Sidebar → User Management
3. **Delete project:** Only available for cancelled or on-hold projects

---

## Key Features

- ✅ End-to-end project management
- ✅ Payment tracking with overdue alerts
- ✅ File uploads (contracts, receipts, documents)
- ✅ Installation scheduling with team confirmation
- ✅ Role-specific dashboards
- ✅ Comprehensive reports (PDF + print)
- ✅ Activity log per project
- ✅ User & role management
- ✅ Full Arabic RTL interface

---

## Project Statuses

| Status | Meaning |
|--------|---------|
| Active | Project in progress |
| Completed | Finished and closed |
| On Hold | Temporarily paused |
| Cancelled | Cancelled with reason |

---

## Technical Information

- **Hosting:** Vercel (auto-deploy on push)
- **Database:** Supabase (PostgreSQL + RLS)
- **Storage:** Supabase Storage (files & documents)
- **Live URL:** https://samnan-platform.vercel.app
- **GitHub:** https://github.com/MoBkr/samnan-platform

---

## Support & Contact

**Development & Maintenance:**
Thakaa Flow
Email: ai@tfco.sa
Website: https://tfco.sa
