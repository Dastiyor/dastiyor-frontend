import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    const { getByText } = render(
      <EmptyState icon="search-outline" title="No results found" />
    );
    expect(getByText('No results found')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <EmptyState icon="search-outline" title="Empty" subtitle="Try different filters" />
    );
    expect(getByText('Try different filters')).toBeTruthy();
  });

  it('does not render subtitle when not provided', () => {
    const { queryByText } = render(
      <EmptyState icon="search-outline" title="Empty" />
    );
    expect(queryByText('Try different filters')).toBeNull();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="add-outline"
        title="No tasks"
        actionLabel="Create Task"
        onAction={onAction}
      />
    );
    expect(getByText('Create Task')).toBeTruthy();
  });

  it('does not render action button when actionLabel missing', () => {
    const { queryByText } = render(
      <EmptyState icon="add-outline" title="No tasks" onAction={() => {}} />
    );
    expect(queryByText('Create Task')).toBeNull();
  });

  it('does not render action button when onAction missing', () => {
    const { queryByText } = render(
      <EmptyState icon="add-outline" title="No tasks" actionLabel="Create Task" />
    );
    expect(queryByText('Create Task')).toBeNull();
  });

  it('calls onAction when button pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="add-outline"
        title="No tasks"
        actionLabel="Create Task"
        onAction={onAction}
      />
    );
    fireEvent.press(getByText('Create Task'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
