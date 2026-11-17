type HeroProps = {
  /** Optional URL for the primary action. */
  startHref?: string;
  /** Optional URL for the "How it works" action. */
  howItWorksHref?: string;
};

export default function HeroSection({
  startHref = "/documents",
  howItWorksHref = "#how-it-works",
}: HeroProps) {
  return (
    // Keep this component inside the page's main-content column.
    // The sidebar should be rendered as a separate sibling in the page layout.
    <section
      aria-labelledby="hero-heading"
      className="w-full min-w-0 rounded-2xl bg-linear-to-r from-sky-50 via-white to-blue-50 px-5 py-7 sm:px-8 sm:py-9 lg:px-10"
    >
      <div className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Documents made simple
        </p>

        <h1
          id="hero-heading"
          className="text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[2.7rem]"
        >
          Your Complete
          <br />
          <span className="text-blue-700">Document &amp; Visa</span> Assistant
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Generate official documents, get translations, and find government
          services — all in one place.
        </p>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600 sm:text-sm">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-emerald-600">✓</span>
            Multi-Language Support
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-emerald-600">✓</span>
            Official Templates
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-emerald-600">✓</span>
            Step-by-Step Guides
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={startHref}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Start Now
            <span aria-hidden="true">→</span>
          </a>

          <a
            href={howItWorksHref}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white/80 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-[10px] text-blue-700"
            >
              ▶
            </span>
            Watch How It Works
          </a>
        </div>
      </div>
    </section>
  );
}
