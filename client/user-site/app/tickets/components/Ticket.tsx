import QRCodeGenerator from "./QRCodeGenerator";
import formatDateTime from "@/helpers/formatDateTime";

interface TicketProps {
    ticket: any;
    showTicket: number;
    setShowTicket: (id: number) => void;
}

export default function Ticket({ ticket, showTicket, setShowTicket }: TicketProps) {
    return (
        <article key={ticket.id} className="rounded-2xl border border-border bg-bg-raised p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-accent-hover">
                  Receipt #{ticket.receipt_number}
                </p>
                <span className="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink capitalize">
                  {ticket.status}
                </span>
              </div>
              {ticket.screening.start_time && <p className="mt-2 text-xs text-foreground-subtle">Start Time: {formatDateTime(ticket.screening.start_time)}</p>}
              {ticket.screening.end_time && <p className="mt-2 text-xs text-foreground-subtle">End Time: {formatDateTime(ticket.screening.end_time)}</p>}
              {ticket.seat && <p className="mt-2 text-xs text-foreground-subtle">Seat: {ticket.seat.row}{ticket.seat.number}</p>}
              <br />
              {showTicket === ticket.id && <QRCodeGenerator text={ticket.id} />}
              <button onClick={() => setShowTicket(ticket.id === showTicket ? 0 : ticket.id)} className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-hover">{showTicket === ticket.id ? "Hide QR Code" : "Show QR Code"}</button>
            </article>
    );
}