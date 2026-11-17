import HeroSection from "@/components/HeroSection";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <HeroSection />

      <section>
        <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Access your most frequently used services.
        </p>
      </section>
    </div>
  );
}
