import { SiteHeader } from "../components/SiteHeader";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-bg text-foreground">
      <SiteHeader />
      {children}
    </div>
  );
}
