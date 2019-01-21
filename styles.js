// @flow

import { StyleSheet } from 'react-native';

const absoluteStretch = {
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
};

export default StyleSheet.create({
  containerWhenVisible: {
    ...absoluteStretch,
    justifyContent: 'center',
  },
  containerWhenNotVisible: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  menu: {
    ...absoluteStretch,
  },
  frontView: {
    flex: 1,
    position: 'absolute',
    width: '100%',
    height: '100%',
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
