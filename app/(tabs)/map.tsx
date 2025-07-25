import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, Text } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/services/firebase';
import { MapView } from '@/components/MapView';
import { ProviderCard } from '@/components/ProviderCard';
import { Provider } from '@/types';
import { calculateDistance, getCurrentLocation } from '@/services/location';
import { createOrGetChat } from '@/services/chat';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

const { height } = Dimensions.get('window');

export default function MapScreen() {
  const { user, userProfile } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
    loadSearchRadius();
    loadProviders();
  }, []);

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
        where('status', '==', 'disponivel')
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
      
      // Filter by search radius after calculating distances
      const filteredProviders = userLocation 
        ? providersData.filter(provider => (provider.distance || 0) <= searchRadius)
        : providersData;
      
      // Sort by premium status first, then by distance
      filteredProviders.sort((a, b) => {
        // Premium users first
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        
        // Then by distance
        return (a.distance || 0) - (b.distance || 0);
      });
      
      setProviders(filteredProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const handleProviderSelect = (provider: Provider) => {
    router.push(`/provider/${provider.uid}`);
  };

  const handleStartChat = async (provider: Provider) => {
    if (!user || !userProfile) {
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
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView 
          providers={providers} 
          onProviderSelect={handleProviderSelect}
        />
      </View>
      
      <View style={styles.providersContainer}>
        <Text style={styles.providersTitle}>
          Prestadores próximos ({providers.length})
        </Text>
        <ScrollView style={styles.providersList}>
          {providers.map((provider) => (
            <ProviderCard
              key={provider.uid}
              provider={provider}
              onPress={() => router.push(`/provider/${provider.uid}`)}
              showDistance={true}
              showChatButton={true}
            />
          ))}
          {providers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Nenhum prestador encontrado em um raio de {searchRadius}km
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mapContainer: {
    height: height * 0.4,
  },
  providersContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 20,
  },
  providersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  providersList: {
    flex: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});