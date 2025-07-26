import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search, MapPin, Users, Star, Bell, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/services/firebase';
import { SERVICES } from '@/constants/services';
import { MapView } from '@/components/MapView';
import { SearchFilters } from '@/components/SearchFilters';
import { ProviderCard } from '@/components/ProviderCard';
import { RadiusControl } from '@/components/RadiusControl';
import { Provider } from '@/types';
import { calculateDistance, getCurrentLocation } from '@/services/location';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { simulateServiceRequest } from '@/services/serviceRequests';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { user, userProfile } = useAuth();
  const { unreadCount } = useNotifications();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);

  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
    loadSearchRadius();
    loadProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, selectedService, selectedNeighborhood, searchText, searchRadius]);

  const loadSearchRadius = async () => {
    try {
      const savedRadius = await AsyncStorage.getItem('searchRadius');
      if (savedRadius) {
        setSearchRadius(parseInt(savedRadius));
      }
    } catch (error) {
      console.error('Error loading search radius:', error);
    }
  };

  const loadProviders = async () => {
    try {
      const providersRef = collection(db, 'users');
      const q = query(
        providersRef,
        where('userType', '==', 'prestador'),
        where('isProfileComplete', '==', true),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const providersData: Provider[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip if required fields are missing
        if (!data.displayName || !data.serviceType || !data.neighborhood) {
          return;
        }
        
        const provider: Provider = {
          uid: data.uid,
          displayName: data.displayName,
          photoURL: data.photoURL || null,
          serviceType: data.serviceType,
          neighborhood: data.neighborhood,
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          status: data.status || 'disponivel',
          latitude: data.latitude || -22.9068,
          longitude: data.longitude || -43.1729,
          isPremium: data.isPremium || false,
        };
        
        // Calculate distance if user location is available
        if (userLocation) {
          provider.distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            provider.latitude,
            provider.longitude
          );
        }
        
        providersData.push(provider);
      });
      
      // Sort by distance (closest first)
      // Premium users appear first, then sorted by distance
      providersData.sort((a, b) => {
        // Premium users first
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        
        // Then by distance
        return (a.distance || 0) - (b.distance || 0);
      });
      
      setProviders(providersData);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];

    // Filter by service type
    if (selectedService) {
      filtered = filtered.filter(provider => 
        provider.serviceType.toLowerCase().includes(selectedService.toLowerCase())
      );
    }

    // Filter by neighborhood
    if (selectedNeighborhood) {
      filtered = filtered.filter(provider => 
        provider.neighborhood === selectedNeighborhood
      );
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(provider =>
        provider.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
        provider.serviceType.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filter by search radius
    if (userLocation) {
      filtered = filtered.filter(provider => (provider.distance || 0) <= searchRadius);
    }

    setFilteredProviders(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviders();
    setRefreshing(false);
  };

  const handleRadiusChange = async (newRadius: number) => {
    setSearchRadius(newRadius);
    try {
      await AsyncStorage.setItem('searchRadius', newRadius.toString());
    } catch (error) {
      console.error('Error saving search radius:', error);
    }
  };

  const handleProviderPress = (provider: Provider) => {
    router.push(`/provider/${provider.uid}`);
  };

  const handleRequestService = () => {
    if (!user || !userProfile) {
      Alert.alert(
        'Login Necessário',
        'Você precisa estar logado para solicitar um serviço.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }

    if (userProfile.userType !== 'contratante') {
      Alert.alert(
        'Tipo de Usuário',
        'Apenas clientes podem solicitar serviços. Altere seu tipo de usuário no perfil.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show service selection
    const serviceOptions = SERVICES.slice(0, 6).map(service => ({
      text: service.name,
      onPress: () => requestSpecificService(service.name)
    }));

    Alert.alert(
      'Solicitar Serviço',
      'Qual serviço você precisa?',
      [
        ...serviceOptions,
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const requestSpecificService = async (serviceType: string) => {
    if (!userProfile) return;

    try {
      await simulateServiceRequest(userProfile, serviceType, `Solicitação de ${serviceType}`);
      
      Alert.alert(
        'Solicitação Enviada!',
        `Sua solicitação de ${serviceType} foi enviada. Prestadores próximos foram notificados por email.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error requesting service:', error);
      Alert.alert(
        'Erro',
        'Não foi possível enviar sua solicitação. Verifique se seu endereço está cadastrado no perfil.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>Serviço Fácil</Text>
            <Text style={styles.appSubtitle}>Encontre prestadores</Text>
          </View>
          
          {/* Notifications Button */}
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.notificationContainer}>
              <Bell size={24} color="#2563eb" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Users size={16} color="#2563eb" />
            <Text style={styles.statNumber}>{filteredProviders.length}</Text>
            <Text style={styles.statLabel}>Prestadores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MapPin size={16} color="#2563eb" />
            <Text style={styles.statNumber}>{searchRadius}km</Text>
            <Text style={styles.statLabel}>Raio</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Star size={16} color="#fbbf24" />
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>
        </View>
      </View>

      {/* Quick Service Categories */}
      <View style={styles.categoriesSection}>
        <Text style={styles.categoriesTitle}>Serviços Populares</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {SERVICES.slice(0, 8).map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.categoryCard}
              onPress={() => setSelectedService(service.name)}
            >
              <Text style={styles.categoryIcon}>{service.icon}</Text>
              <Text style={styles.categoryName}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Map Section */}
        <MapView providers={filteredProviders} onProviderSelect={handleProviderPress} />
        
        {/* Radius Control */}
        <RadiusControl
          selectedRadius={searchRadius}
          onRadiusChange={handleRadiusChange}
          providersCount={filteredProviders.length}
        />
        
        {/* Search and Filters */}
        <SearchFilters
          onServiceFilter={setSelectedService}
          onNeighborhoodFilter={setSelectedNeighborhood}
          onSearchText={setSearchText}
          selectedService={selectedService}
          selectedNeighborhood={selectedNeighborhood}
        />

        {/* Providers List */}
        <View style={styles.providersList}>
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.uid}
              provider={provider}
              onPress={() => handleProviderPress(provider)}
              showDistance={true}
              showChatButton={true}
            />
          ))}
        </View>
      </ScrollView>
      
      {/* Floating Action Button for Service Request */}
      {userProfile?.userType === 'contratante' && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleRequestService}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  notificationButton: {
    padding: 8,
  },
  notificationContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  categoriesSection: {
    backgroundColor: 'white',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  categoriesScroll: {
    paddingLeft: 24,
  },
  categoriesContent: {
    paddingRight: 24,
  },
  categoryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    minHeight: 80,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 14,
  },
  providersList: {
    paddingBottom: 20,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});