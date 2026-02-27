import { Admin, Resource } from "react-admin";

import { dataProvider } from "./dataProvider";
import { scopedResourceViews } from "./resources/resourceViews";

function App() {
  return (
    <Admin dataProvider={dataProvider} title="GraphSettings Admin">
      {scopedResourceViews.map((resourceView) => (
        <Resource key={resourceView.name} {...resourceView} />
      ))}
    </Admin>
  );
}

export default App;
