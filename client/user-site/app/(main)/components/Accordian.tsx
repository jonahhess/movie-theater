'use client'; // Required in Next.js App Router for state

import React, { useState } from 'react';

interface AccordionProps {
  summary: React.ReactNode;
  details: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({
  summary,
  details,
  defaultOpen = false,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden max-w-xl mx-auto"
      onPointerEnter={() => setIsOpen(true)}
      onPointerLeave={() => setIsOpen(false)}
    >
      {/* Clickable Header Button */}
      <button
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 font-semibold text-left select-none transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <span>{summary}</span>
      </button>

      {/* Smooth CSS Grid Transition */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out bg-white ${
          isOpen
            ? "grid-rows-[1fr] border-t border-gray-200"
            : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 text-gray-600">
            {details}
          </div>
        </div>
      </div>
    </div>
  );
}
