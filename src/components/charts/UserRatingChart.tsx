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
} from "recharts";

function UserRatingChart({ ratingHistories }: IUserRatingChartProps) {
  return (
    <ResponsiveContainer width={"100%"} height={"100%"}>
      <AreaChart width={1000} height={400} data={ratingHistories}>
        <XAxis dataKey={"date"} name="Date" />
        <YAxis
          dataKey={"mu"}
          name="TR"
          type="number"
          domain={["auto", "auto"]}
        />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        <Legend />

        <Area
          type="monotone"
          dataKey="mu"
          name="TR"
          stroke="#8884d8"
          fill="#8884d8"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default UserRatingChart;
