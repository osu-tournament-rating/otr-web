import Footer from "../Footer";
import NavBar from "../NavBar";
import LandingCard from "../cards/LandingCard";
import LandingCardLogin from "../cards/LandingCardLogin";
import LandingCardLogo from "../cards/LandingCardLogo";

function Landing() {
  return (
    <>
      <NavBar />
      <div>
        <div className="md:flex">
          <LandingCardLogin
            title="This is o!TR"
            description="A suite of tools designed to make osu! tournaments better for everyone"
          />
          <LandingCardLogo />
        </div>
        <div>
          <div className="flex-none">
            <LandingCard
              title="Tournament Rating"
              description="A rating system that aims to predict your tournament performance relative to others"
            />
          </div>
        </div>
        <div>
          <div className="flex-none">
            <LandingCard
              title="Rank restricted tournaments"
              description="o!TR combined with BWS opens the door to an all-new level of fair competition in tournaments targeting specific skill brackets"
            />
          </div>
        </div>
        <div>
          <div className="flex-none">
            <LandingCard
              title="Verified Tournaments"
              description="We only include human-verified tournament data in our rating algorithm"
            />
          </div>
        </div>
        <div>
          <div className="flex-none">
            <LandingCard
              title="Stat nerd's heaven"
              description="We provide a huge assortment of tools for players and teams. Dive into all of your previous matches, compare your team to another, see how you are performing over time, and so much more."
            />
          </div>
        </div>
        <div>
          <div className="flex-none">
            <LandingCard
              title="All game modes supported"
              description="osu! doesn't just mean standard!"
            />
          </div>
        </div>
        <div>
          <div className="flex-none">
            <LandingCard
              title="100% Open Source"
              description="We are committed to remaining open source and highly transparent with our algorithm"
            />
          </div>
        </div>
        <div>
          <div className="flex-none">
            <LandingCard
              title="Four 9's"
              description="Our goal is to provide a service for all of osu!, so we want to remain as reliable as possible. Outside of planned maintenance, we aim to have a reliability of 99.9999%. That's 31 seconds of unexpected downtime per year."
            />
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

export default Landing;
