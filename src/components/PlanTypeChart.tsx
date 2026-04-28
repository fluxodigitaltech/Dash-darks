import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react"; // Importando o ícone Users

interface PlanTypeChartProps {
  data: any[];
}

const COLORS = ['#00bcd4', '#ffc107', '#dc3545', '#28a745', '#6c757d', '#C0C0C0', '#008c9e', '#e0a800', '#bd2130', '#1e7e34']; // Usando as novas cores

export function PlanTypeChart({ data }: PlanTypeChartProps) {
  const planTypeData = data.reduce((acc, member) => {
    const planType = (member.NomeContrato || 'Sem Contrato').trim();
    acc[planType] = (acc[planType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(planTypeData).map(([name, value]) => ({
    name,
    value
  }));

  if (chartData.length === 0) {
    return (
      <Card className="flex items-center justify-center h-96 bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))]">
        <p className="text-[hsl(var(--muted-foreground))]">Nenhum dado disponível para tipos de plano.</p>
      </Card>
    );
  }

  return (
    <Card className="glow-card">
      <CardHeader className="flex flex-row items-center justify-between"> {/* Adicionado flexbox para alinhar título e ícone */}
        <CardTitle className="text-[hsl(var(--foreground))]">Alunos por Tipo de Plano</CardTitle>
        <Users className="h-5 w-5 text-[hsl(var(--accent-turquoise))]" /> {/* Ícone adicionado aqui */}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={120}
              fill="hsl(var(--accent-turquoise))"
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} alunos`, 'Quantidade']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card-bg))', 
                border: '1px solid hsl(var(--border-color))', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: 'hsl(var(--text-color))'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}