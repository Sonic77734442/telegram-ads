import { Outlet, useParams } from "react-router-dom";
import TabBar from "../components/TabBar";
import Header from "../components/Header";
import Container from "../components/Container";
import { AdIdContext } from "../contexts/AdIdContext";

export default function AdPageLayout() {
  const { adId } = useParams<{ adId: string }>();

  if (!adId) return <div className="p-4">No ad ID provided</div>;

  return (
    <AdIdContext.Provider value={adId}>
      <Header />
      <Container>
        <TabBar adId={adId} activeTab="edit" />
        <div className="mt-4">
          <Outlet />
        </div>
      </Container>
    </AdIdContext.Provider>
  );
}
