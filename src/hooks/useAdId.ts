import { useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { AdIdContext } from "../contexts/AdIdContext";

export function useAdId() {
  const [searchParams] = useSearchParams();
  const contextAdId = useContext(AdIdContext);
  return searchParams.get("id") || contextAdId;
}
