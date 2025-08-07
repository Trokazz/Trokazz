import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UserGrowthChartProps {
  data: { date: string; count: number }[];
}

const UserGrowthChart = ({ data }: UserGrowthChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Novos Usuários nos Últimos 30 Dias</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value) => [`${value} usuários`, "Novos Usuários"]} />
            <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} name="Novos Usuários" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default UserGrowthChart;