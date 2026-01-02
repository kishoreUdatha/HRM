module.exports = {
  project: {
    ios: {},
    android: {
      packageName: 'com.hrmobile',
    },
  },
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
