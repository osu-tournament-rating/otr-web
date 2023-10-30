import { useState } from "react";
import LinkSubmissionForm from "../LinkSubmissionForm";
import NavBar from "../NavBar";
import SubmissionGuidelinesCard from "../cards/SubmissionGuidelinesCard";
import VerifiedTournaments from "../VerifiedTournaments";
import Footer from "../Footer";

function Submit() {
  const [hasVerifierRole, setHasVerifierRole] = useState(false);

  return (
    <>
      <div className="lg:flex">
        <div className="flex-row w-full lg:w-3/5">
          <SubmissionGuidelinesCard
            title="Submission F.A.Q"
            description="Please read the following FAQ before submitting. Our goal is to include matches that do not stray too far from the competitive norm."
          />
          <SubmissionGuidelinesCard
            title="What can I submit?"
            description="Only submit matches from tournaments not already in our system. The tournament must be fully completed before its matches can be submitted. If you think a match is missing from a tournament already in the system, please contact us."
          />
          <SubmissionGuidelinesCard
            title="Is my tournament too gimmicky to be included?"
            description="Tag, relax, and battle-royale styled matches will not be included. Submit bracket-stage and group-stage matches only. Tournaments that do not allow players to play at their full competitive strength or stray too far from the competitive norm will not be included. Please contact us if you are unsure."
          />
          <SubmissionGuidelinesCard
            title="How are tournaments with multiple tiers / divisions handled?"
            description="Tournaments with multiple tiers across one bracket can be submitted. Multiple divisions should be submitted as separate tournaments if they are not played in the same bracket. In general, one bracket equals one tournament."
          />
          <SubmissionGuidelinesCard
            title="What about qualifiers?"
            description="Never submit qualifiers or tryouts."
          />
          <SubmissionGuidelinesCard
            title="Can I submit from any time period?"
            description="Tournaments from any time period can be submitted. However, please ensure what you are submitting is of quality."
          />
          <SubmissionGuidelinesCard
            title="The tournament I want to submit is missing matches. What do I do?"
            description="If the tournament has not yet concluded, do not submit it yet. If the tournament's history is not properly recorded or maintained, that's okay - submit all that is publicly available. If you're not sure, please contact us."
          />
        </div>
        <div className="flex-row w-full lg:w-2/5">
          <LinkSubmissionForm hasVerifierRole={hasVerifierRole} setHasVerifierRole={setHasVerifierRole} />
        </div>
      </div>
      <div>
        <VerifiedTournaments hasVerifierRole={hasVerifierRole} />
      </div>

      <Footer />
    </>
  );
}

export default Submit;
