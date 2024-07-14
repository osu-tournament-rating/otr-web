"use client";
import moonSVG from "@/public/icons/moon.svg";
import sunSVG from "@/public/icons/sun.svg";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useHotkeys } from "react-hotkeys-hook";
import styles from "./ThemeSwitcher.module.css";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  useHotkeys("ctrl+l", (e) => {
    e.preventDefault();
    setTheme(theme === "light" ? "dark" : "light");
  });

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      <div className={styles.themeSwitcher}>
        {theme === "light" && <Image src={sunSVG} alt="Theme Switcher" fill />}
        {theme === "dark" && <Image src={moonSVG} alt="Theme Switcher" fill />}
        {!theme && <></>}
      </div>
    </button>
  );
}
