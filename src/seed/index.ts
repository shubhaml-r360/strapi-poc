import type { Core } from '@strapi/strapi';

// Sample data mirroring the prototype screens. Runs once, on first boot against an empty database.
// Disable with SEED=false. Re-run on a fresh DB, or delete the 'phantom-seed' store key to force.
const STORE_KEY = 'phantom-seed';
const H = 3600 * 1000;

const now = Date.now();
const ago = (hours: number) => new Date(now - hours * H).toISOString();
const ahead = (hours: number) => new Date(now + hours * H).toISOString();
const at = (iso: string) => new Date(`${iso}+05:30`).toISOString(); // IST wall-clock → ISO

export async function seed(strapi: Core.Strapi) {
  if (process.env.SEED === 'false') return;

  const store = strapi.store({ type: 'core', name: STORE_KEY });
  if (await store.get({ key: 'done' })) return;

  const docs = (uid: string) => (strapi.documents as any)(uid);
  if ((await docs('api::member.member').count({})) > 0) {
    await store.set({ key: 'done', value: true });
    return; // someone already has data here; don't mix
  }

  const make = async (uid: string, data: Record<string, unknown>): Promise<string> =>
    (await docs(uid).create({ data })).documentId;

  // ── Agents ────────────────────────────────────────────────────────────────
  const agent: Record<string, string> = {};
  for (const a of [
    { name: 'Prakriti M', email: 'prakriti.m@phantom.example', role: 'l1', pod: 'pod 1', availability: 'available' },
    { name: 'Priya Iyer', email: 'priya.iyer@phantom.example', role: 'relationship_manager', pod: 'pod 2', availability: 'available' },
    { name: 'Arvind Sood', email: 'arvind.sood@phantom.example', role: 'relationship_manager', pod: 'pod 1', availability: 'available' },
    { name: 'Rohit Sharma', email: 'rohit.sharma@phantom.example', role: 'outbound', pod: 'outbound', availability: 'busy' },
    { name: 'Sanjay Bhat', email: 'sanjay.bhat@phantom.example', role: 'escalation', pod: 'escalation', availability: 'available' },
    { name: 'Neha Kapoor', email: 'neha.kapoor@phantom.example', role: 'escalation', pod: 'escalation', availability: 'available' },
  ]) agent[a.name] = await make('api::agent.agent', a);

  // ── Partners ──────────────────────────────────────────────────────────────
  const partner: Record<string, string> = {};
  partner['SmartBuy'] = await make('api::partner.partner', {
    name: 'SmartBuy', type: 'bank_platform', contractedHeldHours: 24,
  });
  for (const [name, refund, amend, confirm] of [
    ['TripSure', 5, 12, 2], ['Cleartrip', 7, 24, 4], ['MakeMyTrip', 7, 24, 4], ['Goibibo', 7, 24, 4], ['Yatra', 7, 24, 4],
  ] as const) {
    partner[name] = await make('api::partner.partner', {
      name, type: 'ota', viaPartner: partner['SmartBuy'],
      contractedRefundDays: refund, contractedAmendmentHours: amend, contractedConfirmationHours: confirm,
    });
  }
  for (const [name, type] of [
    ['Golf partner network', 'vendor'], ['Chauffeur partner', 'vendor'], ['Rewards catalogue', 'vendor'],
    ['Marriott Bonvoy', 'vendor'], ['ERP', 'erp'], ['HDFC Bank card benefits team', 'bank_platform'],
  ] as const) partner[name] = await make('api::partner.partner', { name, type });

  // ── Members ───────────────────────────────────────────────────────────────
  const member: Record<string, string> = {};
  const members: Array<[string, any]> = [
    ['Amit Chawla', { phone: '+919810044507', card: 'infinia_metal', segment: 'ultra_uhni', preferredChannel: 'whatsapp', satisfaction: 3.1, rm: 'Priya Iyer',
      flags: [{ label: 'Refund 20 days late', severity: 'high' }, { label: 'Quote follow-up owed', severity: 'medium' }, { label: 'Golf Sun 11 Oct', severity: 'info' }, { label: 'Card leg ₹62,400 pending', severity: 'high' }] }],
    ['Anjali Rao', { phone: '+919810011223', card: 'infinia', segment: 'hni', preferredChannel: 'whatsapp', satisfaction: 4.6, flags: [{ label: 'Travelling today', severity: 'info' }, { label: 'GST invoice pending', severity: 'medium' }] }],
    ['Nikhil Arora', { phone: '+919810033891', card: 'infinia', segment: 'hni', preferredChannel: 'email', satisfaction: 3.6, flags: [{ label: 'Points expiring 31 Oct', severity: 'medium' }, { label: 'Voucher not delivered ×4', severity: 'high' }] }],
    ['Kabir Malhotra', { phone: '+919810077124', card: 'infinia', segment: 'hni', preferredChannel: 'phone', satisfaction: 4.4, flags: [{ label: '10th anniversary 18 Oct', severity: 'info' }, { label: 'Club Marriott activation', severity: 'info' }] }],
    ['Sana Qureshi', { phone: '+919810055602', card: 'infinia', segment: 'hni', preferredChannel: 'whatsapp', satisfaction: 3.4, flags: [{ label: 'Update promised by 18:00', severity: 'high' }, { label: 'Change-fee dispute', severity: 'medium' }] }],
    ['Rhea Bhatt', { phone: '+919810012087', card: 'infinia', segment: 'hni', preferredChannel: 'email', flags: [{ label: 'New member · joined 23 Sep', severity: 'info' }, { label: 'Hotel confirmation delayed', severity: 'medium' }] }],
    ['Rohan Iyer', { card: 'infinia', migrationStatus: 'not_migrated', flags: [{ label: 'Migrated · history not imported', severity: 'info' }] }],
    ['Rhea Suri', { card: 'diners_black', segment: 'hni', migrationStatus: 'outside_pilot', flags: [{ label: 'Outside the pilot cohort', severity: 'info' }] }],
    ['Reema Patel', { phone: '+919810099001', card: 'infinia_metal', segment: 'uhni', preferredChannel: 'phone', satisfaction: 4.9, rm: 'Arvind Sood', flags: [{ label: 'In London · return failed to ticket', severity: 'high' }, { label: 'Reversal pending', severity: 'medium' }] }],
    ['Nandita Shah', { phone: '+919810066310', card: 'infinia_metal', segment: 'uhni', preferredChannel: 'whatsapp', satisfaction: 4.1, rm: 'Priya Iyer', flags: [{ label: 'Complaint CMP-1000 · RM sign-off', severity: 'high' }, { label: 'Gift card in transit', severity: 'info' }] }],
    ['Sharan Gill', { phone: '+919810038265', card: 'infinia_metal', segment: 'uhni', preferredChannel: 'whatsapp', satisfaction: 4.8, rm: 'Priya Iyer', flags: [{ label: 'Anniversary Fri 9 Oct', severity: 'info' }, { label: 'Date change requested', severity: 'medium' }] }],
    ['Ishaan Mehta', { phone: '+919810088456', card: 'infinia_metal', segment: 'ultra_uhni', preferredChannel: 'whatsapp', satisfaction: 4.7, rm: 'Priya Iyer', flags: [{ label: 'Discretion protocol · pending', severity: 'medium' }] }],
    ['Vikram Nair', { phone: '+919810082245', card: 'infinia', segment: 'hni', preferredChannel: 'phone', satisfaction: 4.0, flags: [{ label: 'Croma voucher not working', severity: 'medium' }] }],
    ['Kavya Menon', { phone: '+919810047710', card: 'infinia', segment: 'hni', preferredChannel: 'email', satisfaction: 4.5, flags: [{ label: 'Goa trip 23–26 Oct', severity: 'info' }] }],
  ];
  for (const [name, { rm, ...rest }] of members) {
    member[name] = await make('api::member.member', {
      name, migrationStatus: 'migrated', ...rest, ...(rm ? { relationshipManager: agent[rm] } : {}),
    });
  }

  // ── Bookings ──────────────────────────────────────────────────────────────
  const booking: Record<string, string> = {};
  for (const b of [
    ['SB-77120', 'flight', 'Air India DEL ⇌ SIN · 10–14 Sep · 2 adults Business', 'AI-8821QW', 'cancelled_refund_pending', null, 242400, '2026-09-10T00:00:00', null, 'Amit Chawla', 'Yatra', true],
    ['SB-77245', 'flight', '6E 2047 · DEL → BOM · Mon 14 Sep', '6E-4472PL', 'flown', null, 14860, '2026-09-14T00:00:00', null, 'Amit Chawla', 'Goibibo', true],
    ['KGA-2026-09-27-0620', 'golf', 'KGA · Sun 27 Sep 06:20 · 2 players', null, 'played', null, null, '2026-09-27T06:20:00', null, 'Amit Chawla', 'Golf partner network', false],
    ['SB-77502', 'flight', 'AI 997 · BOM → DEL · Mon 5 Oct', 'AI-6TQ2RM', 'confirmed', 'delayed 45 min', 14280, '2026-10-05T00:00:00', null, 'Anjali Rao', 'Yatra', true],
    ['CHF-20931', 'chauffeur', 'Chauffeur · DEL T3 arrival · Mon 5 Oct · re-timed 21:10', null, 'rescheduled', 'Re-timed to 21:10', null, '2026-10-05T21:10:00', null, 'Anjali Rao', 'Chauffeur partner', false],
    ['SB-77488', 'flight', 'SQ 403 · DEL → SIN · Wed 7 Oct', 'SQ-8HN4WX', 'confirmed', 'seat change pending', 46720, '2026-10-07T00:00:00', null, 'Sana Qureshi', 'MakeMyTrip', true],
    ['SB-77399', 'hotel', 'The Leela Palace Udaipur · 3–5 Oct', null, 'cancelled_by_partner', 'refund pending', 96000, '2026-10-03T00:00:00', '2026-10-05', 'Sana Qureshi', 'Goibibo', true],
    ['SB-77511', 'hotel', 'The Sukhothai Bangkok · 16–19 Oct · 1 room', null, 'pending_confirmation', '21h', 74400, '2026-10-16T00:00:00', '2026-10-19', 'Rhea Bhatt', 'MakeMyTrip', true],
    ['SB-77436', 'hotel', 'Taj Exotica Goa · 23–26 Oct · Sea-view room', null, 'confirmed', null, 126900, '2026-10-23T00:00:00', '2026-10-26', 'Kavya Menon', 'TripSure', true],
    ['SB-77467', 'flight', '6E 2134 · BOM → GOI · Fri 16 Oct', '6E-2MK8PD', 'confirmed', 'date change requested', 9860, '2026-10-16T00:00:00', null, 'Sharan Gill', 'Goibibo', true],
    ['SB-77290', 'hotel', 'W Goa · 26–29 Sep', null, 'check_in_denied', 'refunded', 38000, '2026-09-26T00:00:00', '2026-09-29', 'Nandita Shah', 'Goibibo', true],
  ] as const) {
    const [ref, type, title, supplierRef, status, statusNote, amount, travel, end, who, via, isNative] = b;
    booking[ref] = await make('api::booking.booking', {
      ref, type, title, supplierRef, status, statusNote, amount, isNative, currency: 'INR',
      travelDate: at(travel), endDate: end, member: member[who], channelPartner: partner[via],
    });
  }

  // ── Complaints (created before requests; Request owns the 1-1 link) ───────
  const complaint: Record<string, string> = {};
  for (const c of [
    ['CMP-1000', 'Service failure · check-in denied', 'critical', 'resolved_awaiting_signoff', 'phone', 3, 8 * 24, 'Nandita Shah', 'Sanjay Bhat', 'Partner check-in policy not verified before confirmation', true, null],
    ['CMP-1001', 'Fare and terms disclosure · change fee', 'high', 'investigating', 'email', 2, 7 * 24, 'Sana Qureshi', 'Sanjay Bhat', null, false, null],
    ['CMP-1002', 'Wrong fulfilment · breakfast charged', 'medium', 'stance_proposed', 'whatsapp', 1, 5 * 24, 'Nikhil Arora', 'Sanjay Bhat', null, false, null],
    ['CMP-1003', 'Agent behaviour · callback not made', 'low', 'closed', 'phone', 1, 40 * 24, 'Kabir Malhotra', 'Neha Kapoor', 'Callback task not scheduled', false, 20 * 24],
  ] as const) {
    const [ref, title, severity, stage, channel, rung, receivedHoursAgo, who, owner, rootCause, bank, closedHoursAgo] = c;
    complaint[ref] = await make('api::complaint.complaint', {
      ref, title, severity, stage, channel, escalationRung: rung,
      receivedAt: ago(receivedHoursAgo), dueAt: ahead(30 * 24 - receivedHoursAgo),
      rootCause, bankReviewRequired: bank, closedAt: closedHoursAgo ? ago(closedHoursAgo) : null,
      verbatim: channel === 'email' ? 'I was never told about the change fee before I agreed to the new date. Please explain why this was not disclosed.' : null,
      member: member[who], owner: agent[owner],
    });
  }

  // ── Requests ──────────────────────────────────────────────────────────────
  const request: Record<string, string> = {};
  type Req = [string, string, string, string, string, string, string, string, string | null, number, number, number, string | null, string | null, string | null];
  const requests: Req[] = [
    // ref, subject, type, member, status, heldByType, heldByLabel, owner, partner, openedAgoH, dueInH, contractedH, booking, complaint, priority
    ['REQ-4471', 'Quote · DEL ⇌ LHR · 2 adults Business', 'Quote', 'Amit Chawla', 'in_progress', 'l1', 'R360 L1 · follow-up owed', 'Prakriti M', null, 90 * 24, -83 * 24, 168, null, null, 'high'],
    ['REQ-4462', 'Refund · Air India AI-8821QW · card leg ₹62,400', 'Refund status', 'Amit Chawla', 'escalated', 'ota', 'SmartBuy payment partner', 'Prakriti M', 'SmartBuy', 41 * 24, -20 * 24, 504, 'SB-77120', null, 'urgent'],
    ['REQ-4476', 'Date change · 6E 2134 · BOM → GOI · Fri 16 → Sat 17 Oct', 'Reschedule', 'Sharan Gill', 'waiting_on_partner', 'ota', 'Goibibo via SmartBuy', 'Prakriti M', 'Goibibo', 4 * 24, 2.17, 96, 'SB-77467', null, 'high'],
    ['REQ-4490', 'Golf · KGA · Sun 11 Oct 06:20 · with Amit Chawla', 'Tee time', 'Vikram Nair', 'waiting_on_partner', 'vendor', 'Golf partner network', 'Prakriti M', 'Golf partner network', 48, 3.92, 48, null, null, 'normal'],
    ['REQ-4492', 'Booking not confirmed · The Sukhothai Bangkok · 16–19 Oct', 'Delayed confirmation (> 4h)', 'Rhea Bhatt', 'waiting_on_partner', 'ota', 'MakeMyTrip via SmartBuy', 'Prakriti M', 'MakeMyTrip', 21, 2.83, 24, 'SB-77511', null, 'high'],
    ['REQ-4496', 'Welcome call · new member · within 14 days', 'Welcome call', 'Rhea Bhatt', 'new', 'l1', 'Outbound desk · Rohit Sharma', 'Rohit Sharma', null, 19 * 24, 41, 336, null, null, 'normal'],
    ['REQ-4487', 'GST invoice · AI 997 · BOM → DEL', 'GST invoice request', 'Anjali Rao', 'waiting_on_partner', 'ota', 'Yatra via SmartBuy', 'Prakriti M', 'Yatra', 102, 18, 120, 'SB-77502', null, 'normal'],
    ['REQ-4493', 'Seat change · SQ 403 · Wed 7 Oct · window, bulkhead', 'Seat change', 'Sana Qureshi', 'waiting_on_partner', 'ota', 'MakeMyTrip via SmartBuy', 'Prakriti M', 'MakeMyTrip', 2.2, 21.77, 24, 'SB-77488', null, 'normal'],
    ['REQ-4489', 'Callback · BLR → SIN fare held · use expiring points', 'One-way booking', 'Nikhil Arora', 'waiting_on_member', 'member', 'Member · checking dates', 'Prakriti M', null, 0.1, 3.88, 4, null, null, 'normal'],
    ['REQ-4466', 'Club Marriott membership · activation', 'Club Marriott', 'Kabir Malhotra', 'waiting_on_partner', 'bank', 'HDFC Bank · card benefits team', 'Prakriti M', 'HDFC Bank card benefits team', 24, 96, 120, null, null, 'normal'],
    ['REQ-4486', 'Service failure · check-in denied · W Goa', 'Complaint', 'Nandita Shah', 'resolved', 'l2', 'Escalation desk', 'Sanjay Bhat', null, 8 * 24, -24, 72, 'SB-77290', 'CMP-1000', 'urgent'],
    ['REQ-4484', 'Fare and terms disclosure · change fee', 'Complaint', 'Sana Qureshi', 'in_progress', 'l2', 'Escalation desk', 'Sanjay Bhat', null, 7 * 24, 24, 72, 'SB-77488', 'CMP-1001', 'high'],
    ['REQ-4485', 'Wrong fulfilment · breakfast charged', 'Complaint', 'Nikhil Arora', 'in_progress', 'l2', 'Escalation desk', 'Sanjay Bhat', null, 5 * 24, 48, 72, null, 'CMP-1002', 'normal'],
    ['REQ-4483', 'Agent behaviour · callback not made', 'Complaint', 'Kabir Malhotra', 'resolved', 'l2', 'Escalation desk', 'Neha Kapoor', null, 40 * 24, -20 * 24, 72, null, 'CMP-1003', 'low'],
  ];
  for (const [ref, subject, requestType, who, status, heldByType, heldByLabel, owner, via, openedAgo, dueIn, contracted, bk, cmp, priority] of requests) {
    const resolved = status === 'resolved';
    request[ref] = await make('api::request.request', {
      ref, subject, requestType, status, priority, heldByType, heldByLabel, channel: 'phone',
      summary: `${requestType} for ${who}.`,
      openedAt: ago(openedAgo), dueAt: ahead(dueIn), contractedTurnaroundHours: contracted,
      closureState: resolved ? 'confirmed' : null, closedAt: resolved ? ago(24) : null,
      resolutionCode: resolved ? 'RES-COMPLAINT-CLOSED' : null,
      member: member[who], owner: agent[owner],
      ...(via ? { heldByPartner: partner[via] } : {}),
      ...(bk ? { booking: booking[bk] } : {}),
      ...(cmp ? { complaint: complaint[cmp] } : {}),
    });
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  for (const t of [
    ['TXN-55388', '2026-10-05T15:21:00', 'payment', 'BA 199 · failed to ticket', 138600, null, 'payment_link', 'pending', 'refunding', 'Captured by the booking site · reversal raised', null, null, 'Reema Patel', null, null, null],
    ['TXN-55318', '2026-10-04T19:11:00', 'payment', 'The Sukhothai Bangkok · 3 nights', 74400, null, 'card', 'paid', 'settled', 'Paid · booking not yet confirmed', null, null, 'Rhea Bhatt', 'SB-77511', 'REQ-4492', null],
    ['TXN-55301', '2026-10-02T15:00:00', 'refund', 'W Goa · check-in denied', 38000, null, 'card', 'refunded', 'settled', 'Credited 2 Oct', null, null, 'Nandita Shah', 'SB-77290', 'REQ-4486', 'CMP-1000'],
    ['TXN-55395', '2026-10-01T17:46:00', 'payment', 'UK 963 · DEL → BOM', 21450, null, 'payment_link', 'paid', 'settled', 'Paid', null, null, 'Ishaan Mehta', null, null, null],
    ['TXN-55342', '2026-09-30T15:31:00', 'payment', 'Taj Exotica Goa · 3 nights', 76900, 50000, 'points_plus_payment', 'paid', 'settled', 'Paid', null, null, 'Kavya Menon', 'SB-77436', null, null],
    ['TXN-55290', '2026-09-29T21:16:00', 'fee', 'Convenience fee charged twice · voucher order', 1180, null, 'card', 'failed', 'failed', 'Partner-side · dispute DSP-031 open', 'DSP-031', 'open', 'Nikhil Arora', null, null, null],
    ['TXN-55377', '2026-09-29T21:15:00', 'redemption', 'Amazon e-voucher ₹10,000', null, 20000, 'points', 'paid', 'settled', 'Points debited · voucher not delivered', null, null, 'Nikhil Arora', null, null, null],
    ['TXN-55360', '2026-09-29T09:42:00', 'payment', 'AI 997 · BOM → DEL', 14280, null, 'payment_link', 'paid', 'settled', 'Paid', null, null, 'Anjali Rao', 'SB-77502', null, null],
    ['TXN-55299', '2026-09-25T11:12:00', 'payment', '6E 2134 · BOM → GOI', 9860, null, 'payment_link', 'paid', 'settled', 'Paid', null, null, 'Sharan Gill', 'SB-77467', null, null],
    ['TXN-55330', '2026-09-14T12:40:00', 'fee', 'Change fee · SQ 403', 7500, null, 'card', 'disputed', 'disputed', 'Disputed · CMP-1001', null, null, 'Sana Qureshi', 'SB-77488', 'REQ-4484', 'CMP-1001'],
    ['TXN-55121', '2026-09-03T12:15:00', 'redemption', 'Points leg · AI-8821QW', null, 180000, 'points', 'refunded', 'returned', 'Returned 3 Sep', null, null, 'Amit Chawla', 'SB-77120', 'REQ-4462', null],
  ] as const) {
    const [ref, when, kind, description, amount, points, method, status, settlement, statusNote, disputeRef, disputeStatus, who, bk, req, cmp] = t;
    await make('api::transaction.transaction', {
      ref, kind, description, amount, points, method, status, settlement, statusNote, disputeRef, disputeStatus,
      occurredAt: at(when), member: member[who],
      ...(bk ? { booking: booking[bk] } : {}),
      ...(req ? { request: request[req] } : {}),
      ...(cmp ? { complaint: complaint[cmp] } : {}),
    });
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  for (const o of [
    ['ORD-30412', 'Tanishq gift card ₹25,000', 'physical', 'Tanishq via rewards catalogue', 50000, 'dispatched', 'Delivery expected Wed 7 Oct', 0, null, 'Nandita Shah', 'Rewards catalogue'],
    ['ORD-30418', 'Amazon e-voucher ₹10,000', 'e_voucher', 'Amazon via ERP', 20000, 'not_received', 'Re-issue queued by the watchdog · 4th occurrence', 4, 'ESC-126', 'Nikhil Arora', 'ERP'],
    ['ORD-30401', 'Marriott Bonvoy points · 30,000', 'points_transfer', 'Marriott Bonvoy', 30000, 'credited', 'Credited 24 Sep', 0, null, 'Kavya Menon', 'Marriott Bonvoy'],
    ['ORD-30420', 'Apple AirPods Pro', 'physical', 'Rewards catalogue', 52000, 'delivered', 'Delivered 1 Oct', 0, null, 'Anjali Rao', 'Rewards catalogue'],
    ['ORD-30415', 'Myntra e-voucher ₹5,000', 'e_voucher', 'Myntra via ERP', 10000, 'delivered', 'Sent to the registered email', 0, null, 'Sana Qureshi', 'ERP'],
    ['ORD-30409', 'Croma e-voucher ₹15,000', 'e_voucher', 'Croma via ERP', 30000, 'not_working', 'With ERP · Complaints since 3 Oct', 1, null, 'Vikram Nair', 'ERP'],
    ['ORD-30421', 'Taj Experiences gift card ₹20,000', 'e_voucher', 'Taj via ERP', 40000, 'delivered', 'For the anniversary dinner', 0, null, 'Sharan Gill', 'ERP'],
  ] as const) {
    const [ref, item, orderType, fulfilledVia, points, status, note, occurrenceCount, escalationRef, who, vendor] = o;
    await make('api::order.order', {
      ref, item, orderType, fulfilledVia, points, status, note, occurrenceCount, escalationRef,
      member: member[who], vendor: partner[vendor],
    });
  }

  await store.set({ key: 'done', value: true });
  strapi.log.info('Seeded sample data (agents, partners, members, bookings, requests, complaints, transactions, orders)');
}
