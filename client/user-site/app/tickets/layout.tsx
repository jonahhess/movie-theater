import { SiteHeader } from "../components/SiteHeader";

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-bg text-foreground">
      <SiteHeader />
      {children}
    </div>
  );
}
