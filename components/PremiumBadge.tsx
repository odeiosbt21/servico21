import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown } from 'lucide-react-native';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ 
  size = 'medium', 
  showText = true 
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { icon: 12, text: 10, padding: 4 };
      case 'large':
        return { icon: 20, text: 14, padding: 8 };
      default:
        return { icon: 16, text: 12, padding: 6 };
    }
  };

  const dimensions = getSize();

  return (
    <View style={[styles.badge, { paddingHorizontal: dimensions.padding, paddingVertical: dimensions.padding / 2 }]}>
      <Crown size={dimensions.icon} color="#fbbf24" fill="#fbbf24" />
      {showText && (
        <Text style={[styles.text, { fontSize: dimensions.text }]}>Premium</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  text: {
    color: '#92400e',
    fontWeight: 'bold',
    marginLeft: 4,
  },
});