import { useState } from "react";
import LinkSubmissionForm from "../LinkSubmissionForm";
import NavBar from "../NavBar";
import SubmissionGuidelinesCard from "../cards/SubmissionGuidelinesCard";
import VerifiedTournaments from "../VerifiedTournaments";
import Footer from "../Footer";

function Submit() {
  const [hasAdminRole, setHasAdminRole] = useState(false);

  return (
    <>
      <div className="lg:flex">
        <div className="flex-row w-full lg:w-3/5">
          <SubmissionGuidelinesCard
            title="Guidelines"
            description="Please follow the posted guidelines before submitting your matches. Keep in mind that posting matches that don't follow the rules may lead to a restriction."
          />
          <SubmissionGuidelinesCard
            title=""
            description="Our goal is to accept matches that do not stray too far away from the 'traditional' tournament format (head-to-head & team vs). Group stages of well-run tournaments are allowed."
          />
          <SubmissionGuidelinesCard
            title=""
            description="Extreme gimmicks such as tag, relax, and battle-royale styled matches will not be included. Bracket-stage and group-stage matches only."
          />
          <SubmissionGuidelinesCard
            title=""
            description="Qualifiers and warmups will not be included."
          />
          <SubmissionGuidelinesCard
            title=""
            description="The o!TR team reserves the right to make final judgements on whether a tournament or match should be deemed as fair and competitive play."
          />
        </div>
        <div className="flex-row w-full lg:w-2/5">
          <LinkSubmissionForm hasAdminRole={hasAdminRole} setHasAdminRole={setHasAdminRole} />
        </div>
      </div>
      <div>
        <VerifiedTournaments hasAdminRole={hasAdminRole} />
      </div>

      <Footer />
    </>
  );
}

export default Submit;
