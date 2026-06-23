#!/usr/bin/env node
/**
 * One-time loader for THIS WEEK's data: clears the 4 demo cards, adds the 14
 * MASTER TO-DO tasks, and sets the Payments + Calendar snapshots.
 * Usage:  BOARD_URL=https://goku-kanban.vercel.app BOARD_KEY=goku123 node scripts/load-week2.mjs
 */
const API = (process.env.BOARD_URL || "").replace(/\/$/, "") + "/api/state";
const KEY = process.env.BOARD_KEY || "";
if (!process.env.BOARD_URL || !KEY) {
  console.error("Set BOARD_URL and BOARD_KEY env vars first.");
  process.exit(1);
}
const post = (action, payload) =>
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-board-key": KEY },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

const demoCards = [
  "wk_2026-W26_welcome",
  "wk_2026-W26_sample-followups",
  "wk_2026-W26_sample-doing",
  "wk_2026-W26_sample-done",
];

const tasks = [
  { title: "Close all open Diageo billing points by mid-week (rejected invoices, portal POs, confirm to Vaibhav)", column: "todo", priority: "high", flags: ["work", "urgent"], dueDate: "2026-06-24" },
  { title: "Re-upload the 3 Diageo rejected invoices with correct proof of work (after Vaibhav confirms Lumineers proof)", column: "todo", priority: "high", flags: ["work"] },
  { title: "Follow up with Priya (Sponco) on the 2 POs not visible on the Diageo portal", column: "todo", priority: "med", flags: ["work"] },
  { title: "Bring H&M Lolla 2027 kickoff status to Tuesday's biweekly and the 1:1 with Allan", column: "todo", priority: "high", flags: ["work"], dueDate: "2026-06-23" },
  { title: "Confirm Shrey Sureka has access to all 3 H&M Lolla 26 documents", column: "todo", priority: "med", flags: ["work"] },
  { title: "Collect feedback on the CS Team Onboarding Doc and finalise in one pass", column: "todo", priority: "med", flags: ["work"] },
  { title: "Verify and resend the weekly payment update to Rustom and Ashok", column: "todo", priority: "high", flags: ["work"], dueDate: "2026-06-26" },
  { title: "Chase Sanjana on ITC / Jagran / PMC (silent since May 29)", column: "todo", priority: "med", flags: ["work"] },
  { title: "Coordinate with Krishna on Lolla 27 x Nivea scope split; follow up with Rashmi Nandoskar", column: "todo", priority: "med", flags: ["work"] },
  { title: "Chase Beam Suntory (Chandra Mohan) on MIX / Oaksmith payment; escalate via Amit Talreja", column: "todo", priority: "med", flags: ["work"] },
  { title: "Confirm with Amol / Shraddha whether the H&M commission to Live Nation is processed", column: "todo", priority: "med", flags: ["work"] },
  { title: "Find Richard D'Souza's updated email for the Nivea reimbursement trail", column: "todo", priority: "low", flags: ["work"] },
  { title: "Grant Krishna access to Event_Intelligence_Report_BLR_HYD_v2", column: "todo", priority: "low", flags: ["work"] },
  { title: "Review the Brand Partnerships agenda doc before Thursday Jun 25", column: "todo", priority: "med", flags: ["work"], dueDate: "2026-06-25" },
];

