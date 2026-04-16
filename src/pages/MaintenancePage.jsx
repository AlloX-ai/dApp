import { Wrench } from "lucide-react";

/**
 * Shown when VITE_MAINTENANCE_MODE=true (e.g. during backend deploy).
 * No wallet or API calls — safe to render while services are unavailable.
 */
export function MaintenancePage() {
  return (
    <div className="bg-pattern flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <img
        src="https://cdn.allox.ai/allox/AlloX-desktop.svg"
        alt="AlloX"
        className="mb-10 h-9 w-auto opacity-90"
      />
      <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white/90 p-10 shadow-xl backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Wrench className="h-8 w-8 text-amber-700" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Maintenance in progress
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          We&apos;re updating our systems. Please check again later.
        </p>
      </div>
    </div>
  );
}
