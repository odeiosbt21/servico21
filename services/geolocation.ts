import * as Location from 'expo-location';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { calculateDistance } from './location';
import { createNotification } from './notifications';
import { Provider } from '@/types';

export interface LocationNotificationService {
  startLocationTracking: (userId: string, interests: string[]) => void;
  stopLocationTracking: () => void;
}

class GeolocationNotificationService implements LocationNotificationService {
  private watchId: Location.LocationSubscription | null = null;
  private lastNotificationTime: { [key: string]: number } = {};
  private readonly NOTIFICATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes

  async startLocationTracking(userId: string, interests: string[] = []) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      // Stop any existing tracking
      this.stopLocationTracking();

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // Check every minute
          distanceInterval: 100, // Or when moved 100m
        },
        (location) => {
          this.checkNearbyProviders(
            userId,
            location.coords.latitude,
            location.coords.longitude,
            interests
          );
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }

  stopLocationTracking() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  private async checkNearbyProviders(
    userId: string,
    userLat: number,
    userLon: number,
    interests: string[]
  ) {
    try {
      const providersRef = collection(db, 'users');
      const q = query(
        providersRef,
        where('userType', '==', 'prestador'),
        where('isProfileComplete', '==', true),
        where('status', '==', 'disponivel')
      );

      const querySnapshot = await getDocs(q);
      const nearbyProviders: Provider[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (!data.latitude || !data.longitude || data.uid === userId) {
          return;
        }

        const distance = calculateDistance(
          userLat,
          userLon,
          data.latitude,
          data.longitude
        );

        // Check if provider is within 5km and matches interests
        if (distance <= 5 && this.matchesInterests(data.serviceType, interests)) {
          nearbyProviders.push({
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            serviceType: data.serviceType,
            neighborhood: data.neighborhood,
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            status: data.status,
            latitude: data.latitude,
            longitude: data.longitude,
            distance,
            isPremium: data.isPremium || false,
          });
        }
      });

      // Send notifications for nearby providers
      for (const provider of nearbyProviders) {
        await this.sendProximityNotification(userId, provider);
      }
    } catch (error) {
      console.error('Error checking nearby providers:', error);
    }
  }

  private matchesInterests(serviceType: string, interests: string[]): boolean {
    if (interests.length === 0) return true; // If no specific interests, notify for all
    return interests.some(interest => 
      serviceType.toLowerCase().includes(interest.toLowerCase())
    );
  }

  private async sendProximityNotification(userId: string, provider: Provider) {
    const notificationKey = `${userId}_${provider.uid}`;
    const now = Date.now();
    
    // Check cooldown to avoid spam
    if (this.lastNotificationTime[notificationKey] && 
        (now - this.lastNotificationTime[notificationKey]) < this.NOTIFICATION_COOLDOWN) {
      return;
    }

    try {
      await createNotification(
        userId,
        'proximity',
        `${provider.serviceType} próximo!`,
        `${provider.displayName} está a ${provider.distance}km de você`,
        {
          providerId: provider.uid,
          providerName: provider.displayName,
          serviceType: provider.serviceType,
          distance: provider.distance
        }
      );

      this.lastNotificationTime[notificationKey] = now;
    } catch (error) {
      console.error('Error sending proximity notification:', error);
    }
  }
}

export const geolocationService = new GeolocationNotificationService();