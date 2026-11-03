import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteComment } from "../../api/comments";
import { commentKeys } from "./queryKeys";
import { AuthExpiredError, useAuthFetch } from "../useAuthFetch";
import { pinKeys } from "../pins/queryKeys";

export function useDeleteComment(pinId) {
    const queryClient = useQueryClient();
    const authFetch = useAuthFetch();
    return useMutation({
        mutationFn: (commentId) => deleteComment(authFetch, pinId, commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: commentKeys.all(pinId) });
            queryClient.invalidateQueries({ queryKey: pinKeys.detail(pinId), exact: true });
        },
        onError: (error) => {
            if (error instanceof AuthExpiredError) return;
            // showErrorToast(error.message);
        }
    });
}