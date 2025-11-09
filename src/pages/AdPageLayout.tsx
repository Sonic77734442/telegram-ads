import { Outlet, useParams } from "react-router-dom";
import TabBar from "../components/TabBar";
import { createContext } from "react";
import Header from "../components/Header";
import Container from "../components/Container";


// 👉 Контекст для передачи adId
export const AdIdContext = createContext<string | null>(null);

export default function AdPageLayout() {
  const { adId } = useParams<{ adId: string }>();

  if (!adId) return <div className="p-4">No ad ID provided</div>;

  return (
    <AdIdContext.Provider value={adId}>
      <Header />
      <Container>
        <TabBar adId={adId} />
        <div className="mt-4">
          <Outlet />
        </div>
      </Container>
    </AdIdContext.Provider>
  );
}
