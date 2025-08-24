import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryDistributionChartProps {
  data: { name: string; value: number }[];
}

// Função para gerar uma cor HSL baseada em um índice
const generateColor = (index: number, total: number) => {
  const hue = (index * 360) / total; // Distribui os matizes uniformemente
  return `hsl(${hue}, 70%, 60%)`; // Mantém saturação e luminosidade constantes
};

const CategoryDistributionChart = ({ data }: CategoryDistributionChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anúncios por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8" // Fallback fill, overridden by Cell colors
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={generateColor(index, data.length)} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} anúncios`, "Anúncios"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CategoryDistributionChart;