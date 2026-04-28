import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { formatCurrency, parseCurrencyString } from '@/utils/currency';
import { MetricCard } from '@/components/MetricCard';
import { MonthlyAdherenceTracker } from '@/components/MonthlyAdherenceTracker';
import { GrossRevenueDashboard } from '@/components/GrossRevenueDashboard';
import { ReceivablesDashboard } from '@/components/ReceivablesDashboard';
import { ProspectsDashboard } from '@/components/ProspectsDashboard';
import { AnnualDashboard } from '@/components/AnnualDashboard';
import { PersonalDashboard } from '@/components/PersonalDashboard';
import { OnlineSalesDashboard } from '@/components/OnlineSalesDashboard';
import { RevenuePerContractChart } from '@/components/RevenuePerContractChart';
import { MembersPerContractChart } from '@/components/MembersPerContractChart';
import { PlanTypeChart } from '@/components/PlanTypeChart';
import { ContractStatusChart } from '@/components/ContractStatusChart';
import { MemberRevenueSummary } from '@/components/MemberRevenueSummary';
import { DelinquentRevenueSummary } from '@/components/DelinquentRevenueSummary';
import { ExportToPdfButton } from '@/components/ExportToPdfButton';
import { ExportToExcelButton } from '@/components/ExportToExcelButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, Users, TrendingUp, RefreshCw, AlertCircle, CalendarIcon, ShoppingCart, Target, UserCheck, UserX, Award, Clock } from 'lucide-react'; // Adicionado Clock para Frequência
import { useReceivables } from '@/hooks/useReceivables';
import { useProspects } from '@/hooks/useProspects';
import { format, startOfMonth, endOfMonth, subMonths, parse, isWithinInterval } from 'date-fns';
import { getClientId } from '@/utils/dataHelpers';
import { DelinquentMembersTable } from '@/components/DelinquentMembersTable';
import { FrequencyDashboard } from '@/components/FrequencyDashboard'; // Importar o novo componente

interface DashboardPageProps {
  members: any[];
  isLoadingMembers: boolean;
  errorMembers: string | null;
  refetchMembers: () => void;
}

