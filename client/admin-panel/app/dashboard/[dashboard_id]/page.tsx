import Dashboard from "../components/Dashboard";
import MovieSuccess from "../components/MovieSuccess";

interface PageProps {
  params: Promise<{
    dashboard_id: string;
  }>;
}

export default async function ScreeningPage({ params }: PageProps) {
  // Await the params to extract the dynamic segment
  const resolvedParams = await params;
const dashboardId = Number(resolvedParams.dashboard_id);

  if (dashboardId === 1) {
    return <Dashboard />;
  }
  return <MovieSuccess />;
}
