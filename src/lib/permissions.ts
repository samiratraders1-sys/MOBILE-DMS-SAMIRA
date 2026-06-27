export const RolePermissions = {
  admin: {
    label: "Admin",
    allowedViews: ['dashboard', 'inventory', 'purchase', 'pos', 'sales', 'settle', 'ledger', 'finance', 'payment-history', 'daily-cash-book', 'users', 'roles', 'settings', 'reports', 'routes', 'route-optimization', 'staff', 'customers', 'suppliers', 'orders', 'sr-order-list', 'loadsheet', 'admin-approvals', 'pnl', 'subdb', 'damage-mgmt', 'advanced-ops', 'dms-suite', 'activity-log', 'enterprise-suites'],
  },
  manager: {
    label: "Manager",
    allowedViews: ['pos', 'purchase', 'sales', 'customers', 'loadsheet', 'settle', 'finance', 'payment-history', 'daily-cash-book', 'subdb', 'damage-mgmt', 'advanced-ops', 'dms-suite', 'enterprise-suites'],
  },
  sr: {
    label: "SR (Sales Rep)",
    allowedViews: ['orders', 'sr-order-list', 'inventory'],
  },
  dsr: {
    label: "DSR (Delivery Rep)",
    allowedViews: ['dsr-portal'],
  },
};
