import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Detection console" },
  { to: "/batch", label: "Batch survey" },
  { to: "/methodology", label: "Methodology" },
  { to: "/project", label: "Project" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="sky-surface grid size-9 place-items-center rounded-md">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.9" />
              <ellipse
                cx="12"
                cy="12"
                rx="10.5"
                ry="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                transform="rotate(-22 12 12)"
                opacity="0.8"
              />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold tracking-tight">
              PragyaVyom
            </span>
            <span className="label-caps">TESS transit intelligence</span>
          </span>
        </Link>

        <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-2 md:w-auto">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>


      </div>
    </header>
  );
}
