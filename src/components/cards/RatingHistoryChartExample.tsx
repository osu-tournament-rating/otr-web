import React, { PureComponent } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from "recharts";

function RatingHistoryChartExample(props: any) {
  const data = [
    {
      mu: 512,
      created: "2023-01-01",
    },
    {
      mu: 625,
      created: "2023-02-01",
    },
    {
      mu: 1000,
      created: "2023-03-01",
    },
    {
      mu: 800,
      created: "2023-04-01",
    },
    {
      mu: 1400,
      created: "2023-05-01",
    },
    {
      mu: 2000,
      created: "2023-06-01",
    },
  ];

  return (
    <ResponsiveContainer className="md:flex w-96 h-96 md:w-1/2" width="90%" height="90%">
      <AreaChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 10,
          right: 40,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis name="Match Date" dataKey="created" />
        <YAxis name="TR" dataKey="mu" />
        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
        <Area
          type="monotone"
          name="TR"
          dataKey="mu"
          stroke="#000000"
          fill="#8884d8"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default RatingHistoryChartExample;
