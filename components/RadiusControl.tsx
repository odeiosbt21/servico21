import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';

interface RadiusControlProps {
  selectedRadius: number;
  onRadiusChange: (radius: number) => void;
  providersCount: number;
}

const RADIUS_OPTIONS = [1, 5, 10, 20, 50];

export const RadiusControl: React.FC<RadiusControlProps> = ({
  selectedRadius,
  onRadiusChange,
  providersCount
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MapPin size={16} color="#2563eb" />
        <Text style={styles.title}>Raio de Busca</Text>
        <Text style={styles.count}>({providersCount} prestadores)</Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {RADIUS_OPTIONS.map((radius) => (
          <TouchableOpacity
            key={radius}
            style={[
              styles.option,
              selectedRadius === radius && styles.optionSelected
            ]}
            onPress={() => onRadiusChange(radius)}
          >
            <Text style={[
              styles.optionText,
              selectedRadius === radius && styles.optionTextSelected
            ]}>
              {radius}km
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 6,
  },
  count: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 45,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  optionTextSelected: {
    color: 'white',
  },
});