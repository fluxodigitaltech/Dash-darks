import { useQuery } from "@tanstack/react-query";
import { getYear, startOfDay } from "date-fns";
import { showError } from "@/utils/toast";
import { api } from "@/lib/apiClient";

interface RawCelebration {
  Mês: string;
  Data: string;
  Comemoração: string;
}

export interface Celebration {
  date: Date;
  description: string;
}

const monthMap: { [key: string]: number } = {
  "Janeiro": 0, "Fevereiro": 1, "Março": 2, "Abril": 3, "Maio": 4, "Junho": 5,
  "Julho": 6, "Agosto": 7, "Setembro": 8, "Outubro": 9, "Novembro": 10, "Dezembro": 11,
};

export const useCelebrations = () => {
  return useQuery<Celebration[], Error>({
    queryKey: ["celebrations"],
    queryFn: async () => {
      const rawData: RawCelebration[] = await api.get('/api/celebrations-proxy');
      const currentYear = getYear(new Date());
      return (rawData || [])
        .map((item) => {
          const monthIndex = monthMap[item.Mês];
          const day = parseInt(item.Data, 10);
          if (monthIndex === undefined || isNaN(day)) return null;
          const date = new Date(currentYear, monthIndex, day);
          if (date.getMonth() !== monthIndex || date.getDate() !== day) return null;
          return { date: startOfDay(date), description: item.Comemoração };
        })
        .filter((item): item is Celebration => item !== null);
    },
    staleTime: 1000 * 60 * 60 * 24,
    onError: (error: Error) => showError(`Falha ao carregar comemorações: ${error.message}`),
  });
};
