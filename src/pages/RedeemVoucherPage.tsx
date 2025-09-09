import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const RedeemVoucherPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [voucherCode, setVoucherCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRedeem = async () => {
    if (!user) {
      showError('Você precisa estar logado para resgatar um voucher.');
      return navigate('/auth');
    }
    if (!voucherCode.trim()) {
      showError('Por favor, insira um código de voucher.');
      return;
    }

    setIsLoading(true);
    
    const { data, error } = await supabase.rpc('apply_promo_code', { 
      p_code: voucherCode.toUpperCase(), 
      p_user_id: user.id 
    });
    
    if (error) {
      showError('Código de voucher inválido ou expirado.');
    } else if (data && data.status === 'success') {
      showSuccess(data.message);
      setVoucherCode('');
    } else if (data && data.status === 'error') {
      showError(data.message);
    } else {
      showError('Ocorreu um erro desconhecido ao aplicar o código.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col">
      <header className="flex items-center p-4 text-center relative">
        <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="mx-auto">
          <h1 className="text-lg font-bold">Trokazz</h1>
          <p className="text-sm">Vouchers e Códigos de Desconto</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-8">
        <h2 className="text-2xl font-bold mb-8">Resgatar Vouchers</h2>
        
        <Card className="w-full max-w-sm rounded-t-3xl mt-auto">
          <CardContent className="p-6 md:p-8 text-center space-y-6">
            <Input
              type="text"
              placeholder="Digite ou cole o código aqui"
              className="h-12 text-center"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-foreground font-semibold">
              Ganhe moedas grátis e descontos!
            </p>
            <Button 
              onClick={handleRedeem} 
              disabled={isLoading || !voucherCode.trim()}
              className="w-full bg-accent hover:bg-accent/90 h-12 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Resgatando...
                </>
              ) : (
                'Resgatar'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RedeemVoucherPage;