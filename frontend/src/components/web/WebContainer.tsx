import React from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import { spacing } from '../../theme';

interface WebContainerProps {
  children: React.ReactNode;
  style?: object;
}

export const WebContainer: React.FC<WebContainerProps> = ({ children, style }) => {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const hPad = width < 640 ? spacing.md : spacing.lg;

  return (
    <View
      style={[
        {
          maxWidth: 1280,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: hPad,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
