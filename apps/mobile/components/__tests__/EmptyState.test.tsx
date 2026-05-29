import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { EmptyState } from '../EmptyState';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('EmptyState', () => {
  it('renders title', () => {
    const { getByText } = render(
      <EmptyState icon="search-outline" title="No results found" />,
      { wrapper: Wrapper }
    );
    expect(getByText('No results found')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <EmptyState icon="search-outline" title="Empty" subtitle="Try different filters" />,
      { wrapper: Wrapper }
    );
    expect(getByText('Try different filters')).toBeTruthy();
  });

  it('does not render subtitle when not provided', () => {
    const { queryByText } = render(
      <EmptyState icon="search-outline" title="Empty" />,
      { wrapper: Wrapper }
    );
    expect(queryByText('Try different filters')).toBeNull();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState icon="add-outline" title="No tasks" actionLabel="Create Task" onAction={onAction} />,
      { wrapper: Wrapper }
    );
    expect(getByText('Create Task')).toBeTruthy();
  });

  it('does not render action button when actionLabel missing', () => {
    const { queryByText } = render(
      <EmptyState icon="add-outline" title="No tasks" onAction={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(queryByText('Create Task')).toBeNull();
  });

  it('does not render action button when onAction missing', () => {
    const { queryByText } = render(
      <EmptyState icon="add-outline" title="No tasks" actionLabel="Create Task" />,
      { wrapper: Wrapper }
    );
    expect(queryByText('Create Task')).toBeNull();
  });

  it('calls onAction when button pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState icon="add-outline" title="No tasks" actionLabel="Create Task" onAction={onAction} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByText('Create Task'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
