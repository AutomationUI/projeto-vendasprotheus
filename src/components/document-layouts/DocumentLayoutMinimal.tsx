import React from "react";

export function DocumentLayoutMinimal({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-black p-8 max-w-2xl mx-auto">
      <header className="mb-4">
        <h1 className="text-xl font-light">Minimalista</h1>
      </header>
      <main className="prose dark:prose-invert max-w-none">{children}</main>
      <footer className="mt-6 text-xs text-gray-300 text-center">
        <span>VendasProtheus</span>
      </footer>
    </div>
  );
}
