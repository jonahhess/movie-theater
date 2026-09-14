'use client';

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Film, Ticket, DollarSign, Percent } from 'lucide-react';

// --- TYPES ---
interface Screening {
  id: number;
  movie_title: string;
  start_time: string; // e.g., "14:00", "18:30"
  capacity: number;
}

interface TicketSale {
  id: number;
  screening_id: number;
  price: number;
}

// --- MOCK DATABASE DATA ---
// Replace this with data fetched from your MySQL database via an API route
const mockScreenings: Screening[] = [
  { id: 1, movie_title: 'Inception', start_time: '14:00', capacity: 150 },
  { id: 2, movie_title: 'Inception', start_time: '19:30', capacity: 150 },
  { id: 3, movie_title: 'Avatar', start_time: '15:30', capacity: 200 },
  { id: 4, movie_title: 'Avatar', start_time: '21:00', capacity: 200 },
  { id: 5, movie_title: 'Interstellar', start_time: '13:00', capacity: 120 },
  { id: 6, movie_title: 'Interstellar', start_time: '18:00', capacity: 120 },
];

// Simulating tickets sold table matching screening IDs
const mockTickets: TicketSale[] = [
  ...Array.from({ length: 85 }, () => ({ id: Math.random(), screening_id: 1, price: 12 })), // Inception 14:00
  ...Array.from({ length: 142 }, () => ({ id: Math.random(), screening_id: 2, price: 15 })), // Inception 19:30
  ...Array.from({ length: 110 }, () => ({ id: Math.random(), screening_id: 3, price: 12 })), // Avatar 15:30
  ...Array.from({ length: 195 }, () => ({ id: Math.random(), screening_id: 4, price: 15 })), // Avatar 21:00
  ...Array.from({ length: 50 }, () => ({ id: Math.random(), screening_id: 5, price: 10 })),  // Interstellar 13:00
  ...Array.from({ length: 115 }, () => ({ id: Math.random(), screening_id: 6, price: 14 })), // Interstellar 18:00
];

export default function MovieDashboard() {
  const [selectedMovie, setSelectedMovie] = useState<string>('All');

  // --- UNIQUE MOVIES FOR FILTER ---
  const moviesList = useMemo(() => {
    const movies = mockScreenings.map((s) => s.movie_title);
    return ['All', ...Array.from(new Set(movies))];
  }, []);

  // --- DATA PROCESSING (Aggregating MySQL tables) ---
  const processedData = useMemo(() => {
    return mockScreenings.map((screening) => {
      const ticketsForScreening = mockTickets.filter((t) => t.screening_id === screening.id);
      const ticketsSold = ticketsForScreening.length;
      const revenue = ticketsForScreening.reduce((sum, t) => sum + t.price, 0);
      const occupancyRate = Math.round((ticketsSold / screening.capacity) * 100);

      return {
        id: screening.id,
        movie: screening.movie_title,
        time: screening.start_time,
        label: `${screening.movie_title} (${screening.start_time})`,
        ticketsSold,
        revenue,
        occupancyRate,
      };
    });
  }, []);

  // --- FILTERED DATA FOR CHARTS ---
  const filteredData = useMemo(() => {
    if (selectedMovie === 'All') return processedData;
    return processedData.filter((d) => d.movie === selectedMovie);
  }, [selectedMovie, processedData]);

  // --- OVERALL METRICS ---
  const metrics = useMemo(() => {
    const totalTickets = filteredData.reduce((sum, d) => sum + d.ticketsSold, 0);
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0);
    const avgOccupancy = Math.round(
      filteredData.reduce((sum, d) => sum + d.occupancyRate, 0) / filteredData.length
    );
    const totalScreenings = filteredData.length;

    return { totalTickets, totalRevenue, avgOccupancy, totalScreenings };
  }, [filteredData]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen text-gray-800">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Theater Performance</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time metrics per movie and screening time.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="movie-filter" className="text-sm font-medium text-gray-600">Filter Movie:</label>
          <select
            id="movie-filter"
            value={selectedMovie}
            onChange={(e) => setSelectedMovie(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {moviesList.map((movie) => (
              <option key={movie} value={movie}>{movie}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${metrics.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600"><DollarSign size={24} /></div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tickets Sold</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalTickets.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Ticket size={24} /></div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Occupancy</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.avgOccupancy}%</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Percent size={24} /></div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Shows</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalScreenings}</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><Film size={24} /></div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Revenue Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue & Tickets per Showtime</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="ticketsSold" name="Tickets Sold" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Rate Line Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Occupancy Trends (%)</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis stroke="#8b5cf6" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, 'Occupancy']} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line type="monotone" dataKey="occupancyRate" name="Occupancy Rate" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}