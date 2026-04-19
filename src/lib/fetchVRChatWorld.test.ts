import { describe, it, expect } from 'vitest';
import { extractVRChatWorldId } from './fetchVRChatWorld';

describe('extractVRChatWorldId', () => {
  it('標準的なVRChat URLからワールドIDを抽出する', () => {
    const url =
      'https://vrchat.com/home/world/wrld_12345678-1234-1234-1234-123456789abc';
    expect(extractVRChatWorldId(url)).toBe(
      'wrld_12345678-1234-1234-1234-123456789abc',
    );
  });

  it('vrchat.com 以外のURLは null を返す', () => {
    expect(
      extractVRChatWorldId('https://example.com/world/wrld_abc'),
    ).toBeNull();
  });

  it('ワールドID形式でないURLは null を返す', () => {
    expect(
      extractVRChatWorldId('https://vrchat.com/home/user/usr_abc'),
    ).toBeNull();
  });

  it('空文字は null を返す', () => {
    expect(extractVRChatWorldId('')).toBeNull();
  });
});
