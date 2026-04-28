"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building,
  Clock,
  MapPin,
  Phone,
  Image,
  Info,
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  UploadCloud, // Novo ícone para upload
  Tag, // Para promoção
  Instagram as InstagramIcon, // Para Instagram
  Link as LinkIcon, // Para link de compra
  Hourglass, // Para Em Breve
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { NoAnimationSelectContent } from '@/components/NoAnimationSelectContent';
import { Badge } from '@/components/ui/badge';

// NocoDB API Configuration
const API_CONFIG = {
  BASE_URL: 'https://auto-nocodb.fesqdn.easypanel.host/api/v2/tables',
  TABLE_ID: 'm02vprrpto5vac3', // ID da tabela "cadastro-de-unidades"
  VIEW_ID: 'vw97xyuevbzk8sj0', // ID da visualização
  API_TOKEN: import.meta.env.VITE_NOCODB_API_TOKEN, // Get from .env
  DEFAULT_LIMIT: 100,
};

// Lista de modalidades — adicione novas modalidades aqui conforme necessário
const MODALIDADES = [
  'FitDance',
  'Boxe',
  'Muay Thai',
  'RitBox',
  'Pilates Solo',
];

// Cloudinary Configuration
const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dmcjlooii/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'unidade'; // O preset que você mencionou

