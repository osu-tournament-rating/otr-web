import { invalid } from "moment";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface ILinkSubmissionFormProps {
  hasVerifierRole: boolean;
  setHasVerifierRole: (hasAdminRole: boolean) => void;
}

function LinkSubmissionForm({
  hasVerifierRole: hasVerifierRole,
  setHasVerifierRole: setHasVerifierRole,
}: ILinkSubmissionFormProps) {
  const [isSubmissionVerified, setIsSubmissionVerified] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linksCounted, setLinksCounted] = useState(0);
  const [userId, setUserId] = useState(0);
  const [rankRangeLowerBound, setRankRangeLowerBound] = useState<number | null>(
    null
  );
  const [teamSize, setTeamSize] = useState<number>(1);
  const [gameMode, setGameMode] = useState(0); // 0 osu!, 1 osu!taiko, 2 osu!catch, 3 osu!mania

  const [tournamentName, setTournamentName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [forumPost, setForumPost] = useState("");

  const [isTeamSizeTooltipVisible, setTeamSizeTooltipVisible] = useState(false);
  const [isRankRangeTooltipVisible, setIsRankRangeTooltipVisible] =
    useState(false);

  const apiLink = process.env.REACT_APP_API_URL;
  const origin = process.env.REACT_APP_ORIGIN_URL;
  const navigate = useNavigate();

  useEffect(() => {
    fetch(apiLink + "/me", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": `${origin}`,
      }
    })
      .then((response) => response.json())
      .then((data) => {
        const roles = data["roles"];
        setHasVerifierRole(roles.includes("MatchVerifier") || roles.includes("Admin"));
        setUserId(data["id"]);
      })
      .catch((error) => {
        console.error(
          "Error fetching player data, auth key likely expired:",
          error
        );
        return navigate("/unauthorized", { replace: true });
      });
  }, [apiLink, navigate, setHasVerifierRole]);

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
      if (
        link.startsWith("https://osu.ppy.sh/community/matches/") ||
        link.startsWith("https://osu.ppy.sh/mp/")
      ) {
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
    setLinkText("");
    setLinksCounted(0);
    setTournamentName("");
    setAbbreviation("");
    setForumPost("");
    setTeamSize(1);
    setRankRangeLowerBound(null);
    setGameMode(0);

    const origin = process.env.REACT_APP_ORIGIN_URL;

    fetch(apiLink + "/matches/batch?verified=" + isSubmissionVerified, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": `${origin}`,
      },
      credentials: "include",
      body: JSON.stringify({
        ids: submission,
        tournamentName: tournamentName,
        abbreviation: abbreviation,
        forumPost: forumPost,
        rankRangeLowerBound: rankRangeLowerBound,
        teamSize: teamSize,
        mode: gameMode,
        submitterId: userId,
      }),
    })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error("Submission failed!");
        }
      })
      .catch((error) => {
        console.error(error);
        alert("Submission failed due to API error!.");
        return (
          <>
            <p>Submission failed!</p>
          </>
        );
      });

    alert("Submitted! The o!TR team thanks you for your contribution. <3");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col bg-gray-100 my-5 mr-10 md:ml-5 rounded-xl font-sans pb-10">
        <div className="flex flex-row bg-gray-100 rounded-xl font-sans mx-10 mt-10">
          <p className="text-4xl font-semibold font-sans">Tournament</p>
        </div>
        <div>
          <p className="font-sans text-gray-400 mx-10 my-5 text-xl w-3/5">
            We're currently prioritizing badged tournaments, but you can submit
            an unbadged tournament as well as long as it follows the rules.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="font-sans font-semibold mx-10 text-2xl">
              Game mode
            </p>
            <select
              required={true}
              value={gameMode}
              onChange={(e) => setGameMode(Number(e.target.value))}
              className="flex flex-row border-2 border-gray-400 bg-gray-100 text-xl font-medium rounded-xl font-sans p-2 justify-center justify-items-center w-1/2 h-16 mx-10"
            >
              <option value={0}>osu!Standard</option>
              <option value={1}>osu!Taiko</option>
              <option value={2}>osu!Catch</option>
              <option value={3}>osu!Mania</option>
            </select>
          </div>
          <div className="space-y-3 mx-10">
            <p className="font-sans font-semibold text-2xl">
              Forum post link
            </p>
            <input
              required={true}
              type="text"
              name="forumPost"
              onChange={(e) => {
                setForumPost(e.target.value);
              }}
              value={forumPost}
              className="flex flex-row border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-lg font-sans p-2 justify-center justify-items-center h-16"
              style={{ width: "88%" }}
              placeholder="https://osu.ppy.sh/community/forums/topics/1838608"
            />
          </div>
          <div className="flex-none xl:flex">
            <div className="space-y-3 w-1/2 mx-10 md:mb-0">
              <p className="font-sans font-semibold text-2xl">
                Tournament name
              </p>
              <input
                required={true}
                type="text"
                name="tournamentName"
                onChange={(e) => {
                  setTournamentName(e.target.value);
                }}
                value={tournamentName}
                className="border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-lg font-sans p-2 justify-center justify-items-center h-16"
                placeholder="osu! World Cup 2023"
              />
            </div>
            <div className="space-y-3 md:ml-10 xl:ml-0 mt-5 xl:mt-0">
              <p className="font-sans font-semibold text-2xl">
                Abbreviation
              </p>
              <input
                required={true}
                type="text"
                name="abbreviation"
                onChange={(e) => {
                  setAbbreviation(e.target.value);
                }}
                value={abbreviation}
                className="border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-lg font-sans justify-center justify-items-center h-16 p-2"
                placeholder="OWC2023"
                style={{ width: "88%" }}
              />
            </div>
          </div>
          <div className="space-y-3 ml-10">
            <div className="flex">
              <p className="font-sans font-semibold text-2xl">
                Rank restriction
              </p>
              <p className="font-sans font-semibold ml-5 text-2xl text-gray-500 hover:cursor-help"
                onMouseEnter={(() => setIsRankRangeTooltipVisible(true))} onMouseLeave={(() => setIsRankRangeTooltipVisible(false))}>?</p>
              {isRankRangeTooltipVisible && (
                <div className="absolute bg-black text-white text-sm rounded-md p-2 mt-10 ml-40 mr-5">
                  The best rank allowed to participate -- for example, enter 10000 for a 10k-50k tournament and 1 for an open rank tournament. For a tiered tournament, use the best tier's rank, and for a tournament with an average rank requirement, enter that requirement (e.g. enter 500 for "average rank must be 500 or greater"). If the requirements are more complicated, ask in the o!TR server!
                </div>
              )}
            </div>
            <div>
              <input
                required={true}
                min={1}
                type="number"
                name="rankRangeLowerBound"
                onChange={(e) => setRankRangeLowerBound(parseInt(e.target.value))}
                className="flex flex-row border-2 border-gray-400 bg-gray-100 text-xl font-medium rounded-lg font-sans p-2 justify-center justify-items-center h-16"
                placeholder="1000"
                value={rankRangeLowerBound || ""}
                style={{ width: "88%" }}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex">
              <p className="font-sans font-semibold ml-10 text-2xl">
                Matchup size
              </p>
              <p className="font-sans font-semibold ml-5 text-2xl text-gray-500 hover:cursor-help"
                onMouseEnter={(() => setTeamSizeTooltipVisible(true))} onMouseLeave={(() => setTeamSizeTooltipVisible(false))}>?</p>
            </div>
            {isTeamSizeTooltipVisible && (
              <div className="absolute bg-black text-white text-sm rounded-md p-2 ml-40 mr-5">
                The number of <i>players per team</i> that play in match at a time -- for example, enter 3 for a 3v3 team size 6 tournament and 1 for a 1v1. Remember not to include battle royale matches or matches that are played in head-to-head mode with more than two players.
              </div>
            )}
            <select
              required={true}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="flex flex-row border-2 border-gray-400 bg-gray-100 text-xl font-medium rounded-lg font-sans p-2 justify-center justify-items-center h-16 mx-10 w-1/2"
            >
              <option value={1}>1v1</option>
              <option value={2}>2v2</option>
              <option value={3}>3v3</option>
              <option value={4}>4v4</option>
              <option value={5}>5v5</option>
              <option value={6}>6v6</option>
              <option value={7}>7v7</option>
              <option value={8}>8v8</option>
              {/* <option value={-1}>Other (even team size)</option> */}
            </select>
          </div>
        </div>

        <div className="flex flex-row bg-gray-100 rounded-lg font-sans m-10 mb-5">
          <p className="text-4xl font-semibold font-sans">Match links</p>
        </div>
        <textarea
          name="links"
          onChange={(e) => {
            setLinkText(e.target.value);
            setLinksCounted(e.target.value.split("\n").length);
          }}
          value={linkText}
          style={{ resize: "none", width: "88%" }}
          className="flex flex-row border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-xl font-sans p-2 justify-center justify-items-center mx-10 h-36 max-h-48"
          placeholder="1 per line (match id or full link)"
          required={true}
        />

        <div className="flex m-10">
          <input
            className="w-6 h-6 rounded-xl flex-none"
            type="checkbox"
            required={true}
          />
          <span className="ml-4 font-sans text-xl font-semibold">
            I read the rules and I understand that submitting irrelevant matches
            can lead to a restriction
          </span>
        </div>

        {hasVerifierRole && (
          <div className="flex mx-10 mb-5">
            <input
              className="w-6 h-6 rounded-xl flex-none"
              type="checkbox"
              name="forceVerified"
              onChange={(e) => {
                setIsSubmissionVerified(e.target.checked);
              }}
            />
            <span className="ml-4 font-sans text-xl font-semibold">
              Admin force verified
            </span>
          </div>
        )}

        <button
          className="flex flex-row text-white bg-blue-500 rounded-xl font-sans p-2 w-11/12 m-auto h-16 text-2xl font-semibold justify-center items-center"
          type="submit"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

export default LinkSubmissionForm;
