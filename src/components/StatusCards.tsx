import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, UserX, TrendingUp } from "lucide-react";
import { MetricCard } from "./MetricCard"; // Importar MetricCard

interface StatusCardsProps {
  data: any[];
}

export function StatusCards({ data }: StatusCardsProps) {
  const filteredMembers = data.filter(member => {
    const planName = member.NomeContrato?.toLowerCase() || '';
    return !(
      planName.includes('influenciador') ||
      planName.includes('personal') ||
      planName.includes('combo 3 diárias') ||
      planName.includes('wellhub') ||
      planName.includes('totalpass')
    );
  });

  // "Ativos" agora representa o total de alunos com planos padrão (ex: 843)
  const totalActiveMembers = filteredMembers.length;

  // "Adimplentes" agora representa os alunos com status de contrato 'ativo' (ex: 797)
  let membersWithActiveStatus = 0;
  // "Inadimplentes" mantém sua definição (ex: 46)
  let delinquentMembersCount = 0;

  filteredMembers.forEach(member => {
    const status = member.StatusContrato?.toLowerCase() || '';
    if (status.includes('ativo')) {
      membersWithActiveStatus++;
    }
    if (status.includes('inadimplente') || status.includes('vencido') || status.includes('cancelado')) {
      delinquentMembersCount++;
    }
  });

  // Porcentagem de Inadimplentes em relação ao novo total de "Ativos"
  const delinquentPercentage = totalActiveMembers > 0 ? ((delinquentMembersCount / totalActiveMembers) * 100).toFixed(1) : '0';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"> {/* Ajustado para 3 colunas */}
      {/* Card 1: Ativos (agora é o total de alunos com planos padrão) */}
      <MetricCard
        title="Ativos"
        value={totalActiveMembers}
        icon={<UserCheck className="h-4 w-4 text-[hsl(var(--success-color))]" />}
        subtitle="Total de alunos com planos padrão"
        valueClassName="text-[hsl(var(--success-color))]"
        hasLeftBorderGradient
      />

      {/* Card 2: Adimplentes (agora são os alunos com status 'ativo') */}
      <MetricCard
        title="Adimplentes"
        value={membersWithActiveStatus}
        icon={<TrendingUp className="h-4 w-4 text-[hsl(var(--accent-turquoise))]" />}
        subtitle="Alunos com status de contrato 'ativo'"
        valueClassName="text-[hsl(var(--accent-turquoise))]"
        hasLeftBorderGradient
      />

      {/* Card 3: Inadimplentes */}
      <MetricCard
        title="Inadimplentes"
        value={delinquentMembersCount}
        icon={<UserX className="h-4 w-4 text-[hsl(var(--danger-color))]" />}
        subtitle={`${delinquentPercentage}% do total de ativos`}
        valueClassName="text-[hsl(var(--danger-color))]"
        hasLeftBorderGradient
      />
    </div>
  );
}