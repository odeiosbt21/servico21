import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, User, MapPin, Home, UserCheck, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/auth';
import { geocodeAddress, validateCEP, formatCEP } from '@/services/geocoding';

export default function EditProfileScreen() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [cep, setCep] = useState(userProfile?.cep || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [complement, setComplement] = useState(userProfile?.complement || '');
  const [selectedUserType, setSelectedUserType] = useState<'prestador' | 'contratante'>(
    userProfile?.userType || 'contratante'
  );

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }
  }, [user]);

  const validateForm = () => {
    if (!displayName.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório.');
      return false;
    }

    if (!cep.trim()) {
      Alert.alert('Erro', 'CEP é obrigatório.');
      return false;
    }

    if (!validateCEP(cep)) {
      Alert.alert('Erro', 'CEP inválido. Use o formato 00000-000.');
      return false;
    }

    if (!address.trim()) {
      Alert.alert('Erro', 'Endereço é obrigatório.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      // Get coordinates from address if changed
      let geocodeResult = null;
      if (cep !== userProfile?.cep || address !== userProfile?.address) {
        geocodeResult = await geocodeAddress(cep, address);
      }

      // Prepare update data
      const updateData: any = {
        displayName: displayName.trim(),
        userType: selectedUserType,
        cep: formatCEP(cep),
        address: address.trim(),
        complement: complement.trim() || null,
        isProfileComplete: true,
      };

      // Add coordinates if geocoding was successful
      if (geocodeResult) {
        updateData.latitude = geocodeResult.latitude;
        updateData.longitude = geocodeResult.longitude;
      }

      // Update profile
      await updateUserProfile(user.uid, updateData);
      await refreshProfile();

      Alert.alert(
        'Sucesso',
        'Perfil atualizado com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erro', 'Falha ao atualizar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#2563eb" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Editar Perfil</Text>
          <Text style={styles.subtitle}>Atualize suas informações</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <User size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <View style={styles.inputContainer}>
            <MapPin size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="CEP (00000-000)"
              value={cep}
              onChangeText={(text) => setCep(formatCEP(text))}
              keyboardType="numeric"
              maxLength={9}
            />
          </View>

          <View style={styles.inputContainer}>
            <Home size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Endereço"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Home size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Complemento (opcional)"
              value={complement}
              onChangeText={setComplement}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.userTypeContainer}>
            <Text style={styles.userTypeLabel}>Tipo de usuário:</Text>
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  selectedUserType === 'contratante' && styles.userTypeButtonActive
                ]}
                onPress={() => setSelectedUserType('contratante')}
              >
                <UserCheck size={20} color={selectedUserType === 'contratante' ? '#fff' : '#6b7280'} />
                <Text style={[
                  styles.userTypeButtonText,
                  selectedUserType === 'contratante' && styles.userTypeButtonTextActive
                ]}>
                  Cliente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  selectedUserType === 'prestador' && styles.userTypeButtonActive
                ]}
                onPress={() => setSelectedUserType('prestador')}
              >
                <UserCheck size={20} color={selectedUserType === 'prestador' ? '#fff' : '#6b7280'} />
                <Text style={[
                  styles.userTypeButtonText,
                  selectedUserType === 'prestador' && styles.userTypeButtonTextActive
                ]}>
                  Prestador de Serviço
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {selectedUserType !== userProfile?.userType && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ Alterar o tipo de usuário pode afetar suas funcionalidades disponíveis no app.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Save size={20} color="#fff" style={styles.saveButtonIcon} />
            <Text style={styles.saveButtonText}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  userTypeContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  userTypeLabel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
    fontWeight: '600',
  },
  userTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    padding: 4,
  },
  userTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  userTypeButtonActive: {
    backgroundColor: '#2563eb',
  },
  userTypeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  userTypeButtonTextActive: {
    color: 'white',
  },
  warningContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});