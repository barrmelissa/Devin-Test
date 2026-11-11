// The single place roles are defined. Apps map these roles to actions in their policy.ts.
export const ROLES = {
  analyst: { label: "Analyst" },
  senior_reviewer: { label: "Senior reviewer" },
  admin: { label: "Admin" },
  auditor: { label: "Auditor" },
} as const;

export type Role = keyof typeof ROLES;

export const ALL_ROLES = Object.keys(ROLES) as Role[];

export function isRole(value: string): value is Role {
  return value in ROLES;
}

// Platform-level permissions (not tied to an app's entity).
export const PLATFORM_PERMISSIONS = {
  "audit:read": ["admin", "auditor"],
} as const satisfies Record<string, readonly Role[]>;

export type PlatformAction = keyof typeof PLATFORM_PERMISSIONS;

// Entity-level actions an app policy can grant per role.
export const ENTITY_ACTIONS = ["read", "create", "update", "transition"] as const;
export type EntityAction = (typeof ENTITY_ACTIONS)[number];
