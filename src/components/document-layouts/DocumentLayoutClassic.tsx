import React from "react";

export function DocumentLayoutClassic({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border rounded-lg shadow p-8 max-w-3xl mx-auto">
      <header className="mb-6 border-b pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Documento Clássico</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cabeçalho com informações institucionais</p>
        </div>
        <img src="/logo192.png" alt="Logo" className="h-10" />
      </header>
      <main>{children}</main>
      <footer className="mt-8 pt-4 border-t text-xs text-gray-400 text-right">
        Assinatura digital | Página 1/1
      </footer>
    </div>
  );
}
