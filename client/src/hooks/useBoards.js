import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { boardKeys, deleteBoard, getBoard, getBoardPins, patchBoard } from "../api/boards"
import { useAuthFetch } from "./useAuthFetch";

export const useBoard = (boardId) =>
    useQuery({
        queryKey: boardKeys.detail(boardId),
        queryFn: () => getBoard(boardId),
        enabled: !!boardId,
    });

export const useBoardPins = (boardId) =>
    useInfiniteQuery({
        queryKey: boardKeys.pins(boardId),
        queryFn: ({ pageParam }) => getBoardPins(boardId, pageParam),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!boardId,
    });

export const usePatchBoard = (userId) => {
    const queryClient = useQueryClient();
    const authFetch = useAuthFetch();

    return useMutation({
        mutationFn: ({ boardId, updatedBoardData }) => patchBoard(authFetch, boardId, updatedBoardData),
        onSuccess: (data, { boardId }) => {
            queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId), exact: true });
            queryClient.invalidateQueries({ queryKey: boardKeys.list(userId) });
        },
    });
};

// 아직 못씀. 쿼리키 설정 후 써야됨
export const useDeleteBoard = (userId) => {
    const queryClient = useQueryClient();
    const authFetch = useAuthFetch();

    return useMutation({
        mutationFn: (boardId) => deleteBoard(authFetch, boardId),
        onSuccess: (data, boardId) => {
            queryClient.removeQueries({ queryKey: boardKeys.detail(boardId) });
            queryClient.invalidateQueries({ queryKey: boardKeys.list(userId) });
            // ['users', auth.user.username, 'pins'] 무효화
        },
    });
};