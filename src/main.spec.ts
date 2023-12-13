import { validateArgs } from './main';

describe('validateArgs', () => {
  it('should require repo path', async () => {
    await expect(validateArgs([])).rejects.toThrow('No repo path provided');
  });

  it('should require repo path to exist', async () => {
    await expect(validateArgs(['foo'])).rejects.toThrow(
      'Path does not exist, or it was not provided as an absolute path:'
    );
  });
});
