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
        <div className="md:flex items-center my-6 space-x-4">
            <div className="flex-shrink-0 flex-none w-10/12 md:w-1/2 ml-6 relative max-w-md min-w-sm bg-gray-200 rounded-full dark:bg-gray-700 h-4">
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
            <div className="block mt-2 md:mt-0 w-full">
                <div className="flex items-center space-x-2 ml-2">
                    <p className="text-2xl font-semibold">
                        {formatNumberWithCommas(total - current)} TR
                    </p>
                    <p className="text-2xl">left until</p>
                    <p className="text-2xl font-semibold">{nextRankingClass}</p>
                </div>
            </div>
        </div>
    );
};

export default UserRatingProgressBar;
