import fs from 'fs';
import { validateArgs } from './main';

/* NOTE: a few tests are hard coding c:\, which only works on windows. This was done for simplicity/brevity. */

describe('validateArgs', () => {
  afterEach(() => {
    //restore the original implementation after each test
    jest.restoreAllMocks();
  });

  it('should require repo path', () => {
    expect(() => validateArgs([])).toThrow('No repo path provided');
  });

  it('should require repo path to exist', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(() => validateArgs(['non-existent'])).toThrow(
      'Repo path does not exist, or it was not provided as an absolute path'
    );
  });

  it('should require contributors path to exist', () => {
    jest
      .spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true) //first call returns true (repoPath exists)
      .mockReturnValueOnce(false); //second call returns false (contributorsPath doesn't exist)
    expect(() => validateArgs(['c:\\'])).toThrow(
      'Contributors path does not exist, or it was not provided as an absolute path'
    );
  });

  it('should default contributors path to packages', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    expect(validateArgs(['c:\\'])).toEqual({
      repoPath: 'c:\\',
      contributorsPath: 'packages',
    });
  });
});