const payments = [
  { brand: "Diageo — 3 rejected invoices", ptype: "Awaiting re-upload with proof of work", lastChased: "~Jun 17 (Omkar → Vaibhav)", owner: "Omkar (after Vaibhav confirms Lumineers proof)", action: "Confirm acceptable proof for the Lumineers invoice, then re-upload all 3 (2 Post Malone tickets, 1 Lumineers).", status: "chasing" },
  { brand: "Diageo — Lolla 26 portal POs", ptype: "Awaiting PO visibility on portal", lastChased: "Jun 16 (Omkar)", owner: "Priya, Sponco", action: "Follow up with Priya on the 2 POs not visible on the portal. Part of mid-week books closure.", status: "chasing" },
  { brand: "ITC / Jagran / PMC", ptype: "Awaiting PO / payment (multiple events)", lastChased: "May 29 (Omkar → Sanjana)", owner: "Sanjana (PMC Consultants)", action: "Chase again — ~24 days silent. Invoice numbers and dates already shared.", status: "chasing" },
  { brand: "MIX / Oaksmith (Beam Suntory)", ptype: "Awaiting payment timeline", lastChased: "Jun 19 (Dharam Saraviya)", owner: "Dharam Saraviya + Omkar", action: "Get a Beam Suntory response on timeline. Escalate via Amit Talreja if no reply.", status: "chasing" },
  { brand: "Live Nation / H&M commission", ptype: "Awaiting internal processing confirmation", lastChased: "Jun 15 (Omkar → Amol, Shraddha)", owner: "Amol Gurav / Shraddha Raut (BMS finance)", action: "Confirm whether the H&M commission has been processed to Live Nation.", status: "pending" },
  { brand: "Nivea — Lolla 26 GST reimbursement", ptype: "Awaiting reimbursement processing", lastChased: "Jun 15 (Amol / Shraddha thread)", owner: "Amol Gurav / Shraddha Raut", action: "Reimburse Nivea for GST they paid. Find updated SPOC — richard.dsouza is bouncing.", status: "pending" },
  { brand: "Liquid IV / HUL", ptype: "Awaiting UTR", lastChased: "May 28 (C3 update)", owner: "HUL finance", action: "Follow up on UTR. Invoices sent May 13. (status not refreshed — verify)", status: "pending" },
  { brand: "HUL / Bigtree", ptype: "Awaiting VP approval (post-facto)", lastChased: "May 29 (Saumitra → Twisha Shah)", owner: "Twisha Shah", action: "Check if Saumitra has a response. (status not refreshed — verify)", status: "pending" },
  { brand: "AbInBev / Budweiser", ptype: "Awaiting PO numbers from BMS", lastChased: "not refreshed this run", owner: "Omkar / Shubham Awana", action: "Clarify with Shubham what is still pending.", status: "pending" },
  { brand: "John Mayer / Vedica (Bisleri)", ptype: "", lastChased: "", owner: "", action: "Payment received Jun 10 (Toral confirmed).", status: "closed" },
  { brand: "Diageo Open PO 4502315371", ptype: "", lastChased: "", owner: "", action: "Confirmed Jun 10; reopened Jun 18 with books-closure query (now in tasks).", status: "closed" },
];

const events = [
  { date: "2026-06-23", day: "Tuesday, June 23", time: "12:00 PM", title: "Lolla 2027 biweekly", location: "Google Meet", attendees: "Allan, Krishna, Toral", bring: "H&M Lolla 2027 kickoff status + brand pipeline" },
  { date: "2026-06-23", day: "Tuesday, June 23", time: "2:30 PM", title: "1:1 — Omkar x Allan", location: "Atlas, 3rd floor + Meet (cvf-spvq-uac)", attendees: "Allan", bring: "H&M update, Diageo books-closure status, workload split" },
  { date: "2026-06-23", day: "Tuesday, June 23", time: "4:00 PM", title: "Brands x Production: Emerging Tech & Ideation", location: "Google Meet (rtx-bxvw-ven)", attendees: "Ingrid D'Souza + cross-functional", bring: "Sponsor-relevant activation ideas" },
  { date: "2026-06-25", day: "Thursday, June 25", time: "12:00 PM", title: "Weekly Brand Partnerships", location: "Tron, Ground floor + Meet (kvt-yaww-swq)", attendees: "Allan", bring: "Diageo closure, H&M, ITC/Jagran/PMC, MIX/Oaksmith — review agenda doc first" },
  { date: "2026-06-29", day: "Monday, June 29", time: "11:00 AM", title: "Payments Followup (recurring)", location: "Linked to Brands Payment & Contract Tracker", attendees: "Omkar", bring: "All open payment items current" },
];

for (const id of demoCards) await post("deleteTask", { id });
const m = await post("mergeWeekly", { week: "2026-W26", tasks });
const p = await post("setPayments", { payments });
const e = await post("setEvents", { events });
console.log(`Tasks added: ${m.added} | Payments: ${(p.payments||[]).length} | Events: ${(e.events||[]).length}`);
