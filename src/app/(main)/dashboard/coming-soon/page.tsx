export const metadata = {
  title: "Em breve",
};

export default function Page() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">Em breve.</h1>
      <p className="text-muted-foreground">
        Esta página está em desenvolvimento e estará disponível em atualizações futuras.
      </p>
    </div>
  );
}
