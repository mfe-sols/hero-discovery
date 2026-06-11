import { registerMessagesAll, t } from "@mfe-sols/i18n";

registerMessagesAll({
  en: {
    "mfe.mfe-hero-discovery.templateTitleSuffix": "Module",
    "mfe.mfe-hero-discovery.templateHeading1": "Heading 1",
    "mfe.mfe-hero-discovery.templateHeading2": "Heading 2",
    "mfe.mfe-hero-discovery.templateHeading3": "Heading 3",
    "mfe.mfe-hero-discovery.templateHeading4": "Heading 4",
    "mfe.mfe-hero-discovery.templateHeading5": "Heading 5",
    "mfe.mfe-hero-discovery.templateHeading6": "Heading 6",
  },
  vi: {
    "mfe.mfe-hero-discovery.templateTitleSuffix": "Mô-đun",
    "mfe.mfe-hero-discovery.templateHeading1": "Tiêu đề 1",
    "mfe.mfe-hero-discovery.templateHeading2": "Tiêu đề 2",
    "mfe.mfe-hero-discovery.templateHeading3": "Tiêu đề 3",
    "mfe.mfe-hero-discovery.templateHeading4": "Tiêu đề 4",
    "mfe.mfe-hero-discovery.templateHeading5": "Tiêu đề 5",
    "mfe.mfe-hero-discovery.templateHeading6": "Tiêu đề 6",
  },
});

export const trTemplate = (domainKey: string, commonKey: string): string => {
  const domainText = t(domainKey);
  if (domainText !== domainKey) return domainText;
  return t(commonKey);
};
