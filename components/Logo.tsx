import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3 text-sm font-semibold tracking-tight text-foreground"
      aria-label="Stacks Multisig Vaults home"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-base font-black text-zinc-900 shadow-lg shadow-amber-500/20 transition-transform duration-200 group-hover:scale-105">
        SM
      </span>
      <span className="leading-tight">
        <span className="block text-base">Stacks Multisig</span>
        <span className="block text-xs font-normal text-slate-400">
          Vaults
        </span>
      </span>
    </Link>
  );
}
