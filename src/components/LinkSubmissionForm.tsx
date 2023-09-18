import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface ILinkSubmissionFormProps {
  hasAdminRole: boolean;
  setHasAdminRole: (hasAdminRole: boolean) => void;
}

function LinkSubmissionForm({
  hasAdminRole,
  setHasAdminRole,
}: ILinkSubmissionFormProps) {
  const [isSubmissionVerified, setIsSubmissionVerified] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linksCounted, setLinksCounted] = useState(0);
  const [userId, setUserId] = useState(0);

  const [tournamentName, setTournamentName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [forumPost, setForumPost] = useState("");

  const apiLink = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    fetch(apiLink + "/me", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        const user = data["user"];
        const roles = user["roles"];
        setHasAdminRole(roles.includes("Admin"));
        setUserId(user["id"]);
      })
      .catch((error) => {
        console.error(
          "Error fetching player data, auth key likely expired:",
          error
        );
        return navigate("/unauthorized", { replace: true });
      });
  }, []);

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
    console.log(submission, isSubmissionVerified);
    setLinkText("");
    setLinksCounted(0);
    setTournamentName("");
    setAbbreviation("");
    setForumPost("");

    fetch(apiLink + "/osumatches/batch?verified=" + isSubmissionVerified, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        ids: submission,
        tournamentName: tournamentName,
        abbreviation: abbreviation,
        forumPost: forumPost,
        submitterId: userId,
      }),
    })
      .then((response) => {
        console.log(response);
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
            className="w-6 h-6 rounded-xl"
            type="checkbox"
            required={true}
          />
          <span className="ml-4 font-sans text-xl font-semibold">
            I read the rules and I understand that submitting irrelevant matches
            can lead to a restriction
          </span>
        </div>

        {hasAdminRole && (
          <div className="flex mx-10 mb-5">
            <input
              className="w-6 h-6 rounded-xl"
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
