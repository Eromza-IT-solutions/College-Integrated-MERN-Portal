import { useCallback, useEffect, useState } from "react";
import { getDashboardData } from "../services/examAdminService";
import { describeApiError } from "../utils/describeApiError";

const LOADING = { status: "loading", source: null, data: null, error: null };

// Loads the dashboard and reports one of three states:
//   "loading" | "success" | "error"
// `error` is the object returned by describeApiError().
export default function useExamAdminDashboard() {
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false; // stops a late response updating an unmounted page

    async function load() {
      setState(LOADING);
      try {
        const result = await getDashboardData();
        if (!ignore) {
          setState({
            status: "success",
            source: result.source,
            data: result.data,
            error: null,
          });
        }
      } catch (error) {
        if (!ignore) {
          setState({
            status: "error",
            source: null,
            data: null,
            error: describeApiError(error),
          });
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, reload };
}
