import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, Filter } from 'lucide-react-native';
import { SERVICES, NEIGHBORHOODS } from '@/constants/services';

interface SearchFiltersProps {
  onServiceFilter: (service: string) => void;
  onNeighborhoodFilter: (neighborhood: string) => void;
  onSearchText: (text: string) => void;
  selectedService?: string;
  selectedNeighborhood?: string;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onServiceFilter,
  onNeighborhoodFilter,
  onSearchText,
  selectedService,
  selectedNeighborhood,
}) => {
  const [searchText, setSearchText] = useState('');
  const [showServices, setShowServices] = useState(false);
  const [showNeighborhoods, setShowNeighborhoods] = useState(false);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onSearchText(text);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por tipo de serviço..."
          value={searchText}
          onChangeText={handleSearchChange}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, selectedService && styles.filterButtonActive]}
          onPress={() => setShowServices(!showServices)}
        >
          <Filter size={16} color={selectedService ? 'white' : '#2563eb'} />
          <Text style={[styles.filterText, selectedService && styles.filterTextActive]}>
            {selectedService || 'Serviços'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedNeighborhood && styles.filterButtonActive]}
          onPress={() => setShowNeighborhoods(!showNeighborhoods)}
        >
          <Filter size={16} color={selectedNeighborhood ? 'white' : '#2563eb'} />
          <Text style={[styles.filterText, selectedNeighborhood && styles.filterTextActive]}>
            {selectedNeighborhood || 'Bairros'}
          </Text>
        </TouchableOpacity>

        {(selectedService || selectedNeighborhood) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              onServiceFilter('');
              onNeighborhoodFilter('');
            }}
          >
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Services List */}
      {showServices && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
          {SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.optionChip,
                selectedService === service.name && styles.optionChipActive
              ]}
              onPress={() => {
                onServiceFilter(service.name);
                setShowServices(false);
              }}
            >
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <Text style={[
                styles.optionText,
                selectedService === service.name && styles.optionTextActive
              ]}>
                {service.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Neighborhoods List */}
      {showNeighborhoods && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
          {NEIGHBORHOODS.map((neighborhood) => (
            <TouchableOpacity
              key={neighborhood}
              style={[
                styles.optionChip,
                selectedNeighborhood === neighborhood && styles.optionChipActive
              ]}
              onPress={() => {
                onNeighborhoodFilter(neighborhood);
                setShowNeighborhoods(false);
              }}
            >
              <Text style={[
                styles.optionText,
                selectedNeighborhood === neighborhood && styles.optionTextActive
              ]}>
                {neighborhood}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1e293b',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  filterTextActive: {
    color: 'white',
  },
  clearButton: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  clearText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  optionsScroll: {
    marginTop: 12,
    paddingLeft: 16,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  serviceIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  optionTextActive: {
    color: 'white',
  },
});