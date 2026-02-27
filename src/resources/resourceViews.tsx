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
  SimpleShowLayout,
  TextField,
  TextInput,
  maxLength,
  minLength,
  minValue,
  required,
  type ResourceProps,
} from "react-admin";

import { JsonField } from "../components/JsonField";
import { JsonInput } from "../components/JsonInput";
import { validateJson } from "../components/jsonValidation";
import {
  GraphTypeOperations,
  IconSetOperations,
  LayoutSetOperations,
  LinkSetOperations,
  ThemeOperations,
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
        <TextField source="checksum" />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <SimpleShowLayout>
        <TextField source="iconSetId" />
        <TextField source="name" />
        <NumberField source="iconSetVersion" label="Draft Version" />
        <DateField source="updatedAt" showTime />
        <JsonField label="Entries" source="entries" />
        <JsonField label="Published Versions" source="publishedVersions" />
        <IconSetOperations />
      </SimpleShowLayout>
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <TextInput source="iconSetId" validate={idLengthValidator} fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <JsonInput source="entries" validate={validateJson("object", true)} />
      </SimpleForm>
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <TextInput source="iconSetId" disabled fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <JsonInput source="entries" validate={validateJson("object", true)} />
      </SimpleForm>
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
        <TextField source="checksum" />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <SimpleShowLayout>
        <TextField source="layoutSetId" />
        <TextField source="name" />
        <NumberField source="layoutSetVersion" label="Draft Version" />
        <DateField source="updatedAt" showTime />
        <JsonField label="ELK Settings" source="elkSettings" />
        <JsonField label="Published Versions" source="publishedVersions" />
        <LayoutSetOperations />
      </SimpleShowLayout>
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <TextInput source="layoutSetId" validate={idLengthValidator} fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <JsonInput source="elkSettings" validate={validateJson("object", true)} />
      </SimpleForm>
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <TextInput source="layoutSetId" disabled fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <JsonInput source="elkSettings" validate={validateJson("object", true)} />
      </SimpleForm>
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
        <TextField source="checksum" />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <SimpleShowLayout>
        <TextField source="linkSetId" />
        <TextField source="name" />
        <NumberField source="linkSetVersion" label="Draft Version" />
        <DateField source="updatedAt" showTime />
        <JsonField label="Entries" source="entries" />
        <JsonField label="Published Versions" source="publishedVersions" />
        <LinkSetOperations />
      </SimpleShowLayout>
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <TextInput source="linkSetId" validate={idLengthValidator} fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <JsonInput source="entries" validate={validateJson("object", true)} />
      </SimpleForm>
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <TextInput source="linkSetId" disabled fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <JsonInput source="entries" validate={validateJson("object", true)} />
      </SimpleForm>
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
        <TextField source="runtimeChecksum" />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <SimpleShowLayout>
        <TextField source="graphTypeId" />
        <TextField source="name" />
        <NumberField source="graphTypeVersion" label="Draft Version" />
        <DateField source="updatedAt" showTime />
        <TextField source="iconConflictPolicy" />
        <JsonField label="Layout Set Ref" source="layoutSetRef" />
        <JsonField label="Icon Set Refs" source="iconSetRefs" />
        <JsonField label="Link Set Ref" source="linkSetRef" />
        <JsonField label="Published Versions" source="publishedVersions" />
        <GraphTypeOperations />
      </SimpleShowLayout>
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
      <SimpleForm>
        <TextInput source="graphTypeId" disabled fullWidth />
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
        <TextField source="checksum" />
        <ShowButton />
        <EditButton />
        <DeleteWithConfirmButton />
      </Datagrid>
    </List>
  ),
  show: () => (
    <Show>
      <SimpleShowLayout>
        <TextField source="themeId" />
        <TextField source="name" />
        <NumberField source="themeVersion" label="Draft Version" />
        <DateField source="updatedAt" showTime />
        <TextField source="cssBody" />
        <JsonField label="Variables" source="variables" />
        <JsonField label="Published Versions" source="publishedVersions" />
        <ThemeOperations />
      </SimpleShowLayout>
    </Show>
  ),
  create: () => (
    <Create mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <TextInput source="themeId" validate={idLengthValidator} fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <TextInput
          source="cssBody"
          multiline
          minRows={8}
          fullWidth
          validate={requiredField}
        />
        <JsonInput source="variables" validate={validateJson("object", false)} />
      </SimpleForm>
    </Create>
  ),
  edit: () => (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <TextInput source="themeId" disabled fullWidth />
        <TextInput source="name" validate={nameValidator} fullWidth />
        <TextInput
          source="cssBody"
          multiline
          minRows={8}
          fullWidth
          validate={requiredField}
        />
        <JsonInput source="variables" validate={validateJson("object", false)} />
      </SimpleForm>
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
