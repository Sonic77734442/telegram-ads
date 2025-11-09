import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function AdTable() {
  const [ads, setAds] = useState<any[]>([]);
  const [markupPercent, setMarkupPercent] = useState(0);
  
  useEffect(() => {
  const fetchMarkup = async () => {
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("user_id");

    if (role === "client" && userId) {
      const { data, error } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", userId)
        .maybeSingle();

      if (!error && data) {
        setMarkupPercent(data.markup_percent || 0);
      }
    }
  };

  fetchMarkup();
}, []);


const fetchAds = async () => {
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("user_id");
  const agencyId = localStorage.getItem("agency_id");
  const multiplier = 1 + markupPercent / 100;
  
  

  let query = supabase.from("ad_campaigns").select("*");

if (role === "client") {
  query = query.or(`client_id.eq.${userId},agency_id.eq.${userId}`);
} else if (role === "agency") {
  query = query.eq("agency_id", agencyId);
}

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch ads:", error.message);
  } else {
const enriched = data.map((ad) => {
  const views = Number(ad.views) || 0;
  const actions = Number(ad.actions) || 0;
  const baseCpm = parseFloat(ad.cpm || "0");
  const budget = parseFloat(ad.budget || "0");

  const cpm = role === "client" ? baseCpm * multiplier : baseCpm;

  return {
    ...ad,
    cpm,
    budget, // всегда честный
    ctr: views > 0 ? (actions / views) * 100 : 0,
    spend: (views / 1000) * cpm,
  };
});

    setAds(enriched);
  }
};


	useEffect(() => {
	  const role = localStorage.getItem("role");
	  if (markupPercent > 0 || role !== "client") {
		fetchAds();
	  }
	}, [markupPercent]);
	
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (error) {
      console.error("Error deleting ad:", error.message);
    } else {
      setAds((prev) => prev.filter((ad) => ad.id !== id));
    }
  };

  const handleAddBudget = async (id: string, currentBudget: string) => {
    const updatedBudget = (parseFloat(currentBudget) + 10).toFixed(2);
    const { error } = await supabase
      .from("ad_campaigns")
      .update({ budget: updatedBudget })
      .eq("id", id);

    if (error) {
      console.error("Failed to update budget:", error.message);
    } else {
      fetchAds();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6">
      <div className="overflow-x-auto bg-white border rounded shadow-sm">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-xs uppercase text-gray-500 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Ad Title</th>
              <th className="px-4 py-3 text-left">Views</th>
              <th className="px-4 py-3 text-left">Actions</th>
              <th className="px-4 py-3 text-left">CPM</th>
              <th className="px-4 py-3 text-left">Budget</th>
			  <th className="px-4 py-3 text-left">CTR (%)</th>
			  <th className="px-4 py-3 text-left">Spend</th>
              <th className="px-4 py-3 text-left">Target</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date Added</th>
              <th className="px-4 py-3 text-left">Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ads.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  No ads created yet.
                </td>
              </tr>
            ) : (
              ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-gray-50">
				<td className="px-4 py-3 text-blue-600 font-medium">
				  <Link to={`/create?id=${ad.id}`} className="hover:underline">
					{ad.title || "Untitled"}
				  </Link>
				</td>
                  <td className="px-4 py-3">{ad.views}</td>
                  <td className="px-4 py-3">{ad.actions}</td>
                  <td className="px-4 py-3">${parseFloat(ad.cpm).toFixed(2)}</td>
                  <td className="px-4 py-3">${parseFloat(ad.budget).toFixed(2)}</td>
				  <td className="px-4 py-3">{ad.ctr?.toFixed(2)}</td>
				  <td className="px-4 py-3">${ad.spend?.toFixed(2)}</td>
                  <td className="px-4 py-3">{ad.target}</td>
                  <td className="px-4 py-3 text-blue-500">{ad.status}</td>
                  <td className="px-4 py-3">
                    {new Date(ad.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      className="text-red-600 hover:underline text-xs"
                      onClick={() => handleDelete(ad.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="text-blue-600 hover:underline text-xs"
                      onClick={() => handleAddBudget(ad.id, ad.budget)}
                    >
                      + $10
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
