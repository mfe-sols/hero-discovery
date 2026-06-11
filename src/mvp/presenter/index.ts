import type { AppModel } from "../model";
import { formatTitle } from "../usecase";
import { useQuery } from "@tanstack/react-query";
import { createQueryClient, fetchSummary, summaryQueryKey } from "../service";
import { trTemplate } from "../../i18n/domain-messages";

export type AppViewModel = {
  title: string;
  headings: string[];
};

const toDomainKey = (commonKey: string) => `mfe.mfe-hero-discovery.${commonKey}`;

export const createPresenter = (model: AppModel): AppViewModel => ({
  title: formatTitle(
    `${model.appName} ${trTemplate(toDomainKey(model.titleSuffixKey), model.titleSuffixKey)}`
  ),
  headings: model.headingKeys.map((key) => trTemplate(toDomainKey(key), key)),
});

export const useSummaryQuery = () =>
  useQuery({
    queryKey: summaryQueryKey,
    queryFn: fetchSummary,
  });

export const fetchSummaryExample = async () => {
  const client = createQueryClient();
  return client.fetchQuery({
    queryKey: summaryQueryKey,
    queryFn: fetchSummary,
  });
};

export const loadSummary = () => {
  const client = createQueryClient();
  return client.fetchQuery({
    queryKey: summaryQueryKey,
    queryFn: fetchSummary,
  });
};
