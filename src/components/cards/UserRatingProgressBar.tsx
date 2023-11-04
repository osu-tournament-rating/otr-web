import React, { FC, useMemo } from 'react';

type UserRatingProgressBarProps = {
    current: number;
    total: number;
    nextRankingClass: string;
};

const formatNumberWithCommas = (x: number): string => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const UserRatingProgressBar: FC<UserRatingProgressBarProps> = ({ current, total, nextRankingClass }) => {
    const percentage = useMemo(() => (current / total) * 100, [current, total]);

    return (
        <div className="flex flex-col m-6">
            <div className="flex flex-col mb-3">
                <p className="text-2xl font-semibold">
                    {formatNumberWithCommas(total - current)} TR left until {nextRankingClass}
                </p>
            </div>
            <div className="flex-shrink-0 flex-none">
                <div className="relative w-1/2 max-w-md min-w-sm bg-gray-200 rounded-full dark:bg-gray-700 h-4">
                    <div
                        className="bg-blue-300 h-full leading-none rounded-full"
                        style={{ width: `${percentage}%` }}
                    />
                    {[...Array(11)].map((_, index) => (
                        <div
                            key={index}
                            className="absolute top-0 bottom-0 bg-gray-100"
                            style={{ width: "1.1px", left: `calc(${(100 / 11.5) * (index + 1)}% - ${1.5 * (index + 1)}px)` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserRatingProgressBar;
