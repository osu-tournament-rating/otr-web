import DateSelectorButton from "./DateSelectorButton";

export interface IDateSelectorProps {
    currentDays: number;
    setDays: (number: number) => void;
}

function DateSelector({ currentDays, setDays }: IDateSelectorProps) {
    return (
        <>
            <div className="flex flex-row mx-10 space-x-5">
                <DateSelectorButton currentDays={currentDays} days={30} setDays={setDays} label="30 days" />
                <DateSelectorButton currentDays={currentDays} days={90} setDays={setDays} label="90 days" />
                <DateSelectorButton currentDays={currentDays} days={180} setDays={setDays} label="6 months" />
                <DateSelectorButton currentDays={currentDays} days={365} setDays={setDays} label="1 year" />
                <DateSelectorButton currentDays={currentDays} days={730} setDays={setDays} label="2 years" />
                <DateSelectorButton currentDays={currentDays} days={-1} setDays={setDays} label="All time" />
            </div>
        </>
    );
}

export default DateSelector;