import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedContinueUrl, extractAndBuildCustomActionUrl } from '../services/linkService.js';

describe('LinkService - URL Validation & Action Link Builder', () => {
  describe('isAllowedContinueUrl()', () => {
    test('mengizinkan domain localhost dan variasinya', () => {
      assert.strictEqual(isAllowedContinueUrl('http://localhost:5173'), true);
      assert.strictEqual(isAllowedContinueUrl('http://localhost:5173/dashboard'), true);
      assert.strictEqual(isAllowedContinueUrl('http://127.0.0.1:3000'), true);
    });

    test('mengizinkan domain resmi pakan-ikan.my.id dan subdomain', () => {
      assert.strictEqual(isAllowedContinueUrl('https://pakan-ikan.my.id'), true);
      assert.strictEqual(isAllowedContinueUrl('https://pakan-ikan.my.id/login'), true);
      assert.strictEqual(isAllowedContinueUrl('https://auth.pakan-ikan.my.id'), true);
      assert.strictEqual(isAllowedContinueUrl('https://app.pakan-ikan.my.id/dashboard'), true);
    });

    test('menolak domain luar yang tidak sah atau phishing', () => {
      assert.strictEqual(isAllowedContinueUrl('https://evil.com'), false);
      assert.strictEqual(isAllowedContinueUrl('https://attacker-pakan-ikan.my.id.fake.com'), false);
      assert.strictEqual(isAllowedContinueUrl('javascript:alert(1)'), false);
      assert.strictEqual(isAllowedContinueUrl(''), false);
      assert.strictEqual(isAllowedContinueUrl(null), false);
    });
  });

  describe('extractAndBuildCustomActionUrl()', () => {
    test('berhasil mengekstrak oobCode dan membangun URL ke /auth/action', () => {
      const rawFirebaseLink =
        'https://pakan-ikan-4c18e.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=SAMPLE_OOB_CODE_123&apiKey=AIzaSyFakeKey&continueUrl=https://pakan-ikan.my.id/login';

      const customUrl = extractAndBuildCustomActionUrl(rawFirebaseLink);
      const parsed = new URL(customUrl);

      assert.strictEqual(parsed.pathname, '/auth/action');
      assert.strictEqual(parsed.searchParams.get('mode'), 'verifyEmail');
      assert.strictEqual(parsed.searchParams.get('oobCode'), 'SAMPLE_OOB_CODE_123');
      assert.strictEqual(parsed.searchParams.get('apiKey'), 'AIzaSyFakeKey');
      assert.strictEqual(parsed.searchParams.get('continueUrl'), 'https://pakan-ikan.my.id/login');
    });

    test('mengganti continueUrl yang tidak aman dengan default yang aman', () => {
      const rawFirebaseLink =
        'https://pakan-ikan-4c18e.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=RESET_CODE_789&apiKey=AIzaSyFakeKey&continueUrl=https://malicious-site.com';

      const customUrl = extractAndBuildCustomActionUrl(rawFirebaseLink);
      const parsed = new URL(customUrl);

      assert.strictEqual(parsed.searchParams.get('mode'), 'resetPassword');
      assert.strictEqual(parsed.searchParams.get('oobCode'), 'RESET_CODE_789');
      // Tidak boleh mengandung malicious-site.com
      assert.doesNotMatch(parsed.searchParams.get('continueUrl'), /malicious-site\.com/);
    });

    test('melempar error jika oobCode atau mode tidak ada', () => {
      assert.throws(
        () => extractAndBuildCustomActionUrl('https://pakan-ikan-4c18e.firebaseapp.com/__/auth/action'),
        /Parameter oobCode atau mode tidak ditemukan/
      );
    });
  });
});

