import { ILandingCardProps } from "./ILandingCardProps";

function LandingCardLogin({ title, description }: ILandingCardProps) {
    return (
        <div className="card bg-gray-100 text-dark-800 rounded-xl p-8 m-10" >
            <h1 className="card-title font-sans text-6xl font-medium">{title}</h1>
            <p className="card-description font-sans text-3xl pt-4">{description}</p>
            <button className="btn btn-primary px-32 py-6 mt-10 bg-blue-500 rounded-xl text-3xl text-white font-semibold">Login</button>
        </div>
    );
}

export default LandingCardLogin;