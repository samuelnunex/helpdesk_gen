import type { CurrentUser } from "@/lib/auth/get-current-user";
import { canGerenciarSetores, canVerRelatoriosSetor } from "@/lib/auth/permissions";
import type { NavGroup, NavMainItem } from "@/navigation/sidebar/sidebar-items";

const SETTINGS_PREFIX = "/dashboard/settings";

function canAccessNavUrl(user: CurrentUser | null, url: string): boolean {
  if (url.startsWith("/dashboard/setores")) {
    return user ? canGerenciarSetores(user) : false;
  }
  if (url.startsWith("/dashboard/relatorios")) {
    return user ? canVerRelatoriosSetor(user) : false;
  }
  if (url === SETTINGS_PREFIX || url.startsWith(`${SETTINGS_PREFIX}/`)) {
    return user?.tipoConta === "admin";
  }
  return true;
}

/** Remove itens da sidebar que o usuário não tem permissão para acessar (grupos vazios somem). */
export function filterSidebarNavForUser(user: CurrentUser | null, groups: readonly NavGroup[]): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item): NavMainItem[] => {
        if (item.subItems?.length) {
          const filteredSubs = item.subItems.filter((sub) => canAccessNavUrl(user, sub.url));
          if (filteredSubs.length === 0) return [];
          return [{ ...item, subItems: filteredSubs }];
        }
        return canAccessNavUrl(user, item.url) ? [item] : [];
      }),
    }))
    .filter((g) => g.items.length > 0);
}
