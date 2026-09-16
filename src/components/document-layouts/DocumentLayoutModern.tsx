import React from "react";

export function DocumentLayoutModern({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-10 max-w-3xl mx-auto">
      <header className="mb-8 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Documento Moderno</h1>
          <p className="text-blue-500 dark:text-blue-300 text-base">Resumo visual, cards e gráficos</p>
        </div>
        <span className="inline-block bg-blue-100 dark:bg-blue-800 rounded-full px-4 py-2 text-blue-700 dark:text-blue-200 text-sm font-semibold">Novo</span>
      </header>
      <main>{children}</main>
      <footer className="mt-10 pt-6 border-t-2 border-blue-100 dark:border-blue-900 text-xs text-blue-400 text-center">
        Documento gerado digitalmente | VendasProtheus
      </footer>
    </div>
  );
}
