import React, { useState } from 'react';

function NavBar() {
  const [isMobileNavVisible, setIsMobileNavVisible] = useState(false);

  return (
    <div className="bg-gray-100 rounded-xl p-4 m-5 md:m-10">
      <div className="flex items-center justify-between">
        <a href="/">
          <img className="w-8 flex" src="logos/small.svg" alt="Company Logo" />
        </a>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center justify-between w-full mx-10">
          <div className="flex space-x-8">
            <a href="/Dashboard" className="text-dark text-xl font-medium font-sans hover:text-gray-600">Dashboard</a>
            <a href="/Leaderboards" className="text-dark text-xl font-medium font-sans hover:text-gray-600">Leaderboards</a>
            <a href="/Submit" className="text-dark text-xl font-medium font-sans hover:text-gray-600 hover:drop-shadow-sm">Submit matches</a>
          </div>

          <div className="flex-2/3 justify-end">
            <a href="/Donate" className="mx-10 text-dark text-xl font-medium font-sans hover:text-gray-600 hover:drop-shadow-sm">Donate</a>
          </div>
        </div>

        {/* Hamburger Menu Icon for mobile */}
        <button 
          onClick={() => setIsMobileNavVisible(!isMobileNavVisible)}
          className="md:hidden p-2 focus:outline-none focus:shadow-outline">
          ☰
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileNavVisible && (
        <div className="md:hidden mt-4 w-full">
          <a href="/Dashboard" className="block text-dark text-xl font-medium font-sans hover:text-gray-600 px-4 py-2">Dashboard</a>
          <a href="/Leaderboards" className="block text-dark text-xl font-medium font-sans hover:text-gray-600 px-4 py-2">Leaderboards</a>
          <a href="/Submit" className="block text-dark text-xl font-medium font-sans hover:text-gray-600 hover:drop-shadow-sm px-4 py-2">Submit matches</a>
          <a href="/Donate" className="block text-dark text-xl font-medium font-sans hover:text-gray-600 hover:drop-shadow-sm px-4 py-2">Donate</a>
        </div>
      )}
    </div>
  );
}

export default NavBar;
