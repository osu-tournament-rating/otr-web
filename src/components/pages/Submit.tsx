import { useEffect, useState } from "react";
import NavBar from "../NavBar";
import UserAvatarCard from "./cards/UserAvatarCard";
import LandingCard from "./cards/LandingCard";
import LandingCardLogo from "./cards/LandingCardLogo";

function Submit() {
  const [links, setLinks] = useState([]);
  const [player, setPlayer] = useState();

  useEffect(() => {
    fetch("http://localhost:5075/api/me", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        setPlayer(data);
        console.log(data);
      })
      .catch((error) => {
        console.error("Error fetching player data:", error);
      });
  }, []); // The empty dependency array ensures this effect runs only once, similar to componentDidMount

  return (
    <>
      <NavBar />
      <div className="flex m-10">
        <LandingCardLogo />
        <LandingCard
          title="Match submission"
          description="We're glad you're here! Please follow the posted guidelines before submitting your matches"
        />
      </div>

      <div className="m-10 flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center">
        <p className="text-4xl font-semibold">Submission rules</p>
      </div>

      <div className="w-1/2"></div>
      <div className="flex m-10 space-x-4">
        <div className="flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center w-1/2">
          <p className="text-xl">
            1. Include fair & legitimate tournament matches
          </p>
        </div>
        <div className="flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center w-1/2">
          <p className="text-xl">2. Submit matches that are traditional.</p>
        </div>
      </div>
      <div className="flex m-10 space-x-4">
        <div className="flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center w-1/2">
          <p className="text-xl">
            3. We do not accept battle-royale or relax matches.
          </p>
        </div>
        <div className="flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center w-1/2">
          <p className="text-xl">4. Qualifiers should never be submitted</p>
        </div>
      </div>
      <div className="mx-52 flex bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center">
        <p className="text-xl">
          5. Include bracket-stage & group-stage matches only
        </p>
      </div>

      <LandingCard
          title="Some notes"
          description="We are currently prioritizing badged tournaments. If you have an unbadged tournament, that's fine too! Just make sure it follows our rules above."
        />
    </>
  );
}

export default Submit;
