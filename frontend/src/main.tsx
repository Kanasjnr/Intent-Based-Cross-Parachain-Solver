import { createRoot } from 'react-dom/client'
import { AppKitProvider } from '@reown/appkit/react'
import { networks, projectId, ethers5Adapter, metadata } from './web3config'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <AppKitProvider
    adapters={[ethers5Adapter]}
    networks={networks}
    projectId={projectId}
    metadata={metadata}
    features={{
      analytics: true
    }}
    themeMode="dark"
    themeVariables={{
      '--w3m-accent': '#14b8a6',
      '--w3m-border-radius-master': '1px'
    }}
  >
    <App />
  </AppKitProvider>,
)


