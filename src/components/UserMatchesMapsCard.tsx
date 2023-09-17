import { Fragment } from "react";
import { useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export interface IUserMatchesMapsCardProps {
  matches: number;
  maps: number;
  matchesWon: number;
  matchesLost: number;
  mapsWon: number;
  mapsLost: number;
}

function UserMatchesMapsCard({
  matches,
  maps,
  matchesWon,
  matchesLost,
  mapsWon,
  mapsLost,
}: IUserMatchesMapsCardProps) {
  const [matchesSelected, setMatchesSelected] = useState(true); // false = Maps selected

  return (
    <div className="flex flex-col m-5 md:m-10 bg-gray-100 mt-16 rounded-xl">
      <div className="flex">
        <div className="flex flex-row font-sans m-5 -space-x-3">
          <div>
            <p className="text-5xl font-bold m-5">{matches}</p>
          </div>
          <div className="m-5 mt-auto">
            <p className="text-2xl">Matches</p>
          </div>
        </div>
        <div className="flex flex-row font-sans m-5 -space-x-3">
          <div>
            <p className="text-5xl font-bold m-5">{maps}</p>
          </div>
          <div className="m-5 mt-auto">
            <p className="text-2xl">Maps</p>
          </div>
        </div>
      </div>
      <Menu as="div" className="flex text-left ml-5">
        <div>
          <Menu.Button className="inline-flex justify-center w-full px-4 py-2 font-sans text-xl rounded-xl focus:outline-none">
            {matchesSelected ? "Matches" : "Maps"}
            <KeyboardArrowDownIcon className="my-1" />
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="flex rounded-xl font-sans text-xl">
            <Menu.Item>
              <button
                className="bg-gray-100 text-left w-full px-4 py-2 rounded-xl focus:outline-none"
                onClick={() => setMatchesSelected(true)}
              >
                Matches
              </button>
            </Menu.Item>
            <Menu.Item>
              <button
                className="bg-gray-100 text-left w-full px-4 py-2 rounded-xl focus:outline-none"
                onClick={() => setMatchesSelected(false)}
              >
                Maps
              </button>
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
      <div className="flex mx-5 md:mx-10 rounded-xl h-12 space-x-0">
        <div className="flex flex-row w-1/2  rounded-l-xl"> 
            Test
        </div>
        <div className="flex flex-row w-1/2 bg-red-400 rounded-r-xl">
            Test
        </div>
      </div>
    </div>
  );
}

export default UserMatchesMapsCard;