// Zod schema for form validation
const unitFormSchema = z.object({
  Unidade: z.string().min(1, { message: 'O nome da Unidade é obrigatório.' }),
  Horario: z.string().optional(),
  Modalidade: z.string().optional(),
  Foto: z.string().optional(), // Alterado para string opcional, pois será uma URL após o upload
  WhatsApp: z.string().optional(),
  Descricao: z.string().optional(),
  Longitude: z.string().optional(),
  Latitude: z.string().optional(),
  Status: z.enum(['Ativo', 'Inativo', 'Em Manutenção']).default('Ativo'),
  DataCadastro: z.string().optional(), // Will be auto-filled
  Categoria: z.enum(['Funcionando', 'Em Breve']).optional(),
  Promocao: z.enum(['Sim', 'Não']).optional(), // Removido '' do enum
  Instagram: z.string().optional(), // Novo campo
  'Link de compra': z.string().optional(), // Corrigido para 'Link de compra'
  EmBreve: z.enum(['Sim', 'Não']).optional(), // Removido '' do enum
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface Unit {
  Id: number;
  Unidade: string;
  Horario: string;
  Modalidade: string;
  Foto: string;
  WhatsApp: string;
  Descricao: string;
  Longitude: string;
  Latitude: string;
  Status: 'Ativo' | 'Inativo' | 'Em Manutenção';
  DataCadastro: string;
  Categoria: 'Funcionando' | 'Em Breve';
  Promocao: 'Sim' | 'Não';
  Instagram: string;
  'Link de compra': string;
  EmBreve: 'Sim' | 'Não';
}

// API Headers
const headers = {
  'Content-Type': 'application/json',
  'xc-token': API_CONFIG.API_TOKEN,
};

// Helper functions
const formatWhatsApp = (whatsapp: string | null | undefined): string => {
  if (!whatsapp) return '-';
  const numbers = whatsapp.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
  }
  return numbers; // Retorna apenas os números para o link do WhatsApp
};

const createMapsLink = (lat: string | null | undefined, lng: string | null | undefined): React.ReactNode => {
  if (!lat || !lng) return '-';
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (isNaN(parsedLat) || isNaN(parsedLng)) return '-';
  return (
    <a
      href={`https://maps.google.com/?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[hsl(var(--accent-turquoise))] hover:underline flex items-center gap-1"
    >
      <MapPin className="h-4 w-4" /> Ver no Maps
    </a>
  );
};

const UnitRegistration: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Estado para o arquivo selecionado
  const [uploadingImage, setUploadingImage] = useState(false); // Estado para o status de upload
  const [imageUrlPreview, setImageUrlPreview] = useState<string | null>(null); // Estado para a pré-visualização da imagem

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      Unidade: '',
      Horario: '',
      Modalidade: '',
      Foto: '',
      WhatsApp: '',
      Descricao: '',
      Longitude: '',
      Latitude: '',
      Status: 'Ativo',
      DataCadastro: '',
      Categoria: undefined,
      Promocao: undefined,
      Instagram: '',
      'Link de compra': '',
      EmBreve: undefined,
    },
  });

  // Efeito para atualizar a pré-visualização da imagem quando o valor de 'Foto' do formulário muda (ex: ao editar)
  useEffect(() => {
    const currentFoto = form.getValues('Foto');
    if (currentFoto && !selectedFile) { // Só atualiza se não houver um novo arquivo selecionado
      setImageUrlPreview(currentFoto);
    } else if (!selectedFile) {
      setImageUrlPreview(null);
    }
  }, [form.watch('Foto'), selectedFile]);

  // Fetch units
  const {
    data: units,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Unit[], Error>({
    queryKey: ['units'],
    queryFn: async () => {
      if (!API_CONFIG.API_TOKEN) {
        throw new Error('VITE_NOCODB_API_TOKEN não configurado no ambiente.');
      }
      const url = `${API_CONFIG.BASE_URL}/${API_CONFIG.TABLE_ID}/records?viewId=${API_CONFIG.VIEW_ID}&limit=${API_CONFIG.DEFAULT_LIMIT}&sort=-Id`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Dados de unidades retornados pelo NocoDB:", data.list); // LOG DE DEBUG
      return data.list || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    onError: (err) => {
      showError(`Falha ao carregar unidades: ${err.message}`);
    },
  });

  // Função para fazer upload da imagem para o Cloudinary
  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Cloudinary upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data.secure_url;
    } finally {
      setUploadingImage(false);
    }
  };

  // Create/Update unit mutation
  const saveUnitMutation = useMutation<any, Error, UnitFormValues & { Id?: number }>({
    mutationFn: async (unitData) => {
      if (!API_CONFIG.API_TOKEN) {
        throw new Error('VITE_NOCODB_API_TOKEN não configurado no ambiente.');
      }
      let response;
      let apiUrl = `${API_CONFIG.BASE_URL}/${API_CONFIG.TABLE_ID}/records`;

      console.log("Payload enviado para NocoDB:", unitData); // LOG DE DEBUG

      if (unitData.Id) {
        // Update existing record
        const payload = [{ Id: unitData.Id, ...unitData }];
        response = await fetch(apiUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        // Create new record
        const now = new Date();
        const newUnitData = {
          ...unitData,
          DataCadastro: now.toISOString().split('T')[0], // YYYY-MM-DD
        };
        const payload = [newUnitData];
        response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      showSuccess(
        variables.Id
          ? `✅ Unidade "${variables.Unidade}" atualizada com sucesso!`
          : `✅ Unidade "${variables.Unidade}" criada com sucesso!`
      );
      form.reset();
      setEditingRecordId(null);
      setSelectedFile(null); // Limpar arquivo selecionado após sucesso
      setImageUrlPreview(null); // Limpar pré-visualização
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (err) => {
      showError(`❌ Erro ao salvar unidade: ${err.message}`);
    },
  });

  // Delete unit mutation
  const deleteUnitMutation = useMutation<any, Error, { id: number; name: string }>({
    mutationFn: async ({ id }) => {
      if (!API_CONFIG.API_TOKEN) {
        throw new Error('VITE_NOCODB_API_TOKEN não configurado no ambiente.');
      }
      const url = `${API_CONFIG.BASE_URL}/${API_CONFIG.TABLE_ID}/records`;
      const payload = [{ Id: id }];

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      showSuccess(`✅ Unidade "${variables.name}" excluída com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['units'] });
      if (editingRecordId === variables.id) {
        form.reset();
        setEditingRecordId(null);
        setSelectedFile(null);
        setImageUrlPreview(null);
      }
    },
    onError: (err) => {
      showError(`❌ Erro ao excluir unidade: ${err.message}`);
    },
  });

  const onSubmit = async (values: UnitFormValues) => {
    console.log("Valores do formulário antes de salvar:", values); // LOG DE DEBUG
    let finalFotoUrl = values.Foto; // Começa com a URL existente do formulário

    if (selectedFile) {
      try {
        showSuccess('Fazendo upload da imagem...');
        finalFotoUrl = await uploadImageToCloudinary(selectedFile);
        showSuccess('Upload da imagem concluído!');
      } catch (uploadError: any) {
        showError(`Falha no upload da imagem: ${uploadError.message}`);
        return; // Interrompe o envio se o upload falhar
      }
    } else if (values.Foto === '') {
      // Se nenhum arquivo novo foi selecionado e o campo Foto foi limpo, garante que seja vazio
      finalFotoUrl = '';
    }

    // Agora envia com a URL final da foto
    saveUnitMutation.mutate({ ...values, Foto: finalFotoUrl, Id: editingRecordId || undefined });
  };

  const handleEdit = (unit: Unit) => {
    setEditingRecordId(unit.Id);
    form.reset({
      Unidade: unit.Unidade || '',
      Horario: unit.Horario || '',
      Modalidade: unit.Modalidade || '',
      Foto: unit.Foto || '',
      WhatsApp: unit.WhatsApp || '',
      Descricao: unit.Descricao || '',
      Longitude: unit.Longitude || '',
      Latitude: unit.Latitude || '',
      Status: unit.Status || 'Ativo',
      DataCadastro: unit.DataCadastro || '',
      Categoria: (unit.Categoria === 'Funcionando' || unit.Categoria === 'Em Breve' ? unit.Categoria : undefined) as UnitFormValues['Categoria'],
      Promocao: (unit.Promocao === 'Sim' || unit.Promocao === 'Não' ? unit.Promocao : undefined) as UnitFormValues['Promocao'],
      Instagram: unit.Instagram || '',
      'Link de compra': unit['Link de compra'] || '',
      EmBreve: (unit.EmBreve === 'Sim' || unit.EmBreve === 'Não' ? unit.EmBreve : undefined) as UnitFormValues['EmBreve'],
    });
    setSelectedFile(null); // Limpa o arquivo selecionado ao editar
    setImageUrlPreview(unit.Foto || null); // Define a pré-visualização para a foto existente
    document.getElementById('unit-form-card')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearForm = () => {
    form.reset();
    setEditingRecordId(null);
    setSelectedFile(null); // Limpa o arquivo selecionado
    setImageUrlPreview(null); // Limpa a pré-visualização
    showSuccess('Formulário limpo!');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImageUrlPreview(URL.createObjectURL(file)); // Mostra pré-visualização local
      form.setValue('Foto', ''); // Limpa o campo Foto do formulário, será preenchido pelo upload
    } else {
      setSelectedFile(null);
      setImageUrlPreview(form.getValues('Foto') || null); // Reverte para a URL existente se nenhum novo arquivo for selecionado
    }
  };

  const totalUnits = units?.length || 0;

  if (!API_CONFIG.API_TOKEN) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8 bg-[hsl(var(--background))]">
        <Alert variant="destructive" className="max-w-md text-center">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro de Configuração da API</AlertTitle>
          <AlertDescription>
            A variável de ambiente `VITE_NOCODB_API_TOKEN` não está configurada. Por favor, adicione-a ao seu arquivo `.env`.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-[hsl(var(--background))]">
      <div className="flex items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Cadastro de Unidades</h1>
      </div>

      <Card id="unit-form-card" className="glow-card">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--foreground))]">
            {editingRecordId ? '✏️ Editar Unidade' : '➕ Nova Unidade'}
          </CardTitle>
          <CardDescription className="text-[hsl(var(--muted-foreground))]">
            Preencha os detalhes para {editingRecordId ? 'atualizar' : 'cadastrar'} uma unidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="Unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Unidade <span className="text-[hsl(var(--danger-color))]">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Unidade Centro"
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Horario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Horário de Funcionamento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 08:00 às 18:00"
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Modalidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Modalidade</FormLabel>
                      <FormControl>
                        <>
                          <Input
                            {...field}
                            list="modalidade-options"
                            placeholder="Selecione ou digite uma modalidade..."
                            className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                          />
                          <datalist id="modalidade-options">
                            {MODALIDADES.map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="Foto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Foto da Unidade</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                            disabled={uploadingImage}
                          />
                          {imageUrlPreview && (
                            <img
                              src={imageUrlPreview}
                              alt="Preview"
                              className="w-16 h-16 object-cover rounded-md border border-[hsl(var(--border-color))]"
                            />
                          )}
                          {!imageUrlPreview && !selectedFile && (
                            <div className="w-16 h-16 flex items-center justify-center rounded-md border border-[hsl(var(--border-color))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                              <Image className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="WhatsApp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">WhatsApp</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(11) 99999-9999"
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="Descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[hsl(var(--foreground))]">Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre a unidade..."
                        {...field}
                        className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="Longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Longitude</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: -46.633308"
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Latitude</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: -23.550520"
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Categoria + Novos campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="Categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            "w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] shadow-md text-[hsl(var(--foreground))]",
                            "hover:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
                          )}>
                            <SelectValue placeholder="Selecione a categoria..." />
                          </SelectTrigger>
                        </FormControl>
                        <NoAnimationSelectContent className="bg-[hsl(var(--card-bg))] border border-[hsl(var(--border-color))] shadow-lg text-[hsl(var(--text-color))]">
                          <SelectItem value="Funcionando">Funcionando</SelectItem>
                          <SelectItem value="Em Breve">Em Breve</SelectItem>
                        </NoAnimationSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Promocao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Promoção</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            "w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] shadow-md text-[hsl(var(--foreground))]",
                            "hover:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
                          )}>
                            <SelectValue placeholder="Tem promoção?" />
                          </SelectTrigger>
                        </FormControl>
                        <NoAnimationSelectContent className="bg-[hsl(var(--card-bg))] border border-[hsl(var(--border-color))] shadow-lg text-[hsl(var(--text-color))]">
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </NoAnimationSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Instagram</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Link do Instagram"
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Link de compra" // Corrigido para 'Link de compra'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Link de Compra</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Link para compra de planos"
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="EmBreve"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Em Breve</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            "w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] shadow-md text-[hsl(var(--foreground))]",
                            "hover:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
                          )}>
                            <SelectValue placeholder="Unidade em breve?" />
                          </SelectTrigger>
                        </FormControl>
                        <NoAnimationSelectContent className="bg-[hsl(var(--card-bg))] border border-[hsl(var(--border-color))] shadow-lg text-[hsl(var(--text-color))]">
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </NoAnimationSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="Status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            "w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] shadow-md text-[hsl(var(--foreground))]",
                            "hover:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
                          )}>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <NoAnimationSelectContent className="bg-[hsl(var(--card-bg))] border border-[hsl(var(--border-color))] shadow-lg text-[hsl(var(--text-color))]">
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                          <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                        </NoAnimationSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="DataCadastro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(var(--foreground))]">Data de Cadastro</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Auto-preenchido"
                          readOnly
                          {...field}
                          className="bg-[hsl(var(--input))] border-[hsl(var(--border-color))] text-[hsl(var(--muted-foreground))]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-[hsl(var(--border-color))]">
                <Button type="submit" disabled={saveUnitMutation.isPending || uploadingImage} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90">
                  {saveUnitMutation.isPending || uploadingImage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {editingRecordId ? 'Atualizar Unidade' : 'Salvar Unidade'}
                </Button>
                <Button type="button" onClick={handleClearForm} variant="outline" className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]">
                  Limpar Formulário
                </Button>
                <Button type="button" onClick={() => refetch()} variant="outline" className="bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Recarregar Lista
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--foreground))]">📄 Unidades Cadastradas</CardTitle>
          <CardDescription className="text-[hsl(var(--muted-foreground))]">
            Visualize e gerencie todas as unidades registradas. Total de unidades: <span className="font-semibold text-[hsl(var(--accent-turquoise))]">{totalUnits}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent-turquoise))] mb-4" />
              <p className="text-[hsl(var(--muted-foreground))]">Carregando unidades...</p>
            </div>
          ) : isError ? (
            <Alert variant="destructive" className="text-center">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar Unidades</AlertTitle>
              <AlertDescription>
                {error?.message || 'Ocorreu um erro desconhecido ao carregar as unidades.'}
                <Button onClick={() => refetch()} className="mt-3 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))]">
                  Tentar Novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : units && units.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((unit) => (
                <Card key={unit.Id} className="glow-card flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))]">
                        {unit.Unidade || 'Unidade Sem Nome'}
                      </CardTitle>
                      <div className="flex items-center gap-1 flex-wrap">
                        {unit.Categoria && (
                          <Badge
                            className={cn(
                              'text-xs font-medium',
                              unit.Categoria === 'Funcionando' && 'bg-[hsl(var(--accent-turquoise))]/20 text-[hsl(var(--accent-turquoise))] border border-[hsl(var(--accent-turquoise))]/40',
                              unit.Categoria === 'Em Breve' && 'bg-[hsl(var(--warning-color))]/20 text-[hsl(var(--warning-color))] border border-[hsl(var(--warning-color))]/40'
                            )}
                          >
                            {unit.Categoria === 'Funcionando' ? '✅ Funcionando' : '⏳ Em Breve'}
                          </Badge>
                        )}
                        <Badge
                          className={cn(
                            'text-xs font-medium',
                            unit.Status === 'Ativo' && 'bg-[hsl(var(--success-color))] text-[hsl(var(--accent-white))]',
                            unit.Status === 'Inativo' && 'bg-[hsl(var(--danger-color))] text-[hsl(var(--accent-white))]',
                            unit.Status === 'Em Manutenção' && 'bg-[hsl(var(--warning-color))] text-[hsl(var(--primary-black))]'
                          )}
                        >
                          {unit.Status || 'Não definido'}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                      ID: {unit.Id} | Cadastrado em: {unit.DataCadastro || '-'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {unit.Horario && (
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                        {unit.Horario}
                      </p>
                    )}
                    {unit.Modalidade && (
                      <p className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                        {unit.Modalidade}
                      </p>
                    )}
                    {unit.WhatsApp && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                        <a
                          href={`https://wa.me/${formatWhatsApp(unit.WhatsApp)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[hsl(var(--foreground))] hover:underline"
                        >
                          {formatWhatsApp(unit.WhatsApp)}
                        </a>
                      </p>
                    )}
                    {(unit.Latitude || unit.Longitude) && (
                      <p className="flex items-center gap-2">
                        {createMapsLink(unit.Latitude, unit.Longitude)}
                      </p>
                    )}
                    {unit.Promocao && (unit.Promocao === 'Sim' || unit.Promocao === 'Não') && (
                      <p className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                        Promoção: <span className="font-semibold text-[hsl(var(--foreground))]">{unit.Promocao}</span>
                      </p>
                    )}
                    {unit.Instagram && (
                      <p className="flex items-center gap-2">
                        <InstagramIcon className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                        <a
                          href={unit.Instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[hsl(var(--foreground))] hover:underline"
                        >
                          Instagram
                        </a>
                      </p>
                    )}
                    {unit['Link de compra'] && ( // Corrigido para 'Link de compra'
                      <p className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                        <a
                          href={unit['Link de compra']} // Corrigido para 'Link de compra'
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[hsl(var(--foreground))] hover:underline"
                        >
                          Link de Compra
                        </a>
                      </p>
                    )}
                    {unit.EmBreve && (unit.EmBreve === 'Sim' || unit.EmBreve === 'Não') && (
                      <p className="flex items-center gap-2">
                        <Hourglass className="h-4 w-4 text-[hsl(var(--accent-silver))]" />
                        Em Breve: <span className="font-semibold text-[hsl(var(--foreground))]">{unit.EmBreve}</span>
                      </p>
                    )}
                    {unit.Descricao && (
                      <p className="text-xs mt-2 line-clamp-2">
                        <span className="font-semibold text-[hsl(var(--foreground))]">Descrição:</span> {unit.Descricao}
                      </p>
                    )}
                    {unit.Foto && (
                      <div className="mt-2">
                        <img src={unit.Foto} alt={`Foto da ${unit.Unidade}`} className="w-full h-32 object-cover rounded-md" />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex gap-2 pt-4 border-t border-[hsl(var(--border-color))]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(unit)}
                      className="flex-1 bg-[hsl(var(--secondary-black))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--secondary-black))]/80 border-[hsl(var(--border-color))]"
                    >
                      <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja excluir a unidade "${unit.Unidade || 'esta unidade'}"?`)) {
                          deleteUnitMutation.mutate({ id: unit.Id, name: unit.Unidade });
                        }
                      }}
                      disabled={deleteUnitMutation.isPending && deleteUnitMutation.variables?.id === unit.Id}
                      className="flex-1 bg-[hsl(var(--danger-color))] text-[hsl(var(--accent-white))] hover:bg-[hsl(var(--danger-color))]/90"
                    >
                      {deleteUnitMutation.isPending && deleteUnitMutation.variables?.id === unit.Id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Excluir
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Building className="h-12 w-12 text-[hsl(var(--accent-silver))] mb-4" />
              <p className="text-[hsl(var(--muted-foreground))]">Nenhuma unidade cadastrada.</p>
              <Button onClick={handleClearForm} className="mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))]">
                <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Primeira Unidade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnitRegistration;