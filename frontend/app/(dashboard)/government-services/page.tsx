const services = [
  ["Citizenship Services", "Information about citizenship applications and recommendations."],
  ["Birth Registration", "Understand the birth registration process and required documents."],
  ["Marriage Registration", "Learn about marriage registration and certificates."],
  ["Ward Office Services", "Explore ward recommendations and local government services."],
  ["Business Registration", "Information about registering a business in Nepal."],
  ["Passport Services", "Learn about passport application requirements and procedures."]
];

export default function GovernmentServicesPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-slate-500">Dashboard / Government Services</p>
        <h1 className="mt-3 text-3xl font-bold">Government Service Guide</h1>
        <p className="mt-2 text-slate-500">Explore government services, requirements and application procedures.</p>
      </div>
      <input placeholder="Search government services..." className="h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none focus:border-blue-500" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(([title, description]) => (
          <div key={title} className="rounded-xl border bg-white p-5 transition hover:border-blue-300 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-700">▤</div>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            <button className="mt-5 text-sm font-semibold text-blue-700">Explore Guide →</button>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Verify official requirements with the relevant government office before applying.</p>
    </div>
  );
}
