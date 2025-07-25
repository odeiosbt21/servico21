import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Crown, X, Check, CreditCard, Smartphone } from 'lucide-react-native';
import { PREMIUM_PLANS, subscribeToPremium, processStripePayment, processIAPPayment } from '@/services/premium';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'iap'>('stripe');

  const plan = PREMIUM_PLANS[0]; // Premium monthly plan

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para assinar o plano premium.');
      return;
    }

    setLoading(true);
    try {
      let paymentResult;
      
      if (selectedPaymentMethod === 'stripe') {
        paymentResult = await processStripePayment(plan.price, plan.currency, user.uid);
      } else {
        paymentResult = await processIAPPayment(plan.id, user.uid);
      }

      if (paymentResult.success) {
        await subscribeToPremium(
          user.uid,
          plan.id,
          selectedPaymentMethod,
          paymentResult.transactionId
        );

        await refreshProfile();
        
        Alert.alert(
          'Sucesso!',
          'Parabéns! Você agora é um usuário Premium. Aproveite todos os benefícios!',
          [{ text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}]
        );
      } else {
        Alert.alert('Erro', 'Falha no processamento do pagamento. Tente novamente.');
      }
    } catch (error) {
      console.error('Error subscribing to premium:', error);
      Alert.alert('Erro', 'Falha ao processar assinatura. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Crown size={32} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.title}>Torne-se Premium</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Plan Info */}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>R$ {plan.price.toFixed(2)}</Text>
                  <Text style={styles.period}>/mês</Text>
                </View>
              </View>

              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>Benefícios inclusos:</Text>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Check size={16} color="#22c55e" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>Método de Pagamento</Text>
              
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === 'stripe' && styles.paymentMethodSelected
                ]}
                onPress={() => setSelectedPaymentMethod('stripe')}
              >
                <CreditCard size={20} color="#2563eb" />
                <Text style={styles.paymentMethodText}>Cartão de Crédito</Text>
                <View style={[
                  styles.radio,
                  selectedPaymentMethod === 'stripe' && styles.radioSelected
                ]} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === 'iap' && styles.paymentMethodSelected
                ]}
                onPress={() => setSelectedPaymentMethod('iap')}
              >
                <Smartphone size={20} color="#2563eb" />
                <Text style={styles.paymentMethodText}>Compra no App</Text>
                <View style={[
                  styles.radio,
                  selectedPaymentMethod === 'iap' && styles.radioSelected
                ]} />
              </TouchableOpacity>
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              <Crown size={20} color="white" />
              <Text style={styles.subscribeButtonText}>
                {loading ? 'Processando...' : `Assinar por R$ ${plan.price.toFixed(2)}/mês`}
              </Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              * Você pode cancelar sua assinatura a qualquer momento. 
              O plano será renovado automaticamente até o cancelamento.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  planCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400e',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#92400e',
  },
  period: {
    fontSize: 16,
    color: '#92400e',
    marginLeft: 4,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  paymentMethodSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  radioSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  subscribeButton: {
    backgroundColor: '#fbbf24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
});