const Index: React.FC<DashboardPageProps> = ({ members, isLoadingMembers, errorMembers, refetchMembers }) => {
  const queryClient = useQueryClient();

  const currentMonthDateRange = {
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  };
  const previousMonthDateRange = {
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date()), // Corrigido para endOfMonth do mês anterior
  };

  const { data: receivablesDataCurrentMonth, isLoading: isLoadingReceivablesCurrentMonth, isFetching: isFetchingReceivablesCurrentMonth, error: errorReceivablesCurrentMonth, refetch: refetchReceivablesCurrentMonth } = useReceivables({
    startDate: format(currentMonthDateRange.from, 'yyyy-MM-dd'),
    endDate: format(currentMonthDateRange.to, 'yyyy-MM-dd'),
  });

  const { data: receivablesDataPreviousMonth, isLoading: isLoadingReceivablesPreviousMonth, isFetching: isFetchingReceivablesPreviousMonth, error: errorReceivablesPreviousMonth, refetch: refetchReceivablesPreviousMonth } = useReceivables({
    startDate: format(previousMonthDateRange.from, 'yyyy-MM-dd'),
    endDate: format(previousMonthDateRange.to, 'yyyy-MM-dd'),
  });

  const { data: prospectsData, isLoading: isLoadingProspects, isFetching: isFetchingProspects, error: errorProspects } = useProspects();
  
  const { data: prospectsDataPreviousMonth, isLoading: isLoadingProspectsPrevious, isFetching: isFetchingProspectsPrevious, error: errorProspectsPrevious } = useProspects({
    startDate: format(previousMonthDateRange.from, 'yyyy-MM-dd'),
    endDate: format(previousMonthDateRange.to, 'yyyy-MM-dd'),
  });

  const { data: monthlyStats, isLoading: isLoadingStats, isFetching: isFetchingStats, error: errorStats } = useQuery<any[], Error>({
    queryKey: ['monthly_member_stats'],
    queryFn: async () => {
      return api.get<any[]>('/api/monthly-stats');
    },
  });

  const handleRefreshAll = () => {
    refetchMembers(); // Agora refetchMembers vem das props
    queryClient.invalidateQueries({ queryKey: ['receivables'] });
    queryClient.invalidateQueries({ queryKey: ['prospects'] });
    queryClient.invalidateQueries({ queryKey: ['monthly_member_stats'] });
  };

  const { totalRevenue, totalMembers: totalStandardMembersCount } = useMemo(() => { // Renomeado totalMembers para totalStandardMembersCount
    if (!members) return { totalRevenue: 0, totalMembers: 0 };
    
    let revenue = 0;
    const standardMembers = members.filter(member => {
        const planName = member.NomeContrato?.toLowerCase() || '';
        return !(
            planName.includes('influenciador') ||
            planName.includes('personal') ||
            planName.includes('combo 3 diárias') ||
            planName.includes('wellhub') ||
            planName.includes('totalpass')
        );
    });

    standardMembers.forEach(member => {
        const status = member.StatusContrato?.toLowerCase() || '';
        if (!status.includes('inadimplente') && !status.includes('vencido') && !status.includes('cancelado')) {
            let value = parseCurrencyString(member.ValorContrato);
            const contractName = member.NomeContrato?.toLowerCase() || '';
            if (
                (contractName.includes('recorrente') || contractName.includes('darsj promocional')) &&
                value < 179.90
            ) {
                value = 179.90;
            }
            if (contractName.includes('anual')) {
                value = value / 12;
            }
            revenue += value;
        }
    });

    return {
        totalRevenue: revenue,
        totalMembers: standardMembers.length,
    };
  }, [members]);

  // Clientes únicos de vendas online (mês atual)
  const onlineSalesUniqueCustomersCurrentMonthCount = useMemo(() => {
    if (!receivablesDataCurrentMonth) return 0;
    const onlineSales = receivablesDataCurrentMonth.filter(item => item.Origem?.toLowerCase() === 'venda on-line');
    const uniqueCustomerIds = new Set<string>();
    onlineSales.forEach(sale => {
      const clientId = getClientId(sale, 'receivable');
      if (clientId) {
        uniqueCustomerIds.add(clientId);
      }
    });
    return uniqueCustomerIds.size;
  }, [receivablesDataCurrentMonth]);

  // Clientes únicos de vendas online (mês passado)
  const onlineSalesUniqueCustomersPreviousMonthCount = useMemo(() => {
    if (!receivablesDataPreviousMonth) return 0;
    const onlineSales = receivablesDataPreviousMonth.filter(item => item.Origem?.toLowerCase() === 'venda on-line');
    const uniqueCustomerIds = new Set<string>();
    onlineSales.forEach(sale => {
      const clientId = getClientId(sale, 'receivable');
      if (clientId) {
        uniqueCustomerIds.add(clientId);
      }
    });
    return uniqueCustomerIds.size;
  }, [receivablesDataPreviousMonth]);

  // --- Extraindo lógica de StatusCards ---
  const { totalActiveMembers, membersWithActiveStatus, delinquentMembersCount, delinquentPercentage } = useMemo(() => {
    if (!members) return { totalActiveMembers: 0, membersWithActiveStatus: 0, delinquentMembersCount: 0, delinquentPercentage: '0' };

    const filteredMembers = members.filter(member => {
      const planName = member.NomeContrato?.toLowerCase() || '';
      return !(
        planName.includes('influenciador') ||
        planName.includes('personal') ||
        planName.includes('combo 3 diárias') ||
        planName.includes('wellhub') ||
        planName.includes('totalpass')
      );
    });

    const totalActive = filteredMembers.length;
    let activeStatusCount = 0;
    let delinquentCount = 0;

    filteredMembers.forEach(member => {
      const status = member.StatusContrato?.toLowerCase() || '';
      if (status.includes('ativo')) {
        activeStatusCount++;
      }
      if (status.includes('inadimplente') || status.includes('vencido') || status.includes('cancelado')) {
        delinquentCount++;
      }
    });

    const percentage = totalActive > 0 ? ((delinquentCount / totalActive) * 100).toFixed(1) : '0';

    return {
      totalActiveMembers: totalActive,
      membersWithActiveStatus: activeStatusCount,
      delinquentMembersCount: delinquentCount,
      delinquentPercentage: percentage,
    };
  }, [members]);

  // --- Extraindo lógica de MemberSummaryCards ---
  const { totalWellhubTotalPass, totalStandardPlans } = useMemo(() => {
    if (!members) return { totalWellhubTotalPass: 0, totalStandardPlans: 0 };

    const wellhubTotalPassCount = members.filter(member => {
      const planName = member.NomeContrato?.toLowerCase() || '';
      return planName.includes('wellhub') || planName.includes('totalpass');
    }).length;

    const standardPlansCount = members.filter(member => {
      const planName = member.NomeContrato?.toLowerCase() || '';
      return !(
        planName.includes('influenciador') ||
        planName.includes('personal') ||
        planName.includes('combo 3 diárias') ||
        planName.includes('wellhub') ||
        planName.includes('totalpass')
      );
    }).length;

    return {
      totalWellhubTotalPass: wellhubTotalPassCount,
      totalStandardPlans: standardPlansCount,
    };
  }, [members]);


  const keyMetricsRef = useRef<HTMLDivElement>(null);
  const monthlyAdherenceTrackerRef = useRef<HTMLDivElement>(null);
  const prospectsDashboardRef = useRef<HTMLDivElement>(null);
  const memberRevenueSummaryRef = useRef<HTMLDivElement>(null);
  const delinquentRevenueSummaryRef = useRef<HTMLDivElement>(null);
  const grossRevenueDashboardRef = useRef<HTMLDivElement>(null);
  const receivablesDashboardRef = useRef<HTMLDivElement>(null);
  const annualDashboardRef = useRef<HTMLDivElement>(null);
  const personalDashboardRef = useRef<HTMLDivElement>(null);
  const onlineSalesDashboardRef = useRef<HTMLDivElement>(null);
  const revenuePerContractChartRef = useRef<HTMLDivElement>(null);
  const membersPerContractChartRef = useRef<HTMLDivElement>(null);
  const planTypeChartRef = useRef<HTMLDivElement>(null);
  const contractStatusChartRef = useRef<HTMLDivElement>(null);
  const frequencyDashboardRef = useRef<HTMLDivElement>(null); // Ref para o novo dashboard

  const chartRefs = [
    { id: 'keyMetrics', ref: keyMetricsRef },
    { id: 'monthlyAdherenceTracker', ref: monthlyAdherenceTrackerRef },
    { id: 'prospectsDashboard', ref: prospectsDashboardRef },
    { id: 'memberRevenueSummary', ref: memberRevenueSummaryRef },
    { id: 'delinquentRevenueSummary', ref: delinquentRevenueSummaryRef },
    { id: 'grossRevenueDashboard', ref: grossRevenueDashboardRef },
    { id: 'receivablesDashboard', ref: receivablesDashboardRef },
    { id: 'annualDashboard', ref: annualDashboardRef },
    { id: 'personalDashboard', ref: personalDashboardRef },
    { id: 'onlineSalesDashboard', ref: onlineSalesDashboardRef },
    { id: 'revenuePerContractChart', ref: revenuePerContractChartRef },
    { id: 'membersPerContractChart', ref: membersPerContractChartRef },
    { id: 'planTypeChart', ref: planTypeChartRef },
    { id: 'contractStatusChart', ref: contractStatusChartRef },
    { id: 'frequencyDashboard', ref: frequencyDashboardRef }, // Adicionado ao chartRefs
  ];

  const isLoading = isLoadingMembers || isLoadingReceivablesCurrentMonth || isLoadingReceivablesPreviousMonth || isLoadingProspects || isLoadingStats || isLoadingProspectsPrevious;
  const isFetching = isLoadingMembers || isFetchingReceivablesCurrentMonth || isFetchingReceivablesPreviousMonth || isFetchingProspects || isFetchingStats || isFetchingProspectsPrevious; // isFetchingMembers agora é isLoadingMembers
  const hasError = errorMembers || errorReceivablesCurrentMonth || errorReceivablesPreviousMonth || errorProspects || errorStats || errorProspectsPrevious;
  const errorMessage = errorMembers || errorReceivablesCurrentMonth?.message || errorReceivablesPreviousMonth?.message || errorProspects?.message || errorStats?.message || errorProspectsPrevious?.message;

  if (isLoading && !isFetching) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <AlertCircle className="h-12 w-12 text-[hsl(var(--danger-color))]" />
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Erro ao carregar os dados</h2>
        <p className="text-[hsl(var(--muted-foreground))] max-w-md text-center">
          {errorMessage}
        </p>
        <Button onClick={handleRefreshAll} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))]">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[hsl(var(--background))]">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <img 
            src="https://raw.githubusercontent.com/fluxodigitaltech/img-darks/refs/heads/main/logo_DARK.jpeg" 
            alt="Darks Gym Logo" 
            className="h-12 mb-4" 
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleRefreshAll} variant="outline" size="sm" disabled={isFetching} className="border-[hsl(var(--border-color))] bg-[hsl(var(--input))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary-black))] hover:text-[hsl(var(--accent-turquoise))]">
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <ExportToPdfButton
              members={members || []}
              receivablesData={receivablesDataCurrentMonth || []}
              monthlyStats={monthlyStats || []}
              prospectsData={prospectsData || []}
              chartRefs={chartRefs}
              className="btn-gradient-primary"
            />
            <ExportToExcelButton
              data={members}
              fileName="relatorio_alunos"
              buttonText="Alunos"
              disabled={isFetching}
              className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]"
            />
            <ExportToExcelButton
              data={receivablesDataCurrentMonth}
              fileName="relatorio_recebiveis"
              buttonText="Recebíveis"
              disabled={isFetching}
              className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]"
            />
            <ExportToExcelButton
              data={prospectsData}
              fileName="relatorio_prospects"
              buttonText="Prospects"
              disabled={isFetching}
              className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]"
            />
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 md:grid-cols-7 bg-transparent border-b border-[hsl(var(--border-color))] rounded-none p-0 h-12"> {/* Ajustado para 7 colunas */}
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-turquoise))] data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--accent-turquoise))] data-[state=active]:shadow-none text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-turquoise))] data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--accent-turquoise))] data-[state=active]:shadow-none text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Financeiro</TabsTrigger>
            <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-turquoise))] data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--accent-turquoise))] data-[state=active]:shadow-none text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Alunos</TabsTrigger>
            <TabsTrigger value="delinquents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-turquoise))] data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--accent-turquoise))] data-[state=active]:shadow-none text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Inadimplentes</TabsTrigger>
            <TabsTrigger value="prospects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-turquoise))] data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--accent-turquoise))] data-[state=active]:shadow-none text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Prospects</TabsTrigger>
            <TabsTrigger value="plans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-turquoise))] data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--accent-turquoise))] data-[state=active]:shadow-none text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Planos Específicos</TabsTrigger>
            <TabsTrigger value="frequency" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-turquoise))] data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--accent-turquoise))] data-[state=active]:shadow-none text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Frequência</TabsTrigger> {/* Nova aba */}
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div ref={keyMetricsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <MetricCard
                title="Faturamento Total (Contratos)"
                value={formatCurrency(totalRevenue)}
                icon={<DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--success-color))]" />}
                subtitle="Receita mensal de contratos (ajustado)"
                valueClassName="text-[hsl(var(--success-color))]"
                hasLeftBorderGradient
              />
              <MetricCard
                title="Total de Alunos (Padrão)"
                value={totalActiveMembers.toLocaleString('pt-BR')}
                icon={<UserCheck className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--success-color))]" />}
                subtitle="Total de alunos com planos padrão"
                valueClassName="text-[hsl(var(--success-color))]"
                hasLeftBorderGradient
              />
              <MetricCard
                title="Ticket Médio"
                value={totalStandardMembersCount > 0 ? formatCurrency(totalRevenue / totalStandardMembersCount) : 'R$ 0'}
                icon={<TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--accent-turquoise))]" />}
                subtitle="Valor médio por aluno"
                valueClassName="text-[hsl(var(--accent-turquoise))]"
                hasLeftBorderGradient
              />
              <MetricCard
                title="Adimplentes"
                value={membersWithActiveStatus.toLocaleString('pt-BR')}
                icon={<TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--success-color))]" />}
                subtitle="Alunos com status de contrato 'ativo'"
                valueClassName="text-[hsl(var(--success-color))]"
                hasLeftBorderGradient
              />
              <MetricCard
                title="Inadimplentes"
                value={delinquentMembersCount.toLocaleString('pt-BR')}
                icon={<UserX className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--danger-color))]" />}
                subtitle={`${delinquentPercentage}% do total de ativos`}
                valueClassName="text-[hsl(var(--danger-color))]"
                hasLeftBorderGradient
              />
              <MetricCard
                title="Wellhub + TotalPass"
                value={totalWellhubTotalPass.toLocaleString('pt-BR')}
                icon={<Award className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--accent-silver))]" />}
                subtitle="Alunos com planos parceiros"
                valueClassName="text-[hsl(var(--accent-silver))]"
                hasLeftBorderGradient
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <MetricCard
                title="Vendas Online (Clientes Únicos)"
                value={onlineSalesUniqueCustomersCurrentMonthCount.toLocaleString('pt-BR')}
                icon={<ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--accent-turquoise))]" />}
                subtitle="Clientes únicos que compraram online este mês"
                valueClassName="text-[hsl(var(--accent-turquoise))]"
                hasLeftBorderGradient
              />
            </div>
            <div ref={monthlyAdherenceTrackerRef}>
              <MonthlyAdherenceTracker members={members || []} isLoadingMembers={isLoadingMembers} errorMembers={errorMembers} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div ref={memberRevenueSummaryRef}><MemberRevenueSummary data={members || []} /></div>
              <div ref={delinquentRevenueSummaryRef}><DelinquentRevenueSummary data={members || []} /></div>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="mt-6 space-y-6">
            <div ref={grossRevenueDashboardRef}>
              <GrossRevenueDashboard />
            </div>
            <Separator className="my-8 bg-[hsl(var(--border-color))]" />
            <div ref={receivablesDashboardRef}>
              <ReceivablesDashboard members={members || []} isLoadingMembers={isLoadingMembers} errorMembers={errorMembers} />
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div ref={revenuePerContractChartRef}><RevenuePerContractChart data={members || []} /></div>
              <div ref={membersPerContractChartRef}><MembersPerContractChart data={members || []} /></div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div ref={planTypeChartRef}><PlanTypeChart data={members || []} /></div>
              <div ref={contractStatusChartRef}><ContractStatusChart data={members || []} /></div>
            </div>
          </TabsContent>

          <TabsContent value="delinquents" className="mt-6 space-y-6">
            <DelinquentMembersTable members={members || []} />
          </TabsContent>

          <TabsContent value="prospects" className="mt-6 space-y-6">
            <div ref={prospectsDashboardRef}>
              <ProspectsDashboard members={members || []} isLoadingMembers={isLoadingMembers} errorMembers={errorMembers} />
            </div>
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
              <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger className="bg-[hsl(var(--card-bg))] hover:bg-[hsl(var(--muted))]/50 px-6 py-4 rounded-lg text-lg font-semibold data-[state=open]:rounded-b-none transition-all text-[hsl(var(--foreground))]">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-[hsl(var(--accent-turquoise))]" />
                    <span>Análise de Planos Anuais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 bg-[hsl(var(--card-bg))] rounded-b-lg border border-[hsl(var(--border-color))]">
                  <div ref={annualDashboardRef}>
                    <AnnualDashboard members={members || []} isLoadingMembers={isLoadingMembers} errorMembers={errorMembers} receivablesData={receivablesDataCurrentMonth} isLoadingReceivables={isLoadingReceivablesCurrentMonth} errorReceivables={errorReceivablesCurrentMonth} refetchReceivables={refetchReceivablesCurrentMonth} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-none">
                <AccordionTrigger className="bg-[hsl(var(--card-bg))] hover:bg-[hsl(var(--muted))]/50 px-6 py-4 rounded-lg text-lg font-semibold data-[state=open]:rounded-b-none transition-all text-[hsl(var(--foreground))]">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[hsl(var(--accent-turquoise))]" />
                    <span>Análise de Planos Personal</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 bg-[hsl(var(--card-bg))] rounded-b-lg border border-[hsl(var(--border-color))]">
                  <div ref={personalDashboardRef}>
                    <PersonalDashboard members={members || []} isLoadingMembers={isLoadingMembers} errorMembers={errorMembers} receivablesData={receivablesDataCurrentMonth} isLoadingReceivables={isLoadingReceivablesCurrentMonth} errorReceivables={errorReceivablesCurrentMonth} refetchReceivables={refetchReceivablesCurrentMonth} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-none">
                <AccordionTrigger className="bg-[hsl(var(--card-bg))] hover:bg-[hsl(var(--muted))]/50 px-6 py-4 rounded-lg text-lg font-semibold data-[state=open]:rounded-b-none transition-all text-[hsl(var(--foreground))]">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-[hsl(var(--accent-turquoise))]" />
                    <span>Análise de Vendas Online</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 bg-[hsl(var(--card-bg))] rounded-b-lg border border-[hsl(var(--border-color))]">
                  <div ref={onlineSalesDashboardRef}>
                    <OnlineSalesDashboard receivablesData={receivablesDataCurrentMonth} isLoadingReceivables={isLoadingReceivablesCurrentMonth} errorReceivables={errorReceivablesCurrentMonth} refetchReceivables={refetchReceivablesCurrentMonth} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="frequency" className="mt-6 space-y-6"> {/* Nova TabsContent */}
            <div ref={frequencyDashboardRef}>
              <FrequencyDashboard members={members || []} isLoadingMembers={isLoadingMembers} errorMembers={errorMembers} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;