/**
 * Canonical audit action vocabulary (M0 §2 — domain events; §15/§804 — audit
 * trail). Namespaced `entity.verb`. Add new ones here rather than passing bare
 * strings at call sites so the set stays greppable and consistent.
 *
 * TODO(members): `member.role_changed` / `member.invited` / `member.removed`
 * once member management ships — there is no such mutation yet, so nothing
 * writes those today.
 */
export const AUDIT_ACTIONS = {
  ORGANIZATION_CREATED: "organization.created",
  PLAN_CHANGED: "plan.changed",
  INVOICE_ISSUED: "invoice.issued",
  INVOICE_CANCELLED: "invoice.cancelled",
  INVOICE_DELETED: "invoice.deleted",
  EINVOICE_PREPARED: "einvoice.prepared",
  DOCUMENT_DELETED: "document.deleted",
  EXPENSE_DELETED: "expense.deleted",
  PAYMENT_DELETED: "payment.deleted",
  EMPLOYEE_CREATED: "employee.created",
  EMPLOYEE_UPDATED: "employee.updated",
  EMPLOYEE_DELETED: "employee.deleted",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
