import DateSelectorButton from "./DateSelectorButton";

export interface IDateSelectorProps {
    currentDays: number;
    setDays: (number: number) => void;
}

function DateSelector({ currentDays, setDays }: IDateSelectorProps) {
    return (
        <>
            <div className="flex flex-col sm:flex-row mx-auto sm:mx-10 space-x-5">
                <div className="flex space-x-5 my-2">
                    <DateSelectorButton currentDays={currentDays} days={30} setDays={setDays} label="30 days" />
                    <DateSelectorButton currentDays={currentDays} days={90} setDays={setDays} label="90 days" />
                    <DateSelectorButton currentDays={currentDays} days={180} setDays={setDays} label="6 months" />
                </div>
                <div className="flex space-x-5 my-2">
                    <DateSelectorButton currentDays={currentDays} days={365} setDays={setDays} label="1 year" />
                    <DateSelectorButton currentDays={currentDays} days={730} setDays={setDays} label="2 years" />
                    <DateSelectorButton currentDays={currentDays} days={182625} setDays={setDays} label="All time" />
                </div>
            </div>
        </>
    );
}

export default DateSelector;