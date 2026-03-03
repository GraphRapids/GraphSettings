import { GraphSettingsAppWidget, GraphSettingsWidget, type GraphSettingsWidgetKey } from "./widgets";

interface AppProps {
  readonly widget?: GraphSettingsWidgetKey;
}

function App({ widget }: AppProps) {
  const resolvedWidget = widget;
  if (!resolvedWidget) {
    return <GraphSettingsAppWidget chrome="full" />;
  }

  return <GraphSettingsWidget widget={resolvedWidget} />;
}

export default App;
