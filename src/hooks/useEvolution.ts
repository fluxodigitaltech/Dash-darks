"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { showError } from "@/utils/toast";

interface EvolutionInstance {
  instance_name: string;
  status: 'open' | 'connecting' | 'closed' | 'qrcode';
}

export const useEvolution = () => {
  const fetchUserInstances = useQuery<EvolutionInstance[], Error>({
    queryKey: ["evolutionInstances"],
    queryFn: async () => {
      const data = await api.get<any>('/api/evolution-fetch-instances');
      if (data?.error) throw new Error(data.error);
      return data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
    onError: (error: Error) => showError(`Falha ao carregar instâncias do WhatsApp: ${error.message}`),
  });

  return { fetchUserInstances };
};
