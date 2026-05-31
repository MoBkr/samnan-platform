import base64, os

logo_b64 = base64.b64encode(open('public/logo.png','rb').read()).decode()

# ── Thakaa Flow real logo PNG ─────────────────────────────
tf_logo_b64 = base64.b64encode(open('ThakaaFlow Logo.png','rb').read()).decode()
tf_logo_mime = 'image/png'

HTML = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>منصة سمنان الإدارية — توثيق شامل 2026</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
/* ═══════════════════════════════════════
   RESET & VARIABLES
═══════════════════════════════════════ */
:root{{
  --brand:       #1841A0;
  --brand-dark:  #122E78;
  --brand-mid:   #2456c8;
  --brand-light: #EEF2FF;
  --brand-pale:  #f5f7ff;
  --teal:        #0891b2;
  --teal-light:  #ecfeff;
  --success:     #16a34a;
  --warning:     #d97706;
  --danger:      #dc2626;
  --gray-50:     #f8fafc;
  --gray-100:    #f1f5f9;
  --gray-200:    #e2e8f0;
  --gray-500:    #64748b;
  --gray-700:    #374151;
  --gray-900:    #0f172a;
  --radius:      14px;
  --shadow-sm:   0 1px 3px rgba(0,0,0,.08);
  --shadow-md:   0 4px 16px rgba(0,0,0,.1);
  --shadow-brand:0 4px 20px rgba(24,65,160,.25);
}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{scroll-behavior:smooth}}
body{{
  font-family:"Cairo",sans-serif;
  background:var(--gray-50);
  color:#1e293b;
  direction:rtl;
  line-height:1.75;
  font-size:15px;
}}
a{{text-decoration:none;color:inherit}}

