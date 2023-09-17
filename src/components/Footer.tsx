function Footer() {
  return (
    <div className="flex bg-gray-100 rounded-xl p-4 m-10">
      <div className="flex justify-start w-1/2">
        <p className="text-gray-700">&copy; 2023 StageCodes</p>
      </div>
      <div className="flex justify-end w-1/2 md:w-full space-x-5">
        <p className="text-gray-700">Staff</p>
        <p className="text-gray-700">Privacy</p>
        <p className="text-gray-700">Contact</p>
      </div>
    </div>
  );
}

export default Footer;
