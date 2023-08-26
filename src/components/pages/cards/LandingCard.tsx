import { ILandingCardProps } from "./ILandingCardProps";

function LandingCard({ title, description }: ILandingCardProps) {
    return (
        <div className="card bg-gray-100 text-dark-800 rounded-xl p-8 m-10" >
            <h1 className="card-title font-sans text-6xl font-medium">{title}</h1>
            <p className="card-description font-sans text-2xl pt-4">{description}</p>
        </div>
    );
}

export default LandingCard;