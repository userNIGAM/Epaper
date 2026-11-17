import Link from "next/link";
import {
  FileText,
  Search,
  ArrowRight,
  FileCheck,
  BriefcaseBusiness,
  UserRound,
  GraduationCap,
  Building2,
} from "lucide-react";

const categories = [
  {
    title: "Personal Documents",
    description: "Documents related to your personal identity and records.",
    icon: UserRound,
    documents: ["Birth Certificate", "Marriage Certificate", "Relationship Certificate"],
  },
  {
    title: "Business Documents",
    description: "Prepare documents for business and professional purposes.",
    icon: BriefcaseBusiness,
    documents: ["Business Registration", "PAN Registration", "Business Recommendation"],
  },
  {
    title: "Education Documents",
    description: "Generate educational applications and certificates.",
    icon: GraduationCap,
    documents: ["Academic Transcript Request", "Character Certificate", "Migration Certificate"],
  },
  {
    title: "Government Documents",
    description: "Prepare applications and government-related documents.",
    icon: Building2,
    documents: ["Ward Recommendation", "Application Letter", "Official Request Letter"],
  },
];

export default function GenerateDocumentPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">

      {/* Page Heading */}
      <section>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-blue-700">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-blue-700">Generate Document</span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
          Generate Documents
        </h1>

        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Create official documents quickly with our step-by-step document
          generation system.
        </p>
      </section>

      {/* Search */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Find Your Document
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Search for the document you want to generate.
        </p>

        <div className="relative mt-4 max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Search documents..."
            className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </section>

      {/* Document Categories */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Browse Document Categories
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a category to explore available documents.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <div
                key={category.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon size={24} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {category.title}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {category.documents.map((document) => (
                    <button
                      key={document}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-3 text-left text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={17} />
                        {document}
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Help Section */}
      <section className="flex flex-col justify-between gap-4 rounded-xl bg-blue-50 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <FileCheck className="mt-1 h-6 w-6 shrink-0 text-blue-700" />

          <div>
            <h3 className="font-semibold text-slate-900">
              Need help with your document?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Follow our document guides to understand the required
              information and preparation process.
            </p>
          </div>
        </div>

        <Link
          href="/government-services"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          View Guides
          <ArrowRight size={16} />
        </Link>
      </section>

    </div>
  );
}
