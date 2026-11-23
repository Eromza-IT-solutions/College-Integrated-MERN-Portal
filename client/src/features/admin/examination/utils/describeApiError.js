// Turns an error from services/http.js into a message the UI can show.
// http.js rejects with Error(message, { cause: originalAxiosError }).

export function describeApiError(error) {
  const cause = error?.cause;
  const status = cause?.response?.status;

  if (status === 401 || status === 403) {
    return {
      kind: "unauthorized",
      title: "Access denied",
      description:
        "Your account is not authorised to view this information. Sign in again or contact an administrator.",
      canRetry: false,
    };
  }

  const isNetworkFailure =
    Boolean(cause) &&
    !cause.response &&
    (Boolean(cause.request) || cause.code === "ERR_NETWORK");

  if (isNetworkFailure) {
    return {
      kind: "network",
      title: "Cannot reach the server",
      description:
        "Check your internet connection and try again. If the problem continues, contact the system administrator.",
      canRetry: true,
    };
  }

  return {
    kind: "error",
    title: "Could not load data",
    description: error?.message || "Something went wrong. Please try again.",
    canRetry: true,
  };
}
