'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Award, TrendingUp, DollarSign, Users } from 'lucide-react';

// --- TYPES ---
interface Screening {
  id: number;
  movie_title: string;
  capacity: number;
}

interface TicketSale {
  screening_id: number;
  price: number;
}

// --- MOCK DATABASE DATA ---
const mockScreenings: Screening[] = [
  { id: 1, movie_title: 'Inception', capacity: 150 },
  { id: 2, movie_title: 'Inception', capacity: 150 },
  { id: 3, movie_title: 'Avatar', capacity: 200 },
  { id: 4, movie_title: 'Avatar', capacity: 200 },
  { id: 5, movie_title: 'Interstellar', capacity: 120 },
  { id: 6, movie_title: 'Interstellar', capacity: 120 },
];

const mockTickets: TicketSale[] = [
  ...Array.from({ length: 85 }, () => ({ screening_id: 1, price: 12 })),
  ...Array.from({ length: 142 }, () => ({ screening_id: 2, price: 15 })),
  ...Array.from({ length: 110 }, () => ({ screening_id: 3, price: 12 })),
  ...Array.from({ length: 195 }, () => ({ screening_id: 4, price: 15 })),
  ...Array.from({ length: 50 }, () => ({ screening_id: 5, price: 10 })),
  ...Array.from({ length: 115 }, () => ({ screening_id: 6, price: 14 })),
];

// Aesthetic color palette for the pie chart
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function MovieSuccessDashboard() {
  
  // --- AGGREGATE SCREENINGS & TICKETS BY MOVIE ---
  const movieSuccessData = useMemo(() => {
    const registry: Record<string, { totalRevenue: number; totalTickets: number; totalCapacity: number; screeningCount: number }> = {};

    mockScreenings.forEach((screening) => {
      const title = screening.movie_title;
      const tickets = mockTickets.filter((t) => t.screening_id === screening.id);
      
      if (!registry[title]) {
        registry[title] = { totalRevenue: 0, totalTickets: 0, totalCapacity: 0, screeningCount: 0 };
      }

      registry[title].totalRevenue += tickets.reduce((sum, t) => sum + t.price, 0);
      registry[title].totalTickets += tickets.length;
      registry[title].totalCapacity += screening.capacity;
      registry[title].screeningCount += 1;
    });

    return Object.keys(registry).map((title) => {
      const item = registry[title];
      return {
        movie: title,
        revenue: item.totalRevenue,
        ticketsSold: item.totalTickets,
        avgOccupancy: Math.round((item.totalTickets / item.totalCapacity) * 100),
        revenuePerScreening: Math.round(item.totalRevenue / item.screeningCount),
      };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by highest revenue
  }, []);

  // --- TOP PERFORMER CALCULATION ---
  const topMovie = movieSuccessData[0] || { movie: 'None', revenue: 0 };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen text-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Movie Success Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Lifetime performance, market share, and room efficiency metrics per title.</p>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top Grossing Film</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{topMovie.movie}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-500"><Award size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top Movie Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${topMovie.revenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600"><DollarSign size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Highest Efficiency Room</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {movieSuccessData.reduce((prev, curr) => prev.avgOccupancy > curr.avgOccupancy ? prev : curr).movie}
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><TrendingUp size={24} /></div>
        </div>
      </div>

      {/* Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total Box Office Revenue Breakdown (Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Total Revenue & Screening Yield</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movieSuccessData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="movie" stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar yAxisId="left" dataKey="revenue" name="Total Gross Revenue ($)" fill="#3b82f6" radius={5} />
                <Bar yAxisId="right" dataKey="revenuePerScreening" name="Avg Revenue / Screening ($)" fill="#eab308" radius={5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket Volume Share (Pie Chart) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Market Share (By Tickets)</h2>
          <div className="h-64 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={movieSuccessData}
                  dataKey="ticketsSold"
                  nameKey="movie"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {movieSuccessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Custom Minimal Legend */}
          <div className="space-y-2 mt-2">
            {movieSuccessData.map((item, index) => (
              <div key={item.movie} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-gray-600 truncate max-w-[120px]">{item.movie}</span>
                </div>
                <span className="text-gray-900 font-bold">{item.ticketsSold.toLocaleString()} tickets ({item.avgOccupancy}% occupancy)</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}