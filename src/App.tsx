import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"; // Importar useQuery
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import MarketingDashboard from "./pages/MarketingDashboard";
// import WhatsAppConnector from "./pages/WhatsAppConnector"; // Removido
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { HubLayout } from "./components/HubLayout";
import { SessionContextProvider } from "./components/SessionContextProvider";
import { api } from '@/lib/apiClient';
import BirthdaysPage from "./pages/BirthdaysPage"; // Importar a nova página
import UnitRegistration from "./pages/UnitRegistration"; // Importar a nova página de cadastro de unidades

const queryClient = new QueryClient();

console.log("VITE_TASK_WEBHOOK_URL from App.tsx:", import.meta.env.VITE_TASK_WEBHOOK_URL);

const AppContent = () => {
  // Centralizar a busca de dados dos membros aqui
  const { data: members, isLoading: isLoadingMembers, isError: isErrorMembers, error: errorMembers, refetch: refetchMembers } = useQuery<any[], Error>({
    queryKey: ['members'],
    queryFn: async () => {
      const data = await api.get<any[]>('/api/evo-proxy');
      if ((data as any)?.error) throw new Error((data as any).details || (data as any).error);
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  return (
    <BrowserRouter>
      <SessionContextProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <HubLayout 
                members={members || []} 
                isLoadingMembers={isLoadingMembers} 
                errorMembers={isErrorMembers ? errorMembers.message : null}
                refetchMembers={refetchMembers}
              />
            }
          >
            <Route 
              index 
              element={
                <DashboardPage 
                  members={members || []} 
                  isLoadingMembers={isLoadingMembers} 
                  errorMembers={isErrorMembers ? errorMembers.message : null}
                  refetchMembers={refetchMembers}
                />
              } 
            />
            {/* <Route path="whatsapp" element={<WhatsAppConnector />} /> */}
            <Route path="birthdays" element={<BirthdaysPage />} /> {/* Nova rota para aniversariantes */}
            <Route path="units" element={<UnitRegistration />} /> {/* Nova rota para cadastro de unidades */}
            <Route path="marketing" element={<MarketingDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SessionContextProvider>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;