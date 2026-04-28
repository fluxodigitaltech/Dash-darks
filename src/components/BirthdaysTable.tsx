"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Cake, Loader2, CheckCircle, XCircle, Send, MessageSquare, Settings, Plus, Save, Trash2, Info } from 'lucide-react';
import { format, parse, isSameDay, isSameMonth, addMonths, startOfDay, getDayOfYear, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useEvolution } from '@/hooks/useEvolution';
import { useWhatsAppSender } from '@/hooks/useWhatsAppSender';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Select, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoAnimationSelectContent } from '@/components/NoAnimationSelectContent';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface BirthdaysTableProps {
  members: any[];
  isLoadingMembers: boolean;
  errorMembers: string | null;
  refetchMembers: () => void;
}

interface BirthdayMember {
  name: string;
  birthDate: Date;
  originalDateString: string;
  phone: string;
}

type MessageStatus = 'idle' | 'sending' | 'sent' | 'error';
interface StatusState {
  status: MessageStatus;
  error?: string;
}

const BIRTHDAYS_PER_PAGE = 10; // Número de aniversariantes por página

const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return 'N/A';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length < 8) return phone;
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
};

const StatusIndicator: React.FC<{ status: StatusState }> = ({ status }) => {
  switch (status.status) {
    case 'sending':
      return <div className="flex items-center gap-2 text-[hsl(var(--warning-color))]"><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</div>;
    case 'sent':
      return <div className="flex items-center gap-2 text-[hsl(var(--success-color))]"><CheckCircle className="h-4 w-4" /> Enviado</div>;
    case 'error':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-[hsl(var(--danger-color))] cursor-pointer">
                <XCircle className="h-4 w-4" /> Erro
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))] text-[hsl(var(--text-color))]">
              <p>{status.error || 'Erro desconhecido'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    default:
      return <span className="text-[hsl(var(--muted-foreground))]">-</span>;
  }
};

const initialDefaultTemplates = [
  "🎉 Feliz Aniversário, {nome}! A equipe Darks Gym deseja um dia incrível e cheio de energia! Que seu novo ciclo seja repleto de conquistas e treinos intensos! 💪",
  "🥳 Parabéns, {nome}! Hoje é o seu dia! Celebre com muita alegria e venha comemorar na Darks Gym. Te esperamos para um treino especial! 🎂",
  "🎁 {nome}, a Darks Gym te deseja um Feliz Aniversário! Que a felicidade e a saúde te acompanhem sempre. Aproveite seu dia! ✨",
];

