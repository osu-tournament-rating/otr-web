import { IUserAvatarCardProps } from "./IUserAvatarCardProps";

function UserAvatarCard({ osuId }: IUserAvatarCardProps) {
  let userAvatarUrl = `https://a.ppy.sh/${osuId}`;
  return (
    <>
      <div className="card flex w-48 h-48 m-2 bg-gray-100 rounded-xl justify-center items-center">
        <img className="w-40 rounded-full" src={userAvatarUrl} alt="userAvatar" width={230} />
      </div>
    </>
  );
}

export default UserAvatarCard;
