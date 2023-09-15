import { useEffect, useState } from "react";
import NavBar from "../NavBar";
import LandingCard from "./cards/LandingCard";
import LandingCardLogo from "./cards/LandingCardLogo";

function Submit() {
  const [player, setPlayer] = useState<any>(null);
  const [hasOverrideAbility, setHasOverrideAbility] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linksCounted, setLinksCounted] = useState(0);

  useEffect(() => {
	if(player != null) {
		return;
	}
    fetch("http://localhost:5075/api/me", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        setPlayer(data);
        console.log(data);

        const user = player["user"];
        const roles = user["roles"];
        setHasOverrideAbility(roles.includes("Admin"));
        console.log(hasOverrideAbility);
      })
      .catch((error) => {
        console.error("Error fetching player data:", error);
      });
  }, []); // The empty dependency array ensures this effect runs only once, similar to componentDidMount

  function handleSubmit(e: any) {
	e.preventDefault();

    if (!linkText) {
      alert("Please enter some links!");
      return;
    }

    const submission = [];
    const linkList = linkText.split("\n");

    for (let i = 0; i < linkList.length; i++) {
      const link = linkList[i];
      // Convert string to whole number
      if (link.startsWith("https://osu.ppy.sh/community/matches/") || link.startsWith("https://osu.ppy.sh/mp/")) {
        const matchId = parseInt(link.split("/").pop()!);
        submission.push(matchId);
      } else if (parseInt(link) > 0) {
        submission.push(parseInt(link));
      } else {
        alert("Invalid link: " + link);
        e.preventDefault();
        return;
      }
    }
	console.log(submission)

	alert('Submitted! Thanks for your contribution!');
  }

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
            1. Include fair & legitimate tournament matches.
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
          <p className="text-xl">
            4. Qualifiers should <strong>never</strong> be submitted.
          </p>
        </div>
      </div>
      <div className="mx-52 flex bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center">
        <p className="text-xl">
          5. Include bracket-stage & group-stage matches only.
        </p>
      </div>

      <LandingCard
        title="Some notes"
        description="We are currently prioritizing badged tournaments. If you have an unbadged tournament, that's fine too! Just make sure it follows our rules above."
      />

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col m-10 space-y-4">
          <div className="flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center">
            <p className="text-4xl font-semibold">Match submission</p>
          </div>
          <div className="flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center">
            <p className="text-xl">Paste as many links as you want below!</p>
          </div>
          <div className="flex flex-row rounded-xl font-sans p-2 justify-center justify-items-center space-x-5 m-10">
            <textarea
              name="links"
              onChange={(e) => {
                setLinkText(e.target.value);
                setLinksCounted(e.target.value.split("\n").length);
              }}
              style={{ resize: "none" }}
              className="flex flex-row bg-gray-100 rounded-xl font-sans p-2 justify-center justify-items-center w-1/2 h-96"
              placeholder="https://osu.ppy.sh/community/matches/12345678"
            />
            <div className="flex flex-col w-1/3 bg-gray-100 rounded-xl">
              <div className="flex flex-col m-5 space-x-10 space-y-5">
                <p className="text-2xl font-medium mx-auto">Details</p>

                {hasOverrideAbility && (
                  <div className="flex flex-row space-x-10">
                    <p className="text-lg">Admin force verified</p>
                    <input
                      className="w-4"
                      type="checkbox"
                      name="forceVerified"
                    />
                  </div>
                )}

                <p>Links counted: {linksCounted}</p>
              </div>
            </div>

            <div className="flex flex-row">
              <button
                type="submit"
                className="bg-red-200 rounded-xl font-sans font-bold text-xl"
              >
                Send it!
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

export default Submit;
