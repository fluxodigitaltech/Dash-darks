"use client";

import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, UserCheck, CalendarOff, Download, Clock, CalendarDays, UserX } from 'lucide-react'; // Adicionado Clock, CalendarDays, UserX
import { format, parse, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ExportToExcelButton } from './ExportToExcelButton';
import { MetricCard } from './MetricCard'; // Importar MetricCard

interface FrequencyDashboardProps {
  members: any[];
  isLoadingMembers: boolean;
  errorMembers: string | null;
}

interface FrequencyMember {
  name: string;
  plan: string;
  lastEntry: string;
  daysSinceLastEntry: number | 'Grave';
}

export const FrequencyDashboard: React.FC<FrequencyDashboardProps> = ({
  members,
  isLoadingMembers,
  errorMembers,
}) => {
  const { processedMembers, membersTodayCount, members1To7DaysCount, membersOver7DaysCount, membersGraveCount } = useMemo(() => {
    if (isLoadingMembers || !members || members.length === 0) {
      return {
        processedMembers: [],
        membersTodayCount: 0,
        members1To7DaysCount: 0,
        membersOver7DaysCount: 0,
        membersGraveCount: 0,
      };
    }

    const today = startOfDay(new Date());
    let todayCount = 0;
    let oneToSevenDaysCount = 0;
    let overSevenDaysCount = 0;
    let graveCount = 0;

    const filtered = members.filter(member => {
      const planName = member.NomeContrato?.toLowerCase() || '';
      return planName.includes('wellhub') || planName.includes('totalpass');
    });

    const membersData: FrequencyMember[] = filtered.map(member => {
      const lastEntryString = member.UltimaEntrada;
      let daysSinceLastEntry: number | 'Grave' = 'Grave';
      let formattedLastEntry = 'N/A';

      if (lastEntryString) {
        try {
          const parsedDate = parse(lastEntryString, 'dd/MM/yyyy', new Date());
          daysSinceLastEntry = differenceInDays(today, startOfDay(parsedDate));
          formattedLastEntry = format(parsedDate, 'dd/MM/yyyy', { locale: ptBR });

          if (daysSinceLastEntry === 0) {
            todayCount++;
          } else if (daysSinceLastEntry >= 1 && daysSinceLastEntry <= 7) {
            oneToSevenDaysCount++;
          } else if (daysSinceLastEntry > 7) {
            overSevenDaysCount++;
          }
        } catch (e) {
          graveCount++;
          // console.warn(`Could not parse UltimaEntrada for member ${member.Nome}: ${lastEntryString}`, e);
        }
      } else {
        graveCount++;
      }

      return {
        name: member.Nome,
        plan: member.NomeContrato,
        lastEntry: formattedLastEntry,
        daysSinceLastEntry: daysSinceLastEntry,
      };
    });

    // Sort: 'Grave' first, then 0 days, then by daysSinceLastEntry (ascending)
    membersData.sort((a, b) => {
      if (a.daysSinceLastEntry === 'Grave' && b.daysSinceLastEntry !== 'Grave') return -1;
      if (a.daysSinceLastEntry !== 'Grave' && b.daysSinceLastEntry === 'Grave') return 1;
      if (a.daysSinceLastEntry === 'Grave' && b.daysSinceLastEntry === 'Grave') return 0;
      
      const daysA = a.daysSinceLastEntry as number;
      const daysB = b.daysSinceLastEntry as number;

      // Prioritize 0 days at the top, then sort by days ascending
      if (daysA === 0 && daysB !== 0) return -1;
      if (daysA !== 0 && daysB === 0) return 1;
      
      return daysA - daysB;
    });

    return {
      processedMembers: membersData,
      membersTodayCount: todayCount,
      members1To7DaysCount: oneToSevenDaysCount,
      membersOver7DaysCount: overSevenDaysCount,
      membersGraveCount: graveCount,
    };
  }, [members, isLoadingMembers]);

  if (isLoadingMembers) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (errorMembers) {
    return (
      <Card className="text-center p-6 bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))]">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--danger-color))]">Erro ao Carregar Dados de Frequência</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--muted-foreground))] mb-3 whitespace-pre-line">{errorMembers}</p>
          <Button onClick={() => window.location.reload()} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))]">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Alunos Wellhub/TotalPass Hoje"
          value={membersTodayCount.toLocaleString('pt-BR')}
          icon={<UserCheck className="h-5 w-5 text-[hsl(var(--success-color))]" />}
          subtitle="Alunos que registraram entrada hoje"
          hasLeftBorderGradient
        />
        <MetricCard
          title="Alunos Ativos (1-7 dias)"
          value={members1To7DaysCount.toLocaleString('pt-BR')}
          icon={<CalendarDays className="h-5 w-5 text-[hsl(var(--accent-turquoise))]" />}
          subtitle="Alunos que vieram nos últimos 1 a 7 dias"
          hasLeftBorderGradient
        />
        <MetricCard
          title="Alunos Ausentes (>7 dias)"
          value={membersOver7DaysCount.toLocaleString('pt-BR')}
          icon={<Clock className="h-5 w-5 text-[hsl(var(--warning-color))]" />}
          subtitle="Alunos que não vêm há mais de 7 dias"
          hasLeftBorderGradient
        />
        <MetricCard
          title="Alunos com Frequência Grave"
          value={membersGraveCount.toLocaleString('pt-BR')}
          icon={<UserX className="h-5 w-5 text-[hsl(var(--danger-color))]" />}
          subtitle="Alunos sem registro de última entrada"
          hasLeftBorderGradient
        />
      </div>

      <Card className="glow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[hsl(var(--foreground))]">Frequência Wellhub / TotalPass ({processedMembers.length})</CardTitle>
            <CardDescription className="text-[hsl(var(--muted-foreground))]">
              Acompanhe os dias desde a última entrada dos alunos com planos Wellhub e TotalPass.
            </CardDescription>
          </div>
          <ExportToExcelButton
            data={processedMembers}
            fileName="frequencia_wellhub_totalpass"
            buttonText="Exportar Frequência"
            className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]"
          />
        </CardHeader>
        <CardContent>
          {processedMembers.length > 0 ? (
            <div className="rounded-md border border-[hsl(var(--border-color))] bg-[hsl(var(--card-bg))] text-[hsl(var(--text-color))] max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-[hsl(var(--secondary-black))] sticky top-0">
                  <TableRow>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Nome do Aluno</TableHead>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Plano</TableHead>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Última Entrada</TableHead>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Dias Sem Vir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedMembers.map((member, index) => (
                    <TableRow key={index} className="border-b border-[hsl(var(--border-color))] hover:bg-[hsl(var(--secondary-black))]/50">
                      <TableCell className="font-medium text-[hsl(var(--foreground))]">{member.name}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{member.plan}</TableCell>
                      <TableCell className="text-[hsl(var(--foreground))]">{member.lastEntry}</TableCell>
                      <TableCell 
                        className={
                          member.daysSinceLastEntry === 'Grave' ? 'text-[hsl(var(--danger-color))] font-semibold' :
                          member.daysSinceLastEntry === 0 ? 'text-[hsl(var(--success-color))] font-semibold' :
                          (member.daysSinceLastEntry as number) > 7 ? 'text-[hsl(var(--danger-color))] font-semibold' :
                          (member.daysSinceLastEntry as number) > 3 ? 'text-[hsl(var(--warning-color))]' :
                          'text-[hsl(var(--accent-turquoise))]'
                        }
                      >
                        {member.daysSinceLastEntry === 'Grave' ? 'Grave' : `${member.daysSinceLastEntry} dias`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <UserCheck className="h-12 w-12 text-[hsl(var(--accent-turquoise))]" />
              <p className="mt-4 text-[hsl(var(--muted-foreground))]">Nenhum aluno Wellhub/TotalPass encontrado ou sem dados de entrada.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};