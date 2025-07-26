import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, MapPin, Home, UserCheck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithEmail, signUpWithEmail, createUserProfile, useGoogleAuth, signInWithGoogle, sendPasswordResetEmail } from '@/services/auth';
import { geocodeAddress, validateCEP, formatCEP } from '@/services/geocoding';

export default function AuthScreen() {
  const { userType } = useLocalSearchParams<{ userType?: string }>();
  const { user } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [complement, setComplement] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<'prestador' | 'contratante'>(userType as 'prestador' | 'contratante' || 'contratante');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      handleGoogleSignIn(id_token, access_token);
    }
  }, [response]);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório.');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Erro', 'Email inválido.');
      return false;
    }

    if (!isLogin && !showForgotPassword) {
      if (!name.trim()) {
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
    }

    if (!showForgotPassword) {
      if (!password.trim()) {
        Alert.alert('Erro', 'Senha é obrigatória.');
        return false;
      }

      if (password.length < 6) {
        Alert.alert('Erro', 'Senha deve ter pelo menos 6 caracteres.');
        return false;
      }

      if (!isLogin && password !== confirmPassword) {
        Alert.alert('Erro', 'Senhas não coincidem.');
        return false;
      }
    }

    return true;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Digite seu email para recuperar a senha.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Erro', 'Email inválido.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
      Alert.alert(
        'Email Enviado',
        'Instruções para redefinir sua senha foram enviadas para seu email.',
        [{ text: 'OK', onPress: () => setShowForgotPassword(false) }]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert('Erro', 'Falha ao enviar email de recuperação. Verifique se o email está correto.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (idToken: string, accessToken?: string) => {
    setLoading(true);
    try {
      await signInWithGoogle(idToken, accessToken);
      Alert.alert('Sucesso', 'Login com Google realizado com sucesso!');
    } catch (error: any) {
      console.error('Google auth error:', error);
      Alert.alert('Erro', 'Falha no login com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email.trim(), password);
        Alert.alert('Sucesso', 'Login realizado com sucesso!');
      } else {
        const firebaseUser = await signUpWithEmail(email.trim(), password);
        
        if (firebaseUser) {
          // Get coordinates from address
          const geocodeResult = await geocodeAddress(cep, address);
          
          // Create user profile with all registration data
          await createUserProfile(firebaseUser, {
            userType: selectedUserType,
            displayName: name.trim(),
            cep: formatCEP(cep),
            address: address.trim(),
            complement: complement.trim() || null,
            latitude: geocodeResult?.latitude || null,
            longitude: geocodeResult?.longitude || null,
          });
        }
        
        Alert.alert(
          'Sucesso', 
          'Conta criada com sucesso! Bem-vindo ao Serviço Fácil!',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = 'Erro desconhecido. Tente novamente.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowForgotPassword(false)}
            >
              <ArrowLeft size={24} color="#2563eb" />
            </TouchableOpacity>
            
            <Image
              source={{ uri: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' }}
              style={styles.logo}
            />
            
            <Text style={styles.title}>Recuperar Senha</Text>
            <Text style={styles.subtitle}>Digite seu email para receber as instruções</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Enviando...' : 'Enviar Email'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          
          <Image
            source={{ uri: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' }}
            style={styles.logo}
          />
          
          <Text style={styles.title}>
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Acesse sua conta no Serviço Fácil' 
              : 'Cadastre-se no Serviço Fácil'
            }
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {!isLogin && (
            <>
              <View style={styles.inputContainer}>
                <User size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome completo"
                  value={name}
                  onChangeText={setName}
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
            </>
          )}

          <View style={styles.inputContainer}>
            <Mail size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#6b7280" />
              ) : (
                <Eye size={20} color="#6b7280" />
              )}
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Lock size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#6b7280" />
                ) : (
                  <Eye size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {isLogin && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => setShowForgotPassword(true)}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
            </Text>
          </TouchableOpacity>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={!request || loading}
          >
            <Image
              source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>
              {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
            </Text>
          </TouchableOpacity>

          {/* Toggle Login/Register */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.toggleLink}>
                {isLogin ? 'Cadastre-se' : 'Faça login'}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  userTypeText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 15,
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#4285f4',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row', // Added for Google icon alignment
    gap: 10, // Added for Google icon spacing
  },
  googleButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  userTypeContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  userTypeLabel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  userTypeButtonActive: {
    backgroundColor: '#2563eb',
  },
  userTypeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  userTypeButtonTextActive: {
    color: 'white',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 8,
  },
  toggleLink: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
});