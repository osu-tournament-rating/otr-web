function NoDataNotice() {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-10 my-3 rounded-xl" role="alert">
            <p className="font-bold">You have no data!</p>
            <p>If you've never played osu! tournaments before, welcome! You can start earning TR simply by playing in osu! tournament matches.</p>
        </div>
    )
}

export default NoDataNotice;