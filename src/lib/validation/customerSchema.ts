import { z } from 'zod';

export const customerSchema = z.object({
  type: z.enum(['corporation', 'individual']).default('corporation'),
  name: z.string().min(1, '名称は必須です'),
  
  // 修正: z.coerce.string() を使用して、数値型で送られてきても文字列に変換してからチェックする
  corporateNumber: z.coerce.string().regex(/^\d{13}$/, '法人番号は13桁の数字です').optional().or(z.literal('')),
  
  address: z.string().min(1, '所在地は必須です'),
  representativeName: z.string().min(1, '代表者名は必須です'),
  foundingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付を入力してください').optional().or(z.literal('')),
  
  fiscalYearEndMonth: z.coerce.number().min(1).max(12),
  withholdingTaxType: z.enum(['monthly', 'semiannual']),
  residentTaxType: z.enum(['monthly', 'semiannual']),
  contactEmail: z.string().email('正しいメールアドレスを入力してください'),
});

export type CustomerSchema = z.infer<typeof customerSchema>;
