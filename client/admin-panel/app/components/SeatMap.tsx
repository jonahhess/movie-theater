'use client';

export type Seat = {
  id: number;
  row: string;
  number: number;
  is_available: boolean;
  is_accessible: boolean;
  x_pos: number;
  y_pos: number;
  angle: number;
  auditorium_id: number;
};

type SeatMapProps = {
  seats: Seat[];
  selectedSeatId: number | null;
  onSelect: (seat: Seat) => void;
};

export default function SeatMap({ seats, selectedSeatId, onSelect }: SeatMapProps) {
  const padding = 40;
  const minX = Math.min(0, ...seats.map((seat) => seat.x_pos)) - padding;
  const minY = Math.min(0, ...seats.map((seat) => seat.y_pos)) - padding;
  const maxX = Math.max(480, ...seats.map((seat) => seat.x_pos + padding)) + padding;
  const maxY = Math.max(280, ...seats.map((seat) => seat.y_pos + padding)) + padding;
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-slate-950 p-3">
        <svg
          aria-label="Interactive auditorium seat map"
          className="h-[min(68vh,620px)] w-full"
          role="img"
          viewBox={viewBox}
        >
          <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="#0f172a" />
          <text x={(minX + maxX) / 2} y={minY + 24} textAnchor="middle" fill="#94a3b8" fontSize="12">
            SCREEN
          </text>
          {seats.map((seat) => {
            const isSelected = seat.id === selectedSeatId;
            const fill = seat.is_available
              ? seat.is_accessible ? "#34d399" : "#38bdf8"
              : "#64748b";

            return (
              <g
                key={seat.id}
                aria-label={`Seat ${seat.row}${seat.number}`}
                className="cursor-pointer outline-none"
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
                  fill={fill}
                  stroke={isSelected ? "#f8fafc" : "#1e293b"}
                  strokeWidth={isSelected ? 3 : 1}
                />
                <text textAnchor="middle" dominantBaseline="central" fill="#082f49" fontSize="10" fontWeight="600">
                  {seat.row}{seat.number}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600" aria-label="Seat map legend">
        <span><i className="mr-2 inline-block h-3 w-3 rounded bg-emerald-400" />Available accessible</span>
        <span><i className="mr-2 inline-block h-3 w-3 rounded bg-sky-400" />Available</span>
        <span><i className="mr-2 inline-block h-3 w-3 rounded bg-slate-500" />Unavailable</span>
      </div>
    </div>
  );
}