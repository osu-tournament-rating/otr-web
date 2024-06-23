"use client";

import { getOsuModeCookie } from "@/app/actions";
import logo from "@/public/logos/small.svg";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import HamburgerMobile from "./HamburgerMobile/HamburgerMobile";
import ModeSwitcher from "./ModeSwitcher/ModeSwitcher";
import styles from "./NavBar.module.css";
import Routes from "./Routes/Routes";
import SearchButton from "./SearchButton/SearchButton";
import ThemeSwitcher from "./ThemeSwitcher/ThemeSwitcher";
import UserLogged from "./UserLogged/UserLogged";
import moonSVG from "@/public/icons/moon.svg";
import Tooltip from "./Tooltip/Tooltip";
export default function NavBar() {
  const [cookieMode, setCookieMode] = useState({});

  useEffect(() => {
    const cookie = Promise.resolve(getOsuModeCookie());
    cookie.then((value) => {
      setCookieMode(value);
    });
  }, []);

  const tooltipContent = (
    <div>
      <div>Friends</div>
      <div>Sign out</div>
      <div className={styles.iconContainer}>
        <img
          src={moonSVG}
          alt="Moon Icon"
        />
      </div>
    </div>
  );

  return (
    <nav className={styles.navbar}>
      <Link
        href={"/"}
        className={styles.logoLink}
      >
        <Image
          src={logo}
          alt="o!TR"
          fill
        />
      </Link>
      <div className={styles.content}>
        <Routes />
        {/* <Link href={'/donate'}>Donate</Link> */}
        <div className={styles.actions}>
          <SearchButton />
          {cookieMode?.value && <ModeSwitcher mode={cookieMode?.value} />}
          <ThemeSwitcher />
          {/* TODO: refactor to be local to UserLogged */}
          <Tooltip content={tooltipContent}>
            <UserLogged />
          </Tooltip>
        </div>
      </div>
      {/* Hamburger Menu Icon for mobile */}
      <HamburgerMobile />
    </nav>
  );
}
