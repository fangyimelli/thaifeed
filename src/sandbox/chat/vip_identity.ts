export const SANDBOX_VIP = {
  id: 'sandbox_vip_behindyou',
  handle: 'behindyou',
  role: 'vip',
  badge: 'crown'
} as const;

export type SandboxVipRole = typeof SANDBOX_VIP.role;
export type SandboxVipBadge = typeof SANDBOX_VIP.badge;
