import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { ServiceRequest, User } from '@/types';
import { notifyProvidersInRadius } from './emailService';
import { calculateDistance } from './geocoding';

export const createServiceRequest = async (
  clientId: string,
  clientName: string,
  serviceType: string,
  location: {
    latitude: number;
    longitude: number;
    address: string;
  },
  description?: string
): Promise<string> => {
  try {
    const serviceRequest: Omit<ServiceRequest, 'id'> = {
      clientId,
      clientName,
      serviceType,
      location,
      radius: 5, // 5km radius
      description: description || '',
      createdAt: new Date(),
      status: 'active',
    };

    const docRef = await addDoc(collection(db, 'serviceRequests'), serviceRequest);
    
    // Find providers in the area and send notifications
    await notifyNearbyProviders({
      ...serviceRequest,
      id: docRef.id,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating service request:', error);
    throw error;
  }
};

export const notifyNearbyProviders = async (serviceRequest: ServiceRequest): Promise<void> => {
  try {
    // Get all providers of the requested service type
    const providersQuery = query(
      collection(db, 'users'),
      where('userType', '==', 'prestador'),
      where('serviceType', '==', serviceRequest.serviceType)
    );

    const providersSnapshot = await getDocs(providersQuery);
    const providers: User[] = [];

    providersSnapshot.forEach((doc) => {
      const provider = { ...doc.data(), uid: doc.id } as User;
      
      // Only include providers with location data
      if (provider.latitude && provider.longitude) {
        const distance = calculateDistance(
          serviceRequest.location.latitude,
          serviceRequest.location.longitude,
          provider.latitude,
          provider.longitude
        );

        // Only include providers within 5km radius
        if (distance <= 5) {
          providers.push(provider);
        }
      }
    });

    console.log(`Found ${providers.length} providers within 5km radius for ${serviceRequest.serviceType}`);

    // Send email notifications to nearby providers
    if (providers.length > 0) {
      await notifyProvidersInRadius(serviceRequest, providers);
    }

  } catch (error) {
    console.error('Error notifying nearby providers:', error);
  }
};

export const getServiceRequests = async (
  clientId?: string,
  status?: 'active' | 'fulfilled' | 'cancelled'
): Promise<ServiceRequest[]> => {
  try {
    let q = query(
      collection(db, 'serviceRequests'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (clientId) {
      q = query(q, where('clientId', '==', clientId));
    }

    if (status) {
      q = query(q, where('status', '==', status));
    }

    const snapshot = await getDocs(q);
    const requests: ServiceRequest[] = [];

    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      } as ServiceRequest);
    });

    return requests;
  } catch (error) {
    console.error('Error getting service requests:', error);
    return [];
  }
};

export const updateServiceRequestStatus = async (
  requestId: string,
  status: 'active' | 'fulfilled' | 'cancelled'
): Promise<void> => {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const requestRef = doc(db, 'serviceRequests', requestId);
    await updateDoc(requestRef, { status });
  } catch (error) {
    console.error('Error updating service request status:', error);
    throw error;
  }
};

// Helper function to simulate a client requesting a service
export const simulateServiceRequest = async (
  clientUser: User,
  serviceType: string,
  description?: string
): Promise<void> => {
  if (!clientUser.latitude || !clientUser.longitude || !clientUser.address) {
    throw new Error('Client location data is required');
  }

  const requestId = await createServiceRequest(
    clientUser.uid,
    clientUser.displayName,
    serviceType,
    {
      latitude: clientUser.latitude,
      longitude: clientUser.longitude,
      address: clientUser.address,
    },
    description
  );

  console.log(`Service request created with ID: ${requestId}`);
  console.log(`Notifications sent to providers within 5km radius`);
};