"use client"

import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
import { SearchIcon } from "lucide-react";
import { Input } from "../ui/input";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useState, useEffect, SetStateAction, Dispatch } from "react";
import { SearchResponseCollectionDTO } from "@osu-tournament-rating/otr-api-client";
import { search } from "@/lib/api";

export default function SearchDialog() {
    const [searchText, setSearchText] = useState("");
    const [isFetching, setIsFetching] = useState(false);
    const [data, setData] = useState<SearchResponseCollectionDTO>();
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

    const fetchData = async () => {
        // Dummy function to simulate API call
        setIsFetching(true);

        try {
            const result = (await search.search({
                searchKey: searchText
            })).result;

            console.log(result);

            setData(result);
        } catch {
            console.error('Error during search');
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        if (searchText) {
            const timeout = setTimeout(() => {
                fetchData();
            }, 800);
            setTypingTimeout(timeout);
        }
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [searchText]);

    return (
        <Dialog>
            <DialogTrigger className="flex cursor-pointer">
                <SearchIcon width={20} />
            </DialogTrigger>
            <DialogTitle /> { /* Required for screen reader support */}
            <DialogContent>
                <div className="flex flex-row gap-3">
                    <SearchIcon className="mt-1" />
                    <Input
                        className="mr-4"
                        placeholder="Search"
                        autoFocus
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}