/* ═══════════════════════════════════════
   TOP HEADER
═══════════════════════════════════════ */
.top-header{{
  background:linear-gradient(100deg,var(--brand-dark) 0%,var(--brand) 60%,#2456c8 100%);
  position:sticky;top:0;z-index:200;
  box-shadow:0 2px 20px rgba(18,46,120,.45);
}}
.top-header-inner{{
  max-width:1200px;margin:0 auto;
  padding:12px 28px;
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  flex-wrap:wrap;
}}
.logo-samnan{{
  display:flex;align-items:center;gap:14px;
}}
.logo-samnan img{{
  height:44px;
  background:white;border-radius:10px;
  padding:5px 10px;object-fit:contain;
  box-shadow:0 2px 8px rgba(0,0,0,.2);
}}
.logo-samnan-txt{{
  color:white;
}}
.logo-samnan-txt .name{{font-size:15px;font-weight:800;line-height:1.2}}
.logo-samnan-txt .sub{{font-size:11px;color:rgba(255,255,255,.6);font-weight:400}}

.logo-tf-wrap{{
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.15);
  border-radius:12px;padding:8px 16px;
  display:flex;align-items:center;gap:12px;
  transition:background .2s;
}}
.logo-tf-wrap:hover{{background:rgba(255,255,255,.13)}}
.logo-tf-img{{height:52px;width:auto}}
.logo-tf-divider{{width:1px;height:40px;background:rgba(255,255,255,.15)}}
.logo-tf-contact{{
  font-size:11px;color:rgba(255,255,255,.65);line-height:1.6;
}}
.logo-tf-contact a{{color:#67e8f9;font-weight:600}}

.header-badge{{
  background:rgba(255,255,255,.1);
  border:1px solid rgba(255,255,255,.2);
  border-radius:8px;padding:5px 14px;
  font-size:12px;font-weight:700;color:rgba(255,255,255,.8);
  letter-spacing:.04em;
}}

/* ═══════════════════════════════════════
   HERO
═══════════════════════════════════════ */
.hero{{
  background:linear-gradient(150deg,var(--brand-dark) 0%,var(--brand) 45%,#1e3a8a 75%,#0f172a 100%);
  padding:88px 28px 100px;text-align:center;color:white;
  position:relative;overflow:hidden;
}}
.hero::before{{
  content:"";position:absolute;inset:0;
  background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}}
.hero-inner{{position:relative;z-index:1}}
.hero-year{{
  display:inline-block;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.2);
  border-radius:999px;padding:6px 20px;
  font-size:12px;font-weight:700;color:#93c5fd;
  letter-spacing:.1em;text-transform:uppercase;
  margin-bottom:28px;
}}
.hero h1{{
  font-size:clamp(30px,5.5vw,56px);font-weight:900;
  margin-bottom:16px;line-height:1.15;
  text-shadow:0 2px 20px rgba(0,0,0,.3);
}}
.hero h1 span{{color:#7dd3fc}}
.hero .subtitle{{
  font-size:clamp(14px,2vw,18px);
  color:rgba(255,255,255,.7);
  max-width:600px;margin:0 auto 36px;
  font-weight:400;
}}
.hero-cta{{
  display:inline-flex;align-items:center;gap:10px;
  background:white;color:var(--brand-dark);
  border-radius:12px;padding:14px 28px;
  font-size:15px;font-weight:800;
  box-shadow:0 4px 24px rgba(0,0,0,.3);
  transition:all .25s;
}}
.hero-cta:hover{{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.35)}}
.hero-stats{{
  display:flex;align-items:center;justify-content:center;
  gap:32px;margin-top:52px;flex-wrap:wrap;
}}
.hero-stat{{text-align:center;}}
.hero-stat .num{{font-size:36px;font-weight:900;color:#7dd3fc;line-height:1}}
.hero-stat .lbl{{font-size:12px;color:rgba(255,255,255,.6);margin-top:4px}}
.hero-stat-sep{{width:1px;height:48px;background:rgba(255,255,255,.15)}}

/* ═══════════════════════════════════════
   TAB NAV
═══════════════════════════════════════ */
.tab-nav{{
  background:white;
  border-bottom:2px solid var(--gray-200);
  position:sticky;top:69px;z-index:150;
  box-shadow:0 2px 8px rgba(0,0,0,.06);
}}
.tab-nav-inner{{
  max-width:1200px;margin:0 auto;
  padding:0 28px;
  display:flex;gap:2px;
  overflow-x:auto;scrollbar-width:none;
}}
.tab-nav-inner::-webkit-scrollbar{{display:none}}
.tab-btn{{
  padding:16px 22px;
  font-family:"Cairo",sans-serif;
  font-size:14px;font-weight:700;
  color:var(--gray-500);
  background:none;border:none;
  border-bottom:3px solid transparent;
  cursor:pointer;white-space:nowrap;
  transition:all .2s;margin-bottom:-2px;
  display:flex;align-items:center;gap:7px;
}}
.tab-btn:hover{{color:var(--brand);background:var(--brand-pale)}}
.tab-btn.active{{color:var(--brand);border-bottom-color:var(--brand)}}
.tab-btn .tbico{{font-size:16px}}

/* ═══════════════════════════════════════
   CONTENT
═══════════════════════════════════════ */
.content{{max-width:1200px;margin:0 auto;padding:48px 28px 100px}}
.tab-panel{{display:none}}
.tab-panel.active{{display:block;animation:fadeUp .35s ease}}
@keyframes fadeUp{{from{{opacity:0;transform:translateY(12px)}}to{{opacity:1;transform:translateY(0)}}}}

/* ═══════════════════════════════════════
   SECTION TITLES
═══════════════════════════════════════ */
.sec{{margin-bottom:56px}}
.sec-title{{
  font-size:24px;font-weight:900;
  color:var(--brand-dark);
  margin-bottom:6px;
  display:flex;align-items:center;gap:12px;
}}
.sec-title .ico{{
  width:42px;height:42px;flex-shrink:0;
  background:var(--brand-light);
  border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;
}}
.sec-desc{{
  font-size:14px;color:var(--gray-500);
  margin-bottom:28px;padding-bottom:20px;
  border-bottom:2px solid var(--brand-light);
  padding-right:54px;
}}

/* ═══════════════════════════════════════
   OVERVIEW CARDS
═══════════════════════════════════════ */
.overview-grid{{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
  gap:20px;margin-bottom:32px;
}}
.ov-card{{
  background:white;border:1px solid var(--gray-200);
  border-radius:var(--radius);padding:28px;
  box-shadow:var(--shadow-sm);
  transition:all .25s;
  border-top:4px solid var(--brand-light);
}}
.ov-card:hover{{
  box-shadow:var(--shadow-brand);
  transform:translateY(-3px);
  border-top-color:var(--brand);
}}
.ov-card-ico{{
  width:52px;height:52px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  font-size:26px;margin-bottom:18px;
}}
.ov-card h3{{font-size:16px;font-weight:800;color:#1e293b;margin-bottom:10px}}
.ov-card p{{font-size:13px;color:var(--gray-500);line-height:1.7}}

/* ═══════════════════════════════════════
   PROBLEM / SOLUTION BLOCK
═══════════════════════════════════════ */
.prob-sol{{
  display:grid;grid-template-columns:1fr 1fr;gap:20px;
  margin-bottom:32px;
}}
@media(max-width:640px){{.prob-sol{{grid-template-columns:1fr}}}}
.prob-block,.sol-block{{
  border-radius:var(--radius);padding:28px;
}}
.prob-block{{
  background:#fff5f5;border:2px solid #fecaca;
}}
.prob-block h4{{font-size:15px;font-weight:800;color:#991b1b;margin-bottom:12px;display:flex;align-items:center;gap:8px}}
.sol-block{{
  background:#f0fdf4;border:2px solid #bbf7d0;
}}
.sol-block h4{{font-size:15px;font-weight:800;color:#14532d;margin-bottom:12px;display:flex;align-items:center;gap:8px}}
.bullet-list{{list-style:none;}}
.bullet-list li{{
  padding:6px 0;font-size:13px;color:#374151;
  display:flex;align-items:flex-start;gap:8px;
  border-bottom:1px solid rgba(0,0,0,.04);
}}
.bullet-list li:last-child{{border-bottom:none}}
.bullet-list li::before{{flex-shrink:0;margin-top:2px}}
.prob-block .bullet-list li::before{{content:"✗";color:#ef4444;font-weight:900}}
.sol-block .bullet-list li::before{{content:"✓";color:#16a34a;font-weight:900}}

/* ═══════════════════════════════════════
   ROLES
═══════════════════════════════════════ */
.roles-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}}
.role-card{{
  background:white;border:2px solid var(--gray-200);
  border-radius:var(--radius);overflow:hidden;
  box-shadow:var(--shadow-sm);transition:all .25s;
}}
.role-card:hover{{box-shadow:var(--shadow-md);transform:translateY(-3px)}}
.role-card-head{{
  padding:22px 22px 18px;
  display:flex;align-items:center;gap:14px;
}}
.role-avatar{{
  width:52px;height:52px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  font-size:24px;flex-shrink:0;
}}
.role-card-head h3{{font-size:17px;font-weight:800}}
.role-card-head .slug{{
  font-size:11px;font-family:monospace;
  font-weight:700;padding:2px 8px;
  border-radius:6px;margin-top:3px;
  display:inline-block;
}}
.role-card-body{{padding:0 22px 22px}}
.role-perm-list{{list-style:none}}
.role-perm-list li{{
  padding:7px 0;font-size:13px;color:#374151;
  display:flex;align-items:flex-start;gap:8px;
  border-bottom:1px solid var(--gray-100);
}}
.role-perm-list li:last-child{{border-bottom:none}}
.role-perm-list li .tick{{
  flex-shrink:0;width:18px;height:18px;
  border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:900;margin-top:2px;
}}
.tick-yes{{background:#dcfce7;color:#16a34a}}
.tick-no{{background:#fee2e2;color:#dc2626}}

/* Perm matrix */
.perm-matrix{{width:100%;border-collapse:collapse;background:white;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);margin-top:28px}}
.perm-matrix th{{background:var(--brand);color:white;padding:13px 16px;font-size:12px;font-weight:700;text-align:center}}
.perm-matrix th:first-child{{text-align:right}}
.perm-matrix td{{padding:12px 16px;font-size:13px;border-bottom:1px solid var(--gray-100);text-align:center}}
.perm-matrix td:first-child{{text-align:right;font-weight:600;color:#1e293b}}
.perm-matrix tr:last-child td{{border-bottom:none}}
.perm-matrix tr:hover td{{background:var(--brand-pale)}}
.pm-yes{{color:#16a34a;font-size:18px;font-weight:900}}
.pm-no{{color:#e2e8f0;font-size:18px}}
.pm-partial{{color:#d97706;font-size:14px;font-weight:700}}

/* ═══════════════════════════════════════
   LIFECYCLE TIMELINE
═══════════════════════════════════════ */
.timeline{{position:relative;padding-right:32px}}
.timeline::before{{
  content:"";
  position:absolute;right:15px;top:24px;bottom:24px;
  width:2px;background:linear-gradient(to bottom,var(--brand),var(--teal));
  border-radius:1px;
}}
.tl-step{{
  display:flex;gap:24px;margin-bottom:12px;
  position:relative;
}}
.tl-num{{
  width:32px;height:32px;flex-shrink:0;
  background:var(--brand);color:white;
  border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-weight:900;font-size:13px;
  position:relative;z-index:1;
  box-shadow:0 0 0 4px var(--brand-light);
  margin-top:4px;
  margin-right:-48px;
}}
.tl-body{{
  flex:1;background:white;
  border:1px solid var(--gray-200);
  border-radius:var(--radius);padding:22px 26px;
  margin-bottom:10px;box-shadow:var(--shadow-sm);
  transition:all .2s;
}}
.tl-body:hover{{box-shadow:var(--shadow-brand);border-color:var(--brand-light)}}
.tl-head{{
  display:flex;align-items:center;gap:12px;margin-bottom:12px;
}}
.tl-icon{{
  width:40px;height:40px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;flex-shrink:0;
}}
.tl-head h4{{font-size:16px;font-weight:800;color:var(--brand-dark)}}
.tl-head .tl-badge{{
  font-size:10px;font-weight:700;
  padding:2px 10px;border-radius:999px;
  margin-right:auto;
}}
.tl-sub-steps{{list-style:none;margin-top:8px}}
.tl-sub-steps li{{
  padding:7px 0;font-size:13px;color:var(--gray-700);
  display:flex;align-items:flex-start;gap:10px;
  border-bottom:1px solid var(--gray-100);
}}
.tl-sub-steps li:last-child{{border-bottom:none}}
.tl-sub-steps li::before{{
  content:"◈";color:var(--brand);font-size:10px;flex-shrink:0;margin-top:4px;
}}
.tl-note{{
  margin-top:10px;background:var(--brand-pale);
  border-right:3px solid var(--brand);
  border-radius:0 8px 8px 0;
  padding:10px 14px;font-size:12px;color:var(--brand-dark);font-weight:600;
}}

/* ═══════════════════════════════════════
   MODULES
═══════════════════════════════════════ */
.subtab-nav{{
  display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;
}}
.subtab-btn{{
  padding:9px 18px;border-radius:999px;
  font-family:"Cairo",sans-serif;font-size:13px;font-weight:700;
  border:2px solid var(--gray-200);background:white;
  color:var(--gray-500);cursor:pointer;transition:all .2s;
  display:flex;align-items:center;gap:6px;
}}
.subtab-btn:hover{{border-color:var(--brand);color:var(--brand)}}
.subtab-btn.active{{background:var(--brand);border-color:var(--brand);color:white}}
.subpanel{{display:none}}
.subpanel.active{{display:block;animation:fadeUp .3s ease}}

.module-header{{
  background:linear-gradient(135deg,var(--brand-dark),var(--brand));
  border-radius:var(--radius);padding:28px 32px;color:white;
  margin-bottom:24px;
  display:flex;align-items:center;gap:18px;
}}
.module-header .mico{{
  width:56px;height:56px;border-radius:14px;
  background:rgba(255,255,255,.15);
  display:flex;align-items:center;justify-content:center;
  font-size:28px;flex-shrink:0;
}}
.module-header h3{{font-size:20px;font-weight:800;margin-bottom:4px}}
.module-header p{{font-size:13px;color:rgba(255,255,255,.75)}}

.feat-grid{{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;
  margin-bottom:24px;
}}
.feat-item{{
  background:white;border:1px solid var(--gray-200);
  border-radius:12px;padding:18px 20px;
  display:flex;align-items:flex-start;gap:12px;
  box-shadow:var(--shadow-sm);
}}
.feat-item .fi-ico{{
  width:36px;height:36px;flex-shrink:0;
  border-radius:9px;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;
}}
.feat-item-txt h5{{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:3px}}
.feat-item-txt p{{font-size:12px;color:var(--gray-500);line-height:1.6}}

.info-table{{width:100%;border-collapse:collapse;background:white;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm)}}
.info-table th{{background:var(--gray-900);color:white;padding:12px 16px;text-align:right;font-size:12px;font-weight:700}}
.info-table td{{padding:13px 16px;font-size:13px;border-bottom:1px solid var(--gray-100);color:var(--gray-700)}}
.info-table tr:last-child td{{border-bottom:none}}
.info-table tr:hover td{{background:var(--brand-pale)}}

/* ═══════════════════════════════════════
   ACCORDIONS (HOW-TO)
═══════════════════════════════════════ */
.acc-wrap{{margin-bottom:10px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--gray-200);background:white;box-shadow:var(--shadow-sm)}}
.acc-head{{
  padding:18px 24px;cursor:pointer;
  display:flex;align-items:center;justify-content:space-between;
  font-weight:800;font-size:16px;
  user-select:none;transition:background .15s;gap:12px;
}}
.acc-head:hover{{background:var(--brand-pale)}}
.acc-head.open{{background:var(--brand-pale);color:var(--brand-dark)}}
.acc-badge{{
  font-size:11px;font-weight:700;padding:4px 12px;
  border-radius:999px;margin-right:auto;flex-shrink:0;
}}
.acc-arrow{{
  transition:transform .25s;color:var(--gray-500);font-size:13px;flex-shrink:0;
}}
.acc-head.open .acc-arrow{{transform:rotate(180deg);color:var(--brand)}}
.acc-body{{display:none;padding:0 24px 22px;border-top:1px solid var(--brand-light)}}
.acc-body.open{{display:block;animation:fadeUp .2s ease}}
.steps-ol{{list-style:none;counter-reset:sc;margin-top:16px}}
.steps-ol li{{
  counter-increment:sc;
  padding:10px 0 10px 0;
  font-size:13px;color:var(--gray-700);
  display:flex;align-items:flex-start;gap:12px;
  border-bottom:1px solid var(--gray-100);
  line-height:1.7;
}}
.steps-ol li:last-child{{border-bottom:none}}
.steps-ol li::before{{
  content:counter(sc);
  min-width:24px;height:24px;
  background:var(--brand);color:white;
  border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:900;flex-shrink:0;margin-top:1px;
}}
.tip-box{{
  margin-top:14px;background:var(--teal-light);
  border:1px solid #a5f3fc;border-radius:10px;
  padding:14px 18px;font-size:13px;color:#0e7490;
  display:flex;align-items:flex-start;gap:10px;
}}

/* ═══════════════════════════════════════
   TECH
═══════════════════════════════════════ */
.tech-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}}
.tech-card{{
  background:white;border:1px solid var(--gray-200);
  border-radius:var(--radius);padding:22px;
  box-shadow:var(--shadow-sm);
  border-right:4px solid var(--brand-light);
  transition:all .2s;
}}
.tech-card:hover{{border-right-color:var(--brand);box-shadow:var(--shadow-brand)}}
.tech-lbl{{font-size:10px;font-weight:800;color:var(--gray-500);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}}
.tech-val{{font-size:15px;font-weight:800;color:#1e293b;margin-bottom:4px}}
.tech-sub{{font-size:12px;color:var(--gray-500)}}
.tech-val a{{color:var(--brand)}}
.tech-val a:hover{{text-decoration:underline}}

.db-table{{width:100%;border-collapse:collapse;background:white;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);margin-top:8px}}
.db-table th{{background:var(--gray-900);color:white;padding:12px 16px;font-size:12px;font-weight:700;text-align:right}}
.db-table td{{padding:12px 16px;font-size:12px;border-bottom:1px solid var(--gray-100);font-family:monospace;color:var(--gray-700)}}
.db-table tr:last-child td{{border-bottom:none}}
.db-table tr:hover td{{background:var(--brand-pale)}}
.db-badge{{display:inline-block;background:var(--brand-light);color:var(--brand-dark);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;font-family:monospace}}

/* ═══════════════════════════════════════
   STATUS PILLS / MISC
═══════════════════════════════════════ */
.status-row{{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}}
.spill{{
  padding:10px 22px;border-radius:12px;
  font-size:13px;font-weight:700;
  display:flex;align-items:center;gap:8px;
}}
.spill-a{{background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe}}
.spill-d{{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0}}
.spill-h{{background:#fef9c3;color:#854d0e;border:1px solid #fde68a}}
.spill-c{{background:#fee2e2;color:#b91c1c;border:1px solid #fecaca}}

.alert-box{{
  border-radius:12px;padding:18px 22px;
  margin:20px 0;font-size:13px;font-weight:600;
  display:flex;align-items:flex-start;gap:12px;
}}
.alert-info{{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af}}
.alert-warn{{background:#fffbeb;border:1px solid #fde68a;color:#92400e}}
.alert-success{{background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d}}

/* ═══════════════════════════════════════
   FOOTER
═══════════════════════════════════════ */
.site-footer{{
  background:var(--gray-900);
  padding:48px 28px 32px;
}}
.footer-inner{{
  max-width:1200px;margin:0 auto;
  display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:40px;margin-bottom:36px;
}}
@media(max-width:768px){{.footer-inner{{grid-template-columns:1fr}}}}
.footer-col h4{{
  font-size:13px;font-weight:800;color:rgba(255,255,255,.5);
  text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;
}}
.footer-col p,.footer-col a{{
  font-size:13px;color:rgba(255,255,255,.6);
  display:block;margin-bottom:8px;line-height:1.7;
}}
.footer-col a:hover{{color:#22d3ee}}
.footer-logo-wrap{{
  display:flex;flex-direction:column;gap:14px;
}}
.footer-samnan-logo{{
  height:38px;background:white;border-radius:8px;
  padding:4px 8px;object-fit:contain;align-self:flex-start;
}}
.footer-bottom{{
  max-width:1200px;margin:0 auto;
  padding-top:24px;border-top:1px solid rgba(255,255,255,.08);
  display:flex;align-items:center;justify-content:space-between;
  flex-wrap:wrap;gap:12px;
}}
.footer-bottom p{{font-size:12px;color:rgba(255,255,255,.4)}}
.footer-bottom a{{color:#22d3ee;font-weight:600}}

/* ═══════════════════════════════════════
   PRINT
═══════════════════════════════════════ */
@media print{{
  .top-header,.tab-nav{{position:static!important}}
  .tab-panel{{display:block!important}}
  .acc-body{{display:block!important}}
  .subpanel{{display:block!important}}
  body{{background:white;font-size:11px}}
  .hero{{padding:40px 20px}}
  .site-footer{{background:white;color:#374151}}
}}

/* ═══════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════ */
@media(max-width:768px){{
  .top-header-inner{{flex-direction:column;align-items:flex-start;gap:12px}}
  .hero{{padding:56px 16px 64px}}
  .content{{padding:28px 16px 60px}}
  .tab-btn{{padding:13px 14px;font-size:13px}}
  .timeline{{padding-right:0}}
  .timeline::before{{display:none}}
  .tl-num{{margin-right:0}}
  .tl-step{{flex-direction:column;gap:10px}}
}}
</style>
</head>
<body>

<!-- ══════════════════════════════
     TOP HEADER
══════════════════════════════ -->
<header class="top-header">
  <div class="top-header-inner">
    <!-- Samnan -->
    <div class="logo-samnan">
      <img src="data:image/png;base64,{logo_b64}" alt="مجموعة سمنان القابضة">
      <div class="logo-samnan-txt">
        <div class="name">مجموعة سمنان القابضة</div>
        <div class="sub">Samnan Holding Group</div>
      </div>
    </div>

    <div class="header-badge">وثيقة رسمية · 2026</div>

    <!-- Thakaa Flow -->
    <div class="logo-tf-wrap">
      <img class="logo-tf-img" src="data:image/png;base64,{tf_logo_b64}" alt="Thakaa Flow">
      <div class="logo-tf-divider"></div>
      <div class="logo-tf-contact">
        تطوير وصيانة المنصة<br>
        <a href="mailto:ai@tfco.sa">ai@tfco.sa</a> · <a href="https://tfco.sa" target="_blank">tfco.sa</a>
      </div>
    </div>
  </div>
</header>

<!-- ══════════════════════════════
     HERO
══════════════════════════════ -->
<section class="hero">
  <div class="hero-inner">
    <div class="hero-year">📋 توثيق رسمي · 2026</div>
    <h1>منصة <span>سمنان</span> الإدارية<br>دليل المستخدم الشامل</h1>
    <p class="subtitle">نظام متكامل لإدارة مشاريع مجموعة سمنان القابضة من العقد حتى الإغلاق النهائي — تتبع الدفعات، جدولة التركيبات، والتقارير الشاملة</p>
    <a href="https://samnan-platform.vercel.app" target="_blank" class="hero-cta">
      🔗 فتح المنصة — samnan-platform.vercel.app
    </a>
    <div class="hero-stats">
      <div class="hero-stat"><div class="num">4</div><div class="lbl">أدوار مستخدمين</div></div>
      <div class="hero-stat-sep"></div>
      <div class="hero-stat"><div class="num">6</div><div class="lbl">وحدات رئيسية</div></div>
      <div class="hero-stat-sep"></div>
      <div class="hero-stat"><div class="num">5</div><div class="lbl">أنواع دفعات</div></div>
      <div class="hero-stat-sep"></div>
      <div class="hero-stat"><div class="num">4</div><div class="lbl">تقارير تصديرية</div></div>
    </div>
  </div>
</section>

<!-- ══════════════════════════════
     TAB NAV
══════════════════════════════ -->
<nav class="tab-nav">
  <div class="tab-nav-inner">
    <button class="tab-btn active" onclick="showTab('overview',this)"><span class="tbico">🏠</span> نظرة عامة</button>
    <button class="tab-btn" onclick="showTab('roles',this)"><span class="tbico">👥</span> الأدوار والصلاحيات</button>
    <button class="tab-btn" onclick="showTab('lifecycle',this)"><span class="tbico">🔄</span> دورة حياة المشروع</button>
    <button class="tab-btn" onclick="showTab('modules',this)"><span class="tbico">📦</span> الوحدات والمميزات</button>
    <button class="tab-btn" onclick="showTab('howto',this)"><span class="tbico">📖</span> كيفية الاستخدام</button>
    <button class="tab-btn" onclick="showTab('tech',this)"><span class="tbico">⚙️</span> المعلومات التقنية</button>
  </div>
</nav>

<!-- ══════════════════════════════
     MAIN CONTENT
══════════════════════════════ -->
<main class="content">

<!-- ─── TAB 1: OVERVIEW ─── -->
<div id="overview" class="tab-panel active">

  <div class="sec">
    <div class="sec-title"><div class="ico">🏢</div> ما هي منصة سمنان؟</div>
    <div class="sec-desc">نظام إداري داخلي متكامل يُحوّل إدارة المشاريع من العمل اليدوي المبعثر إلى منصة رقمية مركزية موحّدة</div>

    <div class="prob-sol">
      <div class="prob-block">
        <h4>❌ المشكلة قبل المنصة</h4>
        <ul class="bullet-list">
          <li>إدارة المشاريع عبر ملفات Excel متفرقة</li>
          <li>متابعة الدفعات عبر رسائل واتساب</li>
          <li>لا يوجد سجل واضح للنشاطات</li>
          <li>فقدان البيانات وصعوبة المتابعة</li>
          <li>لا توجد رؤية موحّدة لحالة المشاريع</li>
          <li>تأخر في تحصيل الدفعات المتأخرة</li>
        </ul>
      </div>
      <div class="sol-block">
        <h4>✅ الحل مع المنصة</h4>
        <ul class="bullet-list">
          <li>نظام مركزي واحد لجميع المشاريع</li>
          <li>تتبع الدفعات مع تنبيهات التأخر الفوري</li>
          <li>سجل كامل لكل نشاط في المنصة</li>
          <li>رفع وحفظ آمن لجميع المستندات</li>
          <li>لوحة تحكم مخصصة لكل دور</li>
          <li>تقارير شاملة قابلة للتصدير PDF</li>
        </ul>
      </div>
    </div>

    <div class="overview-grid">
      <div class="ov-card">
        <div class="ov-card-ico" style="background:#dbeafe">📁</div>
        <h3>إدارة المشاريع</h3>
        <p>إنشاء ومتابعة المشاريع كاملاً — بيانات العميل، الفريق، المبالغ، التواريخ، والمستندات في مكان واحد</p>
      </div>
      <div class="ov-card">
        <div class="ov-card-ico" style="background:#dcfce7">💰</div>
        <h3>تتبع الدفعات</h3>
        <p>جدولة 5 أنواع من الدفعات، متابعة التحصيل، تسجيل الإيصالات، وتنبيه المدفوعات المتأخرة</p>
      </div>
      <div class="ov-card">
        <div class="ov-card-ico" style="background:#fef9c3">🔧</div>
        <h3>التركيبات</h3>
        <p>جدولة مواعيد التركيب، تأكيد الفريق والعميل، متابعة التنفيذ، ورفع صور الإتمام</p>
      </div>
      <div class="ov-card">
        <div class="ov-card-ico" style="background:#f3e8ff">📎</div>
        <h3>المستندات والمرفقات</h3>
        <p>رفع العقود، الإيصالات، وصول الاستلام، وطلبات المواد — حتى 5 ملفات لكل نوع</p>
      </div>
      <div class="ov-card">
        <div class="ov-card-ico" style="background:#fff7ed">📊</div>
        <h3>التقارير والإحصائيات</h3>
        <p>4 تقارير شاملة: المشاريع، الدفعات، الفريق، سجل النشاطات — طباعة PDF كاملة</p>
      </div>
      <div class="ov-card">
        <div class="ov-card-ico" style="background:#fce7f3">👤</div>
        <h3>إدارة المستخدمين</h3>
        <p>إنشاء حسابات، تعديل الأدوار، تفعيل وإلغاء الحسابات — حصرياً للإدارة</p>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title"><div class="ico">📌</div> حالات المشروع الأربع</div>
    <div class="sec-desc">كل مشروع في المنصة يكون في إحدى هذه الحالات الأربع</div>
    <div class="status-row">
      <div class="spill spill-a">🔵 نشط — المشروع جارٍ</div>
      <div class="spill spill-d">🟢 مكتمل — أُغلق بنجاح</div>
      <div class="spill spill-h">🟡 معلق — متوقف مؤقتاً</div>
      <div class="spill spill-c">🔴 ملغي — ألغي مع ذكر السبب</div>
    </div>
    <div class="alert-box alert-info" style="margin-top:20px">
      <span>ℹ️</span>
      <span>لا يمكن إغلاق المشروع إلا بعد تحصيل جميع الدفعات. لا يمكن حذف مشروع إلا إذا كانت حالته "ملغي" أو "معلق".</span>
    </div>
  </div>

</div>

<!-- ─── TAB 2: ROLES ─── -->
<div id="roles" class="tab-panel">

  <div class="sec">
    <div class="sec-title"><div class="ico">👥</div> الأدوار والصلاحيات</div>
    <div class="sec-desc">أربعة أدوار محددة، كل دور يرى ما يحتاجه فقط — الأمان والخصوصية في صميم التصميم</div>

    <div class="roles-grid">
      <!-- Coordinator -->
      <div class="role-card" style="border-top:4px solid #1841A0">
        <div class="role-card-head">
          <div class="role-avatar" style="background:#dbeafe;font-size:26px">🔵</div>
          <div>
            <h3 style="color:#1d4ed8">الكوردنيتر</h3>
            <span class="slug" style="background:#dbeafe;color:#1d4ed8">coordinator</span>
          </div>
        </div>
        <div class="role-card-body">
          <ul class="role-perm-list">
            <li><span class="tick tick-yes">✓</span> إنشاء وتعديل المشاريع</li>
            <li><span class="tick tick-yes">✓</span> إدارة جدول الدفعات كاملاً</li>
            <li><span class="tick tick-yes">✓</span> تسجيل الدفعات ورفع الإيصالات</li>
            <li><span class="tick tick-yes">✓</span> جدولة وإدارة التركيبات</li>
            <li><span class="tick tick-yes">✓</span> رفع المستندات والمرفقات</li>
            <li><span class="tick tick-yes">✓</span> إغلاق وتعليق المشاريع</li>
            <li><span class="tick tick-yes">✓</span> رؤية جميع المشاريع</li>
            <li><span class="tick tick-no">✗</span> إدارة المستخدمين</li>
            <li><span class="tick tick-no">✗</span> التقارير الشاملة</li>
          </ul>
        </div>
      </div>

      <!-- Sales Engineer -->
      <div class="role-card" style="border-top:4px solid #16a34a">
        <div class="role-card-head">
          <div class="role-avatar" style="background:#dcfce7;font-size:26px">🟢</div>
          <div>
            <h3 style="color:#15803d">مهندس المبيعات</h3>
            <span class="slug" style="background:#dcfce7;color:#15803d">sales_engineer</span>
          </div>
        </div>
        <div class="role-card-body">
          <ul class="role-perm-list">
            <li><span class="tick tick-yes">✓</span> رؤية مشاريعه الخاصة فقط</li>
            <li><span class="tick tick-yes">✓</span> رفع العقود والمستندات</li>
            <li><span class="tick tick-yes">✓</span> عرض تفاصيل الدفعات</li>
            <li><span class="tick tick-yes">✓</span> متابعة حالة المشاريع</li>
            <li><span class="tick tick-no">✗</span> تعديل الدفعات أو تسجيلها</li>
            <li><span class="tick tick-no">✗</span> رؤية مشاريع الآخرين</li>
            <li><span class="tick tick-no">✗</span> التقارير</li>
            <li><span class="tick tick-no">✗</span> إدارة المستخدمين</li>
          </ul>
        </div>
      </div>

      <!-- Installation -->
      <div class="role-card" style="border-top:4px solid #7c3aed">
        <div class="role-card-head">
          <div class="role-avatar" style="background:#f3e8ff;font-size:26px">🟣</div>
          <div>
            <h3 style="color:#7c3aed">التركيبات</h3>
            <span class="slug" style="background:#f3e8ff;color:#7c3aed">installation</span>
          </div>
        </div>
        <div class="role-card-body">
          <ul class="role-perm-list">
            <li><span class="tick tick-yes">✓</span> رؤية جدول التركيبات</li>
            <li><span class="tick tick-yes">✓</span> تأكيد إتمام التركيب</li>
            <li><span class="tick tick-yes">✓</span> رفع صور الإتمام</li>
            <li><span class="tick tick-yes">✓</span> رؤية تفاصيل المشروع</li>
            <li><span class="tick tick-no">✗</span> تعديل بيانات المشروع</li>
            <li><span class="tick tick-no">✗</span> إدارة الدفعات</li>
            <li><span class="tick tick-no">✗</span> التقارير</li>
          </ul>
        </div>
      </div>

      <!-- Admin -->
      <div class="role-card" style="border-top:4px solid #dc2626">
        <div class="role-card-head">
          <div class="role-avatar" style="background:#fee2e2;font-size:26px">🔴</div>
          <div>
            <h3 style="color:#dc2626">الإدارة</h3>
            <span class="slug" style="background:#fee2e2;color:#dc2626">admin</span>
          </div>
        </div>
        <div class="role-card-body">
          <ul class="role-perm-list">
            <li><span class="tick tick-yes">✓</span> كامل صلاحيات الكوردنيتر</li>
            <li><span class="tick tick-yes">✓</span> إدارة المستخدمين (إنشاء/حذف/تعديل)</li>
            <li><span class="tick tick-yes">✓</span> الوصول للتقارير الشاملة</li>
            <li><span class="tick tick-yes">✓</span> حذف المشاريع (الملغاة/المعلقة)</li>
            <li><span class="tick tick-yes">✓</span> تغيير أدوار المستخدمين</li>
            <li><span class="tick tick-yes">✓</span> رؤية سجل النشاطات الكامل</li>
            <li><span class="tick tick-yes">✓</span> تصدير التقارير بصيغة PDF</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Permission Matrix -->
  <div class="sec">
    <div class="sec-title"><div class="ico">🔐</div> مصفوفة الصلاحيات التفصيلية</div>
    <div class="sec-desc">جدول مقارن شامل لكل الصلاحيات حسب كل دور</div>
    <table class="perm-matrix">
      <thead>
        <tr>
          <th style="text-align:right">الإجراء</th>
          <th>الكوردنيتر</th>
          <th>مهندس المبيعات</th>
          <th>التركيبات</th>
          <th>الإدارة</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>إنشاء مشروع جديد</td><td><span class="pm-yes">●</span></td><td><span class="pm-yes">●</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>رؤية جميع المشاريع</td><td><span class="pm-yes">●</span></td><td><span class="pm-partial">جزئي*</span></td><td><span class="pm-yes">●</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>تعديل بيانات المشروع</td><td><span class="pm-yes">●</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>إضافة دفعات جديدة</td><td><span class="pm-yes">●</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>تسجيل دفعة مستلمة</td><td><span class="pm-yes">●</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>جدولة التركيبات</td><td><span class="pm-yes">●</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>تأكيد إتمام التركيب</td><td><span class="pm-yes">●</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>رفع مستندات/مرفقات</td><td><span class="pm-yes">●</span></td><td><span class="pm-yes">●</span></td><td><span class="pm-yes">●</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>إغلاق/تعليق المشروع</td><td><span class="pm-yes">●</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>حذف المشروع</td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>التقارير الشاملة</td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
        <tr><td>إدارة المستخدمين</td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-no">○</span></td><td><span class="pm-yes">●</span></td></tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:var(--gray-500);margin-top:10px">* مهندس المبيعات يرى مشاريعه الخاصة فقط (المرتبطة به كـ sales_engineer)</p>
  </div>

</div>

<!-- ─── TAB 3: LIFECYCLE ─── -->
<div id="lifecycle" class="tab-panel">

  <div class="sec">
    <div class="sec-title"><div class="ico">🔄</div> دورة حياة المشروع الكاملة</div>
    <div class="sec-desc">كل مشروع يمر بهذه المراحل الخمس بالترتيب — من التعاقد حتى الإغلاق النهائي</div>

    <div class="timeline">

      <div class="tl-step">
        <div class="tl-num">1</div>
        <div class="tl-body">
          <div class="tl-head">
            <div class="tl-icon" style="background:#dbeafe">📝</div>
            <div>
              <h4>إنشاء المشروع وتوقيع العقد</h4>
            </div>
            <span class="tl-badge" style="background:#dbeafe;color:#1d4ed8">الكوردنيتر / مهندس المبيعات</span>
          </div>
          <ul class="tl-sub-steps">
            <li>إدخال بيانات العميل: الاسم، اسم المشروع، المبلغ الإجمالي</li>
            <li>تحديد تواريخ البدء والانتهاء المتوقعة</li>
            <li>تعيين الفريق: الكوردنيتر، مهندس المبيعات، مسؤول التركيبات</li>
            <li>رفع نسخة العقد الموقّع بصيغة PDF</li>
            <li>تحديد جدول الدفعات (أنواع ومبالغ وتواريخ)</li>
          </ul>
          <div class="tl-note">💡 النظام يسجّل تلقائياً نشاط "إنشاء المشروع" في سجل النشاطات</div>
        </div>
      </div>

      <div class="tl-step">
        <div class="tl-num">2</div>
        <div class="tl-body">
          <div class="tl-head">
            <div class="tl-icon" style="background:#dcfce7">💳</div>
            <div>
              <h4>تحصيل الدفعات</h4>
            </div>
            <span class="tl-badge" style="background:#dcfce7;color:#15803d">الكوردنيتر</span>
          </div>
          <ul class="tl-sub-steps">
            <li><strong>الدفعة الأولى (Upfront):</strong> تُطلب قبل بدء أي عمل</li>
            <li><strong>دفعة التوريد (Supply):</strong> قبل تسليم المواد</li>
            <li><strong>دفعة التركيب (Installation):</strong> قبل بدء التركيب</li>
            <li><strong>الدفعة النهائية (Final):</strong> عند إتمام جميع الأعمال</li>
            <li><strong>دفعات مخصصة (Custom):</strong> أي دفعات إضافية حسب الاتفاق</li>
            <li>لكل دفعة: تسجيل المبلغ المستلم + رفع الإيصال</li>
          </ul>
          <div class="tl-note">⚠️ الدفعات المتأخرة تظهر بتنبيه أحمر في لوحة تحكم المدير والكوردنيتر</div>
        </div>
      </div>

      <div class="tl-step">
        <div class="tl-num">3</div>
        <div class="tl-body">
          <div class="tl-head">
            <div class="tl-icon" style="background:#fef9c3">📦</div>
            <div>
              <h4>طلب المواد وتجهيزها</h4>
            </div>
            <span class="tl-badge" style="background:#fef9c3;color:#854d0e">الكوردنيتر</span>
          </div>
          <ul class="tl-sub-steps">
            <li>رفع ملف PDF يحتوي قائمة المواد المطلوبة للمشروع</li>
            <li>الملف يُحفظ في قسم "المرفقات" تحت نوع "طلب مواد"</li>
            <li>يمكن رفع أكثر من طلب حسب مراحل التنفيذ</li>
          </ul>
        </div>
      </div>

      <div class="tl-step">
        <div class="tl-num">4</div>
        <div class="tl-body">
          <div class="tl-head">
            <div class="tl-icon" style="background:#f3e8ff">🔧</div>
            <div>
              <h4>التركيب والتنفيذ</h4>
            </div>
            <span class="tl-badge" style="background:#f3e8ff;color:#7c3aed">الكوردنيتر + فريق التركيبات</span>
          </div>
          <ul class="tl-sub-steps">
            <li>الكوردنيتر يجدّل موعد التركيب ويحدد التاريخ</li>
            <li>تأكيد الفريق لاستلام مهمة التركيب</li>
            <li>تأكيد تبليغ العميل بالموعد</li>
            <li>فريق التركيبات يُنفّذ الأعمال ويؤكد الإتمام</li>
            <li>رفع صور الإتمام كمستندات في المشروع</li>
            <li>رفع وصل الاستلام (Delivery Note) إن وجد</li>
          </ul>
          <div class="tl-note">💡 يمكن جدولة التركيب في أي وقت بغض النظر عن حالة الدفعات</div>
        </div>
      </div>

      <div class="tl-step">
        <div class="tl-num">5</div>
        <div class="tl-body">
          <div class="tl-head">
            <div class="tl-icon" style="background:#dcfce7">✅</div>
            <div>
              <h4>إغلاق المشروع نهائياً</h4>
            </div>
            <span class="tl-badge" style="background:#dcfce7;color:#15803d">الكوردنيتر / الإدارة</span>
          </div>
          <ul class="tl-sub-steps">
            <li>التحقق من تحصيل جميع الدفعات (لا توجد دفعة معلقة أو جزئية)</li>
            <li>مراجعة اكتمال المستندات المطلوبة</li>
            <li>النقر على "إغلاق المشروع" لتغيير الحالة إلى "مكتمل"</li>
            <li>المشروع يُحفظ في السجل للرجوع إليه مستقبلاً</li>
          </ul>
          <div class="tl-note">⚠️ لن يسمح النظام بإغلاق المشروع إذا كانت هناك دفعات لم تُسدَّد بالكامل</div>
        </div>
      </div>

    </div>
  </div>

  <!-- Payment types -->
  <div class="sec">
    <div class="sec-title"><div class="ico">💳</div> أنواع الدفعات الخمسة</div>
    <table class="info-table">
      <thead><tr><th>النوع</th><th>الكود</th><th>التوقيت</th><th>الحالات المتاحة</th></tr></thead>
      <tbody>
        <tr><td><strong>الدفعة الأولى</strong></td><td><code>upfront</code></td><td>قبل بدء أي عمل</td><td>معلقة / جزئية / مدفوعة / متأخرة</td></tr>
        <tr><td><strong>دفعة التوريد</strong></td><td><code>supply</code></td><td>قبل تسليم المواد</td><td>معلقة / جزئية / مدفوعة / متأخرة</td></tr>
        <tr><td><strong>دفعة التركيب</strong></td><td><code>installation</code></td><td>قبل بدء التركيب</td><td>معلقة / جزئية / مدفوعة / متأخرة</td></tr>
        <tr><td><strong>الدفعة النهائية</strong></td><td><code>final</code></td><td>عند الإتمام الكامل</td><td>معلقة / جزئية / مدفوعة / متأخرة</td></tr>
        <tr><td><strong>دفعة مخصصة</strong></td><td><code>custom</code></td><td>حسب الاتفاق</td><td>معلقة / جزئية / مدفوعة / متأخرة / ملغاة</td></tr>
      </tbody>
    </table>
  </div>

</div>

<!-- ─── TAB 4: MODULES ─── -->
<div id="modules" class="tab-panel">
  <div class="sec">
    <div class="sec-title"><div class="ico">📦</div> وحدات المنصة</div>
    <div class="sec-desc">المنصة مقسّمة لوحدات متخصصة — اختر وحدة لعرض تفاصيلها</div>

    <div class="subtab-nav">
      <button class="subtab-btn active" onclick="showSubTab('mod-projects',this)">📁 المشاريع</button>
      <button class="subtab-btn" onclick="showSubTab('mod-payments',this)">💰 الدفعات</button>
      <button class="subtab-btn" onclick="showSubTab('mod-install',this)">🔧 التركيبات</button>
      <button class="subtab-btn" onclick="showSubTab('mod-docs',this)">📎 المستندات</button>
      <button class="subtab-btn" onclick="showSubTab('mod-reports',this)">📊 التقارير</button>
      <button class="subtab-btn" onclick="showSubTab('mod-users',this)">👤 المستخدمون</button>
    </div>

    <!-- Projects Module -->
    <div id="mod-projects" class="subpanel active">
      <div class="module-header">
        <div class="mico">📁</div>
        <div>
          <h3>وحدة المشاريع</h3>
          <p>النواة الأساسية للمنصة — كل شيء يدور حول المشروع</p>
        </div>
      </div>
      <div class="feat-grid">
        <div class="feat-item"><div class="fi-ico" style="background:#dbeafe">✏️</div><div class="feat-item-txt"><h5>إنشاء وتعديل</h5><p>إنشاء مشاريع جديدة بجميع بياناتها وتعديلها لاحقاً</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#dcfce7">👥</div><div class="feat-item-txt"><h5>تعيين الفريق</h5><p>ربط الكوردنيتر ومهندس المبيعات ومسؤول التركيبات</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fef9c3">🔍</div><div class="feat-item-txt"><h5>بحث وفلترة</h5><p>فلترة المشاريع حسب الحالة وبحث بالاسم أو العميل</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#f3e8ff">📋</div><div class="feat-item-txt"><h5>سجل النشاطات</h5><p>تاريخ كامل لكل تعديل وتغيير في المشروع</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fff7ed">🏷️</div><div class="feat-item-txt"><h5>إدارة الحالة</h5><p>تغيير حالة المشروع: إغلاق، تعليق، إلغاء مع السبب</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fee2e2">🗑️</div><div class="feat-item-txt"><h5>حذف المشاريع</h5><p>حذف نهائي متاح للإدارة فقط — للمشاريع الملغاة/المعلقة</p></div></div>
      </div>
    </div>

    <!-- Payments Module -->
    <div id="mod-payments" class="subpanel">
      <div class="module-header">
        <div class="mico">💰</div>
        <div>
          <h3>وحدة الدفعات</h3>
          <p>تتبع كامل لتحصيل الدفعات مع تنبيهات التأخر</p>
        </div>
      </div>
      <div class="feat-grid">
        <div class="feat-item"><div class="fi-ico" style="background:#dcfce7">➕</div><div class="feat-item-txt"><h5>إضافة دفعات</h5><p>5 أنواع من الدفعات مع تحديد المبالغ والتواريخ</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#dbeafe">💵</div><div class="feat-item-txt"><h5>تسجيل الدفع</h5><p>تسجيل المبالغ المستلمة جزئياً أو كلياً</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fef9c3">🧾</div><div class="feat-item-txt"><h5>رفع الإيصالات</h5><p>رفع صور أو PDF الإيصالات مع كل دفعة</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fee2e2">⚠️</div><div class="feat-item-txt"><h5>تنبيه التأخر</h5><p>تمييز الدفعات المتأخرة بلون أحمر مع إجمالي المتأخر</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#f3e8ff">📊</div><div class="feat-item-txt"><h5>شريط التقدم</h5><p>شريط مرئي يظهر نسبة التحصيل من إجمالي المشروع</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fff7ed">📋</div><div class="feat-item-txt"><h5>صفحة المدفوعات</h5><p>صفحة مخصصة بكل مدفوعات جميع المشاريع في مكان واحد</p></div></div>
      </div>
    </div>

    <!-- Installation Module -->
    <div id="mod-install" class="subpanel">
      <div class="module-header">
        <div class="mico">🔧</div>
        <div>
          <h3>وحدة التركيبات</h3>
          <p>جدولة وتنسيق التركيبات بين الكوردنيتر وفريق التركيبات والعميل</p>
        </div>
      </div>
      <div class="feat-grid">
        <div class="feat-item"><div class="fi-ico" style="background:#f3e8ff">📅</div><div class="feat-item-txt"><h5>جدولة الموعد</h5><p>تحديد تاريخ التركيب من قبل الكوردنيتر</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#dbeafe">✅</div><div class="feat-item-txt"><h5>تأكيد الفريق</h5><p>تسجيل تأكيد فريق التركيبات للموعد</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#dcfce7">📣</div><div class="feat-item-txt"><h5>تبليغ العميل</h5><p>تسجيل تأكيد تبليغ العميل بموعد التركيب</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fef9c3">🏁</div><div class="feat-item-txt"><h5>تأكيد الإتمام</h5><p>فريق التركيبات يؤكد إتمام العمل</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fff7ed">📸</div><div class="feat-item-txt"><h5>صور الإتمام</h5><p>رفع صور العمل المنجز كتوثيق للمشروع</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fee2e2">🔄</div><div class="feat-item-txt"><h5>إعادة الجدولة</h5><p>تأجيل الموعد مع ذكر سبب التأخير</p></div></div>
      </div>
    </div>

    <!-- Documents Module -->
    <div id="mod-docs" class="subpanel">
      <div class="module-header">
        <div class="mico">📎</div>
        <div>
          <h3>وحدة المستندات والمرفقات</h3>
          <p>حفظ وتنظيم جميع ملفات المشروع في مكان واحد</p>
        </div>
      </div>
      <div class="feat-grid">
        <div class="feat-item"><div class="fi-ico" style="background:#dbeafe">📄</div><div class="feat-item-txt"><h5>العقود</h5><p>رفع العقود الموقّعة (PDF) مع كل مشروع</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#dcfce7">🧾</div><div class="feat-item-txt"><h5>الإيصالات</h5><p>إيصالات الدفعات المستلمة كل على حدة</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fef9c3">🚚</div><div class="feat-item-txt"><h5>وصل الاستلام</h5><p>Delivery Notes — تأكيد استلام المواد والتجهيزات</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#f3e8ff">📦</div><div class="feat-item-txt"><h5>طلبات المواد</h5><p>قوائم PDF بالمواد المطلوبة لكل مرحلة</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fff7ed">📸</div><div class="feat-item-txt"><h5>صور التنفيذ</h5><p>صور الإتمام والتوثيق من موقع التركيب</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fee2e2">📁</div><div class="feat-item-txt"><h5>مستندات أخرى</h5><p>أي ملفات إضافية تخص المشروع (حتى 5 ملفات/نوع)</p></div></div>
      </div>
      <div class="alert-box alert-info">
        <span>📌</span>
        <span>الحد الأقصى 5 ملفات لكل نوع مستند في المشروع الواحد. الملفات تُخزَّن في Supabase Storage بشكل آمن.</span>
      </div>
    </div>

    <!-- Reports Module -->
    <div id="mod-reports" class="subpanel">
      <div class="module-header">
        <div class="mico">📊</div>
        <div>
          <h3>وحدة التقارير والإحصائيات</h3>
          <p>4 تقارير شاملة قابلة للطباعة وتصدير PDF — للإدارة فقط</p>
        </div>
      </div>
      <table class="info-table">
        <thead><tr><th>التقرير</th><th>المحتوى</th><th>الإحصائيات الرئيسية</th></tr></thead>
        <tbody>
          <tr><td><strong>📁 تقرير المشاريع</strong></td><td>جميع المشاريع مع الكوردنيتر ومهندس المبيعات والحالة والمبلغ</td><td>إجمالي، نشطة، مكتملة، معلقة، إجمالي القيمة</td></tr>
          <tr><td><strong>💰 تقرير الدفعات</strong></td><td>جميع الدفعات بأنواعها وحالاتها والمبالغ المستلمة</td><td>إجمالي، مدفوعة، متأخرة، إجمالي المحصّل</td></tr>
          <tr><td><strong>👥 تقرير الفريق</strong></td><td>جميع الموظفين مع أدوارهم وحالاتهم وتاريخ الانضمام</td><td>إجمالي، نشطون، غير نشطين، توزيع الأدوار</td></tr>
          <tr><td><strong>📋 سجل النشاطات</strong></td><td>آخر 300 نشاط في المنصة مع التاريخ والوقت والمسؤول</td><td>تاريخ كامل لكل تعديل وعملية</td></tr>
        </tbody>
      </table>
      <div class="alert-box alert-success" style="margin-top:20px">
        <span>🖨️</span>
        <span>جميع التقارير قابلة للطباعة مباشرةً من المتصفح أو حفظها PDF — الرأسية والتذييل يظهران تلقائياً في الطباعة.</span>
      </div>
    </div>

    <!-- Users Module -->
    <div id="mod-users" class="subpanel">
      <div class="module-header">
        <div class="mico">👤</div>
        <div>
          <h3>وحدة إدارة المستخدمين</h3>
          <p>إنشاء وإدارة حسابات الفريق — متاح للإدارة فقط</p>
        </div>
      </div>
      <div class="feat-grid">
        <div class="feat-item"><div class="fi-ico" style="background:#dcfce7">➕</div><div class="feat-item-txt"><h5>إنشاء حساب</h5><p>إنشاء حساب جديد بالاسم والإيميل وكلمة المرور والدور</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#dbeafe">✏️</div><div class="feat-item-txt"><h5>تعديل الدور</h5><p>تغيير دور أي مستخدم في أي وقت من قائمة المستخدمين</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fee2e2">🗑️</div><div class="feat-item-txt"><h5>حذف الحساب</h5><p>حذف حساب أي مستخدم نهائياً (لا يمكن حذف حسابك الخاص)</p></div></div>
        <div class="feat-item"><div class="fi-ico" style="background:#fef9c3">👁️</div><div class="feat-item-txt"><h5>عرض الفريق</h5><p>قائمة بجميع المستخدمين مع أدوارهم وتاريخ إنشاء الحساب</p></div></div>
      </div>
    </div>

  </div>
</div>

<!-- ─── TAB 5: HOW TO ─── -->
<div id="howto" class="tab-panel">

  <div class="sec">
    <div class="sec-title"><div class="ico">📖</div> كيفية الاستخدام — خطوة بخطوة</div>
    <div class="sec-desc">دليل تفصيلي لكل دور — افتح القسم الخاص بك</div>

    <!-- Coordinator -->
    <div class="acc-wrap">
      <div class="acc-head open" onclick="toggleAcc(this)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🔵</span>
          <span>دليل الكوردنيتر</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="acc-badge" style="background:#dbeafe;color:#1d4ed8">الأكثر استخداماً</span>
          <span class="acc-arrow">▼</span>
        </div>
      </div>
      <div class="acc-body open">
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px">الكوردنيتر هو المحور الرئيسي لإدارة المشاريع — يمتلك أوسع الصلاحيات بعد الإدارة</p>
        <strong style="font-size:13px;color:var(--brand-dark)">إنشاء مشروع جديد:</strong>
        <ol class="steps-ol">
          <li>من القائمة الجانبية: اضغط "المشاريع" ثم "مشروع جديد"</li>
          <li>أدخل اسم العميل، اسم المشروع، المبلغ الإجمالي</li>
          <li>حدد تاريخ البدء والانتهاء المتوقع</li>
          <li>اختر الفريق: الكوردنيتر، مهندس المبيعات، مسؤول التركيبات</li>
          <li>ارفع نسخة العقد الموقّع (PDF)</li>
          <li>اضغط "إنشاء المشروع"</li>
        </ol>
        <strong style="font-size:13px;color:var(--brand-dark);display:block;margin-top:16px">تسجيل دفعة مستلمة:</strong>
        <ol class="steps-ol">
          <li>افتح المشروع من قائمة المشاريع</li>
          <li>اضغط على تبويب "الدفعات"</li>
          <li>اضغط على الدفعة المطلوبة لفتح تفاصيلها</li>
          <li>اضغط "تسجيل دفعة" وأدخل المبلغ المستلم</li>
          <li>ارفع صورة الإيصال أو ملف PDF</li>
          <li>اضغط "حفظ" — ستُحدَّث الحالة تلقائياً</li>
        </ol>
        <strong style="font-size:13px;color:var(--brand-dark);display:block;margin-top:16px">جدولة التركيب:</strong>
        <ol class="steps-ol">
          <li>افتح المشروع ثم تبويب "التركيبات"</li>
          <li>اضغط "جدولة التركيب" وحدد التاريخ</li>
          <li>أكّد تبليغ العميل وتأكيد الفريق</li>
          <li>بعد التنفيذ: اضغط "تأكيد الإتمام"</li>
        </ol>
        <strong style="font-size:13px;color:var(--brand-dark);display:block;margin-top:16px">إغلاق المشروع:</strong>
        <ol class="steps-ol">
          <li>تأكد من تحصيل جميع الدفعات (لا توجد دفعة معلقة)</li>
          <li>افتح المشروع → اضغط "إغلاق المشروع"</li>
          <li>أكّد الإغلاق في نافذة التأكيد</li>
          <li>ستتغير حالة المشروع إلى "مكتمل" تلقائياً</li>
        </ol>
        <div class="tip-box"><span>💡</span><span>يمكنك أيضاً "تعليق" المشروع إذا توقف مؤقتاً، أو "إلغاؤه" مع ذكر السبب. المشاريع الملغاة أو المعلقة يمكن حذفها من قِبَل الإدارة.</span></div>
      </div>
    </div>

    <!-- Sales Engineer -->
    <div class="acc-wrap">
      <div class="acc-head" onclick="toggleAcc(this)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🟢</span>
          <span>دليل مهندس المبيعات</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="acc-badge" style="background:#dcfce7;color:#15803d">مشاريعه فقط</span>
          <span class="acc-arrow">▼</span>
        </div>
      </div>
      <div class="acc-body">
        <ol class="steps-ol">
          <li>بعد تسجيل الدخول، تظهر لوحة تحكم تعرض مشاريعك الخاصة فقط</li>
          <li>اضغط على أي مشروع لعرض تفاصيله الكاملة</li>
          <li>يمكنك رؤية جدول الدفعات وحالة كل دفعة</li>
          <li>لرفع مستند: افتح المشروع → تبويب "المرفقات" → "رفع مستند"</li>
          <li>اختر نوع المستند (عقد، مستند آخر) وارفع الملف</li>
        </ol>
        <div class="tip-box"><span>ℹ️</span><span>مهندس المبيعات يرى فقط المشاريع التي عُيّن فيها كـ "مهندس مبيعات". الكوردنيتر هو من يديرها ويسجّل الدفعات.</span></div>
      </div>
    </div>

    <!-- Installation -->
    <div class="acc-wrap">
      <div class="acc-head" onclick="toggleAcc(this)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🟣</span>
          <span>دليل فريق التركيبات</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="acc-badge" style="background:#f3e8ff;color:#7c3aed">التركيبات فقط</span>
          <span class="acc-arrow">▼</span>
        </div>
      </div>
      <div class="acc-body">
        <ol class="steps-ol">
          <li>بعد تسجيل الدخول، تظهر صفحة "التركيبات" مع جميع المواعيد المجدولة</li>
          <li>اضغط على المشروع المطلوب لعرض تفاصيل التركيب</li>
          <li>عند بدء التنفيذ: اضغط "بدء التركيب" لتحديث الحالة</li>
          <li>بعد إتمام العمل: اضغط "تأكيد الإتمام"</li>
          <li>ارفع صور الإتمام من تبويب "المرفقات"</li>
        </ol>
        <div class="tip-box"><span>💡</span><span>فريق التركيبات لا يتحكم في جدولة المواعيد — هذا دور الكوردنيتر. مهمتهم التأكيد والتنفيذ والتوثيق.</span></div>
      </div>
    </div>

    <!-- Admin -->
    <div class="acc-wrap">
      <div class="acc-head" onclick="toggleAcc(this)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🔴</span>
          <span>دليل الإدارة (Admin)</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="acc-badge" style="background:#fee2e2;color:#b91c1c">صلاحيات كاملة</span>
          <span class="acc-arrow">▼</span>
        </div>
      </div>
      <div class="acc-body">
        <strong style="font-size:13px;color:var(--brand-dark)">الوصول للتقارير:</strong>
        <ol class="steps-ol">
          <li>من لوحة التحكم: اضغط على كارت "PDF التقارير" الأخضر</li>
          <li>اختر نوع التقرير: المشاريع، الدفعات، الفريق، أو سجل النشاطات</li>
          <li>راجع البيانات المعروضة على الشاشة</li>
          <li>اضغط "طباعة / تحميل PDF" لحفظ التقرير</li>
        </ol>
        <strong style="font-size:13px;color:var(--brand-dark);display:block;margin-top:16px">إدارة المستخدمين:</strong>
        <ol class="steps-ol">
          <li>من القائمة الجانبية: قسم "الإدارة" → "إدارة المستخدمين"</li>
          <li>لإضافة مستخدم: اضغط "مستخدم جديد" وأدخل البيانات</li>
          <li>لتغيير الدور: اختر الدور الجديد من القائمة بجانب الاسم</li>
          <li>لحذف حساب: اضغط أيقونة الحذف (🗑️) بجانب الاسم وأكّد</li>
        </ol>
        <strong style="font-size:13px;color:var(--brand-dark);display:block;margin-top:16px">حذف مشروع:</strong>
        <ol class="steps-ol">
          <li>افتح المشروع المطلوب (يجب أن يكون "ملغي" أو "معلق")</li>
          <li>اضغط "حذف المشروع نهائياً" الموجود أسفل بيانات المشروع</li>
          <li>أكّد الحذف في نافذة التأكيد</li>
          <li>سيتم حذف المشروع وجميع بياناته المرتبطة نهائياً</li>
        </ol>
        <div class="tip-box"><span>⚠️</span><span>الحذف نهائي ولا يمكن التراجع عنه. تأكد قبل الحذف أن المشروع لا يحتوي على بيانات مهمة تحتاجها.</span></div>
      </div>
    </div>

  </div>
</div>

<!-- ─── TAB 6: TECHNICAL ─── -->
<div id="tech" class="tab-panel">

  <div class="sec">
    <div class="sec-title"><div class="ico">⚙️</div> المعلومات التقنية</div>
    <div class="sec-desc">المنصة مبنية بأحدث تقنيات الويب — مستقرة، آمنة، وسريعة</div>
    <div class="tech-grid">
      <div class="tech-card"><div class="tech-lbl">الاستضافة</div><div class="tech-val">Vercel</div><div class="tech-sub">نشر تلقائي عند كل تحديث</div></div>
      <div class="tech-card"><div class="tech-lbl">قاعدة البيانات</div><div class="tech-val">Supabase (PostgreSQL)</div><div class="tech-sub">مع RLS — حماية على مستوى الصف</div></div>
      <div class="tech-card"><div class="tech-lbl">تخزين الملفات</div><div class="tech-val">Supabase Storage</div><div class="tech-sub">الملفات والمستندات والصور</div></div>
      <div class="tech-card"><div class="tech-lbl">الإطار الأمامي</div><div class="tech-val">Next.js 15 + TypeScript</div><div class="tech-sub">App Router + Server Actions</div></div>
      <div class="tech-card"><div class="tech-lbl">التصميم</div><div class="tech-val">Tailwind CSS + Cairo</div><div class="tech-sub">RTL عربي كامل</div></div>
      <div class="tech-card"><div class="tech-lbl">المصادقة</div><div class="tech-val">Supabase Auth</div><div class="tech-sub">JWT + Session cookies</div></div>
      <div class="tech-card"><div class="tech-lbl">الرابط المباشر</div><div class="tech-val"><a href="https://samnan-platform.vercel.app" target="_blank">samnan-platform.vercel.app</a></div><div class="tech-sub">متاح على مدار الساعة</div></div>
      <div class="tech-card"><div class="tech-lbl">المطوّر</div><div class="tech-val"><a href="https://tfco.sa" target="_blank">Thakaa Flow</a></div><div class="tech-sub">ai@tfco.sa · tfco.sa</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title"><div class="ico">🗄️</div> جداول قاعدة البيانات</div>
    <div class="sec-desc">9 جداول في Supabase تغطي جميع احتياجات المنصة</div>
    <table class="db-table">
      <thead><tr><th>الجدول</th><th>الغرض</th><th>الحقول الرئيسية</th></tr></thead>
      <tbody>
        <tr><td><span class="db-badge">profiles</span></td><td>بيانات المستخدمين والأدوار</td><td>id, full_name, role, is_active</td></tr>
        <tr><td><span class="db-badge">projects</span></td><td>المشاريع الرئيسية</td><td>id, client_name, project_name, total_amount, status, coordinator_id</td></tr>
        <tr><td><span class="db-badge">payments</span></td><td>جدول الدفعات</td><td>id, project_id, type, amount, paid_amount, status, due_date</td></tr>
        <tr><td><span class="db-badge">installations</span></td><td>جدولة التركيبات</td><td>id, project_id, scheduled_date, status, completion_photos</td></tr>
        <tr><td><span class="db-badge">materials</span></td><td>طلبات المواد</td><td>id, project_id, items (jsonb), status</td></tr>
        <tr><td><span class="db-badge">documents</span></td><td>المرفقات والمستندات</td><td>id, project_id, type, url, uploaded_by</td></tr>
        <tr><td><span class="db-badge">supply_orders</span></td><td>أوامر التوريد</td><td>id, project_id, scheduled_date, status</td></tr>
        <tr><td><span class="db-badge">activity_log</span></td><td>سجل جميع النشاطات</td><td>id, project_id, user_id, action, details, created_at</td></tr>
        <tr><td><span class="db-badge">notifications</span></td><td>الإشعارات (مستقبلاً)</td><td>id, project_id, channel, status, message</td></tr>
      </tbody>
    </table>
  </div>

  <div class="sec">
    <div class="sec-title"><div class="ico">🔐</div> الأمان والحماية</div>
    <div class="feat-grid">
      <div class="feat-item"><div class="fi-ico" style="background:#dcfce7">🛡️</div><div class="feat-item-txt"><h5>Row Level Security</h5><p>RLS على كل جدول — كل مستخدم يرى ما يخصّه فقط</p></div></div>
      <div class="feat-item"><div class="fi-ico" style="background:#dbeafe">🔑</div><div class="feat-item-txt"><h5>JWT Authentication</h5><p>جلسات آمنة مع انتهاء صلاحية تلقائي</p></div></div>
      <div class="feat-item"><div class="fi-ico" style="background:#f3e8ff">🚦</div><div class="feat-item-txt"><h5>Middleware Guard</h5><p>حماية جميع صفحات الداشبورد من المستخدمين غير المسجلين</p></div></div>
      <div class="feat-item"><div class="fi-ico" style="background:#fef9c3">✅</div><div class="feat-item-txt"><h5>Server-side Validation</h5><p>التحقق من جميع المدخلات على الخادم</p></div></div>
      <div class="feat-item"><div class="fi-ico" style="background:#fff7ed">🔒</div><div class="feat-item-txt"><h5>Service Role for Writes</h5><p>الكتابة عبر service role — تجاوز آمن لـ RLS عند الحاجة</p></div></div>
      <div class="feat-item"><div class="fi-ico" style="background:#fee2e2">📝</div><div class="feat-item-txt"><h5>Activity Logging</h5><p>تسجيل كل عملية في سجل النشاطات للمراجعة والمراقبة</p></div></div>
    </div>
  </div>

</div>

</main>

<!-- ══════════════════════════════
     FOOTER
══════════════════════════════ -->
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-col footer-logo-wrap">
      <img class="footer-samnan-logo" src="data:image/png;base64,{logo_b64}" alt="سمنان">
      <p>مجموعة سمنان القابضة<br>Samnan Holding Group</p>
      <p>المملكة العربية السعودية · 2026</p>
    </div>
    <div class="footer-col">
      <h4>روابط المنصة</h4>
      <a href="https://samnan-platform.vercel.app" target="_blank">🔗 الرابط المباشر</a>
      <a href="https://samnan-platform.vercel.app/login">🔐 تسجيل الدخول</a>
    </div>
    <div class="footer-col">
      <h4>تطوير وصيانة</h4>
      <img src="data:image/png;base64,{tf_logo_b64}" alt="Thakaa Flow" style="height:44px;margin-bottom:10px;display:block">
      <a href="mailto:ai@tfco.sa">✉️ ai@tfco.sa</a>
      <a href="https://tfco.sa" target="_blank">🌐 tfco.sa</a>
      <p style="margin-top:8px">Thakaa Flow — ذكاء فلو</p>
    </div>
  </div>
  <div class="footer-bottom">
    <p>منصة سمنان الإدارية &copy; 2026 · جميع الحقوق محفوظة لمجموعة سمنان القابضة</p>
    <p>تطوير: <a href="https://tfco.sa">Thakaa Flow</a> · وثيقة رسمية — إصدار 2026</p>
  </div>
</footer>

<script>
function showTab(id, btn) {{
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  window.scrollTo({{top: document.querySelector('.tab-nav').offsetTop - 10, behavior: 'smooth'}});
}}

function showSubTab(id, btn) {{
  const parent = btn.closest('.sec');
  parent.querySelectorAll('.subpanel').forEach(p => p.classList.remove('active'));
  parent.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}}

function toggleAcc(head) {{
  const body = head.nextElementSibling;
  const isOpen = head.classList.contains('open');
  head.classList.toggle('open', !isOpen);
  body.classList.toggle('open', !isOpen);
}}
</script>
</body>
</html>'''

with open('samnan-docs.html', 'w', encoding='utf-8') as f:
    f.write(HTML)
print('Done! File size:', round(len(HTML)/1024, 1), 'KB')
