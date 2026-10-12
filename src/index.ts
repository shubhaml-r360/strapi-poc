import { randomUUID } from 'crypto';
import type { Core } from '@strapi/strapi';
import { seed } from './seed';

const COMPLAINT_UID = 'api::complaint.complaint';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(async (ctx, next) => {
      if (!ctx.uid.startsWith('api::')) return next();

      const params = ctx.params as any;

      // uuid is server-generated on create and immutable afterwards
      if (ctx.action === 'create') {
        params.data = { ...params.data, uuid: randomUUID() };
      } else if (ctx.action === 'update' && params.data) {
        delete params.data.uuid;
      }

      // FR-86: root cause is mandatory when a complaint is closed
      if (ctx.uid === COMPLAINT_UID && (ctx.action === 'create' || ctx.action === 'update')) {
        const existing =
          ctx.action === 'update'
            ? await strapi.documents(COMPLAINT_UID).findOne({ documentId: params.documentId })
            : null;
        const merged = { ...(existing ?? {}), ...(params.data ?? {}) } as any;
        if (merged.stage === 'closed' && !merged.rootCause) {
          const { errors } = require('@strapi/utils');
          throw new errors.ValidationError('rootCause is required when a complaint is closed');
        }
      }

      return next();
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seed(strapi);

    // Dev convenience only: PUBLIC_API=true opens full CRUD on the core APIs to the public role.
    if (process.env.PUBLIC_API !== 'true') return;

    const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
    if (!role) return;

    const apis = ['agent', 'member', 'partner', 'request', 'booking', 'transaction', 'complaint', 'order'];
    const actions = ['find', 'findOne', 'create', 'update', 'delete'];
    for (const api of apis) {
      for (const action of actions) {
        const name = `api::${api}.${api}.${action}`;
        const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: { action: name, role: role.id },
        });
        if (!exists) {
          await strapi.db.query('plugin::users-permissions.permission').create({ data: { action: name, role: role.id } });
        }
      }
    }
    strapi.log.warn('PUBLIC_API=true: public role has full CRUD on core APIs (dev only)');
  },
};
