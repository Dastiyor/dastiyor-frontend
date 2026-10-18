import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api, uploadFile } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { PortfolioEditor } from '../PortfolioEditor';

jest.mock('@/lib/api-client', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() },
  uploadFile: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));
jest.mock('@/lib/dialog', () => ({ Alert: { alert: jest.fn() } }));

const mApi = api as jest.Mocked<typeof api> & { patch: jest.Mock };
const BLOB = 'https://abc.public.blob.vercel-storage.com/uploads/p1.jpg';
const projects = [
  { id: 'a', title: 'Kitchen', description: null, images: [BLOB], order: 0 },
  { id: 'b', title: 'Bathroom', description: 'Tiles', images: [], order: 1 },
];
const labels = {
  addProject: 'Add project', projectTitle: 'Title', projectDescription: 'Description', addPhotos: 'Add photos',
  saveProject: 'Save project', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', deleteQuestion: 'Delete this project?',
  moveUp: 'Move up', moveDown: 'Move down', empty: 'No projects yet', error: 'Error', photoPermission: 'Allow photos', photo: 'Photo',
};

const renderEditor = () => render(<PortfolioEditor labels={labels} />, {
  wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
});

describe('PortfolioEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mApi.get.mockResolvedValue({ projects });
    mApi.patch.mockResolvedValue({ ok: true });
  });

  it('lists projects from the API', async () => {
    const { findByText, getByText } = renderEditor();
    expect(await findByText('Kitchen')).toBeTruthy();
    expect(getByText('Bathroom')).toBeTruthy();
    expect(mApi.get).toHaveBeenCalledWith('/api/profile/portfolio');
  });

  it('adds a project', async () => {
    mApi.post.mockResolvedValue({ project: { id: 'c', title: 'Roof', description: null, images: [], order: 2 } });
    const { findByText, getByText, getByLabelText } = renderEditor();
    await findByText('Kitchen');

    fireEvent.press(getByText('Add project'));
    fireEvent.changeText(getByLabelText('Title'), 'Roof');
    fireEvent.press(getByText('Save project'));

    expect(await findByText('Roof')).toBeTruthy();
    expect(mApi.post).toHaveBeenCalledWith('/api/profile/portfolio', { title: 'Roof', description: '', images: [] });
  });

  it('edits a project with PUT', async () => {
    mApi.put.mockResolvedValue({ project: { ...projects[0], title: 'Big kitchen' } });
    const { findByText, getAllByLabelText, getByLabelText, getByText } = renderEditor();
    await findByText('Kitchen');

    fireEvent.press(getAllByLabelText('Edit')[0]);
    fireEvent.changeText(getByLabelText('Title'), 'Big kitchen');
    fireEvent.press(getByText('Save project'));

    expect(await findByText('Big kitchen')).toBeTruthy();
    expect(mApi.put).toHaveBeenCalledWith('/api/profile/portfolio/a', { title: 'Big kitchen', description: '', images: [BLOB] });
  });

  it('shows the server error when saving fails', async () => {
    mApi.post.mockRejectedValue(new Error('Up to 20 projects in a portfolio'));
    const { findByText, getByText, getByLabelText } = renderEditor();
    await findByText('Kitchen');

    fireEvent.press(getByText('Add project'));
    fireEvent.changeText(getByLabelText('Title'), 'Roof');
    fireEvent.press(getByText('Save project'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'Up to 20 projects in a portfolio'));
  });

  it('move up sends PATCH with swapped ids', async () => {
    const { findByText, getAllByLabelText, getAllByRole } = renderEditor();
    await findByText('Kitchen');

    fireEvent.press(getAllByLabelText('Move up')[1]);

    expect(mApi.patch).toHaveBeenCalledWith('/api/profile/portfolio', { order: ['b', 'a'] });
    const titles = getAllByRole('header').map((h) => h.props.children);
    expect(titles).toEqual(['Bathroom', 'Kitchen']);
  });

  it('deletes after the user confirms', async () => {
    mApi.del.mockResolvedValue({ ok: true });
    (Alert.alert as jest.Mock).mockImplementation((_t, _m, buttons) => buttons.find((b: { style?: string }) => b.style === 'destructive').onPress());
    const { findByText, getAllByLabelText, queryByText } = renderEditor();
    await findByText('Kitchen');

    fireEvent.press(getAllByLabelText('Delete')[0]);

    // The re-render draws SVG icons and gradients, which can outlast waitFor's 1s default on a busy machine.
    await waitFor(() => expect(queryByText('Kitchen')).toBeNull(), { timeout: 5000 });
    expect(mApi.del).toHaveBeenCalledWith('/api/profile/portfolio/a');
  });

  it('picks photos from the gallery and uploads them', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://1.jpg', mimeType: 'image/jpeg', fileName: '1.jpg' }],
    });
    (uploadFile as jest.Mock).mockResolvedValue(BLOB);
    const { findByText, getByText, getByLabelText, findByLabelText } = renderEditor();
    await findByText('Kitchen');

    fireEvent.press(getByText('Add project'));
    fireEvent.press(getByLabelText('Add photos'));

    expect(await findByLabelText('Photo 1')).toBeTruthy();
    expect(uploadFile).toHaveBeenCalledWith('file://1.jpg');
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 8 }));
    // iPhone photos are HEIC, which /api/upload refuses; iOS must hand over a JPEG instead.
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ preferredAssetRepresentationMode: 'compatible' }));
  });
});
