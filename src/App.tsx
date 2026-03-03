import { GraphSettingsAppWidget, GraphSettingsWidget, type GraphSettingsWidgetKey } from "./widgets";

interface AppProps {
  readonly widget?: GraphSettingsWidgetKey;
}

function App({ widget }: AppProps) {
  const resolvedWidget = widget;
  if (!resolvedWidget || resolvedWidget === "all") {
    return <GraphSettingsAppWidget />;
  }

  return <GraphSettingsWidget widget={resolvedWidget} />;
}

export default App;
