import { IUserAvatarCardProps } from "./IUserAvatarCardProps";

function UserAvatarCard({ osuId }: IUserAvatarCardProps) {
  let userAvatarUrl = `https://a.ppy.sh/${osuId}`;
  return (
    <>
      <div className="card flex w-64 h-64 flex-grow flex-shrink-0 bg-gray-100 rounded-xl justify-center items-center">
        <img className="w-40 rounded-full" src={userAvatarUrl} alt="userAvatar" width={256} />
      </div>
    </>
  );
}

export default UserAvatarCard;
