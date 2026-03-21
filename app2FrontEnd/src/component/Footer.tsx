// src/components/Navigation/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white rounded-lg shadow m-4 border border-gray-100">
      <div className="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-between">
        <span className="text-sm text-gray-500 sm:text-center">
          © {currentYear} <a href="#" className="hover:underline font-semibold">El Ouaha™</a>.
          Gestion Immobilière & Promotion.
        </span>
        <ul className="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 sm:mt-0">
          <li>
            <a href="#" className="hover:underline me-4 md:me-6">Documentation</a>
          </li>
          <li>
            <a href="#" className="hover:underline me-4 md:me-6">Support Technique</a>
          </li>
          <li>
            <a href="#" className="hover:underline">Export Logs</a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;