export const BirthdaysTable: React.FC<BirthdaysTableProps> = ({
  members,
  isLoadingMembers,
  errorMembers,
  refetchMembers,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { fetchUserInstances } = useEvolution();
  const { data: userInstances, isLoading: isLoadingInstances } = fetchUserInstances;
  const sendWhatsAppMessage = useWhatsAppSender();

  const [messageStatuses, setMessageStatuses] = useState<Record<string, StatusState>>({});
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const stopSendingRef = useRef(false); // Ref para controlar a interrupção do envio em massa
  
  // Gerenciamento de templates
  const [templates, setTemplates] = useState<string[]>(() => {
    const savedTemplates = localStorage.getItem('whatsapp_birthday_templates');
    return savedTemplates ? JSON.parse(savedTemplates) : initialDefaultTemplates;
  });
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [currentTemplateContent, setCurrentTemplateContent] = useState<string>(templates[0] || '');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<BirthdayMember | null>(null);
  const [individualMessage, setIndividualMessage] = useState('');

  // Estados para as configurações de delay
  const [minDelaySeconds, setMinDelaySeconds] = useState(45); // 45 segundos
  const [maxDelaySeconds, setMaxDelaySeconds] = useState(120); // 2 minutos = 120 segundos
  const [pause10Messages, setPause10Messages] = useState(3); // 3 minutos
  const [pause80Messages, setPause80Messages] = useState(60); // 1 hora = 60 minutos

  // Salvar templates no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('whatsapp_birthday_templates', JSON.stringify(templates));
    // Atualiza o conteúdo do textarea se o template selecionado mudar
    setCurrentTemplateContent(templates[selectedTemplateIndex] || '');
  }, [templates, selectedTemplateIndex]);

  // Atualiza o conteúdo do textarea quando o índice selecionado muda
  useEffect(() => {
    setCurrentTemplateContent(templates[selectedTemplateIndex] || '');
  }, [selectedTemplateIndex, templates]);

  const connectedInstanceName = useMemo(() => {
    if (!userInstances) return null;
    const connected = userInstances.find(instance => instance.status === 'open');
    return connected ? connected.instance_name : null;
  }, [userInstances]);

  const todayBirthdays = useMemo(() => {
    if (isLoadingMembers || !members || members.length === 0) return [];

    const today = startOfDay(new Date());
    const birthdays: BirthdayMember[] = [];

    members.forEach(member => {
      const birthDateString = member.DataNascimento;
      const memberName = member.Nome;
      const memberPhone = formatPhoneNumber(member.Celular);

      if (birthDateString && memberName && memberPhone !== 'N/A') {
        try {
          const parsedDate = parse(birthDateString, 'dd/MM/yyyy', new Date());
          
          let thisYearBirthday = new Date(getYear(today), parsedDate.getMonth(), parsedDate.getDate());
          thisYearBirthday = startOfDay(thisYearBirthday);

          if (isSameDay(thisYearBirthday, today)) {
            birthdays.push({
              name: memberName,
              birthDate: thisYearBirthday,
              originalDateString: birthDateString,
              phone: memberPhone,
            });
          }
        } catch (e) {
          // console.warn(`Could not parse birth date for member ${memberName}: ${birthDateString}`, e);
        }
      }
    });

    return birthdays.sort((a, b) => a.name.localeCompare(b.name)); // Ordenar por nome
  }, [members, isLoadingMembers]);

  const totalPages = Math.ceil(todayBirthdays.length / BIRTHDAYS_PER_PAGE);

  const paginatedBirthdays = useMemo(() => {
    const startIndex = (currentPage - 1) * BIRTHDAYS_PER_PAGE;
    const endIndex = startIndex + BIRTHDAYS_PER_PAGE;
    return todayBirthdays.slice(startIndex, endIndex);
  }, [todayBirthdays, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSendIndividualMessage = async () => {
    if (!selectedMember || !connectedInstanceName || !individualMessage) {
      showError("Dados incompletos para enviar a mensagem.");
      return;
    }

    setMessageStatuses(prev => ({ ...prev, [selectedMember.phone]: { status: 'sending' } }));
    try {
      await sendWhatsAppMessage.mutateAsync({
        phone: selectedMember.phone,
        message: individualMessage,
        instanceName: connectedInstanceName,
        delay: 1800, // Adicionado delay padrão para a Evolution API
        presence: "composing", // Adicionado presence padrão para a Evolution API
      });
      setMessageStatuses(prev => ({ ...prev, [selectedMember.phone]: { status: 'sent' } }));
      showSuccess(`Mensagem enviada para ${selectedMember.name}!`);
      setIsDialogOpen(false);
    } catch (error: any) {
      setMessageStatuses(prev => ({ ...prev, [selectedMember.phone]: { status: 'error', error: error.message } }));
      showError(`Falha ao enviar mensagem para ${selectedMember.name}: ${error.message}`);
    }
  };

  const handleOpenDialog = (member: BirthdayMember) => {
    setSelectedMember(member);
    // Usa o template atualmente selecionado para a mensagem individual
    const personalizedMessage = (templates[selectedTemplateIndex] || '').replace(/{nome}/g, member.name.split(' ')[0]);
    setIndividualMessage(personalizedMessage);
    setIsDialogOpen(true);
  };

  const handleSendBulkMessages = async () => {
    if (!connectedInstanceName) {
      showError("Nenhuma instância do WhatsApp conectada. Por favor, conecte uma na página 'WhatsApp'.");
      return;
    }
    if (todayBirthdays.length === 0) {
      showError("Não há aniversariantes hoje para enviar mensagens.");
      return;
    }
    if (templates.length === 0) {
      showError("Nenhum modelo de mensagem disponível. Crie um modelo antes de enviar.");
      return;
    }

    setIsSendingBulk(true);
    stopSendingRef.current = false; // Resetar a ref de parada
    setMessageStatuses({}); // Limpa status anteriores

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Usar os valores dos estados para os delays
    const minDelayPerMessageMs = minDelaySeconds * 1000;
    const maxDelayPerMessageMs = maxDelaySeconds * 1000;
    const pauseAfter10MessagesMs = pause10Messages * 60 * 1000;
    const pauseAfter80MessagesMs = pause80Messages * 60 * 1000;

    let messagesSentCount = 0;

    for (const member of todayBirthdays) {
      if (stopSendingRef.current) { // Check if sending was stopped by user
        break; 
      }

      // Pausa a cada 80 mensagens
      if (messagesSentCount > 0 && messagesSentCount % 80 === 0) {
        showSuccess(`Pausando por ${pause80Messages} minutos após ${messagesSentCount} mensagens. Não feche a página.`);
        await sleep(pause80MessagesMs);
        if (stopSendingRef.current) break; // Verificar novamente se o envio foi interrompido durante a pausa longa
      }

      // Pausa a cada 10 mensagens
      if (messagesSentCount > 0 && messagesSentCount % 10 === 0) {
        showSuccess(`Pausando por ${pause10Messages} minutos após ${messagesSentCount} mensagens.`);
        await sleep(pauseAfter10MessagesMs);
        if (stopSendingRef.current) break; // Verificar novamente se o envio foi interrompido durante a pausa
      }

      setMessageStatuses(prev => ({ ...prev, [member.phone]: { status: 'sending' } }));
      const firstName = (member.name && typeof member.name === 'string') ? member.name.split(' ')[0] : 'Cliente';
      
      // Seleciona um template aleatoriamente para cada mensagem
      const randomTemplateIndexForBulk = Math.floor(Math.random() * templates.length);
      const personalizedMessage = templates[randomTemplateIndexForBulk].replace(/{nome}/g, firstName);
      
      try {
        await sendWhatsAppMessage.mutateAsync({
          phone: member.phone,
          message: personalizedMessage,
          instanceName: connectedInstanceName,
          delay: 1800, // Adicionado delay padrão para a Evolution API
          presence: "composing", // Adicionado presence padrão para a Evolution API
        });
        setMessageStatuses(prev => ({ ...prev, [member.phone]: { status: 'sent' } }));
        messagesSentCount++;
      } catch (error: any) {
        setMessageStatuses(prev => ({ ...prev, [member.phone]: { status: 'error', error: error.message } }));
      }

      // Atraso aleatório entre as mensagens
      const randomDelayMs = Math.floor(Math.random() * (maxDelayPerMessageMs - minDelayPerMessageMs + 1)) + minDelayPerMessageMs;
      await sleep(randomDelayMs);
    }

    setIsSendingBulk(false);
    if (!stopSendingRef.current) { // Só mostra sucesso se não foi interrompido pelo usuário
      showSuccess("Envio em massa concluído!");
    }
  };

  const handleStopBulkSending = () => {
    stopSendingRef.current = true; // Define a ref para parar o envio
    setIsSendingBulk(false);
    showError("Envio em massa interrompido.");
  };

  const handleNewTemplate = () => {
    const newTemplates = [...templates, `Novo modelo de mensagem {nome} ${templates.length + 1}`];
    setTemplates(newTemplates);
    setSelectedTemplateIndex(newTemplates.length - 1); // Seleciona o novo modelo
    setCurrentTemplateContent(newTemplates[newTemplates.length - 1]);
    showSuccess("Novo modelo criado!");
  };

  const handleSaveTemplate = () => {
    if (templates.length === 0) {
      showError("Não há modelos para salvar.");
      return;
    }
    const updatedTemplates = [...templates];
    updatedTemplates[selectedTemplateIndex] = currentTemplateContent;
    setTemplates(updatedTemplates);
    showSuccess("Modelo salvo com sucesso!");
  };

  const handleDeleteTemplate = () => {
    if (templates.length === 0) {
      showError("Não há modelos para excluir.");
      return;
    }
    const updatedTemplates = templates.filter((_, i) => i !== selectedTemplateIndex);
    setTemplates(updatedTemplates);
    // Se não houver mais templates, define o conteúdo como vazio e o índice como 0
    if (updatedTemplates.length === 0) {
      setSelectedTemplateIndex(0);
      setCurrentTemplateContent('');
    } else {
      // Caso contrário, seleciona o primeiro template ou o anterior se o excluído era o último
      setSelectedTemplateIndex(Math.max(0, selectedTemplateIndex - 1));
    }
    showSuccess("Modelo excluído com sucesso!");
  };

  const isSendBulkDisabled = isSendingBulk || isLoadingInstances || !connectedInstanceName || todayBirthdays.length === 0 || templates.length === 0;

  if (isLoadingMembers) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (errorMembers) {
    return (
      <Card className="text-center p-6 bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))]">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--danger-color))]">Erro ao Carregar Aniversariantes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--muted-foreground))] mb-3 whitespace-pre-line">{errorMembers}</p>
          <Button onClick={() => refetchMembers()} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))]">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--foreground))]">Configurações de Mensagens de Aniversário</CardTitle>
          <CardDescription className="text-[hsl(var(--muted-foreground))]">
            Defina o modelo de mensagem para envio em massa e gerencie as instâncias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connectedInstanceName && !isLoadingInstances && (
            <Alert variant="destructive" className="bg-[hsl(var(--danger-color))]/20 border-[hsl(var(--danger-color))] text-[hsl(var(--danger-color))]">
              <XCircle className="h-4 w-4" />
              <AlertTitle className="text-[hsl(var(--danger-color))]">Nenhuma Instância Conectada!</AlertTitle>
              <AlertDescription>
                Por favor, vá para a página <a href="/whatsapp" className="underline text-[hsl(var(--accent-white))]">WhatsApp</a> e conecte uma instância para poder enviar mensagens.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="bulkMessageTemplate" className="text-[hsl(var(--foreground))]">Gerenciar Modelos de Mensagem (use {`{nome}`})</Label>
            <Select 
              value={String(selectedTemplateIndex)} 
              onValueChange={(value) => setSelectedTemplateIndex(Number(value))} 
              disabled={isSendingBulk || templates.length === 0}
            >
              <SelectTrigger className={cn(
                "w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] shadow-md text-[hsl(var(--foreground))]",
                "hover:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
              )}>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <NoAnimationSelectContent className="bg-[hsl(var(--card-bg))] border border-[hsl(var(--border-color))] shadow-lg text-[hsl(var(--text-color))]">
                {templates.map((template, index) => (
                  <SelectItem key={index} value={String(index)}>
                    Modelo {index + 1}
                  </SelectItem>
                ))}
              </NoAnimationSelectContent>
            </Select>
            <Textarea
              id="currentTemplateContent"
              value={currentTemplateContent}
              onChange={(e) => setCurrentTemplateContent(e.target.value)}
              rows={4}
              className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))] mt-2"
              disabled={isSendingBulk || templates.length === 0}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <Button onClick={handleNewTemplate} disabled={isSendingBulk} variant="outline" className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]">
                <Plus className="mr-2 h-4 w-4" /> Novo Modelo
              </Button>
              <Button onClick={handleSaveTemplate} disabled={isSendingBulk || templates.length === 0 || !currentTemplateContent.trim()} variant="outline" className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]">
                <Save className="mr-2 h-4 w-4" /> Salvar Modelo
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isSendingBulk || templates.length === 0}
                    className="bg-[hsl(var(--danger-color))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--danger-color))]/90"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir Modelo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))] text-[hsl(var(--text-color))]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[hsl(var(--foreground))]">Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[hsl(var(--muted-foreground))]">
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o modelo selecionado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 hover:text-[hsl(var(--accent-white))] border-[hsl(var(--border-color))]">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTemplate} className="bg-[hsl(var(--danger-color))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--danger-color))]/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="delay-settings" className="border-none">
              <AccordionTrigger className="bg-[hsl(var(--secondary-black))] hover:bg-[hsl(var(--muted))]/50 px-4 py-3 rounded-lg text-base font-semibold data-[state=open]:rounded-b-none transition-all text-[hsl(var(--foreground))]">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                  <span>Configurações de Delay e Pausas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-[hsl(var(--secondary-black))] rounded-b-lg border border-[hsl(var(--border-color))] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minDelaySeconds" className="text-[hsl(var(--foreground))]">Delay Mínimo por Mensagem (segundos)</Label>
                    <Input
                      id="minDelaySeconds"
                      type="number"
                      value={minDelaySeconds}
                      onChange={(e) => setMinDelaySeconds(Number(e.target.value))}
                      min={1}
                      disabled={isSendingBulk}
                      className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDelaySeconds" className="text-[hsl(var(--foreground))]">Delay Máximo por Mensagem (segundos)</Label>
                    <Input
                      id="maxDelaySeconds"
                      type="number"
                      value={maxDelaySeconds}
                      onChange={(e) => setMaxDelaySeconds(Number(e.target.value))}
                      min={minDelaySeconds}
                      disabled={isSendingBulk}
                      className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pause10Messages" className="text-[hsl(var(--foreground))]">Pausa a cada 10 Mensagens (minutos)</Label>
                    <Input
                      id="pause10Messages"
                      type="number"
                      value={pause10Messages}
                      onChange={(e) => setPause10Messages(Number(e.target.value))}
                      min={0}
                      disabled={isSendingBulk}
                      className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pause80Messages" className="text-[hsl(var(--foreground))]">Pausa a cada 80 Mensagens (minutos)</Label>
                    <Input
                      id="pause80Messages"
                      type="number"
                      value={pause80Messages}
                      onChange={(e) => setPause80Messages(Number(e.target.value))}
                      min={0}
                      disabled={isSendingBulk}
                      className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-wrap gap-2 mt-4">
            {!isSendingBulk ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        onClick={handleSendBulkMessages}
                        disabled={isSendBulkDisabled}
                        className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90"
                      >
                        <Send className="mr-2 h-4 w-4" /> Enviar para Todos ({todayBirthdays.length})
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isSendBulkDisabled && (
                    <TooltipContent className="bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))] text-[hsl(var(--text-color))]">
                      <p>
                        {isLoadingInstances ? "Carregando instâncias..." :
                         !connectedInstanceName ? "Nenhuma instância conectada." :
                         todayBirthdays.length === 0 ? "Nenhum aniversariante hoje." :
                         templates.length === 0 ? "Nenhum modelo de mensagem disponível." :
                         "O envio já está em progresso."}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                onClick={handleStopBulkSending}
                variant="destructive"
                className="bg-[hsl(var(--danger-color))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--danger-color))]/90"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parar Envio
              </Button>
            )}
            <Button variant="outline" onClick={() => setMessageStatuses({})} disabled={isSendingBulk}>
              Limpar Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[hsl(var(--foreground))]">Aniversariantes de Hoje ({todayBirthdays.length})</CardTitle>
            <CardDescription className="text-[hsl(var(--muted-foreground))]">
              Alunos que fazem aniversário hoje e podem receber mensagens.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {todayBirthdays.length > 0 ? (
            <div className="rounded-md border border-[hsl(var(--border-color))] bg-[hsl(var(--card-bg))] text-[hsl(var(--text-color))] max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-[hsl(var(--secondary-black))] sticky top-0">
                  <TableRow>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Nome do Aluno</TableHead>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Data de Nascimento</TableHead>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Celular</TableHead>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Status do Envio</TableHead>
                    <TableHead className="text-[hsl(var(--accent-silver))]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBirthdays.map((bday, index) => (
                    <TableRow key={index} className="border-b border-[hsl(var(--border-color))] hover:bg-[hsl(var(--secondary-black))]/50">
                      <TableCell className="font-medium text-[hsl(var(--foreground))]">{bday.name}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{bday.originalDateString}</TableCell>
                      <TableCell className="text-[hsl(var(--foreground))]">{bday.phone}</TableCell>
                      <TableCell>
                        <StatusIndicator status={messageStatuses[bday.phone] || { status: 'idle' }} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(bday)}
                          disabled={!connectedInstanceName || isSendingBulk}
                          className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Cake className="h-12 w-12 text-[hsl(var(--accent-turquoise))]" />
              <p className="mt-4 text-[hsl(var(--muted-foreground))]">Nenhum aniversariante encontrado para hoje.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 py-2 text-sm text-[hsl(var(--muted-foreground))]">
                  Página {currentPage} de {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[hsl(var(--card-bg))] border-[hsl(var(--border-color))] text-[hsl(var(--text-color))]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--foreground))]">Enviar Mensagem para {selectedMember?.name}</DialogTitle>
            <DialogDescription className="text-[hsl(var(--muted-foreground))]">
              Edite a mensagem e envie para o WhatsApp de {selectedMember?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="individualMessage" className="text-[hsl(var(--foreground))]">Mensagem</Label>
              <Textarea
                id="individualMessage"
                value={individualMessage}
                onChange={(e) => setIndividualMessage(e.target.value)}
                rows={5}
                className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]">
              Cancelar
            </Button>
            <Button
              onClick={handleSendIndividualMessage}
              disabled={sendWhatsAppMessage.isPending || !individualMessage.trim() || !connectedInstanceName}
              className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90"
            >
              {sendWhatsAppMessage.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Mensagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};