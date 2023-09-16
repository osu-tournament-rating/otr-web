import { ICardProps } from "./ICardProps";

function SubmissionGuidelinesCard({ title, description }: ICardProps) {
    return (
        <div className="card bg-gray-100 text-dark-800 rounded-xl p-8 m-5">
            {title && <h1 className="card-title font-sans text-3xl md:text-6xl font-semibold pb-6">{title}</h1>}
            <p className="card-description font-sans text-2xl">{description}</p>
        </div>
    );
}

export default SubmissionGuidelinesCard;