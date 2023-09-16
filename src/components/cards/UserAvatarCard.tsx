import { IUserAvatarCardProps } from "./IUserAvatarCardProps";

function UserAvatarCard({ osuId }: IUserAvatarCardProps) {
  let userAvatarUrl = `https://a.ppy.sh/${osuId}`;
  return (
    <>
      <div className="card max-w-2xl md:w-1/4 py-5 md:py-0 flex flex-grow flex-shrink-0 bg-gray-100 rounded-xl justify-center items-center">
        <img className="w-40 rounded-full" src={userAvatarUrl} alt="userAvatar" width={256} />
      </div>
    </>
  );
}

export default UserAvatarCard;
