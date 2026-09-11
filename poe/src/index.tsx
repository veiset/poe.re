import "@fontsource/manrope";
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@shared/styles/layout.css';
import '@shared/styles/global.css';
import {BrowserRouter} from "react-router-dom";
import {Poe1Routes} from "./layout/Poe1Routes";
import {migrateSavedSettings_V1} from "@poe/utils/LocalStorageMigration";
import {migrateHashRoute} from "@shared/core/migrateHashRoute";

migrateHashRoute();
migrateSavedSettings_V1();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Poe1Routes/>
    </BrowserRouter>
  </React.StrictMode>
);
