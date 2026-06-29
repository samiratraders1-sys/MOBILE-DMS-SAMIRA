import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface TrendData {
  month: string;
  profit: number;
}

export default function ProfitTrendChart({ data }: { data: TrendData[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .range([0, width])
      .padding(0.1)
      .domain(data.map(d => d.month));

    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([0, d3.max(data, d => d.profit) || 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format("$.2s")(d)));

    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.month)!)
      .attr("y", d => y(d.profit))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.profit))
      .attr("fill", "#6366f1"); // Indigo-500
  }, [data]);

  return <svg ref={ref} width="600" height="300" className="w-full h-auto" />;
}
