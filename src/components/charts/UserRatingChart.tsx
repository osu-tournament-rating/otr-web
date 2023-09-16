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
    return (
      <div className="custom-tooltip">
        <p className="label">{`Date: ${formatXAxis(label)}`}</p>
        <p className="label">{`TR: ${payload?.[0].payload["muCasted"]}`}</p>
      </div>
    );
  }

  return null;
};

const CustomSigmaTooltip = ({
	active,
	payload,
	label,
  }: TooltipProps<ValueType, NameType>) => {
	if (active) {
	  return (
		<div className="custom-tooltip">
		  <p className="label">{`Date: ${formatXAxis(label)}`}</p>
		  <p className="label">{`Volatility: ${payload?.[0].payload["sigmaCasted"]}`}</p>
		</div>
	  );
	}
  
	return null;
  };

function UserRatingChart({ ratingHistories }: IUserRatingChartProps) {
  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer>
        <AreaChart
          width={1000}
          height={300}
          data={ratingHistories}
          syncId={"sync"}
        >
          <XAxis
            dataKey={"created"}
            tickFormatter={formatXAxis}
            domain={["auto", "auto"]}
            interval={5}
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
            stroke="#8884d8"
            fill="#8884d8"
          />
        </AreaChart>
      </ResponsiveContainer>
      <ResponsiveContainer>
        <AreaChart
          width={1000}
          height={100}
          data={ratingHistories}
          syncId={"sync"}
        >
          <XAxis
            dataKey={"created"}
            tickFormatter={formatXAxis}
            domain={["auto", "auto"]}
            interval={5}
          />

          <YAxis
            dataKey={"sigmaCasted"}
            name="Volatility"
            type="number"
            domain={["auto", "auto"]}
          />

          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip content={<CustomSigmaTooltip />} />
          <Legend />

		  <Area
            type="monotone"
            dataKey="sigmaCasted"
            name="Volatility"
            stroke="#999999"
            fill="#FFF59D"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default UserRatingChart;
