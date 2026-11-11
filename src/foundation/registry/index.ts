import type { ReactNode } from "react";
import type { ApiRoute } from "../api";
import type { Principal } from "../identity/types";

export type AppScreenProps = {
  user: Principal;
  /** Path segments after /apps/<id>, e.g. [] for the index, ["abc123"] for a detail page. */
  path: string[];
  searchParams: Record<string, string | undefined>;
};

export type AppManifest = {
  /** URL slug and audit "app" value, e.g. "kyc". */
  id: string;
  name: string;
  description: string;
  /** Whether the app shows in the nav for this user. Server-side checks still happen in the data helpers. */
  canAccess: (user: Principal) => boolean;
  render: (props: AppScreenProps) => Promise<ReactNode> | ReactNode;
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
