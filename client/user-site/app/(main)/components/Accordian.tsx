'use client'; // Required in Next.js App Router for state

import React, { useState } from 'react';

interface AccordionProps {
  summary: React.ReactNode;
  details: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({ summary, details, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden max-w-xl mx-auto">
      {/* Clickable Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 font-semibold text-left select-none transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <span>{summary}</span>
        
        {/* Flawless Rotating Arrow Container */}
        <span 
          className={`transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          <svg
            className="w-5 h-5 text-gray-500"
            xmlns="http://w3.org"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* 
        Buttery Smooth CSS Grid Transition Layout
        Controlled explicitly by React state instead of browser internals.
      */}
      <div 
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out bg-white ${
          isOpen ? 'grid-rows-[1fr] border-t border-gray-200' : 'grid-rows-[0fr]'
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
