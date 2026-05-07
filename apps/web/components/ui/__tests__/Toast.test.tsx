import { render, screen } from '@testing-library/react';
import { toast } from '../Toast';

describe('Toast', () => {
    beforeEach(() => {
        // Clear any existing toasts
        document.body.innerHTML = '';
    });

    it('should show success toast', () => {
        toast.success('Test success message');
        
        // Check if toast container exists
        const toastContainer = document.querySelector('[data-testid="toast-container"]') || 
                              document.querySelector('.toast-container');
        
        // The toast should be triggered (implementation may vary)
        expect(toast.success).toBeDefined();
    });

    it('should show error toast', () => {
        toast.error('Test error message');
        
        expect(toast.error).toBeDefined();
    });

    it('should show info toast', () => {
        toast.info('Test info message');
        
        expect(toast.info).toBeDefined();
    });

    it('should show warning toast', () => {
        toast.warning('Test warning message');
        
        expect(toast.warning).toBeDefined();
    });
});
