import { type ComponentProps } from "react";
import { Admin, Layout, Resource, type DataProvider, type ResourceProps } from "react-admin";

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
  readonly chrome?: "full" | "embedded";
}

type AppBarComponent = NonNullable<ComponentProps<typeof Layout>["appBar"]>;
type MenuComponent = NonNullable<ComponentProps<typeof Layout>["menu"]>;
type SidebarComponent = NonNullable<ComponentProps<typeof Layout>["sidebar"]>;
const EmptyAppBarComponent = (() => null) as AppBarComponent;
const EmptyMenuComponent = (() => null) as MenuComponent;
const EmptySidebarComponent = (() => null) as SidebarComponent;
const embeddedLayoutSx = {
  "& .RaLayout-appFrame": {
    marginTop: 0,
  },
  "& .RaLayout-content": {
    padding: 0,
    "@media (min-width:0px)": {
      paddingLeft: 0,
      paddingRight: 0,
    },
  },
};

function EmbeddedLayout(props: ComponentProps<typeof Layout>) {
  return (
    <Layout
      {...props}
      appBar={EmptyAppBarComponent}
      menu={EmptyMenuComponent}
      sidebar={EmptySidebarComponent}
      sx={embeddedLayoutSx}
    />
  );
}

export function GraphSettingsAdminShell({
  resources,
  dataProvider = defaultDataProvider,
  title = "GraphSettings Admin",
  basename,
  requireAuth = false,
  store,
  chrome = "full",
}: GraphSettingsAdminShellProps) {
  return (
    <Admin
      dataProvider={dataProvider}
      title={title}
      basename={basename}
      requireAuth={requireAuth}
      store={store}
      layout={chrome === "embedded" ? EmbeddedLayout : undefined}
    >
      {resources.map((resourceView) => (
        <Resource key={resourceView.name} {...resourceView} />
      ))}
    </Admin>
  );
}
