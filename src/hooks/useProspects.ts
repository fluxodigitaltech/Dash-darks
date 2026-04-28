import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { showError } from "@/utils/toast";

interface UseProspectsOptions {
  startDate?: string;
  endDate?: string;
}

export const useProspects = (options?: UseProspectsOptions) => {
  return useQuery({
    queryKey: ["prospects", options?.startDate, options?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.startDate) params.set('registerDateStart', options.startDate);
      if (options?.endDate) params.set('registerDateEnd', options.endDate);
      const qs = params.toString() ? `?${params}` : '';
      const data = await api.get<{ data: any[] }>(`/api/prospects-proxy${qs}`);
      return data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    onError: () => showError("Falha ao buscar dados de prospects."),
  });
};
