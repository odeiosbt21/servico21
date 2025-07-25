import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { PremiumPlan, Subscription } from '@/types';

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Plano Premium',
    price: 9.99,
    currency: 'BRL',
    duration: 30,
    features: [
      'Selo Premium no perfil',
      'Prioridade na listagem',
      'Destaque no mapa',
      'Suporte prioritário'
    ]
  }
];

export const subscribeToPremium = async (
  userId: string,
  planId: string,
  paymentMethod: 'stripe' | 'iap',
  transactionId?: string
): Promise<boolean> => {
  try {
    const plan = PREMIUM_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration);

    // Create subscription record
    const subscriptionData: Omit<Subscription, 'id'> = {
      userId,
      planId,
      status: 'active',
      startDate,
      endDate,
      paymentMethod,
      transactionId
    };

    await addDoc(collection(db, 'subscriptions'), {
      ...subscriptionData,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate)
    });

    // Update user profile
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isPremium: true,
      premiumExpiresAt: Timestamp.fromDate(endDate)
    });

    return true;
  } catch (error) {
    console.error('Error subscribing to premium:', error);
    throw error;
  }
};

export const checkPremiumStatus = async (userId: string): Promise<boolean> => {
  try {
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(
      subscriptionsRef,
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return false;
    }

    // Check if any active subscription is still valid
    const now = new Date();
    let hasValidSubscription = false;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const endDate = data.endDate.toDate();
      
      if (endDate > now) {
        hasValidSubscription = true;
      } else {
        // Mark expired subscription
        updateDoc(doc.ref, { status: 'expired' });
      }
    });

    // Update user profile if no valid subscription
    if (!hasValidSubscription) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isPremium: false,
        premiumExpiresAt: null
      });
    }

    return hasValidSubscription;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

export const cancelPremiumSubscription = async (userId: string): Promise<boolean> => {
  try {
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(
      subscriptionsRef,
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(async (doc) => {
      await updateDoc(doc.ref, { status: 'cancelled' });
    });

    // Update user profile
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isPremium: false,
      premiumExpiresAt: null
    });

    return true;
  } catch (error) {
    console.error('Error cancelling premium subscription:', error);
    throw error;
  }
};

// Mock Stripe integration - replace with actual Stripe implementation
export const processStripePayment = async (
  amount: number,
  currency: string,
  userId: string
): Promise<{ success: boolean; transactionId?: string }> => {
  try {
    // This is a mock implementation
    // In a real app, you would integrate with Stripe's API
    console.log('Processing Stripe payment:', { amount, currency, userId });
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock successful payment
    return {
      success: true,
      transactionId: `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } catch (error) {
    console.error('Error processing Stripe payment:', error);
    return { success: false };
  }
};

// Mock IAP integration - replace with actual IAP implementation
export const processIAPPayment = async (
  productId: string,
  userId: string
): Promise<{ success: boolean; transactionId?: string }> => {
  try {
    // This is a mock implementation
    // In a real app, you would integrate with expo-in-app-purchases or similar
    console.log('Processing IAP payment:', { productId, userId });
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock successful payment
    return {
      success: true,
      transactionId: `iap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } catch (error) {
    console.error('Error processing IAP payment:', error);
    return { success: false };
  }
};