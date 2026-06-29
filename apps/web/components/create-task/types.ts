// Shape of the task-creation form data accumulated across the wizard steps.
// All fields optional because each step only contributes part of the data.
export type TaskFormData = {
    category?: string;
    title?: string;
    description?: string;
    city?: string;
    address?: string;
    budget?: string;
    amount?: string;
    urgency?: string;
    dueDate?: string;
    images?: string[];
};
