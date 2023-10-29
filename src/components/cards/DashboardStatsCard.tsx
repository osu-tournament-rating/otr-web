export interface IDashboardStatsCardProps {
  title: string;
  labels: string[];
  values: string[];
}

function DashboardStatsCard({
  title,
  labels,
  values,
}: IDashboardStatsCardProps) {
  return (
    <div className="flex-1 bg-gray-100 rounded-xl md:w-1/2 lg:w-1/3 mx-3 px-8 pt-5 pb-10">
      <h1 className="font-sans text-4xl font-semibold">
        {title}
      </h1>
      <div className="font-sans pt-5">
        <div className="flex flex-col justify-between">
          {labels.map((label, index) => (
            <div key={index} className="flex space-x-5">
              <p className="text-center text-lg">{label}</p>
              <p className="text-center font-semibold text-lg">{values[index]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardStatsCard;
