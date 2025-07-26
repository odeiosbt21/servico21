import { Alert } from 'react-native';

// For demo purposes, we'll simulate the Google Maps Geocoding API
// In production, you would use the actual Google Maps Geocoding API
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with actual API key

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

// Simulate geocoding for common Brazilian CEPs
const MOCK_GEOCODING_DATA: { [key: string]: GeocodeResult } = {
  '01310-100': {
    latitude: -23.5505,
    longitude: -46.6333,
    formattedAddress: 'Av. Paulista, São Paulo, SP'
  },
  '20040-020': {
    latitude: -22.9068,
    longitude: -43.1729,
    formattedAddress: 'Centro, Rio de Janeiro, RJ'
  },
  '30112-000': {
    latitude: -19.9167,
    longitude: -43.9345,
    formattedAddress: 'Centro, Belo Horizonte, MG'
  },
  '80010-000': {
    latitude: -25.4284,
    longitude: -49.2733,
    formattedAddress: 'Centro, Curitiba, PR'
  },
  '40070-110': {
    latitude: -12.9714,
    longitude: -38.5014,
    formattedAddress: 'Pelourinho, Salvador, BA'
  }
};

export const geocodeAddress = async (cep: string, address: string): Promise<GeocodeResult | null> => {
  try {
    // Clean CEP format
    const cleanCep = cep.replace(/\D/g, '');
    const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
    
    // Check mock data first
    if (MOCK_GEOCODING_DATA[formattedCep]) {
      return MOCK_GEOCODING_DATA[formattedCep];
    }
    
    // For demo purposes, generate random coordinates within Brazil
    const latitude = -23.5505 + (Math.random() - 0.5) * 10; // Around São Paulo area
    const longitude = -46.6333 + (Math.random() - 0.5) * 10;
    
    return {
      latitude,
      longitude,
      formattedAddress: `${address}, CEP: ${formattedCep}`
    };
    
    // In production, you would use the actual Google Maps Geocoding API:
    /*
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        `${address}, ${formattedCep}, Brazil`
      )}&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address
      };
    }
    */
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const validateCEP = (cep: string): boolean => {
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8;
};

export const formatCEP = (cep: string): string => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length === 8) {
    return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
  }
  return cep;
};

// Calculate distance between two coordinates in kilometers
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};