// src/pages/AdPageWrapper.tsx
import { Outlet, useParams } from "react-router-dom";
import TabBar from "../components/TabBar";

export default function AdPageWrapper() {
  const { adId } = useParams();

  return (
    <div className="p-4">
      <TabBar adId={adId!} />
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}
