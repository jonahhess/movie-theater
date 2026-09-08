'use client';

import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/users", label: "Users" },
  { href: "/movies", label: "Movies" },
  { href: "/auditoriums", label: "Auditoriums" },
  { href: "/screenings", label: "Screenings" },
  { href: "/tickets", label: "Tickets" },
  { href: "/screening-seats", label: "Screening Seats" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="flex flex-col p-4 bg-gray-100">
      <nav id="links" aria-label="Main navigation">
        {links.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <a
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`mr-4 inline-block border-b-2 pb-1 ${
                isActive
                  ? "border-blue-600 font-semibold text-blue-700"
                  : "border-transparent"
              }`}
            >
              {label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}