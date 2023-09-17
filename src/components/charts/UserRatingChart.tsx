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
    console.log(payload)
    return (
      <div className="custom-tooltip">
        <p className="label">{`Date: ${formatXAxis(label)}`}</p>
        <p className="label">{`TR: ${payload?.[0].payload["muCasted"]}`}</p>
      </div>
    );
  }

  return null;
};

function UserRatingChart({ ratingHistories }: IUserRatingChartProps) {
  return (
    <ResponsiveContainer className={"flex flex-col bg-white m-auto rounded-xl"} width={"90%"} height={"90%"}>
      <AreaChart
        data={ratingHistories}
        margin={{
          top: 20,
          right: 20,
          left: 0,
          bottom: 10,
        }}
      >
        <XAxis
          dataKey={"created"}
          tickFormatter={formatXAxis}
          domain={["dataMin", "dataMax"]}
          tickCount={8}
        />
        <YAxis
          dataKey={"muCasted"}
          name="TR"
          type="number"
          domain={["auto", "auto"]}
        />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip content={<CustomRatingTooltip />} />
        <Legend />

        <Area
          type="monotone"
          dataKey="mu"
          name="TR"
          stroke="#074eb0"
          fill="#4982d1"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default UserRatingChart;
