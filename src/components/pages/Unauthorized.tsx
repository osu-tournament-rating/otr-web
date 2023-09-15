import NavBar from "../NavBar";
import LandingCardLogin from "./cards/LandingCardLogin";

function Unauthorized() {
    return(
        <>
            <NavBar />
            <div>
                <LandingCardLogin title="Unauthorized" description="Looks like you need to login first!" />
            </div>
        </>
    )
}

export default Unauthorized;