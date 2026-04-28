import { useQuery } from "@tanstack/react-query";
import { parseISO, isWithinInterval, startOfDay } from "date-fns";
import { showError } from "@/utils/toast";
import { parseCurrencyString } from "@/utils/currency";
import { api } from "@/lib/apiClient";

interface RawMktData {
  Data: string;
  Campanha: string;
  Impressões: string;
  Alcance: string;
  "Valor Investido": string;
  Mensagens: string;
  "Custo por Mensagem": string;
}

export interface MktData {
  date: Date;
  campaign: string;
  impressions: number;
  reach: number;
  investedValue: number;
  messages: number;
  costPerMessage: number;
}

interface UseMktDataOptions {
  startDate?: Date;
  endDate?: Date;
  campaignName?: string;
}

export const useMktData = (options?: UseMktDataOptions) => {
  return useQuery<MktData[], Error>({
    queryKey: ["mktData", options?.startDate?.toISOString(), options?.endDate?.toISOString(), options?.campaignName],
    queryFn: async () => {
      const rawData: RawMktData[] = await api.get('/api/mkt-proxy');
      let parsed = (rawData || []).map((item) => ({
        date: startOfDay(parseISO(item.Data)),
        campaign: item.Campanha || 'N/A',
        impressions: parseInt(item.Impressões, 10) || 0,
        reach: parseInt(item.Alcance, 10) || 0,
        investedValue: parseCurrencyString(item["Valor Investido"]),
        messages: parseInt(item.Mensagens, 10) || 0,
        costPerMessage: parseCurrencyString(item["Custo por Mensagem"]),
      }));

      if (options?.startDate && options?.endDate) {
        const start = startOfDay(options.startDate);
        const end = startOfDay(options.endDate);
        parsed = parsed.filter((item) => isWithinInterval(item.date, { start, end }));
      }
      if (options?.campaignName && options.campaignName !== 'Todos') {
        parsed = parsed.filter((item) => item.campaign === options.campaignName);
      }
      return parsed;
    },
    staleTime: 1000 * 60 * 10,
    onError: (error: Error) => showError(`Falha ao carregar dados de marketing: ${error.message}`),
  });
};
