"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Bike, Loader2, CheckCircle2, Star } from "lucide-react";
import RatingComponent from "@/components/consumer/RatingComponent";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderRatingDialogProps {
  order: any;
  isOpen: boolean;
  onClose: (rated: boolean) => void;
}

const OrderRatingDialog: React.FC<OrderRatingDialogProps> = ({ order, isOpen, onClose }) => {
  const [merchantRating, setMerchantRating] = useState(0);
  const [merchantComment, setMerchantComment] = useState("");
  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Driver rating is only shown if the order was delivered by a driver AND was not a pickup
  const showDriverRating = order.driver_id && order.delivery_type === 'delivery' && order.status === 'DELIVERED';

  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setMerchantRating(0);
      setMerchantComment("");
      setDriverRating(0);
      setDriverComment("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (merchantRating === 0) {
      showError("Por favor, avalie a loja.");
      return;
    }

    if (showDriverRating && driverRating === 0) {
        showError("Por favor, avalie o entregador.");
        return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const ratingData = {
        order_id: order.id,
        customer_id: user.id,
        merchant_id: order.merchant_id,
        driver_id: showDriverRating ? order.driver_id : null,
        merchant_rating: merchantRating,
        merchant_comment: merchantComment,
        driver_rating: showDriverRating ? driverRating : null,
        driver_comment: showDriverRating ? driverComment : null,
      };

      const { error } = await supabase.from('ratings').insert(ratingData);

      if (error) {
        // Handle unique constraint error (already rated)
        if (error.code === '23505') {
            showError("Este pedido já foi avaliado.");
        } else {
            throw error;
        }
      } else {
        showSuccess("Avaliações enviadas com sucesso!");
      }
      
      onClose(true); // Close and signal success

    } catch (err: any) {
      console.error("Rating submission error:", err);
      showError(err.message || "Erro ao enviar avaliações.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => onClose(false)}>
      <DialogContent className="rounded-[2.5rem] sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl h-[90vh] flex flex-col">
        <DialogHeader className="p-6 bg-indigo-900 text-white shrink-0">
          <DialogTitle className="text-2xl font-black">Avaliar Pedido #{order.id?.slice(0, 6)}</DialogTitle>
          <DialogDescription className="text-indigo-200">
            Sua opinião é importante para melhorarmos o serviço.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6 bg-white">
          <div className="space-y-8">
            
            {/* Avaliação da Loja */}
            <Card className="rounded-3xl border-2 border-indigo-100 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Store className="h-6 w-6 text-brand-accent" />
                  <h3 className="font-black text-lg text-indigo-900">{order.merchant?.store_name || "Loja"}</h3>
                </div>
                <RatingComponent 
                  ratingValue={merchantRating}
                  onRatingChange={setMerchantRating}
                  commentValue={merchantComment}
                  onCommentChange={setMerchantComment}
                  readOnly={false}
                  showComment={true}
                />
              </CardContent>
            </Card>

            {/* Avaliação do Entregador */}
            {showDriverRating && (
              <Card className="rounded-3xl border-2 border-blue-100 shadow-sm animate-in fade-in">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Bike className="h-6 w-6 text-blue-600" />
                    <h3 className="font-black text-lg text-blue-900">Entregador ({order.driver_full_name || "Parceiro"})</h3>
                  </div>
                  <RatingComponent 
                    ratingValue={driverRating}
                    onRatingChange={setDriverRating}
                    commentValue={driverComment}
                    onCommentChange={setDriverComment}
                    readOnly={false}
                    showComment={true}
                  />
                </CardContent>
              </Card>
            )}
            
            <div className="pt-4">
                <Button 
                  className="w-full h-14 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-lg shadow-xl shadow-brand-accent/20"
                  onClick={handleSubmit}
                  disabled={submitting || merchantRating === 0 || (showDriverRating && driverRating === 0)}
                >
                  {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                  {submitting ? "Enviando..." : "Finalizar Avaliação"}
                </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderRatingDialog;