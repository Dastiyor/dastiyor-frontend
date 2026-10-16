import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProviderFields, type ProviderFieldsValue } from '../ProviderFields';

const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Уборка': 'Тозакунӣ', 'Худжанд': 'Хуҷанд' };
const tr = (v: string) => TJ[v] ?? v;
const labels = { experience: 'Experience', city: 'City', categories: 'Categories', categoriesHint: 'Up to 5' };

function setup(value: ProviderFieldsValue, categories = ['Ремонт', 'Уборка'], cities = ['Душанбе', 'Худжанд']) {
  const onChange = jest.fn();
  const utils = render(
    <ProviderFields value={value} onChange={onChange} categories={categories} cities={cities} tr={tr} labels={labels} />,
    { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> },
  );
  return { ...utils, onChange };
}

const empty: ProviderFieldsValue = { experience: '', city: '', categories: [] };

describe('ProviderFields', () => {
  it('shows translated labels', () => {
    const { getByText } = setup(empty);
    expect(getByText('Таъмир')).toBeTruthy();
    expect(getByText('Хуҷанд')).toBeTruthy();
  });

  it('sends canonical Russian category names, not translated labels', () => {
    const { getByText, onChange } = setup({ ...empty, categories: ['Уборка'] });
    fireEvent.press(getByText('Таъмир'));
    expect(onChange).toHaveBeenCalledWith({ ...empty, categories: ['Уборка', 'Ремонт'] });
  });

  it('removes a selected category on a second tap', () => {
    const { getByText, onChange } = setup({ ...empty, categories: ['Уборка'] });
    fireEvent.press(getByText('Тозакунӣ'));
    expect(onChange).toHaveBeenCalledWith({ ...empty, categories: [] });
  });

  it('ignores a sixth category', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    const { getByText, onChange } = setup({ ...empty, categories: five }, [...five, 'f']);
    fireEvent.press(getByText('f'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selects a canonical city', () => {
    const { getByText, onChange } = setup(empty);
    fireEvent.press(getByText('Хуҷанд'));
    expect(onChange).toHaveBeenLastCalledWith({ ...empty, city: 'Худжанд' });
  });

  it('clears the city on a second tap', () => {
    const { getByText, onChange } = setup({ ...empty, city: 'Худжанд' });
    fireEvent.press(getByText('Хуҷанд'));
    expect(onChange).toHaveBeenLastCalledWith({ ...empty, city: '' });
  });

  it('keeps only digits in experience, at most 2', () => {
    const { getByLabelText, onChange } = setup(empty);
    fireEvent.changeText(getByLabelText('Experience'), '1a23');
    expect(onChange).toHaveBeenCalledWith({ ...empty, experience: '12' });
  });
});
