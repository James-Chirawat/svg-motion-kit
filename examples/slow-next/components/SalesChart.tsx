"use client";
import { Chart } from "chart.js";
import _ from "lodash";
import moment from "moment";
import { useEffect, useState } from "react";

export function SalesChart() {
  const [rows, setRows] = useState<{ id: string; total: number }[]>([]);
  useEffect(() => {
    fetch("/api/sales").then((r) => r.json()).then(setRows);
  }, []);
  const total = _.sumBy(rows, "total");
  return (
    <ul>
      <li>{moment().format("LL")} — {total}</li>
      {rows.map((r, i) => <li key={i}>{r.total}</li>)}
    </ul>
  );
}

export const keepChart = Chart;
