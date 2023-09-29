import React, { useState } from "react";
import { Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

interface NavBarProps {
  isAuthenticated: boolean;
  user: any;

  mode: number;
  setMode: React.Dispatch<React.SetStateAction<number>>;

  tab: string;
  setTab: React.Dispatch<React.SetStateAction<string>>;
}

function NavBar({ isAuthenticated, user, mode, setMode, tab, setTab }: NavBarProps) {
  const [isMobileNavVisible, setIsMobileNavVisible] = useState(false);
  const [isModeSwitcherVisible, setIsModeSwitcherVisible] = useState(false);

  return (
    <div className="bg-gray-100 rounded-xl p-4 m-5 md:m-10">
      <div className="flex items-center justify-between">
        <Link to="/">
          <img className="w-8 flex" src="logos/small.svg" alt="o!TR" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center justify-between w-full mx-10">
          <div className="flex space-x-8">
            <Link
              to="/Dashboard"
              onClick={() => setTab("Dashboard")}
              className={`text-dark text-xl font-sans hover:text-gray-600 ${
                tab === "Dashboard" ? "font-bold" : "font-medium"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/Leaderboards"
              onClick={() => setTab("Leaderboards")}
              className={`text-dark text-xl font-sans hover:text-gray-600 ${
                tab === "Leaderboards" ? "font-bold" : "font-medium"
              }`}
            >
              Leaderboards
            </Link>
            <Link
              to="/Submit"
              onClick={() => setTab("Submit")}
              className={`text-dark text-xl font-sans hover:text-gray-600 ${
                tab === "Submit" ? "font-bold" : "font-medium"
              }`}
            >
              Submit matches
            </Link>
          </div>

          <div className="flex-2/3 justify-end">
            <Link
              to="/Donate"
              onClick={() => setTab("Donate")}
              className={`text-dark text-xl font-sans hover:text-gray-600 ${
                tab === "Donate" ? "font-bold" : "font-medium"
              }`}
            >
              Donate
            </Link>
          </div>

          <div className="flex-2/3 justify-end">
            <button
              onClick={() => setIsModeSwitcherVisible(!isModeSwitcherVisible)}
            >
              <img
                className="w-8 h-8 flex mt-1"
                src="icons/osu.svg"
                alt="Mode Switcher"
              />
            </button>
          </div>
        </div>

        {isModeSwitcherVisible && (
          <div className="absolute mt-10 right-40 z-10 bg-gray-200 rounded-xl">
            <button
              onClick={() => {
                setMode(0);
                setIsModeSwitcherVisible(false);
              }}
              className="block text-dark text-lg font-sans hover:text-gray-600 px-4 py-2"
            >osu!</button>
            <button
              onClick={() => {
                setMode(3);
                setIsModeSwitcherVisible(false);
              }}
              className="block text-dark text-lg font-sans hover:text-gray-600 px-4 py-2"
            >osu!Mania</button>
            <button
              onClick={() => {
                setMode(1);
                setIsModeSwitcherVisible(false);
              }}
              className="block text-dark text-lg font-sans hover:text-gray-600 px-4 py-2"
            >osu!Taiko</button>
            <button
              onClick={() => {
                setMode(2);
                setIsModeSwitcherVisible(false);
              }}
              className="block text-dark text-lg font-sans hover:text-gray-600 px-4 py-2"
            >osu!Catch</button>
          </div>
        )}

        {/* Hamburger Menu Icon for mobile */}
        <button
          onClick={() => setIsMobileNavVisible(!isMobileNavVisible)}
          className="md:hidden p-2 focus:outline-none focus:shadow-outline"
        >
          ☰
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileNavVisible && (
        <div className="md:hidden mt-4 w-full">
          <Link
            to="/Dashboard"
            onClick={() => setTab("Dashboard")}
            className={`block text-dark text-xl ${
              tab === "Dashboard" ? "font-bold" : "font-medium"
            } font-sans hover:text-gray-600 px-4 py-2`}
          >
            Dashboard
          </Link>
          <Link
            to="/Leaderboards"
            onClick={() => setTab("Leaderboards")}
            className={`block text-dark text-xl ${
              tab === "Leaderboards" ? "font-bold" : "font-medium"
            } font-sans hover:text-gray-600 px-4 py-2`}
          >
            Leaderboards
          </Link>
          <Link
            to="/Submit"
            onClick={() => setTab("Submit")}
            className={`block text-dark text-xl ${
              tab === "Submit" ? "font-bold" : "font-medium"
            } font-sans hover:text-gray-600 px-4 py-2`}
          >
            Submit matches
          </Link>
          <Link
            to="/Donate"
            onClick={() => setTab("Donate")}
            className={`block text-dark text-xl ${
              tab === "Donate" ? "font-bold" : "font-medium"
            } font-sans hover:text-gray-600 px-4 py-2`}
          >
            Donate
          </Link>
        </div>
      )}
    </div>
  );
}

export default NavBar;
