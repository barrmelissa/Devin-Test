import type { ReactNode } from "react";
import { ROLES, type Role } from "../access/roles";
import type { ApiRoute } from "../api";
import type { Principal } from "../identity/types";

export type AppScreenProps = {
  user: Principal;
  /** Path segments after /apps/<id>, e.g. [] for the index, ["abc123"] for a detail page. */
  path: string[];
  searchParams: Record<string, string | undefined>;
};

/** Built-in help, shown on the launcher card and the Getting started page (/guide). */
export type AppHelp = {
  /** Who the app is for. Must match the roles canAccess() lets in (tests/launcher.test.ts checks this). */
  roles: Role[];
  /** 3-5 short "how to use" steps. */
  steps: string[];
  /** Suggested demo path: which seeded user to switch to and what to try. */
  demo: { as: string; tryThis: string }[];
  /** "?" hint text for key actions, keyed by transition (or action) name. Who can do it comes from the workflow. */
  hints: Record<string, string>;
};

export type AttentionPriority = "high" | "medium" | "low";

/** Something the user can act on right now, shown in "Needs your attention" on the launcher. */
export type AttentionItem = {
  /** Record id (unique within the app). */
  id: string;
  title: string;
  detail?: string;
  priority: AttentionPriority;
  /** When the item started waiting; drives the age and the oldest-first order. */
  since: Date;
  href: string;
};

export type AppManifest = {
  /** URL slug and audit "app" value, e.g. "kyc". */
  id: string;
  name: string;
  description: string;
  /** Whether the app shows in the nav for this user. Server-side checks still happen in the data helpers. */
  canAccess: (user: Principal) => boolean;
  render: (props: AppScreenProps) => Promise<ReactNode> | ReactNode;
  help: AppHelp;
  /**
   * Items this user can act on now. Read through the data helpers (listRecords) and keep only records
   * the user may act on (canPerformTransition from @/foundation/attention), so maker-checker blocks never show.
   */
  attention: (user: Principal) => Promise<AttentionItem[]>;
  /** HTTP endpoints served at /api/<id>/<key> (see @/foundation/api). */
  api?: Record<string, ApiRoute>;
};

export function defineApp(manifest: AppManifest): AppManifest {
  return manifest;
}

export function appHref(appId: string, ...segments: string[]) {
  return ["/apps", appId, ...segments].join("/");
}

export function apiHref(appId: string, route: string) {
  return `/api/${appId}/${route}`;
}

export function roleLabels(roles: readonly Role[]) {
  return roles.map((r) => ROLES[r].label);
}

export type LauncherCard = { id: string; name: string; description: string; roles: string[]; href: string; enabled: boolean };

/** Launcher cards for every registered app; apps the user can't access are disabled ("No access"). */
export function launcherCards(user: Principal, apps: AppManifest[]): LauncherCard[] {
  return apps.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    roles: roleLabels(a.help.roles),
    href: appHref(a.id),
    enabled: a.canAccess(user),
  }));
}
