import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Studio Admin",
  version: packageJson.version,
  copyright: `© ${currentYear}, Studio Admin.`,
  meta: {
    title: "Studio Admin - Painel em Next.js",
    description:
      "Painel administrativo em Next.js 16, Tailwind CSS v4 e shadcn/ui. Para SaaS, painéis de gestão e ferramentas internas—personalizável e pronto para produção.",
  },
};
