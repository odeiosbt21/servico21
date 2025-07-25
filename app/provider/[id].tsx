import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, Star, MapPin, MessageCircle, Phone, Calendar, Award } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { createOrGetChat } from '@/services/chat';
import { getProviderReviews } from '@/services/reviews';
import { getProviderStats, ProviderStats } from '@/services/stats';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewModal } from '@/components/ReviewModal';
import { StatsCard } from '@/components/StatsCard';
import { PremiumBadge } from '@/components/PremiumBadge';
import { Provider, Review } from '@/types';

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userProfile } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadProviderData();
    }
  }, [id]);

  const loadProviderData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Load provider profile
      const providerRef = doc(db, 'users', id);
      const providerDoc = await getDoc(providerRef);
      
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        setProvider({
          uid: data.uid,
          displayName: data.displayName,
          photoURL: data.photoURL,
          serviceType: data.serviceType,
          neighborhood: data.neighborhood,
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          status: data.status || 'disponivel',
          latitude: data.latitude || -22.9068,
          longitude: data.longitude || -43.1729,
          isPremium: data.isPremium || false,
        });
        
        // Load reviews and stats
        const [reviewsData, statsData] = await Promise.all([
          getProviderReviews(id),
          getProviderStats(id)
        ]);
        
        setReviews(reviewsData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading provider data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados do prestador.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviderData();
    setRefreshing(false);
  };

  const handleStartChat = async () => {
    if (!user || !userProfile || !provider) {
      router.push('/auth');
      return;
    }

    try {
      const chatId = await createOrGetChat(
        user.uid,
        provider.uid,
        userProfile.displayName,
        provider.displayName
      );
      
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Erro', 'Falha ao iniciar conversa.');
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={20}
          color={i <= rating ? '#fbbf24' : '#d1d5db'}
          fill={i <= rating ? '#fbbf24' : 'transparent'}
        />
      );
    }
    return stars;
  };

  const getStatusColor = (status: string) => {
    return status === 'disponivel' ? '#22c55e' : '#ef4444';
  };

  const getStatusText = (status: string) => {
    return status === 'disponivel' ? 'Disponível' : 'Ocupado';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Carregando...',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color="#2563eb" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Prestador não encontrado',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color="#2563eb" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Prestador não encontrado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: provider.displayName,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Provider Header */}
        <View style={styles.providerHeader}>
          <Image
            source={{
              uri: provider.photoURL || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
            }}
            style={styles.avatar}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{provider.displayName}</Text>
            {provider.isPremium && (
              <View style={styles.premiumBadgeContainer}>
                <PremiumBadge size="medium" />
              </View>
            )}
          </View>
          <Text style={styles.service}>{provider.serviceType}</Text>
          
          <View style={styles.location}>
            <MapPin size={16} color="#64748b" />
            <Text style={styles.neighborhood}>{provider.neighborhood}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(provider.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(provider.status) }]}>
              {getStatusText(provider.status)}
            </Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderStars(provider.rating)}
            </View>
            <Text style={styles.ratingText}>
              {provider.rating.toFixed(1)} ({provider.reviewCount} avaliações)
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatsCard
                  icon={<Star size={20} color="#fbbf24" />}
                  title="Avaliações"
                  value={stats.totalReviews}
                  subtitle={`${stats.averageRating} estrelas`}
                  color="#fbbf24"
                />
                <StatsCard
                  icon={<Award size={20} color="#22c55e" />}
                  title="Serviços"
                  value={stats.completedServices}
                  subtitle="Concluídos"
                  color="#22c55e"
                />
              </View>
              <View style={styles.statsRow}>
                <StatsCard
                  icon={<MessageCircle size={20} color="#2563eb" />}
                  title="Conversas"
                  value={stats.totalChats}
                  subtitle="Total de chats"
                  color="#2563eb"
                />
                <StatsCard
                  icon={<Calendar size={20} color="#f59e0b" />}
                  title="Membro desde"
                  value={stats.joinDate.getFullYear()}
                  subtitle="Ano de entrada"
                  color="#f59e0b"
                />
              </View>
            </View>
          </View>
        )}

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avaliações</Text>
            <View style={styles.reviewsBadge}>
              <Text style={styles.reviewsBadgeText}>{reviews.length}</Text>
            </View>
          </View>
          
          {reviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {reviews.slice(0, 5).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              {reviews.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>
                    Ver todas as {reviews.length} avaliações
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyReviews}>
              <Star size={32} color="#d1d5db" />
              <Text style={styles.emptyReviewsText}>
                Ainda não há avaliações
              </Text>
            </View>
          )}
        </View>

        {/* Contact Button */}
        <View style={styles.contactSection}>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => setShowReviewModal(true)}
          >
            <Star size={20} color="#fbbf24" />
            <Text style={styles.reviewButtonText}>Avaliar Prestador</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.chatButton,
              provider.status === 'ocupado' && styles.chatButtonDisabled
            ]}
            onPress={handleStartChat}
            disabled={provider.status === 'ocupado'}
          >
            <MessageCircle size={20} color="white" />
            <Text style={styles.chatButtonText}>
              {provider.status === 'disponivel' ? 'Iniciar Conversa' : 'Prestador Ocupado'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        providerId={provider.uid}
        providerName={provider.displayName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  providerHeader: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  nameContainer: {
    alignItems: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  premiumBadgeContainer: {
    marginBottom: 8,
  },
  service: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 8,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  neighborhood: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  reviewsBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  reviewsBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  reviewsList: {
    paddingHorizontal: 16,
  },
  viewAllButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  contactSection: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  reviewButton: {
    backgroundColor: '#fbbf24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  chatButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});