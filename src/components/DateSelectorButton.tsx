export interface IDateSelectorButtonProps {
    currentDays: number;
    days: number;
    setDays: (number: number) => void;
    label: string;
}

function DateSelectorButton({currentDays, days, setDays, label}: IDateSelectorButtonProps) {
    return (
        <>
            <div className={`flex flex-row ${currentDays !== days ? 'bg-gray-100' : 'bg-blue-400'} rounded-xl`}>
                <button onClick={(() => setDays(days))} className={`p-4 md:p-5 font-medium text-lg md:text-2xl ${currentDays !== days ? 'text-black' : 'text-white'} font-sans`}>{label}</button>
            </div>
        </>
    );
}

export default DateSelectorButton;