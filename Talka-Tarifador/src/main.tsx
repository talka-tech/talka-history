import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ClientProvider } from './contexts/ClientContext'

createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ClientProvider>
			<App />
		</ClientProvider>
	</React.StrictMode>
);
