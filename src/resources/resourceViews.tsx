import {
  ArrayInput,
  Create,
  Datagrid,
  DateField,
  DeleteWithConfirmButton,
  Edit,
  EditButton,
  List,
  NumberField,
  NumberInput,
  SearchInput,
  SelectInput,
  Show,
  ShowButton,
  SimpleForm,
  SimpleFormIterator,
  TextField,
  TextInput,
  maxLength,
  minLength,
  minValue,
  required,
  type ResourceProps,
} from "react-admin";

import {
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

const requiredField = required();
const idLengthValidator = [requiredField, maxLength(120), minLength(1)];
const nameValidator = [requiredField, maxLength(120), minLength(1)];

function validateNonEmptyArray(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return "At least one item is required";
  }

  return undefined;
}

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

const iconConflictChoices = [
  { id: "reject", name: "reject" },
  { id: "first-wins", name: "first-wins" },
  { id: "last-wins", name: "last-wins" },
];

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
    <Create mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <TextInput source="graphTypeId" validate={idLengthValidator} fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />

        <TextInput
          source="layoutSetRef.layoutSetId"
          label="Layout Set Ref: layoutSetId"
          validate={requiredField}
          fullWidth
        />
        <NumberInput
          source="layoutSetRef.layoutSetVersion"
          label="Layout Set Ref: layoutSetVersion"
          validate={[requiredField, minValue(1)]}
          fullWidth
        />
        <TextInput
          source="layoutSetRef.checksum"
          label="Layout Set Ref: checksum"
          fullWidth
        />

        <ArrayInput
          source="iconSetRefs"
          label="Icon Set Refs"
          validate={validateNonEmptyArray}
        >
          <SimpleFormIterator>
            <TextInput source="iconSetId" validate={requiredField} />
            <NumberInput
              source="iconSetVersion"
              validate={[requiredField, minValue(1)]}
            />
            <TextInput source="checksum" />
          </SimpleFormIterator>
        </ArrayInput>

        <TextInput
          source="linkSetRef.linkSetId"
          label="Link Set Ref: linkSetId"
          validate={requiredField}
          fullWidth
        />
        <NumberInput
          source="linkSetRef.linkSetVersion"
          label="Link Set Ref: linkSetVersion"
          validate={[requiredField, minValue(1)]}
          fullWidth
        />
        <TextInput
          source="linkSetRef.checksum"
          label="Link Set Ref: checksum"
          fullWidth
        />

        <SelectInput
          source="iconConflictPolicy"
          choices={iconConflictChoices}
          defaultValue="reject"
          fullWidth
        />
      </SimpleForm>
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
