import {
  Create,
  Datagrid,
  DateField,
  DeleteWithConfirmButton,
  Edit,
  EditButton,
  List,
  NumberField,
  SearchInput,
  Show,
  ShowButton,
  TextField,
  type ResourceProps,
} from "react-admin";

import {
  GraphTypeCreateEditor,
  GraphTypeDraftEditor,
  GraphTypePublishedView,
  IconSetCreateEditor,
  IconSetDraftEditor,
  IconSetPublishedView,
  LayoutSetCreateEditor,
  LayoutSetDraftEditor,
  LayoutSetPublishedView,
  LinkSetCreateEditor,
  LinkSetDraftEditor,
  LinkSetPublishedView,
  ThemeCreateEditor,
  ThemeDraftEditor,
  ThemePublishedView,
} from "./ResourceOperations";

const qFilter = [<SearchInput source="q" alwaysOn key="q" />];

export const iconSetViews: Pick<
  ResourceProps,
  "name" | "options" | "list" | "show" | "create" | "edit"
> = {
  name: "icon-sets",
  options: { label: "Icon Sets" },
  list: () => (
    <List filters={qFilter} sort={{ field: "updatedAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="iconSetId" />
        <TextField source="name" />
        <NumberField source="draftVersion" />
        <NumberField source="publishedVersion" />
        <DateField source="updatedAt" showTime />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <IconSetPublishedView />
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic">
      <IconSetCreateEditor />
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <IconSetDraftEditor />
    </Edit>
  ),
};

export const layoutSetViews: Pick<
  ResourceProps,
  "name" | "options" | "list" | "show" | "create" | "edit"
> = {
  name: "layout-sets",
  options: { label: "Layout Sets" },
  list: () => (
    <List filters={qFilter} sort={{ field: "updatedAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="layoutSetId" />
        <TextField source="name" />
        <NumberField source="draftVersion" />
        <NumberField source="publishedVersion" />
        <DateField source="updatedAt" showTime />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <LayoutSetPublishedView />
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic">
      <LayoutSetCreateEditor />
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <LayoutSetDraftEditor />
    </Edit>
  ),
};

export const linkSetViews: Pick<
  ResourceProps,
  "name" | "options" | "list" | "show" | "create" | "edit"
> = {
  name: "link-sets",
  options: { label: "Link Sets" },
  list: () => (
    <List filters={qFilter} sort={{ field: "updatedAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="linkSetId" />
        <TextField source="name" />
        <NumberField source="draftVersion" />
        <NumberField source="publishedVersion" />
        <DateField source="updatedAt" showTime />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <LinkSetPublishedView />
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic">
      <LinkSetCreateEditor />
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <LinkSetDraftEditor />
    </Edit>
  ),
};

export const graphTypeViews: Pick<
  ResourceProps,
  "name" | "options" | "list" | "show" | "create" | "edit"
> = {
  name: "graph-types",
  options: { label: "Graph Types" },
  list: () => (
    <List filters={qFilter} sort={{ field: "updatedAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="graphTypeId" />
        <TextField source="name" />
        <NumberField source="draftVersion" />
        <NumberField source="publishedVersion" />
        <DateField source="updatedAt" showTime />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <GraphTypePublishedView />
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic">
      <GraphTypeCreateEditor />
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <GraphTypeDraftEditor />
    </Edit>
  ),
};

export const themeViews: Pick<
  ResourceProps,
  "name" | "options" | "list" | "show" | "create" | "edit"
> = {
  name: "themes",
  options: { label: "Themes" },
  list: () => (
    <List filters={qFilter} sort={{ field: "updatedAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="themeId" />
        <TextField source="name" />
        <NumberField source="draftVersion" />
        <NumberField source="publishedVersion" />
        <DateField source="updatedAt" showTime />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <ThemePublishedView />
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic">
      <ThemeCreateEditor />
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <ThemeDraftEditor />
    </Edit>
  ),
};

export const scopedResourceViews = [
  iconSetViews,
  layoutSetViews,
  linkSetViews,
  graphTypeViews,
  themeViews,
];
