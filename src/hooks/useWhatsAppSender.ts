"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

interface SendMessagePayload {
  phone: string;
  message: string;
  instanceName: string;
  delay?: number;
  presence?: "composing" | "paused";
}

interface SendMessageResponse {
  key: { id: string; remoteJid: string; fromMe: boolean };
  status: number;
  message: string;
}

export const useWhatsAppSender = () => {
  return useMutation<SendMessageResponse, Error, SendMessagePayload>({
    mutationFn: async (payload) => {
      return api.post<SendMessageResponse>('/api/evolution-send-message', payload);
    },
  });
};
