/** "+992977777777" → "+992 977 77 7777". Anything that is not a 9-digit +992 number is returned unchanged. */
export function formatPhone(phone: string): string {
  const m = /^\+?992(\d{3})(\d{2})(\d{4})$/.exec(phone.replace(/[\s()-]/g, ''));
  return m ? `+992 ${m[1]} ${m[2]} ${m[3]}` : phone;
}
