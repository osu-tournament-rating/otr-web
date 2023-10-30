import moment from "moment";
import { IUserRatingChartProps } from "./IUserRatingChartProps";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
  Bar,
  Line,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

function formatXAxis(tickItem: any) {
  return moment(tickItem).format("MMM D, YYYY");
}

const CustomRatingTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active) {
    const activePayload = payload?.[0].payload;
    if (!activePayload) {
      return null;
    }

    return (
      <div className="custom-tooltip bg-blue-200 opacity-90 rounded-xl p-2">
        {activePayload["tooltipInfo.tournamentName"] && 
        <p className="label font-sans font-bold text-xl">{activePayload["tooltipInfo.tournamentAbbreviation"]}: {activePayload["tooltipInfo.tournamentName"]}</p>}
        <p className="label font-sans"><strong>Match:</strong> {`${activePayload["tooltipInfo.matchName"]}`}</p>
        <p className="label font-sans"><strong>Date:</strong> {`${formatXAxis(label)}`}</p>
        <p className="label font-sans"><strong>TR:</strong> {`${activePayload["ratingAfter"].toFixed(0)}`}</p>
      </div>
    );
  }

  return null;
};

function UserRatingChart({ ratingData }: IUserRatingChartProps) {
  return (
    <ResponsiveContainer className={"flex flex-col bg-white m-auto rounded-xl"} width={"90%"} height={"90%"}>
      <AreaChart
        data={ratingData}
        margin={{
          top: 20,
          right: 20,
          left: 0,
          bottom: 10,
        }}
      >
        <defs>
          <linearGradient id="colorMu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="47%" stopColor="#4C94FF" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#225CB3" stopOpacity={0.7} />  
          </linearGradient>
        </defs>
        <XAxis
          dataKey={"tooltipInfo.matchDate"}
          tickFormatter={formatXAxis}
          domain={["dataMin", "dataMax"]}
          tickCount={8}
        />
        <YAxis
          dataKey={"ratingAfter"}
          name="TR"
          type="number"
          domain={["auto", "auto"]}
        />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip content={<CustomRatingTooltip />} />

        <Area
          type="monotone"
          dataKey="ratingAfter"
          name="TR"
          stroke="#4D94FF"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorMu)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default UserRatingChart;
