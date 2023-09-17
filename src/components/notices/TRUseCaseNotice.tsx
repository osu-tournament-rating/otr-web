function TRUseCaseNotice() {
    return (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-gray-700 p-4 mx-5 md:mx-10 my-3 rounded-xl" role="alert">
            <p className="font-bold">About your TR</p>
            <p className="w-1/2">Your TR (tournament rating) is calculated based on your match cost relative to other players in your matches, see <a href="#"><strong>here</strong></a> for a more detailed explanation. If you notice that someone's rating is significantly higher than others of similar skill level, that means they are consistently outperforming in tournaments and should participate against higher-rated opponents in more challenging settings in order to have a more accurate rating.</p>
        </div>
    )
}

export default TRUseCaseNotice;