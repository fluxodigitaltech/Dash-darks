import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, ShieldCheck } from "lucide-react";
import { MetricCard } from "./MetricCard"; // Importar MetricCard

interface MemberSummaryCardsProps {
  data: any[];
}

export function MemberSummaryCards({ data }: MemberSummaryCardsProps) {
  const totalWellhubTotalPass = data.filter(member => {
    const planName = member.NomeContrato?.toLowerCase() || '';
    return planName.includes('wellhub') || planName.includes('totalpass');
  }).length;

  const totalExcludingSpecificPlans = data.filter(member => {
    const planName = member.NomeContrato?.toLowerCase() || '';
    return !(
      planName.includes('influenciador') ||
      planName.includes('personal') ||
      planName.includes('combo 3 diárias') ||
      planName.includes('wellhub') || // Adicionado para excluir Wellhub
      planName.includes('totalpass') // Adicionado para excluir TotalPass
    );
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MetricCard
        title="Wellhub + TotalPass"
        value={totalWellhubTotalPass}
        icon={<Award className="h-4 w-4 text-[hsl(var(--accent-silver))]" />}
        subtitle="Alunos com planos parceiros"
        valueClassName="text-[hsl(var(--accent-silver))]"
        hasLeftBorderGradient
      />

      <MetricCard
        title="Planos Padrão"
        value={totalExcludingSpecificPlans}
        icon={<ShieldCheck className="h-4 w-4 text-[hsl(var(--accent-turquoise))]" />}
        subtitle="Excluindo Influenciador, Personal, Combo 3 Diárias, Wellhub e TotalPass"
        valueClassName="text-[hsl(var(--accent-turquoise))]"
        hasLeftBorderGradient
      />
    </div>
  );
}