import React, { useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, TrendingUp, Save, LineChart as LineChartIcon, RefreshCw } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { format, startOfMonth, subMonths, parseISO, startOfDay } from 'date-fns'; // Importar startOfDay
import { ptBR } from 'date-fns/locale';
import { calculateAdimplentesCount } from '@/utils/memberCalculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyAdherenceTrackerProps {
  members: any[];
  isLoadingMembers: boolean;
  errorMembers: string | null;
}

interface MonthlyStats {
  id: string;
  month_start_date: string;
  adimplentes_count: number;
  created_at: string;
}

export const MonthlyAdherenceTracker: React.FC<MonthlyAdherenceTrackerProps> = ({
  members,
  isLoadingMembers,
  errorMembers,
}) => {
  const queryClient = useQueryClient();

  // Fetch historical monthly stats
  const { data: monthlyStats, isLoading: isLoadingStats, isError: isErrorStats, error: statsError, refetch: refetchStats } = useQuery<MonthlyStats[]>({
    queryKey: ['monthly_member_stats'],
    queryFn: async () => {
      return api.get<MonthlyStats[]>('/api/monthly-stats');
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Calculate current adimplentes count
  const currentAdimplentesCount = useMemo(() => {
    if (isLoadingMembers || !members) return 0;
    return calculateAdimplentesCount(members);
  }, [members, isLoadingMembers]);

  // Find the latest and second-to-latest saved stats
  const latestSavedStat = useMemo(() => {
    if (!monthlyStats || monthlyStats.length === 0) return null;
    // The query orders by month_start_date ascending, so the last one is the latest.
    return monthlyStats[monthlyStats.length - 1];
  }, [monthlyStats]);

  const secondToLatestSavedStat = useMemo(() => {
    if (!monthlyStats || monthlyStats.length < 2) return null;
    return monthlyStats[monthlyStats.length - 2];
  }, [monthlyStats]);

  const lastSavedCount = latestSavedStat?.adimplentes_count;
  const lastSavedMonthDate = latestSavedStat ? parseISO(latestSavedStat.month_start_date) : startOfMonth(new Date());
  const previousSavedCount = secondToLatestSavedStat?.adimplentes_count;

  // Calculate growth from previous month's saved data
  const growthFromPreviousMonth = useMemo(() => {
    if (lastSavedCount === undefined || previousSavedCount === undefined || previousSavedCount === 0) {
      return null;
    }
    const growth = ((lastSavedCount - previousSavedCount) / previousSavedCount) * 100;
    return growth.toFixed(1);
  }, [lastSavedCount, previousSavedCount]);


  // Prepare data for the chart
  const chartData = useMemo(() => {
    if (!monthlyStats) return [];
    return monthlyStats.map(stat => ({
      month: format(parseISO(stat.month_start_date), 'MMM/yy', { locale: ptBR }),
      adimplentes: stat.adimplentes_count,
    }));
  }, [monthlyStats]);

  // Mutation to save monthly stats via Edge Function
  const saveMonthlyStatsMutation = useMutation({
    mutationFn: async () => {
      return api.post<any>('/api/monthly-stats/save', {});
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Contagem de adimplentes salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['monthly_member_stats'] }); // Refetch stats after saving
    },
    onError: (error) => {
      showError(`Falha ao salvar contagem de adimplentes: ${error.message}`);
    },
  });

  const handleSaveMonthlyStats = () => {
    saveMonthlyStatsMutation.mutate();
  };

  const isLoading = isLoadingMembers || isLoadingStats || saveMonthlyStatsMutation.isPending;
  const hasError = errorMembers || isErrorStats || statsError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  if (hasError) {
    return (
      <Card className="text-center p-6 bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))]">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--danger-color))]">Erro ao Carregar Dados de Adesão Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMembers && <p className="text-[hsl(var(--muted-foreground))] mb-3 whitespace-pre-line">{errorMembers}</p>}
          {statsError && <p className="text-[hsl(var(--muted-foreground))] mb-3 whitespace-pre-line">{statsError.message}</p>}
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['monthly_member_stats'] })} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))]">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Adesão Mensal</h2>
          <Button variant="ghost" size="icon" onClick={() => refetchStats()} title="Atualizar dados">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={handleSaveMonthlyStats}
          disabled={saveMonthlyStatsMutation.isPending || isLoadingMembers}
          className="bg-[hsl(var(--success-color))] hover:bg-[hsl(var(--success-color))]/90 text-[hsl(var(--accent-white))]"
        >
          <Save className={`mr-2 h-4 w-4 ${saveMonthlyStatsMutation.isPending ? 'animate-spin' : ''}`} />
          {saveMonthlyStatsMutation.isPending ? 'Salvando...' : 'Salvar Dados do Mês'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Adimplentes (Início do Mês)</CardTitle>
            <CalendarCheck className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {lastSavedCount !== undefined ? lastSavedCount.toLocaleString('pt-BR') : 'N/A'}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Contagem salva em {format(lastSavedMonthDate, 'MMMM yyyy', { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Adimplentes (Atual)</CardTitle>
            <CalendarCheck className="h-4 w-4 text-[hsl(var(--accent-turquoise))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--accent-turquoise))]">{currentAdimplentesCount.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Contagem atual de alunos adimplentes</p>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Crescimento Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-[hsl(var(--accent-turquoise))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--accent-turquoise))]">
              {growthFromPreviousMonth !== null ? `${growthFromPreviousMonth}%` : 'N/A'}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Em relação ao mês anterior ({previousSavedCount !== undefined ? previousSavedCount.toLocaleString('pt-BR') : 'N/A'})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Histórico de Adimplentes */}
      <Card className="glow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[hsl(var(--foreground))]">Histórico de Adimplentes</CardTitle>
          <LineChartIcon className="h-5 w-5 text-[hsl(var(--accent-turquoise))]" />
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30 stroke-[hsl(var(--border-color))]" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card-bg))', 
                    border: '1px solid hsl(var(--border-color))', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: 'hsl(var(--text-color))'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="adimplentes" stroke="hsl(var(--accent-turquoise))" activeDot={{ r: 8 }} name="Adimplentes" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Nenhum dado histórico disponível para o gráfico.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};