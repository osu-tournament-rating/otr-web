function NavBar() {
  return (
    <div className="bg-gray-100 rounded-xl p-4 m-20 flex items-center justify-between">
    <a href="/">
        <img className="w-8 flex" src="logos/small.svg" alt="Company Logo" />
    </a>
    
    <div className="flex space-x-8">
        <a href="/Dashboard" className="mx-4 text-dark text-xl font-medium font-sans hover:text-gray-600">Dashboard</a>
        <a href="/Leaderboards" className="mx-4 text-dark text-xl font-medium font-sans hover:text-gray-600">Leaderboards</a>
        <a href="/Submit" className="mx-4 text-dark text-xl font-medium font-sans hover:text-gray-600 hover:drop-shadow-sm">Submit matches</a>
    </div>

    <a href="/Donate" className="mx-4 text-dark text-xl font-medium font-sans hover:text-gray-600 hover:drop-shadow-sm">Donate</a>

    <div className="flex space-x-4">
        {/* <button className="text-gray-600 hover:text-gray-800">
            🌙
        </button>
        <button className="text-gray-600 hover:text-gray-800">
            👤
        </button> */}
    </div>
</div>

  );
}

export default NavBar;
