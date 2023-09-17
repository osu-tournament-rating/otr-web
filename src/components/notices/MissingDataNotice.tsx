function MissingDataNotice() {
    return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mx-5 md:mx-10 my-3 rounded-xl" role="alert">
            <p className="font-bold">Heads up!</p>
            <p>Missing tournament data? Don't worry! We are aggressively adding tournament data, so check back later.</p>
            <p>Help us populate your data first by submitting your matches <a href="/submit"><strong>here!</strong></a></p>
        </div>
    )
}

export default MissingDataNotice;