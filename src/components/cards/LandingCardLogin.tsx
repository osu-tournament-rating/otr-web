import { ICardProps } from "./ICardProps";

const OSU_OAUTH_URL = `https://osu.ppy.sh/oauth/authorize?client_id=${process.env.REACT_APP_OSU_CLIENT_ID}&redirect_uri=http://localhost:3000/auth&response_type=code&scope=public`

function LandingCardLogin({ title, description }: ICardProps) {
    return (
        <div className="card bg-gray-100 text-dark-800 rounded-xl p-8 m-5 md:m-10" >
            <h1 className="card-title font-sans text-3xl md:text-6xl font-medium">{title}</h1>
            <p className="card-description font-sans text-xl md:text-3xl pt-4">{description}</p>
            <a href={OSU_OAUTH_URL}>
                <button className="btn btn-primary px-16 md:px-32 py-6 mt-10 bg-blue-500 rounded-xl text-3xl text-white font-semibold">Login</button>
            </a>
        </div>
    );
}

export default LandingCardLogin;