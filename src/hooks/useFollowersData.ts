import { useQuery } from "@tanstack/react-query";
import { showError } from "@/utils/toast";
import { parseISO, startOfDay } from "date-fns";
import { api } from "@/lib/apiClient";

interface RawFollowersData {
  Seguidores: string;
  "Data da consulta": string;
}

export interface FollowersData {
  followers: number;
  date: Date;
}

export const useFollowersData = () => {
  return useQuery<FollowersData[], Error>({
    queryKey: ["followersData"],
    queryFn: async () => {
      const rawData: RawFollowersData[] = await api.get('/api/followers-proxy');
      return (rawData || [])
        .map((item) => ({
          followers: parseInt(item.Seguidores, 10) || 0,
          date: startOfDay(parseISO(item["Data da consulta"])),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    staleTime: 1000 * 60 * 60,
    onError: (error: Error) => showError(`Falha ao carregar dados de seguidores: ${error.message}`),
  });
};
