import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TabBar } from '../TabBar';

function setup(prevent = false, extra: { order?: string[]; onCreate?: () => void; createLabel?: string } = {}) {
  const routes = [{ key: 'home', name: 'index' }, { key: 'msg', name: 'messages' }, { key: 'feed', name: 'tasks' }];
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: prevent })),
    navigate: jest.fn(),
  };
  const descriptors = {
    home: { options: { title: 'Home', tabBarIcon: () => <Text>H</Text> } },
    msg: { options: { title: 'Messages', tabBarBadge: 3, tabBarIcon: () => <Text>M</Text> } },
    feed: { options: { title: 'Tasks', tabBarIcon: () => <Text>T</Text> } },
  };
  const props = { state: { index: 0, routes }, descriptors, navigation } as unknown as React.ComponentProps<typeof TabBar>;
  const utils = render(<TabBar {...props} {...extra} />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });
  return { ...utils, navigation };
}

describe('TabBar', () => {
  it('renders labels and the unread badge', () => {
    const { getByText } = setup();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('navigates to an unfocused tab after emitting tabPress', () => {
    const { getByText, navigation } = setup();
    fireEvent.press(getByText('Messages'));
    expect(navigation.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'msg', canPreventDefault: true });
    expect(navigation.navigate).toHaveBeenCalledWith('messages', undefined);
  });

  it('does not navigate when a tabPress listener prevents it (guest guard)', () => {
    const { getByText, navigation } = setup(true);
    fireEvent.press(getByText('Messages'));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows only the routes in `order`, in that order', () => {
    const { queryByText, getAllByRole } = setup(false, { order: ['messages', 'index'] });
    expect(queryByText('Tasks')).toBeNull();
    expect(getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual(['Messages', 'Home']);
  });

  it('puts the create button in the middle and calls onCreate', () => {
    const onCreate = jest.fn();
    const { getByLabelText } = setup(false, { order: ['index', 'messages'], onCreate, createLabel: 'New task' });
    fireEvent.press(getByLabelText('New task'));
    expect(onCreate).toHaveBeenCalled();
  });
});
