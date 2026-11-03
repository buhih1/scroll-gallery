import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postComment } from "../../api/comments";
import { commentKeys } from "./queryKeys";
import { AuthExpiredError, useAuthFetch } from "../useAuthFetch";
import { showErrorToast } from "../../utils/toast/toast";
import { pinKeys } from "../pins/queryKeys";

export function useCreateComment(pinId) {
    const queryClient = useQueryClient();
    const authFetch = useAuthFetch();
    return useMutation({
        mutationFn: (body) => postComment(authFetch, pinId, body),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: commentKeys.all(pinId) });
            queryClient.invalidateQueries({ queryKey: pinKeys.detail(pinId), exact: true });
        },
        onError: (error) => {
            if (error instanceof AuthExpiredError) return;
            showErrorToast(error.message);
        }
    });
} 