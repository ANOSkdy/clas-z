import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  corporateNumber: z.string().regex(/^\d{13}$/, 'Corporate number must be 13 digits').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  representativeName: z.string().min(1, 'Representative name is required'),
  fiscalYearEndMonth: z.coerce.number().min(1).max(12),
  withholdingTaxType: z.enum(['monthly', 'semiannual']),
  residentTaxType: z.enum(['monthly', 'semiannual']),
  contactEmail: z.string().email('Invalid email address'),
});

export type CustomerSchema = z.infer<typeof customerSchema>;
