"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Star, MessageSquare, User, Bike, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import RatingComponent from "@/components/consumer/RatingComponent";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Rating {
  id: string;
  order_id: string;
  customer_id: string;
  driver_id: string | null;
  merchant_rating: number;
  merchant_comment: string | null;
  driver_rating: number | null;
  driver_comment: string | null;
  created_at: string;
  customer_name: string;
  driver_name: string | null;
}

const MerchantRatingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  const fetchRatings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch Average Rating
      const { data: avgData, error: avgError } = await supabase.rpc('get_average_rating', {
        entity_id: user.id,
        entity_type: 'MERCHANT'
      });
      if (avgError) console.error("Error fetching average rating:", avgError);
      setAverageRating(avgData ? parseFloat(avgData.toFixed(1)) : null);

      // 2. Fetch All Ratings for this Merchant
      const { data: rawRatings, error: ratingsError } = await supabase
        .from('ratings')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      const customerIds = Array.from(new Set((rawRatings || []).map(r => r.customer_id).filter(Boolean)));
      const driverIds = Array.from(new Set((rawRatings || []).map(r => r.driver_id).filter(Boolean)));

      const { data: customerProfiles } = customerIds.length > 0 
        ? await supabase.from('profiles').select('id, first_name, last_name').in('id', customerIds) 
        : { data: [] };
        
      const { data: driverProfiles } = driverIds.length > 0 
        ? await supabase.from('driver_applications').select('id, full_name').in('id', driverIds) 
        : { data: [] };

      const enrichedRatings: Rating[] = (rawRatings || []).map(r => {
        const customer = customerProfiles?.find(p => p.id === r.customer_id);
        const driver = driverProfiles?.find(d => d.id === r.driver_id);
        
        const customerName = customer 
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || `Cliente #${r.customer_id.slice(0, 4)}`
          : `Cliente #${r.customer_id.slice(0, 4)}`;

        return {
          ...r,
          customer_name: customerName,
          driver_name: driver?.full_name || null,
        } as Rating;
      });

      setRatings(enrichedRatings);

    } catch (err: any) {
      showError("Erro ao carregar avaliações: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Avaliações da Loja</h1>
          <p className="text-gray-500">Feedback detalhado dos seus clientes.</p>
        </div>
        
        <Card className="rounded-2xl border-none shadow-lg bg-indigo-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Star className="h-6 w-6 text-brand-accent fill-brand-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Média Geral</p>
              {loading ? (
                <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
              ) : (
                <h3 className="text-2xl font-black text-indigo-900">{averageRating !== null ? averageRating.toFixed(1) : 'N/A'} / 5.0</h3>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Cliente</TableHead>
              <TableHead className="font-bold">Avaliação Loja</TableHead>
              <TableHead className="font-bold">Avaliação Entregador</TableHead>
              <TableHead className="font-bold">Comentário</TableHead>
              <TableHead className="font-bold">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Carregando avaliações...</p>
                </TableCell>
              </TableRow>
            ) : ratings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-gray-400 font-medium">
                  Nenhuma avaliação recebida ainda.
                </TableCell>
              </TableRow>
            ) : (
              ratings.map((rating) => (
                <TableRow key={rating.id} className="hover:bg-indigo-50/30 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-400" />
                        {rating.customer_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Pedido #{rating.order_id.slice(0, 6)}</div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-brand-accent fill-brand-accent" />
                        <span className="font-black text-lg text-indigo-900">{rating.merchant_rating}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {rating.driver_id ? (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <Bike className="h-4 w-4 text-blue-500" />
                                <span className="font-black text-lg text-blue-900">{rating.driver_rating || 'N/A'}</span>
                            </div>
                            <span className="text-[10px] text-gray-500">{rating.driver_name || 'Entregador'}</span>
                        </div>
                    ) : (
                        <Badge variant="secondary" className="text-[10px] font-bold">Sem Entregador</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell className="max-w-xs">
                    {rating.merchant_comment ? (
                        <div className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                            <MessageSquare className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                            <p className="line-clamp-3">{rating.merchant_comment}</p>
                        </div>
                    ) : (
                        <span className="text-gray-400 italic text-sm">Sem comentário</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(rating.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default MerchantRatingsPage;