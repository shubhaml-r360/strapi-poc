// Generates src/api/<name>/{content-types,controllers,routes,services} for the core models.
// Re-runnable: overwrites the generated files.
const fs = require('fs');
const path = require('path');

const e = (...values) => ({ type: 'enumeration', enum: values });
const str = (extra = {}) => ({ type: 'string', ...extra });
const rel = (relation, target, extra = {}) => ({ type: 'relation', relation, target, ...extra });
const ref = () => str({ required: true, unique: true });

const models = [
  {
    singular: 'agent', plural: 'agents', display: 'Agent',
    attributes: {
      name: str({ required: true }),
      email: { type: 'email', unique: true },
      role: e('l1', 'l2', 'relationship_manager', 'team_leader', 'back_office', 'outbound', 'escalation'),
      pod: str(),
      availability: e('available', 'busy', 'offline'),
      members: rel('oneToMany', 'api::member.member', { mappedBy: 'relationshipManager' }),
    },
  },
  {
    singular: 'member', plural: 'members', display: 'Member',
    attributes: {
      name: str({ required: true }),
      phone: str(),
      email: { type: 'email' },
      card: e('infinia', 'infinia_metal', 'diners_black'),
      segment: e('hni', 'uhni', 'ultra_uhni'),
      preferredChannel: e('whatsapp', 'email', 'phone'),
      satisfaction: { type: 'decimal' },
      flags: { type: 'json' },
      migrationStatus: e('migrated', 'not_migrated', 'outside_pilot'),
      relationshipManager: rel('manyToOne', 'api::agent.agent', { inversedBy: 'members' }),
    },
  },
  {
    singular: 'partner', plural: 'partners', display: 'Partner',
    attributes: {
      name: str({ required: true, unique: true }),
      type: e('bank_platform', 'ota', 'vendor', 'erp'),
      contractedHeldHours: { type: 'integer' },
      contractedRefundDays: { type: 'integer' },
      contractedAmendmentHours: { type: 'integer' },
      contractedConfirmationHours: { type: 'integer' },
      viaPartner: rel('manyToOne', 'api::partner.partner'),
    },
  },
  {
    singular: 'request', plural: 'requests', display: 'Request',
    attributes: {
      ref: ref(),
      subject: str({ required: true }),
      requestType: str(),
      status: e('new', 'in_progress', 'waiting_on_partner', 'waiting_on_member', 'escalated', 'resolved'),
      priority: e('low', 'normal', 'high', 'urgent'),
      channel: e('phone', 'email', 'whatsapp', 'web'),
      summary: { type: 'text' },
      remark: { type: 'text' },
      openedAt: { type: 'datetime' },
      dueAt: { type: 'datetime' },
      contractedTurnaroundHours: { type: 'integer' },
      clockStoppedReason: str(),
      heldByType: e('l1', 'l2', 'back_office', 'ota', 'vendor', 'bank', 'member'),
      heldByLabel: str(),
      closureState: e('confirmed', 'deemed', 'unresolved', 'withdrawn', 'duplicate'),
      resolutionCode: str(),
      closedAt: { type: 'datetime' },
      member: rel('manyToOne', 'api::member.member'),
      owner: rel('manyToOne', 'api::agent.agent'),
      heldByPartner: rel('manyToOne', 'api::partner.partner'),
      booking: rel('manyToOne', 'api::booking.booking'),
      complaint: rel('oneToOne', 'api::complaint.complaint', { inversedBy: 'request' }),
    },
  },
  {
    singular: 'booking', plural: 'bookings', display: 'Booking',
    attributes: {
      ref: ref(),
      type: e('flight', 'hotel', 'golf', 'chauffeur'),
      title: str(),
      supplierRef: str(),
      status: e('confirmed', 'pending_confirmation', 'cancelled', 'cancelled_refund_pending',
        'cancelled_by_partner', 'rescheduled', 'flown', 'played', 'check_in_denied'),
      statusNote: str(),
      amount: { type: 'decimal' },
      currency: str({ default: 'INR' }),
      travelDate: { type: 'datetime' },
      endDate: { type: 'date' },
      isNative: { type: 'boolean', default: true },
      member: rel('manyToOne', 'api::member.member'),
      channelPartner: rel('manyToOne', 'api::partner.partner'),
    },
  },
  {
    singular: 'transaction', plural: 'transactions', display: 'Transaction',
    attributes: {
      ref: ref(),
      occurredAt: { type: 'datetime' },
      kind: e('payment', 'refund', 'fee', 'redemption'),
      description: str(),
      amount: { type: 'decimal' },
      points: { type: 'integer' },
      method: e('card', 'payment_link', 'points', 'points_plus_payment'),
      status: e('paid', 'refunded', 'failed', 'disputed', 'pending'),
      settlement: e('settled', 'refunding', 'failed', 'disputed', 'returned'),
      statusNote: str(),
      disputeRef: str(),
      disputeStatus: e('open', 'resolved'),
      member: rel('manyToOne', 'api::member.member'),
      booking: rel('manyToOne', 'api::booking.booking'),
      request: rel('manyToOne', 'api::request.request'),
      complaint: rel('manyToOne', 'api::complaint.complaint'),
    },
  },
  {
    singular: 'complaint', plural: 'complaints', display: 'Complaint',
    attributes: {
      ref: ref(),
      title: str(),
      severity: e('critical', 'high', 'medium', 'low'),
      stage: e('received', 'investigating', 'stance_proposed', 'resolved_awaiting_signoff', 'closed'),
      channel: e('phone', 'email', 'whatsapp'),
      verbatim: { type: 'text' },
      escalationRung: { type: 'integer', min: 1, max: 3 },
      receivedAt: { type: 'datetime' },
      dueAt: { type: 'datetime' },
      rootCause: str(),
      bankReviewRequired: { type: 'boolean', default: false },
      closedAt: { type: 'datetime' },
      member: rel('manyToOne', 'api::member.member'),
      request: rel('oneToOne', 'api::request.request', { mappedBy: 'complaint' }),
      owner: rel('manyToOne', 'api::agent.agent'),
    },
  },
  {
    singular: 'order', plural: 'orders', display: 'Order',
    attributes: {
      ref: ref(),
      item: str(),
      orderType: e('physical', 'e_voucher', 'points_transfer'),
      fulfilledVia: str(),
      points: { type: 'integer' },
      status: e('dispatched', 'delivered', 'credited', 'not_received', 'not_working', 'cancelled'),
      note: str(),
      occurrenceCount: { type: 'integer' },
      escalationRef: str(),
      member: rel('manyToOne', 'api::member.member'),
      vendor: rel('manyToOne', 'api::partner.partner'),
      request: rel('manyToOne', 'api::request.request'),
    },
  },
];

const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

for (const m of models) {
  const base = path.join(__dirname, '..', 'src', 'api', m.singular);
  const uid = `api::${m.singular}.${m.singular}`;
  const schema = {
    kind: 'collectionType',
    collectionName: m.plural,
    info: { singularName: m.singular, pluralName: m.plural, displayName: m.display },
    options: { draftAndPublish: false },
    pluginOptions: {},
    attributes: { uuid: { type: 'string', unique: true, configurable: false }, ...m.attributes },
  };
  write(path.join(base, 'content-types', m.singular, 'schema.json'), JSON.stringify(schema, null, 2) + '\n');
  for (const [dir, factory] of [['controllers', 'createCoreController'], ['routes', 'createCoreRouter'], ['services', 'createCoreService']]) {
    write(
      path.join(base, dir, `${m.singular}.ts`),
      `import { factories } from '@strapi/strapi';\n\nexport default factories.${factory}('${uid}');\n`
    );
  }
}
console.log(`generated ${models.length} APIs`);
