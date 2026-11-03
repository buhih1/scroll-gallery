import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuthFetch } from "./useAuthFetch";
import { getMyPins, getPins, searchKeys } from "../api/search";

export const useSearchPins = (keyword, enabled = true) =>
    useInfiniteQuery({
        queryKey: searchKeys.pins(keyword),
        queryFn: ({ pageParam }) => getPins(keyword, pageParam),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!keyword && enabled,
    });

export const useSearchMyPins = (keyword, enabled = true) => {
    const authFetch = useAuthFetch();
    return useInfiniteQuery({
        queryKey: searchKeys.myPins(keyword),
        queryFn: ({ pageParam }) => getMyPins(keyword, authFetch, pageParam),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!keyword && enabled,
    });
};