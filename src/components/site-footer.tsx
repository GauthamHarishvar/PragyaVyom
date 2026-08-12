export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          PragyaVyom · working prototype — light curves are simulated with TESS-realistic
          systematics, all signal processing runs live in the browser.
        </p>

      </div>
    </footer>
  );
}
