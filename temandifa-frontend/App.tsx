import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Toast from "react-native-toast-message";
import * as Sentry from "@sentry/react-native";

import { queryClient, asyncStoragePersister } from "./src/services/queryClient";
import "./src/i18n";

import { ErrorBoundary } from "./src/components/organisms/ErrorBoundary";
import { AppNavigator } from "./src/navigation/AppNavigator";

function App() {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <AppNavigator />
        <Toast />
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);
