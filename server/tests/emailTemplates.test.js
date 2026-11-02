import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderVerificationEmail } from '../templates/verificationEmail.js';
import { renderPasswordResetEmail } from '../templates/passwordResetEmail.js';

describe('Email Templates - Pakan Ikan Branding & Security', () => {
  describe('renderVerificationEmail()', () => {
    test('menghasilkan HTML dengan branding Pakan Ikan dan tautan verifikasi', () => {
      const html = renderVerificationEmail({
        name: 'Budi Santoso',
        verificationUrl: 'http://localhost:5173/auth/action?mode=verifyEmail&oobCode=123',
      });

      assert.ok(html.includes('Pakan Ikan'), 'Harus menyertakan nama aplikasi Pakan Ikan');
      assert.ok(html.includes('Budi Santoso'), 'Harus menyertakan nama pengguna');
      assert.ok(html.includes('http://localhost:5173/auth/action?mode=verifyEmail&amp;oobCode=123') || html.includes('http://localhost:5173/auth/action?mode=verifyEmail&oobCode=123'));
      assert.ok(html.includes('katasandi.pakanikan@gmail.com'), 'Harus menyertakan email bisnis resmi');
      assert.ok(!html.includes('AquaIoT'), 'TIDAK BOLEH menyertakan nama AquaIoT');
    });

    test('melakukan sanitasi HTML pada nama pengguna untuk mencegah XSS', () => {
      const html = renderVerificationEmail({
        name: '<script>alert("xss")</script>',
        verificationUrl: 'http://localhost:5173/auth/action',
      });

      assert.ok(!html.includes('<script>alert("xss")</script>'));
      assert.ok(html.includes('&lt;script&gt;'));
    });
  });

  describe('renderPasswordResetEmail()', () => {
    test('menghasilkan HTML reset password dengan branding Pakan Ikan dan peringatan keamanan', () => {
      const html = renderPasswordResetEmail({
        name: 'Siti Rahma',
        resetUrl: 'http://localhost:5173/auth/action?mode=resetPassword&oobCode=456',
      });

      assert.ok(html.includes('Pakan Ikan'), 'Harus menyertakan nama aplikasi Pakan Ikan');
      assert.ok(html.includes('Siti Rahma'), 'Harus menyertakan nama pengguna');
      assert.ok(html.includes('Atur Ulang Kata Sandi'), 'Harus menyertakan CTA reset kata sandi');
      assert.ok(html.includes('katasandi.pakanikan@gmail.com'), 'Harus menyertakan email bisnis resmi');
      assert.ok(!html.includes('AquaIoT'), 'TIDAK BOLEH menyertakan nama AquaIoT');
    });

    test('melakukan sanitasi HTML pada input nama pengguna', () => {
      const html = renderPasswordResetEmail({
        name: '"><img src=x onerror=alert(1)>',
        resetUrl: 'http://localhost:5173/auth/action',
      });

      assert.ok(!html.includes('onerror=alert(1)>'));
      assert.ok(html.includes('&quot;&gt;&lt;img'));
    });
  });
});

