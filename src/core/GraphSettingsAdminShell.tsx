import { type ComponentProps } from "react";
import { Admin, Resource, type DataProvider, type ResourceProps } from "react-admin";

import { dataProvider as defaultDataProvider } from "../dataProvider";

export type GraphSettingsResourceView = Pick<
  ResourceProps,
  "name" | "options" | "list" | "show" | "create" | "edit"
>;

export interface GraphSettingsAdminShellProps {
  readonly resources: readonly GraphSettingsResourceView[];
  readonly dataProvider?: DataProvider;
  readonly title?: string;
  readonly basename?: string;
  readonly requireAuth?: boolean;
  readonly store?: ComponentProps<typeof Admin>["store"];
}

export function GraphSettingsAdminShell({
  resources,
  dataProvider = defaultDataProvider,
  title = "GraphSettings Admin",
  basename,
  requireAuth = false,
  store,
}: GraphSettingsAdminShellProps) {
  return (
    <Admin
      dataProvider={dataProvider}
      title={title}
      basename={basename}
      requireAuth={requireAuth}
      store={store}
    >
      {resources.map((resourceView) => (
        <Resource key={resourceView.name} {...resourceView} />
      ))}
    </Admin>
  );
}
