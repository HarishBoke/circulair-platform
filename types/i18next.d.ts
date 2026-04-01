declare module 'i18next' {
  interface i18n {
    use(plugin: any): i18n;
    init(options: any): Promise<any>;
    changeLanguage(lng: string): Promise<any>;
    language: string;
    t(key: string, options?: any): string;
  }
  const i18next: i18n;
  export default i18next;
}

declare module 'react-i18next' {
  export function useTranslation(ns?: string): {
    t: (key: string, options?: any) => string;
    i18n: {
      changeLanguage: (lng: string) => Promise<any>;
      language: string;
    };
  };
  export function initReactI18next(): any;
  export const initReactI18next: any;
}
