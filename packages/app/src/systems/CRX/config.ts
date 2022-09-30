import { PageLinks } from '~/systems/Core/types';

export enum CRXPages {
  'signup' = '/signup.html',
  'popup' = '/popup.html',
}

export const welcomeLink = chrome.runtime.getURL(`${CRXPages.signup}#${PageLinks.signUpWelcome}`);
