import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { Provider } from '@/types';
import { getCurrentLocation } from '@/services/location';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MapViewProps {
  providers: Provider[];
  onProviderSelect?: (provider: Provider) => void;
}

const { width, height } = Dimensions.get('window');

export const MapView: React.FC<MapViewProps> = ({ providers, onProviderSelect }) => {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);

  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
    loadSearchRadius();
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

  // This is a placeholder for Google Maps implementation
  // In a real app, you would use react-native-maps or Google Maps JavaScript API
  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>🗺️ Mapa Interativo</Text>
        <Text style={styles.locationText}>
          {userLocation
            ? `Sua localização: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
            : 'Localizando...'}
        </Text>
        <Text style={styles.providersText}>
          {providers.length} prestadores disponíveis em um raio de {searchRadius}km
        </Text>

        {/* Simulated markers */}
        <View style={styles.markersContainer}>
          {providers.slice(0, 5).map((provider, index) => (
            <TouchableOpacity
              key={provider.uid}
              style={[styles.marker, {
                left: 20 + (index * 50),
                top: 80 + (index * 20)
              }]}
              onPress={() => onProviderSelect?.(provider)}
            >
              <Text style={styles.markerText}>📍</Text>
              <Text style={styles.markerLabel} numberOfLines={1}>
                {provider.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: height * 0.35,
    backgroundColor: '#f8fafc',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  providersText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  markersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerText: {
    fontSize: 20,
  },
  markerLabel: {
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: 'white',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 60,
  },
});