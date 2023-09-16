function TRUseCaseNotice() {
    return (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-gray-700 p-4 mx-10 my-3 rounded-xl" role="alert">
            <p className="font-bold">About your TR</p>
            <p>Your TR (tournament rating) is calculated based on your <i>match cost</i> relative to other players in your matches;</p>
            <p>See <a href="#"><strong>here</strong></a> for a more detailed explanation. If you notice that someone's</p>
            <p>rating is higher than others of similar skill level, that may mean they are consistently</p>
            <p>outperforming in the tournaments they choose to participate in and should consider playing against higher-rated opponents!</p>
        </div>
    )
}

export default TRUseCaseNotice;