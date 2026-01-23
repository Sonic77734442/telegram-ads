import { supabase } from "../supabaseClient";

const TableRow = ({ ad }: { ad: Ad }) => {
  const handleDelete = async () => {
    const confirm = window.confirm(`Delete ad "${ad.title}"?`);
    if (!confirm) return;

    const { error } = await supabase
      .from("ad_campaigns")
      .delete()
      .eq("id", ad.id);

    if (error) {
      console.error("Ошибка удаления:", error);
      return;
    }

    window.location.reload(); // можно заменить на обновление через стейт
  };
  
  const displayCPM = Number(ad.cpm || 0).toFixed(2);
  const displayBudget = Number(ad.budget || 0).toFixed(2);

  return (
    <tr className="border-b hover:bg-gray-50 text-sm">
      <td className="py-2 font-medium text-blue-700">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <img
              src="data:image/svg+xml,%3Csvg%20height%3D%2218%22%20viewBox%3D%220%200%2018%2018%22%20width%3D%2218%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%232b2b2b%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M%209.09%2011.52%20C%209.27%2011.65%209.37%2011.75%209.38%2011.81%20C%209.55%2012.59%209.67%2013.18%209.76%2013.58%20C%209.83%2014.3%209.62%2014.95%209.04%2015.04%20C%209.02%2015.04%209%2015.04%208.98%2015.05%20L%208.86%2015.05%20C%208.26%2015.1%207.69%2014.68%207.44%2014%20C%206.81%2013%206.4%2012.25%206.22%2011.76%20C%206.2%2011.7%206.26%2011.62%206.41%2011.52%20Z%20M%205.14%206.17%20H%208.7%20C%209.03%206.17%209.3%206.43%209.3%206.76%20V%2010.15%20C%209.3%2010.48%209.03%2010.75%208.7%2010.75%20H%206.65%20H%205.14%20C%204.21%2010.75%203.46%209.99%203.46%209.07%20V%207.85%20C%203.46%206.92%204.21%206.17%205.14%206.17%20Z%20M%2010.54%205.77%20L%2012.91%204.19%20C%2013.39%203.87%2014.04%204%2014.37%204.48%20C%2014.48%204.65%2014.54%204.85%2014.54%205.06%20V%2011.47%20C%2014.54%2012.05%2014.07%2012.52%2013.49%2012.52%20C%2013.31%2012.52%2013.12%2012.47%2012.96%2012.38%20L%2010.58%2010.98%20C%2010.32%2010.83%2010.16%2010.56%2010.16%2010.26%20V%206.47%20C%2010.16%206.19%2010.3%205.92%2010.54%205.77%20Z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E"
              alt="megaphone"
              className="inline-block"
            />
            {ad.title}
          </div>
          <div className="text-[12px] text-blue-600 underline pl-[22px]">
            <a
              href={`https://${ad.url}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {new URL(ad.url).hostname.replace("www.", "")}
            </a>
          </div>
        </div>
      </td>

      <td>{ad.views.toLocaleString()}</td>
      <td>{ad.actions}</td>
	<td>${displayCPM}</td>
	<td>${displayBudget}</td>
      <td>{ad.target}</td>
      <td
        className={
          ad.status === "Active" ? "text-green-600" : "text-gray-500"
        }
      >
        {ad.status}
      </td>
      <td>{ad.date}</td>
      <td>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:underline text-xs"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

export default TableRow;
