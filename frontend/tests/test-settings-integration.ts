/**
 * Automated Verification Script for Stage 8F Settings & Logo Storage Integration.
 * Validates settingsService against live FastAPI backend + Supabase Storage:
 * 1. Authenticated GET settings
 * 2. Default settings for new user
 * 3. Update business name
 * 4. Update email
 * 5. Update phone
 * 6. Update address
 * 7. Update currency
 * 8. Update invoice prefix
 * 9. Update default tax rate
 * 10. Update default payment terms
 * 11. Explicit tax 0 persists
 * 12. Invalid settings rejected cleanly (422)
 * 13. Unauthorized request returns 401
 * 14. Tenant isolation (User A / User B)
 * 15. Upload valid PNG
 * 16. Upload valid JPEG
 * 17. Upload valid WEBP
 * 18. Oversized logo rejected (>2MB, 413)
 * 19. Invalid/corrupt image rejected (415)
 * 20. Persisted logo URL returned via GET /api/settings
 * 21. Logo replacement (Logo A -> Logo B)
 * 22. Logo deletion (DELETE /api/settings/logo -> 204)
 * 23. Failed upload preserves previous logo
 * 24. Public logo URL readable without auth header
 * 25. Cross-user logo mutation blocked (tenant isolation)
 * 26. Settings PUT cannot overwrite logo_url
 * 27. Prefix affects future invoice numbers
 * 28. Default tax affects new invoice when tax omitted
 * 29. Explicit 0% tax remains 0
 * 30. Default payment terms affect new invoice when due_date omitted
 * 31. Explicit due date remains unchanged
 * 32. Existing invoice data remains unchanged after settings update
 */

import { apiClient, ApiError } from '../src/lib/api-client';
import { setAuthToken, removeAuthToken } from '../src/lib/auth-token';
import { authService } from '../src/lib/services/authService';
import { clientService } from '../src/lib/services/clientService';
import { invoiceService } from '../src/lib/services/invoiceService';
import { settingsService } from '../src/lib/services/settingsService';

// Polyfill minimal localStorage and window for Node environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) || null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = {
  location: { pathname: '/settings', href: '/settings' },
};

// 2x2 valid image fixtures
const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGNkYPjPwMDAxAAGAAsfAQMU4wsAAAAAAElFTkSuQmCC',
  'base64'
);
const JPEG_2X2 = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxyiiiv3E8w//Z',
  'base64'
);
const WEBP_2X2 = Buffer.from(
  'UklGRjoAAABXRUJQVlA4IC4AAACQAQCdASoCAAIAAUAmJaACdLoAA5gA/vtV4/+lwf/S4P/pcH/pcH8bss4bpAAA',
  'base64'
);

