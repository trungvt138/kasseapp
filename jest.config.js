module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['babel-jest', {
      configFile: false,
      presets: [
        ['@babel/preset-typescript'],
      ],
      plugins: [
        ['@babel/plugin-transform-modules-commonjs'],
      ],
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
};
