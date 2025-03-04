"use client";

import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";
import LoginButton from "../buttons/LoginButton";
import Image from "next/image";
import { ModeToggle } from "../ui/mode-toggle";
import NavLink from "./NavLink";
import SearchDialog from "../search/SearchDialog";

export default function Nav() {
    return (
        <NavigationMenu className="bg-secondary p-3">
            <div className="w-full">
                <NavigationMenuList className="gap-5 mx-3">
                    <NavigationMenuItem>
                        <Image src={"./logos/small.svg"} alt="o!TR Logo" width={36} height={36} />
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavLink href="/leaderboard" name="Leaderboard" />
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavLink href="/tournaments" name="Tournaments" />
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <SearchDialog />
                    </NavigationMenuItem>
                    <span className="flex-1" />
                    <NavigationMenuItem>
                        <ModeToggle/>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuLink href="https://docs.otr.stagec.xyz" target="_blank">
                            Docs
                        </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <LoginButton />
                    </NavigationMenuItem>
                </NavigationMenuList>
            </div>
        </NavigationMenu>
    )
}