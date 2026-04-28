import { useQuery } from "@tanstack/react-query";
import { showError } from "@/utils/toast";
import { parseCurrencyString } from "@/utils/currency";
import { parseISO, startOfDay } from "date-fns";
import { api } from "@/lib/apiClient";

interface RawBalanceData {
  "Saldo disponível": string;
  Data: string;
}

export interface BalanceData {
  balance: number;
  date: Date;
}

export const useBalanceData = () => {
  return useQuery<BalanceData | null, Error>({
    queryKey: ["balanceData"],
    queryFn: async () => {
      const rawData: RawBalanceData[] = await api.get('/api/balance-proxy');
      if (!rawData || rawData.length === 0) return null;
      const latest = rawData.sort((a, b) => parseISO(b.Data).getTime() - parseISO(a.Data).getTime())[0];
      return {
        balance: parseCurrencyString(latest["Saldo disponível"]),
        date: startOfDay(parseISO(latest.Data)),
      };
    },
    staleTime: 1000 * 60 * 30,
    onError: (error: Error) => showError(`Falha ao carregar saldo disponível: ${error.message}`),
  });
};
