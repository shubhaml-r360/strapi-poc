// Generates docs/postman/phantom-strapi.postman_collection.json (all 8 models, full CRUD).
const fs = require('fs');
const path = require('path');

const models = [
  { name: 'Agents', path: 'agents', idVar: 'agentId', populate: 'members',
    create: { name: 'Test Agent', email: 'test.agent.{{$timestamp}}@example.com', role: 'l1', pod: 'pod 1', availability: 'available' },
    update: { availability: 'busy' },
    notes: 'role: l1 | l2 | relationship_manager | team_leader | back_office | outbound | escalation\navailability: available | busy | offline' },
  { name: 'Members', path: 'members', idVar: 'memberId', populate: 'relationshipManager',
    create: { name: 'Test Member', phone: '+919810000000', card: 'infinia', segment: 'hni', preferredChannel: 'whatsapp', satisfaction: 4.2, flags: [{ label: 'New member', severity: 'info' }], migrationStatus: 'migrated' },
    update: { satisfaction: 4.8, preferredChannel: 'email' },
    notes: 'card: infinia | infinia_metal | diners_black\nsegment: hni | uhni | ultra_uhni\npreferredChannel: whatsapp | email | phone\nmigrationStatus: migrated | not_migrated | outside_pilot\nLink an RM with "relationshipManager": "<agent documentId>".' },
  { name: 'Partners', path: 'partners', idVar: 'partnerId', populate: 'viaPartner',
    create: { name: 'Test Partner {{$timestamp}}', type: 'ota', contractedRefundDays: 7, contractedAmendmentHours: 24, contractedConfirmationHours: 4 },
    update: { contractedRefundDays: 5 },
    notes: 'type: bank_platform | ota | vendor | erp\nLink "viaPartner": "<partner documentId>" (OTAs via SmartBuy).' },
  { name: 'Requests', path: 'requests', idVar: 'requestId', populate: 'member,owner,heldByPartner,booking,complaint',
    create: { ref: 'REQ-{{$timestamp}}', subject: 'Test request', requestType: 'Quote', status: 'new', priority: 'normal', channel: 'phone', summary: 'Created from Postman.', contractedTurnaroundHours: 24 },
    update: { status: 'in_progress', priority: 'high' },
    notes: 'status: new | in_progress | waiting_on_partner | waiting_on_member | escalated | resolved\npriority: low | normal | high | urgent\nchannel: phone | email | whatsapp | web\nheldByType: l1 | l2 | back_office | ota | vendor | bank | member\nclosureState: confirmed | deemed | unresolved | withdrawn | duplicate\nRelations (documentIds): member, owner, heldByPartner, booking, complaint.' },
  { name: 'Bookings', path: 'bookings', idVar: 'bookingId', populate: 'member,channelPartner',
    create: { ref: 'SB-{{$timestamp}}', type: 'flight', title: 'Test flight · DEL → BOM', supplierRef: 'TEST-1234', status: 'confirmed', amount: 14860, currency: 'INR', isNative: true },
    update: { status: 'cancelled_refund_pending' },
    notes: 'type: flight | hotel | golf | chauffeur\nstatus: confirmed | pending_confirmation | cancelled | cancelled_refund_pending | cancelled_by_partner | rescheduled | flown | played | check_in_denied\nRelations (documentIds): member, channelPartner.' },
  { name: 'Transactions', path: 'transactions', idVar: 'transactionId', populate: 'member,booking,request,complaint',
    create: { ref: 'TXN-{{$timestamp}}', kind: 'payment', description: 'Test payment', amount: 9860, method: 'payment_link', status: 'paid', settlement: 'settled' },
    update: { statusNote: 'Updated from Postman' },
    notes: 'kind: payment | refund | fee | redemption\nmethod: card | payment_link | points | points_plus_payment\nstatus: paid | refunded | failed | disputed | pending\nsettlement: settled | refunding | failed | disputed | returned\ndisputeStatus: open | resolved\nRelations (documentIds): member, booking, request, complaint.' },
  { name: 'Complaints', path: 'complaints', idVar: 'complaintId', populate: 'member,request,owner',
    create: { ref: 'CMP-{{$timestamp}}', title: 'Test complaint', severity: 'medium', stage: 'received', channel: 'phone', escalationRung: 1, bankReviewRequired: false },
    update: { stage: 'closed', rootCause: 'Example root cause' },
    notes: 'severity: critical | high | medium | low\nstage: received | investigating | stance_proposed | resolved_awaiting_signoff | closed\nescalationRung: 1-3\nRule: stage "closed" requires rootCause (otherwise 400).\nRelations (documentIds): member, request, owner.' },
  { name: 'Orders', path: 'orders', idVar: 'orderId', populate: 'member,vendor,request',
    create: { ref: 'ORD-{{$timestamp}}', item: 'Test e-voucher ₹5,000', orderType: 'e_voucher', fulfilledVia: 'Amazon via ERP', points: 10000, status: 'dispatched', occurrenceCount: 0 },
    update: { status: 'delivered', note: 'Delivered' },
    notes: 'orderType: physical | e_voucher | points_transfer\nstatus: dispatched | delivered | credited | not_received | not_working | cancelled\nRelations (documentIds): member, vendor, request.' },
];

