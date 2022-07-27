module.exports = {
  moduleFileExtensions: ['js', 'ts', 'json', 'vue'],
  testPathIgnorePatterns: ['/node_modules/', '/infrastructure/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.vue$': 'vue-jest'
  }
};
