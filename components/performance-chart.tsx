"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data: { month: string; performance: number }[] = [
  // No dummy data - will be populated with real performance metrics
]

export function PerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis domain={[7, 10]} />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="performance" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ fill: "#3b82f6" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
