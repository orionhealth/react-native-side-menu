// @flow

import { StyleSheet, Platform } from 'react-native';

// Prevent IOS 9 Safari and some older browsers from overflowing 
// the body content after drawer opens/closes.
const position = Platform.OS === 'web' ? 'fixed' : 'absolute'; 

const absoluteStretch = {
  position,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
};

export default StyleSheet.create({
  container: {
    ...absoluteStretch,
    justifyContent: 'center',
  },
  menu: {
    ...absoluteStretch,
  },
  frontView: {
    flex: 1,
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  overlay: {
    ...absoluteStretch,
    backgroundColor: 'transparent',
  },
});
