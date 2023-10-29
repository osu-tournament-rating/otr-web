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
  const [teamSize, setTeamSize] = useState<number | null>(null);
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
    setTeamSize(null);
    setRankRangeLowerBound(null);
    setGameMode(0);

    const origin = process.env.REACT_APP_ORIGIN_URL;

    fetch(apiLink + "/osumatches/batch?verified=" + isSubmissionVerified, {
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
      <div className="flex flex-col bg-gray-100 my-5 mx-10 md:ml-5 rounded-xl font-sans pb-10">
        <div className="flex flex-row bg-gray-100 rounded-xl font-sans m-5">
          <p className="text-4xl font-semibold font-sans">Tournament</p>
        </div>
        <div>
          <p className="font-sans text-gray-400 m-5 text-xl">
            We're currently prioritizing badged tournaments, but you can submit
            an unbadged tournament as well as long as it follows the rules.
          </p>
        </div>

        <div className="space-y-5">
          <select
            required={true}
            value={gameMode}
            onChange={(e) => setGameMode(Number(e.target.value))}
            className="flex flex-row border-2 border-gray-400 bg-gray-100 text-xl font-medium rounded-xl font-sans p-2 justify-center justify-items-center w-11/12 h-16 m-auto"
          >
            <option value={0}>osu!Standard</option>
            <option value={1}>osu!Taiko</option>
            <option value={2}>osu!Catch</option>
            <option value={3}>osu!Mania</option>
          </select>

          <input
            required={true}
            type="text"
            name="tournamentName"
            onChange={(e) => {
              setTournamentName(e.target.value);
            }}
            value={tournamentName}
            className="flex flex-row border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-xl font-sans p-2 justify-center justify-items-center w-11/12 h-16 m-auto"
            placeholder="Tournament name"
          />
          <input
            required={true}
            type="text"
            name="abbreviation"
            onChange={(e) => {
              setAbbreviation(e.target.value);
            }}
            value={abbreviation}
            className="flex flex-row border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-xl font-sans p-2 justify-center justify-items-center w-11/12 h-16 m-auto"
            placeholder="Tournament abbreviation"
          />
          <input
            required={true}
            type="text"
            name="forumPost"
            onChange={(e) => {
              setForumPost(e.target.value);
            }}
            value={forumPost}
            className="flex flex-row border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-xl font-sans p-2 justify-center justify-items-center w-11/12 h-16 m-auto"
            placeholder="Tournament's osu! forum post"
          />
          <div className="relative flex items-center border-2 border-gray-400 rounded-xl w-11/12 m-auto h-16">
            <input
              required={true}
              min={1}
              max={8}
              type="number"
              name="teamSize"
              value={teamSize || ""}
              onChange={(e) => {
                setTeamSize(parseInt(e.target.value));
              }}
              className="flex-grow bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-md p-2 mr-5"
              placeholder="Team size (1-8)"
            />
            <div className="relative">
              <img
                src="icons/info.svg"
                alt="info icon"
                className="w-6 h-6 mr-5"
                onMouseEnter={() => setTeamSizeTooltipVisible(true)}
                onMouseLeave={() => setTeamSizeTooltipVisible(false)}
              />

              <div
                className={`absolute top-0 right-full transform -translate-x-2 p-2 bg-white border rounded-md shadow-md ${
                  isTeamSizeTooltipVisible
                    ? "opacity-100 visibility-visible"
                    : "opacity-0 visibility-hidden"
                } transition-opacity duration-250 ease-in-out tooltip`}
              >
                <div className="relative">
                  <div className="absolute top-1/2 left-0 transform -translate-x-100% -translate-y-1/2 w-0 h-0 border-r-5 border-transparent border-l-5 border-white"></div>
                  <p className="w-48">
                    The amount of players allowed in the lobby at the same time,
                    per team.&nbsp;
                    <strong>1v1 tournaments</strong> should be submitted as{" "}
                    <strong>1</strong>.&nbsp;
                    <strong>2v2, 3v3, etc. tournaments</strong> should be
                    submitted as <strong>2, 3, etc.</strong>&nbsp; This is NOT
                    the amount of players allowed per team, but the amount of
                    players playing in the lobby at the same time.&nbsp;
                    <strong>Do not submit</strong> tournaments with variable
                    team sizing (e.g. 2v4).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center border-2 border-gray-400 rounded-xl w-11/12 m-auto h-16">
            <input
              required={true}
              min={1}
              type="number"
              name="rankRangeLowerBound"
              onChange={(e) => setRankRangeLowerBound(parseInt(e.target.value))}
              className="flex-grow bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-md p-2 mr-5"
              placeholder="Rank Range Bound (1+)"
              value={rankRangeLowerBound || ""}
            />
            <div className="relative">
              <img
                src="icons/info.svg"
                alt="info icon"
                className="w-6 h-6 mr-5"
                onMouseEnter={() => setIsRankRangeTooltipVisible(true)}
                onMouseLeave={() => setIsRankRangeTooltipVisible(false)}
              />

              <div
                className={`absolute top-0 right-full transform -translate-x-2 p-2 bg-white border rounded-md shadow-md ${
                  isRankRangeTooltipVisible
                    ? "opacity-100 visibility-visible"
                    : "opacity-0 visibility-hidden"
                } transition-opacity duration-250 ease-in-out tooltip`}
              >
                <div className="relative">
                  <div className="absolute top-1/2 left-0 transform -translate-x-100% -translate-y-1/2 w-0 h-0 border-r-5 border-transparent border-l-5 border-white"></div>
                  <p className="w-48">
                    This is the best rank allowed to participate.{" "}
                    <strong>1 is open rank.</strong> For example, a tournament
                    with a rank range of <strong>&nbsp;#750-5000</strong> needs
                    to have <strong>750</strong> in this field. Tiered
                    tournaments should have the highest rank range in this
                    field.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-row bg-gray-100 rounded-xl font-sans m-5">
          <p className="text-4xl font-semibold font-sans">Match links</p>
        </div>
        <textarea
          name="links"
          onChange={(e) => {
            setLinkText(e.target.value);
            setLinksCounted(e.target.value.split("\n").length);
          }}
          value={linkText}
          style={{ resize: "none" }}
          className="flex flex-row border-2 border-gray-400 bg-gray-100 placeholder:text-xl placeholder:font-medium rounded-xl font-sans p-2 justify-center justify-items-center w-11/12 m-auto h-36 max-h-48"
          placeholder="1 or more separated match links"
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
