import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Include test files
        include: ['src/tests/**/*.test.ts', 'src/**/*.spec.ts'],
        
        // Exclude node_modules and dist
        exclude: ['node_modules', 'dist', '.git', '.astro'],
        
        // Environment for testing
        environment: 'jsdom',
        
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            include: ['src/lib/**/*.ts'],
            exclude: [
                'node_modules',
                'src/tests/**',
                '**/*.d.ts',
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60,
                statements: 70,
            },
        },
        
        // Global test setup
        globals: true,
        
        // Reporter
        reporters: ['verbose'],
        
        // Timeout for tests
        testTimeout: 10000,
        
        // Setup files
        setupFiles: ['./src/tests/setup.ts'],
        
        // Mock reset
        mockReset: true,
        restoreMocks: true,
    },
    
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});
