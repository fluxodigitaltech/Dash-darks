import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { showError } from "@/utils/toast";

interface UseReceivablesOptions {
  startDate?: string;
  endDate?: string;
}

export const useReceivables = (options?: UseReceivablesOptions) => {
  return useQuery({
    queryKey: ["receivables", options?.startDate, options?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.startDate) params.set('dtLancamentoDe', options.startDate);
      if (options?.endDate) params.set('dtLancamentoAte', options.endDate);
      const qs = params.toString() ? `?${params}` : '';
      const data = await api.get<{ data: any[] }>(`/api/receivables-proxy${qs}`);
      return data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    onError: () => showError("Falha ao buscar dados de recebíveis."),
  });
};
