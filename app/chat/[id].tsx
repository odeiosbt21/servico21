import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, Send, Image as ImageIcon, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getChatMessages, sendMessage, sendImageMessage, sendLocationMessage } from '@/services/chat';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getCurrentLocation } from '@/services/location';
import { ChatMessage } from '@/types';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id || !user) return;

    loadChatInfo();
    
    const unsubscribe = getChatMessages(id, (newMessages) => {
      setMessages(newMessages);
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  }, [id, user]);

  const loadChatInfo = async () => {
    if (!id || !user) return;
    
    try {
      const chatRef = doc(db, 'chats', id);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        setChatInfo(chatData);
        
        // Get other user's info
        const otherUserId = chatData.participants.find((uid: string) => uid !== user.uid);
        if (otherUserId) {
          const userRef = doc(db, 'users', otherUserId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setOtherUser(userDoc.data());
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat info:', error);
    }
  };
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !userProfile || !id) return;

    setLoading(true);
    try {
      await sendMessage(id, user.uid, userProfile.displayName, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erro', 'Falha ao enviar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão para acessar a galeria é necessária.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user && userProfile && id) {
        setLoading(true);
        try {
          await sendImageMessage(id, user.uid, userProfile.displayName, result.assets[0].uri);
          setShowAttachments(false);
        } catch (error) {
          console.error('Error sending image:', error);
          Alert.alert('Erro', 'Falha ao enviar imagem.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Falha ao selecionar imagem.');
    }
  };

  const handleSendLocation = async () => {
    if (!user || !userProfile || !id) return;

    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await sendLocationMessage(
        id, 
        user.uid, 
        userProfile.displayName, 
        location.latitude, 
        location.longitude
      );
      setShowAttachments(false);
    } catch (error) {
      console.error('Error sending location:', error);
      Alert.alert('Erro', 'Falha ao enviar localização.');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.senderId === user?.uid;
    const messageUser = isMyMessage ? userProfile : otherUser;
    
    return (
      <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
        {!isMyMessage && (
          <Image
            source={{
              uri: messageUser?.photoURL || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop'
            }}
            style={styles.messageAvatar}
          />
        )}
        
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          
          {item.type === 'image' ? (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          ) : item.type === 'location' ? (
            <View style={styles.locationMessage}>
              <MapPin size={16} color={isMyMessage ? 'white' : '#2563eb'} />
              <Text style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                Localização compartilhada
              </Text>
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.text}
            </Text>
          )}
          
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {item.timestamp.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
            {item.read && isMyMessage && (
              <Text style={styles.readStatus}> ✓✓</Text>
            )}
          </Text>
        </View>
        
        {isMyMessage && (
          <Image
            source={{
              uri: messageUser?.photoURL || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop'
            }}
            style={styles.messageAvatar}
          />
        )}
      </View>
    );
  };

  if (!user || !userProfile) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: otherUser?.displayName || 'Conversa',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <View style={styles.inputContainer}>
        {showAttachments && (
          <View style={styles.attachmentsMenu}>
            <TouchableOpacity style={styles.attachmentButton} onPress={handleSendImage}>
              <ImageIcon size={20} color="#2563eb" />
              <Text style={styles.attachmentText}>Imagem</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentButton} onPress={handleSendLocation}>
              <MapPin size={20} color="#2563eb" />
              <Text style={styles.attachmentText}>Localização</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowAttachments(!showAttachments)}
          >
            <Text style={styles.attachButtonText}>+</Text>
          </TouchableOpacity>
          
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            // Simulate typing indicator
            setIsTyping(text.length > 0);
          }}
          placeholder="Digite sua mensagem..."
          multiline
          maxLength={500}
          placeholderTextColor="#94a3b8"
        />
        
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || loading) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Send size={20} color={(!newMessage.trim() || loading) ? '#94a3b8' : 'white'} />
          )}
        </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    backgroundColor: '#2563eb',
  },
  otherMessage: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  senderName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#64748b',
  },
  readStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
  },
  attachmentsMenu: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 16,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  attachmentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachButtonText: {
    fontSize: 20,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#1e293b',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
});