import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  setDoc, 
  onSnapshot,
  Timestamp,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Chat, ChatMessage } from '@/types';
import { createNotification } from './notifications';
import { uploadImage } from './storage';

export const createOrGetChat = async (
  currentUserId: string,
  otherUserId: string,
  currentUserName: string,
  otherUserName: string
): Promise<string> => {
  try {
    // Check if chat already exists
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUserId)
    );
    
    const querySnapshot = await getDocs(q);
    let existingChatId = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.participants.includes(otherUserId)) {
        existingChatId = doc.id;
      }
    });
    
    if (existingChatId) {
      return existingChatId;
    }
    
    // Create new chat
    const chatData = {
      participants: [currentUserId, otherUserId],
      participantNames: {
        [currentUserId]: currentUserName,
        [otherUserId]: otherUserName
      },
      lastMessage: '',
      lastMessageTime: Timestamp.now(),
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(chatsRef, chatData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    throw error;
  }
};

export const sendImageMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  imageUri: string
) => {
  try {
    // Upload image first
    const imageUrl = await uploadImage(imageUri, `chat_${chatId}_${Date.now()}`);
    
    // Get chat data to find the other participant
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }
    
    const chatData = chatDoc.data();
    const otherParticipantId = chatData.participants.find((id: string) => id !== senderId);
    
    // Add message to messages subcollection
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      senderName,
      type: 'image',
      imageUrl,
      timestamp: Timestamp.now(),
      read: false
    });
    
    // Update chat's last message
    await updateDoc(chatRef, {
      lastMessage: '📷 Imagem',
      lastMessageTime: Timestamp.now()
    });
    
    // Create notification for the other participant
    if (otherParticipantId) {
      await createNotification(
        otherParticipantId,
        'message',
        `Nova imagem de ${senderName}`,
        'Enviou uma imagem',
        { chatId, senderId }
      );
    }
  } catch (error) {
    console.error('Error sending image message:', error);
    throw error;
  }
};

export const sendLocationMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  latitude: number,
  longitude: number
) => {
  try {
    // Get chat data to find the other participant
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }
    
    const chatData = chatDoc.data();
    const otherParticipantId = chatData.participants.find((id: string) => id !== senderId);
    
    // Add message to messages subcollection
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      senderName,
      type: 'location',
      latitude,
      longitude,
      timestamp: Timestamp.now(),
      read: false
    });
    
    // Update chat's last message
    await updateDoc(chatRef, {
      lastMessage: '📍 Localização',
      lastMessageTime: Timestamp.now()
    });
    
    // Create notification for the other participant
    if (otherParticipantId) {
      await createNotification(
        otherParticipantId,
        'message',
        `Nova localização de ${senderName}`,
        'Compartilhou a localização',
        { chatId, senderId }
      );
    }
  } catch (error) {
    console.error('Error sending location message:', error);
    throw error;
  }
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  text: string
) => {
  try {
    // Get chat data to find the other participant
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }
    
    const chatData = chatDoc.data();
    const otherParticipantId = chatData.participants.find((id: string) => id !== senderId);
    
    // Add message to messages subcollection
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      senderName,
      type: 'text',
      text,
      timestamp: Timestamp.now(),
      read: false
    });
    
    // Update chat's last message
    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageTime: Timestamp.now()
    });
    
    // Create notification for the other participant
    if (otherParticipantId) {
      await createNotification(
        otherParticipantId,
        'message',
        `Nova mensagem de ${senderName}`,
        text,
        { chatId, senderId }
      );
    }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getChatMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        chatId,
        senderId: data.senderId,
        senderName: data.senderName,
        text: data.text,
        timestamp: data.timestamp.toDate()
      });
    });
    callback(messages);
  });
};