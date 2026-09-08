"use client";

import type { components } from "@/types/tickets-schema";

export type Seat = components["schemas"]["ScreeningSeatResponse"] & {
  auditorium_id?: number;
};

type SeatMapProps = {
  seats: Seat[];
  selectedSeatIds: Set<number>;
  onSelect: (seat: Seat) => void;
};

export default function SeatMap({ seats, selectedSeatIds, onSelect }: SeatMapProps) {
  const padding = 40;
  const minX = Math.min(0, ...seats.map((seat) => seat.x_pos)) - padding;
  const minY = Math.min(0, ...seats.map((seat) => seat.y_pos)) - padding;
  const maxX = Math.max(480, ...seats.map((seat) => seat.x_pos + padding)) + padding;
  const maxY = Math.max(280, ...seats.map((seat) => seat.y_pos + padding)) + padding;
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 p-4 shadow-inner">
        <svg
          aria-label="Interactive auditorium seat map"
          className="h-[min(65vh,580px)] w-full"
          role="img"
          viewBox={viewBox}
        >
          <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="#0f172a" />
          <text
            x={(minX + maxX) / 2}
            y={minY + 24}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="12"
            fontWeight="600"
          >
            SCREEN
          </text>
          {seats.map((seat) => {
            const isSelected = selectedSeatIds.has(seat.id);
            const fill = seat.is_available
              ? seat.is_accessible
                ? "#34d399"
                : "#38bdf8"
              : "#64748b";

            return (
              <g
                key={seat.id}
                aria-label={`Seat ${seat.row}${seat.number}`}
                className="cursor-pointer outline-none transition-transform"
                role="button"
                tabIndex={0}
                transform={`translate(${seat.x_pos} ${seat.y_pos}) rotate(${seat.angle})`}
                onClick={() => onSelect(seat)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(seat);
                  }
                }}
              >
                <rect
                  x="-16"
                  y="-12"
                  width="32"
                  height="24"
                  rx="4"
                  fill={isSelected ? "#fbbf24" : fill}
                  stroke={isSelected ? "#ffffff" : "#1e293b"}
                  strokeWidth={isSelected ? 2.5 : 1}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? "#451a03" : "#082f49"}
                  fontSize="10"
                  fontWeight="700"
                >
                  {seat.row}
                  {seat.number}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600"
        aria-label="Seat map legend"
      >
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-amber-400" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-sky-400" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-emerald-400" />
          Accessible
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-slate-500" />
          Unavailable
        </span>
      </div>
    </div>
  );
}
