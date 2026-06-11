import type { I18nKey } from "@mfe-sols/i18n";

export type AppModel = {
  appName: string;
  titleSuffixKey: I18nKey;
  headingKeys: I18nKey[];
};

export const createModel = (): AppModel => ({
  appName: "mfe-hero-discovery",
  titleSuffixKey: "templateTitleSuffix",
  headingKeys: [
    "templateHeading1",
    "templateHeading2",
    "templateHeading3",
    "templateHeading4",
    "templateHeading5",
    "templateHeading6",
  ],
});
