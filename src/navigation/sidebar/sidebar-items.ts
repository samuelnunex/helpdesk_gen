import { BarChart3, Bell, LayoutDashboard, ListChecks, type LucideIcon, Plus, Settings } from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Painéis",
    items: [{ title: "Início", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    id: 2,
    label: "Helpdesk",
    items: [
      {
        title: "Chamados",
        url: "/dashboard/chamados",
        icon: ListChecks,
        subItems: [
          { title: "Todos os chamados", url: "/dashboard/chamados" },
          { title: "Novo chamado", url: "/dashboard/chamados/novo", icon: Plus },
        ],
      },
      { title: "Notificações", url: "/dashboard/notificacoes", icon: Bell },
      { title: "Relatórios", url: "/dashboard/relatorios", icon: BarChart3 },
      { title: "Setores", url: "/dashboard/setores", icon: Settings },
    ],
  },
];