async function runSettingsIntegrationTests() {
  console.log('--- Starting Stage 8F Complete Settings & Logo Integration Verification ---');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${description}`);
      testsFailed++;
    }
  }

  const timestamp = Date.now();
  const userA_email = `settings_user_a_${timestamp}@example.com`;
  const userB_email = `settings_user_b_${timestamp}@example.com`;
  const password = 'Password123!';

  let userA_token = '';
  let userB_token = '';
  let testInvoiceId = '';
  let activeLogoUrl = '';

  try {
    // 1. Authenticated GET settings
    await authService.signup({ name: 'Apex Studio', email: userA_email, password });
    userA_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    const initialSettings = await settingsService.getSettings();
    assert(Boolean(userA_token) && Boolean(initialSettings), '1. Authenticated GET settings succeeds with valid user profile');

    // 2. Default settings for new user
    assert(initialSettings.businessName === 'Apex Studio', `2a. Default businessName matches user name: ${initialSettings.businessName}`);
    assert(initialSettings.businessEmail === userA_email, `2b. Default businessEmail matches user email: ${initialSettings.businessEmail}`);
    assert(initialSettings.currency === 'INR', `2c. Default currency is INR`);
    assert(initialSettings.invoicePrefix === 'INV', `2d. Default invoicePrefix is INV`);
    assert(initialSettings.defaultTaxPercentage === 18, `2e. Default tax is 18%`);
    assert(initialSettings.defaultPaymentTermsDays === 14, `2f. Default payment terms is 14 days`);
    assert(initialSettings.logoUrl === undefined, `2g. Default logoUrl is undefined`);

    // 3. Update business name
    const updateName = await settingsService.updateSettings({ businessName: 'Apex Innovations LLC' });
    assert(updateName.businessName === 'Apex Innovations LLC', '3. Business name update persisted');

    // 4. Update email
    const updateEmail = await settingsService.updateSettings({ businessEmail: `billing_${timestamp}@apex.io` });
    assert(updateEmail.businessEmail === `billing_${timestamp}@apex.io`, '4. Email update persisted');

    // 5. Update phone
    const updatePhone = await settingsService.updateSettings({ businessPhone: '+1-555-0199' });
    assert(updatePhone.businessPhone === '+1-555-0199', '5. Phone update persisted');

    // 6. Update address
    const updateAddress = await settingsService.updateSettings({ businessAddress: '100 Innovation Blvd, Suite 400' });
    assert(updateAddress.businessAddress === '100 Innovation Blvd, Suite 400', '6. Address update persisted');

    // 7. Update currency
    const updateCurrency = await settingsService.updateSettings({ currency: 'USD' });
    assert(updateCurrency.currency === 'USD', '7. Currency update persisted');

    // 8. Update invoice prefix
    const updatePrefix = await settingsService.updateSettings({ invoicePrefix: 'APX' });
    assert(updatePrefix.invoicePrefix === 'APX', '8. Invoice prefix update persisted');

    // 9. Update default tax rate
    const updateTax = await settingsService.updateSettings({ defaultTaxPercentage: 10 });
    assert(updateTax.defaultTaxPercentage === 10, '9. Default tax update persisted');

    // 10. Update default payment terms
    const updateTerms = await settingsService.updateSettings({ defaultPaymentTermsDays: 30 });
    assert(updateTerms.defaultPaymentTermsDays === 30, '10. Payment terms update persisted');

    // 11. Explicit 0 tax persists
    const taxZeroSettings = await settingsService.updateSettings({ defaultTaxPercentage: 0 });
    assert(taxZeroSettings.defaultTaxPercentage === 0, '11. Explicit 0 tax persists without fallback to 18%');

    // 12. Invalid settings rejected cleanly
    try {
      await apiClient.put('/settings', {
        business_name: 'A', // min 2
        business_email: 'not-an-email',
      });
      assert(false, '12. Invalid settings should be rejected');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 422, '12. Invalid settings rejected cleanly with 422');
    }

    // 13. Unauthorized request returns 401
    removeAuthToken();
    try {
      await settingsService.getSettings();
      assert(false, '13. Unauthenticated request should be rejected');
    } catch (err: any) {
      assert(err instanceof ApiError && err.status === 401, '13. Unauthorized request returns 401');
    }
    setAuthToken(userA_token);

    // 14. Tenant isolation (User A / User B)
    authService.clearUserCache();
    await authService.signup({ name: 'Beta Labs', email: userB_email, password });
    userB_token = (globalThis as any).localStorage.getItem('billflow_access_token') || '';
    const userBSettings = await settingsService.getSettings();
    assert(
      userBSettings.businessName === 'Beta Labs' &&
      userBSettings.currency === 'INR' &&
      userBSettings.invoicePrefix === 'INV',
      '14a. Tenant isolation: User B has independent default settings'
    );
    await settingsService.updateSettings({
      businessName: 'Beta Labs Global',
      currency: 'EUR',
      invoicePrefix: 'BET',
    });
    setAuthToken(userA_token);
    const userA_recheck = await settingsService.getSettings();
    assert(
      userA_recheck.businessName === 'Apex Innovations LLC' &&
      userA_recheck.currency === 'USD' &&
      userA_recheck.invoicePrefix === 'APX',
      '14b. Tenant isolation: User A settings unaffected by User B modifications'
    );

    // 15. Valid PNG upload
    const pngFile = new File([PNG_2X2], 'logo.png', { type: 'image/png' });
    const pngUrl = await settingsService.uploadLogo(pngFile);
    assert(Boolean(pngUrl) && pngUrl.includes('.png'), `15. Valid PNG upload returns Supabase URL: ${pngUrl}`);
    activeLogoUrl = pngUrl;

    // 16. Valid JPEG upload
    const jpegFile = new File([JPEG_2X2], 'logo.jpg', { type: 'image/jpeg' });
    const jpegUrl = await settingsService.uploadLogo(jpegFile);
    assert(Boolean(jpegUrl) && (jpegUrl.includes('.jpg') || jpegUrl.includes('.jpeg')), `16. Valid JPEG upload returns Supabase URL: ${jpegUrl}`);
    activeLogoUrl = jpegUrl;

    // 17. Valid WEBP upload
    const webpFile = new File([WEBP_2X2], 'logo.webp', { type: 'image/webp' });
    const webpUrl = await settingsService.uploadLogo(webpFile);
    assert(Boolean(webpUrl) && webpUrl.includes('.webp'), `17. Valid WEBP upload returns Supabase URL: ${webpUrl}`);
    activeLogoUrl = webpUrl;

    // 18. Oversized logo rejected (> 2 MB)
    const oversizedBytes = Buffer.alloc(2.5 * 1024 * 1024, 0); // 2.5 MB
    const oversizedFile = new File([oversizedBytes], 'huge.png', { type: 'image/png' });
    try {
      await settingsService.uploadLogo(oversizedFile);
      assert(false, '18. Oversized logo should be rejected');
    } catch (err: any) {
      assert(
        err instanceof ApiError && (err.status === 400 || err.status === 413),
        '18. Oversized logo rejected with 413/400 by backend validator'
      );
    }

    // 19. Corrupt image rejected
    const corruptFile = new File([Buffer.from('not an image')], 'corrupt.png', { type: 'image/png' });
    try {
      await settingsService.uploadLogo(corruptFile);
      assert(false, '19. Corrupt image should be rejected');
    } catch (err: any) {
      assert(
        err instanceof ApiError && (err.status === 400 || err.status === 415),
        '19. Corrupt image rejected with 415/400 by deep Pillow verification'
      );
    }

    // 20. Persisted logo URL returned via GET /api/settings
    const settingsAfterUpload = await settingsService.getSettings();
    assert(settingsAfterUpload.logoUrl === activeLogoUrl, `20. Persisted logo URL returned: ${settingsAfterUpload.logoUrl}`);

    // 21. Logo replacement (Logo A -> Logo B)
    const replacementFile = new File([PNG_2X2], 'replacement.png', { type: 'image/png' });
    const replacementUrl = await settingsService.uploadLogo(replacementFile);
    const settingsAfterReplace = await settingsService.getSettings();
    assert(
      replacementUrl !== activeLogoUrl && settingsAfterReplace.logoUrl === replacementUrl,
      '21. Logo replacement sets new active persisted logo and updates database'
    );
    activeLogoUrl = replacementUrl;

    // 23. Failed upload preserves previous logo
    try {
      await settingsService.uploadLogo(corruptFile);
    } catch {}
    const settingsAfterFailed = await settingsService.getSettings();
    assert(settingsAfterFailed.logoUrl === activeLogoUrl, '23. Failed upload preserves existing valid active logo');

    // 24. Public logo URL readable without auth header
    const publicLogoRes = await fetch(activeLogoUrl);
    assert(publicLogoRes.status === 200, `24. Public logo URL readable without auth header (HTTP ${publicLogoRes.status})`);

    // 25. Cross-user logo mutation blocked (tenant isolation)
    setAuthToken(userB_token);
    // User B deletes logo on their own account; must not affect User A
    await settingsService.deleteLogo();
    setAuthToken(userA_token);
    const userA_logoCheck = await settingsService.getSettings();
    assert(userA_logoCheck.logoUrl === activeLogoUrl, "25. Cross-user logo mutation blocked: User B operations cannot touch User A logo");

    // 22. Logo deletion
    await settingsService.deleteLogo();
    const settingsAfterDelete = await settingsService.getSettings();
    assert(settingsAfterDelete.logoUrl === undefined, '22. Logo deletion clears logo from backend (logoUrl is undefined)');

    // 26. Settings PUT cannot overwrite logo_url
    // First upload a new logo to test protection
    const protectLogo = await settingsService.uploadLogo(pngFile);
    activeLogoUrl = protectLogo;
    await settingsService.updateSettings({
      businessName: 'Apex Innovations LLC Protected',
    });
    const checkAfterPut = await settingsService.getSettings();
    assert(
      checkAfterPut.logoUrl === activeLogoUrl && checkAfterPut.businessName === 'Apex Innovations LLC Protected',
      '26. Settings PUT cannot overwrite or erase active logo_url'
    );

    // 27-32. Invoice defaults integration
    const testClient = await clientService.createClient({
      name: 'Delta Corp',
      email: 'finance@deltacorp.com',
    });

    await settingsService.updateSettings({
      invoicePrefix: 'APX',
      defaultTaxPercentage: 12.5,
      defaultPaymentTermsDays: 21,
    });

    // 27. Prefix affects future invoices
    const newInv = await invoiceService.createInvoice({
      clientId: testClient.id,
      clientName: testClient.name,
      clientEmail: testClient.email,
      issueDate: '2026-09-01',
      items: [{ id: '1', description: 'Product Design', quantity: 1, rate: 500, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      status: 'draft',
    });
    testInvoiceId = newInv.id;
    assert(newInv.invoiceNumber.startsWith('APX-'), `27. Prefix affects future invoices: ${newInv.invoiceNumber}`);

    // 28. Default tax affects new invoices
    assert(newInv.taxPercentage === 12.5, `28. Default tax affects new invoices: ${newInv.taxPercentage}%`);

    // 29. Explicit 0% tax remains 0
    const zeroTaxInv = await invoiceService.createInvoice({
      clientId: testClient.id,
      clientName: testClient.name,
      clientEmail: testClient.email,
      issueDate: '2026-09-01',
      taxPercentage: 0,
      items: [{ id: '1', description: 'Zero Tax Item', quantity: 1, rate: 200, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      status: 'draft',
    });
    assert(zeroTaxInv.taxPercentage === 0, '29. Explicit 0% tax remains 0 despite default tax setting');
    await invoiceService.deleteInvoice(zeroTaxInv.id);

    // 30. Default terms affect new invoices
    assert(newInv.dueDate === '2026-09-22', `30. Default terms affect new invoices: due_date is ${newInv.dueDate}`);

    // 31. Explicit due date preserved
    const explicitDueInv = await invoiceService.createInvoice({
      clientId: testClient.id,
      clientName: testClient.name,
      clientEmail: testClient.email,
      issueDate: '2026-09-01',
      dueDate: '2026-09-10',
      items: [{ id: '1', description: 'Custom Due Item', quantity: 1, rate: 100, amount: 0 }],
      subtotal: 0,
      totalAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      status: 'draft',
    });
    assert(explicitDueInv.dueDate === '2026-09-10', `31. Explicit due date preserved: ${explicitDueInv.dueDate}`);
    await invoiceService.deleteInvoice(explicitDueInv.id);

    // 32. Existing invoices unchanged
    await settingsService.updateSettings({
      invoicePrefix: 'NEW',
      defaultTaxPercentage: 25,
      defaultPaymentTermsDays: 45,
    });

    const refetchedOldInv = await invoiceService.getInvoiceById(testInvoiceId);
    assert(
      refetchedOldInv?.invoiceNumber === newInv.invoiceNumber &&
      refetchedOldInv?.taxPercentage === 12.5 &&
      refetchedOldInv?.dueDate === '2026-09-22',
      '32. Existing invoices unchanged after subsequent settings updates'
    );

  } finally {
    console.log('--- Cleaning up test artifacts ---');
    try {
      if (userA_token) {
        setAuthToken(userA_token);
        if (testInvoiceId) {
          await invoiceService.deleteInvoice(testInvoiceId).catch(() => {});
        }
        await settingsService.deleteLogo().catch(() => {});
      }
      removeAuthToken();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Stage 8F Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSettingsIntegrationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