const url = (p, query = []) => ({
  raw: `{{baseUrl}}/${p.join('/')}` + (query.length ? '?' + query.map((q) => `${q.key}=${q.value}`).join('&') : ''),
  host: ['{{baseUrl}}'], path: p, ...(query.length ? { query } : {}),
});
const json = (o) => ({ mode: 'raw', raw: JSON.stringify({ data: o }, null, 2), options: { raw: { language: 'json' } } });
const H = [{ key: 'Content-Type', value: 'application/json' }];

const folder = (m) => ({
  name: m.name,
  item: [
    { name: `List ${m.path}`, request: { method: 'GET', header: [], url: url([m.path]) } },
    { name: `List ${m.path} (populated, paged)`, request: { method: 'GET', header: [],
        url: url([m.path], [{ key: 'populate', value: m.populate }, { key: 'pagination[page]', value: '1' }, { key: 'pagination[pageSize]', value: '25' }]) } },
    { name: `Get one`, request: { method: 'GET', header: [], url: url([m.path, `{{${m.idVar}}}`], [{ key: 'populate', value: m.populate }]),
        description: `Set the ${m.idVar} collection variable to a documentId (Create sets it automatically).` } },
    { name: `Create`,
      event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
        'if (pm.response.code === 200 || pm.response.code === 201) {',
        `  pm.collectionVariables.set('${m.idVar}', pm.response.json().data.documentId);`, '}'] } }],
      request: { method: 'POST', header: H, body: json(m.create), url: url([m.path]), description: m.notes } },
    { name: `Update`, request: { method: 'PUT', header: H, body: json(m.update), url: url([m.path, `{{${m.idVar}}}`]),
        description: 'Send only the fields to change. uuid is server-managed and ignored.' } },
    { name: `Delete`, request: { method: 'DELETE', header: [], url: url([m.path, `{{${m.idVar}}}`]), description: 'Returns 204.' } },
  ],
});

const collection = {
  info: {
    name: 'Phantom Strapi POC',
    description: 'CRUD for all 8 core models. Set the `token` collection variable to your Strapi API token (never commit it). Write bodies are wrapped in { "data": {...} }. Update/Delete use the record documentId. Run Create first: it stores the new documentId in the matching variable.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
  variable: [
    { key: 'baseUrl', value: 'https://strapi-poc-gph5.onrender.com/api' },
    { key: 'token', value: '' },
    ...models.map((m) => ({ key: m.idVar, value: '' })),
  ],
  item: models.map(folder),
};

const out = path.join(__dirname, '..', 'docs', 'postman', 'phantom-strapi.postman_collection.json');
fs.writeFileSync(out, JSON.stringify(collection, null, 2) + '\n');
console.log('wrote', out, '-', collection.item.reduce((n, f) => n + f.item.length, 0), 'requests');
