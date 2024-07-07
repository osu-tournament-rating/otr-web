"use client";

import { useUser } from "@/util/hooks";
import Image from "next/image";
import moonSVG from "@/public/icons/moon.svg";
import styles from "../NavBar.module.css";
import Tooltip from "./../Tooltip/Tooltip";

const tooltipContent = (
  <>
    <div>
      <span>Friends</span>
    </div>
    <div>
      <span>Sign out</span>
    </div>
    <div className={styles.iconContainer}>
      <Image
        src={moonSVG}
        alt="Moon Icon"
        width={20}
        height={20}
      />
    </div>
  </>
);

export default function UserLogged() {
  const user = useUser();

  if (user?.osuId)
    return (
      <Tooltip content={tooltipContent}>
        <div className={styles.userPropic}>
          <Image
            src={`http://s.ppy.sh/a/${user?.osuId}`}
            alt="User Propic"
            fill
          />
        </div>
      </Tooltip>
    );
}
