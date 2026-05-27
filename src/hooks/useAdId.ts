import { useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { AdIdContext } from "../pages/AdPageLayout";

export function useAdId() {
  const [searchParams] = useSearchParams();
  const contextAdId = useContext(AdIdContext);
  return searchParams.get("id") || contextAdId;
}
