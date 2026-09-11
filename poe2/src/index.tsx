import "@fontsource/manrope";
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@shared/styles/layout.css';
import '@shared/styles/global.css';
import {BrowserRouter} from "react-router-dom";
import {Poe2Routes} from "./layout/Poe2Routes";
import {migrateHashRoute} from "@shared/core/migrateHashRoute";

migrateHashRoute();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Poe2Routes/>
    </BrowserRouter>
  </React.StrictMode>
);
