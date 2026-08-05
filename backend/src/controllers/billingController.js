import * as billingService from "../services/billingService.js";
import { resolveTenantId } from "../config/singleTenant.js";
import { AppError, forbidden } from "../lib/AppError.js";
import { ROLES } from "../config/roles.js";
import { rethrowKnownErrors } from "../lib/controllerHelpers.js";

class BillingController {
  async listPlans(_req, res) {
    const plans = await billingService.listPublicPlans();
    res.json({ plans });
  }

  async getSubscription(req, res) {
    try {
      const tenantId = resolveTenantId(req);
      const data = await billingService.getSubscriptionSummary(tenantId);
      res.json(data);
    } catch (error) {
      rethrowKnownErrors(error);
    }
  }

  async checkout(req, res) {
    try {
      const body = req.body || {};
      const planId = body.planId || body.plano || body.plan;

      let tenantId = null;
      if (req.user?.id) {
        if (req.user.role !== ROLES.ADMIN) {
          throw forbidden("Apenas administradores podem gerenciar a assinatura");
        }
        try {
          tenantId = resolveTenantId(req);
        } catch {
          tenantId = null;
        }
      }

      if (!tenantId) {
        const result = await billingService.createCheckout({
          planId,
          oficina: body.oficina,
          admin: body.admin,
        });
        return res.status(201).json(result);
      }

      const result = await billingService.createCheckout({
        planId,
        tenantId,
      });
      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof AppError) throw error;
      rethrowKnownErrors(error);
    }
  }

  async portal(req, res) {
    try {
      const tenantId = resolveTenantId(req);
      const result = await billingService.createBillingPortal({ tenantId });
      res.json(result);
    } catch (error) {
      rethrowKnownErrors(error);
    }
  }

  async webhook(req, res) {
    const signature = req.headers["stripe-signature"];
    const result = await billingService.handleStripeWebhook(req.body, signature);
    res.json(result);
  }
}

export default new BillingController();
