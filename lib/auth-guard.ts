import "server-only";

import { redirect } from "next/navigation";

import { getCurrentContext } from "./auth";

type AuthenticatedComponent<TProps extends object = Record<string, never>> = (
  ctx: Awaited<ReturnType<typeof getCurrentContext>>,
  props?: TProps,
) => Promise<JSX.Element> | JSX.Element;

export async function withAuthPage<TProps extends object = Record<string, never>>(
  component: AuthenticatedComponent<TProps>,
  props?: TProps,
) {
  const ctx = await getCurrentContext();
  if (!ctx.userId || !ctx.companyId) {
    redirect("/login");
  }
  return component(ctx, props);
}
