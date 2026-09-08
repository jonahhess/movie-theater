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
      <div className="overflow-hidden rounded-2xl border border-border bg-[#070a0f] p-4">
        <svg
          aria-label="Interactive auditorium seat map"
          className="h-[min(65vh,580px)] w-full"
          role="img"
          viewBox={viewBox}
        >
          <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="#070a0f" />
          <text
            x={(minX + maxX) / 2}
            y={minY + 24}
            textAnchor="middle"
            fill="#fcd34d"
            fontSize="12"
            fontWeight="600"
          >
            SCREEN
          </text>
          {seats.map((seat) => {
            const isSelected = selectedSeatIds.has(seat.id);
            const fill = seat.is_available
              ? seat.is_accessible
                ? "#d97706"
                : "#e7e5e4"
              : "#3f3f46";

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
                  fill={isSelected ? "#fcd34d" : fill}
                  stroke={isSelected ? "#ffffff" : "#1c1917"}
                  strokeWidth={isSelected ? 2.5 : 1}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? "#0d1117" : seat.is_available ? "#0d1117" : "#a1a1aa"}
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
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-foreground-muted"
        aria-label="Seat map legend"
      >
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-accent" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-[#e7e5e4]" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-[#d97706]" />
          Accessible
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-[#3f3f46]" />
          Unavailable
        </span>
      </div>
    </div>
  );
}
