// Template – kopieren nach environment.ts (dev) bzw. environment.prod.ts (prod)
// Werte lokal befüllen, niemals committen.
import type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  contactEmail: '',   // z.B. vorname.nachname@domain.at
  formAccessKey: '',  // web3forms Access-Key von https://web3forms.com
};
